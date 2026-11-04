import type { UserRef } from './user.models';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/** Statuses in which a reviewer can still be assigned and a decision recorded. */
export const REVIEWABLE_STATUSES: readonly ApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];

export const BANKS: readonly string[] = [
  'Nepal Investment Mega Bank',
  'Himalayan Bank',
  'Nabil Bank',
  'Global IME Bank',
  'Siddhartha Bank',
  'Laxmi Sunrise Bank',
];

export type SensitiveField = 'taxId' | 'accountNumber';

export const SENSITIVE_FIELD_LABELS: Record<SensitiveField, string> = {
  taxId: 'Tax ID',
  accountNumber: 'Account number',
};

export interface BusinessDetails {
  readonly legalName: string;
  readonly registrationNumber: string;
  readonly taxId: string;
  readonly website: string;
}

export interface ContactsAndBank {
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly expectedMonthlyVolume: number | null;
  readonly maxTransactionAmount: number | null;
}

/** The editable part of an application; drafts may hold empty fields. */
export interface ApplicationData {
  readonly business: BusinessDetails;
  readonly contacts: ContactsAndBank;
}

export interface MerchantApplication extends ApplicationData {
  readonly id: string;
  readonly status: ApplicationStatus;
  readonly createdBy: UserRef;
  readonly assignedReviewer: UserRef | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type HistoryEventType =
  'CREATED' | 'SUBMITTED' | 'ASSIGNED' | 'REVEALED' | 'APPROVED' | 'REJECTED';

export interface HistoryEntry {
  readonly id: string;
  readonly applicationId: string;
  readonly type: HistoryEventType;
  readonly actor: UserRef;
  readonly at: string;
  /** Reviewer name for ASSIGNED, field label for REVEALED, note for decisions. */
  readonly detail?: string;
}

export type PageSize = 10 | 25 | 50;
export const PAGE_SIZES: readonly PageSize[] = [10, 25, 50];

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ApplicationsQuery {
  readonly page: number;
  readonly pageSize: PageSize;
  readonly q: string;
  readonly status: ApplicationStatus | '';
}

export type Decision = 'APPROVE' | 'REJECT';

export interface DecisionInput {
  readonly decision: Decision;
  readonly note?: string;
}

export interface RevealResult {
  readonly field: SensitiveField;
  readonly value: string;
}
