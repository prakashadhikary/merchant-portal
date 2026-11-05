import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { AssignmentPanel } from './assignment-panel';

const reviewers = [
  { id: 'u-rita', name: 'Rita Shrestha' },
  { id: 'u-bikash', name: 'Bikash Thapa' },
  { id: 'u-maya', name: 'Maya Rai' },
];

const meta: Meta<AssignmentPanel> = {
  title: 'Applications/Detail/AssignmentPanel',
  component: AssignmentPanel,
  decorators: [
    componentWrapperDecorator((story) => `<div style="max-width: 24rem">${story}</div>`),
  ],
  args: { reviewers, current: null, busy: false, assign: fn() },
};
export default meta;

type Story = StoryObj<AssignmentPanel>;

export const Unassigned: Story = {};

export const Assigned: Story = {
  args: { current: reviewers[0] },
};

export const Assigning: Story = {
  args: { current: reviewers[0], busy: true },
};

export const NoReviewers: Story = {
  args: { reviewers: [] },
};
