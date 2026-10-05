import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * The overlay layer: one small set of primitives every floating or modal surface in this package stands on.
 * Nothing in this file is exported from `public-api.ts` — it is infrastructure the dialog family
 * (dialog.ts) and the floating family (floating.ts) share, and that Wave C2's menus and listboxes will
 * consume. Its contract is documented in TOKENS.md ("Overlays") and ANGULAR-GRADUATION.md.
 *
 * ── Rendering: the browser's top layer, not a portal ───────────────────────
 *
 * An overlay has to escape every clipping and stacking context its trigger lives in: an `overflow: hidden`
 * card, a transformed app shell, a sticky header with its own z-index. The usual answer is a portal that
 * moves the surface's DOM to the end of `<body>`. That costs Angular a great deal: the content leaves the
 * element injector it was declared under, inherits styles (and `dir`) from `<body>` instead of from where it
 * was written, and needs a host outlet and teardown of its own.
 *
 * The platform now has the answer built in. A modal surface is a real `<dialog>` opened with `showModal()`,
 * and a floating surface carries `popover="manual"` and is shown with `showPopover()`. Both put the element
 * in the TOP LAYER: rendered above everything, positioned against the viewport, outside every ancestor's
 * overflow clip, transform and z-index — while staying exactly where the template declared it in the DOM.
 * So DI, change detection, CSS inheritance and the direction a nested `dir` region resolves to all keep
 * working with no code, and there is no z-index anywhere in this layer. Order in the top layer is the order
 * surfaces were shown, which is the stacking order this file's stack keeps.
 *
 * `showModal()` also makes everything outside the dialog inert: the background leaves the tab order and the
 * accessibility tree, which is the containment a modal needs, from the browser rather than from an
 * `aria-hidden` sweep over siblings.
 *
 * SSR: nothing here touches the DOM when a component is created. A server renders closed elements (`<dialog>`
 * without `open`, a `[popover]` that is not shown); every call below runs from a browser-only render hook or an
 * event handler.
 *
 * ── The stack ──────────────────────────────────────────────────────────────
 *
 * `KxOverlayStack` keeps open layers in the order they opened. It owns the three document listeners every
 * overlay needs — keydown, pointerdown and focusin — installed when the first layer opens and removed when
 * the last one closes, so a page with no open overlay has none of them.
 *
 *   Escape          goes to the TOPMOST layer only, and the keydown's default is prevented so a native
 *                   `<dialog>` underneath never also receives a close request for the same key press.
 *                   An Escape another component already handled (`defaultPrevented`) is left alone.
 *   outside press   walks down from the top: each layer the press is outside of is asked to close; it stops
 *                   at the first layer the press is inside, and after the first modal layer (nothing beneath a
 *                   modal can have been pressed). "Inside" is the layer's own DOM subtree plus its companions
 *                   (its trigger and anchor). A popover declared inside a dialog is inside that dialog's
 *                   subtree, so pressing the popover can never read as a press outside its dialog.
 *   focus outside   the same walk for focus, for the layers whose policy asks for it (non-modal surfaces).
 *   nesting         closing a layer first closes every open layer nested inside its subtree.
 *   scroll lock     the page's scrolling is held while at least one MODAL layer is open — derived from the
 *                   stack on every change, not counted up and down, so it cannot drift: an inner modal closing
 *                   leaves it locked while an outer one remains.
 *
 * Each layer applies its own policy when asked: an alert dialog declines to close on an outside press.
 */

/** Why the stack is asking a layer to close. `parent` is not a request: the layer it is nested in is closing. */
export type KxDismissReason = 'escape' | 'outside' | 'focus-outside' | 'parent';

export interface KxLayer {
  readonly modal: boolean;
  /** Whether this layer closes when focus moves outside it (non-modal surfaces). */
  readonly closesOnFocusOutside: boolean;
  /** The surface element. Inside it is inside the layer. */
  surface(): HTMLElement | null;
  /** Elements outside the surface that belong to it — its trigger, its anchor. */
  companions(): readonly (Element | null | undefined)[];
  /** The stack asks the layer to close. The layer decides, by its own policy, whether it does. */
  request(reason: KxDismissReason): void;
}

@Injectable({ providedIn: 'root' })
export class KxOverlayStack {
  private readonly doc = inject(DOCUMENT);
  private readonly layers: KxLayer[] = [];
  private listening = false;
  private locked: { overflow: string; gutter: string } | null = null;

  /** The open layers, bottom to top. Read-only; for the components that need their own parent. */
  get open(): readonly KxLayer[] {
    return this.layers;
  }

