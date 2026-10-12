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
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
import { KxInputGroup, KxInputGroupAddon, KxInputGroupButton, KxInputGroupInput, KxInputGroupText } from '../lib/input-group';
import { KxInputOtp } from '../lib/input-otp';
import { KxRating } from '../lib/rating';
import {
  KxAccordion,
  KxAccordionContent,
  KxAccordionItem,
  KxAccordionTrigger,
  KxCollapsible,
  KxCollapsibleContent,
  KxCollapsibleTrigger,
} from '../lib/disclosure';
import {
  KxAppBar,
  KxAppBarActions,
  KxAppBarBrand,
  KxAppBarLink,
  KxAppBarNav,
  KxBreadcrumb,
  KxBreadcrumbItem,
  KxBreadcrumbLink,
  KxBreadcrumbList,
  KxBreadcrumbPage,
  KxBreadcrumbSeparator,
  KxFooter,
  KxFooterBottom,
  KxFooterColumn,
  KxFooterColumns,
  KxFooterLink,
  KxNavigationBar,
  KxPagination,
  KxPaginationContent,
  KxPaginationEllipsis,
  KxPaginationItem,
  KxPaginationLink,
  KxPaginationNext,
  KxPaginationPrevious,
  KxStepper,
  KxTabBar,
  KxTabBarItem,
  KxTableOfContents,
  type KxStep,
  type KxTocItem,
} from '../lib/navigation';

import {
  KxAlertDialog,
  KxAlertDialogAction,
  KxAlertDialogCancel,
  KxAlertDialogContent,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogDescription,
  KxDialogFooter,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxDrawer,
  KxDrawerContent,
  KxModal,
  KxSheet,
  KxSheetContent,
} from '../lib/dialog';
import {
  KxHoverCard,
  KxHoverCardContent,
  KxHoverCardTrigger,
  KxPopover,
  KxPopoverContent,
  KxPopoverTrigger,
  KxTooltip,
  KxTooltipContent,
  KxTooltipTrigger,
} from '../lib/floating';
import {
  KxContextMenu,
  KxContextMenuContent,
  KxContextMenuTrigger,
  KxDropdownMenu,
  KxDropdownMenuContent,
  KxDropdownMenuTrigger,
  KxMenuCheckboxItem,
  KxMenuGroup,
  KxMenuItem,
  KxMenuLabel,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubContent,
  KxMenuSubTrigger,
  KxMenubar,
  KxMenubarContent,
  KxMenubarMenu,
  KxMenubarTrigger,
} from '../lib/menu';
import {
  KxSelect,
  KxSelectContent,
  KxSelectGroup,
  KxSelectItem,
  KxSelectLabel,
  KxSelectSeparator,
  KxSelectTrigger,
  KxSelectValue,
} from '../lib/select';
import {
  KxCommand,
  KxCommandEmpty,
  KxCommandGroup,
  KxCommandInput,
  KxCommandItem,
  KxCommandList,
  KxCommandSeparator,
  KxCommandShortcut,
} from '../lib/command';
import { KxMultiSelect, type KxMultiSelectOption } from '../lib/multi-select';
import {
  KxNavigationMenu,
  KxNavigationMenuContent,
  KxNavigationMenuIndicator,
  KxNavigationMenuItem,
  KxNavigationMenuLink,
  KxNavigationMenuList,
  KxNavigationMenuTrigger,
} from '../lib/navigation-menu';
import { KxToaster, KxToasterService } from '../lib/sonner';
import { KxNotificationCenter, KxNotificationCenterContent, KxNotificationCenterTrigger, KxNotificationItem } from '../lib/notification-center';
import { KxTour, type KxTourStep } from '../lib/tour';
import {
  KxSidebar,
  KxSidebarContent,
  KxSidebarFooter,
  KxSidebarGroup,
  KxSidebarGroupContent,
  KxSidebarGroupLabel,
  KxSidebarHeader,
  KxSidebarInset,
  KxSidebarMenu,
  KxSidebarMenuButton,
  KxSidebarMenuItem,
  KxSidebarProvider,
  KxSidebarTrigger,
} from '../lib/sidebar';

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

    <!-- A card that is one action: kxCard on a real link (or button) gives it hover, pressed, focus and selected. -->
    <a kxCard href="#reports-q3">
      <kx-card-header>
        <kx-card-title>Q3 report</kx-card-title>
        <kx-card-description>Revenue, churn and cohort retention.</kx-card-description>
      </kx-card-header>
    </a>
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
    KxInputGroup,
    KxInputGroupAddon,
    KxInputGroupButton,
    KxInputGroupInput,
    KxInputGroupText,
    KxInputOtp,
    KxLabel,
    KxNativeSelect,
    KxNumberInput,
    KxPasswordInput,
    KxRadio,
    KxRadioGroup,
    KxRating,
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

    <!-- kx-usage:input-group-demo -->
    <kx-input-group>
      <kx-input-group-text>https://</kx-input-group-text>
      <input kxInputGroupInput aria-label="Website" placeholder="kinetixui.com" />
    </kx-input-group>
    <kx-input-group>
      <kx-input-group-addon>$</kx-input-group-addon>
      <input kxInputGroupInput aria-label="Amount" placeholder="0.00" inputmode="decimal" />
      <kx-input-group-text>USD</kx-input-group-text>
    </kx-input-group>
    <kx-input-group>
      <input kxInputGroupInput aria-label="Invite link" value="https://kinetixui.com/invite/7Q2X" readonly />
      <button kxInputGroupButton>Copy</button>
    </kx-input-group>
    <!-- kx-usage:end -->

    <!-- kx-usage:input-otp-demo -->
    <kx-input-otp [(value)]="code" [length]="6" [groups]="[3, 3]" aria-label="One-time code" />
    <!-- kx-usage:end -->

    <!-- kx-usage:rating-demo -->
    <kx-rating [(value)]="rating" aria-label="Rate this article" />
    <kx-rating [value]="4" readonly size="sm" />
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
  code = '';
  rating = 3;
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

