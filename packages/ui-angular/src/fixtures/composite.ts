import { Component } from '@angular/core';
import { KxCard, KxCardContent, KxLabel } from '../lib/primitives';
import { KxNumberInput, KxPasswordInput } from '../lib/forms';

/**
 * NumberInput and PasswordInput — Angular's implemented composite fields — rendered by Angular in every state
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
  imports: [KxCard, KxCardContent, KxLabel, KxNumberInput, KxPasswordInput],
  template: `
    <div class="kx-render-grid">
      <kx-card data-kx-kind="number-input">
        <kx-card-content class="kx-render-stack">
          <div class="kx-render-field"><span kxLabel id="ni-rest-label">Seats</span><kx-number-input data-kx-case="rest" aria-labelledby="ni-rest-label" [value]="4" [min]="1" /></div>
          <div class="kx-render-field">
            <span kxLabel id="ni-invalid-label">Guests</span>
            <kx-number-input data-kx-case="invalid" aria-labelledby="ni-invalid-label" [value]="12" [aria-invalid]="'true'" [aria-describedby]="'ni-invalid-error'" />
            <p id="ni-invalid-error" class="kx-render-error">This room holds 10 people at most.</p>
          </div>
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
