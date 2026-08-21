import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

type ComparableRangeValue = Date | number | null | undefined;

function normalizeValue(value: ComparableRangeValue): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value.getTime() : Number(value);
}

export function rangeOrderValidator(
  fromControlName: string,
  toControlName: string,
  errorKey: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const from = normalizeValue(control.get(fromControlName)?.value as ComparableRangeValue);
    const to = normalizeValue(control.get(toControlName)?.value as ComparableRangeValue);

    if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
      return null;
    }

    return from <= to ? null : { [errorKey]: true };
  };
}
