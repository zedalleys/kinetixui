import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import type { KxButtonSize, KxButtonVariant, KxCorners } from './types';

/**
 * The polite live region a pending button announces into: ONE PER BUTTON, on `document.body`.
 *
 * Two decisions here, and both were made the other way first.
 *
 * It is on `document.body` rather than inside or beside the button. A directive cannot add a child
 * to a native `<button>` without that child becoming part of the button's accessible name — buttons
 * are named from their content, so "Save" would turn into "Save Working…" mid-interaction. A SIBLING
 * is no better: `.kx-sr-only` is a real box, so inside a flex row with `gap` it is a flex item and
 * shifts the layout the caller designed.
 *
 * It is one node per button rather than one shared node for the document. The shared node — the
 * shape Angular's own CDK `LiveAnnouncer` uses, and what this started as — makes every pending
 * button a writer of one piece of state, and with two of them on a page that is wrong in three ways
 * that no single-button test can see:
 *
 *   1. a button mounting with `[pending]="false"` wrote `''`, erasing an announcement another
 *      button had just made;
 *   2. a button settling wrote `''` while another was still working, so the remaining button's
 *      status disappeared from the region;
 *   3. the same on destroy.
 *
 * An ownership set fixes 1–3 but leaves a worse residue: when a button settles while another is
 * still pending, the shared region is left holding the SETTLED button's label, and the only way to
 * correct it is to re-write the other button's label — which announces it a second time. A region
 * per button has no such trade: each one carries exactly its own button's status, a settle clears
 * exactly that status, and a destroy removes exactly that node. Screen readers handle several polite
 * regions; what they cannot do is work out which of two buttons a single shared line refers to.
 *
 * What is NOT claimed: that an AT reads two concurrent polite announcements in a particular order,
 * or at all. `aria-live="polite"` queues at the AT's discretion and none of this ran against one.
 * What the tests prove is which text each region holds after each transition.
 */
