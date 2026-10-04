import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KxCard, KxCardContent, KxInput, KxLabel } from './primitives';
import { KxNativeSelect, KxTextarea } from './forms';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from './tabs';

/**
 * Input, Textarea, NativeSelect and Tabs, rendered by Angular, in every state the text-entry and navigation
 * contract names (TOKENS.md, "Text entry and navigation") — the subject `scripts/entry-visual.mjs` paints in
 * Chromium.
 *
 * jsdom has no pixels, so nothing here is a visual claim. What this file contributes is the DOM: the markup,
 * classes and ARIA the real Angular templates produce for each state, so the browser gate measures the
 * package's own output. Run with `KX_ANGULAR_RENDER_OUT` set to a path, it also writes that DOM out for the
 * gate. Each field carries `data-kx-case`, the same keys the React `EntryStates` stories use, inside a group
 * named by `data-kx-kind`, so one gate can address both platforms.
 *
 * The assertions are what the gate's selectors rely on — if one stops being true the gate would measure the
 * wrong element, so it fails here first, with a readable message.
 */
@Component({
  imports: [KxCard, KxCardContent, KxLabel, KxInput, KxTextarea, KxNativeSelect, KxTabs, KxTabList, KxTab, KxTabPanel],
  template: `
    <div class="kx-render-grid">
      <kx-card data-kx-kind="input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><label kxLabel for="in-rest">Display name</label><input kxInput id="in-rest" data-kx-case="rest" placeholder="e.g. Ada Lovelace" /></div>
          <div class="kx-render-field"><label kxLabel for="in-filled">Email</label><input kxInput id="in-filled" data-kx-case="filled" type="email" value="ada@example.com" /></div>
          <div class="kx-render-field">
            <label kxLabel for="in-invalid">Username</label>
            <input kxInput id="in-invalid" data-kx-case="invalid" aria-invalid="true" aria-describedby="in-invalid-error" value="ada lovelace" />
            <p id="in-invalid-error" class="kx-render-error">Use letters, numbers and dashes only.</p>
          </div>
          <div class="kx-render-field"><label kxLabel for="in-readonly">Account ID</label><input kxInput id="in-readonly" data-kx-case="readonly" readonly value="acct_7Q2X9" /></div>
          <div class="kx-render-field"><label kxLabel for="in-disabled">Organisation</label><input kxInput id="in-disabled" data-kx-case="disabled" disabled value="Managed by your admin" /></div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="textarea">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><label kxLabel for="ta-rest">Bio</label><textarea kxTextarea id="ta-rest" data-kx-case="rest" rows="3" placeholder="A sentence or two about you"></textarea></div>
          <div class="kx-render-field"><label kxLabel for="ta-filled">Shipping notes</label><textarea kxTextarea id="ta-filled" data-kx-case="filled" rows="3">Leave at the side door.</textarea></div>
          <div class="kx-render-field">
            <label kxLabel for="ta-invalid">Reason for refund</label>
            <textarea kxTextarea id="ta-invalid" data-kx-case="invalid" rows="3" aria-invalid="true" aria-describedby="ta-invalid-error">No</textarea>
            <p id="ta-invalid-error" class="kx-render-error">Tell us a little more, at least 20 characters.</p>
          </div>
          <div class="kx-render-field"><label kxLabel for="ta-readonly">Signed agreement</label><textarea kxTextarea id="ta-readonly" data-kx-case="readonly" rows="3" readonly>Accepted on 2 October.</textarea></div>
          <div class="kx-render-field"><label kxLabel for="ta-disabled">Admin note</label><textarea kxTextarea id="ta-disabled" data-kx-case="disabled" rows="3" disabled>Only admins can edit this.</textarea></div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="native-select">
        <kx-card-content class="kx-render-stack">
          @for (f of selects; track f.key) {
            <div class="kx-render-field">
              <label kxLabel [for]="'nsel-' + f.key">{{ f.label }}</label>
              <select
                kxNativeSelect
                [id]="'nsel-' + f.key"
                [attr.data-kx-case]="f.key"
                [attr.aria-invalid]="f.key === 'invalid' ? 'true' : null"
                [attr.aria-describedby]="f.key === 'invalid' ? 'nsel-invalid-error' : null"
                [disabled]="f.key === 'disabled'"
              >
                <option value="" disabled [selected]="!f.value">Choose one</option>
                <option value="utc" [selected]="f.value === 'utc'">UTC</option>
                <option value="cet">Central European Time</option>
              </select>
              @if (f.key === 'invalid') {
                <p id="nsel-invalid-error" class="kx-render-error">Choose a plan to continue.</p>
              }
            </div>
          }
        </kx-card-content>
      </kx-card>
      <kx-tabs value="overview">
        <kx-tab-list aria-label="Project" data-kx-case="page">
          <button kxTab value="overview" data-kx-case="selected">Overview</button>
          <button kxTab value="activity" data-kx-case="unselected">Activity</button>
          <button kxTab value="billing" data-kx-case="disabled" [disabled]="true">Billing</button>
        </kx-tab-list>
        <kx-tab-panel value="overview">Three deployments this week.</kx-tab-panel>
        <kx-tab-panel value="activity">No new activity.</kx-tab-panel>
      </kx-tabs>
      <kx-card>
        <kx-card-content>
          <kx-tabs value="members">
            <kx-tab-list aria-label="Workspace" data-kx-case="card">
              <button kxTab value="members" data-kx-case="selected">Members</button>
              <button kxTab value="roles" data-kx-case="unselected">Roles</button>
              <button kxTab value="audit" data-kx-case="disabled" [disabled]="true">Audit</button>
            </kx-tab-list>
            <kx-tab-panel value="members">Four members.</kx-tab-panel>
            <kx-tab-panel value="roles">Two roles.</kx-tab-panel>
          </kx-tabs>
        </kx-card-content>
      </kx-card>
    </div>
  `,
})
class EntryStates {
  readonly selects = [
    { key: 'rest', label: 'Country', value: '' },
    { key: 'filled', label: 'Time zone', value: 'utc' },
    { key: 'invalid', label: 'Plan', value: '' },
    { key: 'disabled', label: 'Data region (locked)', value: 'utc' },
  ];
}

