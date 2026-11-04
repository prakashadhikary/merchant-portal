import type { Role } from '../../../shared/models/user.models';

/**
 * Demo tokens are plain base64 JSON and are NOT signed. They exist so the
 * interceptor, refresh flow and expiry checks behave like they would with
 * real JWTs. A real backend issues signed tokens and verifies them server-side.
 */
export interface TokenPayload {
  readonly sub: string;
  readonly role: Role;
  readonly exp: number;
  readonly typ: 'access' | 'refresh';
}

export const ACCESS_TTL_S = 60;
export const REFRESH_TTL_S = 3600;

const ROLES: readonly string[] = ['SALES', 'REVIEWER', 'ADMIN'];

export function encodeToken(payload: TokenPayload): string {
  return btoa(JSON.stringify(payload));
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const value: unknown = JSON.parse(atob(token));
    return isPayload(value) ? value : null;
  } catch {
    return null;
  }
}

export function isExpired(payload: TokenPayload, nowMs = Date.now()): boolean {
  return payload.exp * 1000 <= nowMs;
}

function isPayload(value: unknown): value is TokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['sub'] === 'string' &&
    typeof v['role'] === 'string' &&
    ROLES.includes(v['role']) &&
    typeof v['exp'] === 'number' &&
    (v['typ'] === 'access' || v['typ'] === 'refresh')
  );
}
