import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KxDialogDescription, KxDialogTitle, KxSheet, KxSheetContent } from './dialog';
import { KxInput, KxSeparator } from './primitives';

/**
 * Sidebar: an application's persistent side navigation, which becomes a sheet on a phone.
 *
 *   <kx-sidebar-provider [(open)]="sidebarOpen">
 *     <kx-sidebar side="start" collapsible="icon">
 *       <kx-sidebar-header>…</kx-sidebar-header>
 *       <kx-sidebar-content>
 *         <kx-sidebar-group>
 *           <div kxSidebarGroupLabel>Workspace</div>
 *           <ul kxSidebarMenu>
 *             <li kxSidebarMenuItem><a kxSidebarMenuButton href="/inbox" [active]="true"><svg …/><span>Inbox</span></a></li>
 *           </ul>
 *         </kx-sidebar-group>
 *       </kx-sidebar-content>
 *     </kx-sidebar>
 *     <main kxSidebarInset><button kxSidebarTrigger></button> …</main>
 *   </kx-sidebar-provider>
 *
 * ── One state model, two presentations ─────────────────────────────────────
 *
 * The provider owns the state, as React's does: `open` (two-way) is the DESKTOP sidebar, expanded or
 * collapsed; `openMobile` is the phone's sheet; `isMobile` is the viewport below 768px (React's breakpoint,
 * read through the document's own `matchMedia`). The trigger and Ctrl/⌘+B toggle whichever applies.
 *
 * At or above the breakpoint the sidebar is a fixed panel at the inline START or END of the viewport (`side` is
 * LOGICAL: React's `left` / `right` are physical — `start` is on the right in a right-to-left page, resolved by
 * the sidebar's own direction, so a sidebar inside an RTL region mirrors with no code) with a gap beside it
 * that the inset content flows around. `collapsible` decides collapsed: `offcanvas` slides it out — and
 * marks the panel `inert`, so nothing in a collapsed sidebar can be reached by Tab or read by a screen reader
 * (React leaves those links focusable off-screen; this is a deliberate fix) — `icon` narrows it to its icons,
 * and `none` never collapses.
 *
 * Below the breakpoint the SAME content is shown in the family's Sheet (`kx-sheet` + `dialog[kxSheetContent]`
 * from dialog.ts) — not a second overlay: its modality, focus trap, Escape, backdrop, scroll lock and focus
 * return are the Sheet's, and it is one layer on the C1 overlay stack. The sheet is named "Sidebar" for
 * assistive technology, as React's is.
 *
 * Exactly ONE copy of the content exists at a time: the projected content is rendered into the panel OR into
 * the sheet, never both, so there are no duplicate landmarks, ids or Tab stops, and the content's own state
 * (an expanded group, a typed search) survives the switch. Crossing the breakpoint closes the phone's sheet:
 * widening the window while it is open never leaves an open modal hidden behind a desktop layout, and
 * narrowing it starts with the sheet closed.
 *
 * Not ported: React persists `open` in a cookie (`sidebar:state`) — persistence is the application's here,
 * through `[(open)]`; the menu button's `tooltip` (React shows the label in a tooltip while collapsed to icons)
 * — the label stays in the button and so in its accessible name, only the visible tooltip is missing.
 */

const MOBILE_QUERY = '(max-width: 767px)';

@Component({
  selector: 'kx-sidebar-provider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-sidebar-wrapper',
    '[attr.data-state]': 'state()',
    '[attr.data-mobile]': 'isMobile() ? "" : null',
  },
})
export class KxSidebarProvider {
  /** Two-way: the desktop sidebar is expanded. Default true (React's `defaultOpen`). */
  readonly open = model(true);
  /** Whether Ctrl/⌘+B toggles the sidebar. */
  readonly keyboardShortcut = input(true, { transform: booleanAttribute });
  /** The phone's sheet is open. */
  readonly openMobile = signal(false);
  /** The viewport is below 768px. False until the browser has answered (and on the server). */
  readonly isMobile = signal(false);
  readonly state = computed(() => (this.open() ? 'expanded' : 'collapsed'));

