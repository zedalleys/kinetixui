import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardHeader, KxCardTitle, KxSeparator } from '../../lib/primitives';
import { KxAvatar, KxAvatarFallback } from '../../lib/display';

/**
 * The "Team members" block — see sign-in.ts for how block fixtures work.
 *
 * A real `<ul>` again, for the same reason as settings-list: the list component is in a later Angular wave,
 * and a list of people is a list.
 *
 * The row action reads "Remove" and carries the member's name in its accessible name, so a screen-reader
 * user hearing three identical "Remove" buttons in a row knows which one they are on. The visible word stays
 * short; the announced name is specific. `aria-label` here EXTENDS the visible text rather than replacing
 * something unlabelled, which is the case where overriding it is correct.
 */
// kx-block:start
@Component({
  selector: 'app-team-members-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxAvatar, KxAvatarFallback, KxButton, KxCard, KxCardHeader, KxCardTitle, KxSeparator],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Team</kx-card-title>
      </kx-card-header>
      <kx-separator />
      <ul class="rows">
        @for (member of team; track member.name) {
          <li>
            <kx-avatar>
              <kx-avatar-fallback>{{ member.initials }}</kx-avatar-fallback>
            </kx-avatar>
            <span class="text">
              <span class="name">{{ member.name }}</span>
              <span class="role">{{ member.role }}</span>
            </span>
            <button kxButton variant="Ghost" size="sm" [attr.aria-label]="'Remove ' + member.name" (click)="remove(member.name)">
              Remove
            </button>
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
      gap: var(--spacing-3);
      padding: var(--spacing-3) var(--spacing-4);
    }
    .rows li + li { border-block-start: var(--border-width-default) solid hsl(var(--border)); }
    .text { display: grid; gap: var(--spacing-1); margin-inline-end: auto; }
    .name { font: var(--text-body-md); color: hsl(var(--foreground)); }
    .role { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
  `,
})
export class TeamMembersBlock {
  readonly team = [
    { name: 'Ada Lovelace', role: 'Owner', initials: 'AL' },
    { name: 'Grace Hopper', role: 'Admin', initials: 'GH' },
    { name: 'Alan Turing', role: 'Member', initials: 'AT' },
  ];

  remove(_name: string): void {}
}
// kx-block:end
