import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { KxValueBase } from './forms';

/* ── one-time code ──────────────────────────────────────────────────────── */

/**
 *   <kx-input-otp [(ngModel)]="code" [length]="6" [groups]="[3, 3]" aria-label="Verification code" />
 *
 * A one-time code field drawn as a row of cells — React's InputOTP. Underneath it is ONE real `<input>`,
 * laid transparently over the cells, which is what makes it work everywhere a code field has to:
 *
 *   - `autocomplete="one-time-code"`, so iOS and Android offer the code from the SMS, and a password manager
 *     can fill it;
 *   - a paste of the whole code lands in one go (characters the field does not accept are dropped);
 *   - assistive technology meets a single labelled text field with a maximum length, not six unlabelled boxes —
 *     the cells are `aria-hidden` decoration of the input's value;
 *   - `inputmode="numeric"` raises the number pad for a digits-only code.
 *
 * Editing happens at the end of the code: typing appends and Backspace removes the last character, and the
 * caret is held at the end so the highlighted cell is always the one the next character goes into (the
 * `data-active` cell, which carries the field's focus ring). `completed` fires once the code is full.
 *
 * The cells read the field's state from the input, as every composite field does (TOKENS.md, "Composite fields"):
 * `aria-invalid` on the component is forwarded to the input and turns every cell's edge destructive, and a
 * disabled field dims as one. The caret is a static bar rather than a blinking one, so there is no motion to
 * reduce.
 */
@Component({
  selector: 'kx-input-otp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxInputOtp), multi: true }],
  template: `
    <div class="kx-input-otp__cells" aria-hidden="true">
      @for (group of layout(); track $index; let g = $index) {
        @if (g > 0) {
          <span class="kx-input-otp__separator"></span>
        }
        <span class="kx-input-otp__group">
          @for (i of group; track i) {
            <span class="kx-input-otp__slot" [attr.data-active]="active() === i ? '' : null">
              {{ value()[i] ?? '' }}
              @if (active() === i && !value()[i]) {
                <span class="kx-input-otp__caret"></span>
              }
            </span>
          }
        </span>
      }
    </div>
    <input
      #field
      class="kx-input-otp__input"
      autocomplete="one-time-code"
      spellcheck="false"
      [attr.inputmode]="allow() === 'digits' ? 'numeric' : 'text'"
      [attr.pattern]="allow() === 'digits' ? '[0-9]*' : null"
      [attr.maxlength]="length()"
      [value]="value()"
      [disabled]="isDisabled()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [attr.aria-invalid]="ariaInvalid()"
      [attr.aria-describedby]="ariaDescribedby()"
      (input)="commit($any($event.target))"
      (focus)="focused.set(true); toEnd()"
      (blur)="focused.set(false); onTouched()"
      (click)="toEnd()"
      (keyup)="toEnd()"
    />
  `,
  host: { class: 'kx-input-otp' },
})
export class KxInputOtp extends KxValueBase<string> {
  readonly value = model('');
  /** How many characters the code has. */
  readonly length = input(6);
  /** Cells per visual group, separated by a dash — `[3, 3]` draws 123–456. Defaults to one group. */
  readonly groups = input<readonly number[] | null>(null);
  /** Which characters the field accepts. Anything else, typed or pasted, is dropped. */
  readonly allow = input<'digits' | 'alphanumeric'>('digits');
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** Forwarded to the input, which is what assistive technology reads and what the cells' error state keys on. */
  readonly ariaInvalid = input<'true' | 'false' | null>(null, { alias: 'aria-invalid' });
  /** Forwarded to the input, so an error or hint is announced with the field. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });
  /** The full code, once every cell is filled. */
  readonly completed = output<string>();

  protected readonly focused = signal(false);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Cell indices, split into the requested groups. A `groups` that does not add up to `length` is ignored. */
  protected readonly layout = computed(() => {
    const length = this.length();
    const groups = this.groups();
    const sizes = groups && groups.reduce((a, b) => a + b, 0) === length ? groups : [length];
    let next = 0;
    return sizes.map((size) => Array.from({ length: size }, () => next++));
  });

  /** The cell the next character goes into — the last one once the code is full — while the field has focus. */
  protected readonly active = computed(() => (this.focused() ? Math.min(this.value().length, this.length() - 1) : -1));

  protected commit(el: HTMLInputElement): void {
    const accept = this.allow() === 'digits' ? /[^0-9]/g : /[^0-9a-z]/gi;
    const next = el.value.replace(accept, '').slice(0, this.length());
    // write the cleaned value back, so a rejected character never shows in the field it was typed into
    if (el.value !== next) el.value = next;
    this.value.set(next);
    this.onChange(next);
    if (next.length === this.length()) this.completed.emit(next);
  }

  /** Keep the caret at the end, so the highlighted cell and the insertion point never disagree. */
  protected toEnd(): void {
    const el = this.field().nativeElement;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  }

  override writeValue(value: string): void {
    this.value.set(value ?? '');
  }
}
