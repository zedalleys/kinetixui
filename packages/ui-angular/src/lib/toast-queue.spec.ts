import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TOAST_DURATION, KxToastQueue } from './toast-queue';

// The toast queue's clock, with fake timers: every rule of the header in toast-queue.ts, measured on the queue
// alone. The toaster's half (hover, focus, the document hidden, the DOM) is measured in Chromium by
// scripts/angular-overlays.mjs.

describe('KxToastQueue', () => {
  let q: KxToastQueue;
  beforeEach(() => {
    vi.useFakeTimers();
    q = new KxToastQueue();
  });
  afterEach(() => {
    q.destroy();
    vi.useRealTimers();
  });

  it('holds a toast nobody can see: no toaster attached, no timer', () => {
    q.add('default', 'Saved');
    expect(q.timers).toBe(0);
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 3);
    expect(q.toasts()).toHaveLength(1);
  });

  it('expires after the duration once a toaster shows its channel, and calls onAutoClose once', () => {
    const detach = q.attach('', 4000);
    const onAutoClose = vi.fn();
    const onDismiss = vi.fn();
    q.add('success', 'Saved', { onAutoClose, onDismiss });
    expect(q.timers).toBe(1);
    vi.advanceTimersByTime(3999);
    expect(q.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(q.toasts()).toHaveLength(0);
    expect(onAutoClose).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(q.timers).toBe(0);
    detach();
  });

  it('keeps newest first and gives deterministic ids', () => {
    q.attach('', 4000);
    expect(q.add('default', 'one')).toBe(1);
    expect(q.add('default', 'two')).toBe(2);
    expect(q.toasts().map((t) => t.title)).toEqual(['two', 'one']);
  });

  it('pauses with the elapsed time preserved and resumes with what is left — never the full duration again', () => {
    q.attach('', 4000);
    const id = q.add('default', 'Hello');
    vi.advanceTimersByTime(3000);
    q.hold('', 'hover');
    expect(q.isRunning(id)).toBe(false);
    expect(q.timers).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(q.toasts()).toHaveLength(1);
    q.release('', 'hover');
    expect(q.isRunning(id)).toBe(true);
    vi.advanceTimersByTime(999);
    expect(q.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(q.toasts()).toHaveLength(0);
  });

  it('never accumulates timers: a hundred hover passes leave one', () => {
    q.attach('', 4000);
    q.add('default', 'Hello');
    for (let i = 0; i < 100; i++) {
      q.hold('', 'hover');
      vi.advanceTimersByTime(10);
      q.release('', 'hover');
      vi.advanceTimersByTime(10);
    }
    expect(q.timers).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
    // 100 × 10ms ran; 3000ms are left, not 4000
    vi.advanceTimersByTime(2999);
    expect(q.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(q.toasts()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('holds are a set of reasons: one released twice does not unpause another', () => {
    q.attach('', 4000);
    const id = q.add('default', 'Hello');
    q.hold('', 'hover');
    q.hold('', 'focus');
    q.release('', 'hover');
    q.release('', 'hover');
    expect(q.isRunning(id)).toBe(false);
    q.release('', 'focus');
    expect(q.isRunning(id)).toBe(true);
  });

  it('keeps channels separate: holding one toaster does not pause another', () => {
    q.attach('', 4000);
    q.attach('side', 4000);
    const a = q.add('default', 'main');
    const b = q.add('default', 'side', { toasterId: 'side' });
    q.hold('side', 'hover');
    expect(q.isRunning(a)).toBe(true);
    expect(q.isRunning(b)).toBe(false);
    vi.advanceTimersByTime(4000);
    expect(q.toasts().map((t) => t.title)).toEqual(['side']);
  });

  it('dismisses idempotently, clearing the timer and calling onDismiss once', () => {
    q.attach('', 4000);
    const onDismiss = vi.fn();
    const id = q.add('default', 'Hello', { onDismiss });
    q.dismiss(id);
    q.dismiss(id);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(q.timers).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('dismisses every toast at once', () => {
    q.attach('', 4000);
    q.add('default', 'one');
    q.add('default', 'two');
    q.dismiss();
    expect(q.toasts()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('updates a toast with the same id in place, without restarting its clock or adding a timer', () => {
    q.attach('', 4000);
    q.add('default', 'Uploading', { id: 'upload' });
    q.add('default', 'Other');
    vi.advanceTimersByTime(3000);
    q.add('success', 'Uploaded', { id: 'upload' });
    expect(q.toasts().map((t) => t.title)).toEqual(['Other', 'Uploaded']);
    expect(q.toasts()[1]!.type).toBe('success');
    expect(q.timers).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(q.toasts().map((t) => t.title)).toEqual([]);
  });

  it('restarts the clock when an update changes the duration', () => {
    q.attach('', 4000);
    q.add('default', 'Uploading', { id: 'u' });
    vi.advanceTimersByTime(3000);
    q.add('default', 'Uploading', { id: 'u', duration: 10_000 });
    vi.advanceTimersByTime(9_999);
    expect(q.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(q.toasts()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps an Infinity toast until dismissed, holding no timer', () => {
    q.attach('', 4000);
    const id = q.add('error', 'Offline', { duration: Infinity });
    expect(q.timers).toBe(0);
    vi.advanceTimersByTime(1e9);
    expect(q.toasts()).toHaveLength(1);
    q.dismiss(id);
    expect(q.toasts()).toHaveLength(0);
  });

  it('takes the toaster duration for a toast queued before the toaster existed', () => {
    q.add('default', 'Early');
    q.attach('', 1000);
    vi.advanceTimersByTime(1000);
    expect(q.toasts()).toHaveLength(0);
  });

  it('pauses again when the last toaster on a channel detaches, and leaves no orphan timer', () => {
    const one = q.attach('', 4000);
    const two = q.attach('', 4000);
    const id = q.add('default', 'Hello');
    one();
    expect(q.isRunning(id)).toBe(true);
    two();
    two();
    expect(q.isRunning(id)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tells beforeRemove of every removal, while the toast is still queued: dismiss(id), dismiss() and expiry', () => {
    const detach = q.attach('', 1000);
    const seen: Array<[string, number]> = [];
    const stop = q.beforeRemove((toast) => seen.push([toast.title, q.toasts().length]));
    q.add('default', 'A', { id: 'a' });
    q.add('default', 'B', { id: 'b' });
    q.add('default', 'C', { id: 'c', duration: Infinity });
    q.dismiss('a');
    q.dismiss('nowhere');
    expect(seen).toEqual([['A', 3]]);
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([['A', 3], ['B', 2]]);
    q.dismiss();
    expect(seen).toEqual([['A', 3], ['B', 2], ['C', 1]]);
    stop();
    q.add('default', 'D');
    q.dismiss();
    expect(seen).toHaveLength(3);
    detach();
  });

  it('destroy clears every timer and toast', () => {
    q.attach('', 4000);
    q.add('default', 'one');
    q.add('default', 'two');
    q.destroy();
    expect(q.toasts()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
