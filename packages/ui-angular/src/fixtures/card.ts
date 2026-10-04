import { Component } from '@angular/core';
import { KxButton } from '../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxLabel } from '../lib/primitives';
import { KxSwitch } from '../lib/toggles';

/**
 * Angular's Card, rendered by Angular in every arrangement the Card contract names (TOKENS.md, "Surface model"
 * and "Card") — the subject `scripts/card-visual.mjs` paints in Chromium. `browser/` bootstraps it as a live
 * Angular application, so hover, press and focus run through the real templates; `card-render.spec.ts` mounts
 * the same class in jsdom and asserts the semantics the gate's selectors rely on.
 *
 * The interactive cards come first so the page's first Tab stop is the first link card, as in React's
 * Interactive story, whose hrefs and states these mirror: a link card, a link card that is the current page
 * (`aria-current`), and toggle cards on and off (`aria-pressed`). Then a static card holding a field, and
 * static cards on a grouped section. `data-kx-case` names each arrangement.
 */
@Component({
  selector: 'kx-fixture',
  imports: [KxCard, KxCardHeader, KxCardTitle, KxCardDescription, KxCardContent, KxCardFooter, KxInput, KxLabel, KxSwitch, KxButton],
  template: `
    <div class="kx-render-grid">
      <div data-kx-case="interactive" class="kx-render-cards">
        <a kxCard href="#reports-q3">
          <kx-card-header>
            <kx-card-title>Q3 report</kx-card-title>
            <kx-card-description>Revenue, churn and cohort retention.</kx-card-description>
          </kx-card-header>
        </a>
        <a kxCard href="#reports-q4" aria-current="page">
          <kx-card-header>
            <kx-card-title>Q4 report</kx-card-title>
            <kx-card-description>The report you are viewing.</kx-card-description>
          </kx-card-header>
        </a>
        <button kxCard type="button" aria-pressed="true" class="kx-render-toggle-card">
          <span class="kx-render-card-title">Daily backups</span>
          <span class="kx-render-card-description">Included in this plan.</span>
        </button>
        <button kxCard type="button" aria-pressed="false" class="kx-render-toggle-card">
          <span class="kx-render-card-title">Audit log</span>
          <span class="kx-render-card-description">Add to this plan.</span>
        </button>
      </div>
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
