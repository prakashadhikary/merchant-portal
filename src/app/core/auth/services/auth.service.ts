import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable, share, tap, throwError } from 'rxjs';
import type { Role, User } from '../../../shared/models/user.models';
import { SKIP_AUTH } from '../../http/tokens/skip-auth.token';
import { decodeToken, encodeToken } from '../helpers/token.util';

export interface AuthSession {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** sessionStorage is tab-scoped, so a session does not outlive the tab. */
export const SESSION_STORAGE_KEY = 'merchant-portal-lite.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AuthSession | null>(readStoredSession());
  private refreshInFlight: Observable<string> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly isSignedIn = computed(() => this.session() !== null);

  hasRole(...roles: Role[]): boolean {
    const user = this.user();
    return user !== null && roles.includes(user.role);
  }

  login(email: string): Observable<User> {
    return this.http.post<AuthSession>('/api/auth/login', { email }, { context: skipAuth() }).pipe(
      tap((session) => this.setSession(session)),
      map((session) => session.user),
    );
  }

  logout(): void {
    this.setSession(null);
  }

  /**
   * Exchanges the refresh token for a new pair. Concurrent callers share the
   * one in-flight request: `share()` multicasts it and `finalize` clears the
   * slot once it settles, so the next 401 after that starts a fresh refresh.
   */
  refresh(): Observable<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) return throwError(() => new Error('Not signed in'));

    this.refreshInFlight = this.http
      .post<AuthSession>('/api/auth/refresh', { refreshToken }, { context: skipAuth() })
      .pipe(
        tap((session) => {
          if (this.isSignedIn()) this.setSession(session);
        }),
        map((session) => session.accessToken),
        finalize(() => (this.refreshInFlight = null)),
        share(),
      );
    return this.refreshInFlight;
  }

  /** Dev helper: makes the next API call answer 401 so the refresh flow can be watched. */
  expireAccessToken(): void {
    const session = this.session();
    const payload = session && decodeToken(session.accessToken);
    if (!session || !payload) return;
    const expired = encodeToken({ ...payload, exp: Math.floor(Date.now() / 1000) - 1 });
    this.setSession({ ...session, accessToken: expired });
  }

  private setSession(session: AuthSession | null): void {
    this.session.set(session);
    if (session) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function skipAuth(): HttpContext {
  return new HttpContext().set(SKIP_AUTH, true);
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const value: unknown = raw === null ? null : JSON.parse(raw);
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['accessToken'] === 'string' &&
    typeof v['refreshToken'] === 'string' &&
    typeof v['user'] === 'object' &&
    v['user'] !== null
  );
}
