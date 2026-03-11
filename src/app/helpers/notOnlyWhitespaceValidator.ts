import { AbstractControl, ValidationErrors } from '@angular/forms';

export function notOnlyWhitespaceValidator(
  control: AbstractControl
): ValidationErrors | null {
  const value = control.value;

  if (typeof value === 'string' && value.trim().length === 0) {
    return { onlyWhitespace: true };
  }

  return null;
}
