import { Routes } from '@angular/router';
import { authGuard, guestGuard, signOutGuard } from './core/auth/guards/auth.guard';
import { Layout } from './core/layout/layout';
import { ForbiddenPage } from './core/pages/forbidden-page/forbidden-page';
import { NotFoundPage } from './core/pages/not-found-page/not-found-page';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login-page/login-page').then((m) => m.LoginPage),
  },
  // Componentless on purpose: signOutGuard always redirects to /login.
  { path: 'logout', canActivate: [signOutGuard], children: [] },
  {
    path: '',
    component: Layout,
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'applications' },
      {
        path: 'applications',
        loadChildren: () =>
          import('./features/applications/applications.routes').then((m) => m.APPLICATIONS_ROUTES),
      },
      { path: 'forbidden', component: ForbiddenPage },
      { path: '**', component: NotFoundPage },
    ],
  },
];
