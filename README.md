# Merchant Portal

A merchant payments portal built for a Senior Frontend Engineer take-home. Sales
users create merchant applications in an auto-saving form, admins assign them
to reviewers, and reviewers record a risk decision. Sensitive values are masked
and can only be revealed by the people allowed to see them, with every reveal
audited.

Angular 22 · standalone components · signals · typed Reactive Forms · RxJS ·
Angular CDK virtual scroll · Bootstrap 5 (SCSS) · Vitest + TestBed. No backend
is needed: an in-browser fake API answers every request.

## Run it

```bash
npm ci
npm start          # http://localhost:4200
```

Sign in with one of the demo buttons (no passwords exist anywhere in the app):

| Role     | User          | Email                       | Sees                                   |
| -------- | ------------- | --------------------------- | -------------------------------------- |
| SALES    | Sita Gurung   | `sita.gurung@example.com`   | Her own applications, including drafts |
| REVIEWER | Rita Shrestha | `rita.shrestha@example.com` | Applications assigned to her           |
| ADMIN    | Anita Karki   | `anita.karki@example.com`   | Everything; assigns reviewers          |

Demo data is generated on first load and kept in `localStorage` so drafts survive
a reload. On the login page, pick 40, 1,000 or 10,000 applications under
**Demo data** and click **Reset demo data** (changing the size alone does
nothing). Sign in as ADMIN to see the whole set. The large sets exist to
exercise the virtualized list (the DOM holds only the rows near the viewport
however many there are). They exceed the browser's storage quota, so their
edits last for the session and the set is regenerated deterministically on
reload. Every name, company and number is invented.

Suggested walkthrough:

1. **Sita** → New application → type in the application form and watch
   "Unsaved changes → Saving… → Draft saved at HH:MM:SS" → reload the page: the
   draft is restored → tick the declaration and submit from the Review step.
2. **Anita** → open the new submission → assign Rita → status becomes Under review.
3. **Rita** → open it → Reveal the account number (re-masks after 30 s, history
   gains a "revealed" entry) → Reject with a short note (blocked) → Approve.
4. Any user → "Expire token" in the navbar (dev builds only), then navigate: the
   next call answers 401, one `POST /api/auth/refresh` runs, and the request is
   retried successfully. The fake API answers inside Angular's HTTP pipeline, so
   none of this appears in the browser's Network tab; set breakpoints in
   `auth.interceptor.ts` (DevTools → Sources) to step through it.

```bash
npm test -- --watch=false   # unit tests (Vitest + TestBed, zoneless)
npm run lint                # angular-eslint
npm run format:check        # prettier
npm run build               # production build to dist/
```

## Architecture

```
src/app
  app.config.ts, app.routes.ts, app.ts
  core/                      app-wide singletons, one folder per kind
    auth/
      guards/                authGuard, guestGuard, roleGuard(...)
      interceptors/          authInterceptor (bearer token + single shared refresh)
      services/              AuthService (session signals, refresh, logout)
      helpers/               demo token codec
    http/
      helpers/               errorMessage() - the only reader of HttpErrorResponse;
                             Loadable<T> async-state union
      tokens/                SKIP_AUTH HttpContextToken
    layout/                  navbar + <router-outlet>
    pages/                   forbidden-page/, not-found-page/
  shared/                    reusable, feature-agnostic building blocks
    components/              avatar/, field-error/, icon/, masked-field/, status-badge/
    helpers/                 validation error messages
    models/                  domain types and reference data
    pipes/                   relativeTime
    validators/              custom validators as pure functions
  features/                  one folder per feature, one sub-folder per screen
    login/login-page/
    applications/
      applications.routes.ts
      services/              ApplicationsApi - thin typed HttpClient wrapper
      list/
        applications-page/   the smart page (virtual scroll viewport)
        services/            ApplicationsListStore (filters + infinite paging)
      form/
        application-form-page/ the smart page
        components/          business-step/, contacts-step/ (presentational)
        services/            ApplicationFormStore (form + auto-save)
        guards/              unsavedChangesGuard
        helpers/             form builder, step helpers
      detail/
        application-detail-page/
        components/          decision-panel/, assignment-panel/, history-list/
src/mocks
  backend/                   request router, domain rules, interceptor, spec
  data/                      seed generator and localStorage persistence
src/styles
  _theme.scss                design tokens as Bootstrap variable overrides
  _bootstrap.scss            the Bootstrap layers this app uses, compiled from source
  _components.scss           app-wide primitives (page header, cards, field pairs)
src/testing                  seedSession(), fixtures, global setup
```

