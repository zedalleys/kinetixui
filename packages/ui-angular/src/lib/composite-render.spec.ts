import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KxCard, KxCardContent, KxLabel } from './primitives';
import { KxNumberInput, KxPasswordInput } from './forms';

/**
 * NumberInput and PasswordInput — Angular's implemented composite fields — rendered by Angular in every state
 * the composite-field contract names (TOKENS.md, "Composite fields"): the subject
 * `scripts/composite-visual.mjs` paints in Chromium.
 *
 * jsdom has no pixels, so nothing here is a visual claim. What this file contributes is the DOM: the markup,
 * classes and ARIA the real Angular templates produce for each state, so the browser gate measures the
 * package's own output. Run with `KX_ANGULAR_RENDER_OUT` set to a path, it also writes that DOM out for the
 * gate. Each field carries `data-kx-case` — the same keys the React `EntryStates` stories use.
 *
 * The assertions are what the gate's selectors rely on, and the semantics the styling keys on: the invalid
 * state is the inner input's `aria-invalid`, forwarded from the component, with the error text it describes.
 */
@Component({
  imports: [KxCard, KxCardContent, KxLabel, KxNumberInput, KxPasswordInput],
  template: `
    <div class="kx-render-grid">
      <kx-card data-kx-kind="number-input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="ni-rest-label">Seats</span><kx-number-input data-kx-case="rest" aria-labelledby="ni-rest-label" [value]="4" [min]="1" /></div>
          <div class="kx-render-field">
            <span kxLabel id="ni-invalid-label">Guests</span>
            <kx-number-input data-kx-case="invalid" aria-labelledby="ni-invalid-label" [value]="12" [aria-invalid]="'true'" [aria-describedby]="'ni-invalid-error'" />
            <p id="ni-invalid-error" class="kx-render-error">This room holds 10 people at most.</p>
          </div>
          <div class="kx-render-field"><span kxLabel id="ni-disabled-label">Admins (locked)</span><kx-number-input data-kx-case="disabled" aria-labelledby="ni-disabled-label" [value]="2" [disabled]="true" /></div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="password-input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="pw-rest-label">Password</span><kx-password-input data-kx-case="rest" aria-labelledby="pw-rest-label" /></div>
          <div class="kx-render-field">
            <span kxLabel id="pw-invalid-label">New password</span>
            <kx-password-input data-kx-case="invalid" aria-labelledby="pw-invalid-label" value="kinetix" [aria-invalid]="'true'" [aria-describedby]="'pw-invalid-error'" />
            <p id="pw-invalid-error" class="kx-render-error">Use at least 12 characters.</p>
          </div>
          <div class="kx-render-field"><span kxLabel id="pw-disabled-label">Service password (managed)</span><kx-password-input data-kx-case="disabled" aria-labelledby="pw-disabled-label" value="managed-secret" [disabled]="true" /></div>
        </kx-card-content>
      </kx-card>
    </div>
  `,
})
class CompositeStates {}

/** Properties are not attributes: copy the live `disabled` onto the attribute so `outerHTML` keeps it. */
function serialise(root: HTMLElement): string {
  for (const el of Array.from(root.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button'))) {
    el.toggleAttribute('disabled', el.disabled);
    if (el instanceof HTMLInputElement) el.setAttribute('value', el.value);
  }
  return root.innerHTML;
}

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

  it('writes the rendered DOM out when the gate asks for it', () => {
    const out = process.env['KX_ANGULAR_RENDER_OUT'];
    if (!out) return;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialise(root));
  });
});
