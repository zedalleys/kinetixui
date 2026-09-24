import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxMetric } from '../../lib/display';

/**
 * The "Stat cards" block — see sign-in.ts for how block fixtures work.
 *
 * A CSS grid with `auto-fit`, not media queries: the row reflows on its own container's width, so it is
 * correct inside a sidebar as well as on a full page, and correct at large text sizes where a fixed
 * three-column grid would not be. `KxMetric` already keeps the direction of change in the text as well as in
 * the colour, so nothing here needs to repeat it.
 */
// kx-block:start
@Component({
  selector: 'app-stat-cards-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxMetric],
  template: `
    <div class="stats">
      <kx-metric label="Revenue" value="$45,231" trend="up" change="12.5%" />
      <kx-metric label="Active users" value="2,420" trend="up" change="8.1%" />
      <kx-metric label="Churn" value="1.2%" trend="down" change="0.3%" />
    </div>
  `,
  styles: `
    .stats {
      display: grid;
      gap: var(--spacing-4);
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }
  `,
})
export class StatCardsBlock {}
// kx-block:end
