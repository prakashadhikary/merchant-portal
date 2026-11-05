import { FormControl, Validators } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { taxId } from '../../validators/validators';
import { FieldError } from './field-error';

function touched(value: string): FormControl<string> {
  const control = new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, taxId],
  });
  control.markAsTouched();
  return control;
}

const meta: Meta<FieldError> = {
  title: 'Shared/FieldError',
  component: FieldError,
  argTypes: { control: { control: false } },
};
export default meta;

type Story = StoryObj<FieldError>;

export const Required: Story = {
  render: () => ({ props: { control: touched('') } }),
};

export const PatternMismatch: Story = {
  render: () => ({ props: { control: touched('12345') } }),
};

export const CustomMessage: Story = {
  render: () => ({
    props: { control: touched(''), messages: { required: 'Enter the 9-digit tax ID' } },
  }),
};

export const Untouched: Story = {
  name: 'Untouched (renders nothing)',
  render: () => ({
    props: { control: new FormControl('', { validators: [Validators.required] }) },
  }),
};
