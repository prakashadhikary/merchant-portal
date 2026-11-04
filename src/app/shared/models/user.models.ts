export type Role = 'SALES' | 'REVIEWER' | 'ADMIN';

export const ROLE_LABELS: Record<Role, string> = {
  SALES: 'Sales',
  REVIEWER: 'Reviewer',
  ADMIN: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SALES: 'Creates and submits merchant applications',
  REVIEWER: 'Reviews assigned applications and records decisions',
  ADMIN: 'Sees every application and assigns reviewers',
};

export interface UserRef {
  readonly id: string;
  readonly name: string;
}

export interface User extends UserRef {
  readonly email: string;
  readonly role: Role;
}
