import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injectable,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { activeElement, isFocusTarget, tabbables } from './overlay';
import { DEFAULT_TOAST_DURATION, KX_TOAST_QUEUE, type KxToast, type KxToastOptions, type KxToastType } from './toast-queue';

/**
 * Sonner: transient toasts. React's `Toaster` wraps the `sonner` library and its `toast()` function; this is the
 * same contract with no dependency — `KxToasterService` is `toast()`, `<kx-toaster>` is `<Toaster />`, and the
 * state and the clock are one internal queue (toast-queue.ts).
 *
 *   <kx-toaster />                                   once, near the end of the application's root template
 *
 *   private readonly toast = inject(KxToasterService);
 *   this.toast.success('Changes saved', { description: 'Synced to 3 devices', action: { label: 'Undo', onClick: … } });
 *
 * ── Behaviour, and where it follows sonner ─────────────────────────────────
 *
 *   region      a `<section>` named "Notifications alt+T", `aria-live="polite"`, `aria-relevant="additions
 *               text"`, rendered while empty so a toast added later is announced (a live region must exist
 *               before its content). Every type is polite — sonner's choice, and the right one: a toast never
 *               interrupts. A failure that needs an answer is an alert dialog, not a toast.
 *   types       default, success, info, warning, error. The type is drawn as an icon in its intent colour AND
 *               said in words (a visually hidden "Error:"), so it is never colour or shape alone.
 *   time        4000ms by default (the toaster's `duration`, a toast's own `duration`, or `Infinity`). The clock
 *               stops while the pointer is over the toaster, while focus is inside it, and while the page is
 *               hidden, and resumes with what was left — sonner pauses on hover only; pausing for keyboard focus
 *               as well is deliberate (WCAG 2.2.1: someone reading or reaching a toast's action with the keyboard
 *               gets the same time as someone pointing at it).
 *   limit       the newest `visibleToasts` (3) are shown. An older toast pushed past the limit is not rendered
 *               and keeps its clock, so it lapses rather than coming back stale — it was announced when it
 *               arrived, as the newest.
 *   focus       a toast never takes focus. Alt+T moves focus to the toasts (the hotkey sonner binds; React does not
 *               change it), Escape there returns it to where it was. Dismissing the toast that holds focus moves
 *               focus to the next toast, else the previous, else back to where it came from — never to `<body>`.
 *   dismissal   a close button (`closeButton`, sonner's default off), an action (closes after its handler unless
 *               the handler prevented the event's default), `KxToasterService.dismiss(id)`, or the clock.
 *
 * Deliberate differences from React: toasts are always stacked open (sonner's `expand`) rather than collapsed
 * into a deck — a collapsed deck hides the text of the toasts behind the front one at opacity 0 while it stays
 * in the accessibility tree; and `position` is logical (`bottom-end` is bottom-right in a left-to-right page and
 * bottom-left in a right-to-left one), where sonner names physical corners. There is no swipe-to-dismiss, no
 * `loading` or `promise` toast and no custom JSX toast; nothing claims them.
 *
 * While a modal dialog is open the page outside it is inert, the toaster included (the browser's rule for
 * `showModal()`): a toast raised then cannot be seen, reached or heard, so the toaster holds its clocks for as
 * long as a modal dialog that does not contain it is open, and the toast has its whole time after it closes.
 */

/** The application's `toast()`. Every method returns the toast's id; pass it back as `id` to update the toast. */
@Injectable({ providedIn: 'root' })
export class KxToasterService {
  private readonly queue = inject(KX_TOAST_QUEUE);

  show(title: string, options?: KxToastOptions): string | number {
    return this.queue.add('default', title, options);
  }
  success(title: string, options?: KxToastOptions): string | number {
    return this.queue.add('success', title, options);
  }
  info(title: string, options?: KxToastOptions): string | number {
    return this.queue.add('info', title, options);
  }
  warning(title: string, options?: KxToastOptions): string | number {
    return this.queue.add('warning', title, options);
  }
  error(title: string, options?: KxToastOptions): string | number {
    return this.queue.add('error', title, options);
  }
  /** Dismiss one toast, or every toast. Repeating it, or naming a toast already gone, does nothing. */
  dismiss(id?: string | number): void {
    this.queue.dismiss(id);
  }
}