Each component lives in its own folder next to its template and spec. Within a
feature, `components/` holds presentational children, `services/` the stores
and API clients, `guards/` the route guards, and `helpers/` pure functions.

**Styling.** Bootstrap 5 is compiled from its SCSS source with the theme tokens
in `_theme.scss` (palette, radius, typography), so every Bootstrap component
picks them up. Shared primitives such as the page header, cards and label/value
pairs live in `_components.scss`; anything specific to one component sits in a
`.scss` file next to it. Icons are a handful of hand-drawn SVG paths in the
`Icon` component, so there is no icon font and nothing is loaded from a CDN,
which keeps the Content Security Policy at `'self'`.

**Patterns, applied consistently**

- **Smart vs presentational.** Only the `*-page.ts` components inject services
  and know about routing. Everything under `shared/components`,
  `form/components` and `detail/*-panel` takes `input()`s and emits `output()`s.
- **Signals at the edge, RxJS in the middle.** Pages expose signals to templates.
  Async work is an RxJS pipeline (`toObservable(query) → switchMap(api.call) →
toLoadable() → toSignal`), so a newer request always cancels an older one.
- **`Loadable<T>`** is a discriminated union (`loading | loaded | error`) that
  templates `@switch` on. The detail page and the application form load through
  it, so loading, error and retry states come for free.
- **Dashboard: server-side pages, infinite scroll, virtualized rows.**
  `ApplicationsListStore` keeps the filters in a signal; each change starts a
  fresh page sequence (`switchMap` cancels a page still in flight) and
  `loadMore()` appends the next page of 25 (`exhaustMap` ignores a second call
  while one is pending; a failed page keeps the rows already loaded and Retry
  re-requests only that page). The rows render inside Angular CDK's
  `cdk-virtual-scroll-viewport`, so only the rows near the viewport exist in
  the DOM however long the list grows; the next page is fetched when the
  rendered range comes within five rows of the end, with a "Load more" button
  as a keyboard-friendly fallback. Rows are a CSS grid of fixed height, which
  the fixed-size scroll strategy relies on.
- **Typed Reactive Forms.** The application form is one `FormGroup` with typed
  sub-groups built in `application-form.ts`. Validators are pure functions with
  their own spec.
- **Auto-save** (`ApplicationFormStore`): `business/contacts valueChanges →
filter(dirty) → mark dirty → debounceTime(1000) → skip if equal to the last
saved payload → switchMap(PUT)`, with `catchError` inside the inner observable
  so one failed save never kills the stream. The form is never patched from a
  response, so nothing typed during a save is lost. `saveNow()` bypasses the
  debounce for step changes and the Retry link; there is no manual Save button.
  The Review-step declaration is a submit-time confirmation, not draft data: it
  is never saved, never touches the save indicator and starts unticked on each
  visit. Submit stays disabled until the whole form, declaration included, is
  valid. Submit saves first, then posts,
  so the server validates exactly what the user saw. A `CanDeactivate` guard
  and `beforeunload` stop unsaved edits from vanishing silently.
- **Route-scoped state.** `ApplicationFormStore` is provided by
  `ApplicationFormPage`, so it is created and destroyed with the page.
- **Lazy routes.** Login and the applications feature are separate chunks.
  Guards: `authGuard` (→ `/login?returnUrl=…`), `guestGuard`, `roleGuard(...)`
  (→ `/forbidden`), `unsavedChangesGuard`.

## Mock API

`src/mocks/backend/fake-backend.interceptor.ts` is an `HttpInterceptorFn`
registered after the auth interceptor. Requests to `/api/*` are routed by
`fake-backend.ts` to pure functions in `fake-api.ts` that behave like a server:
they check the bearer token, scope data by role, enforce status transitions and
answer 401/403/404/409/422 with `{ message, errors? }`. Because the interceptor
answers without calling `next()`, no request ever reaches the browser, so the
Network tab stays empty. A 300 ms delay makes loading states visible. The
in-memory database (`src/mocks/data/mock-db.ts`) is written back to
`localStorage` only after a request that changed something (a version
counter is bumped by every mutation), so reads stay cheap even with 10,000
rows, and a failed write (quota) silently switches to memory-only for the
session.

