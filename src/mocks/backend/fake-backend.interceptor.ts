import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { map, timer } from 'rxjs';
import { handleRequest } from './fake-backend';
import { loadDb, saveDb } from '../data/mock-db';

export const FAKE_BACKEND_DELAY_MS = new InjectionToken<number>('FAKE_BACKEND_DELAY_MS', {
  providedIn: 'root',
  factory: () => 300,
});

/** Answers `/api/*` requests in the browser; everything else passes through. */
export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const delayMs = inject(FAKE_BACKEND_DELAY_MS);
  return timer(delayMs).pipe(
    map(() => {
      const db = loadDb();
      const version = db.version;
      const response = handleRequest(db, req, Date.now());
      if (db.version !== version) saveDb(db);
      return response;
    }),
  );
};
