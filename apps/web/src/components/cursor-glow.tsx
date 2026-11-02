"use client";

import { useEffect, useRef } from "react";

/**
 * The cursor's ambient brightening, for the whole site.
 *
 * This began as `.kx-polygon-spotlight`, scoped to the hero's artwork. Scoped
 * there it was clipped by the artwork's own box — the owner's screenshot
 * (2026-11-02) shows it cut off in a straight line where the left column
 * starts — so it is now one fixed layer over the viewport instead.
 *
 * It sits BEHIND the page's content, not over it: a brightening painted on top
 * of body copy would lift the text toward its background and cost contrast on
 * every page at once, which no gate here would catch, because nothing in CI
 * moves a mouse. Behind the content it can only light the page's own
 * background, so the measured foreground pairs are untouched.
 *
 * The position is written straight to a custom property, never through React,
 * and coalesced to one write per frame: a pointer can fire far more often than
 * the compositor paints, and a re-render per move would be a re-render of the
 * entire page.
 */
export function CursorGlow() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty("--kx-cursor-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--kx-cursor-y", `${y.toFixed(1)}px`);
      el.dataset.active = "true";
    };

    const move = (event: globalThis.PointerEvent) => {
      // A mouse affordance only. Touch and pen leave the page alone, so a tap
      // never parks a glow where the finger happened to land.
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.dataset.active = "false";
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);

  return <div ref={layer} className="kx-cursor-glow" data-active="false" aria-hidden="true" />;
}
