import { ChangeDetectionStrategy, Component, Directive, booleanAttribute, forwardRef, input, model, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { KxToggleSize, KxToggleVariant } from './types';

/**
 * Per-element ids for the `<input>`/`<label>` pairs below. A module counter rather than a static on each
 * class: a static field cannot be read by an instance initialiser declared above it, and the id only has to
 * be unique within the document.
 */
let seq = 0;
const uid = () => ++seq;

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
  readonly disabled = input(false, { transform: booleanAttribute });
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
  readonly indeterminate = input(false, { transform: booleanAttribute });
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

/* ── toggle ─────────────────────────────────────────────────────────────── */

/**
 *   <button kxToggle [(pressed)]="bold" aria-label="Bold">B</button>
 *
 * A directive on a real `<button>` that carries `aria-pressed` — the ARIA pattern for a two-state button,
 * and the one thing ARIA has to add to a button that already has focus, activation and disabled handling.
 */
@Directive({
  selector: 'button[kxToggle]',
  host: {
    '[class]': '"kx-toggle kx-toggle--" + variant() + " kx-toggle--" + size()',
    '[attr.aria-pressed]': 'pressed()',
    '(click)': 'press()',
  },
})
export class KxToggle {
  readonly pressed = model(false);
  readonly variant = input<KxToggleVariant>('default');
  readonly size = input<KxToggleSize>('md');
  readonly toggled = output<boolean>();

  protected press(): void {
    const next = !this.pressed();
    this.pressed.set(next);
    this.toggled.emit(next);
  }
}

/* ── toggle group ───────────────────────────────────────────────────────── */

/**
 *   <kx-toggle-group [(value)]="marks" aria-label="Text style">
 *     <kx-toggle-group-item value="bold">B</kx-toggle-group-item>
 *   </kx-toggle-group>
 *
 * Multiple-select by default: each item is an independent `aria-pressed` button inside a `role="group"`, so
 * every one is its own tab stop and its own announcement — which is what a formatting toolbar is.
 *
 * `type="single"` is a different control, and is rendered as one: a `radiogroup` of real `<input
 * type="radio">` elements, so arrow-key selection and the single tab stop come from the browser. Sharing a
 * template between the two would mean re-implementing radio behaviour with ARIA, which is exactly the
 * trade this package refuses elsewhere.
 */
@Component({
  selector: 'kx-toggle-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-toggle-group',
    '[attr.role]': "type() === 'single' ? 'radiogroup' : 'group'",
  },
})
export class KxToggleGroup {
  readonly type = input<'single' | 'multiple'>('multiple');
  /** A string for `single`, an array for `multiple`. */
  readonly value = model<string | string[] | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly name = input(`kx-toggle-group-${uid()}`);

  isOn(value: string): boolean {
    const v = this.value();
    return Array.isArray(v) ? v.includes(value) : v === value;
  }

  toggle(value: string): void {
    if (this.disabled()) return;
    if (this.type() === 'single') {
      this.value.set(this.value() === value ? null : value);
      return;
    }
    const current = Array.isArray(this.value()) ? (this.value() as string[]) : [];
    this.value.set(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }
}

@Component({
  selector: 'kx-toggle-group-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (group.type() === 'single') {
      <input
        type="radio"
        class="kx-toggle-group__radio"
        [id]="id()"
        [name]="group.name()"
        [value]="value()"
        [checked]="group.isOn(value())"
        [disabled]="disabled() || group.disabled()"
        (change)="group.toggle(value())"
      />
      <label class="kx-toggle kx-toggle--group" [for]="id()"><ng-content /></label>
    } @else {
      <button
        type="button"
        class="kx-toggle kx-toggle--group"
        [attr.aria-pressed]="group.isOn(value())"
        [disabled]="disabled() || group.disabled()"
        (click)="group.toggle(value())"
      >
        <ng-content />
      </button>
    }
  `,
  host: { class: 'kx-toggle-group__item' },
})
export class KxToggleGroupItem {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input(`kx-toggle-group-item-${uid()}`);

  constructor(protected readonly group: KxToggleGroup) {}
}

/* ── segmented control ──────────────────────────────────────────────────── */

/**
 *   <kx-segmented-control [(value)]="range" aria-label="Range">
 *     <kx-segment value="7d">7 days</kx-segment>
 *     <kx-segment value="30d">30 days</kx-segment>
 *   </kx-segmented-control>
 *
 * A single-choice control shown as one connected track — iOS's segmented control, on the web. It is a real
 * `radiogroup` of real radio inputs for the same reason the radio group is: arrow keys, one tab stop and the
 * "exactly one is chosen" semantics are the browser's.
 *
 * Unlike a toggle group, a segment cannot be turned off by clicking it again: a segmented control with
 * nothing selected has no meaning.
 */
@Component({
  selector: 'kx-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-segmented', role: 'radiogroup' },
})
export class KxSegmentedControl {
  readonly value = model<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly name = input(`kx-segmented-${uid()}`);
  readonly selected = output<string>();

  select(next: string): void {
    if (this.disabled()) return;
    this.value.set(next);
    this.selected.emit(next);
  }
}

@Component({
  selector: 'kx-segment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="radio"
      class="kx-segmented__radio"
      [id]="id()"
      [name]="control.name()"
      [value]="value()"
      [checked]="control.value() === value()"
      [disabled]="disabled() || control.disabled()"
      (change)="control.select(value())"
    />
    <label class="kx-segmented__label" [for]="id()"><ng-content /></label>
  `,
  host: { class: 'kx-segmented__item' },
})
export class KxSegment {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input(`kx-segment-${uid()}`);

  constructor(protected readonly control: KxSegmentedControl) {}
}
