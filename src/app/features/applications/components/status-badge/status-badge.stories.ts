import type { Meta, StoryObj } from '@storybook/angular-vite';
import { APPLICATION_STATUSES } from '../../models/application.models';
import { StatusBadge } from './status-badge';

const meta: Meta<StatusBadge> = {
  title: 'Applications/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: { control: 'select', options: APPLICATION_STATUSES },
  },
  args: { status: 'UNDER_REVIEW' },
};
export default meta;

type Story = StoryObj<StatusBadge>;

export const Default: Story = {};

export const AllStatuses: Story = {
  render: () => ({
    props: { statuses: APPLICATION_STATUSES },
    moduleMetadata: { imports: [StatusBadge] },
    template: `
      <div class="d-flex flex-wrap gap-2">
        @for (status of statuses; track status) {
          <mp-status-badge [status]="status" />
        }
      </div>
    `,
  }),
};