| Endpoint                                       | Who                        | Notes                                       |
| ---------------------------------------------- | -------------------------- | ------------------------------------------- |
| `POST /api/auth/login` `{ email }`             | anyone                     | 401 for unknown emails                      |
| `POST /api/auth/refresh`                       | anyone                     | 401 if the refresh token is invalid/expired |
| `GET /api/applications?page&pageSize&q&status` | signed in                  | scoped by role, paged server-side           |
| `POST /api/applications`                       | SALES                      | creates an empty draft                      |
| `GET /api/applications/:id`                    | signed in, in scope        | masked unless it is your own draft          |
| `PUT /api/applications/:id`                    | owner, DRAFT only          | auto-save                                   |
| `POST /api/applications/:id/submit`            | owner, DRAFT only          | 422 with field errors if incomplete         |
| `GET /api/applications/:id/history`            | signed in, in scope        | newest first                                |
| `GET /api/applications/:id/reveal/:field`      | ADMIN or assigned reviewer | writes a REVEALED audit entry               |
| `GET /api/reviewers`                           | ADMIN                      |                                             |
| `POST /api/applications/:id/assign`            | ADMIN                      | SUBMITTED/UNDER_REVIEW → UNDER_REVIEW       |
| `POST /api/applications/:id/decision`          | assigned REVIEWER          | 422 if rejecting without a 10+ char note    |