const REGION_MARKER = 'data-kx-pending-region';

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

  /**
   * The action this button started is in flight. Controlled by the caller, which must bring it back
   * to `false` on both the confirmed and the failed path.
   *
   * Not `[disabled]`: that attribute drops the control out of the tab order, so the focus the user
   * just placed on it moves to the document. `pending` marks the button `aria-disabled` + `aria-busy`
   * and cancels activation in the guard below, which leaves it focusable and named.
   *
   * Do not also bind `[attr.aria-disabled]` on a button that uses `pending`; the two write the same
   * attribute and the template's binding is applied last.
   */
  readonly pending = input<boolean | undefined, unknown>(undefined, {
    // Three-valued on purpose: `undefined` means this call site never mentioned `pending`, and only
    // then is the rendered button byte-identical to one written before this input existed — no
    // reserved spinner slot, no attributes, nothing. `false` means "opted in, not pending now",
    // which reserves the slot so the label does not jump when it flips.
    transform: (value: unknown) => (value === undefined ? undefined : booleanAttribute(value)),
  });

  /** What a screen reader hears while pending. English default, like the rest of this package. */
  readonly pendingLabel = input('Working…');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Whether THIS directive is the one that wrote `aria-disabled`, so it only removes its own. */
  private ownsAriaDisabled = false;

  /** This button's own live region — created on the first `applyPending`, removed on destroy. */
  private liveRegion: HTMLElement | null = null;

  /**
   * Asked of the platform rather than of the global, so a server render is identified rather than
   * inferred. Announcing is a browser-only concern twice over: there is nothing to announce into on
   * the server, and nobody is interacting with a page that has not been delivered yet. Writing one
   * anyway would also put an empty `sr-only` node into the serialized HTML for the client to
   * duplicate on hydration.
   */
  private readonly isBrowser = inject(PLATFORM_ID) === 'browser';

  /**
   * Writes this button's status, creating its region on first use. A no-op anywhere there is no
   * browser document to write into.
   */
  private announce(message: string): void {
    if (!this.liveRegion) {
      if (!this.isBrowser || typeof document === 'undefined') return;
      const node = document.createElement('div');
      node.className = 'kx-sr-only';
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      node.setAttribute(REGION_MARKER, '');
      document.body.appendChild(node);
      this.liveRegion = node;
    }
    this.liveRegion.textContent = message;
  }

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
    el.addEventListener('keydown', (event) => this.blockKeyWhenAriaDisabled(event), true);

    // The attributes are written here rather than host-bound because `aria-disabled` is also the
    // caller's to write (that is the whole of PR #442's anchor case), and two bindings on one
    // attribute is a conflict rather than a merge. `ownsAriaDisabled` keeps this from removing an
    // `aria-disabled` the caller put there.
    effect(() => {
      // Read both signals unconditionally, so the effect tracks the label as well as the state and a
      // label changed mid-flight re-announces (a changed status is a status).
      const declared = this.pending();
      const label = this.pendingLabel();
      // Never mentioned at this call site: touch nothing, not even the shared live region. This is
      // what makes a button written before `pending` existed render byte-identically.
      if (declared === undefined) return;
      this.applyPending(declared === true, label);
    });

    // `disabled` is a native property binding, not a signal, so the effect above cannot see it
    // change. Without this, a button that becomes `disabled` WHILE pending would keep its
    // `aria-busy`, its ring and its announcement — reported as working while the platform reports it
    // as unavailable. `disabled` is a reflected attribute, so Angular's property write shows up
    // here; the filter is deliberately narrow, so the directive's own writes of `data-pending`,
    // `aria-busy` and `aria-disabled` do not re-enter this callback.
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        const declared = this.pending();
        if (declared === undefined) return;
        this.applyPending(declared === true, this.pendingLabel());
      });
      observer.observe(el, { attributes: true, attributeFilter: ['disabled'] });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }

    // A button that unmounts while still pending must not leave "Working…" sitting in the document.
    // Its own node goes with it, which is the whole benefit of a region per button: no other
    // button's status is touched.
    inject(DestroyRef).onDestroy(() => {
      this.liveRegion?.remove();
      this.liveRegion = null;
    });
  }

  /**
   * PRECEDENCE: `disabled` wins over `pending`, the same rule the React, SwiftUI, Compose and
   * Flutter ports follow. A control the author has taken out of service is not performing an action,
   * so it gets no ring, no `aria-busy` and no announcement. Read off the element rather than from an
   * input, because `disabled` belongs to the native element here — the directive deliberately does
   * not intercept it.
   */
  private get unavailable(): boolean {
    const el = this.host.nativeElement as HTMLElement & { disabled?: boolean };
    return el.disabled === true || el.hasAttribute('disabled');
  }

  /** The single writer of the pending presentation, called from the effect and the observer alike. */
  private applyPending(declaredPending: boolean, label: string): void {
    const el = this.host.nativeElement;
    const pending = declaredPending && !this.unavailable;
    if (pending) {
      el.setAttribute('data-pending', '');
      el.setAttribute('aria-busy', 'true');
      if (el.getAttribute('aria-disabled') !== 'true') {
        el.setAttribute('aria-disabled', 'true');
        this.ownsAriaDisabled = true;
      }
      this.announce(label);
    } else {
      el.removeAttribute('data-pending');
      el.removeAttribute('aria-busy');
      if (this.ownsAriaDisabled) {
        el.removeAttribute('aria-disabled');
        this.ownsAriaDisabled = false;
      }
      // Cleared, not removed: the node is created while the button is merely opted in and stays for
      // the button's lifetime, because a live region inserted and filled in the same task is
      // unreliably announced.
      this.announce('');
    }
  }

  /**
   * Read at event time rather than bound, so a caller writing `[attr.aria-disabled]` needs no second input
   * and the guard can never hold a stale answer.
   */
  private get ariaDisabled(): boolean {
    // `pending()` is consulted as well as the attribute, so the guard is correct in the one frame
    // between the input changing and the effect running — and it defers to `disabled` for the same
    // reason `applyPending` does, so the two can never disagree about what this control is.
    return (
      (this.pending() === true && !this.unavailable) ||
      this.host.nativeElement.getAttribute('aria-disabled') === 'true'
    );
  }

  /**
   * A native `<button disabled>` never dispatches these, so this only ever fires for the anchor form.
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
    // Reserves the indicator slot for a call site that uses `pending` at all — see the input.
    if (this.pending() !== undefined) out.push('kx-btn--pending-aware');
    return out.join(' ');
  });
}
