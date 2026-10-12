import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  InjectionToken,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { inlineKey, isRtl, moveIndex, type KxMove } from './collection';
import { disclosureId } from './disclosure';
import { KxFloatingSurface, KxHoverRoot, adopt, type CloseReason } from './floating';
import { activeElement, isFocusTarget, tabbables, type KxAnchor, type KxSide } from './overlay';

/**
 * Navigation menu: a site's top navigation, where some entries open a panel of links.
 *
 *   <nav kxNavigationMenu aria-label="Main">
 *     <ul kxNavigationMenuList>
 *       <li kxNavigationMenuItem value="products">
 *         <button kxNavigationMenuTrigger>Products</button>
 *         <kx-navigation-menu-content>
 *           <ul class="…"><li><a kxNavigationMenuLink href="/analytics">Analytics</a></li> …</ul>
 *         </kx-navigation-menu-content>
 *       </li>
 *       <li kxNavigationMenuItem><a kxNavigationMenuLink href="/pricing" [active]="true">Pricing</a></li>
 *     </ul>
 *     <kx-navigation-menu-indicator />
 *   </nav>
 *
 * ── Semantics: disclosure navigation, not a menu ───────────────────────────
 *
 * React's NavigationMenu is Radix's, and Radix builds the WAI-ARIA DISCLOSURE NAVIGATION pattern, not a menu: a
 * `<nav>` landmark (named "Main" unless you name it), a list, triggers that are plain buttons with
 * `aria-expanded` (and `aria-controls` while open), and panels of ordinary links. Nothing here carries
 * `role="menu"` or `menuitem`: a menu role tells a screen reader to expect application-style arrow navigation
 * and hides that these are links, which is wrong for site navigation (the menus in menu.ts are for actions).
 * Links stay `<a href>` — they navigate, open in a new tab, and are announced as links. `active` marks the page
 * you are on with `aria-current="page"`.
 *
 * ── Keyboard: Radix's model, direction-aware ───────────────────────────────
 *
 *   Tab           natural document order. A panel is declared right after its trigger, so with a panel open
 *                 Tab goes trigger → the panel's links → the next trigger (Radix needs focus proxies to get
 *                 this order out of a viewport at the end of the nav; declaring the panel in place gets it
 *                 for free). A closed panel is not rendered, so Tab never walks into one.
 *   Enter, Space  toggle the trigger's panel (it is a button)
 *   ArrowDown     on a trigger whose panel is open: into the panel, to its first focusable element
 *   arrows        between the top-level triggers and links — ArrowRight / ArrowDown to the next, ArrowLeft /
 *                 ArrowUp to the previous — and between the links inside a panel. The inline arrows follow
 *                 reading order: in a right-to-left region ArrowLeft is "next". They stop at the ends (Radix's
 *                 focus group does not wrap). Home / End jump to the first / last.
 *   Escape        closes the open panel; focus returns to its trigger if it was in the panel
 *
 * The walk is the collection core's (`moveIndex`, `inlineKey`, `isRtl`); the ROVING tabindex is not used,
 * because every trigger and link stays its own Tab stop here, as in Radix.
 *
 * ── Pointer ────────────────────────────────────────────────────────────────
 *
 * Resting on a trigger opens its panel after `delayDuration` (200ms); once one panel has been open, the others
 * open at once until `skipDelayDuration` (300ms) passes with none open. Leaving trigger and panel closes it
 * 150ms later — time to cross the gap — unless keyboard focus is in it. A trigger closed by a click or by Escape
 * does not reopen under a pointer that has not left it (Radix's rule: the reader just closed it). Touch has no
 * hover: a tap toggles.
 *
 * ── Overlay reuse ──────────────────────────────────────────────────────────
 *
 * The panel is a C1 floating surface (`popover="manual"`, the top layer, one layer on the overlay stack) and the
 * item is a C1 hover root, so Escape, outside presses and focus leaving are the stack's; the hover timing is
 * the hover root's. The panel is placed by `autoPlace` against the whole navigation menu, below it and aligned
 * to its logical START (React's viewport sits at `start-0 top-full`), so it mirrors in a right-to-left region
 * with no code. Inside the nav is "inside" the panel: pressing or focusing another trigger never reads as
 * leaving it.
 */

