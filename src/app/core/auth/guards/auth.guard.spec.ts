import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { seedSession } from '../../../../testing/auth';
import { authGuard, guestGuard, roleGuard } from './auth.guard';

function run(guard: CanActivateFn, url = '/applications') {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

function serialize(result: unknown): string {
  expect(result).toBeInstanceOf(UrlTree);
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('guards', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('authGuard allows a signed-in user', () => {
    seedSession('SALES');
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard sends a guest to /login with the target as returnUrl', () => {
    expect(serialize(run(authGuard, '/applications/APP-1'))).toBe(
      '/login?returnUrl=%2Fapplications%2FAPP-1',
    );
  });

  it('roleGuard allows a matching role', () => {
    seedSession('ADMIN');
    expect(run(roleGuard('ADMIN', 'REVIEWER'))).toBe(true);
  });

  it('roleGuard sends other roles to /forbidden', () => {
    seedSession('SALES');
    expect(serialize(run(roleGuard('ADMIN')))).toBe('/forbidden');
  });

  it('guestGuard sends a signed-in user to /applications and lets a guest through', () => {
    expect(run(guestGuard)).toBe(true);
    seedSession('REVIEWER');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    expect(serialize(run(guestGuard))).toBe('/applications');
  });
});
