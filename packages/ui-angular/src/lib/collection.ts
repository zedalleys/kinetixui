import { computed, signal } from '@angular/core';

/**
 * The collection core: how a set of items is walked by keyboard. Nothing in this file is exported from
 * `public-api.ts` — it is infrastructure, and Wave C2a's menus are its first consumers (menu.ts). Tabs,
 * accordion and the code block's tabs still carry their own copies of these rules; moving them onto this
 * file is a later change that must show no behaviour change, not part of the wave that introduced it.
 *
 * Most of it is pure — indexes and strings in, an index out — so the rules are unit-tested as logic
 * (collection.spec.ts) and the browser gates measure what only a browser can: focus, layout and direction.
 *
 * ── Registration ───────────────────────────────────────────────────────────
 *
 * There is no registry here. A collection asks for its items the way the accordion does:
 * `contentChildren(TOKEN, { descendants: true })`, which returns them in document order, then keeps only the
 * ones it owns (`item.owner === this`). The owner filter is what makes nesting safe: a submenu's items are
 * descendants of the parent menu too, and without the filter ArrowDown in the parent would walk into them.
 *
 * ── Navigation ─────────────────────────────────────────────────────────────
 *
 *   moveIndex     next / previous / first / last over a list, skipping disabled items, wrapping or not.
 *                 Wrapping is the caller's policy, never a default: a vertical menu STOPS at its ends (React's
 *                 tested contract, components-keyboard.test.tsx, "Radix menus don't wrap by default") and a
 *                 menubar's triggers WRAP (APG menubar). The two consumers pass different answers on purpose.
 *   moveForKey    which move a key asks for, by orientation. Horizontal arrows are resolved against
 *                 direction: in a right-to-left context ArrowLeft is "next".
 *   inlineKey     the same resolution for the two keys that mean "into" and "out of" along the inline axis
 *                 (a submenu opens toward the inline end, so its open key is ArrowRight in LTR, ArrowLeft in RTL).
 *   isRtl         the one direction rule: the nearest `[dir]`, otherwise the computed style, read through the
 *                 element's own window (tabs.ts established it; this is its shared copy).
 *
 * ── Typeahead ──────────────────────────────────────────────────────────────
 *
 * A printable key adds to a search buffer that clears ~500ms after the last key. The buffer is matched as a
 * case-insensitive prefix against the items' text, starting from the current item and wrapping, with disabled
 * items left out. A buffer of one repeated character ("ddd") cycles through the items starting with it
 * instead of searching for "ddd" — the way a native select and Radix behave.
 *
 * ── Roving focus ───────────────────────────────────────────────────────────
 *
 * One item holds `tabindex="0"`, every other item `-1`: the active one, or when nothing is active the first
 * enabled one. Moving focus moves the stop with it, so the collection is a single Tab stop and focus is where
 * the keyboard left it.
 */

export type KxOrientation = 'vertical' | 'horizontal';
export type KxMove = 'next' | 'previous' | 'first' | 'last';

/**
 * The index a move lands on, or -1 when there is nowhere to go (no enabled item, or the end of a list that
 * does not wrap). `from` is -1 when nothing is current: `next` then lands on the first enabled item and
 * `previous` on the last.
 */
export function moveIndex(count: number, from: number, move: KxMove, isDisabled: (index: number) => boolean, wrap: boolean): number {
  if (count <= 0) return -1;
  const enabled = (i: number) => i >= 0 && i < count && !isDisabled(i);
  if (move === 'first' || (move === 'next' && from < 0)) {
    for (let i = 0; i < count; i++) if (enabled(i)) return i;
    return -1;
  }
  if (move === 'last' || (move === 'previous' && from < 0)) {
    for (let i = count - 1; i >= 0; i--) if (enabled(i)) return i;
    return -1;
  }
  const step = move === 'next' ? 1 : -1;
  for (let n = 1; n < count + (wrap ? 0 : 1); n++) {
    let i = from + step * n;
    if (wrap) i = ((i % count) + count) % count;
    else if (i < 0 || i >= count) return -1;
    if (i === from) return -1;
    if (enabled(i)) return i;
  }
  return -1;
}

/** Which move a key asks for along `orientation`; null for a key this axis does not use. */
export function moveForKey(key: string, orientation: KxOrientation, rtl: boolean): KxMove | null {
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  if (orientation === 'vertical') return key === 'ArrowDown' ? 'next' : key === 'ArrowUp' ? 'previous' : null;
  const forward = inlineKey(key, rtl);
  return forward === 'forward' ? 'next' : forward === 'backward' ? 'previous' : null;
}