let nextKey = 0;

/** The stops register through this token, so one query finds triggers and links alike, in document order. */
const STOP = new InjectionToken<KxNavigationStop>('KxNavigationStop');

/** A top-level stop, or a link inside a panel: what the arrow keys walk. */
interface KxNavigationStop {
  readonly el: HTMLElement;
  /** The panel this stop is inside, or null for the top level. */
  readonly panel: KxNavigationMenuContent | null;
  readonly nav: KxNavigationMenu;
}

@Directive({
  selector: 'nav[kxNavigationMenu]',
  host: {
    class: 'kx-navigation-menu',
    '[attr.aria-label]': 'labelledby ? null : (label ?? "Main")',
    '[attr.data-state]': 'value() === null ? "closed" : "open"',
  },
})
export class KxNavigationMenu {
  /** Two-way: the `value` of the item whose panel is open, or null. */
  readonly value = model<string | null>(null);
  /** ms the pointer rests on a trigger before its panel opens. */
  readonly delayDuration = input(200, { transform: numberAttribute });
  /** ms after the last panel closed during which another opens with no delay. */
  readonly skipDelayDuration = input(300, { transform: numberAttribute });

  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly label = inject(new HostAttributeToken('aria-label'), { optional: true });
  protected readonly labelledby = inject(new HostAttributeToken('aria-labelledby'), { optional: true });

  private readonly allItems = contentChildren(forwardRef(() => KxNavigationMenuItem), { descendants: true });
  readonly items = computed(() => this.allItems().filter((i) => i.nav === this));
  private readonly allStops = contentChildren(STOP, { descendants: true });
  /** The top-level triggers and links, in document order. */
  readonly topStops = computed(() => this.allStops().filter((s) => s.nav === this && !s.panel));
  readonly stops = computed(() => this.allStops().filter((s) => s.nav === this));

  /** While true, the next panel to open waits `delayDuration`; false right after one was open. */
  readonly openDelayed = signal(true);
  private skipTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // `value` is the source of truth: whatever sets it, the items follow
    effect(() => {
      const open = this.value();
      untracked(() => {
        for (const item of this.items()) {
          if (item.key() === open && !item.open()) item.open.set(true);
          else if (item.key() !== open && item.open()) item.hide('switch');
        }
        clearTimeout(this.skipTimer);
        if (open !== null) this.openDelayed.set(false);
        else this.skipTimer = setTimeout(() => this.openDelayed.set(true), this.skipDelayDuration());
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.skipTimer));
  }

  /**
   * Arrow keys, Home and End between `from` and its neighbours: the top-level stops, or the links of the panel
   * `from` is in. Returns whether it moved focus.
   */
  move(from: KxNavigationStop, event: KeyboardEvent): boolean {
    const group = this.stops().filter((s) => s.panel === from.panel);
    let move: KxMove | null = null;
    if (event.key === 'Home') move = 'first';
    else if (event.key === 'End') move = 'last';
    else if (event.key === 'ArrowDown') move = 'next';
    else if (event.key === 'ArrowUp') move = 'previous';
    else {
      const inline = inlineKey(event.key, isRtl(from.el));
      if (inline) move = inline === 'forward' ? 'next' : 'previous';
    }
    if (!move || event.altKey || event.ctrlKey || event.metaKey) return false;
    event.preventDefault();
    const at = group.indexOf(from);
    const to = moveIndex(group.length, at, move, (i) => !isFocusTarget(group[i]!.el), false);
    if (to !== -1) group[to]!.el.focus();
    return true;
  }
}

@Directive({
  selector: 'ul[kxNavigationMenuList]',
  host: { class: 'kx-navigation-menu__list' },
})
export class KxNavigationMenuList {}

/** One entry. With a trigger and content it is a disclosure; with only a link it is a link. */
@Directive({
  selector: 'li[kxNavigationMenuItem]',
  host: { class: 'kx-navigation-menu__item' },
})
export class KxNavigationMenuItem extends KxHoverRoot {
  readonly nav = inject(KxNavigationMenu);
  /** Names this item in the navigation menu's `[(value)]`. Generated when absent. */
  readonly value = input<string | undefined>(undefined);
  private readonly generated = `kx-navigation-menu-item-${nextKey++}`;
  readonly key = computed(() => this.value() ?? this.generated);
  readonly openDelay = () => (this.nav.openDelayed() ? this.nav.delayDuration() : 0);
  readonly closeDelay = () => 150;
  protected readonly closesOnBlur = false;
  /** Closed by a click or Escape: the pointer resting on the trigger does not reopen it until it leaves. */
  hoverSuppressed = false;
  triggerEl: HTMLElement | null = null;
  readonly triggerId = signal<string | null>(null);

