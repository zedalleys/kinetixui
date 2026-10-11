import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KxRovingFocus,
  KxTypeahead,
  inlineKey,
  isRtl,
  isTypeaheadKey,
  moveForKey,
  moveIndex,
  typeaheadMatch,
  type KxRovingItem,
} from './collection';

// The collection core's rules as logic. Focus moving on a real screen, direction from a real stylesheet and
// the menus built on these rules are measured in Chromium by scripts/angular-collections.mjs.

const none = () => false;
const disabledAt =
  (...indexes: number[]) =>
  (i: number) =>
    indexes.includes(i);

describe('moveIndex', () => {
  it('moves next and previous, and stops at the ends when it does not wrap', () => {
    expect(moveIndex(4, 0, 'next', none, false)).toBe(1);
    expect(moveIndex(4, 3, 'next', none, false)).toBe(-1);
    expect(moveIndex(4, 0, 'previous', none, false)).toBe(-1);
    expect(moveIndex(4, 2, 'previous', none, false)).toBe(1);
  });

  it('wraps when asked to', () => {
    expect(moveIndex(4, 3, 'next', none, true)).toBe(0);
    expect(moveIndex(4, 0, 'previous', none, true)).toBe(3);
  });

  it('skips disabled items in every move', () => {
    const off = disabledAt(0, 2, 3);
    expect(moveIndex(5, 1, 'next', off, false)).toBe(4);
    expect(moveIndex(5, 4, 'previous', off, false)).toBe(1);
    expect(moveIndex(5, -1, 'first', off, false)).toBe(1);
    expect(moveIndex(5, -1, 'last', disabledAt(4), false)).toBe(3);
    // the only enabled items are behind a non-wrapping end: nowhere to go
    expect(moveIndex(5, 4, 'next', off, false)).toBe(-1);
    expect(moveIndex(5, 4, 'next', off, true)).toBe(1);
  });

  it('starts from the ends when nothing is current', () => {
    expect(moveIndex(3, -1, 'next', none, false)).toBe(0);
    expect(moveIndex(3, -1, 'previous', none, false)).toBe(2);
  });

  it('answers -1 for an empty or all-disabled list, and never loops forever', () => {
    expect(moveIndex(0, -1, 'first', none, true)).toBe(-1);
    expect(moveIndex(3, 1, 'next', () => true, true)).toBe(-1);
    expect(moveIndex(1, 0, 'next', none, true)).toBe(-1);
  });
});

describe('keys and direction', () => {
  it('maps vertical keys, and Home / End on either axis', () => {
    expect(moveForKey('ArrowDown', 'vertical', false)).toBe('next');
    expect(moveForKey('ArrowUp', 'vertical', true)).toBe('previous');
    expect(moveForKey('ArrowRight', 'vertical', false)).toBeNull();
    expect(moveForKey('Home', 'horizontal', true)).toBe('first');
    expect(moveForKey('End', 'vertical', false)).toBe('last');
  });

  it('mirrors the horizontal arrows in right-to-left', () => {
    expect(moveForKey('ArrowRight', 'horizontal', false)).toBe('next');
    expect(moveForKey('ArrowRight', 'horizontal', true)).toBe('previous');
    expect(moveForKey('ArrowLeft', 'horizontal', true)).toBe('next');
    expect(inlineKey('ArrowRight', false)).toBe('forward');
    expect(inlineKey('ArrowLeft', true)).toBe('forward');
    expect(inlineKey('ArrowLeft', false)).toBe('backward');
    expect(inlineKey('ArrowDown', true)).toBeNull();
  });

  it('reads the nearest [dir] first, in all four page/region cases', () => {
    const page = document.createElement('div');
    page.innerHTML = `
      <div dir="ltr"><span id="a"></span><div dir="rtl"><span id="b"></span></div></div>
      <div dir="rtl"><span id="c"></span><div dir="ltr"><span id="d"></span></div></div>`;
    document.body.append(page);
    expect(isRtl(page.querySelector('#a')!)).toBe(false);
    expect(isRtl(page.querySelector('#b')!)).toBe(true);
    expect(isRtl(page.querySelector('#c')!)).toBe(true);
    expect(isRtl(page.querySelector('#d')!)).toBe(false);
    page.remove();
  });

  it('reads computed direction through the element’s own window when no [dir] says', () => {
    const el = document.createElement('span');
    document.body.append(el);
    const spy = vi.spyOn(document.defaultView!, 'getComputedStyle').mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);
    expect(isRtl(el)).toBe(true);
    expect(spy).toHaveBeenCalledWith(el);
    spy.mockRestore();
    el.remove();
  });

  it('takes printable keys without modifiers for typeahead, and leaves Space to activation', () => {
    const k = (key: string, mods: Partial<KeyboardEvent> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods });
    expect(isTypeaheadKey(k('a'))).toBe(true);
    expect(isTypeaheadKey(k('É'))).toBe(true);
    expect(isTypeaheadKey(k(' '))).toBe(false);
    expect(isTypeaheadKey(k('ArrowDown'))).toBe(false);
    expect(isTypeaheadKey(k('a', { ctrlKey: true }))).toBe(false);
    expect(isTypeaheadKey(k('a', { metaKey: true }))).toBe(false);
  });
});

