import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxBadge, KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle, KxSeparator } from '../../lib/primitives';
import { KxSwitch } from '../../lib/toggles';

/**
 * The "Account security" block — see sign-in.ts for how block fixtures work.
 *
 * Three security controls that people actually look for in one place, each stating its consequence rather
 * than only its name: what two-factor will do, what a recovery code is for, and where each session is.
 *
 * The switch is named by its own visible heading through `aria-labelledby`, so the accessible name IS the
 * visible name and changes with it. The "Revoke" buttons keep a short visible word but announce which
 * session they end — three identical "Revoke" buttons in a row are useless to a screen-reader user.
 *
 * Sessions are a real `<ul>` inside a `<section>` with `aria-labelledby`, so the heading is announced before
 * the list and the list reports its own length.
 */
// kx-block:start
@Component({
  selector: 'app-account-security-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxBadge, KxButton, KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle, KxSeparator, KxSwitch],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Security</kx-card-title>
        <kx-card-description>Keep your account safe.</kx-card-description>
      </kx-card-header>
      <kx-card-content class="body">
        <div class="row">
          <span class="text">
            <span id="sec-2fa-label" class="title">Two-factor authentication</span>
            <span class="hint">Required for every new sign-in.</span>
          </span>
          <kx-switch [(checked)]="twoFactor" aria-labelledby="sec-2fa-label" />
        </div>

        <kx-separator />

        <div class="row">
          <span class="text">
            <span class="title">Recovery codes</span>
            <span class="hint">Single-use codes for when you lose your phone.</span>
          </span>
          <span class="trailing">
            <kx-badge variant="secondary">8 unused</kx-badge>
            <button kxButton variant="Outline" size="sm">Regenerate</button>
          </span>
        </div>

        <kx-separator />

        <section class="sessions" aria-labelledby="sec-sessions-heading">
          <h3 id="sec-sessions-heading" class="title">Active sessions</h3>
          <ul>
            @for (session of sessions; track session.id) {
              <li class="row">
                <span class="text">
                  <span>{{ session.device }}</span>
                  <span class="hint">{{ session.detail }}</span>
                </span>
                @if (session.current) {
                  <kx-badge>This device</kx-badge>
                } @else {
                  <button kxButton variant="Ghost" size="sm" [attr.aria-label]="'Revoke ' + session.device">Revoke</button>
                }
              </li>
            }
          </ul>
        </section>
      </kx-card-content>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 32rem; }
    .body { display: grid; gap: var(--spacing-4); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4); }
    .text { display: grid; gap: var(--spacing-1); }
    .title { font: var(--text-label-sm); color: hsl(var(--foreground)); }
    .hint { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .trailing { display: flex; flex-shrink: 0; align-items: center; gap: var(--spacing-2); }
    .sessions { display: grid; gap: var(--spacing-3); }
    .sessions h3 { margin: 0; }
    .sessions ul { display: grid; gap: var(--spacing-3); margin: 0; padding: 0; list-style: none; }
  `,
})
export class AccountSecurityBlock {
  readonly twoFactor = signal(true);

  readonly sessions = [
    { id: 'mbp', device: 'MacBook Pro', detail: 'Chrome · Berlin · now', current: true },
    { id: 'iphone', device: 'iPhone 15', detail: 'Safari · Berlin · 2 hours ago', current: false },
  ];
}
// kx-block:end
