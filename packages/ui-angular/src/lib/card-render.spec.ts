import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KxButton } from './button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxLabel } from './primitives';
import { KxSwitch } from './toggles';

/**
 * Angular's Card, rendered by Angular, in the arrangements the resting half of the Card contract names
 * (TOKENS.md, "Surface model" / "Card") — the subject `scripts/card-visual.mjs` paints in Chromium.
 *
 * Angular's `kx-card` is the static, resting Card: it has no interactive form (no link or button card, no
 * pressed or selected state), so this renders only what it implements — a card holding a field, on the page,
 * and cards on a grouped section — and the gate asserts only the resting contract for it.
 *
 * jsdom has no pixels; this contributes the DOM Angular actually produces. Run with `KX_ANGULAR_RENDER_OUT` set
 * to a path, it writes that DOM out for the gate. `data-kx-case` names each arrangement.
 */
@Component({
  imports: [KxCard, KxCardHeader, KxCardTitle, KxCardDescription, KxCardContent, KxCardFooter, KxInput, KxLabel, KxSwitch, KxButton],
  template: `
    <div class="kx-render-grid">
      <kx-card data-kx-case="default">
        <kx-card-header>
          <kx-card-title>Create project</kx-card-title>
          <kx-card-description>Deploy your new project in one click.</kx-card-description>
        </kx-card-header>
        <kx-card-content><input kxInput aria-label="Project name" placeholder="Project name" /></kx-card-content>
        <kx-card-footer>
          <button kxButton variant="Outline" size="sm">Cancel</button>
          <button kxButton size="sm">Deploy</button>
        </kx-card-footer>
      </kx-card>
      <section data-kx-case="grouped" class="kx-render-grouped" aria-label="Workspace settings">
        <kx-card>
          <kx-card-header>
            <kx-card-title>Notifications</kx-card-title>
            <kx-card-description>Choose what reaches your inbox.</kx-card-description>
          </kx-card-header>
          <kx-card-content>
            <div class="kx-render-row"><label kxLabel>Weekly digest</label><kx-switch aria-label="Weekly digest" [checked]="true" /></div>
          </kx-card-content>
        </kx-card>
      </section>
    </div>
  `,
})
class CardStates {}

describe('card — rendered subject for check:card-visual', () => {
  TestBed.configureTestingModule({ imports: [CardStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CardStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;

  it('renders a resting card with a field in it, and a card on a grouped section', () => {
    const card = root.querySelector('kx-card[data-kx-case="default"]');
    expect(card?.classList.contains('kx-card')).toBe(true);
    expect(card?.querySelector('input.kx-input')).toBeTruthy();
    expect(root.querySelector('section[data-kx-case="grouped"] kx-card.kx-card')).toBeTruthy();
  });

  it('is static: a card is not itself interactive', () => {
    const card = root.querySelector('kx-card[data-kx-case="default"]') as HTMLElement;
    expect(card.getAttribute('tabindex')).toBeNull();
    expect(card.getAttribute('role')).toBeNull();
  });

  it('writes the rendered DOM out when the gate asks for it', () => {
    const out = process.env['KX_ANGULAR_RENDER_OUT'];
    if (!out) return;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, root.innerHTML);
  });
});
