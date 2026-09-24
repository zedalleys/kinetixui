import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxAspectRatio, KxMetric } from '../../lib/display';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from '../../lib/tabs';

/**
 * The "Dashboard tabs" block — see sign-in.ts for how block fixtures work.
 *
 * `kx-tabs` gives the roving-tabindex behaviour the WAI-ARIA tabs pattern asks for: arrow keys move between
 * tabs, Tab moves out of the set, and each panel is tied to its tab. Three buttons and a CSS class would
 * look the same and behave nothing like it.
 *
 * The chart's box is reserved with `kx-aspect-ratio` before the chart exists. Without it the panel is short,
 * then grows when the data lands, and everything under it jumps — including whatever the reader was about to
 * click. That is a layout-stability bug, not a styling preference.
 *
 * The trend on each metric is also stated in words by the component, so "up" is never carried by colour and
 * an arrow glyph alone.
 */
// kx-block:start
@Component({
  selector: 'app-dashboard-tabs-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxAspectRatio, KxMetric, KxTab, KxTabList, KxTabPanel, KxTabs],
  template: `
    <kx-tabs [(value)]="tab">
      <kx-tab-list>
        @for (panel of panels; track panel.value) {
          <button kxTab [value]="panel.value">{{ panel.label }}</button>
        }
      </kx-tab-list>

      @for (panel of panels; track panel.value) {
        <kx-tab-panel [value]="panel.value">
          <div class="metrics">
            @for (metric of panel.metrics; track metric.label) {
              <kx-metric [label]="metric.label" [value]="metric.value" [trend]="metric.trend" [change]="metric.change" />
            }
          </div>
          <kx-aspect-ratio [ratio]="16 / 9">
            <div class="chart">{{ panel.caption }}</div>
          </kx-aspect-ratio>
        </kx-tab-panel>
      }
    </kx-tabs>
  `,
  styles: `
    :host { display: block; max-inline-size: 42rem; }
    .metrics { display: grid; gap: var(--spacing-4); margin-block-end: var(--spacing-4); }
    @media (min-width: 40rem) { .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .chart {
      display: flex; align-items: center; justify-content: center;
      block-size: 100%;
      border: var(--border-width-default) dashed hsl(var(--border));
      border-radius: var(--radius-lg);
      font: var(--text-body-sm);
      color: hsl(var(--muted-foreground));
    }
  `,
})
export class DashboardTabsBlock {
  readonly tab = signal('overview');

  readonly panels = [
    {
      value: 'overview',
      label: 'Overview',
      caption: 'Sessions, last 30 days',
      metrics: [
        { label: 'Sessions', value: '48,271', trend: 'up' as const, change: '+12.4%' },
        { label: 'Sign-ups', value: '1,204', trend: 'up' as const, change: '+3.1%' },
        { label: 'Churn', value: '1.8%', trend: 'down' as const, change: '−0.4%' },
      ],
    },
    {
      value: 'traffic',
      label: 'Traffic',
      caption: 'Sources, last 30 days',
      metrics: [
        { label: 'Direct', value: '21,904', trend: 'up' as const, change: '+8.0%' },
        { label: 'Search', value: '18,442', trend: 'up' as const, change: '+15.2%' },
        { label: 'Referral', value: '7,925', trend: 'neutral' as const, change: '0.0%' },
      ],
    },
  ];
}
// kx-block:end
