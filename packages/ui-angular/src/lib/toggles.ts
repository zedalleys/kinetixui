import { ChangeDetectionStrategy, Component, Directive, forwardRef, input, model, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/**
 * Checkbox and Switch — the two binary controls, and the package's forms architecture in miniature.
 *
 * Both implement `ControlValueAccessor`, so they work with `[(ngModel)]`, `formControlName` and
 * `formControl` exactly like a native input, including `disabled` driven by the form model
 * (`setDisabledState`) rather than only by an attribute. Both also expose a plain `[(checked)]` model for
 * applications that are not using Angular forms; the two paths write through the same setter so they cannot
 * disagree.
 *
 * Both render a real `<button>` carrying the ARIA role rather than a visually-hidden `<input>`. A button is
 * already focusable, already activates on Space and Enter, and already reports `disabled` to assistive
 * technology — so the role is the only thing ARIA has to add. The trade-off is deliberate and worth stating:
 * a `<button role="checkbox">` submits no value in a native (non-Angular) form post. Angular forms carry the
 * value in the form model, which is how these are meant to be used.
 */

/**
 * Shared CVA plumbing: the parts that would otherwise be copied verbatim into both controls.
 *
 * `@Directive()` with no selector, not a plain class — `input()`, `model()` and `output()` are only legal on a
 * class Angular's compiler knows about, so an undecorated base would fail the build with NG8110.
 */
@Directive()
abstract class KxToggleBase implements ControlValueAccessor {
  readonly checked = model(false);
  readonly disabled = input(false);
  /**
   * Emits only on real user interaction. `checkedChange` (from the model) also fires when a form or a parent
   * writes the value in, which is usually not what a caller reacting to "the user flipped this" wants.
   */
  readonly toggled = output<boolean>();

  /** `disabled` can come from the input OR from the form model — either one disables the control. */
  protected readonly formDisabled = signal(false);
  protected isDisabled(): boolean {
    return this.disabled() || this.formDisabled();
  }

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  protected toggle(): void {
    if (this.isDisabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.onTouched();
    this.toggled.emit(next);
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

/**
 *   <kx-checkbox [(ngModel)]="remember" />
 *   <kx-checkbox [(checked)]="remember" (toggled)="save($event)" />
 *
 * `indeterminate` renders `aria-checked="mixed"` — the tri-state a "select all" header needs. It is display
 * only: activating an indeterminate checkbox resolves it to checked, as it does everywhere else.
 */
@Component({
  selector: 'kx-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxCheckbox), multi: true }],
  template: `
    <button
      type="button"
      role="checkbox"
      class="kx-checkbox"
      [attr.aria-checked]="indeterminate() ? 'mixed' : checked()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [disabled]="isDisabled()"
      (click)="toggle()"
    >
      @if (checked() || indeterminate()) {
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          @if (indeterminate()) {
            <path d="M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          } @else {
            <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          }
        </svg>
      }
    </button>
  `,
})
export class KxCheckbox extends KxToggleBase {
  readonly indeterminate = input(false);
  /** One of these is required when no visible `<label for>` points at the control. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
}

/**
 *   <kx-switch [(ngModel)]="notifications" aria-label="Notifications" />
 *
 * `role="switch"` rather than a checkbox: it reports "on/off" instead of "checked", which is what an
 * immediately-applied setting is.
 */
@Component({
  selector: 'kx-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxSwitch), multi: true }],
  template: `
    <button
      type="button"
      role="switch"
      class="kx-switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [disabled]="isDisabled()"
      (click)="toggle()"
    >
      <span class="kx-switch__thumb"></span>
    </button>
  `,
})
export class KxSwitch extends KxToggleBase {
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
}
