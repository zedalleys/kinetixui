import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  InjectionToken,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { KxButton } from './button';
import { disclosureId } from './disclosure';
import { KxOverlayStack, activeElement, isFocusTarget, tabbables, wrapTab, type KxDismissReason, type KxLayer } from './overlay';

/**
 * The dialog family: dialog, alert dialog, sheet, drawer — and modal, which is a dialog with a fixed layout.
 *
 * ── The shared contract (written before the code) ──────────────────────────
 *
 * One root holds the state, two-way: `[(open)]`. Every surface in the family is a real `<dialog>` element the
 * caller writes, carrying the surface's directive (`<dialog kxDialogContent>`, `kxAlertDialogContent`,
 * `kxSheetContent`, `kxDrawerContent`), opened with `showModal()` — so it renders in the browser's top layer
 * above every stacking and clipping context, and everything outside it becomes inert. See overlay.ts.
 *
 * The parts are shared, as SwiftUI's port shares them: `kxDialogTrigger`, `kxDialogClose`, `kxDialogTitle`,
 * `kxDialogDescription`, `kx-dialog-header`, `kx-dialog-footer` work inside any member of the family.
 *
 *   name          the title (`kxDialogTitle`, a real heading the caller chooses the level of) labels the
 *                 surface through `aria-labelledby`; with no title, `label` names it. The description, when
 *                 there is one, is its `aria-describedby`
 *   focus in      an element marked `autofocus`; else the surface's own choice (an alert dialog's Cancel, a
 *                 drawer's panel); else the first Tab stop in the content; else the surface itself
 *   focus held    the page behind is inert (the browser's); Tab from the last stop goes to the first and
 *                 Shift+Tab from the first to the last (ours — the browser would leave for its own chrome)
 *   focus back    on close, to the element that had focus when it opened — only if that element is still a
 *                 valid focus target (connected, enabled, rendered, not inert). Else `returnFocus` if the
 *                 caller gave one; else the trigger; else the surface this one is nested in; else nowhere.
 *                 Focus is never sent to a removed or hidden element
 *   dismissal     Escape closes the topmost layer only; a press on the backdrop closes the surface (not an
 *                 alert dialog); `kxDialogClose` and the built-in close button close it; so does setting
 *                 `open` to false. Each path ends in the same place: closed, scroll released if no other
 *                 modal is open, focus returned
 *   scroll        the page does not scroll while any modal surface is open
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * Opening fades and settles the surface (opacity, scale) over `--duration-fast` with `--easing-enter`; a sheet
 * or drawer slides in from its edge over `--duration-slow`. Closing runs `--duration-instant` (`--duration-base`
 * for a sheet or drawer) with `--easing-exit`. The exit is visual only: `close()` has already taken the
 * surface out of the accessibility tree and released the page, and focus has already gone back, so what is
 * fading is a picture of a closed dialog — it does not take pointer events. Under reduced motion every
 * transition is `none` and the surface simply appears and disappears, in the same end states.
 *
 * Content stays mounted while closed: a closed `<dialog>` is not rendered, not focusable and not in the
 * accessibility tree. Wrap expensive content in `@if (open)` yourself when it should not exist while closed.
 */

export const KX_DIALOG = new InjectionToken<KxDialogRoot>('KxDialogRoot');

/** The state every member of the family shares. */
@Directive()
export abstract class KxDialogRoot {
  /** Two-way: whether the surface is open. */
  readonly open = model(false);
  /**
   * Where focus goes on close when the element that opened it is gone — say, a row the dialog just deleted.
   * Used only when the element focused before opening is no longer a valid focus target.
   */
  readonly returnFocus = input<HTMLElement | null>(null);

  private readonly id = disclosureId('dialog');
  /** Generated, unless the part carries an `id` of its own — then that one is used, and the references follow. */
  contentId = `${this.id}-content`;
  titleId = `${this.id}-title`;
  descriptionId = `${this.id}-description`;
  /** The trigger, when there is one: a fallback focus target on close. */
  trigger: HTMLElement | null = null;

  show(): void {
    this.open.set(true);
  }
  close(): void {
    this.open.set(false);
  }
}

const ROOT = { class: 'kx-overlay-root' };

