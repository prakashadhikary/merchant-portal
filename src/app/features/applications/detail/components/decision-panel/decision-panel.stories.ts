import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DecisionPanel } from './decision-panel';

const meta: Meta<DecisionPanel> = {
  title: 'Applications/Detail/DecisionPanel',
  component: DecisionPanel,
  args: { busy: false, decide: fn() },
};
export default meta;

type Story = StoryObj<DecisionPanel>;

export const Default: Story = {};

export const Busy: Story = {
  args: { busy: true },
};

export const RejectWithoutNote: Story = {
  name: 'Reject without a note',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reject' }));
    await expect(
      await canvas.findByText('A note of at least 10 characters is required when rejecting', {
        selector: '.invalid-feedback',
      }),
    ).toBeVisible();
    await expect(args.decide).not.toHaveBeenCalled();
  },
};

export const RejectWithNote: Story = {
  name: 'Reject with a note',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Note'), 'Registration number does not match.');
    await userEvent.click(canvas.getByRole('button', { name: 'Reject' }));
    await expect(args.decide).toHaveBeenCalledWith({
      decision: 'REJECT',
      note: 'Registration number does not match.',
    });
  },
};
