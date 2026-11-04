import { HttpRequest, HttpResponse } from '@angular/common/http';
import type { User } from '../../app/shared/models/user.models';
import {
  assignReviewer,
  authenticate,
  createDraft,
  fail,
  getApplication,
  getHistory,
  listApplications,
  listReviewers,
  login,
  recordDecision,
  refresh,
  revealField,
  saveDraft,
  submitApplication,
} from './fake-api';
import type { MockDb } from '../data/mock-data';

interface Context {
  readonly db: MockDb;
  readonly actor: User;
  readonly params: readonly string[];
  readonly body: Record<string, unknown>;
  readonly query: URLSearchParams;
  readonly now: string;
}

interface Route {
  readonly method: string;
  readonly pattern: RegExp;
  readonly status?: number;
  readonly handle: (ctx: Context) => unknown;
}

const ROUTES: readonly Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/applications$/,
    handle: (c) => listApplications(c.db, c.actor, c.query),
  },
  {
    method: 'POST',
    pattern: /^\/api\/applications$/,
    status: 201,
    handle: (c) => createDraft(c.db, c.actor, c.now),
  },
  { method: 'GET', pattern: /^\/api\/reviewers$/, handle: (c) => listReviewers(c.actor) },
  {
    method: 'GET',
    pattern: /^\/api\/applications\/([^/]+)$/,
    handle: (c) => getApplication(c.db, c.actor, c.params[0]),
  },
  {
    method: 'PUT',
    pattern: /^\/api\/applications\/([^/]+)$/,
    handle: (c) => saveDraft(c.db, c.actor, c.params[0], c.body, c.now),
  },
  {
    method: 'POST',
    pattern: /^\/api\/applications\/([^/]+)\/submit$/,
    handle: (c) => submitApplication(c.db, c.actor, c.params[0], c.now),
  },
  {
    method: 'GET',
    pattern: /^\/api\/applications\/([^/]+)\/history$/,
    handle: (c) => getHistory(c.db, c.actor, c.params[0]),
  },
  {
    method: 'GET',
    pattern: /^\/api\/applications\/([^/]+)\/reveal\/([^/]+)$/,
    handle: (c) => revealField(c.db, c.actor, c.params[0], c.params[1], c.now),
  },
  {
    method: 'POST',
    pattern: /^\/api\/applications\/([^/]+)\/assign$/,
    handle: (c) => assignReviewer(c.db, c.actor, c.params[0], c.body, c.now),
  },
  {
    method: 'POST',
    pattern: /^\/api\/applications\/([^/]+)\/decision$/,
    handle: (c) => recordDecision(c.db, c.actor, c.params[0], c.body, c.now),
  },
];

/**
 * Routes one request to the matching handler. Throws HttpErrorResponse for
 * every failure, exactly as a real server would answer.
 */
export function handleRequest(
  db: MockDb,
  req: HttpRequest<unknown>,
  nowMs: number,
): HttpResponse<unknown> {
  const url = new URL(req.urlWithParams, 'http://localhost');
  const body = asRecord(req.body);

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    return ok(login(stringOf(body['email']), nowMs));
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/refresh') {
    return ok(refresh(stringOf(body['refreshToken']), nowMs));
  }

  const actor = authenticate(req.headers.get('Authorization'), nowMs);
  for (const route of ROUTES) {
    const match = route.method === req.method ? url.pathname.match(route.pattern) : null;
    if (!match) continue;
    const ctx: Context = {
      db,
      actor,
      params: match.slice(1),
      body,
      query: url.searchParams,
      now: new Date(nowMs).toISOString(),
    };
    return ok(route.handle(ctx), route.status);
  }
  return fail(404, 'Not found');
}

function ok(body: unknown, status = 200): HttpResponse<unknown> {
  return new HttpResponse({ status, body });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
