import { DestroyRef, InjectionToken, inject, signal } from '@angular/core';

/**
 * The toast queue: the one application-level store behind `KxToasterService` and every `<kx-toaster>`. Nothing in
 * this file is exported from `public-api.ts` — the service is the API (React's is the `toast()` function, also
 * application-level), the toaster renders, and this is the state and the clock they share.
 *
 * ── What it owns ───────────────────────────────────────────────────────────
 *
 *   the list      newest first, as `sonner` keeps it. An `id` that is already queued UPDATES that toast in place
 *                 (same position, same DOM node, so a live region does not announce it as a new arrival); any
 *                 other call adds one. Ids are the caller's, or 1, 2, 3 … from this queue — deterministic, never
 *                 random, so two runs of the same code produce the same ids.
 *   the clock     one timer per toast, never per rendering of it. A toast's REMAINING time is kept: pausing
 *                 subtracts what has elapsed since the timer last started, and resuming starts a timer for what
 *                 is left — never the whole duration again. A paused toast holds no timer at all, so hovering on
 *                 and off a hundred times leaves one timer, not a hundred.
 *   holds         why a channel's clocks are stopped. A toaster holds its channel while the pointer is on it,
 *                 while focus is inside it and while the document is hidden; a channel with no toaster attached
 *                 is held too, because a toast nobody can see must not expire unseen (sonner's behaviour: without
 *                 a Toaster there is no timer). Holds are a set of reasons, not a counter, so a hold released
 *                 twice cannot go negative and unpause something another reason still holds.
 *   dismissal     idempotent: dismissing an id that is not queued (already dismissed, already expired) does
 *                 nothing, and `onDismiss` / `onAutoClose` run at most once per toast. Removing a toast clears
 *                 its timer in the same step, so no timer outlives the toast it belongs to.
 *
 * Channels: a toast with a `toasterId` belongs to the `<kx-toaster>` with that `id`; one without belongs to every
 * toaster without an `id` (sonner's rule). Holds and the default duration are per channel, so hovering one
 * toaster never pauses another's toasts.
 *
 * What this is not: a notification inbox. A toast is transient — it expires, and nothing remembers it. Persistent
 * notifications with read state are `KxNotificationCenter`'s, whose state is the caller's; the two share no
 * store, by design (see notification-center.ts).
 */

export type KxToastType = 'default' | 'success' | 'info' | 'warning' | 'error';

/** A button on a toast. Pressing it runs `onClick`, then dismisses the toast unless `onClick` prevented the event's default. */
export interface KxToastButton {
  label: string;
  onClick: (event: MouseEvent) => void;
}

export interface KxToastOptions {
  /** Your own id. A toast with an id already queued is updated in place, not added again. */
  id?: string | number;
  description?: string;
  /** ms before it closes by itself; `Infinity` to keep it until dismissed. Default: the toaster's `duration`. */
  duration?: number;
  /** Whether the reader can dismiss it (its close button, and its action buttons closing it). Default true. */
  dismissible?: boolean;
  /** Show a close button on this toast; overrides the toaster's `closeButton`. */
  closeButton?: boolean;
  /** The primary action — "Undo", "View". */
  action?: KxToastButton;
  /** A secondary, dismissing action — "Cancel". */
  cancel?: KxToastButton;
  /** The `<kx-toaster [id]>` this toast belongs to. Without one it goes to the toasters without an id. */
  toasterId?: string;
  /** Runs when the reader dismisses it (close button, an action, or `dismiss()`), at most once. */
  onDismiss?: (toast: KxToast) => void;
  /** Runs when it closes because its time ran out, at most once. */
  onAutoClose?: (toast: KxToast) => void;
}

/** A queued toast, as the toaster renders it. Immutable: an update replaces the object, keeping its id. */
export interface KxToast extends Omit<KxToastOptions, 'id'> {
  readonly id: string | number;
  readonly type: KxToastType;
  readonly title: string;
}

/** The duration a toast takes when neither it nor its toaster names one — sonner's `TOAST_LIFETIME`. */
export const DEFAULT_TOAST_DURATION = 4000;

interface Clock {
  /** What is left, in ms. */
  remaining: number;
  /** The duration `remaining` was last reset from; an update that changes it restarts the clock. */
  duration: number;
  /** When the running timer started; meaningful only while `handle` is set. */
  startedAt: number;
  handle: ReturnType<typeof setTimeout> | null;
}

const channelOf = (toast: Pick<KxToast, 'toasterId'>): string => toast.toasterId ?? '';

export class KxToastQueue {
  private readonly list = signal<readonly KxToast[]>([]);
  /** Newest first. */
  readonly toasts = this.list.asReadonly();
  private readonly clocks = new Map<string | number, Clock>();
  private readonly holds = new Map<string, Set<unknown>>();
  /** Per-channel default durations, set by the toasters attached to each channel. */
  private readonly durations = new Map<string, number>();
  /** How many toasters are attached to each channel. A channel with none is held (see the header). */
  private readonly attached = new Map<string, number>();
  private counter = 0;

