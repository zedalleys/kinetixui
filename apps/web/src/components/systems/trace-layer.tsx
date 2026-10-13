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
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={state?.w ?? 0}
      height={state?.h ?? 0}
      viewBox={`0 0 ${state?.w ?? 0} ${state?.h ?? 0}`}
    >
      {state?.paths.map((p) => <path key={p.key} d={p.d} className="kx-trace" data-kind={p.kind} />)}
    </svg>
  );
}
