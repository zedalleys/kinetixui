import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { KxCorners, KxFieldMessageVariant } from './types';

/**
 * Per-element ids for the `<input>`/`<label>` pairs below. A module counter rather than a static on each
 * class: a static field cannot be read by an instance initialiser declared above it, and the id only has to
 * be unique within the document.
 */
let seq = 0;
const uid = () => ++seq;

/**
 * The form controls beyond checkbox and switch: textarea, native select, radio group, slider, number input,
 * password input, and the field wrapper that labels and describes any of them.
 *
 * The rule this file follows, and the reason it is short: where HTML already has the control, KinetixUI is a
 * directive on it. A `<input type="range">` already has arrow-key stepping, Home/End, `aria-valuenow`, RTL
 * awareness and a form value. A `role="slider"` div has none of that, and every re-implementation of it in
 * this industry has shipped with at least one of those missing. The same argument decides radio (a real
 * `<input type="radio">` group gives roving focus and arrow-key selection for free) and number input.
 *
 * Every control that carries a value implements `ControlValueAccessor`, so `[(ngModel)]`, `formControl` and
 * `formControlName` all work, including `setDisabledState` from the form model.
 */

/* ── shared CVA plumbing ────────────────────────────────────────────────── */

/**
 * `@Directive()` with no selector rather than a plain class: `input()`, `model()` and `output()` are only
 * legal on a class the Angular compiler knows about, and an undecorated base fails the build with NG8110.
 */
@Directive()
abstract class KxValueBase<T> implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly formDisabled = signal(false);
  protected isDisabled(): boolean {
    return this.disabled() || this.formDisabled();
  }

  protected onChange: (value: T) => void = () => {};
  protected onTouched: () => void = () => {};

  abstract writeValue(value: T): void;
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

/* ── textarea ───────────────────────────────────────────────────────────── */

/**
 *   <textarea kxTextarea rows="4" [(ngModel)]="notes"></textarea>
 *
 * A directive on a real `<textarea>`: `rows`, `maxlength`, `required`, the browser's own validation and every
 * Angular forms directive keep working untouched. Separate from `kxInput` because the two have different
 * metrics (a minimum height and a resize affordance), matching the React package's Input/Textarea split.
 *
 * The error state is read from `aria-invalid`, so the semantics drive the styling instead of a parallel
 * `invalid` input that could disagree with them.
 */
@Directive({
  selector: 'textarea[kxTextarea]',
  host: {
    class: 'kx-textarea',
    '[style.resize]': "resize() === 'none' ? 'none' : null",
  },
})
export class KxTextarea {
  /** `vertical` (the default) or `none`. Horizontal resize breaks the column it sits in, so it is not offered. */
  readonly resize = input<'vertical' | 'none'>('vertical');
}

/* ── native select ──────────────────────────────────────────────────────── */

/**
 *   <select kxNativeSelect [(ngModel)]="country">
 *     <option value="pt">Portugal</option>
 *   </select>
 *
 * A directive on the browser's own `<select>`, which on a phone opens the platform picker and on a desktop
 * opens the OS listbox. That is the whole point of it — where a designed listbox is wanted, that is a
 * different component. Nothing here re-implements the popup, so nothing here can get it wrong.
 */
@Directive({
  selector: 'select[kxNativeSelect]',
  host: {
    '[class]': '"kx-native-select kx-native-select--" + corners()',
  },
})
export class KxNativeSelect {
  readonly corners = input<KxCorners | 'rounded'>('default');
}

/* ── radio group ────────────────────────────────────────────────────────── */

/**
 *   <kx-radio-group name="plan" [(ngModel)]="plan" aria-label="Plan">
 *     <kx-radio value="free">Free</kx-radio>
 *     <kx-radio value="pro">Pro</kx-radio>
 *   </kx-radio-group>
 *
 * The radios are real `<input type="radio">` elements sharing a `name`, so arrow-key selection, roving focus,
 * the "one tab stop per group" behaviour and the group's own form semantics are the browser's. An ARIA
 * re-implementation of a radio group has to rebuild all four, and usually rebuilds three.
 *
 * The group is the `ControlValueAccessor`; the radios read and write through it.
 */
