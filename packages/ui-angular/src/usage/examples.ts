/**
 * The Angular examples the website shows on every component page.
 *
 * Nothing here is a string the site copies by hand. Each `<!-- kx-usage:<demo-key> -->` region is markup
 * inside a real template that the Angular compiler type-checks (`strictTemplates`) and that
 * `examples.spec.ts` renders — so an example cannot outlive the API it demonstrates, and cannot describe a
 * directive that was never exported. `scripts/gen-usage-examples.mjs` extracts the regions into
 * `usage-examples.generated.ts`, and `check:usage` fails when the two disagree.
 *
 * The demo keys match the React ones (`button-demo`, `avatar-demo`, …), which is what lines the Angular tab
 * up with the React tab on the same page.
 *
 * These components are deliberately NOT exported from `public-api.ts`. They are examples, not API —
 * `check:platform-source` reads the public API to decide what the manifest may claim, and an example
 * appearing there would let a demo masquerade as a component.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { KxButton } from '../lib/button';
import {
  KxAlert,
  KxAlertDescription,
  KxAlertTitle,
  KxBadge,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardFooter,
  KxCardHeader,
  KxCardTitle,
  KxInput,
  KxLabel,
  KxProgress,
  KxSeparator,
} from '../lib/primitives';
import {
  KxBanner,
  KxButtonGroup,
  KxButtonGroupSeparator,
  KxButtonGroupText,
  KxCircularProgress,
  KxCodeBlock,
  KxDescriptionList,
  KxDescriptionListItem,
  KxFab,
  KxImage,
  KxInform,
  KxList,
  KxListItem,
  KxMarquee,
  KxMarqueeContent,
  KxPageHeader,
  KxTimeline,
  KxTimelineItem,
} from '../lib/content';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from '../lib/tabs';
import {
  KxCheckbox,
  KxSegment,
  KxSegmentedControl,
  KxSwitch,
  KxToggle,
  KxToggleGroup,
  KxToggleGroupItem,
} from '../lib/toggles';
import {
  KxAspectRatio,
  KxAvatar,
  KxAvatarFallback,
  KxAvatarGroup,
  KxAvatarImage,
  KxEmpty,
  KxEmptyContent,
  KxEmptyDescription,
  KxEmptyHeader,
  KxEmptyMedia,
  KxEmptyTitle,
  KxKbd,
  KxKbdGroup,
  KxMetric,
  KxQuote,
  KxSkeleton,
  KxSpinner,
  KxTag,
} from '../lib/display';
import {
  KxField,
  KxFieldDescription,
  KxFieldLabel,
  KxFieldMessage,
  KxNativeSelect,
  KxNumberInput,
  KxPasswordInput,
  KxRadio,
  KxRadioGroup,
  KxSlider,
  KxTextarea,
} from '../lib/forms';

/* ── primitives ─────────────────────────────────────────────────────────── */