/**
 * A property is not an attribute. Angular binds `[disabled]` and `[selected]` as properties, and `outerHTML`
 * serialises attributes — so a disabled select would be written out enabled, and a textarea's typed text
 * lives in its value, not its markup. Copying the live property onto the attribute is the only change made to
 * Angular's output.
 */
function serialise(root: HTMLElement): string {
  for (const el of Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input, select, textarea, button'))) {
    el.toggleAttribute('disabled', el.disabled);
  }
  for (const option of Array.from(root.querySelectorAll('option'))) option.toggleAttribute('selected', option.selected);
  return root.innerHTML;
}

describe('text entry and tabs — rendered subject for check:entry-visual', () => {
  TestBed.configureTestingModule({ imports: [EntryStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(EntryStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders every field state with the semantics the gate addresses', () => {
    for (const kind of ['input', 'textarea', 'native-select']) {
      const field = (c: string) => at(`[data-kx-kind="${kind}"] [data-kx-case="${c}"]`);
      expect(field('rest'), `${kind} rest`).toBeTruthy();
      expect(field('filled'), `${kind} filled`).toBeTruthy();
      expect(field('invalid').getAttribute('aria-invalid'), `${kind} invalid`).toBe('true');
      expect((field('disabled') as HTMLInputElement).disabled, `${kind} disabled`).toBe(true);
    }
    expect((at('[data-kx-kind="input"] [data-kx-case="readonly"]') as HTMLInputElement).readOnly).toBe(true);
    expect((at('[data-kx-kind="textarea"] [data-kx-case="readonly"]') as HTMLTextAreaElement).readOnly).toBe(true);
    expect((at('[data-kx-kind="native-select"] [data-kx-case="rest"]') as HTMLSelectElement).value).toBe('');
    expect((at('[data-kx-kind="native-select"] [data-kx-case="filled"]') as HTMLSelectElement).value).toBe('utc');
  });

  it('renders each tab strip with one selected tab and a disabled one', () => {
    for (const where of ['page', 'card']) {
      const tab = (c: string) => at(`kx-tab-list[data-kx-case="${where}"] [data-kx-case="${c}"]`);
      expect(tab('selected').getAttribute('aria-selected'), `${where} selected`).toBe('true');
      expect(tab('unselected').getAttribute('aria-selected'), `${where} unselected`).toBe('false');
      expect((tab('disabled') as HTMLButtonElement).disabled, `${where} disabled`).toBe(true);
    }
  });

  it('writes the rendered DOM out when the gate asks for it', () => {
    const out = process.env['KX_ANGULAR_RENDER_OUT'];
    if (!out) return;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialise(root));
  });
});