/**
 *   <kx-dialog [(open)]="editing">
 *     <button kxButton kxDialogTrigger>Edit profile</button>
 *     <dialog kxDialogContent>
 *       <kx-dialog-header>
 *         <h2 kxDialogTitle>Edit profile</h2>
 *         <p kxDialogDescription>Changes are saved when you press Save.</p>
 *       </kx-dialog-header>
 *       …
 *       <kx-dialog-footer>
 *         <button kxButton variant="Outline" kxDialogClose>Cancel</button>
 *         <button kxButton (click)="save()">Save</button>
 *       </kx-dialog-footer>
 *     </dialog>
 *   </kx-dialog>
 */
@Component({
  selector: 'kx-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: ROOT,
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxDialog) }],
})
export class KxDialog extends KxDialogRoot {}

/** An alert dialog: a decision that must be answered. See `kxAlertDialogContent`. */
@Component({
  selector: 'kx-alert-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: ROOT,
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxAlertDialog) }],
})
export class KxAlertDialog extends KxDialogRoot {}

/** A sheet: a modal panel from one edge of the viewport. See `kxSheetContent`. */
@Component({
  selector: 'kx-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: ROOT,
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxSheet) }],
})
export class KxSheet extends KxDialogRoot {}

/** A drawer: a modal panel from the bottom edge, with a grab handle. See `kxDrawerContent`. */
@Component({
  selector: 'kx-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: ROOT,
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxDrawer) }],
})
export class KxDrawer extends KxDialogRoot {}

/* ── parts ──────────────────────────────────────────────────────────────── */

/** Opens the surface. On the caller's own button, so it can be any button the design calls for. */
@Directive({
  selector: 'button[kxDialogTrigger]',
  host: {
    type: 'button',
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'root.open()',
    '[attr.aria-controls]': 'root.contentId',
    '(click)': 'root.show()',
  },
})
export class KxDialogTrigger {
  readonly root = inject(KX_DIALOG);
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.root.trigger = el;
    inject(DestroyRef).onDestroy(() => {
      if (this.root.trigger === el) this.root.trigger = null;
    });
  }
}

/** Closes the surface — Cancel, Done, a footer's dismiss. */
@Directive({
  selector: 'button[kxDialogClose]',
  host: { type: 'button', '(click)': 'root.close()' },
})
export class KxDialogClose {
  readonly root = inject(KX_DIALOG);
}

/**
 * The surface's name. Put it on a real heading at the level the page needs (`<h2 kxDialogTitle>` in most
 * applications: the dialog sits above the page's own `<h1>`).
 */
@Directive({
  selector: '[kxDialogTitle]',
  host: { class: 'kx-dialog__title', '[id]': 'root.titleId' },
})
export class KxDialogTitle {
  readonly root = inject(KX_DIALOG);
  constructor() {
    const own = inject(new HostAttributeToken('id'), { optional: true });
    if (own) this.root.titleId = own;
  }
}

@Directive({
  selector: '[kxDialogDescription]',
  host: { class: 'kx-dialog__description', '[id]': 'root.descriptionId' },
})
export class KxDialogDescription {
  readonly root = inject(KX_DIALOG);
  constructor() {
    const own = inject(new HostAttributeToken('id'), { optional: true });
    if (own) this.root.descriptionId = own;
  }
}

@Component({
  selector: 'kx-dialog-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-dialog__header' },
})
export class KxDialogHeader {}

/**
 * The actions row. In DOM order (Cancel before the confirming action, as the reader meets them), laid out
 * toward the inline end; in a narrow surface it stacks in that same order, so what is seen and what Tab
 * reaches never disagree.
 */
@Component({
  selector: 'kx-dialog-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-dialog__footer' },
})
export class KxDialogFooter {}

/* ── the modal surface ──────────────────────────────────────────────────── */

/** What every modal surface in the family does; the members differ only in role, layout and two policies. */
@Directive({
  host: {
    tabindex: '-1',
    '[id]': 'root.contentId',
    '[attr.aria-labelledby]': 'hasTitle() ? root.titleId : null',
    '[attr.aria-describedby]': 'hasDescription() ? root.descriptionId : null',
    '[attr.aria-label]': 'hasTitle() ? null : label()',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
    '(cancel)': 'onCancel($event)',
    '(close)': 'onNativeClose()',
    '(keydown)': 'onKeydown($event)',
  },
})
export abstract class KxModalSurface implements KxLayer {
  readonly root = inject(KX_DIALOG);
  protected readonly el = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private readonly stack = inject(KxOverlayStack);
  private readonly doc = inject(DOCUMENT);

  /** The accessible name when there is no `kxDialogTitle` inside. */
  readonly label = input<string | null>(null);

