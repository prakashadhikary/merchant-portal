import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  exhaustMap,
  map,
  Observable,
  of,
  scan,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { ApplicationStatus, MerchantApplication, Page } from '../../models/application.models';
import { ApplicationsApi } from '../../services/applications.api';

export interface ListFilters {
  readonly q: string;
  readonly status: ApplicationStatus | '';
}

export interface ListState {
  readonly items: readonly MerchantApplication[];
  /** null until the first page has arrived. */
  readonly total: number | null;
  readonly loading: boolean;
  readonly error: string | null;
}

type PageEvent =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly page: Page<MerchantApplication> }
  | { readonly kind: 'error'; readonly message: string };

/** Must exceed the rows visible in the viewport, or the first page could never trigger a scroll. */
export const PAGE_SIZE = 25;
export const DEFAULT_FILTERS: ListFilters = { q: '', status: '' };
const INITIAL: ListState = { items: [], total: null, loading: true, error: null };

/**
 * Infinite list over the server-paged API. Filters start a fresh page
 * sequence (switchMap cancels any page still in flight); `loadMore()` fetches
 * the next page and appends it. `exhaustMap` makes a second loadMore() during
 * a request a no-op, and errors keep the rows already loaded so Retry only
 * re-requests the page that failed.
 */
@Injectable()
export class ApplicationsListStore {
  private readonly api = inject(ApplicationsApi);
  private readonly loadMore$ = new Subject<void>();

  readonly filters = signal(DEFAULT_FILTERS);
  readonly hasFilters = computed(() => this.filters().q !== '' || this.filters().status !== '');
  readonly state = toSignal(
    toObservable(this.filters).pipe(switchMap((filters) => this.pages(filters))),
    { initialValue: INITIAL },
  );
  readonly hasMore = computed(() => {
    const { items, total } = this.state();
    return total === null || items.length < total;
  });

  setFilters(patch: Partial<ListFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...patch }));
  }

  loadMore(): void {
    if (this.hasMore() && !this.state().loading) this.loadMore$.next();
  }

  private pages(filters: ListFilters): Observable<ListState> {
    let nextPage = 1;
    return this.loadMore$.pipe(
      startWith(undefined),
      exhaustMap(() =>
        this.api.list({ ...filters, page: nextPage, pageSize: PAGE_SIZE }).pipe(
          tap(() => nextPage++),
          map((page): PageEvent => ({ kind: 'loaded', page })),
          catchError((error: unknown) =>
            of<PageEvent>({ kind: 'error', message: errorMessage(error) }),
          ),
          startWith<PageEvent>({ kind: 'loading' }),
        ),
      ),
      scan(reduce, INITIAL),
    );
  }
}

function reduce(state: ListState, event: PageEvent): ListState {
  switch (event.kind) {
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'error':
      return { ...state, loading: false, error: event.message };
    case 'loaded':
      return {
        items: [...state.items, ...event.page.items],
        total: event.page.total,
        loading: false,
        error: null,
      };
  }
}
