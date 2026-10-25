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
  },
})
export class KxButton {
  readonly variant = input<KxButtonVariant>('Primary');
  readonly size = input<KxButtonSize>('md');
  readonly corners = input<KxCorners>('default');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The guards are registered here, imperatively, instead of as `host: { '(click)': ... }` bindings — and
   * that is the difference between "mostly inert" and inert. Angular creates an element's own template
   * listeners BEFORE a directive's host listeners, so a host-bound guard runs second: by then
   * `(click)="submit()"` written on the anchor by the caller has already fired, and
   * `stopImmediatePropagation` cannot undo it, because what decides this is registration order, not phase.
   * A constructor listener is created before the template's, so the guard runs first and
   * `stopImmediatePropagation` suppresses the caller's handler as well. Measured both ways; the spec
   * asserts it, so a later move back to `host` fails rather than quietly reopening the hole.
   *
   * These handlers only cancel — they read no signal and set no state — so running outside Angular's zone
   * costs nothing, and the directive is destroyed with the element it is on.
   */
  constructor() {
    const el = this.host.nativeElement;
    el.addEventListener('click', (event) => this.blockWhenAriaDisabled(event), true);
    // Middle-click is NOT a `click`: the browser dispatches `auxclick` for any non-primary button, and an
    // anchor's default action for it is to open the href in a new tab. While the stylesheet said
    // `pointer-events: none` that was unreachable; replacing it with `cursor: not-allowed` made it
    // reachable again, so the guard has to cover it or this slice trades a keyboard hole for a pointer one.
    // Ctrl- and Cmd-click need no separate guard — those are primary-button `click`s with a modifier.
    el.addEventListener('auxclick', (event) => this.blockWhenAriaDisabled(event), true);
    el.addEventListener('keydown', (event) => this.blockKeyWhenAriaDisabled(event), true);
  }

  /**
   * Read at event time rather than bound, so a caller writing `[attr.aria-disabled]` needs no second input
   * and the guard can never hold a stale answer.
   */
  private get ariaDisabled(): boolean {
    return this.host.nativeElement.getAttribute('aria-disabled') === 'true';
  }

  /**
   * Click and auxclick (middle- or right-button activation). A native `<button disabled>` never dispatches
   * these, so this only ever fires for the anchor form.
   *
   * What this stops: the navigation, every ancestor handler, and the caller's own handler on this same
   * element. The last of those is why the listeners are registered in the constructor rather than declared
   * in `host` — see the comment there.
   */
  private blockWhenAriaDisabled(event: Event): void {
    if (!this.ariaDisabled) return;
    event.preventDefault();
    // `stopImmediatePropagation`, not `stopPropagation`: at the target element the DOM standard invokes
    // capture and bubble listeners in registration order, so only the immediate form reaches a sibling
    // listener the caller registered after this one. `stopPropagation` happens to be enough under jsdom,
    // where the capture listener is dispatched in the capturing phase; that is a difference between the
    // test environment and a browser, not a licence to rely on it.
    event.stopImmediatePropagation();
  }

  /**
   * Enter activates an anchor and Space scrolls the page; both are stopped. Tab, the arrow keys and the rest
   * are left alone, because the control stays focusable and reachable.
   */
  private blockKeyWhenAriaDisabled(event: Event): void {
    if (!this.ariaDisabled || !(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  protected readonly classes = computed(() => {
    const out = ['kx-btn', `kx-btn--${this.variant().toLowerCase()}`, `kx-btn--${this.size()}`];
    // "default" corners means "whatever the control radius token says", so it adds no class
    if (this.corners() !== 'default') out.push(`kx-btn--${this.corners()}`);
    return out.join(' ');
  });
}
