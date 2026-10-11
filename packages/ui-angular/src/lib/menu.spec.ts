import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  KxContextMenu,
  KxContextMenuContent,
  KxContextMenuTrigger,
  KxDropdownMenu,
  KxDropdownMenuContent,
  KxDropdownMenuTrigger,
  KxMenuCheckboxItem,
  KxMenuGroup,
  KxMenuItem,
  KxMenuLabel,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubContent,
  KxMenuSubTrigger,
  KxMenubar,
  KxMenubarContent,
  KxMenubarMenu,
  KxMenubarTrigger,
} from './menu';
import { autoPlace } from './overlay';

// The menus' semantics and their keyboard rules, in jsdom: roles, names, states, which item a key lands on.
// jsdom has no layout, no top layer and no real focus visibility, so placement, the pointer, RTL on a real
// stylesheet, large text, motion, contrast and axe are measured in Chromium by scripts/angular-collections.mjs
// and scripts/menu-visual.mjs. Nothing here is browser evidence.

const PARTS = [
  KxContextMenu,
  KxContextMenuContent,
  KxContextMenuTrigger,
  KxDropdownMenu,
  KxDropdownMenuContent,
  KxDropdownMenuTrigger,
  KxMenuCheckboxItem,
  KxMenuGroup,
  KxMenuItem,
  KxMenuLabel,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubContent,
  KxMenuSubTrigger,
  KxMenubar,
  KxMenubarContent,
  KxMenubarMenu,
  KxMenubarTrigger,
];

