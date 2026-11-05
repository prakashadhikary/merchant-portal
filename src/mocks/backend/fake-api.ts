import { HttpErrorResponse } from '@angular/common/http';
import type { AuthSession } from '../../app/core/auth/services/auth.service';
import {
  ACCESS_TTL_S,
  REFRESH_TTL_S,
  decodeToken,
  encodeToken,
  isExpired,
} from '../../app/core/auth/helpers/token.util';
import type {
  ApplicationData,
  HistoryEntry,
  MerchantApplication,
  Page,
  RevealResult,
  SensitiveField,
} from '../../app/features/applications/models/application.models';
import {
  APPLICATION_STATUSES,
  PAGE_SIZES,
  REVIEWABLE_STATUSES,
  SENSITIVE_FIELD_LABELS,
} from '../../app/features/applications/models/application.models';
import type { User, UserRef } from '../../app/shared/models/user.models';
import { EMPTY_BUSINESS, EMPTY_CONTACTS, MockDb, USERS, toRef } from '../data/mock-data';

/*
 * The "server side" of the demo. Every function takes the acting user and
 * enforces role, ownership and status rules itself, so hiding a button in the
 * UI never grants access. Failures throw HttpErrorResponse.
 */

export function fail(status: number, message: string, errors?: Record<string, string>): never {
  throw new HttpErrorResponse({ status, statusText: message, error: { message, errors } });
}

// ---- auth -----------------------------------------------------------------

export function login(email: string, nowMs: number): AuthSession {
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) fail(401, 'No account with that email');
  return issueSession(user, nowMs);
}

export function refresh(refreshToken: string, nowMs: number): AuthSession {
  const payload = decodeToken(refreshToken);
  const user = payload && USERS.find((u) => u.id === payload.sub);
  if (!payload || payload.typ !== 'refresh' || isExpired(payload, nowMs) || !user) {
    fail(401, 'Session expired, please sign in again');
  }
  return issueSession(user, nowMs);
}

export function authenticate(authorization: string | null, nowMs: number): User {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const payload = token === null ? null : decodeToken(token);
  const user = payload && USERS.find((u) => u.id === payload.sub);
  if (!payload || payload.typ !== 'access' || isExpired(payload, nowMs) || !user) {
    fail(401, 'Unauthorized');
  }
  return user;
}

