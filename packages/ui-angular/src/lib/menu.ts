import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  type Signal,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  KxRovingFocus,
  KxTypeahead,
  inlineKey,
  isRtl,
  isTypeaheadKey,
  moveForKey,
  readableText,
  type KxRovingItem,
} from './collection';
import { disclosureId } from './disclosure';
import { KxFloatingRoot, KxFloatingSurface, adopt, type CloseReason } from './floating';
import { activeElement, isFocusTarget, type KxAnchor, type KxSide, type KxVirtualAnchor } from './overlay';

/**
 * Menus: dropdown menu, context menu and menubar — three ways to open the same thing.
 *
 *                   opened by                                   placed against
 *   dropdown menu   pressing its trigger button                 the trigger
 *   context menu    a secondary click, the ContextMenu key,     the pointer (a virtual point anchor), or the
 *                   or Shift+F10 inside its region              focused element when opened from the keyboard
 *   menubar         its triggers, a horizontal row that is      each menu's trigger
 *                   itself a menu (`role="menubar"`)
 *
 * The roots differ; what is inside a menu does not. So there is ONE set of parts, shared by all three — the
 * C1 precedent, where five dialog roots share one title, description and close:
 *
 *   [kxMenuItem]                      an action (`(select)`, `disabled`, `inset`, `variant="destructive"`)
 *   <kx-menu-checkbox-item>           `role="menuitemcheckbox"`, `[(checked)]`
 *   <kx-menu-radio-group [(value)]>   with <kx-menu-radio-item value>, `role="menuitemradio"`
 *   <kx-menu-label> <kx-menu-group> <kx-menu-separator> <kx-menu-shortcut>
 *   <kx-menu-sub> [kxMenuSubTrigger] <kx-menu-sub-content>     a submenu, nested IN its parent menu
 *
 * React has three parallel part sets (DropdownMenuItem, ContextMenuItem, MenubarItem …) with nothing different
 * behind them. The roots carry the catalogue slug, which is what the evidence extractor reads (covered-slugs.mjs
 * matches symbol prefixes); the shared `KxMenu…` stem is no slug's prefix, so a part can never be credited to
 * an unrelated component.
 *
 * ── The surface ────────────────────────────────────────────────────────────
 *
 * A menu is a floating surface (floating.ts): `popover="manual"` in the top layer, placed by `autoPlace`, one
 * layer on the overlay stack — so Escape reaches the topmost menu only, a press outside closes it, and a menu
 * declared inside a dialog is inside that dialog. What differs from a popover is the focus policy:
 *
 *   open      from the keyboard (Enter, Space, ArrowDown on the trigger) focus goes to the first item, ArrowUp to
 *             the last; from a pointer it goes to the menu itself, so no item looks chosen under a pointer that
 *             has not moved onto one. A click with `detail === 0` (a keyboard or assistive-technology activation)
 *             counts as the keyboard.
 *   activate  an item closes the WHOLE menu tree and returns focus to the trigger — a popover's close-on-press
 *             leaves focus where it landed, a menu's does not
 *   Escape    closes the topmost level only (a submenu closes alone; focus goes back to its trigger)
 *   Tab       closes the whole tree and lets the browser move focus on, as from the trigger
 *   outside   closes it and leaves focus where the reader put it
 *
 * ── Inside: the collection core (collection.ts) ────────────────────────────
 *
 * Items register through a content query (`contentChildren(KxMenuEntry, { descendants: true })`) filtered to
 * the menu that owns them, so a submenu's items never join its parent's walk. Roving tabindex: one item holds
 * `tabindex="0"`. ArrowDown / ArrowUp move and STOP at the ends (React's contract — Radix menus do not wrap);
 * Home / End jump; printable keys typeahead; disabled items (`aria-disabled`, never `disabled`) are skipped by
 * all three and cannot be activated — React's behaviour, so the two web platforms agree.
 *
 * Focus follows the pointer: moving onto an item focuses it, so there is only ever one highlighted item and the
 * keyboard continues from where the pointer is. Hover and keyboard highlight are still drawn differently: the
 * menu records how the reader is moving (`data-modality`), and only a keyboard highlight draws the focus ring.
 *
 * ── Submenus ───────────────────────────────────────────────────────────────
 *
 * Declared inside the parent menu, so they ARE inside it in the DOM: the stack closes a submenu with its
 * parent, a press in a submenu is a press inside its parent, and a submenu inherits the direction of the region
 * it was written in. A submenu opens toward the inline end (`side="end"`, mirrored by the placement in RTL),
 * by the inline-end arrow (ArrowRight in LTR, ArrowLeft in RTL), Enter or Space — focusing its first item — or
 * by resting the pointer on its trigger. The inline-start arrow and Escape close it alone.
 *
 * Moving the pointer from a submenu's trigger toward the submenu usually crosses the item below the trigger.
 * Leaving the trigger therefore opens a short grace period over the triangle between the pointer and the
 * submenu's near edge: inside it, crossing other items neither highlights them nor closes the submenu.
 *
 * Motion is the floating surface's (a fade and a 4px settle, none under reduced motion). Nothing waits for it.
 */

let nextKey = 0;

/** How a menu gives focus when it opens. `none` leaves focus where it is (a submenu opened by hover). */
type KxMenuFocus = 'first' | 'last' | 'surface' | 'none';
interface Point {
  x: number;
  y: number;
}

