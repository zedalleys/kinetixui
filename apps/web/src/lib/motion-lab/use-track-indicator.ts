"use client";

import * as React from "react";
import { SETTLE, advance, atRest, type SpringState } from "./spring";
import type { LabTechnique, LabTravel } from "./variants";

/**
 * One shared indicator, placed on the chosen item of a track, with the five lab variants.
 *
 * ── Geometry ────────────────────────────────────────────────────────────────
 *
 * The indicator is measured and written in LOGICAL terms: the distance from the track's inline-start
 * padding edge to the chosen item's leading edge, and from its trailing edge to the track's inline-end.
 * Writing `inset-inline-start` / `inset-inline-end` makes RTL correct by construction rather than by a
 * mirrored sign that somebody has to remember, which `MOTION.md` names as the usual source of wrong-way
 * motion. Offsets are taken from `offsetLeft`/`offsetTop` — the track's padding edge — so they hold while
 * the track scrolls, which `getBoundingClientRect` would not.
 *
 * The `transform` technique exists to measure the cost of that choice, not to replace it. It translates a
 * fixed-width indicator instead, which the compositor can run without the main thread, and which is only
 * correct when every item is the same width — true of a segmented strip (`flex-1`), false of a tab list
 * (`shrink-0` labels). It therefore MEASURES item widths and falls back to `inset` when they differ,
 * recording the fallback on the track as `data-kx-lab-technique="inset"` with
 * `data-kx-lab-technique-requested="transform"`, so a reader and the gate both see that the cheap path
 * was not taken and why. A silent fallback would be a worse defect than the one it avoids.
 *
 * ── Continuity ──────────────────────────────────────────────────────────────
 *
 * `glide`, `phased` and `fade` are CSS transitions, which the browser retargets from the current COMPUTED
 * value: the one rule that makes that true is that this hook must never write a stale position. It writes
 * the new destination directly and never passes through the previous one, so there is no frame in which
 * the indicator is at a logical origin it has already left.
 *
 * `spring` keeps velocity as well. Two integrators — one per logical edge — hold `x` and `v` across a
 * retarget, so an indicator interrupted at speed continues at that speed. A curve cannot do this: it would
 * restart from rest at the interruption point, which is the stall the brief's continuity requirement is
 * about.
 *
 * ── Reduced motion ─────────────────────────────────────────────────────────
 *
 * A variant is never an opt-out. The effective preference is `system OR override`: the lab's own toggle can
 * only ADD reduction, never remove a preference the reader has set in their operating system. Under the
 * effective preference every variant takes the `none` path, so the end state is identical and reached in
 * one frame. For the CSS variants the package's reduced-motion floor would shorten the transition anyway;
 * this hook does not rely on that, because a rAF-driven spring is invisible to CSS and because the same
 * code path then serves both.
 */

