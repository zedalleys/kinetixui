import { Directive, computed, input } from '@angular/core';
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
 * A disabled anchor is not a thing in HTML, so the anchor form is disabled with `aria-disabled` plus the
 * stylesheet's `pointer-events: none`; callers should also drop `href`. The directive does not silently rewrite
 * an anchor into a button.
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

  protected readonly classes = computed(() => {
    const out = ['kx-btn', `kx-btn--${this.variant().toLowerCase()}`, `kx-btn--${this.size()}`];
    // "default" corners means "whatever the control radius token says", so it adds no class
    if (this.corners() !== 'default') out.push(`kx-btn--${this.corners()}`);
    return out.join(' ');
  });
}