  /** Add a toast, or update the queued toast with the same id. Returns its id. */
  add(type: KxToastType, title: string, options: KxToastOptions = {}): string | number {
    const { id: own, ...rest } = options;
    const id = own ?? ++this.counter;
    const existing = this.list().find((t) => t.id === id);
    if (existing) {
      const next: KxToast = { ...existing, ...rest, type, title, id };
      this.list.update((all) => all.map((t) => (t.id === id ? next : t)));
      const clock = this.clocks.get(id);
      // A changed channel or duration restarts the clock from the new duration; otherwise it keeps running
      // exactly as it was — an update is not a reason to give the reader the whole duration again, nor to
      // leave the old timer behind.
      const duration = this.durationOf(next);
      if (clock && (clock.duration !== duration || channelOf(existing) !== channelOf(next))) {
        this.stop(clock);
        clock.duration = duration;
        clock.remaining = duration;
      }
      this.sync(id);
      return id;
    }
    const toast: KxToast = { ...rest, type, title, id };
    this.list.update((all) => [toast, ...all]);
    const duration = this.durationOf(toast);
    this.clocks.set(id, { remaining: duration, duration, startedAt: 0, handle: null });
    this.sync(id);
    return id;
  }

  /** Dismiss one toast by id, or every toast. Safe to repeat: an id that is not queued is ignored. */
  dismiss(id?: string | number): void {
    const targets = id === undefined ? this.list() : this.list().filter((t) => t.id === id);
    for (const toast of targets) {
      if (this.remove(toast.id)) toast.onDismiss?.(toast);
    }
  }

  /** Stop a channel's clocks for `reason` (any value; the same value releases it). */
  hold(channel: string, reason: unknown): void {
    let set = this.holds.get(channel);
    if (!set) this.holds.set(channel, (set = new Set()));
    if (set.has(reason)) return;
    set.add(reason);
    this.syncChannel(channel);
  }

  release(channel: string, reason: unknown): void {
    const set = this.holds.get(channel);
    if (!set?.delete(reason)) return;
    if (!set.size) this.holds.delete(channel);
    this.syncChannel(channel);
  }

  /** A toaster is showing `channel`, with its default duration. Returns the function that detaches it. */
  attach(channel: string, duration: number): () => void {
    this.attached.set(channel, (this.attached.get(channel) ?? 0) + 1);
    this.durations.set(channel, duration);
    // a toast queued before any toaster existed started with the fallback duration; it takes this one now
    for (const toast of this.list()) {
      const clock = this.clocks.get(toast.id);
      if (clock && channelOf(toast) === channel && toast.duration === undefined && !clock.handle && clock.remaining === clock.duration) {
        clock.duration = clock.remaining = duration;
      }
    }
    this.syncChannel(channel);
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      const n = (this.attached.get(channel) ?? 1) - 1;
      if (n > 0) this.attached.set(channel, n);
      else this.attached.delete(channel);
      this.syncChannel(channel);
    };
  }

  /** Whether `id`'s clock is running now. For the toaster's `data-paused`, and for tests. */
  isRunning(id: string | number): boolean {
    return !!this.clocks.get(id)?.handle;
  }

  /** The number of live timers. A toast that is paused, or gone, contributes none. */
  get timers(): number {
    let n = 0;
    for (const clock of this.clocks.values()) if (clock.handle) n++;
    return n;
  }

  /** Clear every timer and every toast — the application is going away. */
  destroy(): void {
    for (const clock of this.clocks.values()) this.stop(clock);
    this.clocks.clear();
    this.list.set([]);
  }

  private durationOf(toast: KxToast): number {
    return toast.duration ?? this.durations.get(channelOf(toast)) ?? DEFAULT_TOAST_DURATION;
  }

  private held(channel: string): boolean {
    return !this.attached.get(channel) || !!this.holds.get(channel)?.size;
  }

  private syncChannel(channel: string): void {
    for (const toast of this.list()) if (channelOf(toast) === channel) this.sync(toast.id);
  }

  private sync(id: string | number): void {
    const toast = this.list().find((t) => t.id === id);
    const clock = this.clocks.get(id);
    if (!toast || !clock) return;
    const run = !this.held(channelOf(toast)) && Number.isFinite(clock.remaining);
    if (run && !clock.handle) {
      clock.startedAt = Date.now();
      clock.handle = setTimeout(() => this.expire(id), Math.max(0, clock.remaining));
    } else if (!run && clock.handle) {
      this.stop(clock);
    }
  }

  /** Pause: clear the timer and keep only what was left of it. */
  private stop(clock: Clock): void {
    if (!clock.handle) return;
    clearTimeout(clock.handle);
    clock.handle = null;
    clock.remaining = Math.max(0, clock.remaining - (Date.now() - clock.startedAt));
  }

  private expire(id: string | number): void {
    const clock = this.clocks.get(id);
    if (clock) clock.handle = null;
    const toast = this.list().find((t) => t.id === id);
    if (toast && this.remove(id)) toast.onAutoClose?.(toast);
  }

  /** Take a toast out, with its timer. False when it was not queued. */
  private remove(id: string | number): boolean {
    if (!this.list().some((t) => t.id === id)) return false;
    const clock = this.clocks.get(id);
    if (clock) {
      if (clock.handle) clearTimeout(clock.handle);
      this.clocks.delete(id);
    }
    this.list.update((all) => all.filter((t) => t.id !== id));
    return true;
  }
}

/** The one queue an application has. Internal: the service and the toasters inject it; nothing else does. */
export const KX_TOAST_QUEUE = new InjectionToken<KxToastQueue>('KxToastQueue', {
  providedIn: 'root',
  factory: () => {
    const queue = new KxToastQueue();
    inject(DestroyRef).onDestroy(() => queue.destroy());
    return queue;
  },
});
