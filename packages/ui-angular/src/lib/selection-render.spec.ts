import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SelectionStates } from '../fixtures/selection';


describe('selection controls — rendered subject for check:selection-visual', () => {
  TestBed.configureTestingModule({ imports: [SelectionStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(SelectionStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders each checkbox state with the semantics the gate addresses', () => {
    expect(at('[data-kx-case="unchecked"] button.kx-checkbox').getAttribute('aria-checked')).toBe('false');
    expect(at('[data-kx-case="checked"] button.kx-checkbox').getAttribute('aria-checked')).toBe('true');
    expect(at('[data-kx-case="mixed"] button.kx-checkbox').getAttribute('aria-checked')).toBe('mixed');
    expect((at('kx-checkbox[data-kx-case="disabled"] button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the radios as real checked / unchecked / disabled inputs', () => {
    expect((at('kx-radio[data-kx-case="checked"] input') as HTMLInputElement).checked).toBe(true);
    expect((at('kx-radio[data-kx-case="unchecked"] input') as HTMLInputElement).checked).toBe(false);
    expect((at('kx-radio[data-kx-case="disabled"] input') as HTMLInputElement).disabled).toBe(true);
  });

  it('renders the switches on, off and disabled', () => {
    expect(at('kx-switch[data-kx-case="on"] button').getAttribute('aria-checked')).toBe('true');
    expect(at('kx-switch[data-kx-case="off"] button').getAttribute('aria-checked')).toBe('false');
    expect((at('kx-switch[data-kx-case="disabled"] button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the direction cases on and off, each in its own subtree', () => {
    for (const key of ['inherit', 'ltr', 'rtl']) {
      expect(at(`kx-switch[data-kx-case="${key}-on"] button`).getAttribute('aria-checked'), key).toBe('true');
      expect(at(`kx-switch[data-kx-case="${key}-off"] button`).getAttribute('aria-checked'), key).toBe('false');
    }
    expect(at('kx-switch[data-kx-case="ltr-on"]').closest('[dir]')?.getAttribute('dir')).toBe('ltr');
    expect(at('kx-switch[data-kx-case="rtl-on"]').closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    expect(at('kx-switch[data-kx-case="inherit-on"]').closest('[dir]')).toBeNull();
  });

  it('renders one chosen segment per control and a disabled one', () => {
    const page = at('[data-kx-case="page"]');
    expect(Array.from(page.querySelectorAll('input')).filter((i) => i.checked).map((i) => i.value)).toEqual(['week']);
    expect((page.querySelector('input[value="year"]') as HTMLInputElement).disabled).toBe(true);
  });

});
