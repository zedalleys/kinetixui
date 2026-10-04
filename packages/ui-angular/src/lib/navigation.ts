import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  inject,
  input,
  model,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import { disclosureId } from './disclosure';
import type { KxOrientation } from './types';

/**
 * Navigation: breadcrumb, pagination, table of contents, tab bar, stepper, navigation bar, app bar, footer.
 *
 * ── The shared contract (written before the code) ──────────────────────────
 *
 * Links stay links. A destination is an `<a href>` the caller writes, so middle-click, "copy link", the
 * router's own directives and the browser's link semantics all keep working. Where a destination can also be
 * an in-page action (a client-side pager, a tab bar that swaps views), the same directive also accepts a
 * `<button>`. Nothing here turns navigation into a generic button to make it easier to test.
 *
 * "You are here" is `aria-current`, set by one boolean input (`current` / `active`):
 *   page      breadcrumb's last crumb, pagination's page, an app-bar or tab-bar destination
 *   location  a table-of-contents entry (a position within the page, not a page)
 *   step      the stepper's current step
 * It is never conveyed by colour alone: the current item also carries a shape cue — an indicator bar, a
 * raised outlined surface or a weight change — measured by `check:navigation-visual`.
 *
 * Keyboard: every destination is one Tab stop and Enter follows it, which is what a list of links is. None of
 * these is a composite widget, so none takes arrow keys — a roving tabindex on a breadcrumb or a footer would
 * hide links from Tab and teach the reader a pattern nothing announces. (The arrow-key pattern is Tabs'.)
 *
 * Direction. Layout is logical throughout (inline-start/end, padding-inline), so every row runs from the
 * inline start of the direction its own element resolves to. Glyphs that point along the reading direction —
 * the breadcrumb separator, Previous / Next, Back — are the Unicode angle quotation marks ‹ ›, which the bidi
 * algorithm mirrors in a right-to-left run. That makes the glyph follow the EFFECTIVE direction of the element
 * it is in, including an LTR region inside an RTL page, with no rule keyed on a `[dir]` ancestor (wrong when
 * nested) and no `:dir()` (which some CSS pipelines lower to a guess — TOKENS.md, "Switch direction"). The
 * pixels are checked: `check:angular-browser`'s RTL pass reads which way each glyph actually points.
 */

/* ── breadcrumb ─────────────────────────────────────────────────────────── */

/**
 *   <nav kxBreadcrumb>
 *     <ol kxBreadcrumbList>
 *       <li kxBreadcrumbItem><a kxBreadcrumbLink href="/">Home</a></li>
 *       <li kxBreadcrumbSeparator></li>
 *       <li kxBreadcrumbItem><span kxBreadcrumbPage>Settings</span></li>
 *     </ol>
 *   </nav>
 *
 * The landmark is named "Breadcrumb" unless the caller names it (`label`). The current page is plain text with
 * `aria-current="page"`, not a link to itself.
 */
@Directive({
  selector: 'nav[kxBreadcrumb]',
  host: { class: 'kx-breadcrumb', '[attr.aria-label]': 'label()' },
})
export class KxBreadcrumb {
  readonly label = input('Breadcrumb');
}

@Directive({ selector: 'ol[kxBreadcrumbList]', host: { class: 'kx-breadcrumb__list' } })
export class KxBreadcrumbList {}

@Directive({ selector: 'li[kxBreadcrumbItem]', host: { class: 'kx-breadcrumb__item' } })
export class KxBreadcrumbItem {}

@Directive({ selector: 'a[kxBreadcrumbLink]', host: { class: 'kx-breadcrumb__link' } })
export class KxBreadcrumbLink {}

@Directive({
  selector: 'span[kxBreadcrumbPage]',
  host: { class: 'kx-breadcrumb__page', 'aria-current': 'page' },
})
export class KxBreadcrumbPage {}

/** Hidden from assistive technology: the list already says these are steps of a path. */
@Component({
  selector: 'li[kxBreadcrumbSeparator]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content>›</ng-content>',
  host: { class: 'kx-breadcrumb__separator', role: 'presentation', 'aria-hidden': 'true' },
})
export class KxBreadcrumbSeparator {}