function host<T extends object>(template: string, state: T = {} as T) {
  @Component({ template, imports: PARTS })
  class Host {}
  Object.assign(Host.prototype, state);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  document.body.append(fixture.nativeElement);
  return { fixture, el: fixture.nativeElement as HTMLElement, state: fixture.componentInstance as unknown as T };
}
const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};
const key = (target: Element, k: string, extra: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
const focused = () => document.activeElement as HTMLElement | null;
const label = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

afterEach(() => document.body.replaceChildren());

// jsdom lays nothing out, so every element reads as unrendered and focus would never be restored anywhere.
// Treat connected elements as rendered here; whether the real trigger is visible is the browser gate's job.
type Visible = { checkVisibility?: () => boolean };
const proto = HTMLElement.prototype as unknown as Visible;
const original = proto.checkVisibility;
beforeAll(() => {
  proto.checkVisibility = () => true;
});
afterAll(() => {
  proto.checkVisibility = original;
});

const DROPDOWN = `
  <kx-dropdown-menu [(open)]="open">
    <button kxDropdownMenuTrigger>Options</button>
    <kx-dropdown-menu-content>
      <kx-menu-group>
        <kx-menu-label>Edit</kx-menu-label>
        <button kxMenuItem (select)="picked.set('copy')">Copy <kx-menu-shortcut>⌘C</kx-menu-shortcut></button>
        <button kxMenuItem disabled (select)="picked.set('cut')">Cut</button>
        <button kxMenuItem (select)="picked.set('duplicate')">Duplicate</button>
      </kx-menu-group>
      <kx-menu-separator />
      <kx-menu-checkbox-item [(checked)]="grid">Show grid</kx-menu-checkbox-item>
      <kx-menu-radio-group [(value)]="density">
        <kx-menu-label>Density</kx-menu-label>
        <kx-menu-radio-item value="compact">Compact</kx-menu-radio-item>
        <kx-menu-radio-item value="comfortable">Comfortable</kx-menu-radio-item>
      </kx-menu-radio-group>
      <kx-menu-sub>
        <button kxMenuSubTrigger>Share</button>
        <kx-menu-sub-content>
          <button kxMenuItem>Email link</button>
          <button kxMenuItem>Copy link</button>
        </kx-menu-sub-content>
      </kx-menu-sub>
      <button kxMenuItem variant="destructive" (select)="picked.set('delete')">Delete</button>
    </kx-dropdown-menu-content>
  </kx-dropdown-menu>`;
const dropdownState = () => ({ open: signal(false), picked: signal(''), grid: signal(false), density: signal('compact') });

describe('dropdown menu', () => {
  it('wires the trigger to a menu named by it, closed until opened', async () => {
    const { fixture, el } = host(DROPDOWN, dropdownState());
    await settle(fixture);
    const trigger = el.querySelector('button[kxDropdownMenuTrigger]')!;
    const menu = el.querySelector('kx-dropdown-menu-content')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(menu.getAttribute('aria-orientation')).toBe('vertical');
    expect(menu.getAttribute('data-state')).toBe('closed');
  });

  it('gives every part its role, and structure no meaningless wrapper', async () => {
    const { fixture, el } = host(DROPDOWN, dropdownState());
    await settle(fixture);
    const roles = (sel: string) => [...el.querySelectorAll(sel)].map((e) => e.getAttribute('role'));
    expect(roles('[kxMenuItem]')).toEqual(['menuitem', 'menuitem', 'menuitem', 'menuitem', 'menuitem', 'menuitem']);
    expect(roles('kx-menu-checkbox-item')).toEqual(['menuitemcheckbox']);
    expect(roles('kx-menu-radio-item')).toEqual(['menuitemradio', 'menuitemradio']);
    expect(roles('kx-menu-separator')).toEqual(['separator']);
    expect(roles('kx-menu-group, kx-menu-radio-group')).toEqual(['group', 'group']);
    const group = el.querySelector('kx-menu-group')!;
    expect(group.getAttribute('aria-labelledby')).toBe(group.querySelector('kx-menu-label')!.id);
    expect(el.querySelector('kx-menu-sub')!.getAttribute('role')).toBeNull();
    // a disabled item is announced as unavailable but stays focusable-by-script (aria-disabled, not disabled)
    const cut = [...el.querySelectorAll('[kxMenuItem]')].find((b) => label(b) === 'Cut')!;
    expect(cut.getAttribute('aria-disabled')).toBe('true');
    expect(cut.hasAttribute('disabled')).toBe(false);
  });

  it('opens from the keyboard on the first item, and ArrowUp on the last', async () => {
    const { fixture, el, state } = host(DROPDOWN, dropdownState());
    const trigger = el.querySelector<HTMLElement>('button[kxDropdownMenuTrigger]')!;
    key(trigger, 'ArrowDown');
    await settle(fixture);
    expect(state.open()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(label(focused())).toBe('Copy ⌘C');
    expect(focused()!.getAttribute('data-highlighted')).toBe('keyboard');
    key(focused()!, 'Escape');
    await settle(fixture);
    expect(state.open()).toBe(false);
    expect(focused()).toBe(trigger);
    key(trigger, 'ArrowUp');
    await settle(fixture);
    expect(label(focused())).toBe('Delete');
  });

  it('walks down without wrapping, skipping the disabled item, and Home / End jump', async () => {
    const { fixture, el } = host(DROPDOWN, dropdownState());
    key(el.querySelector('button[kxDropdownMenuTrigger]')!, 'Enter');
    await settle(fixture);
    const walk: string[] = [];
    for (let i = 0; i < 9; i++) {
      walk.push(label(focused())!);
      key(focused()!, 'ArrowDown');
    }
    expect(walk).toEqual(['Copy ⌘C', 'Duplicate', 'Show grid', 'Compact', 'Comfortable', 'Share›', 'Delete', 'Delete', 'Delete']);
    key(focused()!, 'Home');
    expect(label(focused())).toBe('Copy ⌘C');
    key(focused()!, 'ArrowUp');
    expect(label(focused())).toBe('Copy ⌘C');
    key(focused()!, 'End');
    expect(label(focused())).toBe('Delete');
  });

  it('keeps exactly one item in the tab order', async () => {
    const { fixture, el } = host(DROPDOWN, dropdownState());
    key(el.querySelector('button[kxDropdownMenuTrigger]')!, 'Enter');
    await settle(fixture);
    key(focused()!, 'ArrowDown');
    await settle(fixture);
    const stops = [...el.querySelectorAll('kx-dropdown-menu-content [tabindex="0"]')].filter((e) => e.closest('[role="menu"]') === el.querySelector('kx-dropdown-menu-content'));
    expect(stops.map(label)).toEqual(['Duplicate']);
  });

  it('typeahead skips disabled items, leaves the shortcut out, and cycles on repeats', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, el } = host(DROPDOWN, dropdownState());
      key(el.querySelector('button[kxDropdownMenuTrigger]')!, 'Enter');
      await settle(fixture);
      key(focused()!, 'c');
      expect(label(focused())).toBe('Compact'); // "Cut" is disabled; from "Copy" the next C is "Compact"
      key(focused()!, 'c');
      expect(label(focused())).toBe('Comfortable');
      vi.advanceTimersByTime(600);
      key(focused()!, 'd');
      key(focused()!, 'e');
      expect(label(focused())).toBe('Delete');
    } finally {
      vi.useRealTimers();
    }
  });

  it('activating an item emits, closes the tree and returns focus to the trigger; a disabled one does nothing', async () => {
    const { fixture, el, state } = host(DROPDOWN, dropdownState());
    const trigger = el.querySelector<HTMLElement>('button[kxDropdownMenuTrigger]')!;
    key(trigger, 'Enter');
    await settle(fixture);
    const cut = [...el.querySelectorAll<HTMLElement>('[kxMenuItem]')].find((b) => label(b) === 'Cut')!;
    cut.click();
    await settle(fixture);
    expect(state.picked()).toBe('');
    expect(state.open()).toBe(true);
    key(focused()!, 'ArrowDown');
    key(focused()!, 'Enter');
    await settle(fixture);
    expect(state.picked()).toBe('duplicate');
    expect(state.open()).toBe(false);
    expect(focused()).toBe(trigger);
  });

  it('updates aria-checked on checkbox and radio items', async () => {
    const { fixture, el, state } = host(DROPDOWN, dropdownState());
    await settle(fixture);
    const box = el.querySelector<HTMLElement>('kx-menu-checkbox-item')!;
    const [compact, comfy] = [...el.querySelectorAll<HTMLElement>('kx-menu-radio-item')];
    expect(box.getAttribute('aria-checked')).toBe('false');
    expect(compact!.getAttribute('aria-checked')).toBe('true');
    state.open.set(true);
    await settle(fixture);
    box.click();
    await settle(fixture);
    expect(state.grid()).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('true');
    state.open.set(true);
    await settle(fixture);
    comfy!.click();
    await settle(fixture);
    expect(state.density()).toBe('comfortable');
    expect(comfy!.getAttribute('aria-checked')).toBe('true');
    expect(compact!.getAttribute('aria-checked')).toBe('false');
  });

  it('Tab closes the tree without taking the key', async () => {
    const { fixture, el, state } = host(DROPDOWN, dropdownState());
    key(el.querySelector('button[kxDropdownMenuTrigger]')!, 'Enter');
    await settle(fixture);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    focused()!.dispatchEvent(tab);
    await settle(fixture);
    expect(tab.defaultPrevented).toBe(false);
    expect(state.open()).toBe(false);
  });
});