@Component({
  selector: 'kx-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxRadioGroup), multi: true }],
  template: '<ng-content />',
  host: {
    class: 'kx-radio-group',
    role: 'radiogroup',
    '[attr.aria-orientation]': "orientation() === 'horizontal' ? 'horizontal' : null",
  },
})
export class KxRadioGroup extends KxValueBase<string | null> {
  /** Shared `name` for the underlying inputs. Defaults to a per-instance name so two groups never merge. */
  readonly name = input(`kx-radio-${uid()}`);
  readonly value = model<string | null>(null);
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  /** Emits only on user selection — `valueChange` also fires when a form writes the value in. */
  readonly selected = output<string>();

  /** Called by a child radio. Public because the radio is a separate component, not because callers should. */
  select(next: string): void {
    if (this.isDisabled()) return;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
    this.selected.emit(next);
  }

  groupDisabled(): boolean {
    return this.isDisabled();
  }

  /** A radio lost focus — mark the group touched so `ng-touched` and validation messages behave. */
  touch(): void {
    this.onTouched();
  }

  override writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }
}

/**
 *   <kx-radio value="pro">Pro</kx-radio>
 *
 * Renders `<input type="radio">` + `<label>`, associated by id, so the whole row is a click target and the
 * label is the accessible name without any `aria-label` guessing.
 */