  constructor() {
    super();
    this.anchor = this.nav.el;
    // the item's own [(open)] and the menu's [(value)] say the same thing
    effect(() => {
      const open = this.open();
      untracked(() => {
        if (open && this.nav.value() !== this.key()) this.nav.value.set(this.key());
        else if (!open && this.nav.value() === this.key()) this.nav.value.set(null);
      });
    });
  }

  override show(): void {
    this.nav.value.set(this.key());
    super.show();
  }

  override hide(reason?: CloseReason): void {
    if (!this.open()) return;
    if (reason === 'escape' || reason === 'close') this.hoverSuppressed = true;
    super.hide(reason);
    if (this.nav.value() === this.key()) this.nav.value.set(null);
  }

  toggle(): void {
    if (this.open()) this.hide('close');
    else this.show();
  }

  /** The first focusable element of the panel, for ArrowDown on an open trigger. */
  enterPanel(): boolean {
    const panel = this.trigger?.ownerDocument.getElementById(this.contentId());
    const first = panel ? tabbables(panel)[0] : undefined;
    first?.focus();
    return !!first;
  }
}

/** The button that opens an item's panel. A chevron after its label turns while the panel is open. */
@Component({
  selector: 'button[kxNavigationMenuTrigger]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: STOP, useExisting: forwardRef(() => KxNavigationMenuTrigger) }],
  template: `<ng-content /><svg class="kx-navigation-menu__chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`,
  host: {
    class: 'kx-navigation-menu__trigger',
    type: 'button',
    '[id]': 'resolvedId()',
    '[attr.aria-expanded]': 'item.open()',
    '[attr.aria-controls]': 'item.open() ? item.contentId() : null',
    '[attr.data-state]': 'item.open() ? "open" : "closed"',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(pointerenter)': 'onPointerenter($event)',
    '(pointermove)': 'onPointermove($event)',
    '(pointerleave)': 'onPointerleave($event)',
  },
})
export class KxNavigationMenuTrigger implements KxNavigationStop {
  readonly item = inject(KxNavigationMenuItem);
  readonly nav = this.item.nav;
  readonly panel = null;
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly id = input<string | undefined>(undefined);
  private readonly generated = `${disclosureId('navigation-menu')}-trigger`;
  readonly resolvedId = computed(() => this.id() || this.generated);
  /** A hover already opened (or tried to open) the panel; pointermove does not ask again until the pointer leaves. */
  private hoverAsked = false;

  constructor() {
    this.item.trigger = this.el;
    this.item.triggerEl = this.el;
    effect(() => this.item.triggerId.set(this.resolvedId()));
    inject(DestroyRef).onDestroy(() => {
      if (this.item.trigger === this.el) this.item.trigger = null;
    });
  }

  protected onClick(): void {
    this.item.toggle();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.item.open() && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (this.item.enterPanel()) {
        event.preventDefault();
        return;
      }
    }
    this.nav.move(this, event);
  }

  protected onPointerenter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.item.hoverSuppressed = false;
    this.hoverAsked = false;
  }

  protected onPointermove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.hoverAsked || this.item.hoverSuppressed || (this.el as HTMLButtonElement).disabled) return;
    this.hoverAsked = true;
    this.item.enter(event);
  }

  protected onPointerleave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.hoverAsked = false;
    this.item.leave(event);
  }
}

/**
 * The panel. No role of its own: it is a group of links named by its trigger (`aria-labelledby`), shown and
 * hidden by the trigger's `aria-expanded`.
 */
