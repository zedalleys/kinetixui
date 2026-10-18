import { Component, signal } from '@angular/core';
import { KxRadio, KxRadioGroup } from '../lib/forms';
import { KxCheckbox, KxSwitch, KxToggle, KxToggleGroup, KxToggleGroupItem } from '../lib/toggles';

/**
 * The selection controls as live, interactive Angular components — the subject
 * `scripts/angular-selection-motion.mjs` drives in Chromium.
 *
 * The `selection` fixture renders the same controls in their resting states for the visual gate; this one
 * exists because motion can only be measured on a control that actually changes: every case here is
 * writable, so the gate clicks or types and reads the transition that runs. Each control carries
 * `data-kx-case`, the same keys the React stories and `scripts/switch-motion.mjs` use, so the two platforms
 * can be addressed by one vocabulary.
 *
 * The `direction` group mounts a switch in a subtree that follows the page, one that overrides it to ltr and
 * one that overrides it to rtl: the thumb travels along its own subtree's inline axis, and a gate that only
 * flipped the page would not catch a switch that read an ancestor's direction instead.
 */
@Component({
  selector: 'kx-fixture',
  imports: [KxCheckbox, KxSwitch, KxToggle, KxToggleGroup, KxToggleGroupItem, KxRadioGroup, KxRadio],
  template: `
    <div class="kx-motion-grid">
      <div class="kx-motion-group" data-kx-group="switch">
        <kx-switch data-kx-case="off" aria-label="Push notifications" />
        <kx-switch data-kx-case="on" [checked]="true" aria-label="Weekly digest" />
        <kx-switch data-kx-case="disabled" disabled aria-label="SMS alerts" />
        <kx-switch data-kx-case="disabled-on" disabled [checked]="true" aria-label="Receipts" />
      </div>

      <div class="kx-motion-group" data-kx-group="checkbox">
        <kx-checkbox data-kx-case="unchecked" aria-label="Product updates" />
        <kx-checkbox data-kx-case="checked" [checked]="true" aria-label="Security alerts" />
        <kx-checkbox data-kx-case="mixed" [indeterminate]="true" aria-label="All regions" />
        <kx-checkbox data-kx-case="disabled" disabled aria-label="Archive automatically" />
      </div>

      <div class="kx-motion-group" data-kx-group="radio">
        <kx-radio-group [(value)]="digest" aria-label="Digest frequency">
          <kx-radio value="daily" data-kx-case="unchecked">Daily</kx-radio>
          <kx-radio value="weekly" data-kx-case="checked">Weekly</kx-radio>
          <kx-radio value="never" data-kx-case="third">Never</kx-radio>
        </kx-radio-group>
        <kx-radio-group value="eu" disabled aria-label="Data region">
          <kx-radio value="eu" data-kx-case="disabled-checked">EU</kx-radio>
          <kx-radio value="us" data-kx-case="disabled">US</kx-radio>
        </kx-radio-group>
      </div>

      <div class="kx-motion-group" data-kx-group="toggle">
        <button kxToggle data-kx-case="off" aria-label="Bold" [(pressed)]="bold">B</button>
        <button kxToggle data-kx-case="on" aria-label="Italic" [(pressed)]="italic">I</button>
        <button kxToggle data-kx-case="outline" variant="outline" aria-label="Underline" [(pressed)]="underline">U</button>
        <button kxToggle data-kx-case="disabled" disabled aria-label="Strikethrough">S</button>
      </div>

      <div class="kx-motion-group" data-kx-group="toggle-group">
        <kx-toggle-group aria-label="Text style" [(value)]="marks">
          <kx-toggle-group-item value="bold" data-kx-case="multi-off">Bold</kx-toggle-group-item>
          <kx-toggle-group-item value="italic" data-kx-case="multi-on">Italic</kx-toggle-group-item>
        </kx-toggle-group>
        <kx-toggle-group type="single" aria-label="Alignment" [(value)]="align">
          <kx-toggle-group-item value="start" data-kx-case="single-on">Start</kx-toggle-group-item>
          <kx-toggle-group-item value="centre" data-kx-case="single-off">Centre</kx-toggle-group-item>
          <kx-toggle-group-item value="end" data-kx-case="single-third">End</kx-toggle-group-item>
        </kx-toggle-group>
      </div>

      <div class="kx-motion-group" data-kx-group="direction">
        @for (d of directions; track d.key) {
          <span class="kx-motion-row" [attr.dir]="d.dir">
            <kx-switch [attr.data-kx-case]="d.key + '-off'" [aria-label]="d.label" />
            <kx-switch [attr.data-kx-case]="d.key + '-on'" [checked]="true" [aria-label]="d.label + ', on'" />
          </span>
        }
      </div>
    </div>
  `,
})
export class SelectionMotion {
  readonly digest = signal('weekly');
  readonly bold = signal(false);
  readonly italic = signal(true);
  readonly underline = signal(false);
  readonly marks = signal<string[]>(['italic']);
  readonly align = signal('start');

  readonly directions = [
    { key: 'inherit', dir: null, label: 'Follows the page' },
    { key: 'ltr', dir: 'ltr', label: 'Left-to-right section' },
    { key: 'rtl', dir: 'rtl', label: 'Right-to-left section' },
  ];
}
