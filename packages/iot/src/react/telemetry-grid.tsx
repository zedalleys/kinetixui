import * as React from "react";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * TelemetryGrid — a responsive set of readings, as a list.
 *
 * `<ul>`/`<li>` because a set of readings is a list, and a screen reader announces "list, 6 items".
 * Each child is wrapped in its own `<li>`, so pass `TelemetryMetric`s (or anything else) directly.
 *
 * The layout is `flex-wrap` with a `basis-40` (10rem) floor rather than a fixed column count, so it
 * fills whatever container it is put in and never forces a horizontal scroll: at 320px it is one
 * column, and it gains columns as the container — not the viewport — allows.
 *
 * `columns` caps the count (1–4) without giving up that safety: it becomes an `auto-fit` grid whose
 * tracks are never narrower than `basis-40`, so `columns={4}` is four columns in a wide container and
 * still one at 320px. Tiles are a quiet fill (`bg-muted/40`), not an outlined box.
 */
export interface TelemetryGridProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  children?: React.ReactNode;
  /** Accessible name for the list, e.g. "Greenhouse readings". */
  label?: string;
  /** Cap the number of columns (1–4). Tracks still collapse in a narrow container. Omit for the fluid default. */
  columns?: 1 | 2 | 3 | 4;
}

/** At most `n` equal tracks, never narrower than 10rem (`basis-40`), gap 1rem. The 0.5px absorbs rounding so `n` fit. */
const columnTemplate = (n: number) => `repeat(auto-fit, minmax(max(10rem, calc((100% - ${n - 1}rem) / ${n} - 0.5px)), 1fr))`;

const TelemetryGrid = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLUListElement, TelemetryGridProps>(
  ({ children, label, columns, className, style, ...props }, ref) => {
    const n = columns === 1 || columns === 2 || columns === 3 || columns === 4 ? columns : null;
    return (
      <ul
        ref={ref}
        aria-label={label}
        data-columns={n ?? undefined}
        className={cn("m-0 list-none gap-4 p-0 font-sans", n ? "grid" : "flex flex-wrap", className)}
        style={n ? { gridTemplateColumns: columnTemplate(n), ...style } : style}
        {...props}
      >
        {React.Children.toArray(children).map((child, index) => (
          <li
            key={React.isValidElement(child) && child.key !== null ? child.key : index}
            className="min-w-0 grow basis-40 rounded-2xl bg-muted/40 p-4"
          >
            {child}
          </li>
        ))}
      </ul>
    );
  },
), "TelemetryGrid");

export { TelemetryGrid };
