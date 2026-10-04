import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  KxAccordion,
  KxAccordionContent,
  KxAccordionItem,
  KxAccordionTrigger,
  KxCollapsible,
  KxCollapsibleContent,
  KxCollapsibleTrigger,
} from './disclosure';
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
} from './navigation';

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

// Navigation and disclosure: semantics, the relationships between parts, and model wiring, in jsdom. Real keys,
// focus rings, layout, direction, 200% text and motion are asserted in Chromium by scripts/angular-browser.mjs.
// kx-verify: interaction, accessibility

describe('KxAccordion', () => {
  const imports = [KxAccordion, KxAccordionItem, KxAccordionTrigger, KxAccordionContent];
  const template = (attrs: string) => `
    <kx-accordion ${attrs} [(value)]="open">
      <kx-accordion-item value="a"><kx-accordion-trigger>Alpha</kx-accordion-trigger><kx-accordion-content>A body</kx-accordion-content></kx-accordion-item>
      <kx-accordion-item value="b"><kx-accordion-trigger>Beta</kx-accordion-trigger><kx-accordion-content>B body</kx-accordion-content></kx-accordion-item>
      <kx-accordion-item value="c" disabled><kx-accordion-trigger>Gamma</kx-accordion-trigger><kx-accordion-content>C body</kx-accordion-content></kx-accordion-item>
    </kx-accordion>`;

  it('puts each trigger button in a heading, with aria-expanded and aria-controls naming a region that exists', () => {
    const { el } = host(template('type="single" collapsible'), imports, { open: signal<readonly string[]>(['a']) });
    const headings = el.querySelectorAll('[role=heading]');
    expect(headings).toHaveLength(3);
    expect(headings[0]!.getAttribute('aria-level')).toBe('3');
    const button = headings[0]!.querySelector('button')!;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const region = el.querySelector(`#${button.getAttribute('aria-controls')}`)!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe(button.id);
    expect(region.getAttribute('data-state')).toBe('open');
    // closed content stays mounted, so aria-controls never points at nothing
    const closed = headings[1]!.querySelector('button')!;
    expect(closed.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector(`#${closed.getAttribute('aria-controls')}`)!.getAttribute('data-state')).toBe('closed');
  });

  it('single + collapsible: opening one closes the other, and the open one can close', async () => {
    const { el, fixture, state } = host(template('type="single" collapsible'), imports, { open: signal<readonly string[]>(['a']) });
    const [a, b] = [...el.querySelectorAll<HTMLButtonElement>('kx-accordion-trigger button')];
    b!.click();
    await settle(fixture);
    expect(state.open()).toEqual(['b']);
    expect(a!.getAttribute('aria-expanded')).toBe('false');
    b!.click();
    await settle(fixture);
    expect(state.open()).toEqual([]);
  });

  it('single, not collapsible: the open trigger reports aria-disabled and does not close', async () => {
    const { el, fixture, state } = host(template('type="single"'), imports, { open: signal<readonly string[]>(['a']) });
    const a = el.querySelector<HTMLButtonElement>('kx-accordion-trigger button')!;
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.disabled).toBe(false);
    a.click();
    await settle(fixture);
    expect(state.open()).toEqual(['a']);
  });

  it('multiple: items open independently', async () => {
    const { el, fixture, state } = host(template('type="multiple"'), imports, { open: signal<readonly string[]>([]) });
    const [a, b] = [...el.querySelectorAll<HTMLButtonElement>('kx-accordion-trigger button')];
    a!.click();
    b!.click();
    await settle(fixture);
    expect(state.open()).toEqual(['a', 'b']);
  });

  it('a disabled item is a disabled button; headingLevel sets the level', () => {
    const { el } = host(template('type="single" [headingLevel]="2"'), imports, { open: signal<readonly string[]>([]) });
    const c = el.querySelectorAll<HTMLButtonElement>('kx-accordion-trigger button')[2]!;
    expect(c.disabled).toBe(true);
    expect(el.querySelector('[role=heading]')!.getAttribute('aria-level')).toBe('2');
  });
});

