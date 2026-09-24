import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxSeparator } from '../../lib/primitives';
import { KxAvatar, KxAvatarFallback } from '../../lib/display';
import { KxField, KxFieldDescription, KxFieldLabel, KxRadio, KxRadioGroup, KxTextarea } from '../../lib/forms';

/**
 * The "Profile form" block — see sign-in.ts for how block fixtures work.
 *
 * A radio group rather than a select: three mutually exclusive choices whose consequences differ, so all
 * three should be readable at once instead of hidden behind a closed control. `kx-radio` renders a real
 * `<input type="radio">` with a `<label for>`, which is what gives the group arrow-key navigation and makes
 * each whole row a click target.
 *
 * The group sits in a `<fieldset>` with a `<legend>`, so a screen reader announces "Who can see your profile"
 * before each option. Without it the three options are just three unrelated radios.
 */
// kx-block:start
@Component({
  selector: 'app-profile-form-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KxAvatar, KxAvatarFallback, KxButton, KxCard, KxCardContent, KxCardDescription, KxCardFooter,
    KxCardHeader, KxCardTitle, KxField, KxFieldDescription, KxFieldLabel, KxInput, KxRadio, KxRadioGroup,
    KxSeparator, KxTextarea,
  ],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Profile</kx-card-title>
        <kx-card-description>This is how you appear to other people.</kx-card-description>
      </kx-card-header>
      <kx-card-content class="body">
        <div class="identity">
          <kx-avatar class="photo">
            <kx-avatar-fallback>ZF</kx-avatar-fallback>
          </kx-avatar>
          <div class="identity-actions">
            <button kxButton variant="Outline" size="sm">Change photo</button>
            <span class="hint">JPG or PNG, up to 2&nbsp;MB.</span>
          </div>
        </div>

        <kx-field>
          <label kxFieldLabel for="pf-name">Display name</label>
          <input kxInput id="pf-name" autocomplete="name" value="Ziad Fteha" />
        </kx-field>

        <kx-field>
          <label kxFieldLabel for="pf-bio">Bio</label>
          <textarea kxTextarea id="pf-bio" rows="3">Building a five-platform design system.</textarea>
          <span kxFieldDescription>Shown under your name. Plain text.</span>
        </kx-field>

        <kx-separator />

        <fieldset class="visibility">
          <legend>Who can see your profile</legend>
          <kx-radio-group [(value)]="visibility">
            @for (option of options; track option.value) {
              <span class="option">
                <kx-radio [value]="option.value">{{ option.label }}</kx-radio>
                <span class="hint">{{ option.hint }}</span>
              </span>
            }
          </kx-radio-group>
        </fieldset>
      </kx-card-content>
      <kx-card-footer class="actions">
        <button kxButton variant="Ghost">Cancel</button>
        <button kxButton>Save changes</button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 32rem; }
    .body { display: grid; gap: var(--spacing-6); }
    .identity { display: flex; align-items: center; gap: var(--spacing-4); }
    .photo { inline-size: 3.5rem; block-size: 3.5rem; }
    .identity-actions { display: grid; gap: var(--spacing-1); justify-items: start; }
    .hint { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .visibility { margin: 0; padding: 0; border: 0; }
    .visibility legend { margin-block-end: var(--spacing-3); font: var(--text-label-sm); color: hsl(var(--foreground)); }
    .option { display: grid; gap: var(--spacing-1); }
    .option + .option { margin-block-start: var(--spacing-3); }
    .actions { display: flex; justify-content: flex-end; gap: var(--spacing-2); }
  `,
})
export class ProfileFormBlock {
  readonly visibility = signal('team');

  readonly options = [
    { value: 'everyone', label: 'Everyone', hint: 'Anyone with the link can see your profile.' },
    { value: 'team', label: 'Only my team', hint: 'People in your workspace.' },
    { value: 'nobody', label: 'Nobody', hint: 'Your profile stays hidden.' },
  ];
}
// kx-block:end
