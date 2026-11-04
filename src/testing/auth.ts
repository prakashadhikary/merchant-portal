import { AuthSession, SESSION_STORAGE_KEY } from '../app/core/auth/services/auth.service';
import { ACCESS_TTL_S, REFRESH_TTL_S, encodeToken } from '../app/core/auth/helpers/token.util';
import type { Role, User } from '../app/shared/models/user.models';
import { DEMO_USERS } from '../mocks/data/mock-data';

export function makeSession(user: User, nowMs = Date.now()): AuthSession {
  const now = Math.floor(nowMs / 1000);
  return {
    user,
    accessToken: encodeToken({
      sub: user.id,
      role: user.role,
      exp: now + ACCESS_TTL_S,
      typ: 'access',
    }),
    refreshToken: encodeToken({
      sub: user.id,
      role: user.role,
      exp: now + REFRESH_TTL_S,
      typ: 'refresh',
    }),
  };
}

/** Writes a valid session to sessionStorage. Call it before AuthService is first injected. */
export function seedSession(role: Role): User {
  const user = DEMO_USERS[role];
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(makeSession(user)));
  return user;
}
