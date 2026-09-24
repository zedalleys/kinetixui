import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxLabel } from '../../lib/primitives';
import { KxCheckbox } from '../../lib/toggles';
import { KxPasswordInput } from '../../lib/forms';

/**
 * The "Sign in" block — a KinetixUI composition, in Angular.
 *
 * This file is the canonical source for the Angular tab of kinetixui.com/blocks/sign-in: `pnpm gen:blocks`
 * extracts the `kx-block` region, and `pnpm check:blocks` fails if the site and this file disagree. It lives
 * under `src/`, so `ng-packagr` compiles it with `strictTemplates` — the template is type-checked, every
 * component in it is a real export, and `blocks.spec.ts` renders it. There is no hand-written tier.
 *
 * Composition, not a port. Angular brings its own form layer, so the block is built on `ReactiveFormsModule`
 * rather than on a KinetixUI form wrapper — that is the `native-equivalent` guidance the `form` component
 * carries, applied. Validation state comes from the form model and reaches the control through
 * `aria-invalid`, so the semantics and the styling cannot disagree.
 */
// kx-block:start
@Component({
  selector: 'app-sign-in-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    KxButton,
    KxCard,
    KxCardContent,
    KxCardDescription,
    KxCardFooter,
    KxCardHeader,
    KxCardTitle,
    KxCheckbox,
    KxInput,
    KxLabel,
    KxPasswordInput,
  ],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Sign in</kx-card-title>
        <kx-card-description>Enter your email to sign in to your account.</kx-card-description>
      </kx-card-header>

      <form [formGroup]="form" (ngSubmit)="signIn()">
        <kx-card-content>
          <label kxLabel for="signin-email">Email</label>
          <input
            kxInput
            id="signin-email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            formControlName="email"
            [attr.aria-invalid]="email.touched && email.invalid"
          />

          <label kxLabel for="signin-password">Password</label>
          <kx-password-input formControlName="password" aria-labelledby="signin-password-label" />
          <span id="signin-password-label" class="kx-sr-only">Password</span>

          <kx-checkbox formControlName="remember" aria-label="Remember me" />
        </kx-card-content>

        <kx-card-footer>
          <button kxButton type="submit" [disabled]="form.invalid">Sign in</button>
          <button kxButton type="button" variant="Outline" (click)="continueWithProvider()">
            Continue with GitHub
          </button>
        </kx-card-footer>
      </form>
    </kx-card>
  `,
})
export class SignInBlock {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(true, { nonNullable: true }),
  });

  get email() {
    return this.form.controls.email;
  }

  signIn(): void {
    if (this.form.valid) console.log(this.form.getRawValue());
  }

  continueWithProvider(): void {}
}
// kx-block:end