  readonly modal = true;
  readonly closesOnFocusOutside = false;
  /** Whether a press on the backdrop closes it. An alert dialog's answer is no. */
  protected readonly closesOnOutside: boolean = true;

  private readonly titles = contentChildren(KxDialogTitle, { descendants: true });
  private readonly descriptions = contentChildren(KxDialogDescription, { descendants: true });
  protected readonly hasTitle = computed(() => this.titles().some((t) => t.root === this.root));
  protected readonly hasDescription = computed(() => this.descriptions().some((d) => d.root === this.root));

  private shown = false;
  private returnTo: HTMLElement | null = null;
  private parent: KxLayer | null = null;

  constructor() {
    const own = inject(new HostAttributeToken('id'), { optional: true });
    if (own) this.root.contentId = own;
    afterRenderEffect({
      write: () => {
        const open = this.root.open();
        untracked(() => this.sync(open));
      },
    });
    inject(DestroyRef).onDestroy(() => {
      if (!this.shown) return;
      this.shown = false;
      this.stack.remove(this);
      this.restoreFocus();
    });
  }

  surface(): HTMLElement {
    return this.el;
  }
  companions(): readonly (Element | null)[] {
    return [];
  }
  request(reason: KxDismissReason): void {
    if (reason === 'outside' && !this.closesOnOutside) return;
    this.root.close();
  }

  /** The member's own first focus, when nothing in the content is marked `autofocus`. */
  protected initialFocus(): HTMLElement | null {
    return null;
  }

  private sync(open: boolean): void {
    const dialog = this.el;
    if (open && !this.shown) {
      this.shown = true;
      this.returnTo = activeElement(this.doc);
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else dialog.setAttribute('open', '');
      this.stack.add(this);
      this.parent = this.stack.parentOf(this);
      this.focusInitial();
    } else if (!open && this.shown) {
      this.shown = false;
      this.stack.remove(this);
      if (typeof dialog.close === 'function') {
        if (dialog.open) dialog.close();
      } else dialog.removeAttribute('open');
      this.restoreFocus();
    }
  }

  private own(el: Element): boolean {
    return el.closest('dialog') === this.el;
  }

  private focusInitial(): void {
    const marked = Array.from(this.el.querySelectorAll<HTMLElement>('[autofocus], [data-kx-autofocus]')).find((el) => this.own(el) && isFocusTarget(el));
    const first = tabbables(this.el).find((el) => this.own(el) && !el.classList.contains('kx-dialog__close'));
    const target = marked ?? this.initialFocus() ?? first ?? null;
    (target && isFocusTarget(target) ? target : this.el).focus();
  }

  private restoreFocus(): void {
    for (const candidate of [this.returnTo, this.root.returnFocus(), this.root.trigger, this.parent?.surface()]) {
      if (isFocusTarget(candidate)) {
        candidate.focus();
        break;
      }
    }
    this.returnTo = null;
    this.parent = null;
  }

  /**
   * A close request the stack did not see first (a platform back gesture): route it through the same policy
   * as Escape. Escape itself never arrives here — the stack consumes the key.
   */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.request('escape');
  }

  /** The browser closed the dialog by itself (a cancel it would not let us prevent): follow it. */
  protected onNativeClose(): void {
    if (this.shown) this.root.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && event.target instanceof Element && this.own(event.target)) wrapTab(event, this.el);
  }
}

/**
 *   <dialog kxDialogContent [closeButton]="true" closeLabel="Close">…</dialog>
 *
 * A dialog: centred, `--radius-surface`, modal elevation. The built-in close button (an X, named by
 * `closeLabel`) comes LAST in the DOM and sits at the inline-end of the top edge, so Tab meets the content
 * first and the close control last — and the first focus lands in the content, not on the X.
 */
