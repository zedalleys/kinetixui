"use client";

import * as React from "react";
import { classifySignalStrength, describeSignal, formatSignalPercent, signalBars } from "../functions/signal";
import { cn } from "./cn";
import { ReadingPlaceholder } from "./reading-placeholder";
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
 *
 * `loading` is the one answer that is not about the radio: a reading has been asked for and has not
 * arrived. The meter keeps its empty bars (there is no reading to draw, and an invented fill would be a
 * measurement), the percentage slot holds a placeholder rather than "—", and `aria-busy` is set. It is
 * distinct from both "Signal strength unknown" (asked, nothing reported) and "No signal" (a reported
 * zero, which is a measurement). With a value in hand it is a refresh and changes nothing but
 * `aria-busy`.
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
  /**
   * A reading has been asked for and has not arrived yet. A placeholder where the percentage goes and
   * "Signal loading, no reading yet" as the accessible label; with a value, a refresh that only sets
   * `aria-busy`.
   */
  loading?: boolean;
}

const SignalStrength = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, SignalStrengthProps>(
  ({ value, bars = 4, hideValue = false, label, loading = false, className, ...props }, ref) => {
    const total = Number.isInteger(bars) && bars > 0 ? bars : 4;
    const level = classifySignalStrength(value);
    const filled = signalBars(value, total);
    // A reported value is never replaced by a placeholder; `unknown` is the only level with nothing to
    // show. `none` is a measured zero and stays a measurement.
    const pending = loading && level === "unknown";
    return (
      <span
        ref={ref}
        role="img"
        aria-label={resolveLabel(label, describeSignal(value, { loading: pending }))}
        aria-busy={loading || undefined}
        data-level={level}
        data-loading={pending ? "pending" : loading ? "refreshing" : undefined}
        className={cn("inline-flex items-center gap-2 font-sans text-body-sm tabular-nums text-foreground", className)}
        {...props}
      >
        <span aria-hidden="true" className="inline-flex items-end gap-0.5">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "w-1.5 shrink-0 rounded-full",
                index < filled ? "bg-secondary-foreground" : "bg-muted-foreground/30",
              )}
              // A meter is read by relative height, so the bars have to differ in size.
              style={{ height: `${6 + index * 4}px` }}
            />
          ))}
        </span>
        {hideValue ? null : (
          <span aria-hidden="true" data-signal-value="">
            {/* "—" is the word for a radio that reported nothing; a reading on its way holds its slot
                instead, so the meter's width does not change when the value lands. */}
            {pending ? <ReadingPlaceholder width={3} /> : level === "unknown" ? "—" : `${formatSignalPercent(value as number)}%`}
          </span>
        )}
      </span>
    );
  },
), "SignalStrength");

export { SignalStrength };
