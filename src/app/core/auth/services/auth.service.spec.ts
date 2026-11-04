import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../../../mocks/data/mock-data';
import { makeSession, seedSession } from '../../../../testing/auth';
import { AuthService, SESSION_STORAGE_KEY } from './auth.service';
import { decodeToken, isExpired } from '../helpers/token.util';

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('hydrates a session from sessionStorage', () => {
    seedSession('REVIEWER');
    const auth = TestBed.inject(AuthService);
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.user()?.role).toBe('REVIEWER');
    expect(auth.hasRole('REVIEWER', 'ADMIN')).toBe(true);
    expect(auth.hasRole('SALES')).toBe(false);
  });

  it('treats an unparseable or malformed session as signed out', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(TestBed.inject(AuthService).isSignedIn()).toBe(false);
  });

  it('login stores and persists the session', () => {
    const auth = TestBed.inject(AuthService);
    const session = makeSession(DEMO_USERS.SALES);
    let user: string | undefined;
    auth.login('sita.gurung@example.com').subscribe((u) => (user = u.name));

    const req = http.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(req.request.body).toEqual({ email: 'sita.gurung@example.com' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(session);

    expect(user).toBe('Sita Gurung');
    expect(auth.accessToken()).toBe(session.accessToken);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(JSON.stringify(session));
  });

  it('logout clears the signals and the storage', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    auth.logout();
    expect(auth.isSignedIn()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('shares one in-flight refresh between concurrent callers', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    const results: string[] = [];
    auth.refresh().subscribe((token) => results.push(token));
    auth.refresh().subscribe((token) => results.push(token));

    const req = http.expectOne({ method: 'POST', url: '/api/auth/refresh' });
    req.flush({ ...makeSession(DEMO_USERS.SALES), accessToken: 'new-token' });

    expect(results).toEqual(['new-token', 'new-token']);
    expect(auth.accessToken()).toBe('new-token');
  });

  it('starts a new refresh once the previous one has completed', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(makeSession(DEMO_USERS.SALES));
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(makeSession(DEMO_USERS.SALES));
  });

  it('clears the in-flight refresh on error so the next call retries', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    let failed = false;
    auth.refresh().subscribe({ error: () => (failed = true) });
    http
      .expectOne('/api/auth/refresh')
      .flush({ message: 'nope' }, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);

    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(makeSession(DEMO_USERS.SALES));
  });

  it('does not resurrect a session when a refresh completes after logout', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    auth.refresh().subscribe();
    auth.logout();
    http.expectOne('/api/auth/refresh').flush(makeSession(DEMO_USERS.SALES));
    expect(auth.isSignedIn()).toBe(false);
  });

  it('fails immediately without a session', () => {
    const auth = TestBed.inject(AuthService);
    let failed = false;
    auth.refresh().subscribe({ error: () => (failed = true) });
    expect(failed).toBe(true);
  });

  it('expireAccessToken produces a token whose expiry is in the past', () => {
    seedSession('SALES');
    const auth = TestBed.inject(AuthService);
    auth.expireAccessToken();
    const payload = decodeToken(auth.accessToken() ?? '');
    expect(payload).not.toBeNull();
    expect(isExpired(payload!)).toBe(true);
  });
});
