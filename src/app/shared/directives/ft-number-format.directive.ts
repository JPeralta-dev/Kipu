import { Directive, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Formats numeric input with thousands separators on blur.
 * - While typing: raw number entry (digits, dot, comma allowed)
 * - On blur: formats with thousands separators and 2 decimals (e.g. 1,234,567.89)
 * - On focus: reverts to raw number for easy editing
 * - Currency-agnostic: always uses comma for thousands, dot for decimals
 *
 * Usage: <input ftNumberFormat formControlName="amount" />
 */
@Directive({
  selector: '[ftNumberFormat]',
  standalone: true,
})
export class FtNumberFormatDirective implements OnInit {
  private el = inject(ElementRef);
  private ngControl = inject(NgControl);

  ngOnInit(): void {
    // Format initial value if the control already has one
    const raw = this.getRawValue();
    if (raw !== null) {
      this.setDisplayValue(this.formatNumber(raw));
    }
  }

  @HostListener('focus')
  onFocus(): void {
    // Show raw number for easy editing
    const raw = this.getRawValue();
    if (raw !== null) {
      this.setDisplayValue(String(raw));
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.applyFormatting();
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = this.parseInput(input.value);

    this.updateControlValue(raw);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ];
    if (allowed.includes(event.key)) return;

    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Cmd equivalents
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;

    // Block non-numeric characters (except dot and comma)
    if (!/^[0-9.,]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Parse the input string to a raw number.
   * Treats comma as thousands separator, dot as decimal separator.
   */
  private parseInput(value: string): number | null {
    if (!value || !value.trim()) return null;

    let cleaned = value.trim();

    // Remove all commas (thousands separators)
    cleaned = cleaned.replace(/,/g, '');

    // Handle multiple dots - keep only the last one as decimal separator
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // Remove all dots except the last one
      cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }

    // Remove any remaining non-numeric chars except decimal point
    cleaned = cleaned.replace(/[^\d.]/g, '');

    if (!cleaned || cleaned === '.') return null;

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Format a number with thousands separators (commas) and 2 decimal places.
   * e.g. 1234567.89 -> "1,234,567.89"
   */
  private formatNumber(value: number): string {
    // Manual formatting to avoid locale dependency
    const parts = value.toFixed(2).split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    // Add thousands separators
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return `${formatted}.${decPart}`;
  }

  /**
   * Apply formatting on blur.
   */
  private applyFormatting(): void {
    const input = this.el.nativeElement as HTMLInputElement;
    const raw = this.parseInput(input.value);

    if (raw !== null && raw > 0) {
      this.setDisplayValue(this.formatNumber(raw));
      this.updateControlValue(raw);
    } else {
      this.setDisplayValue('');
      this.updateControlValue(null);
    }
  }

  private updateControlValue(raw: number | null): void {
    this.ngControl.control?.setValue(raw, { emitModelToViewChange: false });
    if ('viewToModelUpdate' in this.ngControl && typeof (this.ngControl as any).viewToModelUpdate === 'function') {
      (this.ngControl as any).viewToModelUpdate(raw);
    }
  }

  /**
   * Get the raw numeric value from the form control.
   */
  private getRawValue(): number | null {
    const val = this.ngControl.control?.value;
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? null : num;
  }

  private setDisplayValue(value: string): void {
    this.el.nativeElement.value = value;
  }
}