// kx-usage:icons-dismiss-icon
@Component({
  selector: 'app-icons-dismiss-icon',
  imports: [KxBanner],
  template: `
    <!-- Default: the built-in dismiss mark -->
    <kx-banner dismissible (dismiss)="hide()">Changes saved.</kx-banner>

    <!-- Yours: any SVG or icon component carrying kxDismissIcon. The slot sizes it (14px), colours it
         (currentColor) and names the button ("Dismiss"), so it needs no size, colour or aria. -->
    <kx-banner dismissible (dismiss)="hide()">
      Changes saved.
      <svg kxDismissIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-6 6M9 9l6 6" />
      </svg>
    </kx-banner>
  `,
})
export class IconsDismissIconDemo {
  hide(): void {}
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

/* ── navigation and disclosure ──────────────────────────────────────────── */

// kx-usage:accordion-demo
@Component({
  selector: 'app-accordion-demo',
  imports: [KxAccordion, KxAccordionItem, KxAccordionTrigger, KxAccordionContent],
  template: `
    <kx-accordion type="single" collapsible [(value)]="open">
      <kx-accordion-item value="shipping">
        <kx-accordion-trigger>When will my order ship?</kx-accordion-trigger>
        <kx-accordion-content>Orders leave the warehouse within two working days.</kx-accordion-content>
      </kx-accordion-item>
      <kx-accordion-item value="returns">
        <kx-accordion-trigger>Can I return an item?</kx-accordion-trigger>
        <kx-accordion-content>Yes, within 30 days, in its original packaging.</kx-accordion-content>
      </kx-accordion-item>
    </kx-accordion>
  `,
})
export class AccordionDemo {
  open: readonly string[] = ['shipping'];
}
// kx-usage:end

// kx-usage:collapsible-demo
@Component({
  selector: 'app-collapsible-demo',
  imports: [KxButton, KxCollapsible, KxCollapsibleTrigger, KxCollapsibleContent],
  template: `
    <kx-collapsible [(open)]="showAdvanced">
      <button kxButton kxCollapsibleTrigger variant="Ghost" size="sm">Advanced settings</button>
      <kx-collapsible-content>
        <p>Webhooks retry failed deliveries three times, an hour apart.</p>
      </kx-collapsible-content>
    </kx-collapsible>
  `,
})
export class CollapsibleDemo {
  showAdvanced = false;
}
// kx-usage:end

// kx-usage:breadcrumb-demo
@Component({
  selector: 'app-breadcrumb-demo',
  imports: [KxBreadcrumb, KxBreadcrumbList, KxBreadcrumbItem, KxBreadcrumbLink, KxBreadcrumbPage, KxBreadcrumbSeparator],
  template: `
    <nav kxBreadcrumb>
      <ol kxBreadcrumbList>
        <li kxBreadcrumbItem><a kxBreadcrumbLink href="/">Home</a></li>
        <li kxBreadcrumbSeparator></li>
        <li kxBreadcrumbItem><a kxBreadcrumbLink href="/settings">Settings</a></li>
        <li kxBreadcrumbSeparator></li>
        <li kxBreadcrumbItem><span kxBreadcrumbPage>Billing</span></li>
      </ol>
    </nav>
  `,
})
export class BreadcrumbDemo {}
// kx-usage:end

// kx-usage:pagination-demo
@Component({
  selector: 'app-pagination-demo',
  imports: [KxPagination, KxPaginationContent, KxPaginationItem, KxPaginationLink, KxPaginationPrevious, KxPaginationNext, KxPaginationEllipsis],
  template: `
    <nav kxPagination>
      <ul kxPaginationContent>
        <li kxPaginationItem><a kxPaginationPrevious href="?page=1">Previous</a></li>
        <li kxPaginationItem><a kxPaginationLink href="?page=1">1</a></li>
        <li kxPaginationItem><a kxPaginationLink href="?page=2" current>2</a></li>
        <li kxPaginationItem><a kxPaginationLink href="?page=3">3</a></li>
        <li kxPaginationItem><kx-pagination-ellipsis /></li>
        <li kxPaginationItem><a kxPaginationNext href="?page=3">Next</a></li>
      </ul>
    </nav>
  `,
})
export class PaginationDemo {}
// kx-usage:end

// kx-usage:table-of-contents-demo
@Component({
  selector: 'app-table-of-contents-demo',
  imports: [KxTableOfContents],
  template: ` <nav kxTableOfContents [items]="sections" [(active)]="section"></nav> `,
})
export class TableOfContentsDemo {
  readonly sections: KxTocItem[] = [
    { id: 'install', label: 'Installation' },
    { id: 'tokens', label: 'Load the tokens', level: 2 },
    { id: 'usage', label: 'Usage' },
  ];
  section: string | null = 'install';
}
// kx-usage:end

// kx-usage:tab-bar-demo
@Component({
  selector: 'app-tab-bar-demo',
  imports: [KxTabBar, KxTabBarItem],
  template: `
    <nav kxTabBar aria-label="Primary">
      <a kxTabBarItem href="/home" active>
        <svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="currentColor" /></svg>
        Home
      </a>
      <a kxTabBarItem href="/inbox" badge="3">
        <svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 13h5l1 2h4l1-2h5" fill="none" stroke="currentColor" stroke-width="2" /></svg>
        Inbox
      </a>
      <a kxTabBarItem href="/account">
        <svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor" /><path d="M4 21a8 8 0 0116 0" fill="currentColor" /></svg>
        Account
      </a>
    </nav>
  `,
})
export class TabBarDemo {}
// kx-usage:end

// kx-usage:stepper-demo
@Component({
  selector: 'app-stepper-demo',
  imports: [KxStepper],
  template: ` <ol kxStepper [steps]="steps" [current]="1"></ol> `,
})
export class StepperDemo {
  readonly steps: KxStep[] = [
    { label: 'Account', description: 'Email and password' },
    { label: 'Workspace', description: 'Name and region' },
    { label: 'Invite', description: 'Add your team' },
  ];
}
// kx-usage:end

// kx-usage:navigation-bar-demo
@Component({
  selector: 'app-navigation-bar-demo',
  imports: [KxButton, KxNavigationBar],
  template: `
    <header kxNavigationBar title="Inbox" infoText="3 unread" backButton (back)="goBack()">
      <button kxButton kxNavigationBarActions type="button" variant="Ghost" size="sm">Edit</button>
    </header>
  `,
})
export class NavigationBarDemo {
  goBack(): void {}
}
// kx-usage:end

// kx-usage:app-bar-demo
@Component({
  selector: 'app-app-bar-demo',
  imports: [KxButton, KxAppBar, KxAppBarBrand, KxAppBarNav, KxAppBarLink, KxAppBarActions],
  template: `
    <header kxAppBar [sticky]="false">
      <a kxAppBarBrand href="/">Acme</a>
      <nav kxAppBarNav aria-label="Primary">
        <a kxAppBarLink href="/" active>Overview</a>
        <a kxAppBarLink href="/reports">Reports</a>
        <a kxAppBarLink href="/settings">Settings</a>
      </nav>
      <div kxAppBarActions><button kxButton type="button" size="sm">New report</button></div>
    </header>
  `,
})
export class AppBarDemo {}
// kx-usage:end

// kx-usage:footer-demo
@Component({
  selector: 'app-footer-demo',
  imports: [KxFooter, KxFooterColumns, KxFooterColumn, KxFooterLink, KxFooterBottom],
  template: `
    <footer kxFooter>
      <div kxFooterColumns>
        <kx-footer-column title="Product">
          <a kxFooterLink href="/pricing">Pricing</a>
          <a kxFooterLink href="/changelog">Changelog</a>
        </kx-footer-column>
        <kx-footer-column title="Company">
          <a kxFooterLink href="/about">About</a>
          <a kxFooterLink href="/careers">Careers</a>
        </kx-footer-column>
      </div>
      <div kxFooterBottom>
        <span>&copy; 2026 Acme, Inc.</span>
        <a kxFooterLink href="/privacy">Privacy</a>
      </div>
    </footer>
  `,
})
export class FooterDemo {}
// kx-usage:end

/* ── overlays ───────────────────────────────────────────────────────────── */

// kx-usage:dialog-demo
@Component({
  selector: 'app-dialog-demo',
  imports: [KxButton, KxInput, KxLabel, KxDialog, KxDialogTrigger, KxDialogContent, KxDialogHeader, KxDialogTitle, KxDialogDescription, KxDialogFooter, KxDialogClose],
  template: `
    <kx-dialog [(open)]="open">
      <button kxButton kxDialogTrigger variant="Outline">Edit profile</button>
      <dialog kxDialogContent>
        <kx-dialog-header>
          <h2 kxDialogTitle>Edit profile</h2>
          <p kxDialogDescription>Make changes to your profile here.</p>
        </kx-dialog-header>
        <label kxLabel for="dialog-name">Name</label>
        <input kxInput id="dialog-name" value="KinetixUI" />
        <kx-dialog-footer>
          <button kxButton kxDialogClose variant="Outline">Cancel</button>
          <button kxButton type="button" (click)="open = false">Save changes</button>
        </kx-dialog-footer>
      </dialog>
    </kx-dialog>
  `,
})
export class DialogDemo {
  open = false;
}
// kx-usage:end

// kx-usage:alert-dialog-demo
@Component({
  selector: 'app-alert-dialog-demo',
  imports: [KxButton, KxAlertDialog, KxDialogTrigger, KxAlertDialogContent, KxDialogHeader, KxDialogTitle, KxDialogDescription, KxDialogFooter, KxAlertDialogCancel, KxAlertDialogAction],
  template: `
    <kx-alert-dialog>
      <button kxButton kxDialogTrigger variant="Outline">Delete account</button>
      <dialog kxAlertDialogContent>
        <kx-dialog-header>
          <h2 kxDialogTitle>Delete your account?</h2>
          <p kxDialogDescription>Your projects and files are removed for everyone. This cannot be undone.</p>
        </kx-dialog-header>
        <kx-dialog-footer>
          <button kxButton kxAlertDialogCancel variant="Outline">Cancel</button>
          <button kxButton kxAlertDialogAction variant="Destructive" (click)="deleteAccount()">Delete account</button>
        </kx-dialog-footer>
      </dialog>
    </kx-alert-dialog>
  `,
})
export class AlertDialogDemo {
  deleteAccount(): void {}
}
// kx-usage:end

// kx-usage:modal-demo
@Component({
  selector: 'app-modal-demo',
  imports: [KxButton, KxModal, KxDialogTrigger],
  template: `
    <kx-modal type="Confirmation" title="Publish this report?" description="Everyone in the workspace can see it once it is published." (action)="publish()">
      <button kxButton kxDialogTrigger variant="Outline">Publish</button>
    </kx-modal>
  `,
})
export class ModalDemo {
  publish(): void {}
}
// kx-usage:end

// kx-usage:sheet-demo
@Component({
  selector: 'app-sheet-demo',
  imports: [KxButton, KxSheet, KxDialogTrigger, KxSheetContent, KxDialogHeader, KxDialogTitle, KxDialogDescription, KxDialogFooter, KxDialogClose],
  template: `
    <kx-sheet>
      <button kxButton kxDialogTrigger variant="Outline">Open</button>
      <dialog kxSheetContent side="end">
        <kx-dialog-header>
          <h2 kxDialogTitle>Edit profile</h2>
          <p kxDialogDescription>Make changes to your profile here.</p>
        </kx-dialog-header>
        <kx-dialog-footer><button kxButton kxDialogClose>Done</button></kx-dialog-footer>
      </dialog>
    </kx-sheet>
  `,
})
export class SheetDemo {}
// kx-usage:end

// kx-usage:drawer-demo
@Component({
  selector: 'app-drawer-demo',
  imports: [KxButton, KxDrawer, KxDialogTrigger, KxDrawerContent, KxDialogHeader, KxDialogTitle, KxDialogDescription, KxDialogFooter, KxDialogClose],
  template: `
    <kx-drawer>
      <button kxButton kxDialogTrigger variant="Outline">Open drawer</button>
      <dialog kxDrawerContent>
        <kx-dialog-header>
          <h2 kxDialogTitle>Move goal</h2>
          <p kxDialogDescription>Set your daily activity goal.</p>
        </kx-dialog-header>
        <kx-dialog-footer>
          <button kxButton kxDialogClose variant="Outline">Cancel</button>
          <button kxButton kxDialogClose>Submit</button>
        </kx-dialog-footer>
      </dialog>
    </kx-drawer>
  `,
})
export class DrawerDemo {}
// kx-usage:end

// kx-usage:popover-demo
@Component({
  selector: 'app-popover-demo',
  imports: [KxButton, KxPopover, KxPopoverTrigger, KxPopoverContent],
  template: `
    <kx-popover>
      <button kxButton kxPopoverTrigger variant="Outline">Open popover</button>
      <kx-popover-content labelledby="popover-demo-title">
        <p id="popover-demo-title"><strong>Dimensions</strong></p>
        <p>Set the dimensions for the layer.</p>
      </kx-popover-content>
    </kx-popover>
  `,
})
export class PopoverDemo {}
// kx-usage:end

// kx-usage:tooltip-demo
@Component({
  selector: 'app-tooltip-demo',
  imports: [KxButton, KxTooltip, KxTooltipTrigger, KxTooltipContent],
  template: `
    <kx-tooltip>
      <button kxButton kxTooltipTrigger variant="Outline" type="button">Hover</button>
      <kx-tooltip-content>Add to library</kx-tooltip-content>
    </kx-tooltip>
  `,
})
export class TooltipDemo {}
// kx-usage:end

// kx-usage:hover-card-demo
@Component({
  selector: 'app-hover-card-demo',
  imports: [KxHoverCard, KxHoverCardTrigger, KxHoverCardContent],
  template: `
    <kx-hover-card>
      <a kxHoverCardTrigger href="/about">@kinetixui</a>
      <kx-hover-card-content>One token architecture, in motion across every platform.</kx-hover-card-content>
    </kx-hover-card>
  `,
})
export class HoverCardDemo {}
// kx-usage:end

// The three menus share one set of parts (`KxMenu…`); only the root differs.
const MENU_PARTS = [
  KxMenuItem,
  KxMenuCheckboxItem,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuLabel,
  KxMenuGroup,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubTrigger,
  KxMenuSubContent,
];

// kx-usage:dropdown-menu-demo
@Component({
  selector: 'app-dropdown-menu-demo',
  imports: [KxButton, KxDropdownMenu, KxDropdownMenuTrigger, KxDropdownMenuContent, ...MENU_PARTS],
  template: `
    <kx-dropdown-menu>
      <button kxButton variant="Outline" kxDropdownMenuTrigger>Options</button>
      <kx-dropdown-menu-content align="start">
        <kx-menu-group>
          <kx-menu-label>Document</kx-menu-label>
          <button kxMenuItem (select)="last = 'rename'">Rename <kx-menu-shortcut>F2</kx-menu-shortcut></button>
          <button kxMenuItem (select)="last = 'duplicate'">Duplicate <kx-menu-shortcut>Ctrl+D</kx-menu-shortcut></button>
          <button kxMenuItem disabled>Move to archive</button>
          <kx-menu-sub>
            <button kxMenuSubTrigger>Share</button>
            <kx-menu-sub-content>
              <button kxMenuItem (select)="last = 'email'">Email link</button>
              <button kxMenuItem (select)="last = 'copy'">Copy link</button>
            </kx-menu-sub-content>
          </kx-menu-sub>
        </kx-menu-group>
        <kx-menu-separator />
        <kx-menu-checkbox-item [(checked)]="showRuler">Show ruler</kx-menu-checkbox-item>
        <kx-menu-radio-group [(value)]="density">
          <kx-menu-label inset>Density</kx-menu-label>
          <kx-menu-radio-item value="compact">Compact</kx-menu-radio-item>
          <kx-menu-radio-item value="comfortable">Comfortable</kx-menu-radio-item>
        </kx-menu-radio-group>
        <kx-menu-separator />
        <button kxMenuItem variant="destructive" (select)="last = 'delete'">Delete document</button>
      </kx-dropdown-menu-content>
    </kx-dropdown-menu>
  `,
})
export class DropdownMenuDemo {
  last = '';
  showRuler = true;
  density = 'comfortable';
}
// kx-usage:end

// kx-usage:context-menu-demo
@Component({
  selector: 'app-context-menu-demo',
  imports: [KxContextMenu, KxContextMenuTrigger, KxContextMenuContent, ...MENU_PARTS],
  template: `
    <kx-context-menu>
      <!-- right-click, the ContextMenu key or Shift+F10 inside the region opens the menu -->
      <div kxContextMenuTrigger tabindex="0" role="group" aria-label="Canvas" class="canvas">
        Right-click here, or focus and press Shift+F10
      </div>
      <kx-context-menu-content label="Canvas actions">
        <button kxMenuItem>Back <kx-menu-shortcut>Alt+←</kx-menu-shortcut></button>
        <button kxMenuItem disabled>Forward</button>
        <button kxMenuItem>Reload <kx-menu-shortcut>Ctrl+R</kx-menu-shortcut></button>
        <kx-menu-sub>
          <button kxMenuSubTrigger>More tools</button>
          <kx-menu-sub-content>
            <button kxMenuItem>Save page as…</button>
            <button kxMenuItem>Developer tools</button>
          </kx-menu-sub-content>
        </kx-menu-sub>
        <kx-menu-separator />
        <kx-menu-checkbox-item [(checked)]="showGuides">Show guides</kx-menu-checkbox-item>
      </kx-context-menu-content>
    </kx-context-menu>
  `,
  styles: `
    .canvas {
      display: grid;
      place-items: center;
      min-block-size: 9rem;
      padding: var(--spacing-4);
      border: 1px dashed hsl(var(--border));
      border-radius: var(--radius-surface);
      color: hsl(var(--muted-foreground));
      text-align: center;
    }
  `,
})
export class ContextMenuDemo {
  showGuides = true;
}
// kx-usage:end

// kx-usage:menubar-demo
@Component({
  selector: 'app-menubar-demo',
  imports: [KxMenubar, KxMenubarMenu, KxMenubarTrigger, KxMenubarContent, ...MENU_PARTS],
  template: `
    <kx-menubar aria-label="Editor">
      <kx-menubar-menu value="file">
        <button kxMenubarTrigger>File</button>
        <kx-menubar-content>
          <button kxMenuItem>New tab <kx-menu-shortcut>Ctrl+T</kx-menu-shortcut></button>
          <button kxMenuItem>New window</button>
          <kx-menu-sub>
            <button kxMenuSubTrigger>Share</button>
            <kx-menu-sub-content>
              <button kxMenuItem>Email link</button>
              <button kxMenuItem>Messages</button>
            </kx-menu-sub-content>
          </kx-menu-sub>
          <kx-menu-separator />
          <button kxMenuItem>Print… <kx-menu-shortcut>Ctrl+P</kx-menu-shortcut></button>
        </kx-menubar-content>
      </kx-menubar-menu>
      <kx-menubar-menu value="edit">
        <button kxMenubarTrigger>Edit</button>
        <kx-menubar-content>
          <button kxMenuItem>Undo <kx-menu-shortcut>Ctrl+Z</kx-menu-shortcut></button>
          <button kxMenuItem disabled>Redo</button>
          <kx-menu-separator />
          <button kxMenuItem>Cut</button>
          <button kxMenuItem>Copy</button>
          <button kxMenuItem>Paste</button>
        </kx-menubar-content>
      </kx-menubar-menu>
      <kx-menubar-menu value="view">
        <button kxMenubarTrigger>View</button>
        <kx-menubar-content>
          <kx-menu-checkbox-item [(checked)]="bookmarks">Show bookmarks</kx-menu-checkbox-item>
          <kx-menu-checkbox-item [(checked)]="fullUrls">Show full URLs</kx-menu-checkbox-item>
          <kx-menu-separator />
          <kx-menu-radio-group [(value)]="zoom">
            <kx-menu-label inset>Zoom</kx-menu-label>
            <kx-menu-radio-item value="90">90%</kx-menu-radio-item>
            <kx-menu-radio-item value="100">100%</kx-menu-radio-item>
            <kx-menu-radio-item value="125">125%</kx-menu-radio-item>
          </kx-menu-radio-group>
        </kx-menubar-content>
      </kx-menubar-menu>
    </kx-menubar>
  `,
})
export class MenubarDemo {
  bookmarks = true;
  fullUrls = false;
  zoom = '100';
}
// kx-usage:end

// kx-usage:select-demo
@Component({
  selector: 'app-select-demo',
  imports: [KxLabel, KxSelect, KxSelectTrigger, KxSelectValue, KxSelectContent, KxSelectGroup, KxSelectLabel, KxSelectItem, KxSelectSeparator],
  template: `
    <label kxLabel for="fruit">Fruit</label>
    <kx-select [(value)]="fruit">
      <button kxSelectTrigger id="fruit"><kx-select-value placeholder="Select a fruit" /></button>
      <kx-select-content>
        <kx-select-group>
          <kx-select-label>Fruit</kx-select-label>
          <kx-select-item value="apple">Apple</kx-select-item>
          <kx-select-item value="banana">Banana</kx-select-item>
          <kx-select-item value="blueberry">Blueberry</kx-select-item>
        </kx-select-group>
        <kx-select-separator />
        <kx-select-group>
          <kx-select-label>Out of season</kx-select-label>
          <kx-select-item value="cherry" disabled>Cherry</kx-select-item>
        </kx-select-group>
      </kx-select-content>
    </kx-select>
  `,
  styles: `
    :host { display: grid; gap: var(--spacing-2); max-inline-size: 16rem; }
  `,
})
export class SelectDemo {
  fruit: string | null = null;
}
// kx-usage:end

// kx-usage:command-demo
@Component({
  selector: 'app-command-demo',
  imports: [KxCommand, KxCommandInput, KxCommandList, KxCommandEmpty, KxCommandGroup, KxCommandItem, KxCommandSeparator, KxCommandShortcut],
  template: `
    <kx-command label="Commands">
      <input kxCommandInput placeholder="Type a command or search…" />
      <kx-command-list>
        <kx-command-empty>No results found.</kx-command-empty>
        <kx-command-group heading="Suggestions">
          <kx-command-item value="calendar" (select)="ran = $event">Calendar</kx-command-item>
          <kx-command-item value="emoji" [keywords]="['smiley', 'face']" (select)="ran = $event">Search emoji</kx-command-item>
          <kx-command-item value="launch" disabled>Launch</kx-command-item>
        </kx-command-group>
        <kx-command-separator />
        <kx-command-group heading="Settings">
          <kx-command-item value="profile" (select)="ran = $event">Profile <kx-command-shortcut>Ctrl+P</kx-command-shortcut></kx-command-item>
          <kx-command-item value="billing" (select)="ran = $event">Billing <kx-command-shortcut>Ctrl+B</kx-command-shortcut></kx-command-item>
        </kx-command-group>
      </kx-command-list>
    </kx-command>
  `,
  styles: `
    :host { display: block; max-inline-size: 26rem; }
  `,
})
export class CommandDemo {
  ran = '';
}
// kx-usage:end

// kx-usage:combobox-demo
// Combobox is a recipe, not a component: a popover holding a command. There is no KxCombobox to import.
@Component({
  selector: 'app-combobox-demo',
  imports: [KxButton, KxPopover, KxPopoverTrigger, KxPopoverContent, KxCommand, KxCommandInput, KxCommandList, KxCommandEmpty, KxCommandGroup, KxCommandItem],
  template: `
    <kx-popover [(open)]="open">
      <button kxButton variant="Outline" kxPopoverTrigger class="combobox-trigger">
        {{ labelOf(framework) ?? 'Select framework…' }}
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 6l3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <kx-popover-content side="bottom" align="start" label="Frameworks">
        <kx-command label="Frameworks">
          <input kxCommandInput placeholder="Search framework…" />
          <kx-command-list>
            <kx-command-empty>No framework found.</kx-command-empty>
            <kx-command-group>
              @for (f of frameworks; track f.value) {
                <kx-command-item [value]="f.value" (select)="choose($event)">
                  <svg class="combobox-check" [class.combobox-check--on]="framework === f.value" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  {{ f.label }}
                </kx-command-item>
              }
            </kx-command-group>
          </kx-command-list>
        </kx-command>
      </kx-popover-content>
    </kx-popover>
  `,
  styles: `
    .combobox-trigger { inline-size: 15rem; justify-content: space-between; }
    .combobox-trigger svg, .combobox-check { inline-size: 1rem; block-size: 1rem; flex: none; }
    .combobox-check { visibility: hidden; }
    .combobox-check--on { visibility: visible; }
  `,
})
export class ComboboxDemo {
  open = false;
  framework: string | null = null;
  readonly frameworks = [
    { value: 'next', label: 'Next.js' },
    { value: 'sveltekit', label: 'SvelteKit' },
    { value: 'nuxt', label: 'Nuxt' },
    { value: 'remix', label: 'Remix' },
    { value: 'astro', label: 'Astro' },
  ];
  labelOf(value: string | null): string | null {
    return this.frameworks.find((f) => f.value === value)?.label ?? null;
  }
  choose(value: string): void {
    this.framework = value === this.framework ? null : value;
    this.open = false;
  }
}
// kx-usage:end

// kx-usage:multi-select-demo
@Component({
  selector: 'app-multi-select-demo',
  imports: [KxLabel, KxMultiSelect],
  template: `
    <label kxLabel for="platforms">Platforms</label>
    <kx-multi-select inputId="platforms" [options]="platforms" [(value)]="chosen" placeholder="Select platforms…" />
  `,
  styles: `
    :host { display: grid; gap: var(--spacing-2); max-inline-size: 24rem; }
  `,
})
export class MultiSelectDemo {
  chosen = ['react', 'swiftui'];
  readonly platforms: KxMultiSelectOption[] = [
    { value: 'react', label: 'React' },
    { value: 'swiftui', label: 'SwiftUI' },
    { value: 'compose', label: 'Jetpack Compose' },
    { value: 'flutter', label: 'Flutter' },
  ];
}
// kx-usage:end

// kx-usage:navigation-menu-demo
@Component({
  selector: 'app-navigation-menu-demo',
  imports: [
    KxNavigationMenu,
    KxNavigationMenuList,
    KxNavigationMenuItem,
    KxNavigationMenuTrigger,
    KxNavigationMenuContent,
    KxNavigationMenuLink,
    KxNavigationMenuIndicator,
  ],
  template: `
    <nav kxNavigationMenu aria-label="Docs">
      <ul kxNavigationMenuList>
        <li kxNavigationMenuItem value="getting-started">
          <button kxNavigationMenuTrigger>Getting started</button>
          <kx-navigation-menu-content>
            <ul class="links">
              <li><a kxNavigationMenuLink href="#introduction" [active]="true">Introduction</a></li>
              <li><a kxNavigationMenuLink href="#installation">Installation</a></li>
              <li><a kxNavigationMenuLink href="#theming">Theming</a></li>
            </ul>
          </kx-navigation-menu-content>
        </li>
        <li kxNavigationMenuItem value="components">
          <button kxNavigationMenuTrigger>Components</button>
          <kx-navigation-menu-content>
            <ul class="links">
              <li><a kxNavigationMenuLink href="#button">Button</a></li>
              <li><a kxNavigationMenuLink href="#dialog">Dialog</a></li>
              <li><a kxNavigationMenuLink href="#tabs">Tabs</a></li>
            </ul>
          </kx-navigation-menu-content>
        </li>
        <li kxNavigationMenuItem><a kxNavigationMenuLink href="#changelog">Changelog</a></li>
      </ul>
      <kx-navigation-menu-indicator />
    </nav>
  `,
  styles: `
    .links { display: grid; gap: var(--spacing-1); inline-size: min(20rem, 100%); }
  `,
})
export class NavigationMenuDemo {}
// kx-usage:end

// kx-usage:sonner-demo
@Component({
  selector: 'app-sonner-demo',
  imports: [KxButton, KxToaster],
  template: `
    <!-- once, in the application's root template -->
    <kx-toaster />

    <button kxButton variant="Outline" (click)="notify()">Show toast</button>
  `,
})
export class SonnerDemo {
  private readonly toast = inject(KxToasterService);

