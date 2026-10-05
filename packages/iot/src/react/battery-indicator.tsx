"use client";

import * as React from "react";
import { classifyBatteryLevel, describeBattery, formatBatteryPercent } from "../functions/battery";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * BatteryIndicator — a battery reading, with the band spelled out.
 *
 * The accessible name is the full sentence from `describeBattery` (`"Battery 72%, high"`), supplied
 * once via `aria-label` with the visuals hidden. Sighted users get the bar and the percentage; screen
 * reader users get the same two facts plus the band, and neither gets the percentage read twice.
 *
 * A missing reading renders `—` and announces `"Battery level unknown"`. It never renders as 0%,
 * because a device that does not report a battery is not a device with a flat one.
 */
export interface BatteryIndicatorProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "aria-label"> {
  /** Percentage 0–100. `null`/`undefined`/non-finite renders as unknown. */
  value: number | null | undefined;
  /** Hide the numeric percentage and show only the bar. The accessible label is unaffected. */
  hideValue?: boolean;
  /**
   * Replace the accessible label, e.g. for translation. A blank or whitespace-only string falls back
   * to the generated sentence rather than leaving the element without an accessible name.
   */
  label?: string;
  /**
   * `icon` (default) is the small battery glyph with an optional percentage. `pill` is a rounded meter
   * with the percentage as a larger numeral and, for low and critical, the word ("Low", "Critical") and a
   * warning glyph beside it — the level is never only a fill colour. The accessible name is unchanged.
   */
  presentation?: "icon" | "pill";
}

const LEVEL_CLASS: Record<ReturnType<typeof classifyBatteryLevel>, string> = {
  unknown: "bg-muted-foreground/40",
  critical: "bg-destructive",
  low: "bg-destructive/70",
  medium: "bg-secondary-foreground",
  high: "bg-secondary-foreground",
  full: "bg-secondary-foreground",
};

const BatteryIndicator = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, BatteryIndicatorProps>(
  ({ value, hideValue = false, label, presentation = "icon", className, ...props }, ref) => {
    const level = classifyBatteryLevel(value);
    const known = level !== "unknown";
    const alarm = level === "low" || level === "critical";

    if (presentation === "pill") {
      return (
        <span
          ref={ref}
          role="img"
          aria-label={resolveLabel(label, describeBattery(value))}
          data-level={level}
          data-presentation="pill"
          className={cn("inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-muted/60 py-1.5 ps-4 pe-3 font-sans text-foreground", className)}
          {...props}
        >
          {hideValue ? null : (
            <span aria-hidden="true" className="text-title-lg font-semibold tabular-nums">
              {known ? `${formatBatteryPercent(value as number)}%` : "—"}
            </span>
          )}
          <span aria-hidden="true" className="relative h-3 w-16 shrink-0 overflow-hidden rounded-full bg-background">
            <span
              className={cn("absolute inset-y-0 start-0 rounded-full", alarm ? "bg-destructive" : known ? "bg-primary" : "bg-muted-foreground/40")}
              style={{ inlineSize: known ? `${formatBatteryPercent(value as number)}%` : 0 }}
            />
          </span>
          {alarm || !known ? (
            <span aria-hidden="true" className={cn("inline-flex items-center gap-1 text-label-md", alarm ? "text-destructive" : "text-muted-foreground")}>
              <Glyph name={alarm ? "triangle" : "dash"} size={12} />
              {level === "critical" ? "Critical" : level === "low" ? "Low" : "No reading"}
            </span>
          ) : null}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        role="img"
        aria-label={resolveLabel(label, describeBattery(value))}
        data-level={level}
        className={cn("inline-flex items-center gap-2 font-sans text-body-sm tabular-nums text-foreground", className)}
        {...props}
      >
        {/* Decorative: every fact it shows is in the accessible label above. */}
        <span
          aria-hidden="true"
          className="relative inline-block h-3.5 w-7 shrink-0 rounded-md border border-input bg-background"
        >
          <span
            className={cn("absolute inset-y-0.5 start-0.5 rounded-sm transition-none", LEVEL_CLASS[level])}
            style={{ width: known ? `calc(${formatBatteryPercent(value as number)}% - 2px)` : 0 }}
          />
        </span>
        {hideValue ? null : (
          <span aria-hidden="true">{known ? `${formatBatteryPercent(value as number)}%` : "—"}</span>
        )}
      </span>
    );
  },
), "BatteryIndicator");

export { BatteryIndicator };