Status flow: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED`.

To use a real backend, remove `fakeBackendInterceptor` from `app.config.ts` and
point `ApplicationsApi` / `AuthService` at its base URL. Nothing else changes.

## Security model

**Three layers of authorization.** Route guards keep roles out of pages; `@if`
blocks keep controls out of the DOM (not merely disabled); and the API enforces
every rule again (`src/mocks/backend/fake-backend.spec.ts` proves it: a SALES user
asking to reveal gets 403, an unassigned reviewer gets 404, a decision by anyone
but the assignee gets 403). Hiding a button never grants anything.

**Masking.** List and detail responses never contain full tax IDs or account
numbers, only `*******89`-style values. The only way to see a full value is
`GET …/reveal/:field`, which is role-checked, writes an audit entry, and whose
result the UI re-masks after 30 seconds. The one exception is the owner editing
their own draft, because they typed it.

**Tokens.** The demo issues an access token (60 s) and a refresh token (1 h).
They are unsigned base64 JSON, labelled as such in `token.util.ts`; a real
backend issues signed JWTs and verifies them. The interceptor attaches the
bearer token and, on a 401, calls `AuthService.refresh()` once and retries.
Concurrent 401s share the single in-flight refresh (`share()` + `finalize`),
which `auth.interceptor.spec.ts` verifies with three parallel requests. A failed
refresh signs the user out and sends them to `/login?returnUrl=…`.

Sessions live in `sessionStorage` (tab-scoped, gone when the tab closes) rather
than `localStorage`. The production-grade alternative is an httpOnly, SameSite
cookie for the refresh token so JavaScript can never read it; that needs a
cooperating backend and CSRF protection, which is out of scope here.

**Content Security Policy.** `src/index.html` ships this policy as a meta tag:

```
default-src 'self'; script-src 'self'; style-src 'self' 'nonce-…';
img-src 'self' data:; font-src 'self'; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'
```

- `script-src 'self'` blocks inline and third-party scripts, so an injected
  `<script>` or `javascript:` URL cannot run even if some content slipped past
  Angular's template sanitisation (which escapes bindings and strips unsafe
  HTML/URLs by default; `bypassSecurityTrust*` is never used here).
- `connect-src 'self'` stops a compromised script from exfiltrating revealed
  values to another origin.
- Angular injects component styles as `<style>` tags; `ngCspNonce` on the root
  element gives them the nonce, which is why `style-src` has no `'unsafe-inline'`.
- `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` close the
  plugin, `<base>` hijack and form-redirect holes.

- Critical-CSS inlining is switched off for production builds
  (`optimization.styles.inlineCritical: false` in `angular.json`). The inliner
  loads the main stylesheet through an inline media-switching script, which this
  policy blocks and which left the production build unstyled when checked in
  headless Chrome. The cost is one render-blocking stylesheet request.

In production the server should send the policy as a header with a fresh nonce
per request (a meta tag cannot carry `frame-ancestors` or `report-to`, and a
static nonce is only acceptable for a demo). The policy was verified in Chrome
against both `ng serve` and the production build: no violations are reported.

**No secrets.** There are no API keys, passwords or credentials in the repo; the
login is email-only by design. `gitleaks` was run before publishing.

## Assumptions about the brief

- "Permitted applications" for SALES means the ones they created.
- "Manage assignments" means an admin assigns (or reassigns) one reviewer;
  assigning moves the application to Under review.
- "Risk history" is the audit trail: created, submitted, assigned, revealed,
  approved/rejected (with the note).
- Admins can view drafts (masked) but cannot approve or reject; only the
  assigned reviewer can.
- Only drafts are editable. There is no "request more information" state.
- The brief lists required sections A, B, C, D and F; there is no E.
- Dashboard counts and Socket.IO updates are optional in the brief and were left
  out.

## Tests

100 specs in 17 files, run with Vitest and Angular's TestBed under zoneless
change detection:

- `auth.interceptor.spec.ts` - bearer attached; three concurrent 401s → one
  refresh → three retries with the new token; failed refresh signs out and
  navigates once; a retried 401 signs out; other errors pass through.
- `auth.service.spec.ts` - session hydration (including corrupt storage), login,
  logout, shared in-flight refresh, no resurrection after logout.
- `auth.guard.spec.ts` - auth, guest and role guards and their redirects.
- `validators.spec.ts` - every custom validator, valid and invalid inputs.
- `application-form.store.spec.ts` (fake timers) - dirty before debounce, save
  after the debounce, dedupe, pristine programmatic changes ignored, declaration
  toggles never save, saveNow, error keeps the form, retry, stale save
  cancelled, submit saves first.
- `application-form-page.spec.ts` - no manual Save button; Submit disabled
  until the declaration makes the whole form valid.
- `masked-field.spec.ts` - no button for SALES, reveal, hide, 30 s re-mask,
  timer cleared on destroy.
- `decision-panel.spec.ts` - approve without note, reject blocked by the note
  rule, reject with a valid note.
- `applications-list.store.spec.ts` - first page on creation, append on
  loadMore and stop when complete, duplicate loadMore ignored while in flight,
  filter change cancels and restarts from page 1, failed page keeps rows and
  retries.
- `applications-page.spec.ts` - role-specific controls, first-load error and
  retry, Load more appends the next page, debounced search starts a fresh list.
- `application-detail-page.spec.ts` - per-role controls, reveal refreshes only
  the history, decision applies the server response.
- `fake-backend.spec.ts` - login/refresh/expiry, role scoping, masking, 404 for
  out-of-scope records, reveal permissions and audit, draft ownership, 422 on
  incomplete submit, assignment and decision rules.
- `fake-backend.interceptor.spec.ts`, `mock-db.spec.ts`, `mock-data.spec.ts` -
  persistence only after mutations, memory fallback when storage is full,
  deterministic seeds of 40, 1,000 and 10,000 with unique ids and names.

## AI assistance

Claude Code (Anthropic) was used as a coding assistant. The scope, stack, mock
API shape, security rules and test list were decided by me; the assistant
produced the first version of the code, tests and this README from that
design. Verification: every file was reviewed by me, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` pass locally and in CI,
`gitleaks` found no secrets, and each flow in the walkthrough above was
exercised by hand for all three roles.

## Known limitations

- Dashboard filters are not mirrored to the URL, so a filtered view is not
  shareable. There is no column sorting.
- The application form has three steps; a production version would split
  contacts, bank and processing profile further.
- The fake backend lives in the browser bundle. It is small (one lazy chunk) but
  would be excluded from a real build behind an environment flag.
- No end-to-end tests; the unit suite covers the branches, and the walkthrough
  above covers the integration.
