/**
 * The clean Angular consumer.
 *
 * Generated into a temp directory rather than committed, so it cannot drift into being "part of the
 * repository" that resolves KinetixUI through a workspace link. It has no reference to this
 * monorepo: no `paths` mapping, no `file:` link to `packages/ui-angular`, no pnpm workspace above
 * it. The only way `@kinetixui/angular` resolves here is the packed tarball it installs, which is
 * the entire point — if the package's own metadata is wrong, this build fails.
 *
 * The template is not invented. Every region is markup that already exists in
 * `packages/ui-angular/src/usage/examples.ts`, where the Angular compiler type-checks it under
 * `strictTemplates` and a spec renders it. Copying it here means this fixture exercises the real
 * documented API, and cannot quietly demonstrate something that does not work.
 */

/** Components chosen to cover different implementation shapes, not to maximise the count. */
export const EXERCISED = [
  "KxButton — attribute directive on a native <button>",
  "KxCard + header/title/description/content/footer — content projection",
  "KxInput + KxLabel — native element directives",
  "KxField + KxFieldLabel + KxFieldMessage + reactive forms — ControlValueAccessor territory",
  "KxSwitch — two-way [(checked)] model binding",
  "KxTag — variant input and a (removed) output",
  "KxTabs + KxTabList + KxTab + KxTabPanel — compound component with two-way [(value)]",
  "KxBadge, KxSeparator, KxSpinner — simple leaf components",
];

const appComponent = `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  KxBadge,
  KxButton,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardFooter,
  KxCardHeader,
  KxCardTitle,
  KxField,
  KxFieldLabel,
  KxFieldMessage,
  KxInput,
  KxLabel,
  KxSeparator,
  KxSpinner,
  KxSwitch,
  KxTab,
  KxTabList,
  KxTabPanel,
  KxTabs,
  KxTag,
} from '@kinetixui/angular';
import type { KxButtonVariant, KxTagVariant } from '@kinetixui/angular';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    KxBadge,
    KxButton,
    KxCard,
    KxCardContent,
    KxCardDescription,
    KxCardFooter,
    KxCardHeader,
    KxCardTitle,
    KxField,
    KxFieldLabel,
    KxFieldMessage,
    KxInput,
    KxLabel,
    KxSeparator,
    KxSpinner,
    KxSwitch,
    KxTab,
    KxTabList,
    KxTabPanel,
    KxTabs,
    KxTag,
  ],
  template: \`
    <button kxButton>Button</button>
    <button kxButton [variant]="variant()">Variant</button>
    <kx-badge>Badge</kx-badge>
    <kx-separator />
    <kx-spinner />

    <kx-card>
      <kx-card-header>
        <kx-card-title>Create project</kx-card-title>
        <kx-card-description>Deploy your new project in one click.</kx-card-description>
      </kx-card-header>
      <kx-card-content>
        <label kxLabel for="name">Name</label>
        <input kxInput id="name" placeholder="Name of your project" />
      </kx-card-content>
      <kx-card-footer>
        <button kxButton>Deploy</button>
      </kx-card-footer>
    </kx-card>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <kx-field>
        <label kxFieldLabel for="email">Email</label>
        <input kxInput id="email" formControlName="email" [attr.aria-invalid]="email.invalid && email.touched" />
        @if (email.invalid && email.touched) {
          <kx-field-message variant="error">Enter a valid address.</kx-field-message>
        }
      </kx-field>
      <button kxButton type="submit" [disabled]="form.invalid">Sign up</button>
    </form>

    <kx-switch [(checked)]="notifications" aria-label="Notifications" />

    <kx-tag>Design</kx-tag>
    <kx-tag [variant]="tagVariant()" removable (removed)="drop()">Research</kx-tag>

    <kx-tabs [(value)]="tab">
      <kx-tab-list aria-label="Settings">
        <button kxTab value="account">Account</button>
        <button kxTab value="password">Password</button>
      </kx-tab-list>
      <kx-tab-panel value="account">Make changes to your account here.</kx-tab-panel>
      <kx-tab-panel value="password">Change your password here.</kx-tab-panel>
    </kx-tabs>
  \`,
})
export class AppComponent {
  // Typed against the package's own exported unions, so a broken type export fails the build.
  // KxButtonVariant is capitalised: it mirrors the React package's Button variants, which take
  // their names from the design source. The other unions are lowercase.
  readonly variant = signal<KxButtonVariant>('Secondary');
  readonly tagVariant = signal<KxTagVariant>('outline');
  readonly notifications = signal(true);
  readonly tab = signal('account');
  readonly dropped = signal(0);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  get email() {
    return this.form.controls.email;
  }

  drop(): void {
    this.dropped.update((n) => n + 1);
  }

  submit(): void {
    if (this.form.valid) this.dropped.set(0);
  }
}
`;

