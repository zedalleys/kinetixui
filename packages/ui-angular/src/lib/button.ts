import { Directive, ElementRef, computed, inject, input } from '@angular/core';
import type { KxButtonSize, KxButtonVariant, KxCorners } from './types';

/**
 * KinetixUI button.
 *
 *   <button kxButton>Save</button>
 *   <button kxButton variant="Outline" size="lg">Cancel</button>
 *   <a kxButton variant="Link" href="/docs">Docs</a>
 *
 * A directive on a real `<button>` or `<a>`, not a `<kx-button>` wrapper. That is the idiomatic Angular choice
 * and the accessible one: the element keeps its own role, its `type`, `disabled`, form submission, focus order
 * and the browser's own activation behaviour, so none of it has to be re-implemented with ARIA. §28 of the
 * house rules — native semantics before ARIA — is the reason, not convenience.
 *
 * A disabled anchor is not a thing in HTML, so the anchor form is disabled with `aria-disabled`. The directive
 * does not silently rewrite an anchor into a button.
 *
 * `aria-disabled` used to be enforced by the stylesheet alone (`pointer-events: none`), which suppressed the
 * pointer and nothing else: the anchor stayed in the tab order and Enter still navigated, so the control was
 * inert for a mouse and live for a keyboard. The source comment here asked callers to drop `href` as well,
 * which made the only correct usage a convention rather than part of the API. Activation is now guarded in
 * the directive, for every input device, so `aria-disabled` alone is sufficient and `href` can stay.
 *
 * It stays FOCUSABLE on purpose. That is the whole difference between `aria-disabled` and `disabled`: the
 * control remains discoverable, so a keyboard user can reach it and hear why it is unavailable instead of
 * finding a gap where it used to be. Dropping `pointer-events: none` (see `styles.css`) restores the same
 * thing for a pointer — hover and the cursor still read, the activation does not land.
 */
@Directive({
  selector: 'button[kxButton], a[kxButton]',
  host: {
    '[class]': 'classes()',
    // exposed for application CSS and tests; mirrors the data-variant attribute the React button sets
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '(click)': 'blockWhenAriaDisabled($event)',
    '(keydown)': 'blockKeyWhenAriaDisabled($event)',
  },
})
export class KxButton {
  readonly variant = input<KxButtonVariant>('Primary');
  readonly size = input<KxButtonSize>('md');
  readonly corners = input<KxCorners>('default');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Read at event time rather than bound, so a caller writing `[attr.aria-disabled]` needs no second input
   * and the guard can never hold a stale answer.
   */
  private get ariaDisabled(): boolean {
    return this.host.nativeElement.getAttribute('aria-disabled') === 'true';
  }

  /**
   * A native `<button disabled>` never dispatches these, so this only ever fires for the anchor form.
   *
   * What this stops: the navigation, and the event reaching any ANCESTOR handler. What it cannot stop is a
   * handler the caller bound on the same element — Angular creates an element's own template listeners
   * before a directive's host listeners, so `(click)` on the anchor has already run by the time this is
   * called, and `stopImmediatePropagation` is therefore no better than `stopPropagation` here (measured,
   * not assumed — see the slice report). Closing that last gap needs a `disabled` input on this directive
   * for the caller to bind instead of writing `aria-disabled` by hand, which is a public API change and is
   * proposed separately rather than slipped in here.
   */
  protected blockWhenAriaDisabled(event: Event): void {
    if (!this.ariaDisabled) return;
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Enter activates an anchor and Space scrolls the page; both are stopped. Tab, the arrow keys and the rest
   * are left alone, because the control stays focusable and reachable.
   */
  protected blockKeyWhenAriaDisabled(event: Event): void {
    // `Event`, not `KeyboardEvent`: a host binding's `$event` is typed as `Event` under AOT template
    // checking, so narrowing here is what keeps `pnpm --filter @kinetixui/angular build` compiling.
    if (!this.ariaDisabled || !(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    event.stopPropagation();
  }

  protected readonly classes = computed(() => {
    const out = ['kx-btn', `kx-btn--${this.variant().toLowerCase()}`, `kx-btn--${this.size()}`];
    // "default" corners means "whatever the control radius token says", so it adds no class
    if (this.corners() !== 'default') out.push(`kx-btn--${this.corners()}`);
    return out.join(' ');
  });
}
