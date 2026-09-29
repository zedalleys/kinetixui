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
 */
export interface TelemetryGridProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  children?: React.ReactNode;
  /** Accessible name for the list, e.g. "Greenhouse readings". */
  label?: string;
}

const TelemetryGrid = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLUListElement, TelemetryGridProps>(
  ({ children, label, className, ...props }, ref) => (
    <ul ref={ref} aria-label={label} className={cn("m-0 flex list-none flex-wrap gap-3 p-0 font-sans", className)} {...props}>
      {React.Children.toArray(children).map((child, index) => (
        <li
          key={React.isValidElement(child) && child.key !== null ? child.key : index}
          className="min-w-0 grow basis-40 rounded-lg border border-border bg-card p-3"
        >
          {child}
        </li>
      ))}
    </ul>
  ),
), "TelemetryGrid");

export { TelemetryGrid };
