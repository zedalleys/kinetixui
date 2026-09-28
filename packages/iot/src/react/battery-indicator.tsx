"use client";

import * as React from "react";
import { classifyBatteryLevel, describeBattery, formatBatteryPercent } from "../functions/battery";
import { cn } from "./cn";
import { resolveLabel } from "./label";

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
}

const LEVEL_CLASS: Record<ReturnType<typeof classifyBatteryLevel>, string> = {
  unknown: "bg-muted-foreground/40",
  critical: "bg-destructive",
  low: "bg-destructive/70",
  medium: "bg-secondary-foreground",
  high: "bg-secondary-foreground",
  full: "bg-secondary-foreground",
};

const BatteryIndicator = React.forwardRef<HTMLSpanElement, BatteryIndicatorProps>(
  ({ value, hideValue = false, label, className, ...props }, ref) => {
    const level = classifyBatteryLevel(value);
    const known = level !== "unknown";
    return (
      <span
        ref={ref}
        role="img"
        aria-label={resolveLabel(label, describeBattery(value))}
        data-level={level}
        className={cn("inline-flex items-center gap-2 text-label-md font-sans text-foreground", className)}
        {...props}
      >
        {/* Decorative: every fact it shows is in the accessible label above. */}
        <span
          aria-hidden="true"
          className="relative inline-block h-3 w-6 shrink-0 rounded-sm border border-input bg-background"
        >
          <span
            className={cn("absolute inset-y-0.5 left-0.5 rounded-sm transition-none", LEVEL_CLASS[level])}
            style={{ width: known ? `calc(${formatBatteryPercent(value as number)}% - 2px)` : 0 }}
          />
        </span>
        {hideValue ? null : (
          <span aria-hidden="true">{known ? `${formatBatteryPercent(value as number)}%` : "—"}</span>
        )}
      </span>
    );
  },
);
BatteryIndicator.displayName = "BatteryIndicator";

export { BatteryIndicator };
