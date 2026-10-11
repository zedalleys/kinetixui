import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  KxCommand,
  KxCommandEmpty,
  KxCommandGroup,
  KxCommandInput,
  KxCommandItem,
  KxCommandList,
  KxCommandSeparator,
  KxCommandShortcut,
} from './command';
import { KxMultiSelect } from './multi-select';
import { KxSelect, KxSelectContent, KxSelectGroup, KxSelectItem, KxSelectLabel, KxSelectSeparator, KxSelectTrigger, KxSelectValue } from './select';

// The listboxes' semantics and keyboard rules, in jsdom: roles, names, ids, which option is the active
// descendant, what the form control receives. jsdom has no layout, no top layer and no pointer, so placement,
// RTL, large text, motion, forced colours and axe are measured in Chromium by scripts/angular-collections.mjs.
// Nothing here is browser evidence.

const PARTS = [
  ReactiveFormsModule,
  KxSelect,
  KxSelectTrigger,
  KxSelectValue,
  KxSelectContent,
  KxSelectGroup,
  KxSelectLabel,
  KxSelectItem,
  KxSelectSeparator,
  KxCommand,
  KxCommandInput,
  KxCommandList,
  KxCommandEmpty,
  KxCommandGroup,
  KxCommandItem,
  KxCommandSeparator,
  KxCommandShortcut,
  KxMultiSelect,
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
const key = (target: Element, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const ad = (el: Element) => el.getAttribute('aria-activedescendant');
const textOf = (id: string | null) => (id ? document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() : null);

afterEach(() => document.body.replaceChildren());
// jsdom lays nothing out; treat connected elements as rendered (as menu.spec.ts does)
type Visible = { checkVisibility?: () => boolean };
const proto = HTMLElement.prototype as unknown as Visible;
const original = proto.checkVisibility;
beforeAll(() => {
  proto.checkVisibility = () => true;
});
afterAll(() => {
  proto.checkVisibility = original;
});

const SELECT = `
  <label for="fruit">Fruit</label>
  <kx-select [formControl]="fruit">
    <button kxSelectTrigger id="fruit"><kx-select-value placeholder="Pick one" /></button>
    <kx-select-content>
      <kx-select-group>
        <kx-select-label>Fruit</kx-select-label>
        <kx-select-item value="apple">Apple</kx-select-item>
        <kx-select-item value="banana" disabled>Banana</kx-select-item>
        <kx-select-item value="cherry">Cherry</kx-select-item>
      </kx-select-group>
      <kx-select-separator />
      <kx-select-item value="date">Date</kx-select-item>
    </kx-select-content>
  </kx-select>
  <kx-select [(value)]="other">
    <button kxSelectTrigger aria-label="Other"><kx-select-value /></button>
    <kx-select-content><kx-select-item value="x">X</kx-select-item></kx-select-content>
  </kx-select>`;
const selectState = () => ({ fruit: new FormControl<string | null>(null), other: signal<string | null>(null) });

describe('select', () => {
  it('is a combobox trigger controlling a listbox of options, with ids that never collide', async () => {
    const { fixture, el } = host(SELECT, selectState());
    await settle(fixture);
    const [trigger, other] = [...el.querySelectorAll('button[kxSelectTrigger]')];
    const content = el.querySelector('kx-select-content')!;
    expect(trigger!.getAttribute('role')).toBe('combobox');
    expect(trigger!.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger!.getAttribute('aria-expanded')).toBe('false');
    expect(trigger!.id).toBe('fruit');
    expect(trigger!.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('role')).toBe('listbox');
    expect(content.getAttribute('aria-label')).toBe('Fruit');
    expect(other!.id).toMatch(/^kx-select-\d+-trigger$/);
    expect([...el.querySelectorAll('kx-select-item')].map((o) => o.getAttribute('role'))).toEqual(['option', 'option', 'option', 'option', 'option']);
    expect(el.querySelector('kx-select-separator')!.getAttribute('aria-hidden')).toBe('true');
    const group = el.querySelector('kx-select-group')!;
    expect(group.getAttribute('aria-labelledby')).toBe(el.querySelector('kx-select-label')!.id);
    const ids = [...el.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(trigger!.getAttribute('data-placeholder')).toBe('');
    expect(trigger!.textContent!.trim()).toBe('Pick one');
  });

  it('opens on ArrowDown with focus staying on the trigger; the active descendant skips disabled options and stops at the ends', async () => {
    const { fixture, el } = host(SELECT, selectState());
    const trigger = el.querySelector<HTMLElement>('button[kxSelectTrigger]')!;
    trigger.focus();
    key(trigger, 'ArrowDown');
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(trigger);
    expect(textOf(ad(trigger))).toBe('Apple');
    const seen = [];
    for (let i = 0; i < 4; i++) {
      key(trigger, 'ArrowDown');
      await settle(fixture);
      seen.push(textOf(ad(trigger)));
    }
    expect(seen).toEqual(['Cherry', 'Date', 'Date', 'Date']);
    key(trigger, 'Home');
    await settle(fixture);
    expect(textOf(ad(trigger))).toBe('Apple');
    key(trigger, 'End');
    await settle(fixture);
    expect(textOf(ad(trigger))).toBe('Date');
  });

  it('chooses with Enter: the form control gets the value, the option alone is aria-selected, the id leaves the trigger', async () => {
    const { fixture, el, state } = host(SELECT, selectState());
    const trigger = el.querySelector<HTMLElement>('button[kxSelectTrigger]')!;
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown');
    await settle(fixture);
    key(trigger, 'Enter');
    await settle(fixture);
    expect(state.fruit.value).toBe('cherry');
    expect(state.fruit.dirty).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(ad(trigger)).toBeNull();
    expect(trigger.textContent!.trim()).toBe('Cherry');
    const selected = [...el.querySelectorAll('kx-select-item')].filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected.map((o) => o.textContent!.trim())).toEqual(['Cherry']);
    key(trigger, ' ');
    await settle(fixture);
    expect(textOf(ad(trigger))).toBe('Cherry');
  });

  it('writes from the form, reports touched on blur, and closes and stops when disabled', async () => {
    const { fixture, el, state } = host(SELECT, selectState());
    const trigger = el.querySelector<HTMLButtonElement>('button[kxSelectTrigger]')!;
    state.fruit.setValue('date');
    await settle(fixture);
    expect(trigger.textContent!.trim()).toBe('Date');
    expect(trigger.hasAttribute('data-placeholder')).toBe(false);
    trigger.dispatchEvent(new FocusEvent('blur'));
    expect(state.fruit.touched).toBe(true);
    key(trigger, 'ArrowDown');
    await settle(fixture);
    state.fruit.disable();
    await settle(fixture);
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opened through [(open)] starts on the chosen option; a bound [disabled] closes it', async () => {
    const { fixture, el, state } = host(
      `<kx-select [(value)]="v" [(open)]="open" [disabled]="off()">
        <button kxSelectTrigger aria-label="Pick"><kx-select-value /></button>
        <kx-select-content><kx-select-item value="a">A</kx-select-item><kx-select-item value="b">B</kx-select-item></kx-select-content>
      </kx-select>`,
      { v: signal<string | null>('b'), open: signal(false), off: signal(false) },
    );
    const trigger = el.querySelector('button')!;
    state.open.set(true);
    await settle(fixture);
    expect(textOf(ad(trigger))).toBe('B');
    key(trigger, 'ArrowUp');
    await settle(fixture);
    expect(textOf(ad(trigger))).toBe('A');
    state.off.set(true);
    await settle(fixture);
    expect(state.open()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  describe('a disabled field is never open', () => {
    const DISABLED = `
      <kx-select [(value)]="v" [(open)]="open" [disabled]="off()">
        <button kxSelectTrigger aria-label="Pick"><kx-select-value /></button>
        <kx-select-content><kx-select-item value="a">A</kx-select-item><kx-select-item value="b">B</kx-select-item></kx-select-content>
      </kx-select>
      <kx-select [formControl]="form" [(open)]="formOpen">
        <button kxSelectTrigger aria-label="Form pick"><kx-select-value /></button>
        <kx-select-content><kx-select-item value="a">A</kx-select-item><kx-select-item value="b">B</kx-select-item></kx-select-content>
      </kx-select>`;
    const state = () => ({
      v: signal<string | null>('b'),
      open: signal(false),
      off: signal(false),
      form: new FormControl<string | null>('b'),
      formOpen: signal(false),
    });
    const triggers = (el: HTMLElement) => el.querySelectorAll<HTMLButtonElement>('button[kxSelectTrigger]');
    const popups = (el: HTMLElement) => el.querySelectorAll<HTMLElement>('kx-select-content');

    it('open, then [disabled]: closes', async () => {
      const { fixture, el, state: s } = host(DISABLED, state());
      s.open.set(true);
      await settle(fixture);
      expect(triggers(el)[0]!.getAttribute('aria-expanded')).toBe('true');
      s.off.set(true);
      await settle(fixture);
      expect(s.open()).toBe(false);
      expect(triggers(el)[0]!.getAttribute('aria-expanded')).toBe('false');
    });

    it('[disabled], then an external [(open)]: it cannot stay open, names no option and keeps its value', async () => {
      const { fixture, el, state: s } = host(DISABLED, state());
      s.off.set(true);
      await settle(fixture);
      s.open.set(true);
      await settle(fixture);
      const trigger = triggers(el)[0]!;
      expect(s.open()).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(ad(trigger)).toBeNull();
      popups(el)[0]!.querySelectorAll<HTMLElement>('[role=option]')[0]!.click();
      key(trigger, 'Enter');
      await settle(fixture);
      expect(s.v()).toBe('b');
      expect(s.open()).toBe(false);
    });

    it('form-disabled, then an external [(open)]: the same', async () => {
      const { fixture, el, state: s } = host(DISABLED, state());
      s.form.disable();
      await settle(fixture);
      s.formOpen.set(true);
      await settle(fixture);
      const trigger = triggers(el)[1]!;
      expect(s.formOpen()).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(ad(trigger)).toBeNull();
      popups(el)[1]!.querySelectorAll<HTMLElement>('[role=option]')[0]!.click();
      await settle(fixture);
      expect(s.form.value).toBe('b');
    });

    it('re-enabled: opens normally again', async () => {
      const { fixture, el, state: s } = host(DISABLED, state());
      s.off.set(true);
      await settle(fixture);
      s.open.set(true);
      await settle(fixture);
      s.off.set(false);
      await settle(fixture);
      const trigger = triggers(el)[0]!;
      key(trigger, 'ArrowDown');
      await settle(fixture);
      expect(s.open()).toBe(true);
      expect(textOf(ad(trigger))).toBe('B');
      s.form.disable();
      s.form.enable();
      s.formOpen.set(true);
      await settle(fixture);
      expect(s.formOpen()).toBe(true);
      expect(triggers(el)[1]!.getAttribute('aria-expanded')).toBe('true');
    });
  });

  it('chooses by typeahead while closed, never a disabled option, and Escape and Tab choose nothing', async () => {
    const { fixture, el, state } = host(SELECT, selectState());
    const trigger = el.querySelector<HTMLElement>('button[kxSelectTrigger]')!;
    key(trigger, 'b');
    await settle(fixture);
    expect(state.fruit.value).toBeNull();
    // let the typeahead buffer lapse, so the next key starts a new search
    await new Promise((r) => setTimeout(r, 600));
    key(trigger, 'c');
    await settle(fixture);
    expect(state.fruit.value).toBe('cherry');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown');
    key(trigger, 'Escape');
    await settle(fixture);
    expect(state.fruit.value).toBe('cherry');
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown');
    key(trigger, 'Tab');
    await settle(fixture);
    expect(state.fruit.value).toBe('cherry');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('a press on a disabled option does nothing', async () => {
    const { fixture, el, state } = host(SELECT, selectState());
    const trigger = el.querySelector<HTMLElement>('button[kxSelectTrigger]')!;
    key(trigger, 'ArrowDown');
    await settle(fixture);
    const banana = [...el.querySelectorAll<HTMLElement>('kx-select-item')].find((o) => o.textContent!.includes('Banana'))!;
    expect(banana.getAttribute('aria-disabled')).toBe('true');
    banana.click();
    await settle(fixture);
    expect(state.fruit.value).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});

const COMMAND = `
  <kx-command label="Commands" [(search)]="search">
    <input kxCommandInput />
    <kx-command-list>
      <kx-command-empty>No results.</kx-command-empty>
      <kx-command-group heading="Suggestions">
        <kx-command-item value="calendar" (select)="ran.set($event)">Calendar</kx-command-item>
        <kx-command-item value="emoji" [keywords]="['smiley']" (select)="ran.set($event)">Search emoji</kx-command-item>
        <kx-command-item value="launch" disabled (select)="ran.set($event)">Launch</kx-command-item>
      </kx-command-group>
      <kx-command-separator />
      <kx-command-group heading="Settings">
        @if (showProfile()) {
          <kx-command-item value="profile" (select)="ran.set($event)">Profile <kx-command-shortcut>Ctrl+P</kx-command-shortcut></kx-command-item>
        }
      </kx-command-group>
    </kx-command-list>
  </kx-command>`;
const commandState = () => ({ search: signal(''), ran: signal(''), showProfile: signal(true) });

describe('command', () => {
  it('is a search combobox over a named listbox; the first item is active and, being an action, aria-selected', async () => {
    const { fixture, el } = host(COMMAND, commandState());
    await settle(fixture);
    const input = el.querySelector('input')!;
    const list = el.querySelector('kx-command-list')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(input.getAttribute('aria-label')).toBe('Commands');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('aria-label')).toBe('Commands');
    expect(textOf(ad(input))).toBe('Calendar');
    expect([...el.querySelectorAll('kx-command-item')].map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    const groups = [...el.querySelectorAll('kx-command-group')];
    expect(groups.map((g) => textOf(g.getAttribute('aria-labelledby')))).toEqual(['Suggestions', 'Settings']);
  });

  it('filters locally on text, value and keywords, never on a shortcut; the active descendant follows what remains', async () => {
    const { fixture, el, state } = host(COMMAND, commandState());
    const input = el.querySelector('input')!;
    const shown = () => [...el.querySelectorAll<HTMLElement>('kx-command-item')].filter((o) => !o.hidden).map((o) => o.getAttribute('id') && textOf(o.id));
    state.search.set('smiley');
    await settle(fixture);
    expect(shown()).toEqual(['Search emoji']);
    expect(textOf(ad(input))).toBe('Search emoji');
    expect(el.querySelector<HTMLElement>('kx-command-separator')!.hidden).toBe(true);
    expect(el.querySelectorAll<HTMLElement>('kx-command-group')[1]!.hidden).toBe(true);
    state.search.set('ctrl');
    await settle(fixture);
    expect(shown()).toEqual([]);
    expect(ad(input)).toBeNull();
    expect(el.querySelector<HTMLElement>('kx-command-empty')!.hidden).toBe(false);
    // a listbox must own options: with none, the list is a plain container and the field reads collapsed
    expect(el.querySelector('kx-command-list')!.getAttribute('role')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    state.search.set('launch');
    await settle(fixture);
    expect(shown()).toEqual(['Launch']);
    expect(ad(input)).toBeNull();
  });

  it('typing in the field sets the search; Enter runs the active item and a disabled one never runs', async () => {
    const { fixture, el, state } = host(COMMAND, commandState());
    const input = el.querySelector('input')!;
    input.value = 'emo';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(state.search()).toBe('emo');
    key(input, 'Enter');
    await settle(fixture);
    expect(state.ran()).toBe('emoji');
    el.querySelectorAll<HTMLElement>('kx-command-item')[2]!.click();
    await settle(fixture);
    expect(state.ran()).toBe('emoji');
  });

  it('moves the highlight off an item that is removed', async () => {
    const { fixture, el, state } = host(COMMAND, commandState());
    const input = el.querySelector('input')!;
    for (let i = 0; i < 3; i++) key(input, 'ArrowDown');
    await settle(fixture);
    expect(textOf(ad(input))).toBe('Profile Ctrl+P');
    state.showProfile.set(false);
    await settle(fixture);
    expect(textOf(ad(input))).toBe('Calendar');
  });

  it('keeps every item with filter null: the caller filters', async () => {
    const { fixture, el, state } = host(COMMAND.replace('[(search)]="search"', '[(search)]="search" [filter]="null"'), commandState());
    state.search.set('zzz');
    await settle(fixture);
    expect([...el.querySelectorAll<HTMLElement>('kx-command-item')].filter((o) => !o.hidden)).toHaveLength(4);
  });
});

const MULTI = `
  <label for="labels">Labels</label>
  <kx-multi-select inputId="labels" [options]="options" [formControl]="chosen" />
  <kx-multi-select aria-label="Tags" [options]="options" [(value)]="tags" creatable />`;
const multiState = () => ({
  options: [
    { value: 'bug', label: 'Bug' },
    { value: 'docs', label: 'Documentation' },
    { value: 'blocked', label: 'Blocked', disabled: true },
    { value: 'design', label: 'Design' },
  ],
  chosen: new FormControl<string[]>(['docs'], { nonNullable: true }),
  tags: signal<string[]>([]),
});

describe('multi-select', () => {
  it('is a combobox input over a multiselectable listbox; aria-selected says what is chosen', async () => {
    const { fixture, el } = host(MULTI, multiState());
    await settle(fixture);
    const input = el.querySelector<HTMLInputElement>('#labels')!;
    const popup = document.getElementById(input.getAttribute('aria-controls')!)!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(popup.getAttribute('role')).toBe('listbox');
    expect(popup.getAttribute('aria-multiselectable')).toBe('true');
    expect(popup.getAttribute('aria-label')).toBe('Labels');
    expect([...popup.querySelectorAll('[role="option"]')].map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
    expect(textOf(input.getAttribute('aria-describedby'))).toBe('1 selected: Documentation');
    expect([...el.querySelectorAll('kx-multi-select')[0]!.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Remove Documentation']);
    const second = el.querySelectorAll('kx-multi-select')[1]!.querySelector('input')!;
    expect(second.id).not.toBe(input.id);
    const ids = [...el.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens on ArrowDown, skips the disabled option, and Enter toggles while the list stays open', async () => {
    const { fixture, el, state } = host(MULTI, multiState());
    const input = el.querySelector<HTMLInputElement>('#labels')!;
    key(input, 'ArrowDown');
    await settle(fixture);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(textOf(ad(input))).toBe('Bug');
    key(input, 'ArrowDown');
    key(input, 'ArrowDown');
    await settle(fixture);
    expect(textOf(ad(input))).toBe('Design');
    key(input, 'Enter');
    await settle(fixture);
    expect(state.chosen.value).toEqual(['docs', 'design']);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(ad(input)!)!.getAttribute('aria-selected')).toBe('true');
    key(input, 'Enter');
    await settle(fixture);
    expect(state.chosen.value).toEqual(['docs']);
  });

  it('filters by typing, then clears the search once a match is chosen', async () => {
    const { fixture, el, state } = host(MULTI, multiState());
    const input = el.querySelector<HTMLInputElement>('#labels')!;
    input.value = 'des';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(textOf(ad(input))).toBe('Design');
    key(input, 'Enter');
    await settle(fixture);
    expect(state.chosen.value).toEqual(['docs', 'design']);
    expect(input.value).toBe('');
  });

  it('Backspace in an empty input removes the last chip; a chip’s button removes its own', async () => {
    const { fixture, el, state } = host(MULTI, multiState());
    state.chosen.setValue(['bug', 'docs', 'design']);
    await settle(fixture);
    const input = el.querySelector<HTMLInputElement>('#labels')!;
    key(input, 'Backspace');
    await settle(fixture);
    expect(state.chosen.value).toEqual(['bug', 'docs']);
    const remove = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === 'Remove Bug')!;
    remove.click();
    await settle(fixture);
    expect(state.chosen.value).toEqual(['docs']);
    expect(el.querySelector('[role="status"]')!.textContent).toBe('Bug removed');
  });

  it('creatable: offers the search text and adds it', async () => {
    const { fixture, el, state } = host(MULTI, multiState());
    const input = el.querySelectorAll('kx-multi-select')[1]!.querySelector('input')!;
    input.value = 'Someday';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(textOf(ad(input))).toBe('Create “Someday”');
    key(input, 'Enter');
    await settle(fixture);
    expect(state.tags()).toEqual(['Someday']);
  });

  it('creatable: never offers text that is already an option value or label', async () => {
    const { fixture, el } = host(MULTI, multiState());
    const input = el.querySelectorAll('kx-multi-select')[1]!.querySelector('input')!;
    for (const text of ['docs', 'DOCUMENTATION']) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await settle(fixture);
      expect(textOf(ad(input)) ?? '').not.toMatch(/^Create/);
      const offers = [...el.querySelectorAll<HTMLElement>('[role=option]')].filter((o) => !o.hidden).map((o) => o.textContent!.trim());
      expect(offers.some((t) => t.startsWith('Create'))).toBe(false);
    }
  });

  it('disabled, then an external [(open)]: the list cannot stay open and the selection cannot change', async () => {
    const { fixture, el, state } = host(
      `<kx-multi-select aria-label="Tags" [options]="options" [(value)]="tags" [(open)]="open" [disabled]="true" />`,
      { ...multiState(), tags: signal<string[]>(['docs']), open: signal(false) },
    );
    await settle(fixture);
    state.open.set(true);
    await settle(fixture);
    const input = el.querySelector('input')!;
    expect(state.open()).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(ad(input)).toBeNull();
    el.querySelectorAll<HTMLElement>('[role=option]')[0]!.click();
    key(input, 'Enter');
    await settle(fixture);
    expect(state.tags()).toEqual(['docs']);
    expect(state.open()).toBe(false);
  });

  it('reports touched on blur and disables every part with the form control', async () => {
    const { fixture, el, state } = host(MULTI, multiState());
    const input = el.querySelector<HTMLInputElement>('#labels')!;
    input.dispatchEvent(new FocusEvent('blur'));
    expect(state.chosen.touched).toBe(true);
    state.chosen.disable();
    await settle(fixture);
    expect(input.disabled).toBe(true);
    expect(el.querySelector('kx-multi-select')!.querySelectorAll('button')).toHaveLength(0);
  });
});