@Component({
  selector: 'kx-navigation-menu-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-floating kx-navigation-menu__content',
    '[attr.aria-labelledby]': 'root.triggerId()',
    '(pointerenter)': 'root.hold()',
    '(pointerleave)': 'onPointerleave($event)',
  },
})
export class KxNavigationMenuContent extends KxFloatingSurface {
  readonly root: KxNavigationMenuItem = adopt(inject(KxNavigationMenuItem), this.id);
  readonly side = (): KxSide => 'bottom';
  override readonly align = input<'start' | 'center' | 'end'>('start');
  override readonly offset = input(6, { transform: numberAttribute });
  readonly closesOnFocusOutside = true;

  /** The whole navigation menu is inside the panel's layer: its other triggers, its links, its gaps. */
  override companions(): readonly (Element | null)[] {
    return [this.root.nav.el];
  }

  protected override placementAnchor(): KxAnchor | null {
    return this.root.nav.el;
  }

  protected onPointerleave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.root.leave(event);
  }

  protected override afterHide(reason: CloseReason, focusWasInside: boolean): void {
    const lost = !activeElement(this.doc);
    if ((focusWasInside || lost) && reason !== 'outside' && reason !== 'focus-outside' && reason !== 'switch' && isFocusTarget(this.root.trigger)) {
      this.root.trigger.focus();
    }
  }
}

/**
 * A link. At the top level it is styled as a trigger; inside a panel, as a panel link. `active` marks the page
 * you are on (`aria-current="page"`). Following a link inside a panel closes the panel.
 */
@Directive({
  selector: 'a[kxNavigationMenuLink]',
  providers: [{ provide: STOP, useExisting: forwardRef(() => KxNavigationMenuLink) }],
  host: {
    class: 'kx-navigation-menu__link',
    '[class.kx-navigation-menu__link--top]': '!panel',
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KxNavigationMenuLink implements KxNavigationStop {
  readonly nav = inject(KxNavigationMenu);
  readonly panel = inject(KxNavigationMenuContent, { optional: true });
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** The page this link leads to is the current page. */
  readonly active = input(false, { transform: booleanAttribute });

  // a method, not the binding `nav.move(…)`: an Angular listener that returns false prevents the default, and
  // move() answers false for every key it leaves alone — Tab and Escape included
  protected onKeydown(event: KeyboardEvent): void {
    this.nav.move(this, event);
  }

  protected onClick(event: MouseEvent): void {
    // a modified click opens elsewhere; the panel stays for the next one
    if (!this.panel || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    this.panel.root.hide('select');
  }
}

/**
 * A small arrow under the open trigger, pointing at its panel. Decoration: `aria-hidden`, and nothing depends on
 * it. Put it inside the `<nav>`, after the list.
 */
@Component({
  selector: 'kx-navigation-menu-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="kx-navigation-menu__arrow"></span>',
  host: {
    class: 'kx-navigation-menu__indicator',
    'aria-hidden': 'true',
    '[attr.data-state]': 'nav.value() === null ? "hidden" : "visible"',
  },
})
export class KxNavigationMenuIndicator {
  protected readonly nav = inject(KxNavigationMenu);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private shown = false;

  constructor() {
    // Follow the open trigger. The offset is measured, so it is physical by nature: it is where the trigger IS,
    // already resolved by the browser's layout in whichever direction the list runs.
    afterRenderEffect({
      write: () => {
        const open = this.nav.value();
        untracked(() => {
          const trigger = this.nav.items().find((i) => i.key() === open)?.triggerEl;
          if (!trigger) {
            this.shown = false;
            return;
          }
          const track = this.el.offsetParent ?? this.nav.el;
          const t = trigger.getBoundingClientRect();
          const box = track.getBoundingClientRect();
          // It slides from one open trigger to the next; arriving from hidden it appears in place, never
          // sliding in from wherever it last was (or from the nav's left edge, in a right-to-left one).
          if (!this.shown) this.el.style.transition = 'none';
          this.el.style.left = `${t.left - box.left}px`;
          this.el.style.width = `${t.width}px`;
          if (!this.shown) {
            void this.el.offsetWidth;
            this.el.style.removeProperty('transition');
          }
          this.shown = true;
        });
      },
    });
  }
}
