import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  map,
  mergeMap,
  Observable,
  of,
  scan,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { ApplicationStatus, MerchantApplication, Page } from '../../models/application.models';
import { ApplicationsApi } from '../../services/applications.api';

export interface ListFilters {
  readonly q: string;
  readonly status: ApplicationStatus | '';
}

export type PageStatus = 'loading' | 'loaded' | 'error';

export interface ListState {
  /** One slot per application on the server; null until its page has arrived. */
  readonly rows: readonly (MerchantApplication | null)[];
  /** null until the first page has arrived. */
  readonly total: number | null;
  /** Keyed by 1-based page number; pages never requested are absent. */
  readonly pages: ReadonlyMap<number, PageStatus>;
  /** Message from the most recent failed page, while any page is still failed. */
  readonly error: string | null;
}

type PageEvent =
  | { readonly kind: 'loading'; readonly page: number }
  | { readonly kind: 'loaded'; readonly page: number; readonly data: Page<MerchantApplication> }
  | { readonly kind: 'error'; readonly page: number; readonly message: string };

export const PAGE_SIZE = 25;
export const DEFAULT_FILTERS: ListFilters = { q: '', status: '' };
const INITIAL: ListState = { rows: [], total: null, pages: new Map(), error: null };

/**
 * Random-access list over the server-paged API. The first page supplies the
 * total, which sizes `rows`; after that `loadRange()` fetches whichever pages
 * cover the rows on screen, so jumping to the end skips the pages in between.
 * Filters start over (switchMap cancels every page in flight). A failed page
 * stays failed until `retry()`, so scrolling past it does not hammer the API.
 */
@Injectable()
export class ApplicationsListStore {
  private readonly api = inject(ApplicationsApi);
  private readonly request$ = new Subject<number>();

  readonly filters = signal(DEFAULT_FILTERS);
  readonly hasFilters = computed(() => this.filters().q !== '' || this.filters().status !== '');
  readonly state = toSignal(
    toObservable(this.filters).pipe(switchMap((filters) => this.load(filters))),
    { initialValue: INITIAL },
  );
  readonly loading = computed(() => [...this.state().pages.values()].includes('loading'));
  readonly loadedCount = computed(() => this.state().rows.filter((row) => row !== null).length);

  setFilters(patch: Partial<ListFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...patch }));
  }

  /** Requests the pages covering rows [start, end) that are not loaded, loading or failed. */
  loadRange(start: number, end: number): void {
    const { total, pages } = this.state();
    if (total === null || total === 0) return;
    const first = Math.floor(Math.max(0, start) / PAGE_SIZE) + 1;
    const last = Math.ceil(Math.min(end, total) / PAGE_SIZE);
    for (let page = first; page <= last; page++) {
      if (!pages.has(page)) this.request$.next(page);
    }
  }

  /** Re-requests every failed page, including the first one when nothing has loaded yet. */
  retry(): void {
    for (const [page, status] of this.state().pages) {
      if (status === 'error') this.request$.next(page);
    }
  }

  private load(filters: ListFilters): Observable<ListState> {
    return this.request$.pipe(
      startWith(1),
      mergeMap((page) =>
        this.api.list({ ...filters, page, pageSize: PAGE_SIZE }).pipe(
          map((data): PageEvent => ({ kind: 'loaded', page, data })),
          catchError((error: unknown) =>
            of<PageEvent>({ kind: 'error', page, message: errorMessage(error) }),
          ),
          startWith<PageEvent>({ kind: 'loading', page }),
        ),
      ),
      scan(reduce, INITIAL),
    );
  }
}

function reduce(state: ListState, event: PageEvent): ListState {
  const pages = new Map(state.pages);
  switch (event.kind) {
    case 'loading':
      pages.set(event.page, 'loading');
      return { ...state, pages, error: hasErrors(pages) ? state.error : null };
    case 'error':
      pages.set(event.page, 'error');
      return { ...state, pages, error: event.message };
    case 'loaded': {
      pages.set(event.page, 'loaded');
      const { items, total } = event.data;
      // The total can move between requests if applications are created or
      // filtered out meanwhile; resize to the latest one the server reported.
      const rows = Array.from({ length: total }, (_, i) => state.rows[i] ?? null);
      const offset = (event.page - 1) * PAGE_SIZE;
      items.slice(0, Math.max(0, total - offset)).forEach((item, i) => (rows[offset + i] = item));
      return { rows, total, pages, error: hasErrors(pages) ? state.error : null };
    }
  }
}

function hasErrors(pages: ReadonlyMap<number, PageStatus>): boolean {
  return [...pages.values()].includes('error');
}