describe('typeaheadMatch', () => {
  const labels = ['Copy', 'Cut', 'Delete', 'Duplicate', 'Download', 'Paste'];

  it('matches a case-insensitive prefix after the current item', () => {
    expect(typeaheadMatch(labels, none, -1, 'd')).toBe(2);
    expect(typeaheadMatch(labels, none, 2, 'd')).toBe(3);
    expect(typeaheadMatch(labels, none, 4, 'd')).toBe(2);
    expect(typeaheadMatch(labels, none, 0, 'P')).toBe(5);
  });

  it('keeps the current item while a longer search still matches it', () => {
    expect(typeaheadMatch(labels, none, 3, 'du')).toBe(-1);
    expect(typeaheadMatch(labels, none, 2, 'du')).toBe(3);
    expect(typeaheadMatch(labels, none, 0, 'cu')).toBe(1);
  });

  it('cycles on a repeated character', () => {
    expect(typeaheadMatch(labels, none, 2, 'dd')).toBe(3);
    expect(typeaheadMatch(labels, none, 3, 'ddd')).toBe(4);
  });

  it('never matches a disabled item', () => {
    expect(typeaheadMatch(labels, disabledAt(2, 3), -1, 'd')).toBe(4);
    expect(typeaheadMatch(labels, disabledAt(2, 3, 4), -1, 'd')).toBe(-1);
    expect(typeaheadMatch(labels, disabledAt(3), 2, 'du')).toBe(-1);
  });

  it('finds nothing for an empty search or no match', () => {
    expect(typeaheadMatch(labels, none, 0, '')).toBe(-1);
    expect(typeaheadMatch(labels, none, 0, 'z')).toBe(-1);
  });
});

describe('KxTypeahead', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('collects characters typed in quick succession and resets after 500ms of quiet', () => {
    const t = new KxTypeahead();
    expect(t.push('d')).toBe('d');
    vi.advanceTimersByTime(300);
    expect(t.push('u')).toBe('du');
    vi.advanceTimersByTime(499);
    expect(t.search).toBe('du');
    vi.advanceTimersByTime(1);
    expect(t.search).toBe('');
    expect(t.push('p')).toBe('p');
  });

  it('clears at once on demand', () => {
    const t = new KxTypeahead();
    t.push('a');
    t.clear();
    expect(t.search).toBe('');
    vi.advanceTimersByTime(1000);
    expect(t.push('b')).toBe('b');
  });
});

describe('KxRovingFocus', () => {
  const make = (n: number, disabled: number[] = []) => {
    const items: (KxRovingItem & { label: string })[] = Array.from({ length: n }, (_, i) => {
      const el = document.createElement('button');
      el.textContent = `Item ${i}`;
      document.body.append(el);
      return { el, label: el.textContent, isDisabled: () => disabled.includes(i) };
    });
    return { items, roving: new KxRovingFocus(() => items) };
  };
  afterEach(() => document.body.replaceChildren());

  it('gives exactly one item tabindex 0: the first enabled one until something is active', () => {
    const { items, roving } = make(4, [0]);
    expect(items.map((i) => roving.tabIndex(i))).toEqual([-1, 0, -1, -1]);
    roving.focus(items[2]!);
    expect(items.map((i) => roving.tabIndex(i))).toEqual([-1, -1, 0, -1]);
    expect(document.activeElement).toBe(items[2]!.el);
  });

  it('moves from the active item, honouring wrap', () => {
    const { items, roving } = make(3);
    roving.focus(items[2]!);
    expect(roving.target('next', false)).toBeNull();
    expect(roving.target('next', true)).toBe(items[0]);
    expect(roving.target('first', false)).toBe(items[0]);
    expect(roving.target('last', false, items[0])).toBe(items[2]);
  });

  it('matches typeahead over the items’ text from the active item', () => {
    const { items, roving } = make(3);
    items[1]!.label = 'Rename';
    roving.focus(items[0]!);
    expect(roving.match('r', (i) => (i as { label: string }).label)).toBe(items[1]);
  });
});
