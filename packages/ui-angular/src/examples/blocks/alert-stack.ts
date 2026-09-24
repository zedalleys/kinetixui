import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxAlert, KxAlertDescription, KxAlertTitle } from '../../lib/primitives';

/**
 * The "Alert stack" block — see sign-in.ts for how block fixtures work.
 *
 * Each status says what it is in words, so none of the three depends on colour to be understood. `kx-alert`
 * sets `role="alert"` only for the variants that carry urgency, which is why the neutral one does not
 * interrupt a screen-reader user for an informational note.
 */
// kx-block:start
@Component({
  selector: 'app-alert-stack-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxAlert, KxAlertDescription, KxAlertTitle],
  template: `
    <div class="stack">
      <kx-alert>
        <kx-alert-title>Heads up</kx-alert-title>
        <kx-alert-description>You can add components to your app using the CLI.</kx-alert-description>
      </kx-alert>
      <kx-alert variant="destructive">
        <kx-alert-title>Payment failed</kx-alert-title>
        <kx-alert-description>Update your billing details to keep your subscription active.</kx-alert-description>
      </kx-alert>
      <kx-alert variant="success">
        <kx-alert-title>Changes saved</kx-alert-title>
      </kx-alert>
    </div>
  `,
  styles: `
    .stack { display: grid; gap: var(--spacing-3); }
  `,
})
export class AlertStackBlock {}
// kx-block:end
