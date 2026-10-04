import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  type Signal,
  afterRenderEffect,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { disclosureId } from './disclosure';
import {
  KxOverlayStack,
  activeElement,
  autoPlace,
  isFocusTarget,
  tabbables,
  type KxAlign,
  type KxDismissReason,
  type KxLayer,
  type KxSide,
} from './overlay';

/**
 * The floating family: popover, tooltip, hover card — three surfaces that sit beside the element they belong
 * to, never modal, and are three different things:
 *
 *                 opened by                       is                          focus
 *   popover       pressing its trigger            a non-modal dialog          moves in; Tab out closes it
 *   tooltip       hover (after a delay), or       the trigger's DESCRIPTION   stays on the trigger
 *                 keyboard focus                  (`role="tooltip"`)
 *   hover card    hover with intent, or           a preview of where the      stays on the trigger; Tab
 *                 keyboard focus                  trigger leads               walks into its links
 *
 * A tooltip is not a tiny popover: it carries no controls, never takes focus, and what it says is already the
 * trigger's accessible description whether or not it is showing — so a touch user, who never hovers, still has
 * it read out. A hover card is not a tooltip: it is not a description (a card of profile details read as a
 * button's description would be noise) and it may hold links. Neither may be the only way to an action or a
 * piece of information the reader needs: a tooltip does not open on touch, and a hover card's trigger is a
 * link whose destination carries the same content.
 *
 * ── Shared ─────────────────────────────────────────────────────────────────
 *
 * Each surface is `popover="manual"` and shown into the top layer (overlay.ts), placed by `autoPlace`: `side`
 * top | bottom | start | end (logical), `align` start | center | end, `offset` px; flipped, shifted and capped
 * to the room it has, and re-placed on scroll, resize and size changes. It is declared where it is used, so
 * inside a dialog it is inside that dialog — a press on it is never a press outside its dialog, and Escape
 * closes it first.
 *
 * Every surface answers Escape. Hover surfaces honour WCAG 1.4.13: dismissible (Escape, without moving the
 * pointer), hoverable (the pointer can travel from the trigger onto the surface: leaving the trigger starts a
 * short close delay that entering the surface cancels) and persistent (they stay while hovered or focused).
 *
 * Motion: a fade and a 4px settle away from the side it opens on, over `--duration-fast` in and
 * `--duration-instant` out (a tooltip `--duration-instant` both ways); `none` under reduced motion.
 */

/** Why a floating surface closed — decides whether focus goes back to the trigger. */
type CloseReason = KxDismissReason | 'close' | 'blur' | 'pointer' | 'press' | 'programmatic';

@Directive()
export abstract class KxFloatingRoot {
  /** Two-way: whether the surface is showing. */
  readonly open = model(false);
  private readonly generatedId = `${disclosureId('floating')}-content`;
  /** The content's own `id` input, static or bound, once the content exists. */
  readonly contentIdFrom = signal<Signal<string | undefined> | null>(null);
  /** Generated, unless the content has an `id` of its own (`id="…"` or `[id]="…"`) — then that one, as it changes. */
  readonly contentId = computed(() => this.contentIdFrom()?.() || this.generatedId);
  trigger: HTMLElement | null = null;
  anchor: HTMLElement | null = null;
  /** The last reason it closed for; `programmatic` when `open` was set from outside. */
  reason: CloseReason = 'programmatic';

  show(): void {
    this.open.set(true);
  }
  hide(reason: CloseReason = 'programmatic'): void {
    if (!this.open()) return;
    this.reason = reason;
    this.open.set(false);
  }
}

/** The surface's root, following the surface's own `id` input as the id every reference uses. */
function adopt<T extends KxFloatingRoot>(root: T, id: Signal<string | undefined>): T {
  root.contentIdFrom.set(id);
  return root;
}

/** Where a floating surface goes, and the open/close lifecycle every member shares. */
@Directive({
  host: {
    popover: 'manual',
    '[id]': 'root.contentId()',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
  },
})
export abstract class KxFloatingSurface implements KxLayer {
  abstract readonly root: KxFloatingRoot;
  abstract readonly side: () => KxSide;
  /** Your own id for the surface, static or bound; the trigger's references follow it. Generated when absent. */
  readonly id = input<string | undefined>(undefined);
  /** Alignment along the trigger, logical. */
  readonly align = input<KxAlign>('center');
  /** The gap between the trigger and the surface, in px. */
  readonly offset = input(4, { transform: numberAttribute });