/* ── roots ──────────────────────────────────────────────────────────────── */

/** What every menu root shares: how it opens, where focus goes back to, and its place in a menu tree. */
@Directive()
export abstract class KxMenuRoot extends KxFloatingRoot {
  /** Where focus goes when the menu next opens; consumed by the surface. */
  focusOnOpen: KxMenuFocus = 'surface';
  /** The trigger's id, static, bound or generated — the menu is named by it. */
  readonly triggerIdFrom = signal<Signal<string> | null>(null);
  readonly triggerId = computed(() => this.triggerIdFrom()?.() ?? null);
  /** The menu this root is nested in (a submenu's parent), or null for the top of a tree. */
  readonly parentMenu: KxMenuSurface | null = null;

  openWith(focus: KxMenuFocus): void {
    this.focusOnOpen = focus;
    this.show();
  }

  /** The root at the top of this tree. */
  outermost(): KxMenuRoot {
    let root: KxMenuRoot = this;
    while (root.parentMenu) root = root.parentMenu.root;
    return root;
  }

  /** Close the whole tree (an item was activated, or Tab left it). Nested menus close with it (the stack). */
  closeTree(reason: CloseReason): void {
    this.outermost().hide(reason);
  }

  /**
   * An inline-axis arrow that no item used. `forward` is toward the inline end. A submenu closes on the
   * backward arrow; a menubar's menu moves to its neighbour. Returns whether the key was used.
   */
  inline(_direction: 'forward' | 'backward'): boolean {
    return false;
  }

  /** Put focus back after the menu closed with it inside: the trigger, when it can take focus. */
  restoreFocus(): void {
    if (isFocusTarget(this.trigger)) this.trigger.focus();
  }
}

/* ── the surface ────────────────────────────────────────────────────────── */

/**
 * The menu surface every content part shares. Each concrete content provides itself as `KxMenuSurface`, which
 * is how the items declared inside it find the menu they belong to.
 */
@Directive({
  host: {
    role: 'menu',
    tabindex: '-1',
    'aria-orientation': 'vertical',
    '[attr.aria-labelledby]': 'label() ? null : labelledby() ?? root.triggerId()',
    '[attr.aria-label]': 'label()',
    '[attr.data-modality]': 'modality()',
    '(keydown)': 'onKeydown($event)',
  },
})
export abstract class KxMenuSurface extends KxFloatingSurface {
  abstract override readonly root: KxMenuRoot;
  /** A name of its own. By default a menu is named by its trigger's text (`aria-labelledby`). */
  readonly label = input<string | null>(null);
  /** The id of an element that names the menu, instead of its trigger. */
  readonly labelledby = input<string | null>(null);
  readonly closesOnFocusOutside = true;