@Component({
  selector: 'dialog[kxDialogContent]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (closeButton()) {
      <button type="button" class="kx-dialog__close" [attr.aria-label]="closeLabel()" (click)="root.close()"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg></button>
    }
  `,
  host: { class: 'kx-dialog' },
})
export class KxDialogContent extends KxModalSurface {
  /** Whether to show the built-in close button. */
  readonly closeButton = input(true, { transform: booleanAttribute });
  readonly closeLabel = input('Close');
}

/**
 * Cancel and the confirming action of an alert dialog. Put them on your own buttons — usually
 * `<button kxButton variant="Outline" kxAlertDialogCancel>` and
 * `<button kxButton variant="Destructive" kxAlertDialogAction>` — in that order. Both close the dialog after
 * your own click handler has run.
 */
@Directive({
  selector: 'button[kxAlertDialogCancel]',
  host: { type: 'button', '(click)': 'root.close()' },
})
export class KxAlertDialogCancel {
  readonly root = inject(KX_DIALOG);
  readonly el = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
}

@Directive({
  selector: 'button[kxAlertDialogAction]',
  host: { type: 'button', '(click)': 'root.close()' },
})
export class KxAlertDialogAction {
  readonly root = inject(KX_DIALOG);
}

/**
 *   <kx-alert-dialog [(open)]="confirming">
 *     <button kxButton variant="Destructive" kxDialogTrigger>Delete project</button>
 *     <dialog kxAlertDialogContent>
 *       <kx-dialog-header>
 *         <h2 kxDialogTitle>Delete "Atlas"?</h2>
 *         <p kxDialogDescription>Its 214 files are removed for everyone. This cannot be undone.</p>
 *       </kx-dialog-header>
 *       <kx-dialog-footer>
 *         <button kxButton variant="Outline" kxAlertDialogCancel>Cancel</button>
 *         <button kxButton variant="Destructive" kxAlertDialogAction (click)="delete()">Delete project</button>
 *       </kx-dialog-footer>
 *     </dialog>
 *   </kx-alert-dialog>
 *
 * A behaviour, not a style: `role="alertdialog"`, so assistive technology announces it as an interruption that
 * needs an answer. Its defaults make an accidental confirmation harder, not easier:
 *
 *   - first focus is Cancel, never the destructive action — Enter on arrival declines
 *   - a press on the backdrop does nothing: a decision is not answered by clicking away
 *   - Escape is Cancel (the WAI-ARIA alert dialog pattern allows it, and it is the safe answer)
 *   - no X: the two buttons are the only ways to answer, and they say what they do
 */
@Component({
  selector: 'dialog[kxAlertDialogContent]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-dialog kx-dialog--alert', role: 'alertdialog' },
})
export class KxAlertDialogContent extends KxModalSurface {
  protected override readonly closesOnOutside = false;
  private readonly cancel = contentChild(KxAlertDialogCancel, { descendants: true });
  protected override initialFocus(): HTMLElement | null {
    return this.cancel()?.el ?? null;
  }
}

export type KxSheetSide = 'top' | 'bottom' | 'start' | 'end';

/**
 *   <kx-sheet [(open)]="filtersOpen">
 *     <button kxButton variant="Outline" kxDialogTrigger>Filters</button>
 *     <dialog kxSheetContent side="end">…</dialog>
 *   </kx-sheet>
 *
 * A modal panel against one edge of the viewport, full length along it. `start` and `end` are LOGICAL: an
 * `end` sheet is on the right in a left-to-right page and on the left in a right-to-left one, resolved by the
 * direction the sheet's own element computes to — so a sheet inside an RTL region of an LTR page opens from
 * that region's end. (React's Sheet names physical edges, `left` / `right`; this is a deliberate difference.)
 *
 * The panel is as wide as `--kx-sheet-size` (24rem) but never wider than the viewport less 3rem, so the page
 * behind stays visible — a reader can see where they are and that a press there closes the panel. It scrolls
 * inside itself, and keeps clear of a device's safe areas.
 */
@Component({
  selector: 'dialog[kxSheetContent]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (closeButton()) {
      <button type="button" class="kx-dialog__close" [attr.aria-label]="closeLabel()" (click)="root.close()"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg></button>
    }
  `,
  host: { class: 'kx-dialog kx-sheet', '[attr.data-side]': 'side()' },
})
export class KxSheetContent extends KxModalSurface {
  readonly side = input<KxSheetSide>('end');
  readonly closeButton = input(true, { transform: booleanAttribute });
  readonly closeLabel = input('Close');
}

/**
 *   <kx-drawer [(open)]="sharing">
 *     <button kxButton kxDialogTrigger>Share</button>
 *     <dialog kxDrawerContent>
 *       <kx-dialog-header><h2 kxDialogTitle>Share</h2></kx-dialog-header>
 *       …
 *       <kx-dialog-footer><button kxButton variant="Outline" kxDialogClose>Done</button></kx-dialog-footer>
 *     </dialog>
 *   </kx-drawer>
 *
 * KinetixUI's drawer is a bottom sheet with a grab handle and rounded top corners (React's is vaul's; the
 * SwiftUI and Compose ports make it their bottom sheet). First focus goes to the PANEL, not to a field inside
 * it, for the reason React's drawer gives: on a phone, focusing a text field on open raises the keyboard over
 * the drawer the reader has not yet seen. From the panel, the screen reader announces the drawer's title and
 * Tab walks its content in order. The handle is decorative: there is no drag-to-dismiss in this package (it
 * is not claimed); Escape, the backdrop and your own close control dismiss it.
 */
