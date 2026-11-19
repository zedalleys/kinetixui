import { DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

/** Attach a decorative indicator to a control whose existing items own selection. */
export function attachSelectionIndicator(itemSelector: string, selectedSelector: string): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const destroy = inject(DestroyRef);

  afterNextRender(() => {
    const view = host.ownerDocument.defaultView;
    const indicator = host.querySelector<HTMLElement>(':scope > .kx-selection-indicator');
    if (!view?.ResizeObserver || !view.MutationObserver || !indicator) return;

    let selected: HTMLElement | null = null;
    let geometry = '';
    const observed = new Set<HTMLElement>();
    const place = (allowTravel: boolean) => {
      const items = new Set(Array.from(host.querySelectorAll<HTMLElement>(itemSelector)));
      for (const item of observed) {
        if (!items.has(item)) {
          sizes.unobserve(item);
          observed.delete(item);
        }
      }
      for (const item of items) {
        if (!observed.has(item)) {
          sizes.observe(item);
          observed.add(item);
        }
      }

      const next = host.querySelector<HTMLElement>(selectedSelector);
      if (!next || next.offsetParent !== host || !next.offsetWidth || !next.offsetHeight) {
        host.removeAttribute('data-kx-indicator-ready');
        selected = null;
        geometry = '';
        return;
      }

      // Offset geometry is local to the track, independent of scrolling and ancestor transforms.
      const bounds = [next.offsetLeft, next.offsetTop, next.offsetWidth, next.offsetHeight];
      const key = bounds.join(',');
      if (selected === next && geometry === key) return;
      const travels = allowTravel && selected !== null && selected !== next;
      indicator.toggleAttribute('data-kx-travel', travels);
      if (!travels) cancelTravel();
      const [left, top, width, height] = bounds;
      indicator.style.setProperty('--kx-indicator-x', `${left}px`);
      indicator.style.setProperty('--kx-indicator-y', `${top}px`);
      indicator.style.setProperty('--kx-indicator-width', `${width}px`);
      indicator.style.setProperty('--kx-indicator-height', `${height}px`);
      selected = next;
      geometry = key;
      host.setAttribute('data-kx-indicator-ready', '');
    };

    const cancelTravel = () => {
      for (const animation of indicator.getAnimations?.() ?? []) animation.cancel();
    };
    const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduceTravel = () => {
      if (!preference?.matches) return;
      indicator.removeAttribute('data-kx-travel');
      // Removing the CSS transition rule alone can leave an in-flight transition running.
      cancelTravel();
    };
    preference?.addEventListener('change', reduceTravel);
    const sizes = new view.ResizeObserver(() => place(false));
    const mutations = new view.MutationObserver(records => {
      place(records.every(record => record.type === 'attributes' && record.attributeName !== 'dir'));
    });
    sizes.observe(host);
    mutations.observe(host, {
      attributes: true,
      attributeFilter: ['aria-selected', 'data-kx-selected', 'disabled', 'dir'],
      childList: true,
      subtree: true,
    });
    for (let ancestor = host.parentElement; ancestor; ancestor = ancestor.parentElement) {
      mutations.observe(ancestor, { attributes: true, attributeFilter: ['dir'] });
    }
    place(false);

    destroy.onDestroy(() => {
      preference?.removeEventListener('change', reduceTravel);
      sizes.disconnect();
      mutations.disconnect();
    });
  });
}