export interface TrackIndicatorOptions {
  readonly travel: LabTravel;
  readonly technique?: LabTechnique;
  /** Selector, scoped to the track's own children, for the chosen item. */
  readonly selectedSelector: string;
  /** Selector, scoped to the track's own children, for every item whose size can move the chosen one. */
  readonly itemSelector: string;
  /** `true` forces reduction on; `false` defers to the operating system. It can never force reduction OFF. */
  readonly reduceOverride?: boolean;
  /** Called with each travel the hook starts, for the lab's own run counter. Must be stable. */
  readonly onTravel?: (travel: LabTravel) => void;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** The trailing edge's hold under `phased`, as a token variable. One tier, never a number. */
const PHASED_HOLD = "var(--duration-base)";

export function useTrackIndicator(
  trackRef: React.RefObject<HTMLElement | null>,
  barRef: React.RefObject<HTMLElement | null>,
  options: TrackIndicatorOptions,
): void {
  const { travel, technique = "inset", selectedSelector, itemSelector, reduceOverride = false, onTravel } = options;
  // Read through a ref so a change of callback identity cannot tear down and restart the observers, which
  // would re-place the indicator and lose a travel in flight.
  const notify = React.useRef(onTravel);
  notify.current = onTravel;

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return;

    /** The indicator's logical geometry as last written, in pixels from the track's padding edges. */
    let start = 0;
    let end = 0;
    let chosen: HTMLElement | null = null;
    /** `${vertical} ${rtl}` — a change moves the indicator's physical edges without moving its logical ones. */
    let frame = "";
    let frameWidth = 0;
    let raf = 0;
    let lastFrameTime = 0;
    let springStart: SpringState = { x: 0, v: 0 };
    let springEnd: SpringState = { x: 0, v: 0 };
    let targetStart = 0;
    let targetEnd = 0;
    let settleTimer = 0;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    /** The override may only ADD reduction. */
    const reduced = () => reduceQuery.matches || reduceOverride;

    const stopSpring = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    /**
     * A fade run owns two things that outlive the frame it was started on: a `transitionend` listener that
     * writes the destination while the indicator is invisible, and a timer that writes it anyway if that
     * event never arrives. Both close over THAT run's destination, so either one firing after a later
     * placement has superseded it moves the indicator to a stale item and leaves it there.
     *
     * Codex found this on PR #662, and the cross-variant path is the one that does not self-correct: the
     * glide branch removed `settle` before re-adding it but never removed a pending `swap`, so a fade
     * interrupted by a Glide selection ran both on the glide's own `transitionend` — the glide landed
     * correctly and the stale `swap` then moved it back, onto an item that is not selected.
     */
    let fadeSwap: (() => void) | null = null;
    let fadeTimer = 0;
    const stopFade = () => {
      if (fadeSwap) bar.removeEventListener("transitionend", fadeSwap);
      fadeSwap = null;
      if (fadeTimer) window.clearTimeout(fadeTimer);
      fadeTimer = 0;
    };

    const writeEdges = (s: number, e: number) => {
      bar.style.setProperty("--kx-lab-start", `${s}px`);
      bar.style.setProperty("--kx-lab-end", `${e}px`);
    };

    /**
     * The CROSS axis — the one the indicator does not travel along — taken from the chosen item rather than
     * assumed to be the whole track.
     *
     * A segmented strip wraps (`flex-wrap` on the shipped root), and the first version of this hook pinned the
     * indicator to `inset-block: 0.25rem`, which on a wrapped strip is the full height of every row at once.
     * In dark mode that put a near-white surface behind the unselected labels on the other rows, and axe
     * reported three colour-contrast failures at 320px with 200% text — the one page view of twenty where the
     * strip actually wraps. Reading the chosen item's own block box confines the indicator to its row, which
     * is both the contrast fix and the correct behaviour for a wrapped strip.
     */
    const writeCross = (startCross: number, endCross: number) => {
      bar.style.setProperty("--kx-lab-cross-start", `${startCross}px`);
      bar.style.setProperty("--kx-lab-cross-end", `${endCross}px`);
    };

    /** The transform path: one fixed-width indicator translated along the inline axis. */
    const writeTransform = (s: number, vertical: boolean, rtl: boolean) => {
      const sign = vertical ? 1 : rtl ? -1 : 1;
      bar.style.setProperty(
        "--kx-lab-translate",
        vertical ? `translate3d(0, ${s}px, 0)` : `translate3d(${sign * s}px, 0, 0)`,
      );
    };

    const settle = () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = 0;
      bar.removeEventListener("transitionend", settle);
      track.setAttribute("data-kx-lab-state", "resting");
    };