  notify(): void {
    this.toast.show('Event created', {
      description: 'Sunday, December 03 at 9:00 AM',
      action: { label: 'Undo', onClick: () => {} },
    });
  }
}
// kx-usage:end

// kx-usage:notification-center-demo
@Component({
  selector: 'app-notification-center-demo',
  imports: [KxNotificationCenter, KxNotificationCenterTrigger, KxNotificationCenterContent, KxNotificationItem],
  template: `
    <kx-notification-center>
      <button kxNotificationCenterTrigger [unreadCount]="unread"></button>
      <kx-notification-center-content showMarkAllRead (markAllRead)="unread = 0">
        <kx-notification-item title="PR #106 merged" description="feat(ui): add PageHeader" time="2m ago" [unread]="unread > 0" />
        <kx-notification-item title="Deploy succeeded" description="v0.11.0 is live" time="1h ago" [unread]="unread > 1" />
        <kx-notification-item title="Welcome to KinetixUI" time="2d ago" />
      </kx-notification-center-content>
    </kx-notification-center>
  `,
})
export class NotificationCenterDemo {
  unread = 2;
}
// kx-usage:end

// kx-usage:tour-demo
@Component({
  selector: 'app-tour-demo',
  imports: [KxButton, KxTour],
  template: `
    <button kxButton size="sm" (click)="start()">Start tour</button>
    <div class="row">
      <button kxButton variant="Outline" size="sm" data-tour-demo="save">Save</button>
      <button kxButton variant="Outline" size="sm" data-tour-demo="share">Share</button>
      <button kxButton variant="Ghost" size="sm" data-tour-demo="settings">Settings</button>
    </div>
    <kx-tour [steps]="steps" [(open)]="open" [(stepIndex)]="step" />
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4); }
    .row { display: flex; gap: var(--spacing-3); }
  `,
})
export class TourDemo {
  open = false;
  step = 0;
  readonly steps: KxTourStep[] = [
    { target: '[data-tour-demo="save"]', title: 'Save your work', content: 'Changes save automatically, but you can force a save here.' },
    { target: '[data-tour-demo="share"]', title: 'Invite others', content: 'Share this project with your team.' },
    { target: '[data-tour-demo="settings"]', title: 'Fine-tune settings', content: 'Adjust preferences for this workspace.' },
  ];