  protected readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly doc = inject(DOCUMENT);
  private readonly stack = inject(KxOverlayStack);
  readonly modal = false;
  abstract readonly closesOnFocusOutside: boolean;

  private shown = false;
  private release: (() => void) | null = null;

  constructor() {
    afterRenderEffect({
      write: () => {
        const open = this.root.open();
        untracked(() => this.sync(open));
      },
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.shown) this.teardown();
    });
  }

  surface(): HTMLElement {
    return this.el;
  }
  companions(): readonly (Element | null)[] {
    return [this.root.trigger, this.root.anchor];
  }
  request(reason: KxDismissReason): void {
    this.root.hide(reason);
  }

  protected afterShow(): void {}
  protected afterHide(_reason: CloseReason, _focusWasInside: boolean): void {}

  private sync(open: boolean): void {
    if (open && !this.shown) {
      this.shown = true;
      this.root.reason = 'programmatic';
      if (typeof this.el.showPopover === 'function' && !this.isShowing()) this.el.showPopover();
      else this.el.setAttribute('data-kx-shown', '');
      const anchor = this.root.anchor ?? this.root.trigger ?? this.el.parentElement;
      if (anchor) this.release = autoPlace(anchor, this.el, { side: () => this.side(), align: () => this.align(), offset: () => this.offset() });
      this.stack.add(this);
      this.afterShow();
    } else if (!open && this.shown) {
      const inside = this.el.contains(this.doc.activeElement);
      this.teardown();
      this.afterHide(this.root.reason, inside);
      this.root.reason = 'programmatic';
    }
  }

  private teardown(): void {
    this.shown = false;
    this.stack.remove(this);
    this.release?.();
    this.release = null;
    if (typeof this.el.hidePopover === 'function' && this.isShowing()) this.el.hidePopover();
    this.el.removeAttribute('data-kx-shown');
  }

  private isShowing(): boolean {
    try {
      return this.el.matches(':popover-open');
    } catch {
      return this.el.hasAttribute('data-kx-shown');
    }
  }
}

/* ── popover ────────────────────────────────────────────────────────────── */

/**
 *   <kx-popover [(open)]="filtersOpen">
 *     <button kxButton variant="Outline" kxPopoverTrigger>Filters</button>
 *     <kx-popover-content side="bottom" align="start" label="Filters">…</kx-popover-content>
 *   </kx-popover>
 *
 * A non-modal dialog beside its trigger. Pressing the trigger toggles it (`aria-expanded`, `aria-controls`,
 * `aria-haspopup="dialog"`). On open, focus moves to the first `autofocus` element or Tab stop inside it, else
 * to the surface. Because the surface follows its trigger in the DOM, Tab order runs trigger → popover →
 * the rest of the page with no focus guards; when focus leaves both, the popover closes. Escape, a press
 * outside, `kxPopoverClose` and `[(open)]` close it. Escape and the close control return focus to the trigger;
 * a press elsewhere leaves focus where the reader put it.
 *
 * It is never modal and nothing behind it is made inert — content that must hold focus is a dialog.
 */
@Component({
  selector: 'kx-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxPopover extends KxFloatingRoot {
  toggle(): void {
    if (this.open()) this.hide('close');
    else this.show();
  }
}

@Directive({
  selector: 'button[kxPopoverTrigger]',
  host: {
    type: 'button',
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'root.open()',
    '[attr.aria-controls]': 'root.contentId()',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
    '(click)': 'root.toggle()',
  },
})
export class KxPopoverTrigger {
  readonly root = inject(KxPopover);
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.root.trigger = el;
    inject(DestroyRef).onDestroy(() => {
      if (this.root.trigger === el) this.root.trigger = null;
    });
  }
}

/** Positions the popover against this element instead of the trigger. */
@Directive({ selector: '[kxPopoverAnchor]' })
export class KxPopoverAnchor {
  constructor() {
    const root = inject(KxPopover);
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    root.anchor = el;
    inject(DestroyRef).onDestroy(() => {
      if (root.anchor === el) root.anchor = null;
    });
  }
}

