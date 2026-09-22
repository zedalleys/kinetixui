import { ChangeDetectionStrategy, Component, Directive, computed, input } from '@angular/core';
import type { KxAlertVariant, KxBadgeVariant, KxOrientation } from './types';

/**
 * The presentational primitives: badge, card family, label, input, separator, progress and alert.
 *
 * Each is either a directive on the element HTML already has for the job (label, input) or a component that
 * renders one (badge, card, alert). Nothing here invents a role the platform already provides.
 */

/* ── badge ──────────────────────────────────────────────────────────────── */

/**
 *   <kx-badge>New</kx-badge>
 *   <kx-badge variant="success">Synced</kx-badge>
 *
 * Presentational by default. A badge that conveys a status change the user must be told about should be given
 * a live region by the caller — this does not guess, because a wrong `aria-live` is worse than none.
 */
@Component({
  selector: 'kx-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': '"kx-badge kx-badge--" + variant()' },
})
export class KxBadge {
  readonly variant = input<KxBadgeVariant>('default');
}

/* ── card ───────────────────────────────────────────────────────────────── */

@Component({
  selector: 'kx-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-card' },
})
export class KxCard {}

@Component({
  selector: 'kx-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-card-header' },
})
export class KxCardHeader {}

/**
 * A real heading, at a level the page chooses. `level` exists because a card's title is only an `<h3>` in the
 * example — in a page that already has an `<h3>` the right level is whatever keeps the document outline
 * correct, and a component that hard-codes one produces broken heading structure at scale.
 *
 * The level is carried by `role="heading"` + `aria-level` on the host rather than by switching between `<h1>`
 * … `<h6>` tags. That is not a shortcut: `<ng-content>` projects its content exactly once, so a template with
 * a heading tag per branch silently renders an empty heading for every branch after the first. Between a real
 * tag that loses its text and an ARIA heading that keeps it, the accessible answer is the one with the text in
 * it — and `role="heading"` with an explicit level is fully supported.
 */
@Component({
  selector: 'kx-card-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-card-title',
    role: 'heading',
    '[attr.aria-level]': 'level()',
  },
})
export class KxCardTitle {
  readonly level = input<1 | 2 | 3 | 4 | 5 | 6>(3);
}

@Component({
  selector: 'kx-card-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="kx-card-description"><ng-content /></p>',
})
export class KxCardDescription {}

@Component({
  selector: 'kx-card-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-card-content' },
})
export class KxCardContent {}

@Component({
  selector: 'kx-card-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-card-footer' },
})
export class KxCardFooter {}

/* ── label ──────────────────────────────────────────────────────────────── */

/**
 *   <label kxLabel for="email">Email</label>
 *
 * A directive on a real `<label>`, so `for`/`id` association and click-to-focus are the browser's, not ours.
 */
@Directive({
  selector: 'label[kxLabel]',
  host: { class: 'kx-label' },
})
export class KxLabel {}

/* ── input ──────────────────────────────────────────────────────────────── */

/**
 *   <input kxInput type="email" [(ngModel)]="email" />
 *   <textarea kxInput rows="4"></textarea>
 *
 * A directive, so `type`, `required`, `disabled`, autofill, the browser's own validation and every Angular
 * forms directive keep working untouched. The error state is read from `aria-invalid`, which means the
 * semantics drive the styling rather than a parallel `invalid` input that could disagree with them.
 */
@Directive({
  selector: 'input[kxInput], textarea[kxInput]',
  host: { class: 'kx-input' },
})
export class KxInput {}

/* ── separator ──────────────────────────────────────────────────────────── */

/**
 *   <kx-separator />
 *   <kx-separator orientation="vertical" />
 *
 * Decorative by default and therefore hidden from assistive technology, which is what a rule between two
 * visually grouped things usually is. Set `[decorative]="false"` to expose it as a real `separator`.
 */
@Component({
  selector: 'kx-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    '[class]': '"kx-separator kx-separator--" + orientation()',
    '[attr.role]': 'decorative() ? "none" : "separator"',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
    '[attr.aria-orientation]': 'decorative() || orientation() === "horizontal" ? null : "vertical"',
  },
})
export class KxSeparator {
  readonly orientation = input<KxOrientation>('horizontal');
  readonly decorative = input(true);
}

/* ── progress ───────────────────────────────────────────────────────────── */

/**
 *   <kx-progress [value]="62" />
 *   <kx-progress [value]="null" />   <!-- indeterminate -->
 *
 * A real `progressbar`. `value` is null for indeterminate, which drops `aria-valuenow` — the correct way to
 * say "in progress, amount unknown", rather than reporting a fake 0.
 */
@Component({
  selector: 'kx-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="kx-progress__bar" [style.inline-size.%]="percent()"></div>',
  host: {
    class: 'kx-progress',
    role: 'progressbar',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuetext]': 'valueText()',
  },
})
export class KxProgress {
  readonly value = input<number | null>(0);
  readonly max = input(100);
  /** Announced instead of the raw percentage when the number alone would not mean anything ("3 of 7 files"). */
  readonly valueText = input<string | null>(null);

  protected readonly percent = computed(() => {
    const v = this.value();
    if (v === null) return 100; // indeterminate: a full track, animated by CSS rather than a fake number
    return Math.max(0, Math.min(100, (v / this.max()) * 100));
  });
}

/* ── alert ──────────────────────────────────────────────────────────────── */

/**
 *   <kx-alert variant="destructive">
 *     <kx-alert-title>Payment failed</kx-alert-title>
 *     <kx-alert-description>Your card was declined.</kx-alert-description>
 *   </kx-alert>
 *
 * `role` defaults to `alert` only for the variants that carry urgency. A neutral informational panel announced
 * as an assertive live region interrupts a screen-reader user for no reason, so `default` and `info` render as
 * a plain region and the caller can opt in.
 */
@Component({
  selector: 'kx-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    '[class]': '"kx-alert kx-alert--" + variant()',
    '[attr.role]': 'role()',
  },
})
export class KxAlert {
  readonly variant = input<KxAlertVariant>('default');
  protected readonly role = computed(() => (this.variant() === 'destructive' || this.variant() === 'warning' ? 'alert' : 'note'));
}

@Component({
  selector: 'kx-alert-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="kx-alert-title"><ng-content /></p>',
})
export class KxAlertTitle {}

@Component({
  selector: 'kx-alert-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="kx-alert-description"><ng-content /></p>',
})
export class KxAlertDescription {}
