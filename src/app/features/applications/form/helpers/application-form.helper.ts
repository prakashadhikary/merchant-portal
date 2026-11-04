import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ApplicationData } from '../../../../shared/models/application.models';
import {
  accountNumber,
  e164Phone,
  httpsUrl,
  maxWithinMonthlyVolume,
  registrationNumber,
  taxId,
} from '../../../../shared/validators/validators';

export const APPLICATION_FORM_STEPS = ['business', 'contacts', 'review'] as const;
export type ApplicationFormStep = (typeof APPLICATION_FORM_STEPS)[number];

export const STEP_LABELS: Record<ApplicationFormStep, string> = {
  business: 'Business details',
  contacts: 'Contacts & bank',
  review: 'Review & submit',
};

export type BusinessForm = FormGroup<{
  legalName: FormControl<string>;
  registrationNumber: FormControl<string>;
  taxId: FormControl<string>;
  website: FormControl<string>;
}>;

export type ContactsForm = FormGroup<{
  contactEmail: FormControl<string>;
  contactPhone: FormControl<string>;
  bankName: FormControl<string>;
  accountNumber: FormControl<string>;
  expectedMonthlyVolume: FormControl<number | null>;
  maxTransactionAmount: FormControl<number | null>;
}>;

export type ApplicationForm = FormGroup<{
  business: BusinessForm;
  contacts: ContactsForm;
  declaration: FormControl<boolean>;
}>;

function text(validators: ValidatorFn[] = []): FormControl<string> {
  return new FormControl('', { nonNullable: true, validators });
}

function amount(): FormControl<number | null> {
  return new FormControl<number | null>(null, [Validators.required, Validators.min(1)]);
}

export function buildApplicationForm(): ApplicationForm {
  return new FormGroup({
    business: new FormGroup({
      legalName: text([Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
      registrationNumber: text([Validators.required, registrationNumber]),
      taxId: text([Validators.required, taxId]),
      website: text([httpsUrl]),
    }),
    contacts: new FormGroup(
      {
        contactEmail: text([Validators.required, Validators.email]),
        contactPhone: text([Validators.required, e164Phone]),
        bankName: text([Validators.required]),
        accountNumber: text([Validators.required, accountNumber]),
        expectedMonthlyVolume: amount(),
        maxTransactionAmount: amount(),
      },
      { validators: [maxWithinMonthlyVolume] },
    ),
    declaration: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });
}

export function toApplicationData(form: ApplicationForm): ApplicationData {
  const { business, contacts } = form.getRawValue();
  return { business, contacts };
}

export function stepGroup(form: ApplicationForm, step: ApplicationFormStep): FormGroup {
  switch (step) {
    case 'business':
      return form.controls.business;
    case 'contacts':
      return form.controls.contacts;
    case 'review':
      return form;
  }
}

export function canEnterStep(form: ApplicationForm, step: ApplicationFormStep): boolean {
  const index = APPLICATION_FORM_STEPS.indexOf(step);
  return APPLICATION_FORM_STEPS.slice(0, index).every(
    (previous) => stepGroup(form, previous).valid,
  );
}
