# Merchant Portal

A payments-onboarding portal built as a Senior Frontend Engineer take-home.
Sales staff draft merchant applications in a form that saves itself, admins hand
them to reviewers, and reviewers approve or reject. Tax IDs and account numbers
stay masked until someone with the right role reveals them, and every reveal is
logged.

Angular 22 with standalone components, signals and typed Reactive Forms. RxJS
for async work, Angular CDK for virtual scrolling, Bootstrap 5 compiled from
SCSS, Vitest with TestBed for tests. There is no backend: a fake API runs inside
the browser and answers every request.

## Run it

```bash
npm ci
npm start          # http://localhost:4200
```

Sign in with one of the demo buttons. No passwords exist anywhere.

| Role     | User          | Sees                                   |
| -------- | ------------- | -------------------------------------- |
| Sales    | Sita Gurung   | Her own applications, including drafts |
| Reviewer | Rita Shrestha | Applications assigned to her           |
| Admin    | Anita Karki   | Everything, and assigns reviewers      |

Demo data is generated on first load and kept in `localStorage`, so drafts
survive a reload. On the login page, pick 40, 1,000 or 10,000 applications
under **Demo data** and click **Reset demo data**. The large sets exist to
exercise the virtualized list; they exceed the storage quota, so their edits
last for the session only. Every name, company and number is invented.

### A five-minute tour

1. As **Sita**, create a new application and start typing. The indicator walks
   through "Unsaved changes", "Saving…" and "Draft saved at HH:MM:SS". Reload
   the page: the draft is back. Tick the declaration on the Review step and
   submit.
2. As **Anita**, open the submission and assign Rita. The status becomes
   Under review.
3. As **Rita**, reveal the account number. It re-masks after 30 seconds and
   the history gains a "revealed" entry. Try rejecting with a short note
   (blocked), then approve.
4. As anyone, click **Expire token** in the navbar (dev builds only) and
   navigate. The next call gets a 401, one refresh runs, and the request is
   retried. The fake API answers inside Angular's HTTP pipeline, so nothing
   shows in the Network tab; put a breakpoint in `auth.interceptor.ts` to
   watch it happen.

```bash
npm test -- --watch=false   # 111 specs, zoneless TestBed
npm run lint
npm run format:check
npm run build
```

## How it is put together

```
src/app
  core/        auth (guards, interceptor, session), http helpers, layout, error pages
  shared/      presentational components, pipes, validators, models
  features/
    login/
    applications/
      list/    virtual-scroll dashboard + ApplicationsListStore
      form/    three-step form + ApplicationFormStore (auto-save)
      detail/  record view with assignment and decision panels
src/mocks      fake backend (router, rules, interceptor) and seed data
src/styles     Bootstrap compiled from source with the theme tokens
src/testing    session seeding and fixtures
```

Each component sits in its own folder with its template and spec. Only the
`*-page` components inject services and know about routing; everything else
takes inputs and emits outputs.

A few decisions worth knowing about:

- **Signals at the edge, RxJS in the middle.** Templates read signals. Async
  work is a pipeline of `toObservable → switchMap → toLoadable → toSignal`, so
  a newer request always cancels an older one.
- **`Loadable<T>`** is a `loading | loaded | error` union that templates
  `@switch` on. The detail page and the form load through it, so loading,
  error and retry states come for free.
- **The dashboard** pages server-side in batches of 25, appends on scroll
  (`exhaustMap` ignores a second request while one is in flight) and renders
  rows in a CDK virtual-scroll viewport. The DOM holds only the rows near the
  viewport, whether the list has 40 entries or 10,000. A "Load more" button is
  the keyboard fallback.
- **Auto-save** debounces typed changes by a second, skips saves that match the
  last payload and uses `switchMap` so a stale save is cancelled. The form is
  never patched from a response, so nothing typed mid-save is lost. There is no
  Save button. Submit saves first, then posts, so the server validates exactly
  what the user saw. A `CanDeactivate` guard and `beforeunload` catch unsaved
  edits, and Sign out goes through `/logout` so that prompt runs first.
- **Route-scoped state.** The form store is provided by the form page, so it is
  created and destroyed with it.
- **Lazy routes** for login and the applications feature, protected by
  `authGuard`, `guestGuard`, `roleGuard(...)`, `signOutGuard` and
  `unsavedChangesGuard`.
- **Styling.** Bootstrap is compiled from SCSS with the tokens in
  `_theme.scss`, so every component picks them up. Icons are inline SVG paths,
  so nothing loads from a CDN and the Content Security Policy can stay at
  `'self'`.

## The fake API

An `HttpInterceptorFn` answers every `/api/*` request without calling `next()`,
so nothing reaches the network. Pure functions in `fake-api.ts` behave like a
server: they check the bearer token, scope data by role, enforce the status
flow and answer 401/403/404/409/422 with `{ message, errors? }`. A 300 ms delay
keeps loading states visible. The in-memory database is written to
`localStorage` only after a mutation, so reads stay cheap at 10,000 rows, and a
quota error silently falls back to memory for the session.