@Component({
  selector: 'dialog[kxDrawerContent]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="kx-drawer__handle" aria-hidden="true"></div><ng-content />',
  host: { class: 'kx-dialog kx-sheet kx-drawer', 'data-side': 'bottom' },
})
export class KxDrawerContent extends KxModalSurface {
  protected override initialFocus(): HTMLElement {
    return this.el;
  }
}

/* ── modal ──────────────────────────────────────────────────────────────── */

/**
 * Info — one action ("Got it"). Confirmation, Warning — Cancel + a primary action. Destructive — Cancel + a
 * destructive action. The same four names React's Modal takes.
 */
export type KxModalType = 'Info' | 'Confirmation' | 'Warning' | 'Destructive';

const DEFAULT_ACTION: Record<KxModalType, string> = {
  Info: 'Got it',
  Confirmation: 'Confirm',
  Warning: 'Proceed',
  Destructive: 'Delete',
};

/**
 *   <kx-modal type="Destructive" title="Delete this view?" description="Saved filters in it are lost."
 *             [(open)]="confirming" (action)="deleteView()">
 *     <button kxButton variant="Outline" kxDialogTrigger>Delete view</button>
 *   </kx-modal>
 *
 * Not a second primitive: React's Modal is a dialog with a fixed structure — a header with the title and a
 * close button, a divider, the description and any projected content, a divider, and an end-aligned footer
 * whose buttons follow `type`. This is the same composition on the same `kxDialogContent` surface, so it has
 * every behaviour of the dialog above and adds none of its own beyond its defaults:
 *
 *   - first focus is Cancel when there is one (never the action), the action when it is alone (Info)
 *   - `action` fires when the action is chosen; `cancel` when Cancel is. Escape, the backdrop and the close
 *     button close it without either — `openChange` reports every close
 *
 * A decision that must be answered — nothing else on the screen may proceed until it is — is an alert dialog,
 * not a Destructive modal: the modal can still be dismissed by a backdrop press (as React's can).
 *
 * The trigger is projected (`kxDialogTrigger`); anything else projected goes in the body under the description.
 */
@Component({
  selector: 'kx-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxDialogContent, KxDialogTitle, KxDialogDescription],
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxModal) }],
  template: `
    <ng-content select="[kxDialogTrigger]" />
    <dialog kxDialogContent class="kx-modal" [closeButton]="false">
      <header class="kx-modal__header">
        <h2 kxDialogTitle class="kx-modal__title">{{ title() }}</h2>
        <button type="button" class="kx-dialog__close kx-modal__close" [attr.aria-label]="closeLabel()" (click)="close()"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg></button>
      </header>
      <div class="kx-modal__body">
        @if (description()) {
          <p kxDialogDescription>{{ description() }}</p>
        }
        <ng-content />
      </div>
      <footer class="kx-modal__footer">
        @if (type() !== 'Info') {
          <button kxButton variant="Outline" size="lg" type="button" data-kx-autofocus (click)="choose('cancel')">{{ cancelLabel() }}</button>
        }
        <button
          kxButton
          [variant]="type() === 'Destructive' ? 'Destructive' : 'Primary'"
          size="lg"
          type="button"
          [attr.data-kx-autofocus]="type() === 'Info' ? '' : null"
          (click)="choose('action')"
        >
          {{ actionLabel() ?? defaultAction() }}
        </button>
      </footer>
    </dialog>
  `,
  host: {
    ...ROOT,
    // `title` is this component's input, not the element's tooltip: drop the attribute a static
    // `title="…"` would otherwise leave on the host, where it would show as a native tooltip.
    '[attr.title]': 'null',
  },
})
export class KxModal extends KxDialogRoot {
  readonly type = input<KxModalType>('Info');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  /** Overrides the type's default action label. */
  readonly actionLabel = input<string | null>(null);
  readonly cancelLabel = input('Cancel');
  readonly closeLabel = input('Close');
  readonly action = output<void>();
  readonly cancel = output<void>();
  protected readonly defaultAction = computed(() => DEFAULT_ACTION[this.type()]);

  protected choose(what: 'action' | 'cancel'): void {
    if (what === 'action') this.action.emit();
    else this.cancel.emit();
    this.close();
  }
}
