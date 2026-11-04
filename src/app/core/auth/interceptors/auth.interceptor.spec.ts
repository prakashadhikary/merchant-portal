import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DEMO_USERS } from '../../../../mocks/data/mock-data';
import { makeSession, seedSession } from '../../../../testing/auth';
import { SKIP_AUTH } from '../../http/tokens/skip-auth.token';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof spyOnNavigate>;

  function spyOnNavigate() {
    return vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  function configure(signedIn = true) {
    if (signedIn) seedSession('SALES');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = spyOnNavigate();
  }

  afterEach(() => ctrl.verify());

  it('attaches the bearer token', () => {
    configure();
    http.get('/api/applications').subscribe();
    const req = ctrl.expectOne('/api/applications');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${auth.accessToken()}`);
    req.flush({});
  });

  it('leaves SKIP_AUTH requests untouched and never retries them', () => {
    configure();
    const context = new HttpContext().set(SKIP_AUTH, true);
    http.post('/api/auth/login', {}, { context }).subscribe({ error: () => undefined });
    const req = ctrl.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ message: 'bad' }, UNAUTHORIZED);
    ctrl.expectNone('/api/auth/refresh');
  });

  it('refreshes once for several concurrent 401s and retries each with the new token', () => {
    configure();
    const results: unknown[] = [];
    for (const url of ['/api/a', '/api/b', '/api/c']) {
      http.get(url).subscribe((body) => results.push(body));
    }
    const firstAttempts = ctrl.match((r) => r.url.startsWith('/api/') && !r.url.includes('/auth/'));
    expect(firstAttempts).toHaveLength(3);
    firstAttempts.forEach((r) => r.flush({ message: 'expired' }, UNAUTHORIZED));

    const refresh = ctrl.expectOne({ method: 'POST', url: '/api/auth/refresh' });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ ...makeSession(DEMO_USERS.SALES), accessToken: 'new-token' });

    const retries = ctrl.match((r) => r.url.startsWith('/api/') && !r.url.includes('/auth/'));
    expect(retries).toHaveLength(3);
    retries.forEach((r) => {
      expect(r.request.headers.get('Authorization')).toBe('Bearer new-token');
      r.flush({ ok: true });
    });
    expect(results).toHaveLength(3);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs out and navigates to /login once when the refresh fails', () => {
    configure();
    const errors: unknown[] = [];
    http.get('/api/a').subscribe({ error: (e: unknown) => errors.push(e) });
    http.get('/api/b').subscribe({ error: (e: unknown) => errors.push(e) });
    ctrl.match((r) => !r.url.includes('/auth/')).forEach((r) => r.flush({}, UNAUTHORIZED));
    ctrl.expectOne('/api/auth/refresh').flush({ message: 'expired' }, UNAUTHORIZED);

    expect(errors).toHaveLength(2);
    expect(auth.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('signs out when the retried request is rejected again', () => {
    configure();
    http.get('/api/a').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/a').flush({}, UNAUTHORIZED);
    ctrl.expectOne('/api/auth/refresh').flush(makeSession(DEMO_USERS.SALES));
    ctrl.expectOne('/api/a').flush({}, UNAUTHORIZED);
    expect(auth.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('passes other errors through without refreshing', () => {
    configure();
    let status = 0;
    http.get('/api/a').subscribe({ error: (e: { status: number }) => (status = e.status) });
    ctrl.expectOne('/api/a').flush({}, { status: 500, statusText: 'Server Error' });
    ctrl.expectNone('/api/auth/refresh');
    expect(status).toBe(500);
    expect(auth.isSignedIn()).toBe(true);
  });

  it('does not try to refresh when nobody is signed in', () => {
    configure(false);
    let status = 0;
    http.get('/api/a').subscribe({ error: (e: { status: number }) => (status = e.status) });
    const req = ctrl.expectOne('/api/a');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, UNAUTHORIZED);
    ctrl.expectNone('/api/auth/refresh');
    expect(status).toBe(401);
  });
});
