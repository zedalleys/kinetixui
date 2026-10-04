import { Component } from '@angular/core';
import { KxCard, KxCardContent, KxLabel } from '../lib/primitives';
import { KxNumberInput, KxPasswordInput } from '../lib/forms';
import { KxInputGroup, KxInputGroupButton, KxInputGroupInput, KxInputGroupText } from '../lib/input-group';
import { KxInputOtp } from '../lib/input-otp';

/**
 * InputGroup, InputOTP, NumberInput and PasswordInput — Angular's composite fields — rendered by Angular in every state
 * the composite-field contract names (TOKENS.md, "Composite fields"): the subject
 * `scripts/composite-visual.mjs` paints in Chromium.
 *
 * This component is mounted twice. `browser/` bootstraps it as a live Angular application in Chromium — the page
 * `scripts/composite-visual.mjs` measures, with the package's styles.css and the generated token CSS and nothing else — so
 * hover, focus, keyboard and state changes run through the real templates, bindings and change detection.
 * `src/lib/*-render.spec.ts` mounts the same class in jsdom and asserts the semantics the gate's selectors rely
 * on, so a selector that stops matching fails there first, with a readable message. Each field carries `data-kx-case` — the same keys the React `EntryStates` stories use.
 *
 * The invalid state is the inner input's `aria-invalid`, forwarded from the component, with the error text it
 * describes.
 */
@Component({
  selector: 'kx-fixture',
  imports: [KxCard, KxCardContent, KxInputGroup, KxInputGroupButton, KxInputGroupInput, KxInputGroupText, KxInputOtp, KxLabel, KxNumberInput, KxPasswordInput],
  template: `
    <div class="kx-render-grid">
      <kx-card data-kx-kind="input-group">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field">
            <label kxLabel for="ig-rest">Website</label>
            <kx-input-group data-kx-case="rest"><kx-input-group-text>https://</kx-input-group-text><input kxInputGroupInput id="ig-rest" placeholder="kinetixui.com" /></kx-input-group>
          </div>
          <div class="kx-render-field">
            <label kxLabel for="ig-filled">Docs site</label>
            <kx-input-group data-kx-case="filled"><kx-input-group-text>https://</kx-input-group-text><input kxInputGroupInput id="ig-filled" value="docs.kinetixui.com" /></kx-input-group>
          </div>
          <div class="kx-render-field">
            <label kxLabel for="ig-invalid">Status page</label>
            <kx-input-group data-kx-case="invalid"><kx-input-group-text>https://</kx-input-group-text><input kxInputGroupInput id="ig-invalid" value="status kinetix" aria-invalid="true" aria-describedby="ig-invalid-error" /></kx-input-group>
            <p id="ig-invalid-error" class="kx-render-error">Enter a domain without spaces.</p>
          </div>
          <div class="kx-render-field">
            <label kxLabel for="ig-readonly">Invite link</label>
            <kx-input-group data-kx-case="readonly"><input kxInputGroupInput id="ig-readonly" value="kinetixui.com/invite/7Q2X" readonly /></kx-input-group>
          </div>
          <div class="kx-render-field">
            <label kxLabel for="ig-button">Share link</label>
            <kx-input-group data-kx-case="with-button"><input kxInputGroupInput id="ig-button" value="kinetixui.com/s/q3" /><button kxInputGroupButton data-kx-part="button">Copy</button></kx-input-group>
          </div>
          <div class="kx-render-field">
            <label kxLabel for="ig-disabled">Custom domain (Pro)</label>
            <kx-input-group data-kx-case="disabled"><kx-input-group-text>https://</kx-input-group-text><input kxInputGroupInput id="ig-disabled" value="app.example.com" disabled /></kx-input-group>
          </div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="input-otp">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="otp-rest-label">Verification code</span><kx-input-otp data-kx-case="rest" aria-labelledby="otp-rest-label" /></div>
          <div class="kx-render-field">
            <span kxLabel id="otp-invalid-label">Backup code</span>
            <kx-input-otp data-kx-case="invalid" aria-labelledby="otp-invalid-label" value="481" aria-invalid="true" aria-describedby="otp-invalid-error" />
            <p id="otp-invalid-error" class="kx-render-error">That code has expired.</p>
          </div>
          <div class="kx-render-field"><span kxLabel id="otp-disabled-label">Recovery code (sent)</span><kx-input-otp data-kx-case="disabled" aria-labelledby="otp-disabled-label" value="1234" [disabled]="true" /></div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="number-input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="ni-rest-label">Seats</span><kx-number-input data-kx-case="rest" aria-labelledby="ni-rest-label" [value]="4" [min]="1" /></div>
          <div class="kx-render-field">
            <span kxLabel id="ni-invalid-label">Guests</span>
            <kx-number-input data-kx-case="invalid" aria-labelledby="ni-invalid-label" [value]="12" [aria-invalid]="'true'" [aria-describedby]="'ni-invalid-error'" />
            <p id="ni-invalid-error" class="kx-render-error">This room holds 10 people at most.</p>
          </div>
          <div class="kx-render-field"><span kxLabel id="ni-readonly-label">Plan seats</span><kx-number-input data-kx-case="readonly" aria-labelledby="ni-readonly-label" [value]="20" readonly /></div>
          <div class="kx-render-field"><span kxLabel id="ni-disabled-label">Admins (locked)</span><kx-number-input data-kx-case="disabled" aria-labelledby="ni-disabled-label" [value]="2" [disabled]="true" /></div>
        </kx-card-content>
      </kx-card>
      <kx-card data-kx-kind="password-input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="pw-rest-label">Password</span><kx-password-input data-kx-case="rest" aria-labelledby="pw-rest-label" /></div>
          <div class="kx-render-field">
            <span kxLabel id="pw-invalid-label">New password</span>
            <kx-password-input data-kx-case="invalid" aria-labelledby="pw-invalid-label" value="kinetix" [aria-invalid]="'true'" [aria-describedby]="'pw-invalid-error'" />
            <p id="pw-invalid-error" class="kx-render-error">Use at least 12 characters.</p>
          </div>
          <div class="kx-render-field"><span kxLabel id="pw-disabled-label">Service password (managed)</span><kx-password-input data-kx-case="disabled" aria-labelledby="pw-disabled-label" value="managed-secret" [disabled]="true" /></div>
        </kx-card-content>
      </kx-card>
    </div>
  `,
})
export class CompositeStates {}