describe('KxCollapsible', () => {
  it('the trigger is the caller’s button, wired to content it controls', async () => {
    const { el, fixture, state } = host(
      `<kx-collapsible [(open)]="open"><button kxCollapsibleTrigger>More</button><kx-collapsible-content>Hidden text</kx-collapsible-content></kx-collapsible>`,
      [KxCollapsible, KxCollapsibleTrigger, KxCollapsibleContent],
      { open: signal(false) },
    );
    const button = el.querySelector('button')!;
    const content = el.querySelector('kx-collapsible-content')!;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('data-state')).toBe('closed');
    button.click();
    await settle(fixture);
    expect(state.open()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('disabled: the trigger is disabled and nothing opens', async () => {
    const { el, fixture } = host(
      `<kx-collapsible disabled><button kxCollapsibleTrigger>More</button><kx-collapsible-content>x</kx-collapsible-content></kx-collapsible>`,
      [KxCollapsible, KxCollapsibleTrigger, KxCollapsibleContent],
    );
    const button = el.querySelector('button')!;
    expect(button.disabled).toBe(true);
    button.click();
    await settle(fixture);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('KxBreadcrumb', () => {
  it('is a named navigation landmark with an ordered list; the current page is not a link', () => {
    const { el } = host(
      `<nav kxBreadcrumb><ol kxBreadcrumbList>
         <li kxBreadcrumbItem><a kxBreadcrumbLink href="/">Home</a></li>
         <li kxBreadcrumbSeparator></li>
         <li kxBreadcrumbItem><span kxBreadcrumbPage>Billing</span></li>
       </ol></nav>`,
      [KxBreadcrumb, KxBreadcrumbList, KxBreadcrumbItem, KxBreadcrumbLink, KxBreadcrumbPage, KxBreadcrumbSeparator],
    );
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('/');
    const page = el.querySelector('[kxBreadcrumbPage]')!;
    expect(page.getAttribute('aria-current')).toBe('page');
    expect(page.closest('a')).toBeNull();
    const separator = el.querySelector('[kxBreadcrumbSeparator]')!;
    expect(separator.getAttribute('aria-hidden')).toBe('true');
    expect(separator.textContent!.trim()).toBe('›');
  });
});

describe('KxPagination', () => {
  const imports = [KxPagination, KxPaginationContent, KxPaginationItem, KxPaginationLink, KxPaginationPrevious, KxPaginationNext, KxPaginationEllipsis];

  it('links stay links; the current page is aria-current="page"; the ellipsis is hidden', () => {
    const { el } = host(
      `<nav kxPagination><ul kxPaginationContent>
         <li kxPaginationItem><a kxPaginationPrevious href="?p=1">Previous</a></li>
         <li kxPaginationItem><a kxPaginationLink href="?p=1">1</a></li>
         <li kxPaginationItem><a kxPaginationLink href="?p=2" current>2</a></li>
         <li kxPaginationItem><kx-pagination-ellipsis /></li>
         <li kxPaginationItem><a kxPaginationNext href="?p=3">Next</a></li>
       </ul></nav>`,
      imports,
    );
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Pagination');
    const links = [...el.querySelectorAll('a')];
    expect(links.every((a) => a.hasAttribute('href') && !a.hasAttribute('type'))).toBe(true);
    expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent!.trim())).toEqual(['2']);
    expect(el.querySelector('kx-pagination-ellipsis')!.getAttribute('aria-hidden')).toBe('true');
    // the visible word is the name; the glyph is decorative
    expect(links[0]!.querySelector('[aria-hidden=true]')!.textContent).toBe('‹');
    expect(links[0]!.textContent!.replace('‹', '').trim()).toBe('Previous');
  });

  it('a disabled link leaves the tab order, says so, and does not navigate', () => {
    const { el } = host(`<a kxPaginationPrevious href="#x" disabled>Previous</a>`, imports);
    const a = el.querySelector('a')!;
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it('as buttons: type="button", natively disabled', () => {
    const { el } = host(`<button kxPaginationNext disabled>Next</button><button kxPaginationLink current>3</button>`, imports);
    const [next, three] = [...el.querySelectorAll('button')];
    expect(next!.getAttribute('type')).toBe('button');
    expect(next!.disabled).toBe(true);
    expect(three!.getAttribute('aria-current')).toBe('page');
  });
});

describe('KxTableOfContents', () => {
  it('renders in-page anchors; the active entry is aria-current="location" and a click moves it', async () => {
    const { el, fixture, state } = host(
      `<nav kxTableOfContents [items]="items" [(active)]="active"></nav>`,
      [KxTableOfContents],
      { items: [{ id: 'a', label: 'Intro' }, { id: 'b', label: 'Setup', level: 2 }], active: signal<string | null>('a') },
    );
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('On this page');
    const [a, b] = [...el.querySelectorAll('a')];
    expect(a!.getAttribute('href')).toBe('#a');
    expect(a!.getAttribute('aria-current')).toBe('location');
    expect(b!.style.getPropertyValue('--kx-toc-level')).toBe('1');
    b!.addEventListener('click', (e) => e.preventDefault());
    b!.click();
    await settle(fixture);
    expect(state.active()).toBe('b');
    expect(b!.getAttribute('aria-current')).toBe('location');
    expect(a!.hasAttribute('aria-current')).toBe(false);
  });
});

describe('KxTabBar', () => {
  it('destinations named by their label, the active one aria-current="page", the badge part of the name', () => {
    const { el } = host(
      `<nav kxTabBar aria-label="Primary">
         <a kxTabBarItem href="/home" active><svg kxTabBarIcon aria-hidden="true"></svg>Home</a>
         <button kxTabBarItem badge="3"><svg kxTabBarIcon aria-hidden="true"></svg>Inbox</button>
       </nav>`,
      [KxTabBar, KxTabBarItem],
    );
    const [home, inbox] = [el.querySelector('a')!, el.querySelector('button')!];
    expect(home.getAttribute('aria-current')).toBe('page');
    expect(home.textContent!.trim()).toBe('Home');
    expect(inbox.getAttribute('type')).toBe('button');
    expect(inbox.hasAttribute('aria-current')).toBe(false);
    // the name, as accessible-name computation reads it: aria-hidden text skipped, the rest in order
    const named = (n: Node): string =>
      n.nodeType === 3 ? n.textContent! : (n as Element).getAttribute?.('aria-hidden') === 'true' ? '' : [...n.childNodes].map(named).join('');
    expect(named(inbox).replace(/\s+/g, ' ').trim()).toBe('Inbox (3)');
  });
});

describe('KxNavigationBar', () => {
  it('a named Back button that emits, a title (a heading when given a level) and an actions slot', async () => {
    const { el, fixture, state } = host(
      `<header kxNavigationBar title="Inbox" infoText="3 unread" backButton [level]="1" (back)="backs.set(backs() + 1)"><button kxNavigationBarActions>Edit</button></header>`,
      [KxNavigationBar],
      { backs: signal(0) },
    );
    const back = el.querySelector<HTMLButtonElement>('.kx-navigation-bar__back')!;
    expect(back.getAttribute('aria-label')).toBe('Back');
    expect(back.getAttribute('type')).toBe('button');
    back.click();
    await settle(fixture);
    expect(state.backs()).toBe(1);
    const title = el.querySelector('.kx-navigation-bar__title')!;
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('1');
    expect(el.querySelector('.kx-navigation-bar__actions button')!.textContent).toBe('Edit');
  });

  it('without a level the title is not a heading, and without backButton there is no Back', () => {
    const { el } = host(`<header kxNavigationBar title="Inbox"></header>`, [KxNavigationBar]);
    expect(el.querySelector('.kx-navigation-bar__title')!.hasAttribute('role')).toBe(false);
    expect(el.querySelector('button')).toBeNull();
  });
});

describe('KxAppBar', () => {
  const imports = [KxAppBar, KxAppBarBrand, KxAppBarNav, KxAppBarLink, KxAppBarActions];
  const template = `
    <header kxAppBar [(open)]="open">
      <a kxAppBarBrand href="/">Acme</a>
      <nav kxAppBarNav aria-label="Primary"><a kxAppBarLink href="#a" active>Overview</a><a kxAppBarLink href="#b">Reports</a></nav>
      <div kxAppBarActions><button>New</button></div>
    </header>`;

  it('the menu button controls the one nav, comes right before it, and reports aria-expanded', async () => {
    const { el, fixture, state } = host(template, imports, { open: signal(false) });
    const toggle = el.querySelector<HTMLButtonElement>('.kx-app-bar__toggle')!;
    const nav = el.querySelector('nav')!;
    expect(el.querySelectorAll('nav')).toHaveLength(1);
    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
    expect(toggle.getAttribute('aria-label')).toBe('Menu');
    expect(toggle.nextElementSibling).toBe(nav);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await settle(fixture);
    expect(state.open()).toBe(true);
    expect(nav.getAttribute('data-state')).toBe('open');
    expect(el.querySelector('[aria-current=page]')!.textContent).toBe('Overview');
  });

  it('Escape closes and returns focus to the button; following a link closes', async () => {
    const { el, fixture, state } = host(template, imports, { open: signal(true) });
    const toggle = el.querySelector<HTMLButtonElement>('.kx-app-bar__toggle')!;
    el.querySelector('header')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(fixture);
    expect(state.open()).toBe(false);
    expect(document.activeElement).toBe(toggle);
    state.open.set(true);
    await settle(fixture);
    const link = el.querySelectorAll('a')[2]!;
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    await settle(fixture);
    expect(state.open()).toBe(false);
  });
});

describe('KxFooter', () => {
  it('the caller’s footer element; each column is a group named by its title', () => {
    const { el } = host(
      `<footer kxFooter><div kxFooterColumns><kx-footer-column title="Product"><a kxFooterLink href="/p">Pricing</a></kx-footer-column></div><div kxFooterBottom>© Acme</div></footer>`,
      [KxFooter, KxFooterColumns, KxFooterColumn, KxFooterLink, KxFooterBottom],
    );
    const column = el.querySelector('kx-footer-column')!;
    expect(el.querySelector('footer')!.classList.contains('kx-footer')).toBe(true);
    expect(column.getAttribute('role')).toBe('group');
    expect(el.querySelector(`#${column.getAttribute('aria-labelledby')}`)!.textContent).toBe('Product');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('/p');
  });
});

// The stepper is display: nothing to press. Its interaction evidence is that the rendered state follows the
// caller's `current` as it changes — no keyboard is claimed (scripts/angular-browser.mjs leaves it out).
// kx-verify: interaction, accessibility
describe('KxStepper', () => {
  it('an ordered list; status derives from current; complete steps say so in text', () => {
    const { el } = host(`<ol kxStepper [steps]="steps" [current]="1"></ol>`, [KxStepper], {
      steps: [{ label: 'Account' }, { label: 'Workspace', description: 'Name' }, { label: 'Invite' }],
    });
    const steps = [...el.querySelectorAll('li')];
    expect(el.querySelector('ol')).not.toBeNull();
    expect(steps.map((s) => s.getAttribute('data-status'))).toEqual(['complete', 'current', 'upcoming']);
    expect(steps.map((s) => s.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(steps[0]!.querySelector('.kx-sr-only')!.textContent).toContain('completed');
    expect(steps[0]!.querySelector('[aria-hidden=true]')).not.toBeNull();
    expect(steps[1]!.textContent).toContain('Name');
  });

  it('moving current moves aria-current and the completed text with it', async () => {
    const { el, fixture, state } = host(`<ol kxStepper [steps]="steps" [current]="current()"></ol>`, [KxStepper], {
      steps: [{ label: 'Account' }, { label: 'Workspace' }, { label: 'Invite' }],
      current: signal(0),
    });
    const status = () => [...el.querySelectorAll('li')].map((s) => s.getAttribute('aria-current') ?? s.getAttribute('data-status'));
    expect(status()).toEqual(['step', 'upcoming', 'upcoming']);
    state.current.set(2);
    await settle(fixture);
    expect(status()).toEqual(['complete', 'complete', 'step']);
    expect(el.querySelectorAll('.kx-sr-only').length).toBe(2);
  });
});