/** Where the toasts sit. `start` and `end` are logical: they follow the toaster's own direction. */
export type KxToasterPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

const TYPE_LABELS: Record<Exclude<KxToastType, 'default'>, string> = { success: 'Success', info: 'Info', warning: 'Warning', error: 'Error' };

/**
 * The region the toasts render in. One per application is usual; give a toaster an `id` and send a toast to it
 * with `toasterId` to keep a second stack (a panel's own) separate — each toaster pauses only its own toasts.
 */
@Component({
  selector: 'kx-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="kx-toaster"
      [attr.aria-label]="regionLabel()"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      [attr.data-position]="position()"
      [attr.data-paused]="paused() ? '' : null"
      (pointerenter)="hover(true)"
      (pointerleave)="hover(false)"
      (focusin)="focusIn($event)"
      (focusout)="focusOut($event)"
      (keydown)="onKeydown($event)"
    >
      <ol class="kx-toaster__list" tabindex="-1">
        @for (toast of shown(); track toast.id) {
          <li class="kx-toast" [attr.data-type]="toast.type" [attr.data-kx-toast]="toast.id">
            @if (toast.type !== 'default') {
              <span class="kx-toast__icon" aria-hidden="true">
                @switch (toast.type) {
                  @case ('success') {
                    <svg viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="8" fill="currentColor" /><path d="M6.5 10.2l2.3 2.3 4.7-5" fill="none" stroke="hsl(var(--popover))" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  }
                  @case ('info') {
                    <svg viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="8" fill="currentColor" /><path d="M10 9v5M10 6.2v.1" fill="none" stroke="hsl(var(--popover))" stroke-width="1.8" stroke-linecap="round" /></svg>
                  }
                  @case ('warning') {
                    <svg viewBox="0 0 20 20" focusable="false"><path d="M10 2.5l8 14.5H2z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /><path d="M10 8v4M10 14.4v.1" fill="none" stroke="hsl(var(--popover))" stroke-width="1.8" stroke-linecap="round" /></svg>
                  }
                  @case ('error') {
                    <svg viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="8" fill="currentColor" /><path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" fill="none" stroke="hsl(var(--popover))" stroke-width="1.8" stroke-linecap="round" /></svg>
                  }
                }
              </span>
            }
            <div class="kx-toast__content">
              <div class="kx-toast__title">
                @if (toast.type !== 'default') {
                  <span class="kx-sr-only">{{ typeLabel(toast.type) }}: </span>
                }{{ toast.title }}
              </div>
              @if (toast.description) {
                <div class="kx-toast__description">{{ toast.description }}</div>
              }
              <!-- under the text, not beside it: beside it, a narrow screen or large text squeezes the text to a word a line -->
              @if (toast.cancel || toast.action) {
                <div class="kx-toast__actions">
                  @if (toast.cancel; as cancel) {
                    <button type="button" class="kx-toast__button kx-toast__button--cancel" (click)="press(toast, cancel.onClick, $event)">{{ cancel.label }}</button>
                  }
                  @if (toast.action; as action) {
                    <button type="button" class="kx-toast__button kx-toast__button--action" (click)="press(toast, action.onClick, $event)">{{ action.label }}</button>
                  }
                </div>
              }
            </div>
            @if ((toast.closeButton ?? closeButton()) && toast.dismissible !== false) {
              <button type="button" class="kx-toast__close" [attr.aria-label]="closeLabel()" (click)="close(toast)">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
              </button>
            }
          </li>
        }
      </ol>
    </section>
  `,
  host: { class: 'kx-toaster-host' },
})
export class KxToaster {
  /** Which toasts this toaster shows: those sent with this `toasterId`. Without it, those sent with none. */
  readonly id = input<string | undefined>(undefined);
  readonly position = input<KxToasterPosition>('bottom-end');
  /** How many of the newest toasts are shown at once. */
  readonly visibleToasts = input(3, { transform: numberAttribute });
  /** ms a toast stays when it names no duration of its own. */
  readonly duration = input(DEFAULT_TOAST_DURATION, { transform: numberAttribute });
  /** Show a close button on every toast (a toast's own `closeButton` overrides it). */
  readonly closeButton = input(false, { transform: booleanAttribute });
  /** The region's name; " alt+T" (the hotkey) is added to it, as sonner does. */
  readonly label = input('Notifications');
  readonly closeLabel = input('Close toast');
  /** The words said before a toast's title for each type — the icon's meaning, in text. */
  readonly typeLabels = input<Partial<Record<Exclude<KxToastType, 'default'>, string>>>({});

  private readonly queue = inject(KX_TOAST_QUEUE);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly channel = computed(() => this.id() ?? '');
  /** This toaster's toasts, newest first, up to the visible limit. */
  protected readonly shown = computed(() =>
    this.queue
      .toasts()
      .filter((t) => (t.toasterId ?? '') === this.channel())
      .slice(0, Math.max(0, this.visibleToasts())),
  );
  protected readonly regionLabel = computed(() => `${this.label()} alt+T`);

  // the reasons this toaster holds its channel's clocks; each is its own token, so releasing one never releases another
  private readonly holds = { hover: {}, focus: {}, hidden: {}, modal: {} };
  private heldChannel: string | null = null;
  /** Where focus came from when it entered the toasts; where Escape and a last dismissal send it back. */
  private returnTo: HTMLElement | null = null;

  constructor() {
    // attach to the channel (and re-attach when `id` or `duration` changes), carrying the holds across
    let detach: (() => void) | null = null;
    effect((onCleanup) => {
      const channel = this.channel();
      const duration = this.duration();
      untracked(() => {
        detach = this.queue.attach(channel, duration);
        this.heldChannel = channel;
        for (const reason of this.active) this.queue.hold(channel, reason);
      });
      onCleanup(() => {
        for (const reason of this.active) this.queue.release(channel, reason);
        detach?.();
        detach = null;
      });
    });

    // A hold must not outlive what it was for. The toast that had focus can be removed under it (dismissed by
    // code) without a focusout reaching the region, and a pointer resting where the last toast was gets no
    // pointerleave until it moves; either would leave every later toast paused. Re-check after each render.
    afterRenderEffect({
      read: () => {
        const none = this.shown().length === 0;
        untracked(() => {
          if (none) this.set(this.holds.hover, false);
          if (this.active.has(this.holds.focus) && !this.host.contains(activeElement(this.doc))) this.set(this.holds.focus, false);
        });
      },
    });

    // Whatever removes a toast (the reader, `KxToasterService.dismiss()` from code, the clock), focus inside it
    // moves on first, while the toast is still rendered.
    const unwatch = this.queue.beforeRemove((toast) => this.keepFocus(toast));

    const visibility = () => this.set(this.holds.hidden, this.doc.visibilityState === 'hidden');
    // `showModal()` and `close()` add and remove a dialog's `open` attribute, so watching that attribute sees
    // every modal dialog open and close, whoever opened it. A modal can also leave still open — its component
    // destroyed by a route change, or the sidebar's sheet by a breakpoint crossing — with no `open` change; so
    // while the hold is on, any removal from the document re-checks it, or the toasts would wait forever.
    const modal = () => this.set(this.holds.modal, this.excludedByModal());
    const Observer = (this.doc.defaultView as (Window & typeof globalThis) | null)?.MutationObserver;
    const modals =
      typeof Observer === 'function'
        ? new Observer((records) => {
            if (this.active.has(this.holds.modal) || records.some((r) => r.type === 'attributes')) modal();
          })
        : null;
    const hotkey = (event: KeyboardEvent) => this.onHotkey(event);
    afterNextRender(() => {
      visibility();
      modal();
      this.doc.addEventListener('visibilitychange', visibility);
      modals?.observe(this.doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
      this.doc.addEventListener('keydown', hotkey);
    });
    inject(DestroyRef).onDestroy(() => {
      unwatch();
      modals?.disconnect();
      this.doc.removeEventListener('visibilitychange', visibility);
      this.doc.removeEventListener('keydown', hotkey);
    });
  }

  /** A modal dialog is open and this toaster is outside it: inert, under the top layer, unseen and unheard. */
  private excludedByModal(): boolean {
    for (const dialog of Array.from(this.doc.querySelectorAll('dialog[open]'))) {
      if (dialog.contains(this.host)) continue;
      try {
        if (dialog.matches(':modal')) return true;
      } catch {
        // a browser without `:modal` has no way to say; it holds nothing
      }
    }
    return false;
  }

  private readonly active = new Set<object>();
  /** Whether this toaster is holding its toasts' clocks (hover, focus or a hidden document): `data-paused`. */
  protected readonly paused = signal(false);
  private set(reason: object, on: boolean): void {
    if (on === this.active.has(reason)) return;
    if (on) this.active.add(reason);
    else this.active.delete(reason);
    this.paused.set(this.active.size > 0);
    if (this.heldChannel === null) return;
    if (on) this.queue.hold(this.heldChannel, reason);
    else this.queue.release(this.heldChannel, reason);
  }

  protected typeLabel(type: KxToastType): string {
    return type === 'default' ? '' : (this.typeLabels()[type] ?? TYPE_LABELS[type]);
  }

  protected hover(on: boolean): void {
    this.set(this.holds.hover, on);
  }

  protected focusIn(event: FocusEvent): void {
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !this.host.contains(from)) this.returnTo = from;
    this.set(this.holds.focus, true);
  }

  protected focusOut(event: FocusEvent): void {
    const to = event.relatedTarget;
    if (to instanceof Node && this.host.contains(to)) return;
    this.set(this.holds.focus, false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (isFocusTarget(this.returnTo)) {
      event.preventDefault();
      this.returnTo.focus();
    }
  }

  /** Alt+T: focus moves to the toasts, when there are any, remembering where it was. */
  private onHotkey(event: KeyboardEvent): void {
    if (event.defaultPrevented || !event.altKey || event.code !== 'KeyT' || !this.shown().length) return;
    const list = this.host.querySelector<HTMLElement>('.kx-toaster__list');
    if (!list) return;
    event.preventDefault();
    const from = activeElement(this.doc);
    if (from && !this.host.contains(from)) this.returnTo = from;
    list.focus();
  }

  protected press(toast: KxToast, onClick: (event: MouseEvent) => void, event: MouseEvent): void {
    onClick(event);
    if (!event.defaultPrevented && toast.dismissible !== false) this.close(toast);
  }

  protected close(toast: KxToast): void {
    this.queue.dismiss(toast.id);
  }

  /**
   * `leaving` is about to go: if focus is inside it, send focus to the first control of the next toast that
   * stays, else of the previous one, else back where it came from, else the list — so it never falls to
   * `<body>`. Toasts leaving in the same pass (a dismiss-all) are still rendered but are not candidates.
   */
  private keepFocus(leaving: KxToast): void {
    const items = Array.from(this.host.querySelectorAll<HTMLElement>('li.kx-toast'));
    const item = items.find((li) => li.dataset['kxToast'] === String(leaving.id));
    if (!item || !item.contains(activeElement(this.doc))) return;
    const staying = new Set(this.queue.toasts().filter((t) => t.id !== leaving.id).map((t) => String(t.id)));
    const stays = (el: HTMLElement) => staying.has(el.dataset['kxToast'] ?? '');
    const at = items.indexOf(item);
    const siblings = [items.slice(at + 1).find(stays), items.slice(0, at).reverse().find(stays)].filter((el): el is HTMLElement => !!el);
    const target =
      siblings.map((el) => tabbables(el)[0]).find((el) => !!el) ??
      (isFocusTarget(this.returnTo) ? this.returnTo : null) ??
      this.host.querySelector<HTMLElement>('.kx-toaster__list');
    target?.focus();
  }
}
