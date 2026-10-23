import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { KxButton } from './button';

/**
 * `pending` on `KxButton` — the state for "the action I started is in flight".
 *
 * The same four risks the React slice asserts, in Angular's terms: focus is kept, the announcement is
 * one per transition and lives outside the button's name, the indicator slot is reserved in both
 * states, and every device is suppressed. The negative control is at the bottom: a plain
 * `[disabled]="pending"` button, written out here, failing the focus assertion this one passes.
 *
 * The live region is a single `#kx-button-pending-live-region` on `document.body`, so these tests read
 * it from there and clean it up between cases.
 */

@Component({
  selector: 'kx-test-host',
  imports: [KxButton],
  template: `
    <button kxButton [pending]="busy()" [pendingLabel]="label()" (click)="hits.push('press')">Save</button>
    <button kxButton (click)="hits.push('plain')">Cancel</button>
  `,
})
class Host {
  readonly busy = signal(false);
  readonly label = signal('Working…');
  readonly hits: string[] = [];
}

function setup() {
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const buttons = root.querySelectorAll<HTMLButtonElement>('button.kx-btn');
  return { fixture, host: fixture.componentInstance, button: buttons[0]!, plain: buttons[1]! };
}

const region = () => document.getElementById('kx-button-pending-live-region');
const announced = () => region()?.textContent ?? null;

afterEach(() => region()?.remove());

describe('KxButton pending — semantics', () => {
  it('is aria-disabled and aria-busy, and never the disabled attribute', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('data-pending')).toBe(true);
    expect(button.disabled).toBe(false);
  });

  it('keeps the accessible name out of the announcement', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    // The name is the button's own text, unchanged; the status is in a region outside it.
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.querySelector('[aria-live]')).toBeNull();
    expect(announced()).toBe('Working…');
    expect(region()?.getAttribute('aria-live')).toBe('polite');
  });

  it('takes a localised pendingLabel', () => {
    const { fixture, host } = setup();
    host.label.set('جارٍ الحفظ…');
    host.busy.set(true);
    fixture.detectChanges();
    expect(announced()).toBe('جارٍ الحفظ…');
  });

  it('clears the region on the way out', () => {
    const { fixture, host } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    expect(announced()).toBe('');
  });

  it('clears the region when a pending button is destroyed', () => {
    const { fixture, host } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    fixture.destroy();
    expect(announced()).toBe('');
  });
});

describe('KxButton pending — focus is kept', () => {
  it('stays focusable while pending, which a disabled button is not', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tabIndex).toBe(0);
  });

  it('holds focus across the transition', () => {
    const { fixture, host, button } = setup();
    button.focus();
    host.busy.set(true);
    fixture.detectChanges();
    expect(document.activeElement).toBe(button);
  });
});

describe('KxButton pending — activation is suppressed', () => {
  it('swallows a click, and the caller’s own (click) with it', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(host.hits).toEqual([]);
  });

  it('swallows Enter and Space', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(true);
    }
    expect(host.hits).toEqual([]);
  });

  it('leaves Tab alone, so the control stays reachable', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets everything through again once pending clears', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(host.hits).toEqual(['press']);
  });
});

describe('KxButton pending — a button that never mentions it is untouched', () => {
  it('gets no slot class and no attributes', () => {
    const { plain } = setup();
    expect(plain.className).not.toContain('kx-btn--pending-aware');
    expect(plain.hasAttribute('aria-busy')).toBe(false);
    expect(plain.hasAttribute('data-pending')).toBe(false);
  });

  it('the shared region is created empty by the aware button, and says nothing yet', () => {
    setup();
    // Created on the first render of a pending-aware button rather than at the first announcement:
    // a live region inserted and filled in the same task is unreliably announced.
    expect(region()).not.toBeNull();
    expect(announced()).toBe('');
  });

  it('reserves the slot as soon as the input is bound, even at false', () => {
    const { button } = setup();
    // Bound and false: opted in, not pending. The slot exists so the label cannot jump later.
    expect(button.className).toContain('kx-btn--pending-aware');
    expect(button.hasAttribute('data-pending')).toBe(false);
  });
});

describe("KxButton pending — doesn't take over an aria-disabled the caller wrote", () => {
  it('leaves a caller-owned aria-disabled in place when pending clears', () => {
    const { fixture, host, button } = setup();
    button.setAttribute('aria-disabled', 'true');
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    // The directive only removes the attribute it set itself.
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

/**
 * THE NEGATIVE CONTROL — the obvious implementation, and what it costs.
 */
@Component({
  selector: 'kx-naive-host',
  imports: [KxButton],
  template: `<button kxButton [disabled]="busy()">Save</button>`,
})
class NaiveHost {
  readonly busy = signal(false);
}

describe('negative control: [disabled]="pending"', () => {
  it('cannot be focused while pending, and drops out of the tab order', () => {
    TestBed.configureTestingModule({ imports: [NaiveHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NaiveHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    button.focus();
    // The failure, recorded. A browser also blurs it retroactively at the moment the attribute lands,
    // returning a user who had just pressed it to the top of the document; jsdom does not model that
    // blur, so this asserts the property which causes it.
    expect(document.activeElement).not.toBe(button);
    expect(button.disabled).toBe(true);
  });

  it('and announces nothing at all while it works', () => {
    TestBed.configureTestingModule({ imports: [NaiveHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NaiveHost);
    fixture.detectChanges();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(region()).toBeNull();
  });
});