  constructor() {
    const doc = inject(DOCUMENT);
    let release = (): void => {};
    afterNextRender(() => {
      const view = doc.defaultView;
      const query = view && typeof view.matchMedia === 'function' ? view.matchMedia(MOBILE_QUERY) : null;
      const sync = () => {
        const mobile = !!query?.matches;
        if (mobile === this.isMobile()) return;
        // a breakpoint crossing never carries an open sheet with it, either way
        this.openMobile.set(false);
        this.isMobile.set(mobile);
      };
      sync();
      query?.addEventListener('change', sync);
      const onKeydown = (event: KeyboardEvent) => {
        if (!this.keyboardShortcut() || event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
        event.preventDefault();
        this.toggle();
      };
      doc.addEventListener('keydown', onKeydown);
      release = () => {
        query?.removeEventListener('change', sync);
        doc.removeEventListener('keydown', onKeydown);
      };
    });
    inject(DestroyRef).onDestroy(() => release());
  }

  /** Expand or collapse the desktop sidebar, or open or close the phone's sheet. */
  toggle(): void {
    if (this.isMobile()) this.openMobile.update((v) => !v);
    else this.open.update((v) => !v);
  }
}

export type KxSidebarSide = 'start' | 'end';

@Component({
  selector: 'kx-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, KxSheet, KxSheetContent, KxDialogTitle, KxDialogDescription],
  template: `
    <ng-template #body><ng-content /></ng-template>
    @if (collapsible() === 'none') {
      <div class="kx-sidebar__inner"><ng-container *ngTemplateOutlet="body" /></div>
    } @else if (provider.isMobile()) {
      <kx-sheet [open]="provider.openMobile()" (openChange)="provider.openMobile.set($event)">
        <dialog kxSheetContent class="kx-sidebar__sheet" [side]="side()" [closeButton]="false">
          <h2 kxDialogTitle class="kx-sr-only">{{ sheetTitle() }}</h2>
          <p kxDialogDescription class="kx-sr-only">{{ sheetDescription() }}</p>
          <div class="kx-sidebar__inner"><ng-container *ngTemplateOutlet="body" /></div>
        </dialog>
      </kx-sheet>
    } @else {
      <div class="kx-sidebar__gap"></div>
      <div class="kx-sidebar__panel" [attr.inert]="hidden() ? '' : null">
        <div class="kx-sidebar__inner"><ng-container *ngTemplateOutlet="body" /></div>
      </div>
    }
  `,
  host: {
    class: 'kx-sidebar',
    '[attr.data-side]': 'side()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-state]': 'provider.state()',
    '[attr.data-collapsible]': 'collapsible() === "none" ? "none" : provider.open() ? "" : collapsible()',
    '[attr.data-mobile]': 'provider.isMobile() ? "" : null',
  },
})
export class KxSidebar {
  protected readonly provider = inject(KxSidebarProvider);
  /** The LOGICAL edge it sits against. */
  readonly side = input<KxSidebarSide>('start');
  readonly variant = input<'sidebar' | 'floating' | 'inset'>('sidebar');
  readonly collapsible = input<'offcanvas' | 'icon' | 'none'>('offcanvas');
  /** The phone sheet's name for assistive technology. */
  readonly sheetTitle = input('Sidebar');
  readonly sheetDescription = input('Displays the mobile sidebar.');
  /** Collapsed off-canvas: out of view, and so out of reach. */
  protected readonly hidden = computed(() => !this.provider.open() && this.collapsible() === 'offcanvas');
}

/** Toggles the sidebar. An icon button named "Toggle Sidebar"; put your own content inside to replace the icon. */
@Component({
  selector: 'button[kxSidebarTrigger]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2" y="2.5" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M6 2.5v11" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></ng-content><span class="kx-sr-only">{{ label() }}</span>`,
  host: {
    type: 'button',
    class: 'kx-btn kx-btn--ghost kx-btn--icon kx-sidebar__trigger',
    '[attr.aria-expanded]': 'provider.isMobile() ? provider.openMobile() : provider.open()',
    '(click)': 'provider.toggle()',
  },
})
export class KxSidebarTrigger {
  protected readonly provider = inject(KxSidebarProvider);
  readonly label = input('Toggle Sidebar');
}

/** The page's main content beside the sidebar: a `<main>` landmark, as React's. */
@Directive({ selector: 'main[kxSidebarInset]', host: { class: 'kx-sidebar-inset' } })
export class KxSidebarInset {}

@Component({ selector: 'kx-sidebar-header', changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', host: { class: 'kx-sidebar__header' } })
export class KxSidebarHeader {}

@Component({ selector: 'kx-sidebar-footer', changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', host: { class: 'kx-sidebar__footer' } })
export class KxSidebarFooter {}

/** The scrolling middle. */
@Component({ selector: 'kx-sidebar-content', changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', host: { class: 'kx-sidebar__content' } })
export class KxSidebarContent {}

@Component({ selector: 'kx-sidebar-group', changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', host: { class: 'kx-sidebar__group' } })
export class KxSidebarGroup {}

/** A group's heading. Put it on a heading element when the sidebar's outline needs one (`<h3 kxSidebarGroupLabel>`). */
@Directive({ selector: '[kxSidebarGroupLabel]', host: { class: 'kx-sidebar__group-label' } })
export class KxSidebarGroupLabel {}

@Component({ selector: 'kx-sidebar-group-content', changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', host: { class: 'kx-sidebar__group-content' } })
export class KxSidebarGroupContent {}

/** A separator between groups: the package's `kx-separator`, in sidebar colours. */
@Component({
  selector: 'kx-sidebar-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxSeparator],
  template: '<kx-separator class="kx-sidebar__separator" />',
  host: { class: 'kx-sidebar__separator-host' },
})
export class KxSidebarSeparator {}

@Directive({ selector: 'ul[kxSidebarMenu]', host: { class: 'kx-sidebar__menu' } })
export class KxSidebarMenu {}

@Directive({ selector: 'li[kxSidebarMenuItem]', host: { class: 'kx-sidebar__menu-item' } })
export class KxSidebarMenuItem {}

/**
 * An entry: a link (`<a href>`) to navigate, a button to act. `active` marks the current page — `aria-current="page"`
 * on a link, so it is announced, not only drawn. Put the label in a `<span>` after the icon: collapsed to icons,
 * the label is clipped from view but stays the entry's accessible name.
 */
@Directive({
  selector: 'a[kxSidebarMenuButton], button[kxSidebarMenuButton]',
  host: {
    class: 'kx-sidebar__menu-button',
    '[attr.data-active]': 'active()',
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
    '[attr.aria-current]': 'active() && isLink ? "page" : null',
  },
})
export class KxSidebarMenuButton {
  readonly active = input(false, { transform: booleanAttribute });
  readonly size = input<'default' | 'sm' | 'lg'>('default');
  readonly variant = input<'default' | 'outline'>('default');
  protected readonly isLink = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';
}

/** A loading placeholder for a menu entry. Deterministic: its bar is `width` wide (React's is random). */
@Component({
  selector: 'kx-sidebar-menu-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showIcon()) {
      <span class="kx-sidebar__skeleton-icon"></span>
    }
    <span class="kx-sidebar__skeleton-text" [style.max-inline-size]="width()"></span>
  `,
  host: { class: 'kx-sidebar__menu-skeleton', 'aria-hidden': 'true' },
})
export class KxSidebarMenuSkeleton {
  readonly showIcon = input(false, { transform: booleanAttribute });
  readonly width = input('70%');
}

/** A search field in sidebar proportions: the package's `kxInput`, compact. */
@Directive({
  selector: 'input[kxSidebarInput]',
  hostDirectives: [KxInput],
  host: { class: 'kx-sidebar__input' },
})
export class KxSidebarInput {}