@Component({
  selector: 'kx-usage-primitives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KxAlert,
    KxAlertDescription,
    KxAlertTitle,
    KxBadge,
    KxButton,
    KxCard,
    KxCardContent,
    KxCardDescription,
    KxCardFooter,
    KxCardHeader,
    KxCardTitle,
    KxInput,
    KxLabel,
    KxProgress,
    KxSeparator,
    KxTab,
    KxTabList,
    KxTabPanel,
    KxTabs,
  ],
  template: `
    <!-- kx-usage:button-demo -->
    <button kxButton>Button</button>
    <!-- kx-usage:end -->

    <!-- kx-usage:badge-demo -->
    <kx-badge>Badge</kx-badge>
    <!-- kx-usage:end -->

    <!-- kx-usage:alert-demo -->
    <kx-alert>
      <kx-alert-title>Heads up!</kx-alert-title>
      <kx-alert-description>You can add components to your app using the CLI.</kx-alert-description>
    </kx-alert>
    <!-- kx-usage:end -->

    <!-- kx-usage:card-demo -->
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
        <button kxButton variant="Outline">Cancel</button>
        <button kxButton>Deploy</button>
      </kx-card-footer>
    </kx-card>
    <!-- kx-usage:end -->

    <!-- kx-usage:input-demo -->
    <input kxInput type="email" placeholder="Email" />
    <!-- kx-usage:end -->

    <!-- kx-usage:label-demo -->
    <label kxLabel for="terms">Accept terms and conditions</label>
    <!-- kx-usage:end -->

    <!-- kx-usage:progress-demo -->
    <kx-progress [value]="62" aria-label="Upload progress" />
    <!-- kx-usage:end -->

    <!-- kx-usage:separator-demo -->
    <kx-separator />
    <kx-separator orientation="vertical" />
    <!-- kx-usage:end -->

    <!-- kx-usage:tabs-demo -->
    <kx-tabs [(value)]="tab">
      <kx-tab-list aria-label="Settings">
        <button kxTab value="account">Account</button>
        <button kxTab value="password">Password</button>
      </kx-tab-list>
      <kx-tab-panel value="account">Make changes to your account here.</kx-tab-panel>
      <kx-tab-panel value="password">Change your password here.</kx-tab-panel>
    </kx-tabs>
    <!-- kx-usage:end -->
  `,
})
export class KxUsagePrimitives {
  tab = 'account';
}

/* ── display ────────────────────────────────────────────────────────────── */

@Component({
  selector: 'kx-usage-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KxAspectRatio,
    KxAvatar,
    KxAvatarFallback,
    KxAvatarGroup,
    KxAvatarImage,
    KxButton,
    KxEmpty,
    KxEmptyContent,
    KxEmptyDescription,
    KxEmptyHeader,
    KxEmptyMedia,
    KxEmptyTitle,
    KxKbd,
    KxKbdGroup,
    KxMetric,
    KxQuote,
    KxSkeleton,
    KxSpinner,
    KxTag,
  ],
  template: `
    <!-- kx-usage:aspect-ratio-demo -->
    <kx-aspect-ratio [ratio]="16 / 9">
      <img src="/cover.jpg" alt="" />
    </kx-aspect-ratio>
    <!-- kx-usage:end -->

    <!-- kx-usage:avatar-demo -->
    <kx-avatar>
      <img kxAvatarImage src="/ada.jpg" alt="Ada Lovelace" />
      <kx-avatar-fallback>AL</kx-avatar-fallback>
    </kx-avatar>
    <!-- kx-usage:end -->

    <!-- kx-usage:avatar-group-demo -->
    <kx-avatar-group [max]="3">
      @for (person of team; track person.name) {
        <kx-avatar>
          <img kxAvatarImage [src]="person.photo" [alt]="person.name" />
          <kx-avatar-fallback>{{ person.initials }}</kx-avatar-fallback>
        </kx-avatar>
      }
    </kx-avatar-group>
    <!-- kx-usage:end -->

    <!-- kx-usage:kbd-demo -->
    <kbd kxKbdGroup>
      <kbd kxKbd>Ctrl</kbd>
      <kbd kxKbd>K</kbd>
    </kbd>
    <!-- kx-usage:end -->

    <!-- kx-usage:skeleton-demo -->
    <kx-skeleton style="block-size: 1rem; inline-size: 60%" />
    <!-- kx-usage:end -->

    <!-- kx-usage:spinner-demo -->
    <kx-spinner size="lg" label="Loading projects…" />
    <!-- kx-usage:end -->

    <!-- kx-usage:tag-demo -->
    <kx-tag>Design</kx-tag>
    <kx-tag variant="outline" removable (removed)="drop('Research')">Research</kx-tag>
    <!-- kx-usage:end -->

    <!-- kx-usage:quote-demo -->
    <kx-quote author="Ada Lovelace" authorTitle="Mathematician">
      The Analytical Engine weaves algebraic patterns.
    </kx-quote>
    <!-- kx-usage:end -->

    <!-- kx-usage:metric-demo -->
    <kx-metric label="Revenue" value="$48,120" trend="up" change="+12.4%" />
    <!-- kx-usage:end -->

    <!-- kx-usage:empty-demo -->
    <kx-empty>
      <kx-empty-header>
        <kx-empty-media variant="icon">📁</kx-empty-media>
        <kx-empty-title>No projects yet</kx-empty-title>
        <kx-empty-description>Create one to get started.</kx-empty-description>
      </kx-empty-header>
      <kx-empty-content>
        <button kxButton>New project</button>
      </kx-empty-content>
    </kx-empty>
    <!-- kx-usage:end -->
  `,
})
export class KxUsageDisplay {
  readonly team = [
    { name: 'Ada Lovelace', initials: 'AL', photo: '/ada.jpg' },
    { name: 'Grace Hopper', initials: 'GH', photo: '/grace.jpg' },
    { name: 'Alan Turing', initials: 'AT', photo: '/alan.jpg' },
    { name: 'Katherine Johnson', initials: 'KJ', photo: '/katherine.jpg' },
  ];
  dropped: string | null = null;
  drop(tag: string): void {
    this.dropped = tag;
  }
}