  start(): void {
    this.step = 0;
    this.open = true;
  }
}
// kx-usage:end

// kx-usage:sidebar-demo
@Component({
  selector: 'app-sidebar-demo',
  imports: [
    KxSidebarProvider,
    KxSidebar,
    KxSidebarHeader,
    KxSidebarContent,
    KxSidebarFooter,
    KxSidebarGroup,
    KxSidebarGroupLabel,
    KxSidebarGroupContent,
    KxSidebarMenu,
    KxSidebarMenuItem,
    KxSidebarMenuButton,
    KxSidebarInset,
    KxSidebarTrigger,
  ],
  template: `
    <kx-sidebar-provider [(open)]="open">
      <kx-sidebar collapsible="icon">
        <kx-sidebar-header><strong>Acme</strong></kx-sidebar-header>
        <kx-sidebar-content>
          <kx-sidebar-group>
            <h2 kxSidebarGroupLabel>Platform</h2>
            <kx-sidebar-group-content>
              <ul kxSidebarMenu>
                <li kxSidebarMenuItem><a kxSidebarMenuButton href="#home" [active]="true"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Home</span></a></li>
                <li kxSidebarMenuItem><a kxSidebarMenuButton href="#projects"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Projects</span></a></li>
                <li kxSidebarMenuItem><a kxSidebarMenuButton href="#settings"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Settings</span></a></li>
              </ul>
            </kx-sidebar-group-content>
          </kx-sidebar-group>
        </kx-sidebar-content>
        <kx-sidebar-footer><button kxSidebarMenuButton><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Sign out</span></button></kx-sidebar-footer>
      </kx-sidebar>
      <main kxSidebarInset>
        <button kxSidebarTrigger></button>
        <p>Page content</p>
      </main>
    </kx-sidebar-provider>
  `,
  styles: `
    /* a frame for the demo: the panel is fixed to its containing block, which the transform makes this box */
    :host { display: block; block-size: 20rem; overflow: hidden; border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); transform: translateZ(0); }
    main { padding: var(--spacing-4); }
  `,
})
export class SidebarDemo {
  open = true;
}
// kx-usage:end
