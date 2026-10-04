import { Component, signal } from '@angular/core';
import {
  KxAccordion,
  KxAccordionContent,
  KxAccordionItem,
  KxAccordionTrigger,
  KxAppBar,
  KxAppBarActions,
  KxAppBarBrand,
  KxAppBarLink,
  KxAppBarNav,
  KxBadge,
  KxBreadcrumb,
  KxBreadcrumbItem,
  KxBreadcrumbLink,
  KxBreadcrumbList,
  KxBreadcrumbPage,
  KxBreadcrumbSeparator,
  KxButton,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardHeader,
  KxCardTitle,
  KxCollapsible,
  KxCollapsibleContent,
  KxCollapsibleTrigger,
  KxField,
  KxFieldDescription,
  KxFieldLabel,
  KxFooter,
  KxFooterBottom,
  KxFooterColumn,
  KxFooterColumns,
  KxFooterLink,
  KxInput,
  KxInputGroup,
  KxInputGroupInput,
  KxInputGroupText,
  KxNavigationBar,
  KxNumberInput,
  KxPagination,
  KxPaginationContent,
  KxPaginationItem,
  KxPaginationNext,
  KxPaginationPrevious,
  KxRadio,
  KxRadioGroup,
  KxStepper,
  KxSwitch,
  KxTabBar,
  KxTabBarItem,
  KxTableOfContents,
  type KxStep,
  type KxTocItem,
} from '../public-api';

