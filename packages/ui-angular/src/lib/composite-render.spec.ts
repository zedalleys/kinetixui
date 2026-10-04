import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CompositeStates } from '../fixtures/composite';


describe('composite fields — rendered subject for check:composite-visual', () => {
  TestBed.configureTestingModule({ imports: [CompositeStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CompositeStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders every composite state with the semantics the gate addresses', () => {
    for (const kind of ['number-input', 'password-input']) {
      const input = (c: string) => at(`kx-${kind}[data-kx-case="${c}"] input`) as HTMLInputElement;
      expect(input('rest'), `${kind} rest`).toBeTruthy();
      expect(input('rest').getAttribute('aria-invalid'), `${kind} rest is not invalid`).toBeNull();
      expect(input('invalid').getAttribute('aria-invalid'), `${kind} invalid`).toBe('true');
      expect(input('invalid').getAttribute('aria-describedby'), `${kind} invalid describedby`).toBe(`${kind === 'number-input' ? 'ni' : 'pw'}-invalid-error`);
      expect(input('disabled').disabled, `${kind} disabled`).toBe(true);
    }
    // the reveal toggle is the part that can own focus; the number steppers are not keyboard stops
    expect(at('kx-password-input[data-kx-case="rest"] button').tabIndex).toBe(0);
    expect(at('kx-number-input[data-kx-case="rest"] button').tabIndex).toBe(-1);
  });

});
