"use client";

import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Metric — a stat / KPI display: label, value, an optional trend indicator
 * and an optional chart or icon slot (bring your own chart, e.g. compose
 * with `ChartContainer`).
 */
export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  change?: React.ReactNode;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
}

const Metric = React.forwardRef<HTMLDivElement, MetricProps>(
  ({ className, label, value, trend, change, icon, chart, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 rounded-md border border-input p-4 font-sans", className)} {...props}>
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>}
      </div>
      {/*
        Wraps rather than compresses. `justify-between` with two intrinsically-sized children has no
        give: once the value and the trend together need more than the card's content box, flex has
        nothing left to take and the pair is painted outside it — measured at 14px past the box on a
        149px card ("0.42%" / "0.1%"). Neither child can absorb the loss (a numeral must not be
        truncated, and splitting an arrow from its figure makes the trend unreadable), so the row
        gives way instead and the trend drops onto its own line under the value.

        `gap-x-3` rather than `gap-2`: 8px was the floor the compressed row was pinned at, which is
        exactly how close the two read before they collided. 12px is the spacing the rest of the
        system uses between related-but-distinct controls.

        `data-kx-metric-pair` is the handle the rendered gate measures this row by
        (scripts/web-quality-browser.mjs, the `spacing` check). It is a marker, never a styling hook.
      */}
      <div data-kx-metric-pair className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 break-words text-headline-sm font-medium text-foreground">{value}</p>
        {trend && (
          <span
            className={cn(
              // Three rules, in the order flex applies them, so the trend degrades one step at a time
              // instead of being clipped:
              //   `whitespace-nowrap`  the figure is never broken mid-number
              //   the row's `flex-wrap`  places items by their natural size BEFORE shrinking any, so a
              //                         trend too wide to sit beside the value reaches its own line whole
              //   `min-w-0` + `flex-wrap` here  the last resort, once the trend is alone on a line and
              //                         that line is still narrower than it (a 158px card at 200% text
              //                         leaves 92px for a 94px trend): the figure goes under the arrow.
              // Deliberately no `shrink-0`: it would hold the trend at its natural width and put the
              // overflow back, which is the defect this replaced.
              "inline-flex min-w-0 flex-wrap items-center gap-0.5 whitespace-nowrap text-label-md font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground",
            )}
          >
            {trend === "up" && <ArrowUp className="size-3.5" />}
            {trend === "down" && <ArrowDown className="size-3.5" />}
            {change}
          </span>
        )}
      </div>
      {chart && <div className="mt-1">{chart}</div>}
    </div>
  ),
);
Metric.displayName = "Metric";

export { Metric };
