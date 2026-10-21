"use client";

import * as React from "react";

/**
 * The Kinetix Trace as a reusable layer: draws the hairline between two marked elements inside its parent.
 *
 * Mark the ends with `data-anchor="<id>"` and pass the pairs. Geometry is measured from the real layout, so the
 * same markup works in either direction and at any text size; a pair whose ends are not side by side (a stacked
 * phone layout) is simply not drawn, because a line through the content it connects would be noise. Decorative:
 * the content it joins already says, in order, what joins what.
 *
 * Static by design — the hero is the one place a trace moves.
 */
export type TracePair = { from: string; to: string; kind?: "generated" | "written" };

export function TraceLayer({ pairs }: { pairs: TracePair[] }) {
  const svg = React.useRef<SVGSVGElement>(null);
  const [state, setState] = React.useState<{ w: number; h: number; paths: { key: string; d: string; kind: string }[] } | null>(null);

  const measure = React.useCallback(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const rtl = getComputedStyle(host).direction === "rtl";
    const find = (id: string) => host.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    const paths: { key: string; d: string; kind: string }[] = [];
    for (const { from, to, kind = "generated" } of pairs) {
      const a = find(from);
      const b = find(to);
      if (!a || !b || a.width === 0 || b.width === 0) continue;
      const sideBySide = rtl ? b.right <= a.left + 1 : b.left >= a.right - 1;
      if (!sideBySide) continue;
      const x1 = (rtl ? a.left : a.right) - r.left;
      const x2 = (rtl ? b.right : b.left) - r.left;
      const y1 = a.top - r.top + a.height / 2;
      const y2 = b.top - r.top + b.height / 2;
      const mx = (x1 + x2) / 2;
      paths.push({ key: `${from}>${to}`, d: `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, kind });
    }
    setState({ w: r.width, h: r.height, paths });
  }, [pairs]);

  // Measured from the ResizeObserver's first callback, which runs after layout, rather than synchronously during
  // hydration: reading geometry in a layout effect forced a whole-page layout inside the hydration task.
  React.useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    if (typeof ResizeObserver === "undefined") return measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(host);
    // a direction flip moves the anchors without resizing anything, so watch the document's direction too
    const mo = new MutationObserver(() => measure());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [measure]);

  return (
    <svg
      ref={svg}
      data-trace-layer=""
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
      /*
       * The drawing is sized by its own `inset`, never by what was measured: a measured size in a layout property
       * of an element inside the observed subtree feeds the observer its own output, and the page grows without
       * bound. Only the `viewBox` carries the measurement, and that takes no part in layout.
       *
       * Out of flow and untouchable inline rather than by a utility class, because both have to hold when the
       * stylesheet never arrives. Without a stylesheet this overlay has no positioned ancestor, so `inset: 0`
       * resolves against the viewport and it covers the page: with `pointer-events` left to the stylesheet it
       * then swallows every click on the page behind it.
       *
       * `100%` rather than `auto` because an `<svg>` is a replaced element: `inset: 0` fills the host only
       * through the default sizing algorithm, which is not worth depending on when two constants say it
       * outright. They are constants, so no measurement reaches a layout property either way.
       */
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox={`0 0 ${state?.w ?? 0} ${state?.h ?? 0}`}
    >
      {state?.paths.map((p) => <path key={p.key} d={p.d} className="kx-trace" data-kind={p.kind} />)}
    </svg>
  );
}
