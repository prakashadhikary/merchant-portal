import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { HistoryEntry } from '../../../models/application.models';
import { HistoryList } from './history-list';

const sita = { id: 'u-sita', name: 'Sita Gurung' };
const rita = { id: 'u-rita', name: 'Rita Shrestha' };
const anita = { id: 'u-anita', name: 'Anita Karki' };

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const entries: HistoryEntry[] = [
  {
    id: 'h5',
    applicationId: 'a1',
    type: 'REJECTED',
    actor: rita,
    at: minutesAgo(2),
    detail: 'Registration number does not match the company register.',
  },
  {
    id: 'h4',
    applicationId: 'a1',
    type: 'REVEALED',
    actor: rita,
    at: minutesAgo(15),
    detail: 'Account number',
  },
  {
    id: 'h3',
    applicationId: 'a1',
    type: 'ASSIGNED',
    actor: anita,
    at: minutesAgo(90),
    detail: 'Rita Shrestha',
  },
  { id: 'h2', applicationId: 'a1', type: 'SUBMITTED', actor: sita, at: minutesAgo(60 * 26) },
  { id: 'h1', applicationId: 'a1', type: 'CREATED', actor: sita, at: minutesAgo(60 * 27) },
];

const meta: Meta<HistoryList> = {
  title: 'Applications/Detail/HistoryList',
  component: HistoryList,
  decorators: [
    componentWrapperDecorator((story) => `<div style="max-width: 28rem">${story}</div>`),
  ],
  args: { state: { status: 'loaded', data: entries }, retry: fn() },
};
export default meta;

type Story = StoryObj<HistoryList>;

export const Loaded: Story = {};

export const Loading: Story = {
  args: { state: { status: 'loading' } },
};

export const Empty: Story = {
  args: { state: { status: 'loaded', data: [] } },
};

export const Failed: Story = {
  args: { state: { status: 'error', message: 'The server did not respond.' } },
};