describe('submenus', () => {
  it('nest in the parent menu’s DOM and are wired to their trigger', async () => {
    const { fixture, el } = host(DROPDOWN, dropdownState());
    await settle(fixture);
    const parent = el.querySelector('kx-dropdown-menu-content')!;
    const sub = el.querySelector('kx-menu-sub-content')!;
    const subTrigger = el.querySelector('button[kxMenuSubTrigger]')!;
    expect(parent.contains(sub)).toBe(true);
    expect(sub.getAttribute('role')).toBe('menu');
    expect(sub.getAttribute('aria-labelledby')).toBe(subTrigger.id);
    expect(subTrigger.getAttribute('role')).toBe('menuitem');
    expect(subTrigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(subTrigger.getAttribute('aria-controls')).toBe(sub.id);
    expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('open on the inline-end arrow (mirrored in RTL), close alone on the inline-start arrow and Escape', async () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const { fixture, el, state } = host(`<div dir="${dir}">${DROPDOWN}</div>`, dropdownState());
      const [into, out] = dir === 'ltr' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowLeft', 'ArrowRight'];
      key(el.querySelector('button[kxDropdownMenuTrigger]')!, 'ArrowUp');
      await settle(fixture);
      key(focused()!, 'ArrowUp');
      const subTrigger = focused()!;
      expect(label(subTrigger)).toBe('Share›');
      key(subTrigger, out);
      await settle(fixture);
      expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
      key(subTrigger, into);
      await settle(fixture);
      expect(subTrigger.getAttribute('aria-expanded')).toBe('true');
      expect(label(focused())).toBe('Email link');
      key(focused()!, out);
      await settle(fixture);
      expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
      expect(focused()).toBe(subTrigger);
      expect(state.open()).toBe(true);
      key(subTrigger, 'Enter');
      await settle(fixture);
      expect(label(focused())).toBe('Email link');
      // Escape closes the submenu only; the stack's listener is on the document
      key(focused()!, 'Escape');
      await settle(fixture);
      expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
      expect(focused()).toBe(subTrigger);
      expect(state.open()).toBe(true);
      document.body.replaceChildren();
    }
  });

  it('activating a submenu item closes the whole tree', async () => {
    const { fixture, el, state } = host(DROPDOWN, dropdownState());
    const trigger = el.querySelector<HTMLElement>('button[kxDropdownMenuTrigger]')!;
    key(trigger, 'ArrowUp');
    await settle(fixture);
    key(focused()!, 'ArrowUp');
    key(focused()!, 'ArrowRight');
    await settle(fixture);
    key(focused()!, 'Enter');
    await settle(fixture);
    expect(state.open()).toBe(false);
    expect(el.querySelector('button[kxMenuSubTrigger]')!.getAttribute('aria-expanded')).toBe('false');
    expect(focused()).toBe(trigger);
  });
});

describe('context menu', () => {
  const CONTEXT = `
    <kx-context-menu [(open)]="open">
      <div kxContextMenuTrigger tabindex="0" aria-label="Canvas">Canvas <button id="inner">Shape</button></div>
      <kx-context-menu-content label="Canvas actions">
        <button kxMenuItem>Paste</button>
        <button kxMenuItem>Select all</button>
      </kx-context-menu-content>
    </kx-context-menu>`;

  it('opens at the pointer and holds back the browser’s menu', async () => {
    const { fixture, el, state } = host(CONTEXT, { open: signal(false) });
    const region = el.querySelector<HTMLElement>('[kxContextMenuTrigger]')!;
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 80, button: 2 });
    region.dispatchEvent(event);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(state.open()).toBe(true);
    const menu = el.querySelector('kx-context-menu-content')!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('Canvas actions');
    expect(menu.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('opens from the ContextMenu key and Shift+F10 on its first item, and gives focus back on Escape', async () => {
    for (const press of [{ key: 'ContextMenu' }, { key: 'F10', shiftKey: true }]) {
      const { fixture, el, state } = host(CONTEXT, { open: signal(false) });
      const inner = el.querySelector<HTMLElement>('#inner')!;
      inner.focus();
      const ok = key(inner, press.key, { shiftKey: press.shiftKey });
      await settle(fixture);
      expect(ok).toBe(false); // default prevented
      expect(state.open()).toBe(true);
      expect(label(focused())).toBe('Paste');
      key(focused()!, 'Escape');
      await settle(fixture);
      expect(state.open()).toBe(false);
      expect(focused()).toBe(inner);
      document.body.replaceChildren();
    }
  });
});

describe('menubar', () => {
  const BAR = `
    <kx-menubar aria-label="Editor" [(value)]="value">
      <kx-menubar-menu value="file">
        <button kxMenubarTrigger>File</button>
        <kx-menubar-content><button kxMenuItem>New</button><button kxMenuItem>Open</button></kx-menubar-content>
      </kx-menubar-menu>
      <kx-menubar-menu value="edit">
        <button kxMenubarTrigger>Edit</button>
        <kx-menubar-content><button kxMenuItem>Undo</button><button kxMenuItem>Redo</button></kx-menubar-content>
      </kx-menubar-menu>
      <kx-menubar-menu value="view">
        <button kxMenubarTrigger>View</button>
        <kx-menubar-content><button kxMenuItem>Zoom in</button></kx-menubar-content>
      </kx-menubar-menu>
    </kx-menubar>`;

  it('is a menubar of menuitem triggers with one tab stop', async () => {
    const { fixture, el } = host(BAR, { value: signal<string | null>(null) });
    await settle(fixture);
    expect(el.querySelector('kx-menubar')!.getAttribute('role')).toBe('menubar');
    const triggers = [...el.querySelectorAll('button[kxMenubarTrigger]')];
    expect(triggers.map((t) => t.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem']);
    expect(triggers.map((t) => t.getAttribute('aria-haspopup'))).toEqual(['menu', 'menu', 'menu']);
    expect(triggers.map((t) => t.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
    expect(triggers.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('moves between triggers with wrap, mirrored in RTL, and Home / End', async () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const { fixture, el } = host(`<div dir="${dir}">${BAR}</div>`, { value: signal<string | null>(null) });
      await settle(fixture);
      const [file, , view] = [...el.querySelectorAll<HTMLElement>('button[kxMenubarTrigger]')];
      const next = dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft';
      const prev = dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight';
      file!.focus();
      key(file!, prev);
      expect(focused()).toBe(view);
      key(view!, next);
      expect(focused()).toBe(file);
      key(file!, 'End');
      expect(focused()).toBe(view);
      key(view!, 'Home');
      expect(focused()).toBe(file);
      document.body.replaceChildren();
    }
  });

  it('opens on ArrowDown (first) and ArrowUp (last); with a menu open the inline arrows open the neighbour', async () => {
    const { fixture, el, state } = host(BAR, { value: signal<string | null>(null) });
    await settle(fixture);
    const [file, edit] = [...el.querySelectorAll<HTMLElement>('button[kxMenubarTrigger]')];
    file!.focus();
    key(file!, 'ArrowUp');
    await settle(fixture);
    expect(state.value()).toBe('file');
    expect(label(focused())).toBe('Open');
    key(focused()!, 'ArrowRight');
    await settle(fixture);
    expect(state.value()).toBe('edit');
    expect(edit!.getAttribute('aria-expanded')).toBe('true');
    expect(file!.getAttribute('aria-expanded')).toBe('false');
    expect(label(focused())).toBe('Undo');
    key(focused()!, 'Escape');
    await settle(fixture);
    expect(state.value()).toBeNull();
    expect(focused()).toBe(edit);
  });
});

describe('caller ids', () => {
  it('keeps a caller’s trigger and content ids and wires to them', async () => {
    const { fixture, el } = host(`
      <kx-dropdown-menu>
        <button kxDropdownMenuTrigger id="my-trigger">Options</button>
        <kx-dropdown-menu-content id="my-menu"><button kxMenuItem>One</button></kx-dropdown-menu-content>
      </kx-dropdown-menu>`);
    await settle(fixture);
    const trigger = el.querySelector('button')!;
    expect(trigger.id).toBe('my-trigger');
    expect(trigger.getAttribute('aria-controls')).toBe('my-menu');
    expect(el.querySelector('kx-dropdown-menu-content')!.getAttribute('aria-labelledby')).toBe('my-trigger');
  });
});

describe('autoPlace anchors', () => {
  // jsdom's root box is 0 wide; give the viewport a size so the placement is not shifted into a 0px screen
  beforeAll(() => Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1000 }));
  afterAll(() => Reflect.deleteProperty(document.documentElement, 'clientWidth'));
  const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;

  it('an element anchor is measured and observed as before', () => {
    const anchor = document.createElement('button');
    const floating = document.createElement('div');
    document.body.append(anchor, floating);
    anchor.getBoundingClientRect = () => rect(100, 50, 80, 30);
    const observed: Element[] = [];
    const view = document.defaultView as Window & { ResizeObserver?: unknown };
    const original = view.ResizeObserver;
    view.ResizeObserver = class {
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
    };
    try {
      const release = autoPlace(anchor, floating, { side: () => 'bottom', align: () => 'start', offset: () => 4 });
      expect(floating.style.left).toBe('100px');
      expect(floating.style.top).toBe('84px');
      expect(floating.getAttribute('data-placement')).toBe('bottom');
      expect(observed).toEqual([anchor, floating]);
      release();
    } finally {
      view.ResizeObserver = original;
    }
  });

  it('a virtual anchor is measured through its own box and takes direction from its context element', () => {
    const context = document.createElement('div');
    context.dir = 'rtl';
    context.style.direction = 'rtl';
    const floating = document.createElement('div');
    document.body.append(context, floating);
    const release = autoPlace({ getBoundingClientRect: () => ({ x: 300, y: 200, width: 0, height: 0 }), contextElement: context }, floating, {
      side: () => 'bottom',
      align: () => 'start',
      offset: () => 2,
    });
    // a zero-width floating in jsdom: in RTL its inline-start (right) edge sits on the point
    expect(floating.style.left).toBe('300px');
    expect(floating.style.top).toBe('202px');
    release();
  });
});
