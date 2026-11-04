import type {
  HistoryEntry,
  MerchantApplication,
  Page,
} from '../app/shared/models/application.models';
import { DEMO_USERS, toRef } from '../mocks/data/mock-data';

export function makeApplication(overrides: Partial<MerchantApplication> = {}): MerchantApplication {
  return {
    id: 'APP-0001',
    status: 'SUBMITTED',
    createdBy: toRef(DEMO_USERS.SALES),
    assignedReviewer: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    business: {
      legalName: 'Everest Coffee House',
      registrationNumber: 'REG-2024-12345',
      taxId: '•••••••89',
      website: 'https://example.com',
    },
    contacts: {
      contactEmail: 'owner@example.com',
      contactPhone: '+9779812345678',
      bankName: 'Nabil Bank',
      accountNumber: '••••••••3456',
      expectedMonthlyVolume: 250000,
      maxTransactionAmount: 20000,
    },
    ...overrides,
  };
}

export function makeDraft(overrides: Partial<MerchantApplication> = {}): MerchantApplication {
  return makeApplication({
    status: 'DRAFT',
    business: { legalName: '', registrationNumber: '', taxId: '', website: '' },
    contacts: {
      contactEmail: '',
      contactPhone: '',
      bankName: '',
      accountNumber: '',
      expectedMonthlyVolume: null,
      maxTransactionAmount: null,
    },
    ...overrides,
  });
}

export function makeHistoryEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'H-1',
    applicationId: 'APP-0001',
    type: 'CREATED',
    actor: toRef(DEMO_USERS.SALES),
    at: '2026-11-01T09:00:00.000Z',
    ...overrides,
  };
}

export function makePage<T>(items: T[], total = items.length): Page<T> {
  return { items, total, page: 1, pageSize: 10 };
}
