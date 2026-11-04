import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { fakeBackendInterceptor } from '../mocks/backend/fake-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Order matters: the auth interceptor attaches the token, then the fake
    // backend answers as a server would. Remove fakeBackendInterceptor to
    // talk to a real API.
    provideHttpClient(withInterceptors([authInterceptor, fakeBackendInterceptor])),
  ],
};