/** ArrowRight / ArrowLeft as the logical direction they point along the inline axis. */
export function inlineKey(key: string, rtl: boolean): 'forward' | 'backward' | null {
  if (key === 'ArrowRight') return rtl ? 'backward' : 'forward';
  if (key === 'ArrowLeft') return rtl ? 'forward' : 'backward';
  return null;
}

/**
 * Whether `el` reads right to left. The nearest `[dir]` decides first; when no ancestor states one, the
 * computed style through the element's OWN window does (never the global: the package must load where there
 * is no browser). The nearest `[dir]` is checked first because it is the markup's answer, and a DOM
 * implementation is free not to inherit computed direction — relying on it alone would make the behaviour
 * depend on the environment rather than on the page.
 */
export function isRtl(el: Element): boolean {
  const explicit = el.closest('[dir]')?.getAttribute('dir')?.toLowerCase();
  if (explicit === 'rtl' || explicit === 'ltr') return explicit === 'rtl';
  return el.ownerDocument.defaultView?.getComputedStyle(el).direction === 'rtl';
}

/** Whether a key press is a printable character a typeahead should take (no modifier but Shift). */
export function isTypeaheadKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * The item a typeahead search lands on, or -1. `labels[i]` is item i's text; disabled items are never
 * matched. A single-character search (and a repeated one, "ddd", which means the same) starts AFTER the current
 * item so repeated presses cycle; a longer search starts AT it, so typing more of the current item's name keeps
 * it. Returns -1 rather than the current index when the only match is the item already current.
 */
export function typeaheadMatch(labels: readonly string[], isDisabled: (index: number) => boolean, current: number, search: string): number {
  if (!search) return -1;
  const repeated = search.length > 1 && [...search].every((c) => c === search[0]);
  const needle = (repeated ? search[0]! : search).toLocaleLowerCase();
  const n = labels.length;
  const start = Math.max(current, 0);
  const skipCurrent = needle.length === 1;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (skipCurrent && i === current) continue;
    if (isDisabled(i)) continue;
    if (labels[i]!.trim().toLocaleLowerCase().startsWith(needle)) return i === current ? -1 : i;
  }
  return -1;
}

/** The typeahead buffer: characters typed in quick succession, cleared `resetMs` after the last one. */
export class KxTypeahead {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly resetMs = 500) {}

  /** Add a character and return the search so far. */
  push(char: string): string {
    this.buffer += char;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.clear(), this.resetMs);
    return this.buffer;
  }
  get search(): string {
    return this.buffer;
  }
  clear(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.buffer = '';
  }
}

/** An item a roving-focus collection can hold. */
export interface KxRovingItem {
  readonly el: HTMLElement;
  isDisabled(): boolean;
}

/**
 * Roving tabindex over a collection: exactly one item is a Tab stop. `items` is read on demand (a
 * `contentChildren` query, already filtered to the items this collection owns), so the stop follows items
 * being added, removed, disabled or enabled.
 */
export class KxRovingFocus<T extends KxRovingItem> {
  /** The item focus was last moved to (by keyboard, pointer or programmatically). */
  readonly active = signal<T | null>(null);
  constructor(private readonly items: () => readonly T[]) {}

  /** The item holding the single Tab stop: the active one while it is still present and enabled, else the first enabled. */
  readonly stop = computed<T | null>(() => {
    const items = this.items();
    const active = this.active();
    if (active && items.includes(active) && !active.isDisabled()) return active;
    return items.find((i) => !i.isDisabled()) ?? null;
  });

  tabIndex(item: T): 0 | -1 {
    return this.stop() === item ? 0 : -1;
  }

  /** The item a move lands on from `from` (the active item by default), or null. */
  target(move: KxMove, wrap: boolean, from: T | null = this.active()): T | null {
    const items = this.items();
    const at = from ? items.indexOf(from) : -1;
    const i = moveIndex(items.length, at, move, (k) => items[k]!.isDisabled(), wrap);
    return i === -1 ? null : items[i]!;
  }

  /** Make `item` the stop and move DOM focus to it. */
  focus(item: T | null): T | null {
    if (!item) return null;
    this.active.set(item);
    item.el.focus();
    return item;
  }

  /** The typeahead target for `search`, from the active item, over the items' text. */
  match(search: string, text: (item: T) => string): T | null {
    const items = this.items();
    const active = this.active();
    const i = typeaheadMatch(
      items.map(text),
      (k) => items[k]!.isDisabled(),
      active ? items.indexOf(active) : -1,
      search,
    );
    return i === -1 ? null : items[i]!;
  }
}