  private readonly entries = contentChildren(forwardRef(() => KxMenuEntry), { descendants: true });
  /** The items this menu owns, in document order — not those of a submenu declared inside it. */
  readonly items = computed(() => this.entries().filter((e) => e.menu === this));
  readonly roving = new KxRovingFocus<KxMenuEntry>(() => this.items());
  private readonly typeahead = new KxTypeahead();
  /** How the reader is moving through the menu: only a keyboard highlight draws the focus ring. */
  readonly modality = signal<'keyboard' | 'pointer'>('pointer');
  /** The triangle a pointer may cross on its way from a submenu trigger to the submenu, and until when. */
  private grace: { area: Point[]; until: number } | null = null;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.typeahead.clear());
  }

  protected override afterShow(): void {
    const how = this.root.focusOnOpen;
    this.root.focusOnOpen = 'surface';
    this.modality.set(how === 'first' || how === 'last' ? 'keyboard' : 'pointer');
    if (how === 'none') return;
    const target = how === 'first' || how === 'last' ? this.roving.target(how, false) : null;
    if (target) this.roving.active.set(target);
    this.focusOnceShown(target?.el ?? this.el);
  }

  /**
   * Focus `el` now, or — when the browser cannot focus it yet — on the next frame. A menu reopened while its
   * own closing transition is still running is back in the top layer but, for that frame, not yet focusable
   * (measured in Chromium: `focus()` was a no-op). The retry only happens if nothing else took focus meanwhile.
   */
  private focusOnceShown(el: HTMLElement): void {
    const before = activeElement(this.doc);
    el.focus();
    if (activeElement(this.doc) === el) return;
    this.doc.defaultView?.requestAnimationFrame(() => {
      if (this.root.open() && activeElement(this.doc) === before) el.focus();
    });
  }

  protected override afterHide(reason: CloseReason, focusWasInside: boolean): void {
    this.typeahead.clear();
    this.roving.active.set(null);
    this.grace = null;
    const lost = !activeElement(this.doc);
    if ((reason === 'escape' || reason === 'select' || reason === 'close' || reason === 'programmatic') && (focusWasInside || lost)) {
      this.root.restoreFocus();
    }
  }

  /** Keys that reach the menu from its items (or from itself). Keys from a submenu nested inside are its own. */
  onKeydown(event: KeyboardEvent): void {
    const from = event.target as Element | null;
    if (!from || from.closest('[role="menu"]') !== this.el || event.defaultPrevented) return;
    this.modality.set('keyboard');
    const current = this.items().find((e) => e.el === from) ?? null;
    if (event.key === 'Tab') {
      // Tab leaves the menu: the tree closes and the browser moves focus on, as it would from the trigger.
      this.root.closeTree('tab');
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (current) {
        event.preventDefault();
        current.el.click();
      }
      return;
    }
    const move = moveForKey(event.key, 'vertical', false);
    if (move) {
      event.preventDefault();
      const target = this.roving.target(move, false, current);
      if (target) this.roving.focus(target);
      return;
    }
    const inline = inlineKey(event.key, isRtl(this.el));
    if (inline) {
      if (inline === 'forward' && current?.opensSubmenu()) {
        event.preventDefault();
        current.openSubmenu('first');
      } else if (this.root.inline(inline)) {
        event.preventDefault();
      }
      return;
    }
    if (isTypeaheadKey(event)) {
      event.preventDefault();
      const match = this.roving.match(this.typeahead.push(event.key), (e) => e.text());
      if (match) this.roving.focus(match);
    }
  }

  /** The pointer moved over one of this menu's items: focus follows it, unless it is passing through. */
  pointerMoved(entry: KxMenuEntry, event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.modality.set('pointer');
    if (this.inGrace(event)) return;
    this.grace = null;
    if (entry.isDisabled()) {
      if (this.el.contains(activeElement(this.doc)) && activeElement(this.doc) !== this.el) this.el.focus();
      return;
    }
    if (activeElement(this.doc) !== entry.el) this.roving.focus(entry);
    entry.hovered();
  }

  /** The pointer left an item: the highlight goes with it, unless it is on its way into a submenu. */
  pointerLeft(entry: KxMenuEntry, event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    entry.unhovered(event);
    if (this.inGrace(event)) return;
    if (activeElement(this.doc) === entry.el) this.el.focus();
  }

  /** Open the grace area toward a submenu that is showing at `content`, from where the pointer left its trigger. */
  graceToward(content: HTMLElement, exit: Point): void {
    const r = content.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const towardRight = r.left + r.width / 2 > exit.x;
    const near = towardRight ? r.left : r.right;
    const far = towardRight ? r.right : r.left;
    // the exit point is nudged back over the trigger, so a pointer that leaves along the trigger's edge is inside
    const bleed = towardRight ? -5 : 5;
    this.grace = {
      area: [
        { x: exit.x + bleed, y: exit.y },
        { x: near, y: r.top },
        { x: far, y: r.top },
        { x: far, y: r.bottom },
        { x: near, y: r.bottom },
      ],
      until: Date.now() + 300,
    };
  }

  private inGrace(event: PointerEvent): boolean {
    const g = this.grace;
    if (!g || Date.now() > g.until) return false;
    return insidePolygon({ x: event.clientX, y: event.clientY }, g.area);
  }
}

/** Ray casting: whether `p` is inside the polygon `area`. */
function insidePolygon(p: Point, area: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const a = area[i]!;
    const b = area[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* ── items ──────────────────────────────────────────────────────────────── */

const surfaceProvider = (type: () => unknown) => ({ provide: KxMenuSurface, useExisting: forwardRef(type) });
const entryProvider = (type: () => unknown) => ({ provide: KxMenuEntry, useExisting: forwardRef(type) });

/**
 * What every item shares: it belongs to the nearest menu, takes part in its roving focus and typeahead, is
 * highlighted while it has focus, and is activated by a click — which the menu also sends for Enter and Space.
 */
@Directive({
  host: {
    '[attr.tabindex]': 'menu.roving.tabIndex(this)',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    // `disabled` is this input, never the native attribute: a natively disabled item could not take focus, and
    // a menu item that is unavailable is still announced in its place (aria-disabled)
    '[attr.disabled]': 'null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-highlighted]': 'focused() ? menu.modality() : null',
    '(focus)': 'focusIn()',
    '(blur)': 'focused.set(false)',
    '(click)': 'onClick($event)',
    '(pointermove)': 'menu.pointerMoved(this, $event)',
    '(pointerleave)': 'menu.pointerLeft(this, $event)',
  },
})
export abstract class KxMenuEntry implements KxRovingItem {
  readonly menu = inject(KxMenuSurface);
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Skipped by the arrows and typeahead, and not activated; announced as unavailable. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The text typeahead matches, when the item's own text is not it (an icon, a count, a shortcut aside). */
  readonly textValue = input<string | undefined>(undefined);
  protected readonly focused = signal(false);

  isDisabled(): boolean {
    return this.disabled();
  }

  /** The item's text without its shortcut or anything hidden from assistive technology. */
  text(): string {
    return this.textValue() ?? readableText(this.el, MENU_TEXT_SKIP);
  }

  focusIn(): void {
    this.focused.set(true);
    this.menu.roving.active.set(this);
  }

  onClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      return;
    }
    this.activate(event);
  }

  protected abstract activate(event: MouseEvent): void;

  /** Whether the inline-end arrow on this item opens a submenu. */
  opensSubmenu(): boolean {
    return false;
  }
  openSubmenu(_focus: KxMenuFocus): void {}
  /** Pointer hooks for a submenu trigger's hover intent. */
  hovered(): void {}
  unhovered(_event: PointerEvent): void {}
}