/** Closes the popover and returns focus to its trigger. */
@Directive({
  selector: 'button[kxPopoverClose]',
  host: { type: 'button', '(click)': 'root.hide("close")' },
})
export class KxPopoverClose {
  readonly root = inject(KxPopover);
}

@Component({
  selector: 'kx-popover-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-floating kx-popover',
    role: 'dialog',
    tabindex: '-1',
    '[attr.aria-labelledby]': 'labelledby()',
    // A dialog with no name is announced as just "dialog" (WCAG 4.1.2); React's Popover found the same and
    // falls back the same way. The fallback is the floor, not the goal — name it after what is inside.
    '[attr.aria-label]': 'labelledby() ? null : label()',
  },
})
export class KxPopoverContent extends KxFloatingSurface {
  readonly root = adopt(inject(KxPopover), this.id);
  readonly side = input<KxSide>('bottom');
  readonly label = input('Popover');
  /** The id of an element inside that names the popover (a heading); preferred over `label`. */
  readonly labelledby = input<string | null>(null);
  readonly closesOnFocusOutside = true;

  protected override afterShow(): void {
    const marked = this.el.querySelector<HTMLElement>('[autofocus]');
    const target = (isFocusTarget(marked) ? marked : null) ?? tabbables(this.el)[0] ?? this.el;
    target.focus();
  }

  protected override afterHide(reason: CloseReason, focusWasInside: boolean): void {
    const lost = !activeElement(this.doc);
    if ((reason === 'escape' || reason === 'close' || reason === 'programmatic') && (focusWasInside || lost) && isFocusTarget(this.root.trigger)) {
      this.root.trigger.focus();
    }
  }
}

/* ── hover intent: tooltip and hover card ───────────────────────────────── */

@Directive()
export abstract class KxHoverRoot extends KxFloatingRoot {
  /** ms the pointer rests on the trigger before the surface opens. Keyboard focus opens it at once. */
  abstract readonly openDelay: () => number;
  /** ms after the pointer leaves before the surface closes — the time it has to travel onto the surface. */
  abstract readonly closeDelay: () => number;
  /** Whether losing focus from the trigger closes it (tooltip), or focus may move into it (hover card). */
  protected abstract readonly closesOnBlur: boolean;

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  private clear(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openTimer = this.closeTimer = undefined;
  }

  /** The pointer reached the trigger. Touch has no hover: a tap is the trigger's own action. */
  enter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    clearTimeout(this.closeTimer);
    if (this.open() || this.openTimer) return;
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.show();
    }, this.openDelay());
  }
  /** The pointer left the trigger or the surface: close unless it arrives on the other in time. */
  leave(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
    if (!this.open()) return;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      // Hover and keyboard focus are separate reasons to stay open: the pointer leaving does not take a
      // surface away from someone still on it with the keyboard (focus on the trigger, or on a link inside).
      if (!this.keyboardFocusWithin()) this.hide('pointer');
    }, this.closeDelay());
  }
  private keyboardFocusWithin(): boolean {
    const trigger = this.trigger;
    if (!trigger) return false;
    const doc = trigger.ownerDocument;
    const focused = activeElement(doc);
    if (!focused || !(trigger.contains(focused) || doc.getElementById(this.contentId())?.contains(focused))) return false;
    try {
      return focused.matches(':focus-visible');
    } catch {
      return true;
    }
  }
  /** The pointer is on the surface: stay. */
  hold(): void {
    clearTimeout(this.closeTimer);
  }
  /** Keyboard focus opens at once; focus from a press (not `:focus-visible`) does not. */
  focused(el: EventTarget | null): void {
    if (!(el instanceof Element)) return;
    let visible = false;
    try {
      visible = el.matches(':focus-visible');
    } catch {
      visible = true;
    }
    if (!visible) return;
    this.clear();
    this.show();
  }
  blurred(): void {
    if (this.closesOnBlur) {
      this.clear();
      this.hide('blur');
    }
  }
  /** Pressing the trigger acts on it; the surface gets out of the way. */
  pressed(): void {
    this.clear();
    this.hide('press');
  }
}

const HOVER_TRIGGER = {
  '(pointerenter)': 'root.enter($event)',
  '(pointerleave)': 'root.leave($event)',
  '(focus)': 'root.focused($event.currentTarget)',
  '(blur)': 'root.blurred()',
  '(pointerdown)': 'root.pressed()',
};
const HOVER_SURFACE = {
  '(pointerenter)': 'root.hold()',
  '(pointerleave)': 'root.leave($event)',
};

