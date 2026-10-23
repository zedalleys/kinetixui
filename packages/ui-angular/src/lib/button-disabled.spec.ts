import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { KxButton } from './button';

/**
 * An `aria-disabled` anchor used to be inert for a pointer and live for a keyboard: the stylesheet set
 * `pointer-events: none` and nothing stopped Enter, so a focused `<a kxButton href aria-disabled="true">`
 * still navigated. These are the assertions for the guard that replaced it.
 *
 * The negative control is removing the two constructor listeners from `KxButton`; the Enter and click
 * cases then fail. Recorded in /mnt/project-files/phase-b-states/slice-2-negative-controls/.
 */
@Component({
  selector: 'kx-test-host',
  imports: [KxButton],
  template: `
    <a
      kxButton
      href="/docs"
      [attr.aria-disabled]="off() ? 'true' : null"
      (click)="hits.push('anchor')"
      (keydown)="hits.push('anchor')"
    >Docs</a>
    <button kxButton type="button" (click)="hits.push('button')">Save</button>
  `,
})
class Host {
  readonly off = signal(true);
  readonly hits: string[] = [];
}

function setup() {
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    anchor: root.querySelector('a.kx-btn') as HTMLAnchorElement,
    button: root.querySelector('button.kx-btn') as HTMLButtonElement,
  };
}

describe('KxButton — a disabled anchor is inert for every input device', () => {
  it('cancels a click, so the href is not followed', () => {
    const { anchor } = setup();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps the click away from an ancestor handler', () => {
    const { fixture, anchor } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const seen: string[] = [];
    root.addEventListener('click', () => seen.push('ancestor'));
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(seen).toEqual([]);
  });

  it("stops the caller's own (click) on the same element", () => {
    // This is the assertion that dictates HOW the guard is registered. Host listeners declared in the
    // `host` metadata are created AFTER the element's own template listeners, so a guard written that way
    // runs second and `(click)="submit()"` on the anchor has already fired — `stopImmediatePropagation`
    // included, because order, not phase, is what decides it. Registering in the constructor instead puts
    // the guard first, and `stopImmediatePropagation` then suppresses the caller's handler too. Measured
    // both ways: with the `host` form this expects ['anchor'].
    const { anchor, host } = setup();
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(host.hits).toEqual([]);
  });

  it("stops the caller's own (keydown) activation on the same element", () => {
    const { anchor, host } = setup();
    anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(host.hits).toEqual([]);
  });

  it('swallows Enter — the case `pointer-events: none` could never reach', () => {
    const { anchor } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('swallows Space, which would otherwise scroll the page', () => {
    const { anchor } = setup();
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Tab alone: the control stays reachable, which is why it is aria-disabled and not disabled', () => {
    const { anchor } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(anchor.getAttribute('tabindex')).toBeNull();
    anchor.focus();
    expect(document.activeElement).toBe(anchor);
  });

  it('keeps the href: the guard is the API, not a convention the caller has to follow', () => {
    const { anchor } = setup();
    expect(anchor.getAttribute('href')).toBe('/docs');
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
  });

  it('does nothing once aria-disabled is gone', () => {
    const { fixture, host, anchor } = setup();
    host.off.set(false);
    fixture.detectChanges();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(host.hits).toEqual(['anchor']);
    expect(anchor.getAttribute('aria-disabled')).toBeNull();
  });

  it('never interferes with the <button> form, which the browser disables itself', () => {
    const { host, button } = setup();
    button.click();
    expect(host.hits).toEqual(['button']);
  });
});