/** Text a reader would type to find an item: its own text, leaving out its shortcut and hidden decoration. */
const MENU_TEXT_SKIP = 'kx-menu-shortcut, [aria-hidden="true"]';

/**
 *   <button kxMenuItem (select)="duplicate()">Duplicate <kx-menu-shortcut>⌘D</kx-menu-shortcut></button>
 *   <button kxMenuItem variant="destructive" (select)="remove()">Delete</button>
 *
 * An action. On a `<button>` (or an `<a href>` for a destination). Activating it emits `select`, closes the
 * whole menu tree and returns focus to the trigger.
 */
@Directive({
  selector: 'button[kxMenuItem], a[kxMenuItem]',
  providers: [entryProvider(() => KxMenuItem)],
  host: {
    class: 'kx-menu__item',
    role: 'menuitem',
    '[attr.type]': 'isButton ? "button" : null',
    '[class.kx-menu__item--inset]': 'inset()',
    '[attr.data-variant]': 'variant() === "destructive" ? "destructive" : null',
  },
})
export class KxMenuItem extends KxMenuEntry {
  /** Indent the text to line up with items that carry a check or radio mark. */
  readonly inset = input(false, { transform: booleanAttribute });
  /** `destructive` for an action that removes or cannot be undone. The label must still say so. */
  readonly variant = input<'default' | 'destructive'>('default');
  /** The item was activated — by a click, Enter or Space. */
  readonly select = output<void>();
  protected readonly isButton = this.el.tagName === 'BUTTON';

  protected activate(): void {
    this.select.emit();
    this.menu.root.closeTree('select');
  }
}

const CHECK = '<svg class="kx-menu__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 *   <kx-menu-checkbox-item [(checked)]="showGrid">Show grid</kx-menu-checkbox-item>
 *
 * `role="menuitemcheckbox"` with `aria-checked`, and a check mark at the inline start — the state is a shape,
 * not a colour. Activating it toggles `checked` and closes the menu, as React's does.
 */
@Component({
  selector: 'kx-menu-checkbox-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [entryProvider(() => KxMenuCheckboxItem)],
  template: `<span class="kx-menu__indicator" aria-hidden="true">${CHECK}</span><ng-content />`,
  host: {
    class: 'kx-menu__item kx-menu__item--inset',
    role: 'menuitemcheckbox',
    '[attr.aria-checked]': 'checked()',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
  },
})
export class KxMenuCheckboxItem extends KxMenuEntry {
  readonly checked = model(false);

  protected activate(): void {
    this.checked.set(!this.checked());
    this.menu.root.closeTree('select');
  }
}

/** Labels the group or radio group it is in. Not an item: the arrows and typeahead pass over it. */
@Component({
  selector: 'kx-menu-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-menu__label',
    role: 'presentation',
    '[id]': 'resolvedId()',
    '[class.kx-menu__label--inset]': 'inset()',
  },
})
export class KxMenuLabel {
  /** Your own id, static or bound; the group follows it. Generated when absent. */
  readonly id = input<string | undefined>(undefined);
  readonly inset = input(false, { transform: booleanAttribute });
  private readonly generated = `${disclosureId('menu')}-label`;
  readonly resolvedId = computed(() => this.id() || this.generated);
}

/**
 *   <kx-menu-group><kx-menu-label>Account</kx-menu-label> … </kx-menu-group>
 *
 * `role="group"`, named by the `kx-menu-label` inside it.
 */
@Component({
  selector: 'kx-menu-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-menu__group', role: 'group', '[attr.aria-labelledby]': 'heading()?.resolvedId() ?? null' },
})
export class KxMenuGroup {
  protected readonly heading = contentChild(KxMenuLabel);
}

/**
 *   <kx-menu-radio-group [(value)]="density">
 *     <kx-menu-label>Density</kx-menu-label>
 *     <kx-menu-radio-item value="compact">Compact</kx-menu-radio-item>
 *     <kx-menu-radio-item value="comfortable">Comfortable</kx-menu-radio-item>
 *   </kx-menu-radio-group>
 */
@Component({
  selector: 'kx-menu-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-menu__group', role: 'group', '[attr.aria-labelledby]': 'heading()?.resolvedId() ?? null' },
})
export class KxMenuRadioGroup {
  /** Two-way: the chosen item's value. */
  readonly value = model<string | null>(null);
  protected readonly heading = contentChild(KxMenuLabel);
}

const DOT = '<svg class="kx-menu__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="3.5" fill="currentColor"/></svg>';

/** `role="menuitemradio"`: one of its group, `aria-checked` when it is the group's value, marked with a dot. */
@Component({
  selector: 'kx-menu-radio-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [entryProvider(() => KxMenuRadioItem)],
  template: `<span class="kx-menu__indicator" aria-hidden="true">${DOT}</span><ng-content />`,
  host: {
    class: 'kx-menu__item kx-menu__item--inset',
    role: 'menuitemradio',
    '[attr.aria-checked]': 'checked()',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
  },
})
export class KxMenuRadioItem extends KxMenuEntry {
  readonly value = input.required<string>();
  private readonly group = inject(KxMenuRadioGroup);
  readonly checked = computed(() => this.group.value() === this.value());

  protected activate(): void {
    this.group.value.set(this.value());
    this.menu.root.closeTree('select');
  }
}