function registerTrigger(root: KxFloatingRoot): void {
  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  root.trigger = el;
  inject(DestroyRef).onDestroy(() => {
    if (root.trigger === el) root.trigger = null;
  });
}

/* ── tooltip ────────────────────────────────────────────────────────────── */

/**
 *   <kx-tooltip>
 *     <button kxButton variant="Ghost" size="icon" aria-label="Copy link" kxTooltipTrigger>…</button>
 *     <kx-tooltip-content>Copies a link anyone in the workspace can open</kx-tooltip-content>
 *   </kx-tooltip>
 *
 * The content is the trigger's `aria-describedby` from the start — it stays in the DOM, hidden, while closed —
 * so the description is read on focus whether or not the tooltip is showing, and a touch user gets it too.
 * An icon-only trigger still needs its own name (`aria-label`): a description is not a name.
 *
 * Opens after `openDelay` (700ms, React's) of hover, or at once on keyboard focus. Closes on Escape, on
 * blur, on pressing the trigger, and `closeDelay` (100ms) after the pointer leaves both trigger and tooltip.
 * There is no group "skip delay" between neighbouring tooltips (React's provider has one).
 */
@Component({
  selector: 'kx-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxTooltip extends KxHoverRoot {
  readonly openDelay = input(700, { transform: numberAttribute });
  readonly closeDelay = input(100, { transform: numberAttribute });
  protected readonly closesOnBlur = true;
}

@Directive({
  selector: '[kxTooltipTrigger]',
  host: { ...HOVER_TRIGGER, '[attr.aria-describedby]': 'describedby()' },
})
export class KxTooltipTrigger {
  readonly root = inject(KxTooltip);
  private readonly own = inject(new HostAttributeToken('aria-describedby'), { optional: true });
  /** The caller's own description, if the element had one, and then the tooltip. */
  protected describedby(): string {
    return [this.own, this.root.contentId()].filter(Boolean).join(' ');
  }
  constructor() {
    registerTrigger(this.root);
  }
}

@Component({
  selector: 'kx-tooltip-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { ...HOVER_SURFACE, class: 'kx-floating kx-tooltip', role: 'tooltip' },
})
export class KxTooltipContent extends KxFloatingSurface {
  readonly root = adopt(inject(KxTooltip), this.id);
  readonly side = input<KxSide>('top');
  readonly closesOnFocusOutside = false;
}

/* ── hover card ─────────────────────────────────────────────────────────── */

/**
 *   <kx-hover-card>
 *     <a kxHoverCardTrigger href="/people/ada">Ada Lovelace</a>
 *     <kx-hover-card-content>…</kx-hover-card-content>
 *   </kx-hover-card>
 *
 * A preview of what the trigger — a link — leads to. Opens after `openDelay` (700ms) of hover, or at once on
 * keyboard focus, and waits `closeDelay` (300ms) after the pointer leaves, long enough to move onto the card
 * and use a link in it. Focus stays on the trigger; Tab goes from the trigger into the card's links (it
 * follows the trigger in the DOM), and the card closes when focus leaves both. Escape closes it.
 *
 * It is not a description and has no role: the destination page carries the same content, which is how a
 * touch user — who never sees the card — gets it.
 */
@Component({
  selector: 'kx-hover-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
})
export class KxHoverCard extends KxHoverRoot {
  readonly openDelay = input(700, { transform: numberAttribute });
  readonly closeDelay = input(300, { transform: numberAttribute });
  protected readonly closesOnBlur = false;
}

@Directive({
  selector: '[kxHoverCardTrigger]',
  host: HOVER_TRIGGER,
})
export class KxHoverCardTrigger {
  readonly root = inject(KxHoverCard);
  constructor() {
    registerTrigger(this.root);
  }
}

@Component({
  selector: 'kx-hover-card-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { ...HOVER_SURFACE, class: 'kx-floating kx-hover-card' },
})
export class KxHoverCardContent extends KxFloatingSurface {
  readonly root = adopt(inject(KxHoverCard), this.id);
  readonly side = input<KxSide>('bottom');
  readonly closesOnFocusOutside = true;
}