/* ── form controls ──────────────────────────────────────────────────────── */

@Component({
  selector: 'kx-usage-forms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KxCheckbox,
    KxField,
    KxFieldDescription,
    KxFieldLabel,
    KxFieldMessage,
    KxInput,
    KxLabel,
    KxNativeSelect,
    KxNumberInput,
    KxPasswordInput,
    KxRadio,
    KxRadioGroup,
    KxSlider,
    KxSwitch,
    KxTextarea,
  ],
  template: `
    <!-- kx-usage:checkbox-demo -->
    <kx-checkbox [(checked)]="remember" aria-label="Remember me" />
    <!-- kx-usage:end -->

    <!-- kx-usage:switch-demo -->
    <kx-switch [(checked)]="notifications" aria-label="Notifications" />
    <!-- kx-usage:end -->

    <!-- kx-usage:textarea-demo -->
    <textarea kxTextarea rows="4" placeholder="Type your message here."></textarea>
    <!-- kx-usage:end -->

    <!-- kx-usage:native-select-demo -->
    <select kxNativeSelect aria-label="Country">
      <option value="pt">Portugal</option>
      <option value="es">Spain</option>
    </select>
    <!-- kx-usage:end -->

    <!-- kx-usage:radio-group-demo -->
    <kx-radio-group [(value)]="plan" aria-label="Plan">
      <kx-radio value="free">Free</kx-radio>
      <kx-radio value="pro">Pro</kx-radio>
      <kx-radio value="team">Team</kx-radio>
    </kx-radio-group>
    <!-- kx-usage:end -->

    <!-- kx-usage:slider-demo -->
    <kx-slider [(value)]="volume" [max]="100" [step]="5" aria-label="Volume" />
    <!-- kx-usage:end -->

    <!-- kx-usage:number-input-demo -->
    <kx-number-input [(value)]="quantity" [min]="1" [max]="99" aria-label="Quantity" />
    <!-- kx-usage:end -->

    <!-- kx-usage:password-input-demo -->
    <kx-password-input [(value)]="password" aria-label="Password" />
    <!-- kx-usage:end -->

    <!-- kx-usage:field-demo -->
    <kx-field>
      <label kxFieldLabel for="email">Email</label>
      <input kxInput id="email" type="email" aria-describedby="email-hint" aria-invalid="true" />
      <p kxFieldDescription id="email-hint">We only use this to sign you in.</p>
      <kx-field-message variant="error">Enter a valid address.</kx-field-message>
    </kx-field>
    <!-- kx-usage:end -->
  `,
})
export class KxUsageForms {
  remember = false;
  notifications = true;
  plan: string | null = 'pro';
  volume = 40;
  quantity: number | null = 1;
  password = '';
}

/* ── toggles ────────────────────────────────────────────────────────────── */

