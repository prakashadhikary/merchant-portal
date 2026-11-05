import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { seedSession } from '../../../testing/auth';
import { signOutGuard } from '../auth/guards/auth.guard';
import { AuthService } from '../auth/services/auth.service';
import { Layout } from './layout';

@Component({ template: '' })
class Stub {}

describe('Layout sign out', () => {
  let router: Router;
  let auth: AuthService;
  let layout: Layout;
  let canLeave = true;

  beforeEach(async () => {
    canLeave = true;
    seedSession('SALES');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Stub },
          { path: 'logout', canActivate: [signOutGuard], children: [] },
          { path: 'draft', component: Stub, canDeactivate: [() => canLeave] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    layout = TestBed.createComponent(Layout).componentInstance;
    await router.navigateByUrl('/draft');
  });

  it('keeps the session when the current page refuses to be left', async () => {
    canLeave = false;
    await layout.signOut();
    expect(auth.isSignedIn()).toBe(true);
    expect(router.url).toBe('/draft');
  });

  it('ends the session and lands on /login once the page agrees', async () => {
    await layout.signOut();
    expect(auth.isSignedIn()).toBe(false);
    expect(router.url).toBe('/login');
  });
});
