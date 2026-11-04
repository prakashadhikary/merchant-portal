import { catchError, map, Observable, of, startWith } from 'rxjs';
import { errorMessage } from './api-error';

/** Async state as a discriminated union so templates can switch on `status`. */
export type Loadable<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly data: T }
  | { readonly status: 'error'; readonly message: string };

export const LOADING: Loadable<never> = { status: 'loading' };

export function toLoadable<T>(): (source: Observable<T>) => Observable<Loadable<T>> {
  return (source) =>
    source.pipe(
      map((data): Loadable<T> => ({ status: 'loaded', data })),
      catchError((error: unknown) =>
        of<Loadable<T>>({ status: 'error', message: errorMessage(error) }),
      ),
      startWith<Loadable<T>>({ status: 'loading' }),
    );
}