  add(layer: KxLayer): void {
    if (this.layers.includes(layer)) return;
    this.layers.push(layer);
    this.changed();
  }

  /** Remove a layer, first closing the layers nested in it. Safe to call for a layer that is not open. */
  remove(layer: KxLayer): void {
    const at = this.layers.indexOf(layer);
    if (at === -1) return;
    const surface = layer.surface();
    for (const above of this.layers.slice(at + 1).reverse()) {
      if (surface && this.nestedIn(above, surface)) {
        this.layers.splice(this.layers.indexOf(above), 1);
        above.request('parent');
      }
    }
    this.layers.splice(this.layers.indexOf(layer), 1);
    this.changed();
  }

  /** The nearest open layer whose subtree holds `layer` — the surface focus falls back to. */
  parentOf(layer: KxLayer): KxLayer | null {
    const surface = layer.surface();
    if (!surface) return null;
    for (const below of [...this.layers].reverse()) {
      if (below === layer) continue;
      const s = below.surface();
      if (s && s !== surface && s.contains(surface)) return below;
    }
    return null;
  }

  isTopmost(layer: KxLayer): boolean {
    return this.layers.at(-1) === layer;
  }

  private nestedIn(child: KxLayer, surface: HTMLElement): boolean {
    const s = child.surface();
    return !!s && (surface.contains(s) || child.companions().some((c) => !!c && surface.contains(c)));
  }

  private changed(): void {
    const view = this.doc.defaultView;
    if (!view) return;
    // listeners: present exactly while something is open
    if (this.layers.length && !this.listening) {
      this.doc.addEventListener('keydown', this.onKeydown);
      this.doc.addEventListener('pointerdown', this.onPointerdown, true);
      this.doc.addEventListener('focusin', this.onFocusin, true);
      this.listening = true;
    } else if (!this.layers.length && this.listening) {
      this.doc.removeEventListener('keydown', this.onKeydown);
      this.doc.removeEventListener('pointerdown', this.onPointerdown, true);
      this.doc.removeEventListener('focusin', this.onFocusin, true);
      this.listening = false;
    }
    // scroll: held while any modal layer is open
    const modal = this.layers.some((l) => l.modal);
    const html = this.doc.documentElement;
    if (modal && !this.locked) {
      this.locked = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
      // Keep the scrollbar's space when the page had one, so locking does not slide the page sideways.
      if (view.innerWidth - html.clientWidth > 0) html.style.scrollbarGutter = 'stable';
      html.style.overflow = 'hidden';
      html.setAttribute('data-kx-scroll-locked', '');
    } else if (!modal && this.locked) {
      html.style.overflow = this.locked.overflow;
      html.style.scrollbarGutter = this.locked.gutter;
      html.removeAttribute('data-kx-scroll-locked');
      this.locked = null;
    }
  }

  private contains(layer: KxLayer, path: EventTarget[], event?: PointerEvent): boolean {
    if (layer.companions().some((c) => !!c && path.includes(c))) return true;
    const surface = layer.surface();
    if (!surface || !path.includes(surface)) return false;
    // A modal <dialog>'s ::backdrop is hit-tested as the dialog itself: a press on the backdrop arrives with
    // the dialog as its target and a point outside the dialog's box.
    if (event && event.target === surface) {
      const r = surface.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    }
    return true;
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    const top = this.layers.at(-1);
    if (!top) return;
    // One Escape, one layer. Preventing the default also withholds the close request a native modal
    // <dialog> would otherwise act on, so the layer underneath cannot close on the same key press.
    event.preventDefault();
    top.request('escape');
  };

  private readonly onPointerdown = (event: PointerEvent): void => {
    const path = event.composedPath();
    for (const layer of [...this.layers].reverse()) {
      if (this.contains(layer, path, event)) return;
      layer.request('outside');
      if (layer.modal) return;
    }
  };

  private readonly onFocusin = (event: FocusEvent): void => {
    const path = event.composedPath();
    for (const layer of [...this.layers].reverse()) {
      if (layer.modal || this.contains(layer, path)) return;
      if (layer.closesOnFocusOutside) layer.request('focus-outside');
    }
  };
}

/* ── focus ──────────────────────────────────────────────────────────────── */

const FOCUSABLE =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, audio[controls], video[controls], summary, [contenteditable]:not([contenteditable="false"]), [tabindex]';

function rendered(el: HTMLElement): boolean {
  const check = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  return check ? check.call(el, { visibilityProperty: true }) : el.getClientRects().length > 0;
}

