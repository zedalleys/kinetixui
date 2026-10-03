import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KxCard, KxCardContent, KxLabel } from './primitives';
import { KxRadio, KxRadioGroup } from './forms';
import { KxCheckbox, KxSegment, KxSegmentedControl, KxSwitch } from './toggles';

/**
 * The selection controls, rendered by Angular, in every state the selection-control contract names
 * (TOKENS.md, "Selection controls") — the subject `scripts/selection-visual.mjs` paints in Chromium.
 *
 * jsdom has no pixels, so nothing here is a visual claim. What this file contributes is the DOM: the markup,
 * classes and ARIA the real Angular templates produce for each state, so the browser gate measures the
 * package's own output rather than markup someone typed to look like it. Run with `KX_ANGULAR_RENDER_OUT`
 * set to a path, it also writes that DOM out for the gate. Each control carries `data-kx-case`, the same
 * keys the React `States` stories use, so one gate can address both.
 *
 * The assertions are what the gate's selectors rely on — if one of these stops being true the gate would
 * be measuring the wrong element, so it fails here first, with a readable message.
 */
@Component({
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
class SelectionStates {}

/**
 * A property is not an attribute. Angular binds `[checked]` and `[disabled]` on a native input as
 * properties, and `outerHTML` serialises attributes — so a checked radio would be written out unchecked.
 * Copying the live property onto the attribute is the only change made to Angular's output.
 */
function serialise(root: HTMLElement): string {
  for (const input of Array.from(root.querySelectorAll('input'))) {
    input.toggleAttribute('checked', input.checked);
    input.toggleAttribute('disabled', input.disabled);
  }
  return root.innerHTML;
}

describe('selection controls — rendered subject for check:selection-visual', () => {
  TestBed.configureTestingModule({ imports: [SelectionStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(SelectionStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders each checkbox state with the semantics the gate addresses', () => {
    expect(at('[data-kx-case="unchecked"] button.kx-checkbox').getAttribute('aria-checked')).toBe('false');
    expect(at('[data-kx-case="checked"] button.kx-checkbox').getAttribute('aria-checked')).toBe('true');
    expect(at('[data-kx-case="mixed"] button.kx-checkbox').getAttribute('aria-checked')).toBe('mixed');
    expect((at('kx-checkbox[data-kx-case="disabled"] button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the radios as real checked / unchecked / disabled inputs', () => {
    expect((at('kx-radio[data-kx-case="checked"] input') as HTMLInputElement).checked).toBe(true);
    expect((at('kx-radio[data-kx-case="unchecked"] input') as HTMLInputElement).checked).toBe(false);
    expect((at('kx-radio[data-kx-case="disabled"] input') as HTMLInputElement).disabled).toBe(true);
  });

  it('renders the switches on, off and disabled', () => {
    expect(at('kx-switch[data-kx-case="on"] button').getAttribute('aria-checked')).toBe('true');
    expect(at('kx-switch[data-kx-case="off"] button').getAttribute('aria-checked')).toBe('false');
    expect((at('kx-switch[data-kx-case="disabled"] button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders one chosen segment per control and a disabled one', () => {
    const page = at('[data-kx-case="page"]');
    expect(Array.from(page.querySelectorAll('input')).filter((i) => i.checked).map((i) => i.value)).toEqual(['week']);
    expect((page.querySelector('input[value="year"]') as HTMLInputElement).disabled).toBe(true);
  });

  it('writes the rendered DOM out when the gate asks for it', () => {
    const out = process.env['KX_ANGULAR_RENDER_OUT'];
    if (!out) return;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialise(root));
  });
});
