import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { MaskedField } from './masked-field';

const meta: Meta<MaskedField> = {
  title: 'Shared/MaskedField',
  component: MaskedField,
  args: {
    label: 'Account number',
    masked: '**********4821',
    canReveal: true,
    value: null,
    busy: false,
    revealSeconds: 30,
    reveal: fn(),
    hide: fn(),
  },
};
export default meta;

type Story = StoryObj<MaskedField>;

export const Masked: Story = {};

export const Revealed: Story = {
  args: { value: '0123456789014821' },
};

export const Revealing: Story = {
  args: { busy: true },
};

export const NotPermitted: Story = {
  name: 'Not permitted (Sales)',
  args: { canReveal: false },
};
