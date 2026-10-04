import { Component } from '@angular/core';
import { KxCard, KxCardContent, KxInput, KxLabel } from '../lib/primitives';
import { KxNativeSelect, KxTextarea } from '../lib/forms';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from '../lib/tabs';

/**
 * Input, Textarea, NativeSelect and Tabs, rendered by Angular, in every state the text-entry and navigation
 * contract names (TOKENS.md, "Text entry and navigation") — the subject `scripts/entry-visual.mjs` paints in
 * Chromium.
 *
 * This component is mounted twice. `browser/` bootstraps it as a live Angular application in Chromium — the page
 * `scripts/entry-visual.mjs` measures, with the package's styles.css and the generated token CSS and nothing
 * else — so hover, focus, keyboard and state changes run through the real templates, bindings and change
 * detection. `src/lib/*-render.spec.ts` mounts the same class in jsdom and asserts the semantics the gate's
 * selectors rely on, so a selector that stops matching fails there first, with a readable message. Each field
 * carries `data-kx-case`, the same keys the React `EntryStates` stories use, inside a group named by
 * `data-kx-kind`, so one gate can address both platforms.
 */
@Component({
  selector: 'kx-fixture',
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
export class EntryStates {
  readonly selects = [
    { key: 'rest', label: 'Country', value: '' },
    { key: 'filled', label: 'Time zone', value: 'utc' },
    { key: 'invalid', label: 'Plan', value: '' },
    { key: 'disabled', label: 'Data region (locked)', value: 'utc' },
  ];
}
