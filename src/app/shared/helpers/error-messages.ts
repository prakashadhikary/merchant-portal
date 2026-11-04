import { ValidationErrors } from '@angular/forms';

interface LengthError {
  readonly requiredLength: number;
}

interface BoundError {
  readonly min?: number;
  readonly max?: number;
}

const MESSAGES: Record<string, (error: unknown) => string> = {
  required: () => 'This field is required',
  email: () => 'Enter a valid email address',
  minlength: (e) => `Must be at least ${(e as LengthError).requiredLength} characters`,
  maxlength: (e) => `Must be at most ${(e as LengthError).requiredLength} characters`,
  min: (e) => `Must be at least ${(e as BoundError).min}`,
  max: (e) => `Must be at most ${(e as BoundError).max}`,
  registrationNumber: () => 'Use the format REG-YYYY-NNNNN, e.g. REG-2024-12345',
  taxId: () => 'Tax ID must be exactly 9 digits',
  accountNumber: () => 'Account number must be 10 to 16 digits',
  e164: () => 'Use the international format, e.g. +97798XXXXXXXX',
  httpsUrl: () => 'Must be a full https:// address',
  maxWithinMonthlyVolume: () => 'Max transaction amount cannot exceed the expected monthly volume',
  noteRequired: () => 'A note of at least 10 characters is required when rejecting',
};

export function firstErrorMessage(
  errors: ValidationErrors | null,
  overrides: Partial<Record<string, string>> = {},
): string | null {
  const entry = errors ? Object.entries(errors)[0] : undefined;
  if (!entry) return null;
  const [key, value] = entry;
  return overrides[key] ?? MESSAGES[key]?.(value) ?? 'Invalid value';
}
