import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KxNavigationMenu,
  KxNavigationMenuContent,
  KxNavigationMenuIndicator,
  KxNavigationMenuItem,
  KxNavigationMenuLink,
  KxNavigationMenuList,
  KxNavigationMenuTrigger,
} from './navigation-menu';
import { KxNotificationCenter, KxNotificationCenterContent, KxNotificationCenterTrigger, KxNotificationItem } from './notification-center';
import {
  KxSidebar,
  KxSidebarContent,
  KxSidebarGroup,
  KxSidebarGroupLabel,
  KxSidebarInset,
  KxSidebarMenu,
  KxSidebarMenuButton,
  KxSidebarMenuItem,
  KxSidebarProvider,
  KxSidebarTrigger,
} from './sidebar';
import { KxToaster, KxToasterService } from './sonner';
import { KxTour, type KxTourStep } from './tour';

// Wave C3's semantics in jsdom: the roles, names and states each part renders, and the state the parts share.
// jsdom has no layout, no top layer, no real focus order and no media queries; the keyboard, the pointer,
// direction, placement, timing against a real clock, the breakpoint and axe are measured in Chromium by
// scripts/angular-overlays.mjs (sonner, notification center, tour), scripts/angular-collections.mjs (navigation
// menu) and scripts/angular-browser.mjs (sidebar).

function host<T extends object>(template: string, imports: unknown[], state: T = {} as T) {
  @Component({ template, imports: imports as never[] })
  class Host {}
  Object.assign(Host.prototype, state);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, state: fixture.componentInstance as unknown as T };
}
const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

/* ── navigation menu ────────────────────────────────────────────────────── */

const NAV = [KxNavigationMenu, KxNavigationMenuList, KxNavigationMenuItem, KxNavigationMenuTrigger, KxNavigationMenuContent, KxNavigationMenuLink, KxNavigationMenuIndicator];
const navTemplate = `
  <nav kxNavigationMenu [(value)]="value">
    <ul kxNavigationMenuList>
      <li kxNavigationMenuItem value="products">
        <button kxNavigationMenuTrigger>Products</button>
        <kx-navigation-menu-content>
          <ul><li><a kxNavigationMenuLink href="/analytics">Analytics</a></li><li><a kxNavigationMenuLink href="/billing" active>Billing</a></li></ul>
        </kx-navigation-menu-content>
      </li>
      <li kxNavigationMenuItem><a kxNavigationMenuLink href="/pricing">Pricing</a></li>
    </ul>
    <kx-navigation-menu-indicator />
  </nav>`;

