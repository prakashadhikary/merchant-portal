import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Role } from '../../../shared/models/user.models';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isSignedIn()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isSignedIn()) return true;

  return router.createUrlTree(['/applications']);
};

/**
 * Ends the session from inside a navigation so the page being left runs its
 * canDeactivate guards first (Angular runs them before canActivate). Logging
 * out before navigating would skip the unsaved-changes prompt, because that
 * guard lets a signed-out user leave freely.
 */
export const signOutGuard: CanActivateFn = () => {
  inject(AuthService).logout();
  return inject(Router).createUrlTree(['/login']);
};

export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.hasRole(...roles) || router.createUrlTree(['/forbidden']);
  };
}