/** A rule between groups of items: `role="separator"`. */
@Component({
  selector: 'kx-menu-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { class: 'kx-menu__separator', role: 'separator' },
})
export class KxMenuSeparator {}

/**
 * The keyboard shortcut an item also has, at its inline end. Part of the item's name (as React's), and left out
 * of what typeahead matches.
 */
@Component({
  selector: 'kx-menu-shortcut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-menu__shortcut' },
})
export class KxMenuShortcut {}

/* ── submenus ───────────────────────────────────────────────────────────── */

/**
 *   <kx-menu-sub>
 *     <button kxMenuSubTrigger>Share</button>
 *     <kx-menu-sub-content>
 *       <button kxMenuItem>Email link</button>
 *     </kx-menu-sub-content>
 *   </kx-menu-sub>
 *
 * Declared inside its parent menu's content. `[(open)]` is two-way.
 */
@Component({
  selector: 'kx-menu-sub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxMenuSub extends KxMenuRoot {
  override readonly parentMenu = inject(KxMenuSurface);
  /** ms the pointer rests on the trigger before the submenu opens. The keyboard opens it at once. */
  readonly openDelay = input(100, { transform: numberAttribute });
  content: HTMLElement | null = null;
  /** Move focus into the open submenu's first item (set by its content). */
  surfaceFocus: () => void = () => {};

  override inline(direction: 'forward' | 'backward'): boolean {
    if (direction === 'backward') {
      this.hide('close');
      return true;
    }
    // past the end of a submenu: a menubar moves on to its next menu; a dropdown has nowhere to go
    return this.outermost().inline('forward');
  }
}

/**
 * The submenu's trigger: an item of the PARENT menu (`role="menuitem"`, `aria-haspopup="menu"`,
 * `aria-expanded`), drawn with a chevron toward the inline end. The chevron is the Unicode single angle
 * quotation mark, which is `Bidi_Mirrored`: the text engine turns it by the direction its own element resolves
 * to, with no selector for a build step to rewrite.
 */
@Component({
  selector: 'button[kxMenuSubTrigger]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [entryProvider(() => KxMenuSubTrigger)],
  template: '<ng-content /><span class="kx-menu__chevron" aria-hidden="true">›</span>',
  host: {
    class: 'kx-menu__item kx-menu__item--sub',
    type: 'button',
    role: 'menuitem',
    'aria-haspopup': 'menu',
    '[id]': 'resolvedId()',
    '[attr.aria-expanded]': 'sub.open()',
    '[attr.aria-controls]': 'sub.contentId()',
    '[attr.data-state]': 'sub.open() ? "open" : "closed"',
    '[class.kx-menu__item--inset]': 'inset()',
  },
})
export class KxMenuSubTrigger extends KxMenuEntry {
  readonly sub = inject(KxMenuSub);
  readonly id = input<string | undefined>(undefined);
  readonly inset = input(false, { transform: booleanAttribute });
  private readonly generated = `${disclosureId('menu')}-sub-trigger`;
  readonly resolvedId = computed(() => this.id() || this.generated);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.sub.trigger = this.el;
    this.sub.triggerIdFrom.set(this.resolvedId);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      if (this.sub.trigger === this.el) this.sub.trigger = null;
    });
  }

  override opensSubmenu(): boolean {
    return !this.isDisabled();
  }
  override openSubmenu(focus: KxMenuFocus): void {
    clearTimeout(this.timer);
    if (this.sub.open()) {
      if (focus === 'first') this.sub.surfaceFocus();
      return;
    }
    this.sub.openWith(focus);
  }

  /** A click opens it — from the keyboard (or assistive technology) into its first item, from a pointer in place. */
  protected activate(event: MouseEvent): void {
    this.openSubmenu(event.detail === 0 ? 'first' : 'none');
  }

  override hovered(): void {
    if (this.sub.open() || this.timer || this.isDisabled()) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.focused()) this.sub.openWith('none');
    }, this.sub.openDelay());
  }
  override unhovered(event: PointerEvent): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.sub.open() && this.sub.content) this.menu.graceToward(this.sub.content, { x: event.clientX, y: event.clientY });
  }
}

/** The submenu's surface: `side="end"` (mirrored in RTL), aligned with its trigger, named by it. */
@Component({
  selector: 'kx-menu-sub-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [surfaceProvider(() => KxMenuSubContent)],
  template: '<ng-content />',
  host: { class: 'kx-floating kx-menu kx-menu--sub' },
})
export class KxMenuSubContent extends KxMenuSurface {
  readonly root: KxMenuSub = adopt(inject(KxMenuSub), this.id);
  /** The side it opens on, `end` by default. Where neither inline side has room for it, it opens below its trigger. */
  readonly preferredSide = input<KxSide>('end', { alias: 'side' });
  override readonly align = input<'start' | 'center' | 'end'>('start');
  override readonly offset = input(2, { transform: numberAttribute });

