import { Component, signal } from '@angular/core';
import { KxSegment, KxSegmentedControl } from '../lib/toggles';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from '../lib/tabs';

@Component({
  selector: 'kx-fixture',
  imports: [KxSegment, KxSegmentedControl, KxTab, KxTabList, KxTabPanel, KxTabs],
  template: `
    <main>
      <h1>Selection glide</h1>
      <section [attr.dir]="direction()" [style.inline-size.px]="width()">
        <h2>SegmentedControl</h2>
        <kx-segmented-control aria-label="Date range" [(value)]="range">
          <kx-segment value="week">Week</kx-segment>
          <kx-segment value="month" disabled>Month</kx-segment>
          <kx-segment value="quarter">{{ longLabel() ? 'Previous financial quarter' : 'Quarter to date' }}</kx-segment>
          <kx-segment value="year">Year</kx-segment>
        </kx-segmented-control>
        <output aria-label="Selected date range">{{ range() }}</output>
        <h2>Tabs</h2>
        <kx-tabs>
          <kx-tab-list aria-label="Account sections">
            <button kxTab value="summary">Summary</button>
            <button kxTab value="billing" [disabled]="true">Billing</button>
            <button kxTab value="activity">{{ longLabel() ? 'Recent account activity' : 'Activity log' }}</button>
            <button kxTab value="settings">Settings</button>
          </kx-tab-list>
          <kx-tab-panel value="summary">Account summary</kx-tab-panel>
          <kx-tab-panel value="billing">Billing details</kx-tab-panel>
          <kx-tab-panel value="activity">Recent activity</kx-tab-panel>
          <kx-tab-panel value="settings">Account settings</kx-tab-panel>
        </kx-tabs>
      </section>
      <button type="button" (click)="longLabel.update(v => !v)">Change labels</button>
      <button type="button" (click)="width.update(v => v === 500 ? 235 : 500)">Resize controls</button>
      <button type="button" (click)="direction.update(v => v === 'ltr' ? 'rtl' : 'ltr')">Flip direction</button>
      <button type="button" (click)="range.set('week')">Select week</button>
      <button type="button" (click)="range.set(null)">Clear range</button>
      <p>Use arrow keys or select a destination. Change the system Reduce Motion setting to compare.</p>
    </main>
  `,
  styles: 'main{padding:var(--spacing-4)} section{max-inline-size:100%} output{display:block}',
})
export class SelectionGlide {
  readonly range = signal<string | null>('week');
  readonly longLabel = signal(false);
  readonly direction = signal<'ltr' | 'rtl'>('ltr');
  readonly width = signal(500);
}
