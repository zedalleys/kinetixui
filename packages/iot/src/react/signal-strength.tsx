"use client";

import * as React from "react";
import { classifySignalStrength, describeSignal, formatSignalPercent, signalBars } from "../functions/signal";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * SignalStrength — a normalised 0–100 signal quality as a bar meter.
 *
 * Filled-bar count is shape, not colour, so the reading survives greyscale and forced-colors. The
 * accessible name is the sentence from `describeSignal`, and the visuals are hidden from assistive
 * technology so the number is announced once.
 *
 * `value` is a normalised quality, **not dBm** — see `classifySignalStrength` for why this module
 * refuses to guess the radio.
 */
export interface SignalStrengthProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "aria-label"> {
  /** Normalised 0–100. `null`/`undefined`/non-finite renders as unknown. */
  value: number | null | undefined;
  /** How many bars the meter has. Defaults to 4. */
  bars?: number;
  /** Hide the numeric percentage and show only the meter. The accessible label is unaffected. */
  hideValue?: boolean;
  /**
   * Replace the accessible label, e.g. for translation. A blank or whitespace-only string falls back
   * to the generated sentence rather than leaving the element without an accessible name.
   */
  label?: string;
}

const SignalStrength = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, SignalStrengthProps>(
  ({ value, bars = 4, hideValue = false, label, className, ...props }, ref) => {
    const total = Number.isInteger(bars) && bars > 0 ? bars : 4;
    const level = classifySignalStrength(value);
    const filled = signalBars(value, total);
    return (
      <span
        ref={ref}
        role="img"
        aria-label={resolveLabel(label, describeSignal(value))}
        data-level={level}
        className={cn("inline-flex items-center gap-2 text-label-md font-sans text-foreground", className)}
        {...props}
      >
        <span aria-hidden="true" className="inline-flex items-end gap-0.5">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "w-1 shrink-0 rounded-sm",
                index < filled ? "bg-secondary-foreground" : "bg-muted-foreground/30",
              )}
              // A meter is read by relative height, so the bars have to differ in size.
              style={{ height: `${4 + index * 3}px` }}
            />
          ))}
        </span>
        {hideValue ? null : (
          <span aria-hidden="true">{level === "unknown" ? "—" : `${formatSignalPercent(value as number)}%`}</span>
        )}
      </span>
    );
  },
), "SignalStrength");

export { SignalStrength };
