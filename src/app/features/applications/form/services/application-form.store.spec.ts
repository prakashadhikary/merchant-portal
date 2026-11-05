import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { seedSession } from '../../../../../testing/auth';
import { makeDraft } from '../../../../../testing/fixtures';
import { AUTOSAVE_DEBOUNCE_MS, ApplicationFormStore } from './application-form.store';

describe('ApplicationFormStore auto-save', () => {
  let store: ApplicationFormStore;
  let http: HttpTestingController;
  const DRAFT_URL = '/api/applications/APP-0001';

  beforeEach(() => {
    vi.useFakeTimers();
    seedSession('SALES');
    TestBed.configureTestingModule({
      providers: [ApplicationFormStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ApplicationFormStore);
    http = TestBed.inject(HttpTestingController);
    store.load('APP-0001').subscribe();
    http.expectOne(DRAFT_URL).flush(makeDraft());
  });

  afterEach(() => http.verify());

  function edit(path: string, value: unknown): void {
    const control = store.form.get(path);
    if (!control) throw new Error(`No control at ${path}`);
    control.markAsDirty();
    control.setValue(value);
  }

  function expectPut() {
    return http.expectOne({ method: 'PUT', url: DRAFT_URL });
  }

  it('loads the draft into a pristine form and stays idle', () => {
    expect(store.form.pristine).toBe(true);
    expect(store.saveStatus().kind).toBe('idle');
    expect(store.application()?.id).toBe('APP-0001');
  });

  it('marks the draft dirty synchronously, before the debounce fires', () => {
    edit('business.legalName', 'Everest Coffee');
    expect(store.saveStatus().kind).toBe('dirty');
    expect(store.hasUnsavedChanges()).toBe(true);
    http.expectNone({ method: 'PUT', url: DRAFT_URL });
  });

  it('saves once the user stops typing for the debounce period', () => {
    edit('business.legalName', 'Everest');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1);
    edit('business.legalName', 'Everest Coffee');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1);
    http.expectNone({ method: 'PUT', url: DRAFT_URL });

    vi.advanceTimersByTime(1);
    const put = expectPut();
    expect(put.request.body).toMatchObject({ business: { legalName: 'Everest Coffee' } });
    expect(store.saveStatus().kind).toBe('saving');

    put.flush(makeDraft({ updatedAt: '2026-11-03T10:00:00.000Z' }));
    expect(store.saveStatus()).toEqual({ kind: 'saved', at: new Date('2026-11-03T10:00:00.000Z') });
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('ignores programmatic changes on a pristine form', () => {
    store.form.controls.business.controls.legalName.setValue('Set by code');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    http.expectNone({ method: 'PUT', url: DRAFT_URL });
    expect(store.saveStatus().kind).toBe('idle');
  });

  it('leaves the save status alone when only the declaration is toggled', () => {
    edit('declaration', true);
    expect(store.saveStatus().kind).toBe('idle');
    expect(store.hasUnsavedChanges()).toBe(false);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    http.expectNone({ method: 'PUT', url: DRAFT_URL });
    expect(store.saveStatus().kind).toBe('idle');
  });

  it('does not re-save when the value is back to what was last saved', () => {
    edit('business.legalName', 'Everest');
    edit('business.legalName', '');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    http.expectNone({ method: 'PUT', url: DRAFT_URL });
    expect(store.saveStatus().kind).toBe('saved');
  });

  it('saveNow bypasses the debounce', () => {
    edit('business.legalName', 'Everest');
    store.saveNow();
    expectPut().flush(makeDraft());
    expect(store.saveStatus().kind).toBe('saved');
  });

  it('keeps the form value and reports the error when a save fails', () => {
    edit('business.legalName', 'Everest');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    expectPut().flush(
      { message: 'Simulated failure' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(store.saveStatus()).toEqual({ kind: 'error', message: 'Simulated failure' });
    expect(store.form.controls.business.controls.legalName.value).toBe('Everest');
    expect(store.hasUnsavedChanges()).toBe(true);
  });

  it('retries the identical payload after a failure', () => {
    edit('business.legalName', 'Everest');
    store.saveNow();
    expectPut().flush({}, { status: 500, statusText: 'Server Error' });

    store.saveNow();
    const retry = expectPut();
    expect(retry.request.body).toMatchObject({ business: { legalName: 'Everest' } });
    retry.flush(makeDraft());
    expect(store.saveStatus().kind).toBe('saved');
  });

  it('drops a stale in-flight save when a newer one starts', () => {
    edit('business.legalName', 'Ever');
    store.saveNow();
    const first = expectPut();
    edit('business.legalName', 'Everest');
    store.saveNow();
    expect(first.cancelled).toBe(true);
    expectPut().flush(makeDraft());
    expect(store.saveStatus().kind).toBe('saved');
  });

  it('stays dirty when the user keeps typing while a save is in flight', () => {
    edit('business.legalName', 'Everest');
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    const put = expectPut();
    edit('business.legalName', 'Everest Coffee');
    put.flush(makeDraft());
    expect(store.saveStatus().kind).toBe('dirty');
    expect(store.hasUnsavedChanges()).toBe(true);

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    const next = expectPut();
    expect(next.request.body).toMatchObject({ business: { legalName: 'Everest Coffee' } });
    next.flush(makeDraft());
    expect(store.saveStatus().kind).toBe('saved');
  });

  it('submit saves the current values before posting', () => {
    edit('business.legalName', 'Everest');
    let submitted = false;
    store.submit().subscribe(() => (submitted = true));
    expectPut().flush(makeDraft());
    http
      .expectOne({ method: 'POST', url: `${DRAFT_URL}/submit` })
      .flush(makeDraft({ status: 'SUBMITTED' }));
    expect(submitted).toBe(true);
  });
});