@Component({
  selector: 'kx-usage-toggles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxSegment, KxSegmentedControl, KxToggle, KxToggleGroup, KxToggleGroupItem],
  template: `
    <!-- kx-usage:toggle-demo -->
    <button kxToggle [(pressed)]="bold" aria-label="Bold">B</button>
    <!-- kx-usage:end -->

    <!-- kx-usage:toggle-group-demo -->
    <kx-toggle-group [(value)]="marks" aria-label="Text style">
      <kx-toggle-group-item value="bold">B</kx-toggle-group-item>
      <kx-toggle-group-item value="italic">I</kx-toggle-group-item>
      <kx-toggle-group-item value="underline">U</kx-toggle-group-item>
    </kx-toggle-group>
    <!-- kx-usage:end -->

    <!-- kx-usage:segmented-control-demo -->
    <kx-segmented-control [(value)]="range" aria-label="Range">
      <kx-segment value="7d">7 days</kx-segment>
      <kx-segment value="30d">30 days</kx-segment>
      <kx-segment value="90d">90 days</kx-segment>
    </kx-segmented-control>
    <!-- kx-usage:end -->
  `,
})
export class KxUsageToggles {
  bold = false;
  marks: string | string[] | null = ['bold'];
  range: string | null = '30d';
}

/* ── native equivalents ─────────────────────────────────────────────────── */

/**
 * The two concepts KinetixUI does NOT ship an Angular component for, because Angular or the DOM already has
 * them. These examples exist so the platform tab can show a real answer instead of a blank — the manifest
 * records them as `native-equivalent` guidance, which never counts towards Angular component parity.
 */
@Component({
  selector: 'kx-usage-direction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxInput],
  template: `
    <!-- kx-usage:direction-provider-demo -->
    <!-- No provider: the DOM's own dir attribute cascades, and Angular CDK's Directionality reads it. -->
    <div dir="rtl">
      <input kxInput placeholder="ابحث" />
      <button kxButton>حفظ</button>
    </div>
    <!-- kx-usage:end -->
  `,
})
export class KxUsageDirection {}

// kx-usage:form-demo
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, KxButton, KxField, KxFieldLabel, KxFieldMessage, KxInput],
  template: `
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
  `,
})
export class SignupForm {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  get email() {
    return this.form.controls.email;
  }
  submit(): void {
    if (this.form.valid) console.log(this.form.getRawValue());
  }
}
// kx-usage:end

// kx-usage:banner-demo
@Component({
  selector: 'app-banner-demo',
  imports: [KxBanner],
  template: `
    @if (!dismissed) {
      <kx-banner variant="warning" sticky dismissible (dismiss)="dismissed = true">
        Scheduled maintenance begins at 02:00 UTC.
        <button kxBannerAction type="button" (click)="details()">Read more</button>
      </kx-banner>
    }
  `,
})
export class BannerDemo {
  dismissed = false;
  details(): void {}
}
// kx-usage:end

// kx-usage:button-group-demo
@Component({
  selector: 'app-button-group-demo',
  imports: [KxButton, KxButtonGroup, KxButtonGroupText],
  template: `
    <div kxButtonGroup>
      <kx-button-group-text>Qty</kx-button-group-text>
      <button kxButton variant="Outline" type="button" aria-label="Decrease">&minus;</button>
      <button kxButton variant="Outline" type="button" aria-label="Increase">+</button>
    </div>
  `,
})
export class ButtonGroupDemo {}
// kx-usage:end

// kx-usage:circular-progress-demo
@Component({
  selector: 'app-circular-progress-demo',
  imports: [KxCircularProgress],
  template: `
    <kx-circular-progress [value]="72" showValue [size]="56" aria-label="Storage used" />
    <kx-circular-progress aria-label="Loading" />
  `,
})
export class CircularProgressDemo {}
// kx-usage:end

// kx-usage:code-block-demo
@Component({
  selector: 'app-code-block-demo',
  imports: [KxCodeBlock],
  template: ` <kx-code-block [code]="snippet" filename="main.ts" /> `,
})
export class CodeBlockDemo {
  readonly snippet = "import { KxButton } from '@kinetixui/angular';";
}
// kx-usage:end

