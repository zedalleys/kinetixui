import { Component } from '@angular/core';
import { KxButton } from '../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxLabel } from '../lib/primitives';
import { KxSwitch } from '../lib/toggles';

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
  selector: 'kx-fixture',
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
export class CardStates {}