  /**
   * Beside the parent menu when there is room for a menu's minimum width (12rem) on either inline side of it —
   * `autoPlace` then picks and flips as for any surface. On a narrow screen, or at 200% text, the parent can fill
   * the width: a submenu squeezed into the few pixels beside it would be unreadable (check:angular-collections,
   * "largeText", 390px), so it drops below its trigger instead, over the parent's later items.
   */
  readonly side = (): KxSide => {
    const side = this.preferredSide();
    if (side !== 'start' && side !== 'end') return side;
    const view = this.doc.defaultView;
    const parent = this.root.parentMenu.surface().getBoundingClientRect();
    if (!view || !parent.width) return side;
    const rem = parseFloat(view.getComputedStyle(this.doc.documentElement).fontSize) || 16;
    const need = 12 * rem;
    const room = Math.max(parent.left, this.doc.documentElement.clientWidth - parent.right) - 8;
    return room >= need ? side : 'bottom';
  };

  constructor() {
    super();
    this.root.content = this.el;
    this.root.surfaceFocus = () => {
      const first = this.roving.target('first', false);
      if (first) {
        this.modality.set('keyboard');
        this.roving.focus(first);
      }
    };
  }
}

/* ── dropdown menu ──────────────────────────────────────────────────────── */

/**
 *   <kx-dropdown-menu [(open)]="open">
 *     <button kxButton variant="Outline" kxDropdownMenuTrigger>Options</button>
 *     <kx-dropdown-menu-content align="start">
 *       <button kxMenuItem (select)="rename()">Rename</button>
 *       <kx-menu-separator />
 *       <button kxMenuItem variant="destructive" (select)="remove()">Delete</button>
 *     </kx-dropdown-menu-content>
 *   </kx-dropdown-menu>
 */