// kx-usage:description-list-demo
@Component({
  selector: 'app-description-list-demo',
  imports: [KxDescriptionList, KxDescriptionListItem],
  template: `
    <dl kxDescriptionList>
      <div kxDescriptionListItem term="Status">Active</div>
      <div kxDescriptionListItem term="Plan">Team &middot; annual</div>
      <div kxDescriptionListItem term="Notes" layout="stacked">
        Renews automatically unless cancelled 30 days before the term ends.
      </div>
    </dl>
  `,
})
export class DescriptionListDemo {}
// kx-usage:end

// kx-usage:fab-demo
@Component({
  selector: 'app-fab-demo',
  imports: [KxFab],
  template: `
    <button kxFab type="button" aria-label="New message">+</button>
    <button kxFab extended type="button">New message</button>
  `,
})
export class FabDemo {}
// kx-usage:end

// kx-usage:image-demo
@Component({
  selector: 'app-image-demo',
  imports: [KxImage],
  template: `
    <kx-image src="/cover.jpg" alt="Harbour at dusk" ratio="16:9">
      <span kxImageFallback>Unavailable</span>
    </kx-image>
  `,
})
export class ImageDemo {}
// kx-usage:end

// kx-usage:inform-demo
@Component({
  selector: 'app-inform-demo',
  imports: [KxInform],
  template: `
    <kx-inform variant="success">Your changes were saved.</kx-inform>
    <kx-inform variant="error" dismissible (dismiss)="hidden = true">
      We could not reach the server.
      <button kxInformAction type="button" (click)="retry()">Try again</button>
    </kx-inform>
  `,
})
export class InformDemo {
  hidden = false;
  retry(): void {}
}
// kx-usage:end

// kx-usage:list-demo
@Component({
  selector: 'app-list-demo',
  imports: [KxList, KxListItem],
  template: `
    <ul kxList>
      <li kxListItem title="Billing" description="Invoices and payment method" pressable (select)="open('billing')">
        <span kxListTrailing>&rsaquo;</span>
      </li>
      <li kxListItem title="Members" description="12 people" pressable (select)="open('members')">
        <span kxListTrailing>&rsaquo;</span>
      </li>
      <li kxListItem title="Audit log" description="Enterprise plans only" disabled></li>
    </ul>
  `,
})
export class ListDemo {
  open(_section: string): void {}
}
// kx-usage:end

// kx-usage:marquee-demo
@Component({
  selector: 'app-marquee-demo',
  imports: [KxMarquee, KxMarqueeContent],
  template: `
    <kx-marquee [durationSeconds]="24" pauseOnHover>
      <ng-template kxMarqueeContent>
        <span>Ships to 48 countries</span>
        <span>Free returns for 30 days</span>
      </ng-template>
    </kx-marquee>
  `,
})
export class MarqueeDemo {}
// kx-usage:end

// kx-usage:page-header-demo
@Component({
  selector: 'app-page-header-demo',
  imports: [KxButton, KxPageHeader],
  template: `
    <kx-page-header title="Billing" description="Plan, invoices and payment method">
      <button kxButton kxPageHeaderActions type="button" variant="Primary">Upgrade</button>
    </kx-page-header>
  `,
})
export class PageHeaderDemo {}
// kx-usage:end

// kx-usage:timeline-demo
@Component({
  selector: 'app-timeline-demo',
  imports: [KxTimeline, KxTimelineItem],
  template: `
    <ol kxTimeline>
      <li kxTimelineItem title="Order placed" description="12 March, 09:14" status="success"></li>
      <li kxTimelineItem title="Dispatched" description="12 March, 17:02" status="success"></li>
      <li kxTimelineItem title="In transit" description="Expected 15 March" status="active"></li>
      <li kxTimelineItem title="Delivered"></li>
    </ol>
  `,
})
export class TimelineDemo {}
// kx-usage:end
