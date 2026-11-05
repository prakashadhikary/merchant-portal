import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  EMPTY,
  filter,
  map,
  merge,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { MerchantApplication } from '../../models/application.models';
import { ApplicationsApi } from '../../services/applications.api';
import { buildApplicationForm, toApplicationData } from '../helpers/application-form.helper';

export type SaveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'dirty' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly at: Date }
  | { readonly kind: 'error'; readonly message: string };

export const AUTOSAVE_DEBOUNCE_MS = 1000;

const UNSAVED: readonly SaveStatus['kind'][] = ['dirty', 'saving', 'error'];

/**
 * Owns the application form and auto-saves it. Provided by
 * ApplicationFormPage, so it lives exactly as long as the page.
 *
 * Pipeline: user edits → `dirty` → debounce → skip if nothing changed since
 * the last successful save → PUT (switchMap drops a stale in-flight save) →
 * `saved` or `error`. Errors are caught inside the inner observable so the
 * outer subscription, and with it auto-save, never dies. The form is never
 * patched from a response, so typing during a save is never lost.
 */
@Injectable()
export class ApplicationFormStore {
  private readonly api = inject(ApplicationsApi);
  private readonly saveNow$ = new Subject<void>();
  private lastSaved = { json: '', at: new Date(0) };

  readonly form = buildApplicationForm();
  readonly application = signal<MerchantApplication | null>(null);
  readonly saveStatus = signal<SaveStatus>({ kind: 'idle' });

  constructor() {
    // The declaration is a submit-time confirmation, not draft data, so it never triggers a save.
    const { business, contacts } = this.form.controls;
    const edits$ = merge(business.valueChanges, contacts.valueChanges).pipe(
      filter(() => business.dirty || contacts.dirty),
      tap(() => this.saveStatus.set({ kind: 'dirty' })),
      debounceTime(AUTOSAVE_DEBOUNCE_MS),
    );
    merge(edits$, this.saveNow$)
      .pipe(
        switchMap(() => this.save()),
        takeUntilDestroyed(),
      )
      .subscribe((status) => this.saveStatus.set(status));
  }

  load(id: string): Observable<MerchantApplication> {
    return this.api.get(id).pipe(
      tap((app) => {
        this.application.set(app);
        this.form.reset(
          { business: app.business, contacts: app.contacts, declaration: false },
          { emitEvent: false },
        );
        this.lastSaved = {
          json: JSON.stringify(toApplicationData(this.form)),
          at: new Date(app.updatedAt),
        };
        this.saveStatus.set({ kind: 'idle' });
      }),
    );
  }

  /** Bypasses the debounce: step changes and Retry use it. */
  saveNow(): void {
    this.saveNow$.next();
  }

  hasUnsavedChanges(): boolean {
    return UNSAVED.includes(this.saveStatus().kind);
  }

  /** Saves the latest values first so the server validates exactly what the user sees. */
  submit(): Observable<MerchantApplication> {
    const app = this.application();
    if (!app) return EMPTY;
    return this.api
      .saveDraft(app.id, toApplicationData(this.form))
      .pipe(switchMap(() => this.api.submit(app.id)));
  }

  private save(): Observable<SaveStatus> {
    const app = this.application();
    if (!app) return EMPTY;
    const data = toApplicationData(this.form);
    const json = JSON.stringify(data);
    if (json === this.lastSaved.json)
      return of<SaveStatus>({ kind: 'saved', at: this.lastSaved.at });

    this.saveStatus.set({ kind: 'saving' });
    return this.api.saveDraft(app.id, data).pipe(
      map((saved): SaveStatus => {
        this.lastSaved = { json, at: new Date(saved.updatedAt) };
        return { kind: 'saved', at: this.lastSaved.at };
      }),
      catchError((error: unknown) =>
        of<SaveStatus>({ kind: 'error', message: errorMessage(error) }),
      ),
    );
  }
}
