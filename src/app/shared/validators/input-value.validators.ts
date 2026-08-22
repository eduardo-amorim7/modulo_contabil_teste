import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MAX_SAFE_CURRENCY_VALUE = Number.MAX_SAFE_INTEGER / 100;

export const nonBlankValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
};

export const nonNegativeSafeIntegerValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value: unknown = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? null
    : { nonNegativeSafeInteger: true };
};
