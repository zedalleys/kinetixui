import { Component, signal } from '@angular/core';
import { KxButton } from '../lib/button';
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

/**
 * Navigation and disclosure, wired to state the page can read back — the subject of the keyboard, RTL, 200%
 * text and motion passes in `scripts/angular-browser.mjs`, and of `scripts/navigation-visual.mjs`.
 *
 * The same conventions as `behaviour.ts`: each subject sits in its own `[data-kx-subject]` region, every value
 * it changes is bound into an `<output data-kx-out="…">`, and controls a visual gate addresses carry
 * `data-kx-case`. Links point at in-page fragments, so following one never leaves the harness.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxButton,
    KxAccordion,
    KxAccordionContent,
    KxAccordionItem,
    KxAccordionTrigger,
    KxCollapsible,
    KxCollapsibleContent,
    KxCollapsibleTrigger,
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
  ],
  template: `
    <div class="kx-navigation-fixture">
      <section data-kx-subject="app-bar">
        <header kxAppBar [sticky]="false" [(open)]="menuOpen">
          <a kxAppBarBrand href="#top">Acme Analytics</a>
          <nav kxAppBarNav aria-label="Primary">
            <a kxAppBarLink href="#overview" data-kx-case="current" active>Overview</a>
            <a kxAppBarLink href="#reports" data-kx-case="rest" (click)="followed.set('reports')">Reports</a>
            <a kxAppBarLink href="#settings">Settings</a>
          </nav>
          <div kxAppBarActions><button kxButton id="app-bar-new" type="button" size="sm">New report</button></div>
        </header>
        <output data-kx-out="menu">{{ menuOpen() }}</output>
        <output data-kx-out="followed">{{ followed() }}</output>
      </section>

      <section data-kx-subject="breadcrumb">
        <nav kxBreadcrumb>
          <ol kxBreadcrumbList>
            <li kxBreadcrumbItem><a kxBreadcrumbLink id="crumb-home" href="#home" data-kx-case="rest">Home</a></li>
            <li kxBreadcrumbSeparator></li>
            <li kxBreadcrumbItem><a kxBreadcrumbLink id="crumb-settings" href="#settings">Workspace settings</a></li>
            <li kxBreadcrumbSeparator></li>
            <li kxBreadcrumbItem><span kxBreadcrumbPage data-kx-case="current">Billing and invoices</span></li>
          </ol>
        </nav>
      </section>

      <section data-kx-subject="pagination">
        <nav kxPagination label="Results pages">
          <ul kxPaginationContent>
            <li kxPaginationItem>
              <button kxPaginationPrevious id="page-prev" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
            </li>
            @for (n of pages; track n) {
              <li kxPaginationItem>
                <button kxPaginationLink [attr.data-kx-case]="n === page() ? 'current' : n === 3 ? 'rest' : null" [current]="n === page()" (click)="page.set(n)">{{ n }}</button>
              </li>
            }
            <li kxPaginationItem><kx-pagination-ellipsis /></li>
            <li kxPaginationItem>
              <button kxPaginationNext id="page-next" [disabled]="page() === pages.length" (click)="page.set(page() + 1)">Next</button>
            </li>
          </ul>
        </nav>
        <output data-kx-out="page">{{ page() }}</output>
        <nav kxPagination label="Archive pages">
          <ul kxPaginationContent>
            <li kxPaginationItem><a kxPaginationPrevious id="archive-prev" href="#archive-0" disabled>Previous</a></li>
            <li kxPaginationItem><a kxPaginationLink id="archive-1" href="#archive-1" current>1</a></li>
            <li kxPaginationItem><a kxPaginationLink id="archive-2" href="#archive-2">2</a></li>
            <li kxPaginationItem><a kxPaginationNext id="archive-next" href="#archive-2">Next</a></li>
          </ul>
        </nav>
      </section>

      <section data-kx-subject="table-of-contents">
        <nav kxTableOfContents [items]="sections" [(active)]="section"></nav>
        <output data-kx-out="section">{{ section() }}</output>
      </section>

      <section data-kx-subject="accordion">
        <kx-accordion type="single" collapsible [(value)]="faq" id="faq">
          <kx-accordion-item value="shipping">
            <kx-accordion-trigger data-kx-case="expanded">When will my order ship?</kx-accordion-trigger>
            <kx-accordion-content>
              Orders leave the warehouse within two working days. <a href="#delivery" id="faq-link">Delivery times</a>
            </kx-accordion-content>
          </kx-accordion-item>
          <kx-accordion-item value="returns">
            <kx-accordion-trigger data-kx-case="collapsed">Can I return an item after thirty days?</kx-accordion-trigger>
            <kx-accordion-content>Yes, for store credit, in its original packaging.</kx-accordion-content>
          </kx-accordion-item>
          <kx-accordion-item value="gift" disabled>
            <kx-accordion-trigger data-kx-case="disabled">Gift wrapping</kx-accordion-trigger>
            <kx-accordion-content>Not offered this season.</kx-accordion-content>
          </kx-accordion-item>
          <kx-accordion-item value="warranty">
            <kx-accordion-trigger>What does the warranty cover?</kx-accordion-trigger>
            <kx-accordion-content>Manufacturing faults, for two years from delivery.</kx-accordion-content>
          </kx-accordion-item>
        </kx-accordion>
        <output data-kx-out="faq">{{ faq().join(',') }}</output>
        <kx-accordion type="single" [(value)]="plan" id="plan" [headingLevel]="4">
          <kx-accordion-item value="team">
            <kx-accordion-trigger>Team plan</kx-accordion-trigger>
            <kx-accordion-content>Up to 20 seats.</kx-accordion-content>
          </kx-accordion-item>
          <kx-accordion-item value="enterprise">
            <kx-accordion-trigger>Enterprise plan</kx-accordion-trigger>
            <kx-accordion-content>Unlimited seats and SSO.</kx-accordion-content>
          </kx-accordion-item>
        </kx-accordion>
        <output data-kx-out="plan">{{ plan().join(',') }}</output>
        <kx-accordion type="multiple" [(value)]="topics" id="topics">
          <kx-accordion-item value="a">
            <kx-accordion-trigger>Alerts</kx-accordion-trigger>
            <kx-accordion-content>Thresholds and channels.</kx-accordion-content>
          </kx-accordion-item>
          <kx-accordion-item value="b">
            <kx-accordion-trigger>Billing</kx-accordion-trigger>
            <kx-accordion-content>Invoices and payment.</kx-accordion-content>
          </kx-accordion-item>
        </kx-accordion>
        <output data-kx-out="topics">{{ topics().join(',') }}</output>
      </section>

      <section data-kx-subject="collapsible">
        <kx-collapsible [(open)]="advanced" id="advanced">
          <button kxButton kxCollapsibleTrigger id="advanced-trigger" variant="Outline" size="sm">Advanced settings</button>
          <kx-collapsible-content>
            <p class="kx-fixture-note"><a href="#webhooks" id="advanced-link">Webhooks</a> retry failed deliveries three times, an hour apart.</p>
          </kx-collapsible-content>
        </kx-collapsible>
        <output data-kx-out="advanced">{{ advanced() }}</output>
        <kx-collapsible disabled id="locked">
          <button kxButton kxCollapsibleTrigger id="locked-trigger" variant="Outline" size="sm">Audit export</button>
          <kx-collapsible-content><p>Enterprise only.</p></kx-collapsible-content>
        </kx-collapsible>
      </section>

      <section data-kx-subject="tab-bar">
        <nav kxTabBar aria-label="Primary sections">
          @for (dest of destinations; track dest.id) {
            <button
              kxTabBarItem
              [id]="'tb-' + dest.id"
              [active]="dest.id === destination()"
              [badge]="dest.badge"
              [attr.data-kx-case]="dest.id === destination() ? 'current' : dest.id === 'inbox' ? 'rest' : null"
              (click)="destination.set(dest.id)"
            >
              <svg kxTabBarIcon viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="currentColor" /></svg>
              {{ dest.label }}
            </button>
          }
        </nav>
        <output data-kx-out="destination">{{ destination() }}</output>
      </section>

      <section data-kx-subject="stepper">
        <ol kxStepper [steps]="steps" [current]="step()"></ol>
        <ol kxStepper id="stepper-vertical" orientation="vertical" [steps]="steps" [current]="2"></ol>
      </section>

      <section data-kx-subject="navigation-bar">
        <header kxNavigationBar title="Conversation with the regional support team" infoText="Last reply 5 minutes ago" backButton [level]="2" (back)="backs.set(backs() + 1)">
          <button kxButton kxNavigationBarActions id="nb-edit" type="button" variant="Ghost" size="sm">Edit</button>
        </header>
        <output data-kx-out="backs">{{ backs() }}</output>
      </section>

      <section data-kx-subject="footer">
        <footer kxFooter>
          <div kxFooterColumns>
            <kx-footer-column title="Product">
              <a kxFooterLink id="ft-pricing" href="#pricing">Pricing</a>
              <a kxFooterLink href="#changelog">Changelog</a>
            </kx-footer-column>
            <kx-footer-column title="Company">
              <a kxFooterLink href="#about">About</a>
              <a kxFooterLink href="#careers">Careers</a>
            </kx-footer-column>
          </div>
          <div kxFooterBottom>
            <span>&copy; 2026 Acme, Inc.</span>
            <a kxFooterLink id="ft-privacy" href="#privacy">Privacy</a>
          </div>
        </footer>
      </section>
    </div>
  `,
  styles: `
    .kx-navigation-fixture { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; max-inline-size: 48rem; }
    section { display: flex; flex-direction: column; align-items: stretch; gap: 12px; }
    output { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .kx-fixture-note { margin: 0; font: var(--text-body-md); }
  `,
})
export class NavigationFixture {
  readonly menuOpen = signal(false);
  readonly followed = signal('');
  readonly pages = [1, 2, 3, 4];
  readonly page = signal(1);
  readonly sections: KxTocItem[] = [
    { id: 'install', label: 'Installation' },
    { id: 'tokens', label: 'Load the token stylesheets', level: 2 },
    { id: 'usage', label: 'Usage' },
  ];
  readonly section = signal<string | null>('install');
  readonly faq = signal<readonly string[]>(['shipping']);
  readonly plan = signal<readonly string[]>(['team']);
  readonly topics = signal<readonly string[]>([]);
  readonly advanced = signal(false);
  readonly destinations = [
    { id: 'home', label: 'Home', badge: null },
    { id: 'inbox', label: 'Inbox', badge: '3' },
    { id: 'account', label: 'Account', badge: null },
  ];
  readonly destination = signal('home');
  readonly steps: KxStep[] = [
    { label: 'Account', description: 'Email and password' },
    { label: 'Workspace', description: 'Name and data region' },
    { label: 'Invite', description: 'Add your team' },
  ];
  readonly step = signal(1);
  readonly backs = signal(0);
}
