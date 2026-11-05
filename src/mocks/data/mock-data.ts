import type {
  ApplicationStatus,
  HistoryEntry,
  MerchantApplication,
} from '../../app/features/applications/models/application.models';
import { BANKS } from '../../app/features/applications/models/application.models';
import type { Role, User, UserRef } from '../../app/shared/models/user.models';

/** Every name, company and number here is invented. Nothing refers to a real entity. */
export const DEMO_USERS: Readonly<Record<Role, User>> = {
  SALES: { id: 'u-sales-1', name: 'Sita Gurung', email: 'sita.gurung@example.com', role: 'SALES' },
  REVIEWER: {
    id: 'u-reviewer-1',
    name: 'Rita Shrestha',
    email: 'rita.shrestha@example.com',
    role: 'REVIEWER',
  },
  ADMIN: { id: 'u-admin-1', name: 'Anita Karki', email: 'anita.karki@example.com', role: 'ADMIN' },
};

const OTHER_SALES: User = {
  id: 'u-sales-2',
  name: 'Bikash Thapa',
  email: 'bikash.thapa@example.com',
  role: 'SALES',
};
const OTHER_REVIEWER: User = {
  id: 'u-reviewer-2',
  name: 'Prabin Rai',
  email: 'prabin.rai@example.com',
  role: 'REVIEWER',
};

export const USERS: readonly User[] = [
  DEMO_USERS.SALES,
  OTHER_SALES,
  DEMO_USERS.REVIEWER,
  OTHER_REVIEWER,
  DEMO_USERS.ADMIN,
];

export interface MockDb {
  readonly applications: MerchantApplication[];
  readonly history: HistoryEntry[];
  /** Bumped by every mutation, so persistence can skip requests that only read. */
  version: number;
}

export const DEFAULT_SEED_SIZE = 40;
/** Sizes offered on the login page; the large ones exist to exercise the virtualized list. */
export const SEED_SIZES: readonly number[] = [40, 1_000, 10_000];

const STATUS_CYCLE: readonly ApplicationStatus[] = [
  'SUBMITTED',
  'APPROVED',
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'UNDER_REVIEW',
  'SUBMITTED',
  'DRAFT',
  'APPROVED',
];
const FIRST_WORDS = [
  'Everest',
  'Himalayan',
  'Annapurna',
  'Patan',
  'Thamel',
  'Lumbini',
  'Pokhara',
  'Bhaktapur',
  'Mustang',
  'Gokyo',
];
const SECOND_WORDS = [
  'Coffee House',
  'Trekking Co.',
  'Pottery Studio',
  'Bookshop',
  'Bakery',
  'Textiles',
  'Guest House',
  'Pharmacy',
];
const BASE_DATE = Date.UTC(2026, 10, 1, 9, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = 2 * 365 * DAY_MS;

export function toRef(user: User): UserRef {
  return { id: user.id, name: user.name };
}

export function seedDb(size = DEFAULT_SEED_SIZE): MockDb {
  const random = linearCongruential(20261103);
  const db: MockDb = { applications: [], history: [], version: 0 };
  // One application a day for small seeds; large seeds are spread over two years.
  const stepMs = size > 365 ? TWO_YEARS_MS / size : DAY_MS;
  for (let i = 0; i < size; i++) addApplication(db, i, stepMs, random);
  return db;
}

function addApplication(db: MockDb, i: number, stepMs: number, random: () => number): void {
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const createdBy = i % 3 === 2 ? OTHER_SALES : DEMO_USERS.SALES;
  const reviewed = status === 'UNDER_REVIEW' || status === 'APPROVED' || status === 'REJECTED';
  const reviewer = reviewed ? (i % 4 === 3 ? OTHER_REVIEWER : DEMO_USERS.REVIEWER) : null;
  const createdAt = new Date(BASE_DATE - i * stepMs);
  const at = (hoursLater: number) =>
    new Date(createdAt.getTime() + hoursLater * 3600_000).toISOString();
  const volume = (5 + Math.floor(random() * 95)) * 10_000;
  const isDraft = status === 'DRAFT';

  const app: MerchantApplication = {
    id: `APP-${String(i + 1).padStart(4, '0')}`,
    status,
    createdBy: toRef(createdBy),
    assignedReviewer: reviewer && toRef(reviewer),
    createdAt: at(0),
    updatedAt: at(isDraft ? 1 : 6),
    business: {
      legalName: businessName(i),
      registrationNumber: `REG-${2015 + (i % 10)}-${10_000 + Math.floor(random() * 90_000)}`,
      taxId: String(100_000_000 + Math.floor(random() * 900_000_000)),
      website: i % 2 === 0 ? `https://example-${i + 1}.com.np` : '',
    },
    contacts:
      isDraft && i % 4 === 2
        ? EMPTY_CONTACTS
        : {
            contactEmail: `owner${i + 1}@example.com`,
            contactPhone: `+9779${String(10_000_000 + Math.floor(random() * 90_000_000))}`,
            bankName: BANKS[i % BANKS.length],
            accountNumber: String(100_000_000_000 + Math.floor(random() * 900_000_000_000)),
            expectedMonthlyVolume: volume,
            maxTransactionAmount: (1 + Math.floor(random() * 50)) * 1_000,
          },
  };
  db.applications.push(app);

  const history = (type: HistoryEntry['type'], actor: User, when: string, detail?: string) =>
    db.history.push({
      id: `H-${db.history.length + 1}`,
      applicationId: app.id,
      type,
      actor: toRef(actor),
      at: when,
      detail,
    });

  history('CREATED', createdBy, at(0));
  if (!isDraft) history('SUBMITTED', createdBy, at(2));
  if (reviewer) history('ASSIGNED', DEMO_USERS.ADMIN, at(3), reviewer.name);
  if (status === 'APPROVED')
    history(
      'APPROVED',
      reviewer ?? DEMO_USERS.REVIEWER,
      at(6),
      'Documents verified and risk profile acceptable.',
    );
  if (status === 'REJECTED')
    history(
      'REJECTED',
      reviewer ?? DEMO_USERS.REVIEWER,
      at(6),
      'Registration number could not be verified with the registrar.',
    );
}

export const EMPTY_CONTACTS = {
  contactEmail: '',
  contactPhone: '',
  bankName: '',
  accountNumber: '',
  expectedMonthlyVolume: null,
  maxTransactionAmount: null,
} as const;

export const EMPTY_BUSINESS = {
  legalName: '',
  registrationNumber: '',
  taxId: '',
  website: '',
} as const;

/** 40 distinct word pairs; beyond that a number keeps names unique and searchable. */
function businessName(i: number): string {
  const base = `${FIRST_WORDS[i % FIRST_WORDS.length]} ${SECOND_WORDS[(i * 3) % SECOND_WORDS.length]}`;
  return i < DEFAULT_SEED_SIZE ? base : `${base} #${i + 1}`;
}

/** Tiny deterministic generator so the seed is the same on every machine. */
function linearCongruential(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
