"use client";

import { useEffect, useRef } from "react";

/**
 * The site-wide pointer glow.
 *
 * It replaces `.kx-polygon-spotlight`, which was a brightening bound to the
 * homepage hero: `position: absolute; inset: 0` inside `.kx-hero-polygon`, with
 * its centre written as a percentage of that element's own box. So it could not
 * leave the illustration by construction, it ended in a straight cut wherever
 * the hero's box ended, and the section's `overflow: hidden` clipped the part of
 * the hero that bleeds past the container. Measured on `25e0bdf` at 1440px: the
 * layer's rect was exactly the hero's (x 613 → 1472 in a 1440px viewport), and
 * moving the pointer one pixel to the left of it set `data-pointer="false"` and
 * faded the whole thing out.
 *
 * This layer is `position: fixed` over the viewport instead, and its centre is
 * written in viewport pixels from `clientX`/`clientY`, so it follows the cursor
 * across every page and through a scroll.
 *
 * Where it sits in the stack is the accessibility decision, not an aesthetic
 * one. It is painted BELOW the content wrapper (see `layout.tsx`): above the
 * page background, under everything that carries meaning. A brightening painted
 * over body copy would change the rendered background of every foreground pair
 * on the site at once, and nothing in CI moves a mouse, so no existing contrast
 * gate would see it. `scripts/cursor-glow-browser.mjs` measures both halves of
 * that contract — that an opaque surface still occludes the glow, and that the
 * worst real text pair on each sampled page still clears AA with the glow at
 * full strength directly behind it.
 *
 * Mouse only. A touch has no hover position to follow, and `pointermove` from a
 * finger would strand the glow wherever the last tap landed. Under
 * `prefers-reduced-motion: reduce` the layer is not rendered at all: the
 * stylesheet hides it, and this component never attaches a listener.
 */
export function CursorGlow() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = layer.current;
    if (!node) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    // One write per frame. `pointermove` fires far more often than the
    // compositor paints, and each write here invalidates a full-viewport
    // gradient.
    const flush = () => {
      frame = 0;
      if (!pending) return;
      node.style.setProperty("--kx-cursor-x", `${pending.x}px`);
      node.style.setProperty("--kx-cursor-y", `${pending.y}px`);
      node.dataset.active = "true";
      pending = null;
    };

    const track = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || preference.matches) return;
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    // The cursor has left the document, or the window has: a glow left burning
    // at the last known position reads as a stuck highlight.
    const drop = () => {
      pending = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      node.dataset.active = "false";
    };
    const sync = () => {
      if (preference.matches) drop();
    };

    window.addEventListener("pointermove", track, { passive: true });
    document.addEventListener("pointerleave", drop);
    window.addEventListener("blur", drop);
    preference.addEventListener("change", sync);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", track);
      document.removeEventListener("pointerleave", drop);
      window.removeEventListener("blur", drop);
      preference.removeEventListener("change", sync);
    };
  }, []);

  return <div ref={layer} className="kx-cursor-glow" data-active="false" aria-hidden="true" />;
}
