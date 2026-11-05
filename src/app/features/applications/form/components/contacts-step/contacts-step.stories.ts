import type { Meta, StoryObj } from '@storybook/angular-vite';
import { buildApplicationForm, ContactsForm } from '../../helpers/application-form.helper';
import { ContactsStep } from './contacts-step';

function contactsForm(value?: Parameters<ContactsForm['patchValue']>[0]): ContactsForm {
  const form = buildApplicationForm().controls.contacts;
  if (value) {
    form.patchValue(value);
    form.markAllAsTouched();
  }
  return form;
}

const meta: Meta<ContactsStep> = {
  title: 'Applications/Form/ContactsStep',
  component: ContactsStep,
  argTypes: { form: { control: false } },
};
export default meta;

type Story = StoryObj<ContactsStep>;

export const Empty: Story = {
  render: () => ({ props: { form: contactsForm() } }),
};

export const Filled: Story = {
  render: () => ({
    props: {
      form: contactsForm({
        contactEmail: 'finance@example.com',
        contactPhone: '+9779812345678',
        bankName: 'Nabil Bank',
        accountNumber: '0123456789014821',
        expectedMonthlyVolume: 2_500_000,
        maxTransactionAmount: 150_000,
      }),
    },
  }),
};

export const WithErrors: Story = {
  render: () => ({
    props: {
      form: contactsForm({
        contactEmail: 'finance@',
        contactPhone: '9812345678',
        bankName: '',
        accountNumber: '12345',
        expectedMonthlyVolume: 100_000,
        maxTransactionAmount: 250_000,
      }),
    },
  }),
};