function issueSession(user: User, nowMs: number): AuthSession {
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

// ---- scoping and read models ---------------------------------------------

function isVisible(app: MerchantApplication, actor: User): boolean {
  switch (actor.role) {
    case 'ADMIN':
      return true;
    case 'SALES':
      return app.createdBy.id === actor.id;
    case 'REVIEWER':
      return app.assignedReviewer?.id === actor.id;
  }
}

/** Out-of-scope records answer 404 so their existence is not revealed. */
function findVisible(db: MockDb, actor: User, id: string): MerchantApplication {
  const app = db.applications.find((a) => a.id === id);
  if (!app || !isVisible(app, actor)) fail(404, 'Application not found');
  return app;
}

function requireOwnedDraft(app: MerchantApplication, actor: User): void {
  if (app.createdBy.id !== actor.id) fail(403, 'Only the creator can edit this application');
  if (app.status !== 'DRAFT') fail(409, 'Only drafts can be edited');
}

function mask(value: string, visible: number): string {
  return value ? '•'.repeat(Math.max(0, value.length - visible)) + value.slice(-visible) : '';
}

/** Full sensitive values only ever leave the API for the owner of a draft. */
function toClientView(app: MerchantApplication, actor: User): MerchantApplication {
  if (app.status === 'DRAFT' && app.createdBy.id === actor.id) return app;
  return {
    ...app,
    business: { ...app.business, taxId: mask(app.business.taxId, 2) },
    contacts: { ...app.contacts, accountNumber: mask(app.contacts.accountNumber, 4) },
  };
}

function update(
  db: MockDb,
  app: MerchantApplication,
  patch: Partial<MerchantApplication>,
): MerchantApplication {
  const next = { ...app, ...patch };
  db.applications[db.applications.indexOf(app)] = next;
  db.version++;
  return next;
}

function addHistory(
  db: MockDb,
  app: MerchantApplication,
  type: HistoryEntry['type'],
  actor: User,
  at: string,
  detail?: string,
): void {
  db.history.push({
    id: `H-${db.history.length + 1}`,
    applicationId: app.id,
    type,
    actor: toRef(actor),
    at,
    detail,
  });
  db.version++;
}

// ---- applications ---------------------------------------------------------

export function listApplications(
  db: MockDb,
  actor: User,
  query: URLSearchParams,
): Page<MerchantApplication> {
  const q = (query.get('q') ?? '').trim().toLowerCase();
  const status = APPLICATION_STATUSES.find((s) => s === query.get('status'));
  const page = Math.max(1, Math.floor(Number(query.get('page')) || 1));
  const pageSize = PAGE_SIZES.find((s) => s === Number(query.get('pageSize'))) ?? 10;

  const matches = db.applications
    .filter((app) => isVisible(app, actor))
    .filter((app) => !status || app.status === status)
    .filter((app) => !q || app.business.legalName.toLowerCase().includes(q))
    .sort((a, b) => newestFirst(a.updatedAt, b.updatedAt));
  const start = (page - 1) * pageSize;
  return {
    items: matches.slice(start, start + pageSize).map((app) => toClientView(app, actor)),
    total: matches.length,
    page,
    pageSize,
  };
}

export function createDraft(db: MockDb, actor: User, now: string): MerchantApplication {
  if (actor.role !== 'SALES') fail(403, 'Only sales users can create applications');
  const app: MerchantApplication = {
    id: `APP-${String(db.applications.length + 1).padStart(4, '0')}`,
    status: 'DRAFT',
    createdBy: toRef(actor),
    assignedReviewer: null,
    createdAt: now,
    updatedAt: now,
    business: EMPTY_BUSINESS,
    contacts: EMPTY_CONTACTS,
  };
  db.applications.push(app);
  addHistory(db, app, 'CREATED', actor, now);
  return app;
}

export function getApplication(db: MockDb, actor: User, id: string): MerchantApplication {
  return toClientView(findVisible(db, actor, id), actor);
}

export function saveDraft(
  db: MockDb,
  actor: User,
  id: string,
  body: Record<string, unknown>,
  now: string,
): MerchantApplication {
  const app = findVisible(db, actor, id);
  requireOwnedDraft(app, actor);
  return update(db, app, { ...parseApplicationData(body), updatedAt: now });
}

export function submitApplication(
  db: MockDb,
  actor: User,
  id: string,
  now: string,
): MerchantApplication {
  const app = findVisible(db, actor, id);
  requireOwnedDraft(app, actor);
  const errors = missingFields(app);
  if (Object.keys(errors).length > 0) fail(422, 'The application is incomplete', errors);
  const submitted = update(db, app, { status: 'SUBMITTED', updatedAt: now });
  addHistory(db, submitted, 'SUBMITTED', actor, now);
  return submitted;
}

export function getHistory(db: MockDb, actor: User, id: string): HistoryEntry[] {
  const app = findVisible(db, actor, id);
  return db.history
    .filter((h) => h.applicationId === app.id)
    .sort((a, b) => newestFirst(a.at, b.at));
}

export function revealField(
  db: MockDb,
  actor: User,
  id: string,
  field: string,
  now: string,
): RevealResult {
  if (!isSensitiveField(field)) fail(400, 'Unknown field');
  const app = findVisible(db, actor, id);
  const canReveal =
    app.status !== 'DRAFT' && (actor.role === 'ADMIN' || app.assignedReviewer?.id === actor.id);
  if (!canReveal) fail(403, 'You are not permitted to reveal this value');
  addHistory(db, app, 'REVEALED', actor, now, SENSITIVE_FIELD_LABELS[field]);
  return { field, value: field === 'taxId' ? app.business.taxId : app.contacts.accountNumber };
}

export function listReviewers(actor: User): UserRef[] {
  if (actor.role !== 'ADMIN') fail(403, 'Only admins can list reviewers');
  return USERS.filter((u) => u.role === 'REVIEWER').map(toRef);
}

export function assignReviewer(
  db: MockDb,
  actor: User,
  id: string,
  body: Record<string, unknown>,
  now: string,
): MerchantApplication {
  if (actor.role !== 'ADMIN') fail(403, 'Only admins can assign reviewers');
  const app = findVisible(db, actor, id);
  if (!REVIEWABLE_STATUSES.includes(app.status))
    fail(409, 'Only submitted applications can be assigned');
  const reviewer = USERS.find((u) => u.role === 'REVIEWER' && u.id === body['reviewerId']);
  if (!reviewer) fail(422, 'Unknown reviewer');
  const assigned = update(db, app, {
    status: 'UNDER_REVIEW',
    assignedReviewer: toRef(reviewer),
    updatedAt: now,
  });
  addHistory(db, assigned, 'ASSIGNED', actor, now, reviewer.name);
  return assigned;
}

export function recordDecision(
  db: MockDb,
  actor: User,
  id: string,
  body: Record<string, unknown>,
  now: string,
): MerchantApplication {
  const app = findVisible(db, actor, id);
  if (actor.role !== 'REVIEWER' || app.assignedReviewer?.id !== actor.id) {
    fail(403, 'Only the assigned reviewer can record a decision');
  }
  if (!REVIEWABLE_STATUSES.includes(app.status)) fail(409, 'A decision has already been recorded');
  const decision = body['decision'];
  if (decision !== 'APPROVE' && decision !== 'REJECT')
    fail(400, 'Decision must be APPROVE or REJECT');
  const note = typeof body['note'] === 'string' ? body['note'].trim() : '';
  if (decision === 'REJECT' && note.length < 10) {
    fail(422, 'A note of at least 10 characters is required when rejecting');
  }
  const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const decided = update(db, app, { status, updatedAt: now });
  addHistory(db, decided, status, actor, now, note || undefined);
  return decided;
}

/** ISO-8601 timestamps sort correctly as plain strings, far cheaper than localeCompare on big lists. */
function newestFirst(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

// ---- input parsing --------------------------------------------------------

function isSensitiveField(value: string): value is SensitiveField {
  return value === 'taxId' || value === 'accountNumber';
}

function parseApplicationData(body: Record<string, unknown>): ApplicationData {
  const business = asRecord(body['business']);
  const contacts = asRecord(body['contacts']);
  return {
    business: {
      legalName: text(business['legalName']),
      registrationNumber: text(business['registrationNumber']),
      taxId: text(business['taxId']),
      website: text(business['website']),
    },
    contacts: {
      contactEmail: text(contacts['contactEmail']),
      contactPhone: text(contacts['contactPhone']),
      bankName: text(contacts['bankName']),
      accountNumber: text(contacts['accountNumber']),
      expectedMonthlyVolume: amount(contacts['expectedMonthlyVolume']),
      maxTransactionAmount: amount(contacts['maxTransactionAmount']),
    },
  };
}

function missingFields(app: MerchantApplication): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: Record<string, unknown> = {
    'business.legalName': app.business.legalName,
    'business.registrationNumber': app.business.registrationNumber,
    'business.taxId': app.business.taxId,
    'contacts.contactEmail': app.contacts.contactEmail,
    'contacts.contactPhone': app.contacts.contactPhone,
    'contacts.bankName': app.contacts.bankName,
    'contacts.accountNumber': app.contacts.accountNumber,
    'contacts.expectedMonthlyVolume': app.contacts.expectedMonthlyVolume,
    'contacts.maxTransactionAmount': app.contacts.maxTransactionAmount,
  };
  for (const [field, value] of Object.entries(required)) {
    if (value === '' || value === null) errors[field] = 'Required';
  }
  return errors;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 200) : '';
}

function amount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
