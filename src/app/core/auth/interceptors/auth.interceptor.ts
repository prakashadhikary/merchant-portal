import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { isStatus } from '../../http/helpers/api-error';
import { SKIP_AUTH } from '../../http/tokens/skip-auth.token';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the bearer token and, on a 401, refreshes it once and retries the
 * request. Requests that fail together share one refresh (see AuthService).
 * If the refresh fails, or the retry is rejected again, the user is signed out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);

  const forceSignOut = (error: unknown): Observable<never> => {
    if (auth.isSignedIn()) {
      auth.logout();
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => error);
  };

  return next(withBearer(req, auth.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!isStatus(error, 401) || !auth.isSignedIn()) return throwError(() => error);
      return auth.refresh().pipe(
        catchError(() => forceSignOut(error)),
        switchMap((token) => next(withBearer(req, token))),
        catchError((retryError: unknown) =>
          isStatus(retryError, 401) ? forceSignOut(retryError) : throwError(() => retryError),
        ),
      );
    }),
  );
};

function withBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
