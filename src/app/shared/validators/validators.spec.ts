import { FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import {
  accountNumber,
  e164Phone,
  httpsUrl,
  maxWithinMonthlyVolume,
  noteRequiredWhenRejecting,
  registrationNumber,
  taxId,
} from './validators';

function validate(validator: ValidatorFn, value: unknown) {
  return validator(new FormControl(value));
}

describe('pattern validators', () => {
  it('accept empty values so that "required" stays the only missing-value error', () => {
    expect(validate(registrationNumber, '')).toBeNull();
    expect(validate(taxId, null)).toBeNull();
    expect(validate(e164Phone, '')).toBeNull();
  });

  it('registrationNumber requires REG-YYYY-NNNNN', () => {
    expect(validate(registrationNumber, 'REG-2041-77812')).toBeNull();
    expect(validate(registrationNumber, 'REG-20411-7781')).toEqual({ registrationNumber: true });
    expect(validate(registrationNumber, 'reg-2041-77812')).toEqual({ registrationNumber: true });
  });

  it('taxId requires exactly 9 digits', () => {
    expect(validate(taxId, '123456789')).toBeNull();
    expect(validate(taxId, '12345678')).toEqual({ taxId: true });
    expect(validate(taxId, '12345678a')).toEqual({ taxId: true });
  });

  it('accountNumber requires 10 to 16 digits', () => {
    expect(validate(accountNumber, '1234567890')).toBeNull();
    expect(validate(accountNumber, '1234567890123456')).toBeNull();
    expect(validate(accountNumber, '123456789')).toEqual({ accountNumber: true });
    expect(validate(accountNumber, '12345678901234567')).toEqual({ accountNumber: true });
  });

  it('e164Phone requires a + followed by 7 to 15 digits', () => {
    expect(validate(e164Phone, '+9779812345678')).toBeNull();
    expect(validate(e164Phone, '9812345678')).toEqual({ e164: true });
    expect(validate(e164Phone, '+0123456')).toEqual({ e164: true });
  });
});

describe('httpsUrl', () => {
  it('accepts empty and https URLs only', () => {
    expect(validate(httpsUrl, '')).toBeNull();
    expect(validate(httpsUrl, 'https://example.com.np')).toBeNull();
    expect(validate(httpsUrl, 'http://example.com')).toEqual({ httpsUrl: true });
    expect(validate(httpsUrl, 'example.com')).toEqual({ httpsUrl: true });
  });
});

describe('maxWithinMonthlyVolume', () => {
  function group(expectedMonthlyVolume: number | null, maxTransactionAmount: number | null) {
    return new FormGroup(
      {
        expectedMonthlyVolume: new FormControl(expectedMonthlyVolume),
        maxTransactionAmount: new FormControl(maxTransactionAmount),
      },
      { validators: [maxWithinMonthlyVolume] },
    );
  }

  it('fails only when the max transaction exceeds the monthly volume', () => {
    expect(group(1000, 500).errors).toBeNull();
    expect(group(1000, 1000).errors).toBeNull();
    expect(group(1000, 1001).errors).toEqual({ maxWithinMonthlyVolume: true });
  });

  it('stays quiet while either value is missing', () => {
    expect(group(null, 1001).errors).toBeNull();
    expect(group(1000, null).errors).toBeNull();
  });
});

describe('noteRequiredWhenRejecting', () => {
  function group(decision: string | null, note: string) {
    return new FormGroup(
      { decision: new FormControl(decision), note: new FormControl(note) },
      { validators: [noteRequiredWhenRejecting] },
    );
  }

  it('does not require a note when approving', () => {
    expect(group('APPROVE', '').errors).toBeNull();
    expect(group(null, '').errors).toBeNull();
  });

  it('requires at least 10 non-blank characters when rejecting', () => {
    expect(group('REJECT', '').errors).toEqual({ noteRequired: true });
    expect(group('REJECT', 'too short').errors).toEqual({ noteRequired: true });
    expect(group('REJECT', '          ').errors).toEqual({ noteRequired: true });
    expect(group('REJECT', 'Registration not found').errors).toBeNull();
  });
});