/* ── shared: a destination that may be a link or a button ──────────────── */

/**
 * A disabled `<button>` is `disabled`. A link has no disabled state, so a disabled link reports
 * `aria-disabled="true"`, leaves the tab order, and swallows its click — it stays in the list, so the reader
 * still learns there is no previous page, rather than finding a gap.
 */
@Directive()
abstract class KxDestination {
  private readonly el = inject<ElementRef<HTMLAnchorElement | HTMLButtonElement>>(ElementRef);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly isButton = this.el.nativeElement.tagName === 'BUTTON';

  onClick(event: Event): void {
    if (this.disabled() && !this.isButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
const DESTINATION_HOST = {
  '[attr.type]': 'isButton ? "button" : null',
  '[attr.disabled]': 'isButton && disabled() ? "" : null',
  '[attr.aria-disabled]': '!isButton && disabled() ? "true" : null',
  '[attr.tabindex]': '!isButton && disabled() ? -1 : null',
  '(click)': 'onClick($event)',
};

/* ── pagination ─────────────────────────────────────────────────────────── */

/**
 *   <nav kxPagination>
 *     <ul kxPaginationContent>
 *       <li kxPaginationItem><a kxPaginationPrevious href="?page=1">Previous</a></li>
 *       <li kxPaginationItem><a kxPaginationLink href="?page=1">1</a></li>
 *       <li kxPaginationItem><a kxPaginationLink href="?page=2" current>2</a></li>
 *       <li kxPaginationItem><kx-pagination-ellipsis /></li>
 *       <li kxPaginationItem><a kxPaginationNext href="?page=3">Next</a></li>
 *     </ul>
 *   </nav>
 *
 * The caller owns which page is current — the same division React's Pagination makes — because only the
 * application knows its routes. `<button>` works in place of every `<a>` for a pager that changes state
 * rather than the URL.
 */
@Directive({
  selector: 'nav[kxPagination]',
  host: { class: 'kx-pagination', '[attr.aria-label]': 'label()' },
})
export class KxPagination {
  readonly label = input('Pagination');
}

@Directive({ selector: 'ul[kxPaginationContent]', host: { class: 'kx-pagination__content' } })
export class KxPaginationContent {}

@Directive({ selector: 'li[kxPaginationItem]', host: { class: 'kx-pagination__item' } })
export class KxPaginationItem {}

@Directive({
  selector: 'a[kxPaginationLink], button[kxPaginationLink]',
  host: {
    ...DESTINATION_HOST,
    class: 'kx-pagination__link',
    '[attr.aria-current]': 'current() ? "page" : null',
  },
})
export class KxPaginationLink extends KxDestination {
  readonly current = input(false, { transform: booleanAttribute });
}

/**
 * Previous and Next: the visible word is the accessible name (default "Previous" / "Next", replaceable by
 * projecting text, because this package ships no translations). The glyph is decorative and mirrors with the
 * reading direction.
 */
@Component({
  selector: 'a[kxPaginationPrevious], button[kxPaginationPrevious]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="kx-pagination__glyph" aria-hidden="true">‹</span><span><ng-content>Previous</ng-content></span>',
  host: { ...DESTINATION_HOST, class: 'kx-pagination__link kx-pagination__step' },
})
export class KxPaginationPrevious extends KxDestination {}

@Component({
  selector: 'a[kxPaginationNext], button[kxPaginationNext]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span><ng-content>Next</ng-content></span><span class="kx-pagination__glyph" aria-hidden="true">›</span>',
  host: { ...DESTINATION_HOST, class: 'kx-pagination__link kx-pagination__step' },
})
export class KxPaginationNext extends KxDestination {}

/** A gap in the page range. Decorative: the numbers either side already say pages were skipped. */
@Component({
  selector: 'kx-pagination-ellipsis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '…',
  host: { class: 'kx-pagination__ellipsis', 'aria-hidden': 'true' },
})
export class KxPaginationEllipsis {}

/* ── table of contents ──────────────────────────────────────────────────── */

export interface KxTocItem {
  /** The id of the heading this entry links to (`href="#id"`). */
  id: string;
  label: string;
  /** Nesting depth, from 1. Each level indents from the inline start. */
  level?: number;
}

/**
 *   <nav kxTableOfContents [items]="sections" [(active)]="section"></nav>
 *
 * In-page anchors, so they work with no JavaScript and with the browser's own scrolling. The entry for the
 * section being read carries `aria-current="location"`; `active` is two-way so a click marks its entry at once,
 * and an application with a scroll-spy writes the same signal from its observer.
 */
@Component({
  selector: 'nav[kxTableOfContents]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="kx-toc__list">
      @for (item of items(); track item.id) {
        <li class="kx-toc__item">
          <a
            class="kx-toc__link"
            [href]="'#' + item.id"
            [attr.aria-current]="item.id === active() ? 'location' : null"
            [style.--kx-toc-level]="(item.level ?? 1) - 1"
            (click)="active.set(item.id)"
            >{{ item.label }}</a
          >
        </li>
      }
    </ul>
  `,
  host: { class: 'kx-toc', '[attr.aria-label]': 'label()' },
})
export class KxTableOfContents {
  readonly items = input.required<readonly KxTocItem[]>();
  readonly active = model<string | null>(null);
  readonly label = input('On this page');
}

/* ── tab bar ────────────────────────────────────────────────────────────── */

/**
 *   <nav kxTabBar aria-label="Primary">
 *     <a kxTabBarItem href="/home" active><svg kxTabBarIcon …></svg>Home</a>
 *     <a kxTabBarItem href="/inbox" badge="3"><svg kxTabBarIcon …></svg>Inbox</a>
 *   </nav>
 *
 * A phone's bottom navigation: a row of destinations, each an icon over its label. The label is always
 * visible and is the accessible name; the icon is projected and decorative. The current destination is
 * `aria-current="page"`, drawn with a full-strength label, an `--action` icon AND a pill behind it, so it does
 * not depend on hue (React's TabBar colours the label only).
 *
 * Not a `tablist`: these are destinations, not panels of one view, so they are links in a navigation landmark
 * and each is its own Tab stop.
 */
@Directive({ selector: 'nav[kxTabBar]', host: { class: 'kx-tab-bar' } })
export class KxTabBar {}

@Component({
  selector: 'a[kxTabBarItem], button[kxTabBarItem]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="kx-tab-bar__icon">
      <ng-content select="[kxTabBarIcon]" />
      @if (badge()) {
        <span class="kx-tab-bar__badge" aria-hidden="true">{{ badge() }}</span>
      }
    </span>
    <span class="kx-tab-bar__label"
      ><ng-content />@if (badge()) {<span class="kx-sr-only"> ({{ badge() }})</span>}</span
    >
  `,
  host: {
    ...DESTINATION_HOST,
    class: 'kx-tab-bar__item',
    '[attr.aria-current]': 'active() ? "page" : null',
  },
})
export class KxTabBarItem extends KxDestination {
  readonly active = input(false, { transform: booleanAttribute });
  /**
   * A short count shown on the icon. The painted badge is hidden from assistive technology and the same text
   * follows the label, so the name reads "Inbox (3)" — label first — rather than "3Inbox", which is what a
   * badge drawn before the label contributes. The space sits inside the hidden text, so the name is the same
   * whether or not the caller's label carries whitespace of its own.
   */
  readonly badge = input<string | number | null>(null);
}

/* ── stepper ────────────────────────────────────────────────────────────── */

export interface KxStep {
  label: string;
  description?: string;
}

/**
 *   <ol kxStepper [steps]="steps" [current]="1"></ol>
 *
 * Progress through a fixed sequence: an ordered list, so position and count are announced by the list itself.
 * Each step is complete, current or upcoming, derived from `current` (zero-based) against its index. Current is
 * `aria-current="step"`. Complete steps also carry visually hidden text (`completedLabel`) — the check mark
 * that replaces their number is decorative, and without the text a screen reader would hear the label and
 * nothing else. Display only: a step is not a control (React's Stepper is not either).
 */
@Component({
  selector: 'ol[kxStepper]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (step of steps(); track $index) {
      <li class="kx-stepper__step" [attr.data-status]="status($index)" [attr.aria-current]="$index === current() ? 'step' : null">
        <span class="kx-stepper__track" aria-hidden="true">
          <span class="kx-stepper__marker">
            @if (status($index) === 'complete') {
              <svg viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            } @else {
              {{ $index + 1 }}
            }
          </span>
          @if (!$last) {
            <span class="kx-stepper__connector"></span>
          }
        </span>
        <span class="kx-stepper__text">
          <span class="kx-stepper__label">{{ step.label }}</span>
          @if (status($index) === 'complete') {
            <span class="kx-sr-only">, {{ completedLabel() }}</span>
          }
          @if (step.description) {
            <span class="kx-stepper__description">{{ step.description }}</span>
          }
        </span>
      </li>
    }
  `,
  host: {
    '[class]': '"kx-stepper kx-stepper--" + orientation()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class KxStepper {
  readonly steps = input.required<readonly KxStep[]>();
  /** Zero-based index of the step in progress. */
  readonly current = input(0, { transform: numberAttribute });
  readonly orientation = input<KxOrientation>('horizontal');
  readonly completedLabel = input('completed');

  status(index: number): 'complete' | 'current' | 'upcoming' {
    const current = this.current();
    return index < current ? 'complete' : index === current ? 'current' : 'upcoming';
  }
}

/* ── navigation bar ─────────────────────────────────────────────────────── */

/**
 *   <header kxNavigationBar title="Inbox" infoText="3 unread" backButton (back)="location.back()">
 *     <button kxButton kxNavigationBarActions variant="Ghost">Edit</button>
 *   </header>
 *
 * A phone's top bar for one screen: an optional Back control, the screen's title (with optional info text) and
 * trailing actions. The title wraps rather than truncating: at 200% text a cut-off title is a title nobody can
 * read. `level` makes the title a heading when the bar is what names the screen.
 *
 * Back is a named button (`backLabel`, default "Back") whose glyph points toward the inline start.
 */
@Component({
  selector: 'header[kxNavigationBar], div[kxNavigationBar]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kx-navigation-bar__leading">
      <ng-content select="[kxNavigationBarLeading]">
        @if (backButton()) {
          <button type="button" class="kx-navigation-bar__back" [attr.aria-label]="backLabel()" (click)="back.emit()">
            <span class="kx-navigation-bar__glyph" aria-hidden="true">‹</span>
          </button>
        }
      </ng-content>
    </div>
    <div class="kx-navigation-bar__titles">
      <span class="kx-navigation-bar__title" [attr.role]="level() ? 'heading' : null" [attr.aria-level]="level()">{{ title() }}</span>
      @if (infoText()) {
        <span class="kx-navigation-bar__info">{{ infoText() }}</span>
      }
    </div>
    <div class="kx-navigation-bar__actions"><ng-content select="[kxNavigationBarActions]" /></div>
  `,
  host: { class: 'kx-navigation-bar' },
})
export class KxNavigationBar {
  readonly title = input.required<string>();
  readonly infoText = input<string | null>(null);
  readonly backButton = input(false, { transform: booleanAttribute });
  readonly backLabel = input('Back');
  /** A heading level for the title, or none (the default) when the page names itself elsewhere. */
  readonly level = input<number | null>(null);
  readonly back = output<void>();
}

/* ── app bar ────────────────────────────────────────────────────────────── */

/**
 *   <header kxAppBar>
 *     <a kxAppBarBrand href="/">Acme</a>
 *     <nav kxAppBarNav aria-label="Primary">
 *       <a kxAppBarLink href="/" active>Overview</a>
 *       <a kxAppBarLink href="/reports">Reports</a>
 *     </nav>
 *     <div kxAppBarActions><button kxButton size="sm">New</button></div>
 *   </header>
 *
 * A web application's top bar. From 48rem up the navigation is a row between the brand and the actions. Below
 * it, the same `<nav>` — one element, not a copy — becomes a disclosure under the bar, opened by a Menu button
 * (`aria-expanded`, `aria-controls`). In DOM order the button comes straight before the panel it opens, so Tab
 * goes from the button into the links. The panel animates like accordion content (disclosure.ts), Escape
 * closes it and returns focus to the button, and following a link closes it.
 */
@Component({
  selector: 'header[kxAppBar]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[kxAppBarBrand]" />
    <button
      #toggle
      type="button"
      class="kx-app-bar__toggle"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="navId"
      [attr.aria-label]="menuLabel()"
      (click)="open.set(!open())"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        @if (open()) {
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        } @else {
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        }
      </svg>
    </button>
    <ng-content select="[kxAppBarNav]" />
    <ng-content select="[kxAppBarActions]" />
    <ng-content />
  `,
  host: {
    class: 'kx-app-bar',
    '[class.kx-app-bar--sticky]': 'sticky()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(keydown.escape)': 'close(true)',
  },
})
export class KxAppBar {
  /** Two-way: whether the narrow-screen menu is open. Ignored from 48rem up, where the links are always shown. */
  readonly open = model(false);
  readonly sticky = input(true, { transform: booleanAttribute });
  /** The menu button's name. Its open/closed state is `aria-expanded`, so the name does not change with it. */
  readonly menuLabel = input('Menu');
  readonly navId = `${disclosureId('app-bar')}-nav`;
  private readonly toggle = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');

  close(returnFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.toggle().nativeElement.focus();
  }
}

@Directive({ selector: '[kxAppBarBrand]', host: { class: 'kx-app-bar__brand' } })
export class KxAppBarBrand {}

@Component({
  selector: 'nav[kxAppBarNav]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="kx-disclosure__body"><div class="kx-app-bar__links"><ng-content /></div></div>',
  host: {
    class: 'kx-disclosure kx-app-bar__nav',
    '[id]': 'bar.navId',
    '[attr.data-state]': 'bar.open() ? "open" : "closed"',
    '(click)': 'onClick($event)',
  },
})
export class KxAppBarNav {
  readonly bar = inject(KxAppBar);
  /** Following a link closes the narrow menu; the page it leads to should not open under a menu. */
  onClick(event: Event): void {
    if ((event.target as Element | null)?.closest('a[href], button')) this.bar.close();
  }
}

@Directive({
  selector: 'a[kxAppBarLink]',
  host: {
    class: 'kx-app-bar__link',
    '[attr.aria-current]': 'active() ? "page" : null',
  },
})
export class KxAppBarLink {
  readonly active = input(false, { transform: booleanAttribute });
}

@Directive({ selector: '[kxAppBarActions]', host: { class: 'kx-app-bar__actions' } })
export class KxAppBarActions {}

/* ── footer ─────────────────────────────────────────────────────────────── */

/**
 *   <footer kxFooter>
 *     <div kxFooterColumns>
 *       <kx-footer-column title="Product">
 *         <a kxFooterLink href="/pricing">Pricing</a>
 *       </kx-footer-column>
 *     </div>
 *     <div kxFooterBottom>© 2026 Acme</div>
 *   </footer>
 *
 * The caller's own `<footer>`, so the `contentinfo` landmark is the browser's. Each column is a `group` named by
 * its title, so a screen reader announces "Product, group" on entry instead of a run of unrelated links.
 */
@Directive({ selector: 'footer[kxFooter]', host: { class: 'kx-footer' } })
export class KxFooter {}

@Directive({ selector: '[kxFooterColumns]', host: { class: 'kx-footer__columns' } })
export class KxFooterColumns {}

@Component({
  selector: 'kx-footer-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="kx-footer__title" [id]="titleId">{{ title() }}</span>
    <div class="kx-footer__links"><ng-content /></div>
  `,
  host: { class: 'kx-footer__column', role: 'group', '[attr.aria-labelledby]': 'titleId' },
})
export class KxFooterColumn {
  readonly title = input.required<string>();
  readonly titleId = `${disclosureId('footer')}-title`;
}

@Directive({ selector: 'a[kxFooterLink]', host: { class: 'kx-footer__link' } })
export class KxFooterLink {}

@Directive({ selector: '[kxFooterBottom]', host: { class: 'kx-footer__bottom' } })
export class KxFooterBottom {}