@Component({
  selector: 'kx-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="radio"
      class="kx-radio__input"
      [id]="id()"
      [name]="group.name()"
      [value]="value()"
      [checked]="group.value() === value()"
      [disabled]="disabled() || group.groupDisabled()"
      (change)="group.select(value())"
      (blur)="group.touch()"
    />
    <label class="kx-radio__label" [for]="id()"><ng-content /></label>
  `,
  host: { class: 'kx-radio' },
})
export class KxRadio {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input(`kx-radio-item-${uid()}`);

  constructor(protected readonly group: KxRadioGroup) {}
}

/* ── slider ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-slider [(ngModel)]="volume" [min]="0" [max]="100" [step]="5" aria-label="Volume" />
 *
 * A real `<input type="range">`. Arrow keys, Page Up/Down, Home/End, `aria-valuenow`/`valuemin`/`valuemax`,
 * the RTL direction flip and touch dragging are all the browser's, and all of them are things hand-rolled
 * sliders routinely lose. The filled track is drawn with a CSS custom property set from the value, so the
 * visual follows the real control rather than the other way round.
 */
@Component({
  selector: 'kx-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxSlider), multi: true }],
  template: `
    <input
      type="range"
      class="kx-slider__input"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [disabled]="isDisabled()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [attr.aria-valuetext]="valueText()"
      (input)="commit($any($event.target).valueAsNumber)"
      (blur)="onTouched()"
    />
  `,
  host: {
    class: 'kx-slider',
    '[style.--kx-slider-fill.%]': 'fill()',
  },
})
export class KxSlider extends KxValueBase<number> {
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  /** Announced instead of the raw number where the number alone means nothing ("Medium", "3 of 7"). */
  readonly valueText = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  readonly changed = output<number>();

  protected readonly fill = computed(() => {
    const span = this.max() - this.min();
    return span <= 0 ? 0 : ((this.value() - this.min()) / span) * 100;
  });

  protected commit(next: number): void {
    this.value.set(next);
    this.onChange(next);
    this.changed.emit(next);
  }

  override writeValue(value: number): void {
    this.value.set(Number.isFinite(value) ? value : this.min());
  }
}

/* ── number input ───────────────────────────────────────────────────────── */

/**
 *   <kx-number-input [(ngModel)]="quantity" [min]="1" [max]="99" aria-label="Quantity" />
 *
 * A real `<input type="number">` with explicit step buttons beside it. The input keeps the numeric keypad on
 * touch, the browser's own arrow-key stepping and `valueAsNumber`; the buttons exist because the native
 * spinners are tiny, inconsistent between browsers, and in several of them not reachable by keyboard at all.
 *
 * The buttons are `aria-hidden` and `tabindex="-1"`: they duplicate keyboard behaviour the input already has,
 * so exposing them adds two stops to the tab order that do nothing new.
 */
@Component({
  selector: 'kx-number-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxNumberInput), multi: true }],
  template: `
    <button type="button" class="kx-number-input__step" tabindex="-1" aria-hidden="true" [disabled]="isDisabled()" (click)="nudge(-1)">−</button>
    <input
      type="number"
      class="kx-number-input__input"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [disabled]="isDisabled()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      (input)="commit($any($event.target).valueAsNumber)"
      (blur)="onTouched()"
    />
    <button type="button" class="kx-number-input__step" tabindex="-1" aria-hidden="true" [disabled]="isDisabled()" (click)="nudge(1)">+</button>
  `,
  host: { class: 'kx-number-input' },
})
export class KxNumberInput extends KxValueBase<number | null> {
  readonly value = model<number | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input(1);
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  readonly changed = output<number | null>();

  protected nudge(direction: 1 | -1): void {
    this.commit((this.value() ?? 0) + direction * this.step());
  }

  protected commit(next: number): void {
    // an emptied field is null, not 0 — "no answer" and "zero" are different answers
    const value = Number.isFinite(next) ? this.clamp(next) : null;
    this.value.set(value);
    this.onChange(value);
    this.changed.emit(value);
  }

  private clamp(n: number): number {
    const min = this.min();
    const max = this.max();
    if (min !== null && n < min) return min;
    if (max !== null && n > max) return max;
    return n;
  }

  override writeValue(value: number | null): void {
    this.value.set(value ?? null);
  }
}

/* ── password input ─────────────────────────────────────────────────────── */

/**
 *   <kx-password-input [(ngModel)]="password" aria-label="Password" />
 *
 * A real password field with a reveal toggle. The toggle is a real `<button>` carrying `aria-pressed`, so its
 * state is announced; the field keeps `autocomplete="current-password"` by default so password managers still
 * recognise it, and `[autocomplete]` switches it to `new-password` on a sign-up form.
 */
@Component({
  selector: 'kx-password-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxPasswordInput), multi: true }],
  template: `
    <input
      class="kx-password-input__input"
      [type]="revealed() ? 'text' : 'password'"
      [value]="value()"
      [disabled]="isDisabled()"
      [attr.autocomplete]="autocomplete()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      (input)="commit($any($event.target).value)"
      (blur)="onTouched()"
    />
    <button
      type="button"
      class="kx-password-input__reveal"
      [attr.aria-pressed]="revealed()"
      [attr.aria-label]="revealed() ? 'Hide password' : 'Show password'"
      [disabled]="isDisabled()"
      (click)="revealed.set(!revealed())"
    >
      {{ revealed() ? 'Hide' : 'Show' }}
    </button>
  `,
  host: { class: 'kx-password-input' },
})
export class KxPasswordInput extends KxValueBase<string> {
  readonly value = model('');
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });

  protected readonly revealed = signal(false);

  protected commit(next: string): void {
    this.value.set(next);
    this.onChange(next);
  }

  override writeValue(value: string): void {
    this.value.set(value ?? '');
  }
}

/* ── field ──────────────────────────────────────────────────────────────── */

/**
 *   <kx-field>
 *     <label kxFieldLabel for="email">Email</label>
 *     <input kxInput id="email" aria-describedby="email-hint" />
 *     <p kxFieldDescription id="email-hint">We only use this to sign you in.</p>
 *     <kx-field-message variant="error">Enter a valid address.</kx-field-message>
 *   </kx-field>
 *
 * Layout and type for a labelled control, and nothing else. It deliberately does not generate ids or wire
 * `aria-describedby` for you: a wrapper that guesses those has to guess which of several descriptions is the
 * error, and gets it wrong on the form where it matters. The ids are the caller's, and they are three
 * characters each.
 *
 * An error message is a live region, so a validation message that appears after submit is announced rather
 * than silently rendered below the field.
 */
@Component({
  selector: 'kx-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-field' },
})
export class KxField {}

@Directive({ selector: 'label[kxFieldLabel]', host: { class: 'kx-field__label kx-label' } })
export class KxFieldLabel {}

@Directive({ selector: '[kxFieldDescription]', host: { class: 'kx-field__description' } })
export class KxFieldDescription {}

@Component({
  selector: 'kx-field-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    '[class]': '"kx-field__message kx-field__message--" + variant()',
    '[attr.role]': "variant() === 'error' ? 'alert' : null",
  },
})
export class KxFieldMessage {
  readonly variant = input<KxFieldMessageVariant>('error');
}
