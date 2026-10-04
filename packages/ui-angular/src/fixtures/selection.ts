import { Component } from '@angular/core';
import { KxCard, KxCardContent, KxLabel } from '../lib/primitives';
import { KxRadio, KxRadioGroup } from '../lib/forms';
import { KxCheckbox, KxSegment, KxSegmentedControl, KxSwitch } from '../lib/toggles';

/**
 * The selection controls, rendered by Angular, in every state the selection-control contract names
 * (TOKENS.md, "Selection controls") — the subject `scripts/selection-visual.mjs` paints in Chromium.
 *
 * This component is mounted twice. `browser/` bootstraps it as a live Angular application in Chromium — the page
 * `scripts/selection-visual.mjs` measures, with the package's styles.css and the generated token CSS and nothing else — so
 * hover, focus, keyboard and state changes run through the real templates, bindings and change detection.
 * `src/lib/*-render.spec.ts` mounts the same class in jsdom and asserts the semantics the gate's selectors rely
 * on, so a selector that stops matching fails there first, with a readable message. Each control carries `data-kx-case`, the same keys the React `States` stories use, so
 * one gate can address both.
 */
@Component({
  selector: 'kx-fixture',
  imports: [KxCard, KxCardContent, KxLabel, KxCheckbox, KxRadioGroup, KxRadio, KxSwitch, KxSegmentedControl, KxSegment],
  template: `
    <div class="kx-render-grid">
      <kx-card>
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-row"><kx-checkbox data-kx-case="unchecked" aria-label="Email me about product updates" /><span>Product updates</span></div>
          <div class="kx-render-row"><kx-checkbox data-kx-case="checked" [checked]="true" aria-label="Email me about security alerts" /><span>Security alerts</span></div>
          <div class="kx-render-row"><kx-checkbox data-kx-case="mixed" [indeterminate]="true" aria-label="Select all regions" /><span>All regions</span></div>
          <div class="kx-render-row"><kx-checkbox data-kx-case="disabled" disabled aria-label="Archive automatically" /><span>Archive automatically</span></div>
          <div class="kx-render-row"><kx-checkbox data-kx-case="disabled-checked" disabled [checked]="true" aria-label="Keep an audit log" /><span>Audit log</span></div>
        </kx-card-content>
      </kx-card>
      <kx-card>
        <kx-card-content class="kx-render-stack">
          <kx-radio-group value="weekly" aria-label="Digest frequency">
            <kx-radio value="daily" data-kx-case="unchecked">Daily</kx-radio>
            <kx-radio value="weekly" data-kx-case="checked">Weekly</kx-radio>
          </kx-radio-group>
          <kx-radio-group value="eu" disabled aria-label="Data region">
            <kx-radio value="eu" data-kx-case="disabled-checked">EU</kx-radio>
            <kx-radio value="us" data-kx-case="disabled">US</kx-radio>
          </kx-radio-group>
        </kx-card-content>
      </kx-card>
      <kx-card>
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-row"><span>Push notifications</span><kx-switch data-kx-case="off" aria-label="Push notifications" /></div>
          <div class="kx-render-row"><span>Weekly digest</span><kx-switch data-kx-case="on" [checked]="true" aria-label="Weekly digest" /></div>
          <div class="kx-render-row"><span>SMS alerts</span><kx-switch data-kx-case="disabled" disabled aria-label="SMS alerts" /></div>
        </kx-card-content>
      </kx-card>
      <div class="kx-render-stack" data-kx-group="direction">
        @for (d of directions; track d.key) {
          <div class="kx-render-row" [attr.dir]="d.dir">
            <span>{{ d.label }}</span>
            <span class="kx-render-row">
              <kx-switch [attr.data-kx-case]="d.key + '-off'" [aria-label]="d.label" />
              <kx-switch [attr.data-kx-case]="d.key + '-on'" [checked]="true" [aria-label]="d.label + ', on'" />
            </span>
          </div>
        }
      </div>
      <kx-segmented-control value="week" aria-label="Range" data-kx-case="page">
        <kx-segment value="day">Day</kx-segment>
        <kx-segment value="week">Week</kx-segment>
        <kx-segment value="month">Month</kx-segment>
        <kx-segment value="year" disabled>Year</kx-segment>
      </kx-segmented-control>
      <kx-card>
        <kx-card-content>
          <kx-segmented-control value="grid" aria-label="Layout" data-kx-case="card">
            <kx-segment value="list">List</kx-segment>
            <kx-segment value="grid">Grid</kx-segment>
            <kx-segment value="board">Board</kx-segment>
          </kx-segmented-control>
        </kx-card-content>
      </kx-card>
    </div>
  `,
})
export class SelectionStates {
  /** The switch in a subtree that follows the page, overrides it to ltr, and overrides it to rtl (React: `Direction`). */
  readonly directions = [
    { key: 'inherit', dir: null, label: 'Follows the page' },
    { key: 'ltr', dir: 'ltr', label: 'Left-to-right section' },
    { key: 'rtl', dir: 'rtl', label: 'Right-to-left section' },
  ];
}