/**
 * Realistic compositions of Wave B with the controls that already shipped — the pages a product would build,
 * not a grid of states. Rendered for review (light, dark, RTL, 200% text) and put under axe with every other
 * fixture by `scripts/angular-browser.mjs`. Nothing here is measured by a state gate; that is
 * `navigation.ts`'s job. Layout is the page's own (the `styles` below), as an app's would be.
 *
 *   docs      a documentation page: app bar, breadcrumb, an "On this page" contents, the article with a
 *             collapsible feedback panel, Previous/Next between pages, a footer
 *   settings  a workspace settings screen: a navigation bar with Back and Save, setup progress as a stepper,
 *             form sections in an accordion (fields, an input group, a number input, a switch, a radio
 *             group), a help panel of FAQs, and a phone-width tab bar
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxAccordion, KxAccordionContent, KxAccordionItem, KxAccordionTrigger,
    KxAppBar, KxAppBarActions, KxAppBarBrand, KxAppBarLink, KxAppBarNav,
    KxBadge, KxButton, KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle,
    KxBreadcrumb, KxBreadcrumbItem, KxBreadcrumbLink, KxBreadcrumbList, KxBreadcrumbPage, KxBreadcrumbSeparator,
    KxCollapsible, KxCollapsibleContent, KxCollapsibleTrigger,
    KxField, KxFieldDescription, KxFieldLabel, KxInput, KxInputGroup, KxInputGroupInput, KxInputGroupText,
    KxFooter, KxFooterBottom, KxFooterColumn, KxFooterColumns, KxFooterLink,
    KxNavigationBar, KxNumberInput, KxRadio, KxRadioGroup, KxStepper, KxSwitch,
    KxPagination, KxPaginationContent, KxPaginationItem, KxPaginationNext, KxPaginationPrevious,
    KxTabBar, KxTabBarItem, KxTableOfContents,
  ],
  styles: `
    :host { display: block; }
    .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 48px; }
    .docs-body { display: grid; grid-template-columns: minmax(0, 1fr) 14rem; gap: 32px; padding: 24px 24px 0; max-inline-size: 64rem; margin-inline: auto; }
    .docs-body article { min-inline-size: 0; }
    .docs-body h1 { font: var(--text-heading-lg, 600 1.75rem/1.25 var(--font-family-sans)); margin: 12px 0 8px; }
    .docs-body h2 { font: 600 1.25rem/1.3 var(--font-family-sans); margin: 28px 0 8px; }
    .docs-body p { color: hsl(var(--muted-foreground)); line-height: 1.6; margin: 0 0 12px; }
    .docs-aside { position: sticky; inset-block-start: 88px; align-self: start; }
    .feedback { margin-block: 24px; padding: 16px; border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); }
    .feedback-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .pager { margin-block: 32px 48px; }
    .settings { display: grid; grid-template-columns: minmax(0, 1fr) 18rem; gap: 24px; padding: 24px; max-inline-size: 64rem; margin-inline: auto; }
    .settings-main { display: grid; gap: 24px; min-inline-size: 0; }
    .section { display: grid; gap: 16px; padding-block: 4px 8px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .row span { color: hsl(var(--foreground)); }
    .phone { inline-size: 390px; max-inline-size: 100%; border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); overflow: hidden; }
    .phone-body { padding: 16px; min-block-size: 120px; color: hsl(var(--muted-foreground)); }
    @media (max-width: 48rem) {
      .docs-body, .settings { grid-template-columns: minmax(0, 1fr); }
      .docs-aside { position: static; }
    }
  `,
  template: `
    <div class="page">
      <!-- ── docs ───────────────────────────────────────────────────────── -->
      <section data-kx-composition="docs" aria-label="Documentation page">
        <header kxAppBar [(open)]="menu" [sticky]="false">
          <a kxAppBarBrand href="#home">Acme Docs</a>
          <nav kxAppBarNav aria-label="Primary">
            <a kxAppBarLink href="#guides" active>Guides</a>
            <a kxAppBarLink href="#api">API reference</a>
            <a kxAppBarLink href="#changelog">Changelog</a>
          </nav>
          <div kxAppBarActions><a kxButton href="#signin" variant="Outline" size="sm">Sign in</a></div>
        </header>
        <div class="docs-body">
          <article>
            <nav kxBreadcrumb>
              <ol kxBreadcrumbList>
                <li kxBreadcrumbItem><a kxBreadcrumbLink href="#guides">Guides</a></li>
                <li kxBreadcrumbSeparator></li>
                <li kxBreadcrumbItem><a kxBreadcrumbLink href="#workspaces">Workspaces</a></li>
                <li kxBreadcrumbSeparator></li>
                <li kxBreadcrumbItem><span kxBreadcrumbPage>Inviting your team</span></li>
              </ol>
            </nav>
            <h1 id="inviting">Inviting your team</h1>
            <p>Invite people by email or share a link. Everyone you invite joins as a member; you can change roles at any time.</p>
            <h2 id="by-email">Invite by email</h2>
            <p>Open Workspace settings, choose Members, and enter one address per line. Invitations expire after seven days.</p>
            <h2 id="by-link">Share an invite link</h2>
            <p>A link lets anyone with an address on your company domain join without an invitation.</p>
            <h2 id="roles">Roles and permissions</h2>
            <p>Owners manage billing; admins manage members; members create and edit reports.</p>
            <kx-collapsible class="feedback" [(open)]="feedback">
              <button kxButton kxCollapsibleTrigger variant="Ghost" size="sm">Was this page helpful?</button>
              <kx-collapsible-content>
                <div class="feedback-row">
                  <button kxButton variant="Outline" size="sm">Yes</button>
                  <button kxButton variant="Outline" size="sm">No</button>
                  <a href="#issue">Report an issue with this page</a>
                </div>
              </kx-collapsible-content>
            </kx-collapsible>
            <nav kxPagination class="pager" label="Guides">
              <ul kxPaginationContent>
                <li kxPaginationItem><a kxPaginationPrevious href="#workspaces">Workspaces</a></li>
                <li kxPaginationItem><a kxPaginationNext href="#billing">Billing</a></li>
              </ul>
            </nav>
          </article>
          <aside class="docs-aside">
            <nav kxTableOfContents [items]="toc" [(active)]="section"></nav>
          </aside>
        </div>
        <footer kxFooter>
          <div kxFooterColumns>
            <kx-footer-column title="Product">
              <a kxFooterLink href="#features">Features</a>
              <a kxFooterLink href="#pricing">Pricing</a>
            </kx-footer-column>
            <kx-footer-column title="Developers">
              <a kxFooterLink href="#api">API reference</a>
              <a kxFooterLink href="#status">Status</a>
            </kx-footer-column>
            <kx-footer-column title="Company">
              <a kxFooterLink href="#about">About</a>
              <a kxFooterLink href="#careers">Careers</a>
            </kx-footer-column>
          </div>
          <div kxFooterBottom>
            <span>© 2026 Acme, Inc.</span>
            <a kxFooterLink href="#privacy">Privacy</a>
          </div>
        </footer>
      </section>

      <!-- ── settings ───────────────────────────────────────────────────── -->
      <section data-kx-composition="settings" aria-label="Settings screen">
        <header kxNavigationBar title="Workspace settings" infoText="Acme Analytics" backButton [level]="1" (back)="backs.set(backs() + 1)">
          <button kxButton kxNavigationBarActions size="sm">Save</button>
        </header>
        <div class="settings">
          <div class="settings-main">
            <ol kxStepper [steps]="setup" [current]="1" aria-label="Workspace setup"></ol>
            <kx-accordion type="multiple" [(value)]="open" [headingLevel]="2">
              <kx-accordion-item value="profile">
                <kx-accordion-trigger>Profile</kx-accordion-trigger>
                <kx-accordion-content>
                  <div class="section">
                    <kx-field>
                      <label kxFieldLabel for="ws-name">Workspace name</label>
                      <input kxInput id="ws-name" value="Acme Analytics" aria-describedby="ws-name-hint" />
                      <p kxFieldDescription id="ws-name-hint">Shown in invitations and on shared reports.</p>
                    </kx-field>
                    <kx-field>
                      <label kxFieldLabel for="ws-url">Workspace address</label>
                      <kx-input-group>
                        <kx-input-group-text>acme.app/</kx-input-group-text>
                        <input kxInputGroupInput id="ws-url" value="analytics" />
                      </kx-input-group>
                    </kx-field>
                  </div>
                </kx-accordion-content>
              </kx-accordion-item>
              <kx-accordion-item value="notifications">
                <kx-accordion-trigger>Notifications</kx-accordion-trigger>
                <kx-accordion-content>
                  <div class="section">
                    <div class="row"><span id="digest-label">Weekly digest email</span><kx-switch [(checked)]="digest" aria-labelledby="digest-label" /></div>
                    <div class="row"><span id="alerts-label">Alert when a report fails</span><kx-switch [(checked)]="alerts" aria-labelledby="alerts-label" /></div>
                  </div>
                </kx-accordion-content>
              </kx-accordion-item>
              <kx-accordion-item value="billing">
                <kx-accordion-trigger>Plan and seats</kx-accordion-trigger>
                <kx-accordion-content>
                  <div class="section">
                    <kx-radio-group [(value)]="plan" aria-label="Plan">
                      <kx-radio value="team">Team</kx-radio>
                      <kx-radio value="business">Business</kx-radio>
                    </kx-radio-group>
                    <div class="row"><span id="seats-label">Seats</span><kx-number-input [(value)]="seats" [min]="1" [max]="500" aria-labelledby="seats-label" /></div>
                  </div>
                </kx-accordion-content>
              </kx-accordion-item>
            </kx-accordion>
          </div>
          <kx-card>
            <kx-card-header>
              <kx-card-title>Help</kx-card-title>
              <kx-card-description>Common questions about workspaces.</kx-card-description>
            </kx-card-header>
            <kx-card-content>
              <kx-accordion type="single" collapsible [(value)]="help" [headingLevel]="3">
                <kx-accordion-item value="rename">
                  <kx-accordion-trigger>Does renaming break shared links?</kx-accordion-trigger>
                  <kx-accordion-content>No. Links use the workspace's id, so they keep working.</kx-accordion-content>
                </kx-accordion-item>
                <kx-accordion-item value="seats">
                  <kx-accordion-trigger>When are new seats billed?</kx-accordion-trigger>
                  <kx-accordion-content>On the next invoice, prorated from the day they are added.</kx-accordion-content>
                </kx-accordion-item>
              </kx-accordion>
            </kx-card-content>
          </kx-card>
        </div>
        <div class="settings">
          <div class="phone">
            <header kxNavigationBar title="Inbox" [level]="2"></header>
            <div class="phone-body">Three unread reports. <kx-badge>New</kx-badge></div>
            <nav kxTabBar aria-label="Primary sections">
              <a kxTabBarItem href="#home"><svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="currentColor" /></svg>Home</a>
              <a kxTabBarItem href="#inbox" active badge="3"><svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z M4 13h5l1 2h4l1-2h5" fill="none" stroke="currentColor" stroke-width="2" /></svg>Inbox</a>
              <a kxTabBarItem href="#account"><svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" fill="currentColor" /></svg>Account</a>
            </nav>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class CompositionsFixture {
  readonly menu = signal(false);
  readonly feedback = signal(true);
  readonly section = signal<string | null>('by-email');
  readonly toc: KxTocItem[] = [
    { id: 'inviting', label: 'Inviting your team' },
    { id: 'by-email', label: 'Invite by email', level: 1 },
    { id: 'by-link', label: 'Share an invite link', level: 1 },
    { id: 'roles', label: 'Roles and permissions', level: 1 },
  ];
  readonly backs = signal(0);
  readonly setup: KxStep[] = [
    { label: 'Create workspace', description: 'Name and address' },
    { label: 'Invite your team', description: 'By email or link' },
    { label: 'Connect data', description: 'A warehouse or CSV' },
  ];
  readonly open = signal<readonly string[]>(['profile', 'notifications']);
  readonly help = signal<readonly string[]>(['rename']);
  readonly digest = signal(true);
  readonly alerts = signal(false);
  readonly plan = signal<string | null>('team');
  readonly seats = signal<number | null>(12);
}
