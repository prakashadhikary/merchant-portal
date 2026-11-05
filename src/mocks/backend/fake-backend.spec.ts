import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import type {
  MerchantApplication,
  Page,
} from '../../app/features/applications/models/application.models';
import type { User } from '../../app/shared/models/user.models';
import { makeSession } from '../../testing/auth';
import { handleRequest } from './fake-backend';
import { DEMO_USERS, MockDb, DEFAULT_SEED_SIZE, seedDb } from '../data/mock-data';

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const sales = DEMO_USERS.SALES;
const reviewer = DEMO_USERS.REVIEWER;
const admin = DEMO_USERS.ADMIN;

describe('fake backend', () => {
  let db: MockDb;

  beforeEach(() => (db = seedDb()));

  function headersFor(actor?: User, token?: string): HttpHeaders {
    const bearer = token ?? (actor ? makeSession(actor, NOW).accessToken : null);
    return bearer ? new HttpHeaders({ Authorization: `Bearer ${bearer}` }) : new HttpHeaders();
  }

  function get<T>(url: string, actor?: User, token?: string): T {
    const response = handleRequest(
      db,
      new HttpRequest('GET', url, { headers: headersFor(actor, token) }),
      NOW,
    );
    return (response as HttpResponse<T>).body as T;
  }

  function send<T>(method: 'POST' | 'PUT', url: string, body: unknown, actor?: User): T {
    const response = handleRequest(
      db,
      new HttpRequest(method, url, body, { headers: headersFor(actor) }),
      NOW,
    );
    return (response as HttpResponse<T>).body as T;
  }

  function statusOf(call: () => unknown): number {
    try {
      call();
      return 200;
    } catch (error) {
      return (error as HttpErrorResponse).status;
    }
  }

  function find(predicate: (app: MerchantApplication) => boolean): MerchantApplication {
    const app = db.applications.find(predicate);
    if (!app) throw new Error('No seeded application matches');
    return app;
  }

  describe('auth', () => {
    it('logs in a seeded email and rejects unknown ones', () => {
      const session = send<{ user: User }>('POST', '/api/auth/login', {
        email: 'Sita.Gurung@example.com',
      });
      expect(session.user.id).toBe(sales.id);
      expect(statusOf(() => send('POST', '/api/auth/login', { email: 'nobody@example.com' }))).toBe(
        401,
      );
    });

    it('answers 401 without a token, with an expired token, and with a refresh token', () => {
      expect(statusOf(() => get('/api/applications'))).toBe(401);
      const expired = makeSession(sales, NOW - 10 * 60 * 1000).accessToken;
      expect(statusOf(() => get('/api/applications', undefined, expired))).toBe(401);
      expect(
        statusOf(() => get('/api/applications', undefined, makeSession(sales, NOW).refreshToken)),
      ).toBe(401);
    });

    it('refreshes with a valid refresh token only', () => {
      const session = makeSession(sales, NOW);
      expect(
        send<{ user: User }>('POST', '/api/auth/refresh', { refreshToken: session.refreshToken })
          .user.id,
      ).toBe(sales.id);
      expect(
        statusOf(() => send('POST', '/api/auth/refresh', { refreshToken: session.accessToken })),
      ).toBe(401);
    });
  });

  describe('list scoping', () => {
    it('shows SALES only what they created, drafts included', () => {
      const page = get<Page<MerchantApplication>>('/api/applications?pageSize=50', sales);
      expect(page.total).toBeGreaterThan(0);
      expect(page.total).toBeLessThan(DEFAULT_SEED_SIZE);
      expect(page.items.every((a) => a.createdBy.id === sales.id)).toBe(true);
      expect(page.items.some((a) => a.status === 'DRAFT')).toBe(true);
    });

    it('shows REVIEWER only assigned applications and never drafts', () => {
      const page = get<Page<MerchantApplication>>('/api/applications?pageSize=50', reviewer);
      expect(page.total).toBeGreaterThan(0);
      expect(page.items.every((a) => a.assignedReviewer?.id === reviewer.id)).toBe(true);
      expect(page.items.some((a) => a.status === 'DRAFT')).toBe(false);
    });

    it('shows ADMIN everything, paged and filtered server-side', () => {
      expect(get<Page<MerchantApplication>>('/api/applications', admin).total).toBe(
        DEFAULT_SEED_SIZE,
      );
      const second = get<Page<MerchantApplication>>('/api/applications?page=2&pageSize=25', admin);
      expect(second.items).toHaveLength(DEFAULT_SEED_SIZE - 25);
      const approved = get<Page<MerchantApplication>>(
        '/api/applications?status=APPROVED&q=everest',
        admin,
      );
      expect(approved.items.every((a) => a.status === 'APPROVED')).toBe(true);
      expect(
        approved.items.every((a) => a.business.legalName.toLowerCase().includes('everest')),
      ).toBe(true);
    });

    it('falls back to defaults for garbage query values', () => {
      const page = get<Page<MerchantApplication>>(
        '/api/applications?page=abc&pageSize=99&status=NOPE',
        admin,
      );
      expect(page.page).toBe(1);
      expect(page.pageSize).toBe(10);
      expect(page.total).toBe(DEFAULT_SEED_SIZE);
    });
  });

  describe('masking', () => {
    it('masks sensitive values for everyone except the owner of a draft', () => {
      const submitted = find((a) => a.status === 'SUBMITTED' && a.createdBy.id === sales.id);
      const view = get<MerchantApplication>(`/api/applications/${submitted.id}`, admin);
      expect(view.business.taxId).toMatch(/^•+\d{2}$/);
      expect(view.contacts.accountNumber).toMatch(/^•+\d{4}$/);

      const draft = find(
        (a) => a.status === 'DRAFT' && a.createdBy.id === sales.id && a.business.taxId !== '',
      );
      expect(get<MerchantApplication>(`/api/applications/${draft.id}`, sales).business.taxId).toBe(
        draft.business.taxId,
      );
    });

    it('masks the record returned by submit, assign and decision too', () => {
      const draft = find(
        (a) => a.status === 'DRAFT' && a.createdBy.id === sales.id && a.business.taxId !== '',
      );
      const submitted = send<MerchantApplication>(
        'POST',
        `/api/applications/${draft.id}/submit`,
        {},
        sales,
      );
      expect(submitted.business.taxId).toMatch(/^•+\d{2}$/);
      expect(submitted.contacts.accountNumber).toMatch(/^•+\d{4}$/);

      const assigned = send<MerchantApplication>(
        'POST',
        `/api/applications/${submitted.id}/assign`,
        { reviewerId: reviewer.id },
        admin,
      );
      expect(assigned.business.taxId).toMatch(/^•+\d{2}$/);
      expect(assigned.contacts.accountNumber).toMatch(/^•+\d{4}$/);

      const decided = send<MerchantApplication>(
        'POST',
        `/api/applications/${assigned.id}/decision`,
        { decision: 'APPROVE' },
        reviewer,
      );
      expect(decided.business.taxId).toMatch(/^•+\d{2}$/);
      expect(decided.contacts.accountNumber).toMatch(/^•+\d{4}$/);
    });

    it('hides out-of-scope applications behind a 404', () => {
      const foreign = find((a) => a.createdBy.id !== sales.id);
      expect(statusOf(() => get(`/api/applications/${foreign.id}`, sales))).toBe(404);
      const unassigned = find((a) => a.status === 'SUBMITTED');
      expect(statusOf(() => get(`/api/applications/${unassigned.id}`, reviewer))).toBe(404);
    });
  });

  describe('reveal', () => {
    it('is refused for SALES and allowed for ADMIN and the assigned reviewer, with an audit entry', () => {
      const app = find(
        (a) =>
          a.status === 'UNDER_REVIEW' &&
          a.assignedReviewer?.id === reviewer.id &&
          a.createdBy.id === sales.id,
      );
      expect(statusOf(() => get(`/api/applications/${app.id}/reveal/taxId`, sales))).toBe(403);
      expect(get<{ value: string }>(`/api/applications/${app.id}/reveal/taxId`, admin).value).toBe(
        app.business.taxId,
      );
      expect(
        get<{ value: string }>(`/api/applications/${app.id}/reveal/accountNumber`, reviewer).value,
      ).toBe(app.contacts.accountNumber);
      const revealed = db.history.filter(
        (h) => h.applicationId === app.id && h.type === 'REVEALED',
      );
      expect(revealed.map((h) => h.actor.id)).toEqual([admin.id, reviewer.id]);
    });

    it('rejects unknown fields', () => {
      const app = find((a) => a.status === 'SUBMITTED');
      expect(statusOf(() => get(`/api/applications/${app.id}/reveal/legalName`, admin))).toBe(400);
    });
  });

  describe('drafts and submission', () => {
    it('creates drafts for SALES only', () => {
      expect(statusOf(() => send('POST', '/api/applications', {}, reviewer))).toBe(403);
      const draft = send<MerchantApplication>('POST', '/api/applications', {}, sales);
      expect(draft.status).toBe('DRAFT');
      expect(db.history.some((h) => h.applicationId === draft.id && h.type === 'CREATED')).toBe(
        true,
      );
    });

    it('lets only the owner edit, and only while it is a draft', () => {
      const draft = find((a) => a.status === 'DRAFT' && a.createdBy.id === sales.id);
      const body = {
        business: { ...draft.business, legalName: 'Renamed' },
        contacts: draft.contacts,
      };
      expect(
        send<MerchantApplication>('PUT', `/api/applications/${draft.id}`, body, sales).business
          .legalName,
      ).toBe('Renamed');
      expect(statusOf(() => send('PUT', `/api/applications/${draft.id}`, body, admin))).toBe(403);
      const submitted = find((a) => a.status === 'SUBMITTED' && a.createdBy.id === sales.id);
      expect(statusOf(() => send('PUT', `/api/applications/${submitted.id}`, body, sales))).toBe(
        409,
      );
    });

    it('refuses to submit an incomplete draft with field errors', () => {
      const draft = find(
        (a) =>
          a.status === 'DRAFT' && a.createdBy.id === sales.id && a.contacts.contactEmail === '',
      );
      try {
        send('POST', `/api/applications/${draft.id}/submit`, {}, sales);
        throw new Error('expected 422');
      } catch (error) {
        const response = error as HttpErrorResponse;
        expect(response.status).toBe(422);
        expect(response.error.errors).toHaveProperty('contacts.contactEmail');
      }
    });

    it('submits a complete draft and records history', () => {
      const draft = find(
        (a) =>
          a.status === 'DRAFT' && a.createdBy.id === sales.id && a.contacts.contactEmail !== '',
      );
      const submitted = send<MerchantApplication>(
        'POST',
        `/api/applications/${draft.id}/submit`,
        {},
        sales,
      );
      expect(submitted.status).toBe('SUBMITTED');
      expect(db.history.some((h) => h.applicationId === draft.id && h.type === 'SUBMITTED')).toBe(
        true,
      );
    });
  });

  describe('assignment and decisions', () => {
    it('lets only ADMIN assign, and only while reviewable', () => {
      const submitted = find((a) => a.status === 'SUBMITTED');
      expect(
        statusOf(() =>
          send(
            'POST',
            `/api/applications/${submitted.id}/assign`,
            { reviewerId: reviewer.id },
            sales,
          ),
        ),
      ).toBe(403);
      const assigned = send<MerchantApplication>(
        'POST',
        `/api/applications/${submitted.id}/assign`,
        { reviewerId: reviewer.id },
        admin,
      );
      expect(assigned.status).toBe('UNDER_REVIEW');
      expect(assigned.assignedReviewer?.id).toBe(reviewer.id);
      const approved = find((a) => a.status === 'APPROVED');
      expect(
        statusOf(() =>
          send(
            'POST',
            `/api/applications/${approved.id}/assign`,
            { reviewerId: reviewer.id },
            admin,
          ),
        ),
      ).toBe(409);
      expect(
        statusOf(() =>
          send('POST', `/api/applications/${submitted.id}/assign`, { reviewerId: 'nobody' }, admin),
        ),
      ).toBe(422);
    });

    it('lets only the assigned reviewer decide, and enforces the rejection note', () => {
      const app = find(
        (a) => a.status === 'UNDER_REVIEW' && a.assignedReviewer?.id === reviewer.id,
      );
      const other = find(
        (a) => a.status === 'UNDER_REVIEW' && a.assignedReviewer?.id !== reviewer.id,
      );
      expect(
        statusOf(() =>
          send('POST', `/api/applications/${other.id}/decision`, { decision: 'APPROVE' }, reviewer),
        ),
      ).toBe(404);
      expect(
        statusOf(() =>
          send('POST', `/api/applications/${app.id}/decision`, { decision: 'APPROVE' }, admin),
        ),
      ).toBe(403);
      expect(
        statusOf(() =>
          send(
            'POST',
            `/api/applications/${app.id}/decision`,
            { decision: 'REJECT', note: 'short' },
            reviewer,
          ),
        ),
      ).toBe(422);

      const rejected = send<MerchantApplication>(
        'POST',
        `/api/applications/${app.id}/decision`,
        { decision: 'REJECT', note: 'Registration number not found.' },
        reviewer,
      );
      expect(rejected.status).toBe('REJECTED');
      expect(
        db.history.find((h) => h.applicationId === app.id && h.type === 'REJECTED')?.detail,
      ).toBe('Registration number not found.');
      expect(
        statusOf(() =>
          send('POST', `/api/applications/${app.id}/decision`, { decision: 'APPROVE' }, reviewer),
        ),
      ).toBe(409);
    });
  });
});