describe('navigation menu', () => {
  it('is a navigation landmark of buttons and links — never a menu', async () => {
    const { el, fixture } = host(navTemplate, NAV, { value: null as string | null });
    await settle(fixture);
    const nav = el.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Main');
    expect(el.querySelector('[role="menu"], [role="menubar"], [role="menuitem"]')).toBeNull();
    const trigger = el.querySelector<HTMLButtonElement>('button.kx-navigation-menu__trigger')!;
    expect(trigger.type).toBe('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('a[href]')).toHaveLength(3);
    expect(el.querySelector('a[href="/billing"]')!.getAttribute('aria-current')).toBe('page');
    expect(el.querySelector('a[href="/pricing"]')!.classList).toContain('kx-navigation-menu__link--top');
    expect(el.querySelector('.kx-navigation-menu__indicator')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the caller’s own name', () => {
    const { el } = host(`<nav kxNavigationMenu aria-label="Docs"><ul kxNavigationMenuList></ul></nav>`, NAV);
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Docs');
  });

  it('opens with a press, names the panel by its trigger, and follows [(value)]', async () => {
    const { el, fixture, state } = host(navTemplate, NAV, { value: null as string | null });
    const trigger = el.querySelector<HTMLButtonElement>('button.kx-navigation-menu__trigger')!;
    trigger.click();
    await settle(fixture);
    expect(state.value).toBe('products');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panel = el.querySelector('kx-navigation-menu-content')!;
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(panel.hasAttribute('role')).toBe(false);
    trigger.click();
    await settle(fixture);
    expect(state.value).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

/* ── sonner ─────────────────────────────────────────────────────────────── */

describe('toaster', () => {
  afterEach(() => vi.useRealTimers());

  it('is one polite live region — never an alert — named with its hotkey', () => {
    const { el } = host(`<kx-toaster />`, [KxToaster]);
    const region = el.querySelector('section.kx-toaster')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-relevant')).toBe('additions text');
    expect(region.getAttribute('aria-atomic')).toBe('false');
    expect(region.getAttribute('aria-label')).toBe('Notifications alt+T');
    expect(el.querySelector('[role="alert"], [aria-live="assertive"]')).toBeNull();
  });

  it('renders the newest toasts up to the limit, with the type in words and named buttons', async () => {
    const { el, fixture } = host(`<kx-toaster [visibleToasts]="2" closeButton />`, [KxToaster]);
    const toast = TestBed.inject(KxToasterService);
    toast.success('Saved');
    toast.error('Failed', { description: 'Try again' });
    toast.show('Third', { action: { label: 'Undo', onClick: () => {} } });
    await settle(fixture);
    const items = [...el.querySelectorAll('li.kx-toast')];
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain('Third');
    expect(items[1]!.querySelector('.kx-toast__title')!.textContent!.trim()).toBe('Error: Failed');
    expect(items[1]!.querySelector('.kx-toast__icon')!.getAttribute('aria-hidden')).toBe('true');
    expect(items[0]!.querySelector('.kx-toast__close')!.getAttribute('aria-label')).toBe('Close toast');
    expect(items[0]!.querySelector('.kx-toast__button--action')!.textContent!.trim()).toBe('Undo');
    toast.dismiss();
  });

  it('an action dismisses its toast unless it prevents the default', async () => {
    const { el, fixture } = host(`<kx-toaster />`, [KxToaster]);
    const toast = TestBed.inject(KxToasterService);
    toast.show('Keep', { action: { label: 'Stay', onClick: (e) => e.preventDefault() } });
    toast.show('Go', { action: { label: 'Leave', onClick: () => {} } });
    await settle(fixture);
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('.kx-toast__button--action')];
    buttons().find((b) => b.textContent!.includes('Leave'))!.click();
    await settle(fixture);
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Stay']);
    buttons()[0]!.click();
    await settle(fixture);
    expect(buttons()).toHaveLength(1);
    toast.dismiss();
  });

  it('separates toasters by id', async () => {
    const { el, fixture } = host(`<kx-toaster /><kx-toaster id="panel" />`, [KxToaster]);
    const toast = TestBed.inject(KxToasterService);
    toast.show('Main');
    toast.show('Panel', { toasterId: 'panel' });
    await settle(fixture);
    const [main, panel] = [...el.querySelectorAll('section.kx-toaster')];
    expect(main!.textContent).toContain('Main');
    expect(main!.textContent).not.toContain('Panel');
    expect(panel!.textContent).toContain('Panel');
    toast.dismiss();
  });

  it('a destroyed toaster detaches: its toasts stop counting down', async () => {
    vi.useFakeTimers();
    const { fixture } = host(`<kx-toaster />`, [KxToaster]);
    const toast = TestBed.inject(KxToasterService);
    toast.show('Hello');
    await settle(fixture);
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    fixture.destroy();
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });
});

/* ── notification center ────────────────────────────────────────────────── */

const NC = [KxNotificationCenter, KxNotificationCenterTrigger, KxNotificationCenterContent, KxNotificationItem];

describe('notification center', () => {
  it('names the trigger with the unread count and draws the dot as decoration', async () => {
    const { el, fixture, state } = host(
      `<kx-notification-center><button kxNotificationCenterTrigger [unreadCount]="count"></button>
         <kx-notification-center-content showMarkAllRead>
           <kx-notification-item title="Deploy finished" description="main is live" time="2 min ago" unread />
           <kx-notification-item title="Invite accepted" pressable (select)="opened = true" />
         </kx-notification-center-content></kx-notification-center>`,
      NC,
      { count: 2, opened: false },
    );
    await settle(fixture);
    const trigger = el.querySelector('button[kxNotificationCenterTrigger]')!;
    expect(trigger.getAttribute('aria-label')).toBe('Notifications, 2 unread');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.querySelector('.kx-notification-center__dot')!.getAttribute('aria-hidden')).toBe('true');
    const content = el.querySelector('kx-notification-center-content')!;
    expect(content.getAttribute('role')).toBe('dialog');
    const heading = content.querySelector('h2')!;
    expect(content.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(content.querySelector('[role="list"]')).not.toBeNull();
    const items = content.querySelectorAll('[role="listitem"]');
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain('Unread: Deploy finished');
    expect(items[0]!.hasAttribute('title')).toBe(false);
    (items[1]!.querySelector('button') as HTMLButtonElement).click();
    expect(state.opened).toBe(true);
    state.count = 0;
    await settle(fixture);
    expect(trigger.getAttribute('aria-label')).toBe('Notifications');
    expect(trigger.querySelector('.kx-notification-center__dot')).toBeNull();
    expect(content.querySelector('.kx-notification-center__mark')!.textContent!.trim()).toBe('Mark all read');
  });

  it('drops the list role while empty', async () => {
    const { el, fixture } = host(
      `<kx-notification-center><button kxNotificationCenterTrigger></button><kx-notification-center-content><p>All caught up</p></kx-notification-center-content></kx-notification-center>`,
      NC,
    );
    await settle(fixture);
    expect(el.querySelector('[role="list"]')).toBeNull();
  });
});

/* ── tour ───────────────────────────────────────────────────────────────── */

const STEPS: KxTourStep[] = [
  { target: '#one', title: 'First', content: 'The first thing.' },
  { target: '#two', title: 'Second', content: 'The second thing.' },
  { target: '#missing', title: 'Third', content: 'Not on this page.' },
];

describe('tour', () => {
  it('is a modal dialog named by the step title, with a counter in words and the right buttons per step', async () => {
    const { el, fixture, state } = host(
      `<button id="one">One</button><button id="two">Two</button><kx-tour [steps]="steps" [(open)]="open" [(stepIndex)]="index" />`,
      [KxTour],
      { steps: STEPS, open: true, index: 0 },
    );
    await settle(fixture);
    const dialog = el.querySelector('dialog.kx-tour')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    const title = dialog.querySelector('h2')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent!.trim()).toBe('First');
    expect(dialog.getAttribute('aria-describedby')).toBe(dialog.querySelector('p')!.id);
    expect(dialog.querySelector('.kx-sr-only')!.textContent).toBe('Step 1 of 3');
    expect(dialog.querySelector('.kx-tour__spotlight')!.getAttribute('aria-hidden')).toBe('true');
    const labels = () => [...dialog.querySelectorAll('.kx-tour__actions button')].map((b) => b.textContent!.trim());
    expect(labels()).toEqual(['Skip', 'Next']);
    (dialog.querySelectorAll('.kx-tour__actions button')[1] as HTMLButtonElement).click();
    await settle(fixture);
    expect(state.index).toBe(1);
    expect(labels()).toEqual(['Back', 'Skip', 'Next']);
    (dialog.querySelectorAll('.kx-tour__actions button')[2] as HTMLButtonElement).click();
    await settle(fixture);
    expect(state.index).toBe(2);
    expect(labels()).toEqual(['Back', 'Done']);
    (dialog.querySelectorAll('.kx-tour__actions button')[1] as HTMLButtonElement).click();
    await settle(fixture);
    expect(state.open).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('marks a step whose target is missing', async () => {
    const { el, fixture } = host(`<kx-tour [steps]="steps" [open]="true" [stepIndex]="2" />`, [KxTour], { steps: STEPS });
    await settle(fixture);
    expect(el.querySelector('dialog.kx-tour')!.getAttribute('data-target')).toBe('missing');
  });
});

/* ── sidebar ────────────────────────────────────────────────────────────── */

const SIDEBAR = [KxSidebarProvider, KxSidebar, KxSidebarTrigger, KxSidebarInset, KxSidebarContent, KxSidebarGroup, KxSidebarGroupLabel, KxSidebarMenu, KxSidebarMenuItem, KxSidebarMenuButton];
const sidebarTemplate = `
  <kx-sidebar-provider [(open)]="open">
    <kx-sidebar [collapsible]="collapsible">
      <kx-sidebar-content><kx-sidebar-group><div kxSidebarGroupLabel>Workspace</div>
        <ul kxSidebarMenu>
          <li kxSidebarMenuItem><a kxSidebarMenuButton href="/inbox" active><span>Inbox</span></a></li>
          <li kxSidebarMenuItem><button kxSidebarMenuButton><span>New</span></button></li>
        </ul>
      </kx-sidebar-group></kx-sidebar-content>
    </kx-sidebar>
    <main kxSidebarInset><button kxSidebarTrigger></button></main>
  </kx-sidebar-provider>`;

describe('sidebar', () => {
  it('renders one copy of its content, marks the current page, and toggles from the trigger', async () => {
    const { el, fixture, state } = host(sidebarTemplate, SIDEBAR, { open: true, collapsible: 'offcanvas' });
    await settle(fixture);
    expect(el.querySelectorAll('a[href="/inbox"]')).toHaveLength(1);
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.querySelector('a[href="/inbox"]')!.getAttribute('aria-current')).toBe('page');
    expect(el.querySelector('button[kxSidebarMenuButton]')!.hasAttribute('aria-current')).toBe(false);
    const trigger = el.querySelector<HTMLButtonElement>('button[kxSidebarTrigger]')!;
    expect(trigger.textContent!.trim()).toBe('Toggle Sidebar');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('main')).toHaveLength(1);
    trigger.click();
    await settle(fixture);
    expect(state.open).toBe(false);
    const sidebar = el.querySelector('kx-sidebar')!;
    expect(sidebar.getAttribute('data-state')).toBe('collapsed');
    expect(sidebar.getAttribute('data-collapsible')).toBe('offcanvas');
    // collapsed off-canvas is out of reach, not only out of view
    expect(el.querySelector('.kx-sidebar__panel')!.hasAttribute('inert')).toBe(true);
  });

  it('collapsed to icons stays reachable', async () => {
    const { el, fixture } = host(sidebarTemplate, SIDEBAR, { open: false, collapsible: 'icon' });
    await settle(fixture);
    expect(el.querySelector('kx-sidebar')!.getAttribute('data-collapsible')).toBe('icon');
    expect(el.querySelector('.kx-sidebar__panel')!.hasAttribute('inert')).toBe(false);
  });

  it('toggles with Ctrl/⌘+B', async () => {
    const { el, fixture, state } = host(sidebarTemplate, SIDEBAR, { open: true, collapsible: 'offcanvas' });
    await settle(fixture);
    el.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(state.open).toBe(false);
  });
});
