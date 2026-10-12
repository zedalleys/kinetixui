/**
 * One pointer drag, from press to release. Internal: nothing here is exported from `public-api.ts`.
 *
 * The resizable handle, the scroll area's thumb and the carousel's swipe are the three consumers. They share one
 * interaction model — a press, a stream of moves measured from where the press started, and an end — and they
 * share the ways it goes wrong: a release outside the element that never arrives, a touch the browser takes
 * over for scrolling (`pointercancel`), a capture lost to another element, a second finger, and listeners left
 * behind on the element or the document after the component that registered them is destroyed.
 *
 *   start()   begins tracking ONE pointer (the one that pressed). A press while a drag is running is ignored.
 *   move      called with the travel since the press, in CSS pixels, physical axes. Turning that into a
 *             logical value (which way is "forward" in a right-to-left context) is the caller's job, because only
 *             the caller knows its axis.
 *   end       called exactly once: `true` for a release (`pointerup`), `false` when the drag was taken away
 *             (`pointercancel`, a lost capture, `cancel()`, the component being destroyed).
 *
 * Two ways to listen, because the consumers need different things:
 *
 *   capture   (default) the element captures the pointer, so every move and the release reach it wherever the
 *             pointer goes — off the element, off the window. A handle or a thumb wants exactly this.
 *   page      no capture. Moves and the release are read from the element's own document while the drag runs.
 *             A carousel needs it: its slides hold links and buttons, and a captured pointer retargets the
 *             release (and so the click) to the carousel itself — the button under the finger would never be
 *             pressed. Without capture, a press on a button that does not travel stays a click on that button.
 *
 * Listeners exist only while a drag runs: added by `start()`, all removed at the end, whichever way it ends.
 * Nothing touches `window` or `document` at construction, so a component holding one can be created on the
 * server. `dispose()` (a component's `DestroyRef`) ends a running drag and leaves nothing registered.
 */
export interface KxDragCallbacks {
  move(dx: number, dy: number, event: PointerEvent): void;
  end(released: boolean, event: PointerEvent | null): void;
}

export class KxPointerDrag {
  private stop: ((released: boolean, event: PointerEvent | null) => void) | null = null;

  /** Whether a drag is running. */
  get active(): boolean {
    return this.stop !== null;
  }

  /** Begin tracking the pointer that produced `event`. Returns false when a drag is already running. */
  start(element: HTMLElement, event: PointerEvent, callbacks: KxDragCallbacks, mode: 'capture' | 'page' = 'capture'): boolean {
    if (this.stop) return false;
    const id = event.pointerId;
    const x0 = event.clientX;
    const y0 = event.clientY;
    const target: EventTarget | null = mode === 'capture' ? element : element.ownerDocument;
    if (!target) return false;
    if (mode === 'capture') {
      try {
        element.setPointerCapture(id);
      } catch {
        // the pointer is already gone (released before this ran): there is nothing to track
        return false;
      }
    }
    const onMove = (e: Event) => {
      const p = e as PointerEvent;
      if (p.pointerId !== id) return;
      callbacks.move(p.clientX - x0, p.clientY - y0, p);
    };
    const onUp = (e: Event) => {
      if ((e as PointerEvent).pointerId === id) finish(true, e as PointerEvent);
    };
    const onCancel = (e: Event) => {
      if ((e as PointerEvent).pointerId === id) finish(false, e as PointerEvent);
    };
    const finish = (released: boolean, e: PointerEvent | null) => {
      if (this.stop !== finish) return;
      this.stop = null;
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      target.removeEventListener('lostpointercapture', onCancel);
      if (mode === 'capture' && element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
      callbacks.end(released, e);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    // a capture can be taken away without a release (another element captures, the element leaves the DOM)
    if (mode === 'capture') target.addEventListener('lostpointercapture', onCancel);
    this.stop = finish;
    return true;
  }

  /** End a running drag as taken away (`end(false)`). Nothing happens when none is running. */
  cancel(): void {
    this.stop?.(false, null);
  }

  /** For `DestroyRef.onDestroy`: the same as `cancel()`. */
  dispose(): void {
    this.cancel();
  }
}

/** `value` held to `[min, max]`. */
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