/**
 * The elements Tab can reach inside `root`, in order. A radio group is one stop: its checked radio, or its
 * first when none is checked — the stop the browser itself would take.
 */
export function tabbables(root: HTMLElement): HTMLElement[] {
  const seenGroups = new Set<string>();
  const out: HTMLElement[] = [];
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  for (const el of all) {
    if (el.tabIndex < 0 || (el as HTMLButtonElement).disabled || el.closest('[inert]') || !rendered(el)) continue;
    if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
      const key = `${el.form?.id ?? ''}|${el.name}`;
      if (seenGroups.has(key)) continue;
      const group = all.filter((r): r is HTMLInputElement => r instanceof HTMLInputElement && r.type === 'radio' && r.name === el.name);
      const stop = group.find((r) => r.checked) ?? group[0];
      if (stop !== el) continue;
      seenGroups.add(key);
    }
    out.push(el);
  }
  return out;
}

/**
 * Whether focus can be put back on `el`: still in the document, not disabled, not inert, rendered, and
 * focusable at all. Focus is never restored to an element that fails this — a removed trigger, or one a later
 * change disabled or hid.
 */
export function isFocusTarget(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el === el.ownerDocument.body || (el as HTMLButtonElement).disabled || el.closest('[inert]')) return false;
  if (!el.matches(FOCUSABLE)) return false;
  return rendered(el);
}

/** The element that has focus, looking through shadow roots. */
export function activeElement(doc: Document): HTMLElement | null {
  let el = doc.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el instanceof HTMLElement && el !== doc.body ? el : null;
}

/**
 * Keep Tab inside `root`: from the last stop Tab goes to the first, and from the first Shift+Tab goes to the
 * last. A modal `<dialog>` already makes everything outside it inert, but from its last stop the browser
 * moves focus out to its own chrome; this keeps the cycle inside the surface. Returns true when it moved focus.
 */
export function wrapTab(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return false;
  const stops = tabbables(root);
  const active = activeElement(root.ownerDocument);
  if (!stops.length) {
    event.preventDefault();
    root.focus();
    return true;
  }
  const [first, last] = [stops[0]!, stops.at(-1)!];
  if (event.shiftKey && (active === first || active === root || !active || !root.contains(active))) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (active === last || !active || !root.contains(active))) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/* ── positioning ────────────────────────────────────────────────────────── */

/**
 * Where a floating surface goes, relative to the element it belongs to. The contract is deliberately small:
 *
 *   side    top | bottom | start | end — start and end are LOGICAL: they resolve to left or right by the
 *           direction the anchor itself computes to, so a popover set to open "toward the end" opens to the
 *           right in an LTR page and to the left in an RTL one (and in a nested region, by that region)
 *   align   start | center | end along the other axis, logical in the same way
 *   offset  the gap between anchor and surface, in px
 *
 * Collision handling, in order: FLIP to the opposite side when the chosen one lacks the room and the
 * opposite has more; SHIFT along the cross axis so the surface stays `padding` inside the viewport; and CAP
 * the surface's size to the room it has (`maxWidth`, `maxHeight`, published as CSS custom properties) so large
 * text or a phone-sized viewport makes it scroll inside itself rather than run off the screen.
 *
 * Pure: rects in, coordinates out. The DOM side (`autoPlace`) measures, calls this, writes the result.
 */
export type KxSide = 'top' | 'bottom' | 'start' | 'end';
export type KxAlign = 'start' | 'center' | 'end';
export type KxPhysicalSide = 'top' | 'bottom' | 'left' | 'right';

export interface KxBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface KxPlacementInput {
  anchor: KxBox;
  floating: { width: number; height: number };
  viewport: { width: number; height: number };
  side: KxSide;
  align: KxAlign;
  offset: number;
  padding: number;
  rtl: boolean;
}
export interface KxPlacement {
  x: number;
  y: number;
  /** The physical side the surface ended up on, after direction and collisions. */
  side: KxPhysicalSide;
  flipped: boolean;
  maxWidth: number;
  maxHeight: number;
}

const OPPOSITE: Record<KxPhysicalSide, KxPhysicalSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function physicalSide(side: KxSide, rtl: boolean): KxPhysicalSide {
  if (side === 'start') return rtl ? 'right' : 'left';
  if (side === 'end') return rtl ? 'left' : 'right';
  return side;
}