    /**
     * `transitionend` is not guaranteed. A transition that is REPLACED mid-flight fires `transitioncancel`,
     * not `transitionend`; one in a hidden tab may fire neither; and a zero-duration transition under the
     * reduced-motion floor can fire before the listener is attached. Each of those would leave the track
     * reporting `data-kx-lab-state="travelling"` for the rest of the session — which the browser gate caught
     * as thirty consecutive idle frames still claiming to travel. So the state is also closed by a timer,
     * and the two are idempotent: whichever arrives first clears the other.
     */
    const armSettle = (ms: number) => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, ms);
    };

    /** Generous: longer than `base` plus `phased`'s hold, so a correct run is never cut short by its own net. */
    const SETTLE_CEILING_MS = 1200;

    const tick = (now: number) => {
      const delta = lastFrameTime ? Math.min(64, now - lastFrameTime) : 16;
      lastFrameTime = now;
      springStart = advance(springStart, targetStart, delta, SETTLE);
      springEnd = advance(springEnd, targetEnd, delta, SETTLE);
      const done = atRest(springStart, targetStart, SETTLE) && atRest(springEnd, targetEnd, SETTLE);
      if (done) {
        springStart = { x: targetStart, v: 0 };
        springEnd = { x: targetEnd, v: 0 };
      }
      if (technique === "transform" && frameWidth > 0) {
        const vertical = frame.startsWith("true");
        writeTransform(springStart.x, vertical, frame.endsWith("true"));
      } else {
        writeEdges(springStart.x, springEnd.x);
      }
      if (done) {
        raf = 0;
        lastFrameTime = 0;
        settle();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const place = (reframed = false) => {
      // Every current item is watched, and a removed one is released rather than held for the track's
      // lifetime: a label, a badge or a font arriving can move the chosen item without resizing it.
      if (sizes) {
        const items = new Set(track.querySelectorAll<HTMLElement>(itemSelector));
        for (const item of watched) {
          if (items.has(item)) continue;
          sizes.unobserve(item);
          watched.delete(item);
        }
        for (const item of items) {
          if (watched.has(item)) continue;
          sizes.observe(item);
          watched.add(item);
        }
      }

      const item = track.querySelector<HTMLElement>(selectedSelector);
      if (!item) {
        stopSpring();
        stopFade();
        track.removeAttribute("data-kx-lab-measured");
        track.setAttribute("data-kx-lab-state", "resting");
        chosen = null;
        bar.style.transition = "";
        return;
      }

      const vertical = track.getAttribute("aria-orientation") === "vertical";
      const rtl = getComputedStyle(track).direction === "rtl";
      const nextStart = vertical
        ? item.offsetTop
        : rtl
          ? track.clientWidth - item.offsetLeft - item.offsetWidth
          : item.offsetLeft;
      const nextEnd = vertical
        ? track.clientHeight - item.offsetTop - item.offsetHeight
        : track.clientWidth - nextStart - item.offsetWidth;

      // The cross axis is written on every placement, travelling or not: a wrap can change which row the
      // chosen item is on without changing its inline offsets at all.
      if (!vertical) writeCross(item.offsetTop, track.clientHeight - item.offsetTop - item.offsetHeight);

      const nextFrame = `${vertical} ${rtl}`;
      if (frame !== "" && nextFrame !== frame) reframed = true;

      // The transform path needs equal items. Measured, not assumed, and re-measured on every placement,
      // because a font or a label can make a strip unequal after it was equal.
      const items = [...track.querySelectorAll<HTMLElement>(itemSelector)];
      const extent = (el: HTMLElement) => (vertical ? el.offsetHeight : el.offsetWidth);
      const first = items.length ? extent(items[0]) : 0;
      const equal = items.length > 1 && items.every((el) => Math.abs(extent(el) - first) <= 0.5);
      const effective: LabTechnique = technique === "transform" && equal && !vertical ? "transform" : "inset";
      track.setAttribute("data-kx-lab-technique", effective);
      if (technique !== effective) track.setAttribute("data-kx-lab-technique-requested", technique);
      else track.removeAttribute("data-kx-lab-technique-requested");
      frameWidth = effective === "transform" ? first : 0;
      if (frameWidth > 0) bar.style.setProperty("--kx-lab-width", `${frameWidth}px`);
      else bar.style.removeProperty("--kx-lab-width");

      if (!reframed && chosen === item && nextStart === start && nextEnd === end) return;

      // Past this line the placement WILL write something, so any fade still owed its destination is
      // superseded and must be cancelled. It is cancelled here rather than in each branch because every
      // branch supersedes it, and the branch that forgot was how the defect arose. A placement that returned
      // early above has changed nothing and must NOT cancel a fade in flight, or it would be left invisible.
      stopFade();

      const travels = travel !== "none" && !reduced() && !reframed && chosen !== null && chosen !== item;

      // A reframe or a snap must not be interpolated: transitions go off BEFORE anything is written, or the
      // browser animates a physical edge that did not logically move.
      if (!travels) {
        stopSpring();
        bar.style.transition = "none";
        bar.style.transitionDelay = "";
        bar.style.opacity = "";
      }

      if (travels && travel === "spring") {
        // Hand the running oscillator a new target. Position and velocity are whatever they are right now,
        // which is exactly the continuity requirement: no reseeding from `start`/`end`.
        if (!raf) {
          springStart = { x: start, v: 0 };
          springEnd = { x: end, v: 0 };
        }
        targetStart = nextStart;
        targetEnd = nextEnd;
        bar.style.transition = "none";
        bar.style.transitionDelay = "";
        track.setAttribute("data-kx-lab-state", "travelling");
        notify.current?.(travel);
        if (!raf) raf = requestAnimationFrame(tick);
      } else if (travels && travel === "fade") {
        // Opacity carries the change; the position is written while the indicator is invisible, so it never
        // travels and never lands on a stale item when a second change arrives mid-fade.
        stopSpring();
        bar.style.transition = "opacity var(--duration-fast) var(--easing-exit)";
        bar.style.transitionDelay = "";
        bar.style.opacity = "0";
        track.setAttribute("data-kx-lab-state", "travelling");
        notify.current?.(travel);
        const swap = () => {
          // Whichever of the two paths arrives first releases both, so no handle outlives the run it belongs to.
          stopFade();
          if (effective === "transform" && frameWidth > 0) writeTransform(nextStart, vertical, rtl);
          else writeEdges(nextStart, nextEnd);
          bar.style.transition = "opacity var(--duration-fast) var(--easing-enter)";
          bar.style.opacity = "1";
          settle();
        };
        bar.removeEventListener("transitionend", settle);
        // Tracked, so a later placement can cancel it. `once` is not enough on its own: the event that
        // consumes it may belong to a different run's transition.
        fadeSwap = swap;
        bar.addEventListener("transitionend", swap, { once: true });
        // A fade that never fires `transitionend` — a hidden tab, a cancelled transition — must still arrive.
        fadeTimer = window.setTimeout(() => {
          if (fadeSwap !== swap) return;
          if (bar.style.opacity === "0") {
            stopFade();
            swap();
          }
        }, 600);
      } else if (travels) {
        stopSpring();
        bar.style.opacity = "";
        const hold = travel === "phased" ? PHASED_HOLD : "0ms";
        const forward = nextStart > start;
        // The edge the indicator is heading towards leads; the other waits for it, so the two phases stay in
        // the same order in time however the selection moves.
        bar.style.setProperty("--kx-lab-start-delay", forward ? hold : "0ms");
        bar.style.setProperty("--kx-lab-end-delay", forward ? "0ms" : hold);
        bar.style.setProperty(
          "--kx-lab-ease",
          travel === "phased" ? "var(--easing-standard)" : "var(--easing-emphasized)",
        );
        bar.style.transition = "";
        track.setAttribute("data-kx-lab-state", "travelling");
        notify.current?.(travel);
        if (effective === "transform" && frameWidth > 0) writeTransform(nextStart, vertical, rtl);
        else writeEdges(nextStart, nextEnd);
        bar.removeEventListener("transitionend", settle);
        bar.addEventListener("transitionend", settle);
        armSettle(SETTLE_CEILING_MS);
      } else {
        bar.style.setProperty("--kx-lab-start-delay", "0ms");
        bar.style.setProperty("--kx-lab-end-delay", "0ms");
        if (effective === "transform" && frameWidth > 0) writeTransform(nextStart, vertical, rtl);
        else writeEdges(nextStart, nextEnd);
        springStart = { x: nextStart, v: 0 };
        springEnd = { x: nextEnd, v: 0 };
        void bar.offsetWidth; // commit the snapped position before transitions return
        bar.style.transition = "";
        settle();
      }

      chosen = item;
      start = nextStart;
      end = nextEnd;
      frame = nextFrame;
      track.setAttribute("data-kx-lab-measured", "");
    };

    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => place());
    const watched = new Set<HTMLElement>();
    sizes?.observe(track);
    place();

    const states = new MutationObserver((records) =>
      place(records.some((r) => r.attributeName === "dir" || r.attributeName === "aria-orientation")),
    );
    states.observe(track, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-checked", "aria-selected", "aria-orientation", "dir"],
    });
    // Whichever ancestor decides the track's direction: Radix puts `dir` on its root, not on the track.
    const director = track.parentElement?.closest("[dir]") ?? null;
    const reframes = new MutationObserver(() => place(true));
    if (director) reframes.observe(director, { attributes: true, attributeFilter: ["dir"] });
    // A change of preference mid-session must reach the indicator, not wait for the next selection.
    const onPreference = () => place(true);
    reduceQuery.addEventListener("change", onPreference);

    return () => {
      stopSpring();
      stopFade();
      if (settleTimer) window.clearTimeout(settleTimer);
      states.disconnect();
      reframes.disconnect();
      sizes?.disconnect();
      watched.clear();
      reduceQuery.removeEventListener("change", onPreference);
      bar.removeEventListener("transitionend", settle);
    };
  }, [trackRef, barRef, travel, technique, selectedSelector, itemSelector, reduceOverride]);
}
