import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { seedSession } from '../../../../../testing/auth';
import { makeApplication, makePage } from '../../../../../testing/fixtures';
import { ApplicationsListStore, PAGE_SIZE } from './applications-list.store';

function items(count: number, from = 1) {
  return Array.from({ length: count }, (_, i) =>
    makeApplication({ id: `APP-${String(from + i).padStart(4, '0')}` }),
  );
}

describe('ApplicationsListStore', () => {
  let store: ApplicationsListStore;
  let http: HttpTestingController;

  beforeEach(() => {
    seedSession('ADMIN');
    TestBed.configureTestingModule({
      providers: [ApplicationsListStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ApplicationsListStore);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  function expectPage(page: number, extra: Record<string, string> = {}) {
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === '/api/applications' &&
        r.params.get('page') === String(page),
    );
    expect(req.request.params.get('pageSize')).toBe(String(PAGE_SIZE));
    for (const [key, value] of Object.entries(extra))
      expect(req.request.params.get(key)).toBe(value);
    return req;
  }

  const fail = { message: 'boom' };
  const serverError = { status: 500, statusText: 'Server Error' };

  it('loads the first page on creation and sizes the rows to the total', () => {
    expect(store.loading()).toBe(true);
    expectPage(1).flush(makePage(items(PAGE_SIZE), 80));
    expect(store.state()).toMatchObject({ total: 80, error: null });
    expect(store.state().rows).toHaveLength(80);
    expect(store.state().rows[PAGE_SIZE - 1]?.id).toBe('APP-0025');
    expect(store.state().rows[PAGE_SIZE]).toBeNull();
    expect(store.loadedCount()).toBe(PAGE_SIZE);
    expect(store.loading()).toBe(false);
  });

  it('jumps straight to the pages covering a range, skipping the ones in between', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 80));
    store.loadRange(70, 80);
    expectPage(3).flush(makePage(items(PAGE_SIZE, 51), 80));
    expectPage(4).flush(makePage(items(5, 76), 80));
    const { rows } = store.state();
    expect(rows[50]?.id).toBe('APP-0051');
    expect(rows[79]?.id).toBe('APP-0080');
    expect(rows[PAGE_SIZE]).toBeNull();
    expect(store.loadedCount()).toBe(55);
  });

  it('does not request a page that is loaded or still in flight', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 80));
    store.loadRange(0, 30);
    store.loadRange(20, 40);
    expectPage(2).flush(makePage(items(PAGE_SIZE, 26), 80));
    store.loadRange(0, 50);
    http.expectNone((r) => r.url === '/api/applications');
  });

  it('starts over from page 1 when the filters change, cancelling the pages in flight', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 80));
    store.loadRange(30, 40);
    const second = expectPage(2);

    store.setFilters({ q: 'tea', status: 'APPROVED' });
    TestBed.tick();
    expect(second.cancelled).toBe(true);
    expect(store.state()).toMatchObject({ rows: [], total: null });
    expect(store.loading()).toBe(true);

    expectPage(1, { q: 'tea', status: 'APPROVED' }).flush(makePage(items(3), 3));
    expect(store.state().rows).toHaveLength(3);
    expect(store.loadedCount()).toBe(3);
  });

  it('leaves a failed page alone until retry, keeping the rows already loaded', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 40));
    store.loadRange(30, 40);
    expectPage(2).flush(fail, serverError);
    expect(store.state().error).toBe('boom');
    expect(store.loadedCount()).toBe(PAGE_SIZE);

    store.loadRange(30, 40);
    http.expectNone((r) => r.url === '/api/applications');

    store.retry();
    expectPage(2).flush(makePage(items(15, PAGE_SIZE + 1), 40));
    expect(store.state().error).toBeNull();
    expect(store.loadedCount()).toBe(40);
  });

  it('retries the first page when nothing has loaded yet', () => {
    expectPage(1).flush(fail, serverError);
    expect(store.state()).toMatchObject({ total: null, error: 'boom' });
    store.retry();
    expectPage(1).flush(makePage(items(2), 2));
    expect(store.state()).toMatchObject({ total: 2, error: null });
  });
});
