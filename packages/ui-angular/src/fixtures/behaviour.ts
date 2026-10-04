import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KxButton } from '../lib/button';
import {
  KxBanner,
  KxButtonGroup,
  KxButtonGroupSeparator,
  KxButtonGroupText,
  KxCodeBlock,
  KxFab,
  KxInform,
  KxList,
  KxListItem,
} from '../lib/content';
import { KxTag } from '../lib/display';
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
import { KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle, KxInput, KxLabel } from '../lib/primitives';
import { KxRating } from '../lib/rating';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from '../lib/tabs';
import { KxCheckbox, KxSegment, KxSegmentedControl, KxSwitch, KxToggle, KxToggleGroup, KxToggleGroupItem } from '../lib/toggles';

/**
 * The interactive catalogue, wired to state the page can read back — the subject of the keyboard and
 * behaviour pass in `scripts/angular-browser.mjs`.
 *
 * Each subject sits in a `[data-kx-subject]` region, and every value it changes is bound into an
 * `<output data-kx-out="…">` beside it. A keypress is therefore checked twice: in the DOM the component
 * renders (`aria-checked`, focus, `tabindex`) and in the application's own model, through Angular's binding —
 * so a control that repaints but never tells its form, or tells its form but never repaints, both fail.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    FormsModule,
    KxBanner,
    KxButton,
    KxButtonGroup,
    KxButtonGroupSeparator,
    KxButtonGroupText,
    KxCard,
    KxCardContent,
    KxCardDescription,
    KxCardHeader,
    KxCardTitle,
    KxCheckbox,
    KxCodeBlock,
    KxFab,
    KxField,
    KxFieldDescription,
    KxFieldLabel,
    KxFieldMessage,
    KxInform,
    KxInput,
    KxInputGroup,
    KxInputGroupAddon,
    KxInputGroupButton,
    KxInputGroupInput,
    KxInputGroupText,
    KxInputOtp,
    KxLabel,
    KxList,
    KxListItem,
    KxNativeSelect,
    KxNumberInput,
    KxPasswordInput,
    KxRadio,
    KxRadioGroup,
    KxRating,
    KxSegment,
    KxSegmentedControl,
    KxSlider,
    KxSwitch,
    KxTab,
    KxTabList,
    KxTabPanel,
    KxTabs,
    KxTag,
    KxTextarea,
    KxToggle,
    KxToggleGroup,
    KxToggleGroupItem,
  ],
  template: `
    <div class="kx-behaviour">
      <section data-kx-subject="button">
        <button kxButton id="btn-save" (click)="clicks.set(clicks() + 1)">Save</button>
        <button kxButton id="btn-disabled" variant="Outline" disabled (click)="clicks.set(clicks() + 100)">Archived</button>
        <output data-kx-out="clicks">{{ clicks() }}</output>
      </section>

      <section data-kx-subject="fab">
        <button kxFab id="fab" type="button" aria-label="New message" (click)="fabs.set(fabs() + 1)">+</button>
        <output data-kx-out="fabs">{{ fabs() }}</output>
      </section>

      <section data-kx-subject="button-group">
        <div kxButtonGroup aria-label="Quantity">
          <kx-button-group-text>Qty</kx-button-group-text>
          <button kxButton variant="Outline" type="button" id="bg-less" (click)="qty.set(qty() - 1)">Fewer</button>
          <kx-button-group-separator />
          <button kxButton variant="Outline" type="button" id="bg-more" (click)="qty.set(qty() + 1)">More</button>
        </div>
        <output data-kx-out="qty">{{ qty() }}</output>
      </section>

      <section data-kx-subject="field">
        <kx-field>
          <label kxFieldLabel for="fld-email">Email</label>
          <input kxInput id="fld-email" type="email" [(ngModel)]="email" aria-describedby="fld-email-hint fld-email-error" [attr.aria-invalid]="emailInvalid()" />
          <p kxFieldDescription id="fld-email-hint">We only use this to sign you in.</p>
          @if (emailInvalid()) {
            <kx-field-message id="fld-email-error" variant="error">Enter a valid address.</kx-field-message>
          }
        </kx-field>
        <output data-kx-out="email">{{ email }}</output>
      </section>

      <section data-kx-subject="input">
        <label kxLabel for="in-name">Display name</label>
        <input kxInput id="in-name" [(ngModel)]="displayName" />
        <label kxLabel for="in-id">Account ID</label>
        <input kxInput id="in-id" readonly value="acct_7Q2X9" />
        <label kxLabel for="in-org">Organisation</label>
        <input kxInput id="in-org" disabled value="Managed by your admin" />
        <output data-kx-out="displayName">{{ displayName }}</output>
      </section>

      <section data-kx-subject="textarea">
        <label kxLabel for="ta-notes">Notes</label>
        <textarea kxTextarea id="ta-notes" rows="3" [(ngModel)]="notes"></textarea>
        <output data-kx-out="notes">{{ notes }}</output>
      </section>

      <section data-kx-subject="native-select">
        <label kxLabel for="sel-tz">Time zone</label>
        <select kxNativeSelect id="sel-tz" [(ngModel)]="zone">
          <option value="utc">UTC</option>
          <option value="cet">Central European Time</option>
          <option value="jst">Japan Standard Time</option>
        </select>
        <output data-kx-out="zone">{{ zone }}</output>
      </section>

      <section data-kx-subject="number-input">
        <span kxLabel id="ni-label">Seats</span>
        <kx-number-input aria-labelledby="ni-label" [(ngModel)]="seats" [min]="1" [max]="5" />
        <output data-kx-out="seats">{{ seats }}</output>
      </section>

      <section data-kx-subject="password-input">
        <span kxLabel id="pw-label">Password</span>
        <kx-password-input aria-labelledby="pw-label" [(ngModel)]="password" />
        <output data-kx-out="password">{{ password }}</output>
      </section>

      <section data-kx-subject="input-group">
        <label kxLabel for="ig-site">Website</label>
        <kx-input-group>
          <kx-input-group-text>https://</kx-input-group-text>
          <input kxInputGroupInput id="ig-site" [(ngModel)]="site" />
          <button kxInputGroupButton id="ig-clear" (click)="site = ''">Clear</button>
        </kx-input-group>
        <label kxLabel for="ig-weight">Weight</label>
        <kx-input-group>
          <input kxInputGroupInput id="ig-weight" inputmode="decimal" [(ngModel)]="weight" />
          <kx-input-group-addon align="end">kg</kx-input-group-addon>
        </kx-input-group>
        <output data-kx-out="site">{{ site }}</output>
        <output data-kx-out="weight">{{ weight }}</output>
      </section>

      <section data-kx-subject="input-otp">
        <span kxLabel id="otp-label">Verification code</span>
        <kx-input-otp aria-labelledby="otp-label" [groups]="[3, 3]" [(ngModel)]="code" (completed)="completedCode.set($event)" />
        <output data-kx-out="code">{{ code }}</output>
        <output data-kx-out="completed">{{ completedCode() }}</output>
      </section>

      <section data-kx-subject="rating">
        <kx-rating aria-label="Rate this article" [(ngModel)]="stars" />
        <kx-rating aria-label="Rate the venue" [value]="2" disabled />
        <kx-rating id="rating-static" [value]="4" readonly />
        <output data-kx-out="stars">{{ stars }}</output>
      </section>

      <section data-kx-subject="checkbox">
        <kx-checkbox id="cb-updates" aria-label="Product updates" [(ngModel)]="updates" />
        <kx-checkbox id="cb-all" aria-label="All regions" [indeterminate]="regionsMixed()" [(checked)]="regions" (toggled)="regionsMixed.set(false)" />
        <kx-checkbox id="cb-locked" aria-label="Audit log" disabled [checked]="true" />
        <output data-kx-out="updates">{{ updates }}</output>
        <output data-kx-out="regions">{{ regions }}</output>
      </section>

      <section data-kx-subject="switch">
        <kx-switch id="sw-push" aria-label="Push notifications" [(ngModel)]="push" />
        <kx-switch id="sw-sms" aria-label="SMS alerts" disabled />
        <output data-kx-out="push">{{ push }}</output>
      </section>

      <section data-kx-subject="radio-group">
        <kx-radio-group aria-label="Plan" [(ngModel)]="plan">
          <kx-radio value="free">Free</kx-radio>
          <kx-radio value="pro">Pro</kx-radio>
          <kx-radio value="legacy" disabled>Legacy</kx-radio>
          <kx-radio value="team">Team</kx-radio>
        </kx-radio-group>
        <output data-kx-out="plan">{{ plan }}</output>
      </section>

      <section data-kx-subject="segmented-control">
        <kx-segmented-control aria-label="Range" [(value)]="range">
          <kx-segment value="day">Day</kx-segment>
          <kx-segment value="week">Week</kx-segment>
          <kx-segment value="month" disabled>Month</kx-segment>
          <kx-segment value="year">Year</kx-segment>
        </kx-segmented-control>
        <output data-kx-out="range">{{ range }}</output>
      </section>

      <section data-kx-subject="slider">
        <kx-slider aria-label="Volume" [(ngModel)]="volume" [min]="0" [max]="100" [step]="5" />
        <output data-kx-out="volume">{{ volume }}</output>
      </section>

      <section data-kx-subject="toggle">
        <button kxToggle id="tg-bold" aria-label="Bold" [(pressed)]="bold">B</button>
        <output data-kx-out="bold">{{ bold }}</output>
      </section>

      <section data-kx-subject="toggle-group">
        <kx-toggle-group aria-label="Text style" [(value)]="marks">
          <kx-toggle-group-item value="bold">Bold</kx-toggle-group-item>
          <kx-toggle-group-item value="italic">Italic</kx-toggle-group-item>
        </kx-toggle-group>
        <kx-toggle-group type="single" aria-label="Alignment" [(value)]="align">
          <kx-toggle-group-item value="start">Start</kx-toggle-group-item>
          <kx-toggle-group-item value="centre">Centre</kx-toggle-group-item>
          <kx-toggle-group-item value="end">End</kx-toggle-group-item>
        </kx-toggle-group>
        <output data-kx-out="marks">{{ marksText() }}</output>
        <output data-kx-out="align">{{ align }}</output>
      </section>

      <section data-kx-subject="tabs">
        <kx-tabs [(value)]="tab">
          <kx-tab-list aria-label="Project">
            <button kxTab value="overview">Overview</button>
            <button kxTab value="billing" [disabled]="true">Billing</button>
            <button kxTab value="activity">Activity</button>
            <button kxTab value="settings">Settings</button>
          </kx-tab-list>
          <kx-tab-panel value="overview">Three deployments this week.</kx-tab-panel>
          <kx-tab-panel value="billing">Invoices.</kx-tab-panel>
          <kx-tab-panel value="activity">No new activity.</kx-tab-panel>
          <kx-tab-panel value="settings">Project settings.</kx-tab-panel>
        </kx-tabs>
        <output data-kx-out="tab">{{ tab }}</output>
      </section>

      <section data-kx-subject="code-block">
        <kx-code-block [files]="files" />
      </section>

      <section data-kx-subject="banner">
        @if (!bannerGone()) {
          <kx-banner variant="warning" dismissible (dismiss)="bannerGone.set(true)">Scheduled maintenance at 02:00 UTC.</kx-banner>
        }
        <output data-kx-out="banner">{{ bannerGone() ? 'dismissed' : 'shown' }}</output>
      </section>

      <section data-kx-subject="inform">
        @if (!informGone()) {
          <kx-inform variant="error" dismissible (dismiss)="informGone.set(true)">We could not reach the server.</kx-inform>
        }
        <output data-kx-out="inform">{{ informGone() ? 'dismissed' : 'shown' }}</output>
      </section>

      <section data-kx-subject="tag">
        @for (t of tags(); track t) {
          <kx-tag removable (removed)="tags.set(without(t))">{{ t }}</kx-tag>
        }
        <output data-kx-out="tags">{{ tags().join(',') }}</output>
      </section>

      <section data-kx-subject="list">
        <ul kxList>
          <li kxListItem title="Billing" description="Invoices and payment method" pressable (select)="opened.set('billing')"></li>
          <li kxListItem title="Audit log" description="Enterprise plans only" pressable disabled (select)="opened.set('audit')"></li>
        </ul>
        <output data-kx-out="opened">{{ opened() }}</output>
      </section>

      <section data-kx-subject="card">
        <a kxCard id="card-link" href="#reports-q3" (click)="$event.preventDefault(); cardOpened.set('q3')">
          <kx-card-header>
            <kx-card-title>Q3 report</kx-card-title>
            <kx-card-description>Revenue, churn and cohort retention.</kx-card-description>
          </kx-card-header>
        </a>
        <button kxCard id="card-toggle" type="button" [attr.aria-pressed]="backups()" (click)="backups.set(!backups())">
          <span>Daily backups</span>
        </button>
        <output data-kx-out="cardOpened">{{ cardOpened() }}</output>
        <output data-kx-out="backups">{{ backups() }}</output>
        <kx-card id="card-static">
          <kx-card-header><kx-card-title>Usage</kx-card-title></kx-card-header>
          <kx-card-content>12 of 20 seats in use.</kx-card-content>
        </kx-card>
      </section>
    </div>
  `,
  styles: `
    /* minmax(0, 1fr): an auto track is as wide as the widest subject's min-content, which would hand one
       control's overflow to every other subject on the page; this way each one is measured in its own width */
    .kx-behaviour { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; max-inline-size: 40rem; }
    section { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    output { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
  `,
})
export class BehaviourFixture {
  readonly clicks = signal(0);
  readonly fabs = signal(0);
  readonly qty = signal(1);
  email = '';
  readonly emailInvalid = signal<'true' | null>('true');
  displayName = '';
  notes = '';
  zone = 'utc';
  seats: number | null = 2;
  password = '';
  updates = false;
  regions = false;
  readonly regionsMixed = signal(true);
  push = false;
  plan: string | null = 'pro';
  range: string | null = 'week';
  volume = 40;
  bold = false;
  marks: string | string[] | null = ['bold'];
  align: string | string[] | null = 'start';
  tab = 'overview';
  site = 'kinetixui.com';
  weight = '';
  code = '';
  readonly completedCode = signal('');
  stars = 0;
  readonly cardOpened = signal('');
  readonly backups = signal(false);
  readonly files = [
    { name: 'main.ts', code: "bootstrapApplication(App);", language: 'ts' },
    { name: 'app.html', code: '<button kxButton>Save</button>', language: 'html' },
  ];
  readonly bannerGone = signal(false);
  readonly informGone = signal(false);
  readonly tags = signal(['Design', 'Research']);
  readonly opened = signal('');

  marksText(): string {
    return Array.isArray(this.marks) ? this.marks.join(',') : String(this.marks ?? '');
  }
  without(tag: string): string[] {
    return this.tags().filter((t) => t !== tag);
  }
}
