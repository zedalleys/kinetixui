import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';
import {
  KxBadge,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardFooter,
  KxCardHeader,
  KxCardTitle,
} from '../../lib/primitives';

/**
 * The "Pricing tier" block — see sign-in.ts for how block fixtures work.
 *
 * The features are a real `<ul>`. A list of four things is a list, and the markup saying so is what makes a
 * screen reader announce "list, 4 items" before reading them. The check glyph is decorative: the list
 * already means "included", so repeating that four times would be noise.
 *
 * The web version's badge is `subtle`; Angular's badge variants are default / secondary / outline /
 * destructive / success / warning, so this uses `secondary`. A variant is not invented to match a screenshot.
 */
// kx-block:start
@Component({
  selector: 'app-pricing-tier-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxBadge, KxButton, KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-badge variant="secondary">Most popular</kx-badge>
        <kx-card-title>Pro</kx-card-title>
        <kx-card-description>For growing teams.</kx-card-description>
        <p class="price"><strong>$29</strong><span>/mo</span></p>
      </kx-card-header>
      <kx-card-content>
        <ul class="features">
          @for (feature of features; track feature) {
            <li><span aria-hidden="true">&#10003;</span> {{ feature }}</li>
          }
        </ul>
      </kx-card-content>
      <kx-card-footer>
        <button kxButton (click)="upgrade()">Upgrade to Pro</button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    .price { margin: var(--spacing-2) 0 0; }
    .price strong { font: var(--text-headline-sm); }
    .price span { color: hsl(var(--muted-foreground)); }
    .features { display: grid; gap: var(--spacing-2); margin: 0; padding: 0; list-style: none; }
    .features li { display: flex; align-items: center; gap: var(--spacing-2); font: var(--text-body-sm); }
  `,
})
export class PricingTierBlock {
  readonly features = ['Unlimited projects', 'Priority support', 'Custom domains', 'Analytics'];
  upgrade(): void {}
}
// kx-block:end
