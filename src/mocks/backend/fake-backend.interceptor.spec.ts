import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { makeSession } from '../../testing/auth';
import { DEMO_USERS } from '../data/mock-data';
import { resetDb } from '../data/mock-db';
import { FAKE_BACKEND_DELAY_MS, fakeBackendInterceptor } from './fake-backend.interceptor';

describe('fakeBackendInterceptor', () => {
  let http: HttpClient;
  const headers = { Authorization: `Bearer ${makeSession(DEMO_USERS.SALES).accessToken}` };

  beforeEach(() => {
    resetDb();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([fakeBackendInterceptor])),
        provideHttpClientTesting(),
        { provide: FAKE_BACKEND_DELAY_MS, useValue: 0 },
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('answers reads without touching storage', async () => {
    await firstValueFrom(http.get('/api/applications', { headers }));
    expect(localStorage.getItem('merchant-portal.db')).toBeNull();
  });

  it('persists after a request that changed data', async () => {
    await firstValueFrom(http.post('/api/applications', {}, { headers }));
    expect(localStorage.getItem('merchant-portal.db')).toContain('APP-0041');
  });

  it('lets requests outside /api pass through to the real backend', () => {
    http.get('/assets/config.json').subscribe();
    TestBed.inject(HttpTestingController).expectOne('/assets/config.json').flush({});
  });
});
