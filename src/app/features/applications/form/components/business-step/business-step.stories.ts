import type { Meta, StoryObj } from '@storybook/angular-vite';
import { BusinessForm, buildApplicationForm } from '../../helpers/application-form.helper';
import { BusinessStep } from './business-step';

function businessForm(value?: Parameters<BusinessForm['patchValue']>[0]): BusinessForm {
  const form = buildApplicationForm().controls.business;
  if (value) {
    form.patchValue(value);
    form.markAllAsTouched();
  }
  return form;
}

const meta: Meta<BusinessStep> = {
  title: 'Applications/Form/BusinessStep',
  component: BusinessStep,
  argTypes: { form: { control: false } },
};
export default meta;

type Story = StoryObj<BusinessStep>;

export const Empty: Story = {
  render: () => ({ props: { form: businessForm() } }),
};

export const Filled: Story = {
  render: () => ({
    props: {
      form: businessForm({
        legalName: 'Himalayan Trekking Supplies Pvt. Ltd.',
        registrationNumber: 'REG-2024-12345',
        taxId: '123456789',
        website: 'https://example.com',
      }),
    },
  }),
};

export const WithErrors: Story = {
  render: () => ({
    props: {
      form: businessForm({
        legalName: '',
        registrationNumber: '2024-12345',
        taxId: '1234',
        website: 'http://example.com',
      }),
    },
  }),
};