@Component({
  selector: 'kx-dropdown-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxDropdownMenu extends KxMenuRoot {
  toggle(event: MouseEvent): void {
    if (this.open()) this.hide('close');
    else this.openWith(event.detail === 0 ? 'first' : 'surface');
  }
}

/**
 * The button that opens the menu: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. Enter, Space and
 * ArrowDown open it on its first item, ArrowUp on its last; a pointer press opens it with focus on the menu.
 */
@Directive({
  selector: 'button[kxDropdownMenuTrigger]',
  host: {
    type: 'button',
    'aria-haspopup': 'menu',
    '[id]': 'resolvedId()',
    '[attr.aria-expanded]': 'root.open()',
    '[attr.aria-controls]': 'root.contentId()',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
    '(click)': 'root.toggle($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KxDropdownMenuTrigger {
  readonly root = inject(KxDropdownMenu);
  readonly id = input<string | undefined>(undefined);
  private readonly generated = `${disclosureId('menu')}-trigger`;
  readonly resolvedId = computed(() => this.id() || this.generated);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.root.trigger = el;
    this.root.triggerIdFrom.set(this.resolvedId);
    inject(DestroyRef).onDestroy(() => {
      if (this.root.trigger === el) this.root.trigger = null;
    });
  }

  onKeydown(event: KeyboardEvent): void {
    const focus = event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' ? 'first' : event.key === 'ArrowUp' ? 'last' : null;
    if (!focus) return;
    event.preventDefault();
    this.root.openWith(focus);
  }
}

@Component({
  selector: 'kx-dropdown-menu-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [surfaceProvider(() => KxDropdownMenuContent)],
  template: '<ng-content />',
  host: { class: 'kx-floating kx-menu' },
})
export class KxDropdownMenuContent extends KxMenuSurface {
  readonly root: KxDropdownMenu = adopt(inject(KxDropdownMenu), this.id);
  readonly side = input<KxSide>('bottom');
}

/* ── context menu ───────────────────────────────────────────────────────── */

/**
 *   <kx-context-menu>
 *     <div kxContextMenuTrigger tabindex="0" role="group" aria-label="Canvas">…</div>
 *     <kx-context-menu-content label="Canvas actions">…</kx-context-menu-content>
 *   </kx-context-menu>
 *
 * Opened by a secondary click inside the region — placed AT the pointer, through a virtual point anchor — or,
 * from the keyboard, by the ContextMenu key or Shift+F10 on anything focused inside the region, placed against
 * that element. While KinetixUI opens the menu, the browser's own context menu is held back. When it closes
 * with focus inside, focus goes back to where it was before the menu opened, else to the region if it can take
 * focus.
 */
@Component({
  selector: 'kx-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxContextMenu extends KxMenuRoot {
  /** Where a pointer opened the menu, in viewport coordinates; null when the keyboard opened it. */
  readonly point = signal<Point | null>(null);
  /** The focused element the keyboard opened the menu from. */
  keyboardAnchor: HTMLElement | null = null;
  private returnTo: HTMLElement | null = null;
  surface: KxContextMenuContent | null = null;

  openAt(x: number, y: number, from: Element): void {
    this.keyboardAnchor = null;
    this.remember(from);
    this.point.set({ x, y });
    if (this.open()) this.surface?.replace();
    else this.openWith('surface');
  }

  openFrom(el: HTMLElement): void {
    this.point.set(null);
    this.keyboardAnchor = el;
    this.remember(el);
    if (this.open()) {
      this.surface?.replace();
      this.surface?.focusFirst();
    } else this.openWith('first');
  }

  private remember(from: Element): void {
    const focused = activeElement(from.ownerDocument);
    // the menu's own items are never where focus goes back to
    if (focused && !this.surface?.surface().contains(focused)) this.returnTo = focused;
    else if (!focused) this.returnTo = null;
  }

  override restoreFocus(): void {
    const back = isFocusTarget(this.returnTo) ? this.returnTo : isFocusTarget(this.trigger) ? this.trigger : null;
    back?.focus();
  }
}

/** The region the menu belongs to. It takes no role or tab stop of its own: the page decides what it is. */
@Directive({
  selector: '[kxContextMenuTrigger]',
  host: {
    class: 'kx-context-menu__trigger',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
    '(contextmenu)': 'onContextmenu($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KxContextMenuTrigger {
  readonly root = inject(KxContextMenu);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    this.root.trigger = this.el;
    inject(DestroyRef).onDestroy(() => {
      if (this.root.trigger === this.el) this.root.trigger = null;
    });
  }

  onContextmenu(event: MouseEvent): void {
    if (this.root.surface?.surface().contains(event.target as Node)) return;
    event.preventDefault();
    // A context menu requested from the keyboard arrives as a pointer event with no pointer type (or, without
    // pointer events, with the primary button): it belongs at the focused element, not at a coordinate.
    const pointerType = (event as PointerEvent).pointerType;
    const keyboard = pointerType !== undefined ? pointerType === '' : event.button !== 2;
    if (keyboard) {
      const focused = activeElement(this.el.ownerDocument);
      if (!this.root.open()) this.root.openFrom(focused && this.el.contains(focused) ? focused : this.el);
      return;
    }
    this.root.openAt(event.clientX, event.clientY, this.el);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!(event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))) return;
    if (this.root.surface?.surface().contains(event.target as Node)) return;
    event.preventDefault();
    const from = event.target instanceof Element && this.el.contains(event.target) ? (event.target as HTMLElement) : this.el;
    this.root.openFrom(from);
  }
}

@Component({
  selector: 'kx-context-menu-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [surfaceProvider(() => KxContextMenuContent)],
  template: '<ng-content />',
  host: { class: 'kx-floating kx-menu', '(contextmenu)': '$event.preventDefault()' },
})
export class KxContextMenuContent extends KxMenuSurface {
  readonly root: KxContextMenu = adopt(inject(KxContextMenu), this.id);
  readonly side = input<KxSide>('bottom');
  override readonly align = input<'start' | 'center' | 'end'>('start');
  override readonly offset = input(2, { transform: numberAttribute });

  constructor() {
    super();
    this.root.surface = this;
    // A new point re-places the menu even when it never stopped showing: a second secondary click closes it
    // (a press outside it) and opens it again within one event, so the surface sees no close in between.
    effect(() => {
      this.root.point();
      untracked(() => this.reposition());
    });
  }

  /** Re-place against the newest point or element (a second secondary click while it is open). */
  replace(): void {
    this.reposition();
  }

  focusFirst(): void {
    this.modality.set('keyboard');
    this.roving.focus(this.roving.target('first', false));
  }

  /**
   * At the pointer: a zero-size box at the click, read in the region's direction, so `align="start"` puts the
   * menu's inline-start corner on the pointer (its left in LTR, its right in RTL). From the keyboard: the
   * element focus was on.
   */
  protected override placementAnchor(): KxAnchor | null {
    const point = this.root.point();
    const context = this.root.trigger ?? this.el;
    if (point) {
      const anchor: KxVirtualAnchor = { getBoundingClientRect: () => ({ x: point.x, y: point.y, width: 0, height: 0 }), contextElement: context };
      return anchor;
    }
    return this.root.keyboardAnchor ?? this.root.trigger;
  }

  /** Not the region: a press elsewhere in the region is outside the menu, and closes it. */
  override companions(): readonly (Element | null)[] {
    return [];
  }
}

/* ── menubar ────────────────────────────────────────────────────────────── */

/**
 *   <kx-menubar aria-label="Editor">
 *     <kx-menubar-menu value="file">
 *       <button kxMenubarTrigger>File</button>
 *       <kx-menubar-content>…</kx-menubar-content>
 *     </kx-menubar-menu>
 *     …
 *   </kx-menubar>
 *
 * `role="menubar"`: a horizontal row of menu triggers that is one Tab stop. ArrowRight / ArrowLeft (mirrored in
 * RTL) move between triggers and wrap; Home / End jump; typing a letter moves to the trigger it starts.
 * Enter, Space or ArrowDown open a menu on its first item, ArrowUp on its last. While a menu is open, the
 * inline arrows move to the neighbouring menu and open it, and hovering another trigger opens that one.
 * `[(value)]` is the open menu's value, or null.
 */
@Component({
  selector: 'kx-menubar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-menubar', role: 'menubar' },
})
export class KxMenubar {
  /** Two-way: the value of the open menu, or null when none is open. */
  readonly value = model<string | null>(null);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly all = contentChildren(forwardRef(() => KxMenubarTrigger), { descendants: true });
  readonly triggers = computed(() => this.all().filter((t) => t.menu.menubar === this));
  readonly roving = new KxRovingFocus<KxMenubarTrigger>(() => this.triggers());
  private readonly typeahead = new KxTypeahead();

  constructor() {
    // `value` is the source of truth: whatever sets it, the menus follow.
    effect(() => {
      const open = this.value();
      untracked(() => {
        for (const t of this.triggers()) {
          const menu = t.menu;
          if (menu.key() === open && !menu.open()) menu.open.set(true);
          else if (menu.key() !== open && menu.open()) menu.hide('switch');
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.typeahead.clear());
  }

  /** Move from `from` to the neighbouring trigger; if a menu was open, open the neighbour's, focusing `focus`. */
  step(from: KxMenubarTrigger, direction: 'forward' | 'backward', focus: KxMenuFocus): void {
    const target = this.roving.target(direction === 'forward' ? 'next' : 'previous', true, from);
    if (!target || target === from) return;
    const wasOpen = this.value() !== null;
    this.roving.focus(target);
    if (wasOpen) target.menu.openWith(focus);
  }

  onTriggerKeydown(trigger: KxMenubarTrigger, event: KeyboardEvent): void {
    const key = event.key;
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      trigger.menu.openWith(key === 'ArrowUp' ? 'last' : 'first');
      return;
    }
    const inline = inlineKey(key, isRtl(this.el));
    if (inline) {
      event.preventDefault();
      this.step(trigger, inline, 'first');
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      this.roving.focus(this.roving.target(key === 'Home' ? 'first' : 'last', true));
      return;
    }
    if (isTypeaheadKey(event)) {
      event.preventDefault();
      this.roving.focus(this.roving.match(this.typeahead.push(key), (t) => t.text()));
    }
  }
}

/** One menu of a menubar: its trigger and its content. `value` names it in the menubar's `[(value)]`. */
@Component({
  selector: 'kx-menubar-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxMenubarMenu extends KxMenuRoot {
  readonly menubar = inject(KxMenubar);
  readonly value = input<string | undefined>(undefined);
  private readonly generated = `kx-menubar-menu-${nextKey++}`;
  readonly key = computed(() => this.value() ?? this.generated);
  menubarTrigger: KxMenubarTrigger | null = null;

  constructor() {
    super();
    // the menu's own [(open)] and the menubar's [(value)] say the same thing
    effect(() => {
      const open = this.open();
      untracked(() => {
        if (open && this.menubar.value() !== this.key()) this.menubar.value.set(this.key());
        else if (!open && this.menubar.value() === this.key()) this.menubar.value.set(null);
      });
    });
  }

  override show(): void {
    this.menubar.value.set(this.key());
    super.show();
  }

  override hide(reason?: CloseReason): void {
    if (!this.open()) return;
    super.hide(reason);
    if (this.menubar.value() === this.key()) this.menubar.value.set(null);
  }

  override inline(direction: 'forward' | 'backward'): boolean {
    if (!this.menubarTrigger) return false;
    this.menubar.step(this.menubarTrigger, direction, 'first');
    return true;
  }

  toggle(event: MouseEvent): void {
    if (this.open()) this.hide('close');
    else this.openWith(event.detail === 0 ? 'first' : 'surface');
  }
}

/**
 * A menubar's trigger: `role="menuitem"` with `aria-haspopup="menu"` and `aria-expanded`, one of the menubar's
 * roving stops.
 */
@Directive({
  selector: 'button[kxMenubarTrigger]',
  host: {
    class: 'kx-menubar__trigger',
    type: 'button',
    role: 'menuitem',
    'aria-haspopup': 'menu',
    '[id]': 'resolvedId()',
    '[attr.tabindex]': 'menu.menubar.roving.tabIndex(this)',
    '[attr.aria-expanded]': 'menu.open()',
    '[attr.aria-controls]': 'menu.contentId()',
    '[attr.data-state]': 'menu.open() ? "open" : "closed"',
    '(click)': 'menu.toggle($event)',
    '(keydown)': 'menu.menubar.onTriggerKeydown(this, $event)',
    '(focus)': 'menu.menubar.roving.active.set(this)',
    '(pointerenter)': 'onPointerenter($event)',
  },
})
export class KxMenubarTrigger implements KxRovingItem {
  readonly menu = inject(KxMenubarMenu);
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly id = input<string | undefined>(undefined);
  private readonly generated = `${disclosureId('menu')}-trigger`;
  readonly resolvedId = computed(() => this.id() || this.generated);

  constructor() {
    this.menu.trigger = this.el;
    this.menu.menubarTrigger = this;
    this.menu.triggerIdFrom.set(this.resolvedId);
    inject(DestroyRef).onDestroy(() => {
      if (this.menu.trigger === this.el) this.menu.trigger = null;
      if (this.menu.menubarTrigger === this) this.menu.menubarTrigger = null;
    });
  }

  isDisabled(): boolean {
    return false;
  }
  text(): string {
    return readableText(this.el, MENU_TEXT_SKIP);
  }

  /** With another of the menubar's menus open, pointing at this trigger opens this one instead. */
  onPointerenter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    const open = this.menu.menubar.value();
    if (open === null || open === this.menu.key()) return;
    this.menu.menubar.roving.active.set(this);
    this.menu.openWith('surface');
  }
}

@Component({
  selector: 'kx-menubar-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [surfaceProvider(() => KxMenubarContent)],
  template: '<ng-content />',
  host: { class: 'kx-floating kx-menu' },
})
export class KxMenubarContent extends KxMenuSurface {
  readonly root: KxMenubarMenu = adopt(inject(KxMenubarMenu), this.id);
  readonly side = input<KxSide>('bottom');
  override readonly align = input<'start' | 'center' | 'end'>('start');
}

