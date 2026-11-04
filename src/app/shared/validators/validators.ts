import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Empty values pass so `Validators.required` stays the only "missing" error. */
export function patternValidator(key: string, pattern: RegExp): ValidatorFn {
  return (control) => {
    const value: unknown = control.value;
    if (value === null || value === undefined || value === '') return null;
    return pattern.test(String(value)) ? null : { [key]: true };
  };
}

export const registrationNumber = patternValidator('registrationNumber', /^REG-\d{4}-\d{5}$/);
export const taxId = patternValidator('taxId', /^\d{9}$/);
export const accountNumber = patternValidator('accountNumber', /^\d{10,16}$/);
export const e164Phone = patternValidator('e164', /^\+[1-9]\d{6,14}$/);

export const httpsUrl: ValidatorFn = (control) => {
  const value: unknown = control.value;
  if (!value) return null;
  try {
    return new URL(String(value)).protocol === 'https:' ? null : { httpsUrl: true };
  } catch {
    return { httpsUrl: true };
  }
};

/** Group validator: a single transaction cannot exceed the expected monthly volume. */
export const maxWithinMonthlyVolume: ValidatorFn = (group) => {
  const volume = numberOf(group.get('expectedMonthlyVolume'));
  const max = numberOf(group.get('maxTransactionAmount'));
  return volume !== null && max !== null && max > volume ? { maxWithinMonthlyVolume: true } : null;
};

/** Group validator for the decision form: rejecting needs a note of 10+ characters. */
export const noteRequiredWhenRejecting: ValidatorFn = (group): ValidationErrors | null => {
  const decision: unknown = group.get('decision')?.value;
  const note: unknown = group.get('note')?.value;
  if (decision !== 'REJECT') return null;
  return typeof note === 'string' && note.trim().length >= 10 ? null : { noteRequired: true };
};

function numberOf(control: AbstractControl | null): number | null {
  const value: unknown = control?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
