import { Directive, ElementRef, HostListener, Renderer2, forwardRef, inject } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Directive({
  host: { autocomplete: 'off', inputmode: 'decimal' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PtBrCurrencyDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PtBrCurrencyDirective),
      multi: true,
    },
  ],
  selector: 'input[appPtBrCurrency]',
})
export class PtBrCurrencyDirective implements ControlValueAccessor, Validator {
  private readonly elementRef = inject(ElementRef<HTMLInputElement>);
  private readonly renderer = inject(Renderer2);
  private readonly formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private value: number | null = null;
  private hasInvalidInput = false;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.hasInvalidInput = false;
    this.value = this.normalizeModelValue(value);
    this.renderFormattedValue();
    this.onValidatorChange();
  }

  registerOnChange(callback: (value: number | null) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  validate(_control: AbstractControl): ValidationErrors | null {
    return this.hasInvalidInput ? { invalidCurrencyFormat: true } : null;
  }

  registerOnValidatorChange(callback: () => void): void {
    this.onValidatorChange = callback;
  }

  setDisabledState(disabled: boolean): void {
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', disabled);
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;

    this.value = this.parseCurrency(rawValue);
    this.hasInvalidInput = rawValue.trim().length > 0 && this.value === null;
    this.onChange(this.value);
    this.onValidatorChange();
  }

  @HostListener('focus')
  handleFocus(): void {
    if (!this.hasInvalidInput && this.value !== null) {
      this.renderer.setProperty(
        this.elementRef.nativeElement,
        'value',
        this.value.toFixed(2).replace('.', ','),
      );
    }
  }

  @HostListener('blur')
  handleBlur(): void {
    if (!this.hasInvalidInput) {
      this.renderFormattedValue();
    }

    this.onTouched();
  }

  private normalizeModelValue(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? value : null;
    }

    return typeof value === 'string' ? this.parseCurrency(value) : null;
  }

  private parseCurrency(rawValue: string): number | null {
    const sanitized = rawValue
      .trim()
      .replace(/^R\$\s*/i, '')
      .replace(/\s/g, '');

    if (!sanitized) {
      return null;
    }

    const brazilianFormat = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{0,2})?$/;
    const decimalWithDot = /^\d+(?:\.\d{1,2})?$/;
    let normalizedValue: string;

    if (brazilianFormat.test(sanitized)) {
      normalizedValue = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (decimalWithDot.test(sanitized)) {
      normalizedValue = sanitized;
    } else {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
  }

  private renderFormattedValue(): void {
    this.renderer.setProperty(
      this.elementRef.nativeElement,
      'value',
      this.value === null ? '' : this.formatter.format(this.value),
    );
  }
}
