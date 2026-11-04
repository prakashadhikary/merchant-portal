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
    const req = http.expectOne((r) => r.method === 'GET' && r.url === '/api/applications');
    expect(req.request.params.get('page')).toBe(String(page));
    expect(req.request.params.get('pageSize')).toBe(String(PAGE_SIZE));
    for (const [key, value] of Object.entries(extra))
      expect(req.request.params.get(key)).toBe(value);
    return req;
  }

  it('loads the first page on creation', () => {
    expect(store.state().loading).toBe(true);
    expectPage(1).flush(makePage(items(PAGE_SIZE), 40));
    expect(store.state()).toMatchObject({ total: 40, loading: false, error: null });
    expect(store.state().items).toHaveLength(PAGE_SIZE);
    expect(store.hasMore()).toBe(true);
  });

  it('appends the next page on loadMore and stops once everything is loaded', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 40));
    store.loadMore();
    expectPage(2).flush(makePage(items(15, PAGE_SIZE + 1), 40));
    expect(store.state().items).toHaveLength(40);
    expect(store.state().items[39].id).toBe('APP-0040');
    expect(store.hasMore()).toBe(false);

    store.loadMore();
    http.expectNone((r) => r.url === '/api/applications');
  });

  it('ignores loadMore while a page is still in flight', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 60));
    store.loadMore();
    store.loadMore();
    expectPage(2).flush(makePage(items(PAGE_SIZE, PAGE_SIZE + 1), 60));
    expect(store.state().items).toHaveLength(50);
  });

  it('starts over from page 1 when the filters change, cancelling the page in flight', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 60));
    store.loadMore();
    const second = expectPage(2);

    store.setFilters({ q: 'tea', status: 'APPROVED' });
    TestBed.tick();
    expect(second.cancelled).toBe(true);
    expect(store.state()).toMatchObject({ items: [], total: null, loading: true });

    expectPage(1, { q: 'tea', status: 'APPROVED' }).flush(makePage(items(3), 3));
    expect(store.state().items).toHaveLength(3);
    expect(store.hasMore()).toBe(false);
  });

  it('keeps the loaded rows when a page fails and retries that page', () => {
    expectPage(1).flush(makePage(items(PAGE_SIZE), 40));
    store.loadMore();
    expectPage(2).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(store.state()).toMatchObject({ loading: false, error: 'boom' });
    expect(store.state().items).toHaveLength(PAGE_SIZE);
    expect(store.hasMore()).toBe(true);

    store.loadMore();
    expectPage(2).flush(makePage(items(15, PAGE_SIZE + 1), 40));
    expect(store.state()).toMatchObject({ error: null });
    expect(store.state().items).toHaveLength(40);
  });
});
