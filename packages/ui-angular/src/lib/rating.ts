import { ChangeDetectionStrategy, Component, booleanAttribute, computed, forwardRef, input, model, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { KxValueBase } from './forms';

let nextRating = 0;

/* ── rating ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-rating [(ngModel)]="stars" aria-label="Rate this article" />
 *   <kx-rating [value]="4" readonly />
 *
 * A star rating. The interaction contract, defined before the implementation and asserted in a real browser
 * (scripts/angular-browser.mjs):
 *
 *   semantics   a `radiogroup` named by `aria-label` / `aria-labelledby` ("Rating" if neither is given), whose
 *               stars are real `<input type="radio">`s named "1 star" … "5 stars". One of N, chosen — which is
 *               what a rating is, and what a screen reader already knows how to announce ("3 stars, radio,
 *               checked, 3 of 5").
 *   keyboard    one tab stop: the chosen star, or the first when nothing is chosen yet. The arrow keys move
 *               and choose (the browser's own radio behaviour, mirrored in RTL); Home and End choose the
 *               lowest and highest. Space chooses the focused star.
 *   pointer     clicking a star chooses it; hovering previews the fill up to that star without changing the
 *               value.
 *   read-only   `readonly` renders a static display — `role="img"` named "Rated 3 out of 5", the stars hidden
 *               from assistive technology, no tab stop — for a rating that is shown, not given.
 *   disabled    every radio is disabled; the group dims and does not answer the pointer.
 *   direction   the stars run from the inline start, so the first star is on the right in an RTL page.
 *   motion      none: a star's fill changes colour instantly.
 *
 * This differs from React's Rating, which renders `aria-pressed` buttons inside a `radiogroup` with no arrow-key
 * movement; the radios here are the closer fit to the role the group claims.
 */
@Component({
  selector: 'kx-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxRating), multi: true }],
  template: `
    @for (n of stars(); track n) {
      @if (readonly()) {
        <span class="kx-rating__item">
          <svg class="kx-rating__star" [class.kx-rating__star--on]="n <= value()" viewBox="0 0 24 24" aria-hidden="true">
            <path [attr.d]="star" />
          </svg>
        </span>
      } @else {
        <label class="kx-rating__item" (pointerenter)="preview(n)">
          <input
            type="radio"
            class="kx-rating__radio"
            [name]="name"
            [value]="n"
            [checked]="n === value()"
            [disabled]="isDisabled()"
            [attr.aria-label]="n === 1 ? '1 star' : n + ' stars'"
            (change)="commit(n)"
            (keydown)="onKey($event)"
            (blur)="onTouched()"
          />
          <svg class="kx-rating__star" [class.kx-rating__star--on]="n <= shown()" viewBox="0 0 24 24" aria-hidden="true">
            <path [attr.d]="star" />
          </svg>
        </label>
      }
    }
  `,
  host: {
    '[class]': '"kx-rating kx-rating--" + size()',
    '[attr.role]': "readonly() ? 'img' : 'radiogroup'",
    '[attr.aria-label]': "readonly() ? 'Rated ' + value() + ' out of ' + max() : (ariaLabelledby() ? null : ariaLabel() ?? 'Rating')",
    '[attr.aria-labelledby]': 'readonly() ? null : ariaLabelledby()',
    '[attr.aria-disabled]': 'isDisabled() ? true : null',
    '(pointerleave)': 'hovered.set(null)',
  },
})
export class KxRating extends KxValueBase<number> {
  /** The chosen number of stars; 0 is "not rated yet". */
  readonly value = model(0);
  readonly max = input(5);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  readonly changed = output<number>();

  protected readonly name = `kx-rating-${nextRating++}`;
  protected readonly hovered = signal<number | null>(null);
  protected readonly stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));
  /** What the stars show: the hovered preview while the pointer is over one, otherwise the value. */
  protected readonly shown = computed(() => this.hovered() ?? this.value());
  /** A five-pointed star on a 24-unit grid. */
  protected readonly star = 'M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z';

  protected preview(n: number): void {
    if (!this.isDisabled()) this.hovered.set(n);
  }

  protected commit(n: number): void {
    this.value.set(n);
    this.onChange(n);
    this.changed.emit(n);
  }

  /** Home and End — the one piece of radio-group keyboard behaviour the browser does not provide. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const n = event.key === 'Home' ? 1 : this.max();
    const group = (event.currentTarget as HTMLElement).closest('kx-rating');
    group?.querySelectorAll<HTMLInputElement>('input[type=radio]')[n - 1]?.focus();
    this.commit(n);
  }

  override writeValue(value: number): void {
    this.value.set(Number.isFinite(value) ? value : 0);
  }
}