| Endpoint                                       | Who                        | Notes                                    |
| ---------------------------------------------- | -------------------------- | ---------------------------------------- |
| `POST /api/auth/login` `{ email }`             | anyone                     | 401 for unknown emails                   |
| `POST /api/auth/refresh`                       | anyone                     | 401 if the refresh token is bad          |
| `GET /api/applications?page&pageSize&q&status` | signed in                  | scoped by role, paged server-side        |
| `POST /api/applications`                       | Sales                      | creates an empty draft                   |
| `GET /api/applications/:id`                    | signed in, in scope        | masked unless it is your own draft       |
| `PUT /api/applications/:id`                    | owner, draft only          | auto-save                                |
| `POST /api/applications/:id/submit`            | owner, draft only          | 422 with field errors if incomplete      |
| `GET /api/applications/:id/history`            | signed in, in scope        | newest first                             |
| `GET /api/applications/:id/reveal/:field`      | Admin or assigned reviewer | writes a REVEALED audit entry            |
| `GET /api/reviewers`                           | Admin                      |                                          |
| `POST /api/applications/:id/assign`            | Admin                      | moves the record to Under review         |
| `POST /api/applications/:id/decision`          | assigned Reviewer          | rejecting needs a note of 10+ characters |

Status flow: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED`.

To use a real backend, remove `fakeBackendInterceptor` from `app.config.ts` and
point the API clients at its base URL. Nothing else changes.

## Security

**Authorization happens three times.** Route guards keep roles out of pages,
`@if` blocks keep controls out of the DOM rather than merely disabling them,
and the API checks every rule again. `fake-backend.spec.ts` proves the last
layer: a Sales user asking to reveal gets 403, an unassigned reviewer gets 404.
Hiding a button never grants anything.

**Masking.** No list or detail response contains a full tax ID or account
number, only `*******89`. The one route that returns a full value is
role-checked, writes an audit entry, and the UI re-masks its result after 30
seconds. The owner editing their own draft is the exception, because they typed
it.

**Tokens.** The demo issues a 60-second access token and a one-hour refresh
token as unsigned base64 JSON, labelled as such in `token.util.ts`. On a 401
the interceptor refreshes once and retries; concurrent 401s share one in-flight
refresh, which the spec checks with three parallel requests. A failed refresh
signs the user out. Sessions live in `sessionStorage`, so they die with the
tab. The production answer is an httpOnly, SameSite cookie for the refresh
token, which needs a cooperating backend and is out of scope here.

**Content Security Policy.** `index.html` ships this as a meta tag. It was
verified in Chrome against both `ng serve` and the production build with no
violations:

```
default-src 'self'; script-src 'self'; style-src 'self' 'nonce-…';
img-src 'self' data:; font-src 'self'; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'
```

No inline or third-party script can run, a compromised script cannot send
revealed values to another origin, and `ngCspNonce` lets Angular's component
styles through without `'unsafe-inline'`. Critical-CSS inlining is switched off
in `angular.json` because the inliner relies on an inline script the policy
blocks. In production the server should send the policy as a header with a
fresh nonce per request.

**No secrets.** Login is email-only by design, and `gitleaks` was run before
publishing.

## Tests

111 specs in 20 files, run with Vitest and TestBed under zoneless change
detection. Highlights:

- The auth interceptor: three concurrent 401s produce one refresh and three
  retries with the new token.
- The form store, under fake timers: dirty before the debounce, saved after it,
  duplicates skipped, a stale save cancelled, typing during a save keeps the
  form dirty, submit saves first.
- The list store: a filter change cancels and restarts from page 1, and a
  failed page keeps the rows already loaded.
- The fake backend: role scoping, masking, reveal permissions and audit, draft
  ownership, 422 on an incomplete submit, assignment and decision rules.
- Persistence: writes only after mutations, memory fallback when storage is
  full, deterministic seeds with unique ids and names.

## Reading of the brief

- "Permitted applications" for Sales means the ones they created.
- "Manage assignments" means an admin assigns or reassigns one reviewer, which
  moves the application to Under review.
- "Risk history" is the audit trail: created, submitted, assigned, revealed,
  approved or rejected with the note.
- Admins see drafts (masked) but only the assigned reviewer can decide.
- Only drafts are editable. There is no "request more information" state.
- The brief lists sections A, B, C, D and F; there is no E.
- Dashboard counts and Socket.IO updates are optional and were left out.

## AI assistance

Claude Code was used as a coding assistant. I decided the scope, stack, mock
API shape, security rules and test list; the assistant produced the first
version of the code, tests and this README from that design. I reviewed every
file. Lint, format check, tests and build pass locally and in CI, `gitleaks`
found no secrets, and I ran the tour above by hand for all three roles.

## Known limitations

- Dashboard filters are not mirrored to the URL, so a filtered view cannot be
  shared. There is no column sorting.
- The form has three steps; a production version would split contacts, bank
  and processing profile further.
- The fake backend ships in the browser bundle as one lazy chunk. A real build
  would exclude it behind an environment flag.
- No end-to-end tests. The unit suite covers the branches and the tour covers
  the integration.
