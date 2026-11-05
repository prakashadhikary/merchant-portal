import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { APPLICATION_STATUSES, type MerchantApplication } from '../../../models/application.models';
import { ApplicationsTable } from './applications-table';

const names = [
  'Everest Coffee House',
  'Himalayan Handicrafts',
  'Kathmandu Kitchen',
  'Pokhara Paragliding',
  'Lumbini Books',
  '',
  'Annapurna Outfitters',
  'Bhaktapur Pottery',
];
const sita = { id: 'u-sita', name: 'Sita Gurung' };
const rita = { id: 'u-rita', name: 'Rita Shrestha' };

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function application(i: number): MerchantApplication {
  const status = APPLICATION_STATUSES[i % APPLICATION_STATUSES.length];
  return {
    id: `APP-${String(i + 1).padStart(4, '0')}`,
    status,
    createdBy: sita,
    assignedReviewer: status === 'DRAFT' || status === 'SUBMITTED' ? null : rita,
    createdAt: minutesAgo(60 * 24 * (i + 2)),
    updatedAt: minutesAgo(37 * (i + 1)),
    business: {
      legalName: status === 'DRAFT' ? '' : names[i % names.length],
      registrationNumber: 'REG-2024-12345',
      taxId: '•••••••89',
      website: 'https://example.com',
    },
    contacts: {
      contactEmail: 'owner@example.com',
      contactPhone: '+9779812345678',
      bankName: 'Nabil Bank',
      accountNumber: '••••••••3456',
      expectedMonthlyVolume: status === 'DRAFT' ? null : 150_000 + i * 25_000,
      maxTransactionAmount: 20_000,
    },
  };
}

const items = Array.from({ length: 12 }, (_, i) => application(i));

const meta: Meta<ApplicationsTable> = {
  title: 'Applications/List/ApplicationsTable',
  component: ApplicationsTable,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  argTypes: {
    role: { control: 'select', options: ['SALES', 'REVIEWER', 'ADMIN'] },
  },
  args: { items, total: items.length, role: 'ADMIN', nearEnd: fn() },
};
export default meta;

type Story = StoryObj<ApplicationsTable>;

export const Admin: Story = {};

export const Sales: Story = {
  args: { role: 'SALES' },
};

export const Reviewer: Story = {
  args: { role: 'REVIEWER' },
};

export const MoreOnServer: Story = {
  args: { items: items.slice(0, 3), total: 240 },
};