const main = `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app';

bootstrapApplication(AppComponent).catch((error: unknown) => {
  console.error(error);
});
`;

// The documented token imports, which is the thing being tested: importing only globals.css leaves
// the elevation and typography ramps undefined.
const styles = `@import "@kinetixui/tokens/css";
@import "@kinetixui/tokens/css/extras";
@import "@kinetixui/angular/styles.css";
`;

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KinetixUI Angular consumer</title>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`;

const tsconfig = {
  compilerOptions: {
    strict: true,
    noImplicitOverride: true,
    noPropertyAccessFromIndexSignature: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    skipLibCheck: false,
    isolatedModules: true,
    experimentalDecorators: true,
    moduleResolution: "bundler",
    target: "ES2022",
    module: "preserve",
    lib: ["ES2022", "dom"],
  },
  angularCompilerOptions: {
    enableI18nLegacyMessageIdFormat: false,
    strictInjectionParameters: true,
    strictInputAccessModifiers: true,
    typeCheckHostBindings: true,
    strictTemplates: true,
  },
  files: ["src/main.ts"],
};

/** `@angular/build:application`, the Angular 21 builder — a real production build, not a bundle-free tsc. */
const angularJson = (name) => ({
  $schema: "./node_modules/@angular/cli/lib/config/schema.json",
  version: 1,
  projects: {
    [name]: {
      projectType: "application",
      root: "",
      sourceRoot: "src",
      architect: {
        build: {
          builder: "@angular/build:application",
          options: {
            outputPath: "dist",
            index: "src/index.html",
            browser: "src/main.ts",
            tsConfig: "tsconfig.json",
            styles: ["src/styles.css"],
          },
          configurations: {
            production: { optimization: true, outputHashing: "all", sourceMap: false },
          },
          defaultConfiguration: "production",
        },
      },
    },
  },
});

/**
 * The files of the consumer application.
 *
 * @param {{name: string, angular: string}} options
 * @returns {Record<string, string>} path → contents
 */
export function consumerFiles({ name = "kinetixui-angular-consumer", angular = "^21.0.0" } = {}) {
  return {
    "package.json": `${JSON.stringify(
      {
        name,
        version: "0.0.0",
        private: true,
        type: "module",
        scripts: { build: "ng build" },
        dependencies: {
          "@angular/common": angular,
          "@angular/compiler": angular,
          "@angular/core": angular,
          "@angular/forms": angular,
          "@angular/platform-browser": angular,
          rxjs: "^7.8.0",
          tslib: "^2.8.1",
          "zone.js": "^0.15.0",
        },
        devDependencies: {
          "@angular/build": angular,
          "@angular/cli": angular,
          "@angular/compiler-cli": angular,
          typescript: "~5.9.0",
        },
      },
      null,
      2,
    )}\n`,
    "angular.json": `${JSON.stringify(angularJson(name), null, 2)}\n`,
    "tsconfig.json": `${JSON.stringify(tsconfig, null, 2)}\n`,
    "src/main.ts": main,
    "src/app.ts": appComponent,
    "src/styles.css": styles,
    "src/index.html": index,
  };
}
