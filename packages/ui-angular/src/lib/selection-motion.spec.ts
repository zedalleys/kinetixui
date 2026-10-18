import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ControlValueAccessor } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { SelectionMotion } from '../fixtures/selection-motion';
import { KxCheckbox } from './toggles';

/**
 * The structure and the semantics `scripts/angular-selection-motion.mjs` addresses, asserted here in jsdom so
 * a selector that stops matching fails with a readable message before the browser gate fails on a missing
 * element. The timing itself is not asserted here: a duration read out of jsdom is the stylesheet read back,
 * not motion, and the gate measures the transitions that actually run (MX1b-2).
 */
describe('selection motion — rendered subject for check:angular-selection-motion', () => {
  TestBed.configureTestingModule({ imports: [SelectionMotion], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(SelectionMotion);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders every case the gate drives', () => {
    for (const key of ['off', 'on', 'disabled', 'disabled-on']) expect(at(`kx-switch[data-kx-case="${key}"] button`), key).not.toBeNull();
    for (const key of ['unchecked', 'checked', 'mixed', 'disabled']) expect(at(`kx-checkbox[data-kx-case="${key}"] button`), key).not.toBeNull();
    for (const key of ['unchecked', 'checked', 'third']) expect(at(`kx-radio[data-kx-case="${key}"] input`), key).not.toBeNull();
    for (const key of ['off', 'on', 'outline', 'disabled']) expect(at(`button[data-kx-case="${key}"]`), key).not.toBeNull();
    for (const key of ['multi-off', 'multi-on', 'single-on', 'single-off']) expect(at(`kx-toggle-group-item[data-kx-case="${key}"] .kx-toggle`), key).not.toBeNull();
  });

  it('gives the checkbox glyph its own element, with both shapes always rendered', () => {
    // The gate reads the glyph's opacity and the shapes' display: an `@if` that mounted only one of them
    // would make the fade unmeasurable and the swap a remount.
    for (const key of ['unchecked', 'checked', 'mixed']) {
      const glyph = at(`kx-checkbox[data-kx-case="${key}"] .kx-checkbox__glyph`);
      expect(glyph, key).not.toBeNull();
      expect(glyph.querySelector('.kx-checkbox__tick'), key).not.toBeNull();
      expect(glyph.querySelector('.kx-checkbox__dash'), key).not.toBeNull();
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('gives the radio dot its own element beside the input, out of the accessibility tree', () => {
    const control = at('kx-radio[data-kx-case="checked"] .kx-radio__control');
    expect(control).not.toBeNull();
    const dot = control.querySelector('.kx-radio__dot') as HTMLElement;
    expect(dot).not.toBeNull();
    // Adjacent, in that order: the stylesheet shows the dot through `:checked + .kx-radio__dot`.
    expect((control.querySelector('input') as HTMLElement).nextElementSibling).toBe(dot);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps each switch direction case in its own subtree', () => {
    expect(at('kx-switch[data-kx-case="ltr-on"]').closest('[dir]')?.getAttribute('dir')).toBe('ltr');
    expect(at('kx-switch[data-kx-case="rtl-on"]').closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    expect(at('kx-switch[data-kx-case="inherit-on"]').closest('[dir]')).toBeNull();
  });
});

@Component({
  imports: [KxCheckbox],
  template: `<kx-checkbox [indeterminate]="mixed()" [(checked)]="checked" (toggled)="emitted.push($event)" aria-label="Select all" />`,
})
class MixedHost {
  readonly mixed = signal(true);
  readonly checked = signal(false);
  readonly emitted: boolean[] = [];
}

/**
 * A mixed checkbox resolves to checked when it is activated — what the component's own documentation
 * promises, and what the browser gate measures as "the glyph swaps in the same frame as aria-checked". It
 * used to stay `mixed` for ever, because `indeterminate` is an input the component cannot clear.
 */
describe('KxCheckbox, mixed', () => {
  const host = () => {
    TestBed.configureTestingModule({ imports: [MixedHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(MixedHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, box: el.querySelector('button.kx-checkbox') as HTMLButtonElement, host: fixture.componentInstance };
  };

  it('announces mixed until the reader answers, then checked', () => {
    const { fixture, box, host: h } = host();
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    box.click();
    fixture.detectChanges();
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(h.checked()).toBe(true);
    expect(h.emitted).toEqual([true]);
  });

  it('reports touched even when the value it resolves to is the one it already holds', () => {
    // checked AND indeterminate: resolving writes no new value, but the reader did act on the control, and a
    // form that shows its errors on touch has to hear about it.
    TestBed.configureTestingModule({ imports: [MixedHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(MixedHost);
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('button.kx-checkbox') as HTMLButtonElement;
    const cva = fixture.debugElement.children[0].injector.get(KxCheckbox) as unknown as ControlValueAccessor;
    let touched = 0;
    cva.registerOnTouched(() => (touched += 1));
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    box.click();
    fixture.detectChanges();
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.emitted).toEqual([true]);
    expect(touched).toBe(1);
  });

  it('goes back to mixed when the caller writes the input again', () => {
    const { fixture, box, host: h } = host();
    box.click();
    fixture.detectChanges();
    expect(box.getAttribute('aria-checked')).toBe('true');
    // A "select all" header recomputing "some of these are selected" writes indeterminate again.
    h.mixed.set(false);
    fixture.detectChanges();
    h.mixed.set(true);
    fixture.detectChanges();
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

});
