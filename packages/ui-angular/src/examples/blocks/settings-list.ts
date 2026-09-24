import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxCard, KxCardHeader, KxCardTitle, KxSeparator } from '../../lib/primitives';
import { KxSwitch } from '../../lib/toggles';

/**
 * The "Settings list" block — see sign-in.ts for how block fixtures work.
 *
 * There is no KinetixUI Angular list component yet — `list` is in the layout wave — so the rows are a real
 * `<ul>`. That is not a shortfall to apologise for: a settings group IS a list, semantic HTML says so for
 * free, and inventing a `kx-list` that does not exist is the one thing this architecture forbids.
 *
 * Each switch is named by its row through `aria-labelledby`, not by a hard-coded `aria-label`. That way the
 * accessible name is the visible name — change the row title and the announcement changes with it — and
 * "Email" is never read twice.
 */
// kx-block:start
@Component({
  selector: 'app-settings-list-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxCard, KxCardHeader, KxCardTitle, KxSeparator, KxSwitch],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Notifications</kx-card-title>
      </kx-card-header>
      <kx-separator />
      <ul class="rows">
        @for (row of rows; track row.id) {
          <li>
            <span class="text">
              <span [id]="row.id + '-label'" class="title">{{ row.title }}</span>
              <span class="description">{{ row.description }}</span>
            </span>
            <kx-switch [checked]="row.on()" (toggled)="row.on.set($event)" [attr.aria-labelledby]="row.id + '-label'" />
          </li>
        }
      </ul>
    </kx-card>
  `,
  styles: `
    .rows { margin: 0; padding: 0; list-style: none; }
    .rows li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-4);
      padding: var(--spacing-3) var(--spacing-4);
    }
    .rows li + li { border-block-start: var(--border-width-default) solid hsl(var(--border)); }
    .text { display: grid; gap: var(--spacing-1); }
    .title { font: var(--text-body-md); color: hsl(var(--foreground)); }
    .description { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
  `,
})
export class SettingsListBlock {
  readonly rows = [
    { id: 'email', title: 'Email', description: 'Product news and receipts', on: signal(true) },
    { id: 'push', title: 'Push', description: 'Activity on your projects', on: signal(true) },
    { id: 'sms', title: 'SMS', description: 'Only critical alerts', on: signal(false) },
  ];
}
// kx-block:end
