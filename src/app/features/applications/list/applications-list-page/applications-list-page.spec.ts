import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Role } from '../../../../shared/models/user.models';
import { seedSession } from '../../../../../testing/auth';
import { makeApplication, makePage } from '../../../../../testing/fixtures';
import { ApplicationsListPage, SEARCH_DEBOUNCE_MS } from './applications-list-page';

describe('ApplicationsListPage', () => {
  let fixture: ComponentFixture<ApplicationsListPage>;
  let http: HttpTestingController;

  function render(role: Role): void {
    seedSession(role);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApplicationsListPage);
    fixture.detectChanges();
  }

  /** Lets the virtual scroll viewport measure itself and render its first rows. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function expectList() {
    return http.expectOne((r) => r.method === 'GET' && r.url === '/api/applications');
  }

  afterEach(() => http.verify());

  it('requests the first page and renders the rows with the loaded count', async () => {
    render('SALES');
    const req = expectList();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('q')).toBe(false);
    req.flush(
      makePage([
        makeApplication({
          business: { ...makeApplication().business, legalName: 'Everest Coffee' },
        }),
      ]),
    );
    await settle();
    expect(text()).toContain('Everest Coffee');
    expect(text()).toContain('Showing 1 of 1');
    expect(text()).toContain('All applications loaded');
  });

  it('offers "New application" to SALES only', async () => {
    render('SALES');
    expectList().flush(makePage([]));
    await settle();
    expect(text()).toContain('New application');
    expect(text()).toContain("You haven't created an application yet.");
  });

  it('hides "New application" and the Created-by column from REVIEWER', async () => {
    render('REVIEWER');
    expectList().flush(makePage([makeApplication()]));
    await settle();
    expect(text()).not.toContain('New application');
    expect(text()).not.toContain('Created by');
  });

  it('shows the error state and re-requests on Retry', async () => {
    render('ADMIN');
    expectList().flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(text()).toContain("Couldn't load applications: boom");

    const retry = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Retry');
    retry?.click();
    await settle();
    expectList().flush(makePage([makeApplication()]));
    await settle();
    expect(text()).toContain('Everest Coffee House');
  });

  it('offers Load more while pages remain and appends the next page', async () => {
    render('ADMIN');
    expectList().flush(makePage([makeApplication()], 30));
    await settle();
    expect(text()).toContain('Showing 1 of 30');

    const loadMore = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Load more');
    loadMore?.click();
    await settle();
    const req = expectList();
    expect(req.request.params.get('page')).toBe('2');
    req.flush(makePage([makeApplication({ id: 'APP-0002' })], 30));
    await settle();
    expect(text()).toContain('Showing 2 of 30');
  });

  it('debounces the search and starts a fresh list', () => {
    vi.useFakeTimers();
    render('ADMIN');
    expectList().flush(makePage([]));
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#search');
    if (!input) throw new Error('search input missing');
    input.value = 'tea';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    fixture.detectChanges();
    http.expectNone((r) => r.url === '/api/applications');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    const req = expectList();
    expect(req.request.params.get('q')).toBe('tea');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(makePage([]));
  });

  it('filters again when the same term is typed after the filters were cleared', () => {
    vi.useFakeTimers();
    render('ADMIN');
    expectList().flush(makePage([]));
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#search');
    if (!input) throw new Error('search input missing');

    input.value = 'tea';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    fixture.detectChanges();
    expectList().flush(makePage([]));

    fixture.componentInstance.clearFilters();
    fixture.detectChanges();
    expectList().flush(makePage([]));

    input.value = 'tea';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    fixture.detectChanges();
    const req = expectList();
    expect(req.request.params.get('q')).toBe('tea');
    req.flush(makePage([]));
  });
});