export function computePlacement(i: KxPlacementInput): KxPlacement {
  const { anchor: a, floating: f, viewport: v, offset, padding } = i;
  const room: Record<KxPhysicalSide, number> = {
    top: a.y - offset - padding,
    bottom: v.height - (a.y + a.height) - offset - padding,
    left: a.x - offset - padding,
    right: v.width - (a.x + a.width) - offset - padding,
  };
  const wanted = physicalSide(i.side, i.rtl);
  const vertical = (s: KxPhysicalSide) => s === 'top' || s === 'bottom';
  const need = vertical(wanted) ? f.height : f.width;
  let side = wanted;
  if (room[wanted] < need && room[OPPOSITE[wanted]] > room[wanted]) side = OPPOSITE[wanted];

  let x: number;
  let y: number;
  if (vertical(side)) {
    y = side === 'bottom' ? a.y + a.height + offset : a.y - offset - f.height;
    // logical alignment along the inline axis
    const startX = i.rtl ? a.x + a.width - f.width : a.x;
    const endX = i.rtl ? a.x : a.x + a.width - f.width;
    x = i.align === 'center' ? a.x + a.width / 2 - f.width / 2 : i.align === 'start' ? startX : endX;
    x = clamp(x, padding, v.width - padding - f.width);
  } else {
    x = side === 'right' ? a.x + a.width + offset : a.x - offset - f.width;
    y = i.align === 'center' ? a.y + a.height / 2 - f.height / 2 : i.align === 'start' ? a.y : a.y + a.height - f.height;
    y = clamp(y, padding, v.height - padding - f.height);
  }
  const maxWidth = Math.max(0, vertical(side) ? v.width - 2 * padding : room[side]);
  const maxHeight = Math.max(0, vertical(side) ? room[side] : v.height - 2 * padding);
  return { x, y, side, flipped: side !== wanted, maxWidth, maxHeight };
}

/** Clamp into [min, max]; when the range is empty (the surface is wider than the room), the start wins. */
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(n, max));

export interface KxAutoPlaceOptions {
  side: () => KxSide;
  align: () => KxAlign;
  offset: () => number;
}

/** Viewport inset kept clear around a floating surface. */
export const VIEWPORT_PADDING = 8;

/**
 * Position `floating` against `anchor` now, and again whenever either could have moved: the window resizes,
 * anything scrolls (one capturing listener catches every scroll container), or either element changes size.
 * Returns the function that removes every listener and observer it added.
 */
export function autoPlace(anchor: HTMLElement, floating: HTMLElement, o: KxAutoPlaceOptions): () => void {
  const view = floating.ownerDocument.defaultView!;
  let frame = 0;
  const place = () => {
    frame = 0;
    if (!anchor.isConnected || !floating.isConnected) return;
    const viewport = { width: floating.ownerDocument.documentElement.clientWidth, height: view.innerHeight };
    const rtl = view.getComputedStyle(anchor).direction === 'rtl';
    const a = anchor.getBoundingClientRect();
    const input = (f: { width: number; height: number }): KxPlacementInput => ({
      anchor: { x: a.x, y: a.y, width: a.width, height: a.height },
      floating: f,
      viewport,
      side: o.side(),
      align: o.align(),
      offset: o.offset(),
      padding: VIEWPORT_PADDING,
      rtl,
    });
    // Two passes: the first publishes the room so the surface can size itself to it, the second places the
    // size it then has.
    const size = () => ({ width: floating.offsetWidth, height: floating.offsetHeight });
    const first = computePlacement(input(size()));
    write(floating, first);
    const final = computePlacement(input(size()));
    write(floating, final);
  };
  const schedule = () => {
    if (!frame) frame = view.requestAnimationFrame(place);
  };
  place();
  view.addEventListener('resize', schedule);
  floating.ownerDocument.addEventListener('scroll', schedule, true);
  // through the element's own window, never the global: the package must load where there is no browser
  const Observer = (view as Window & typeof globalThis).ResizeObserver;
  const observer = typeof Observer === 'function' ? new Observer(schedule) : null;
  observer?.observe(anchor);
  observer?.observe(floating);
  return () => {
    if (frame) view.cancelAnimationFrame(frame);
    view.removeEventListener('resize', schedule);
    floating.ownerDocument.removeEventListener('scroll', schedule, true);
    observer?.disconnect();
  };
}

function write(el: HTMLElement, p: KxPlacement): void {
  // Physical coordinates are the output of the computation above, not authored layout: the logical intent
  // (start, end) was resolved against the anchor's own direction before these numbers existed.
  el.style.setProperty('--kx-available-width', `${p.maxWidth}px`);
  el.style.setProperty('--kx-available-height', `${p.maxHeight}px`);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
  el.setAttribute('data-placement', p.side);
}
