import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle, KxInput, KxLabel, KxProgress } from '../../lib/primitives';
import { KxCheckbox } from '../../lib/toggles';
import { KxField, KxFieldDescription, KxFieldLabel, KxPasswordInput } from '../../lib/forms';

/**
 * The "Create account" block — see sign-in.ts for how block fixtures work.
 *
 * Four independent rules rather than one length check: a meter that only counts characters rewards a long
 * common word, which is exactly what a dictionary attack is good at. Because the rules are data, the hint can
 * name what is still missing instead of saying "weak" and leaving the reader to guess.
 *
 * `kx-progress` takes `valueText`, so the meter announces "Fair" rather than "50" — the percentage is an
 * implementation detail and reading it aloud tells a screen-reader user nothing they can act on.
 *
 * The checkbox is named by a real `<label for>`, not an `aria-label`, so clicking the sentence toggles it —
 * the target is the sentence, not the 16px box.
 */
// kx-block:start
const RULES: ReadonlyArray<{ label: string; met: (password: string) => boolean }> = [
  { label: '12 characters', met: (p) => p.length >= 12 },
  { label: 'an upper and a lower case letter', met: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'a number', met: (p) => /\d/.test(p) },
  { label: 'a symbol', met: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

@Component({
  selector: 'app-create-account-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KxButton, KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle,
    KxCheckbox, KxField, KxFieldDescription, KxFieldLabel, KxInput, KxLabel, KxPasswordInput, KxProgress,
  ],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Create your account</kx-card-title>
        <kx-card-description>Free for 14 days. No card required.</kx-card-description>
      </kx-card-header>
      <kx-card-content class="body">
        <kx-field>
          <label kxFieldLabel for="ca-email">Email</label>
          <input kxInput id="ca-email" type="email" autocomplete="email" placeholder="you@example.com" />
        </kx-field>

        <kx-field>
          <label kxFieldLabel for="ca-password">Password</label>
          <kx-password-input id="ca-password" autocomplete="new-password" [(value)]="password" />
          <kx-progress class="meter" [value]="percent()" [valueText]="strength()" aria-label="Password strength" />
          <span kxFieldDescription>{{ hint() }}</span>
        </kx-field>

        <span class="terms">
          <kx-checkbox id="ca-terms" [(checked)]="accepted" />
          <label kxLabel for="ca-terms" class="terms-text">I agree to the terms of service and the privacy policy.</label>
        </span>

        <button kxButton class="submit" [disabled]="!accepted() || missing().length > 0">Create account</button>
      </kx-card-content>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 24rem; }
    .body { display: grid; gap: var(--spacing-4); }
    .meter { block-size: 0.25rem; }
    .terms { display: flex; align-items: flex-start; gap: var(--spacing-2); }
    .terms-text { font: var(--text-body-sm); font-weight: 400; color: hsl(var(--muted-foreground)); }
    .submit { inline-size: 100%; }
  `,
})
export class CreateAccountBlock {
  readonly password = signal('');
  readonly accepted = signal(false);

  readonly missing = computed(() => RULES.filter((rule) => !rule.met(this.password())));
  readonly percent = computed(() => ((RULES.length - this.missing().length) / RULES.length) * 100);
  readonly strength = computed(() => STRENGTH[RULES.length - this.missing().length]);
  readonly hint = computed(() => {
    const missing = this.missing();
    return missing.length === 0 ? 'Strong password.' : `Still needs ${missing.map((rule) => rule.label).join(', ')}.`;
  });
}
// kx-block:end
