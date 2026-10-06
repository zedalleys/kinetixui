"use client";

import * as React from "react";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixBatteryThresholds, KinetixFreshness } from "../types/monitoring";
import { describeDeviceBattery, formatBatteryPercent, resolveBatteryState } from "../functions/battery";
import { resolveFreshness } from "../functions/freshness";
import { formatLastSeen } from "../functions/last-seen";
import { describeReadingAge } from "../functions/reading";
import { parseTimestamp } from "../functions/time";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * DeviceBattery — what is known about a device's battery, and nothing that is not (M3).
 *
 * `BatteryIndicator` draws a percentage. This adds the facts a monitoring surface needs and keeps
 * each one separate:
 *
 * - **Level.** 0–100 when reported; `—` and "Unknown" when not. Unknown is never 0 %.
 * - **Charging.** A bolt and "Charging" when reported `true`, "Not charging" when `false`, "Charging
 *   unknown" when the device reports that it cannot tell (`null`); nothing when `undefined` (not
 *   reported). A full battery does not imply a charger.
 * - **Band.** `critical` and `low` carry a glyph and a word, so the alarm is never colour alone. The
 *   boundaries are the product's (`thresholds`), defaulting to 10 and 25.
 * - **Freshness.** From `updatedAt` and the product's `staleAfterMs` (or an explicit `freshness`). A
 *   stale reading keeps its number, in the muted tone, with a clock and "Stale". Stale is about the
 *   reading's age; it never says "offline".
 * - **Support.** `unsupported` (`resolveCapabilitySupport`) renders "No battery" — a different answer
 *   from "unknown". `read-only` is normal for a battery and changes nothing.
 *
 * One accessible sentence carries all of it ("Battery 18 percent, low, stale reading"); every visual
 * part is hidden from assistive technology, so the percentage is never read twice. Not a live region:
 * a battery changing is not an event to interrupt anyone with.
 */
export interface DeviceBatteryProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 0–100. `null`/`undefined`/non-finite is unknown. */
  value?: number | null;
  /** `true` / `false` as reported; `null` when the device reports that it cannot tell; omit when not reported. */
  charging?: boolean | null;
  /** When the reading was taken. With `staleAfterMs` it decides freshness. */
  updatedAt?: string | Date | number | null;
  /** The product's policy for how old a battery reading may be. No default: omit and freshness is unknown. */
  staleAfterMs?: number;
  /** An answer the product already has. Wins over `updatedAt` / `staleAfterMs`. */
  freshness?: KinetixFreshness;
  /** Override the `critical` / `low` boundaries (percent). */
  thresholds?: KinetixBatteryThresholds;
  /** From `resolveCapabilitySupport`. `unsupported` renders "No battery". */
  support?: KinetixCapabilitySupport;
  /** Show the reading's age ("5m ago") beside it when `updatedAt` is given. Off by default. */
  showAge?: boolean;
  /** Reference instant. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number | null;
  /** Replace the accessible sentence, e.g. for translation. Blank falls back to the generated one. */
  label?: string;
}

const DeviceBattery = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, DeviceBatteryProps>(
  ({ value, charging, updatedAt, staleAfterMs, freshness, thresholds, support, showAge = false, now, label, className, ...props }, ref) => {
    const unsupported = support === "unsupported";
    const status = resolveBatteryState({ percent: value ?? null, charging }, { thresholds });
    const fresh = resolveFreshness({ observedAt: updatedAt, staleAfterMs, now, freshness });
    const stale = !unsupported && fresh === "stale";
    const known = !unsupported && status.available;
    const alarm = known && status.low;
    const percent = known ? formatBatteryPercent(value as number) : null;
    const age = showAge && !unsupported && parseTimestamp(updatedAt ?? null) ? formatLastSeen(updatedAt, { now }) : null;
    const generated = describeDeviceBattery({ value, charging, freshness: fresh, support, thresholds });
    const sentence = resolveLabel(label, age ? `${generated}, ${describeReadingAge(updatedAt, { now, verb: "reported" })}` : generated);

    return (
      <span
        ref={ref}
        data-battery-level={unsupported ? "unsupported" : status.level}
        data-charging={unsupported ? undefined : String(status.charging)}
        data-freshness={unsupported ? undefined : fresh}
        className={cn("inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 font-sans text-body-sm text-foreground", className)}
        {...props}
      >
        <span className="sr-only" data-battery-sentence="">
          {sentence}
        </span>
        {unsupported ? (
          <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Glyph name="slash" size={14} />
            <span>No battery</span>
          </span>
        ) : (
          <>
            <span aria-hidden="true" className="inline-flex items-center gap-1.5">
              {/* The cell: an outlined body with a nub on its inline end, filled to the level. Unknown is
                  an empty, dashed body — not a flat battery. */}
              <span className="inline-flex items-center">
                <span
                  className={cn(
                    "relative inline-block h-3.5 w-7 shrink-0 rounded-md border bg-background",
                    known ? "border-foreground/60" : "border-dashed border-muted-foreground",
                    stale && "border-dashed",
                  )}
                >
                  {known ? (
                    <span
                      data-battery-fill=""
                      className={cn("absolute inset-y-0.5 start-0.5 rounded-sm", alarm ? "bg-destructive" : stale ? "bg-muted-foreground/60" : "bg-foreground/70")}
                      style={{ inlineSize: `calc(${percent}% - 4px)` }}
                    />
                  ) : null}
                </span>
                <span className="ms-px h-1.5 w-0.5 rounded-e-sm bg-foreground/60" />
              </span>
              <span className={cn("tabular-nums", known && !stale ? "text-foreground" : "text-muted-foreground")}>
                <bdi dir="ltr">{percent !== null ? `${percent}%` : "—"}</bdi>
              </span>
            </span>
            {!known ? (
              <span aria-hidden="true" data-battery-note="unknown" className="text-label-md text-muted-foreground">
                Unknown
              </span>
            ) : null}
            {alarm ? (
              <span aria-hidden="true" data-battery-note={status.level} className="inline-flex items-center gap-1 text-label-md font-medium text-destructive">
                <Glyph name={status.critical ? "octagon" : "triangle"} size={12} />
                <span>{status.critical ? "Critical" : "Low"}</span>
              </span>
            ) : null}
            {status.charging === true ? (
              <span aria-hidden="true" data-battery-note="charging" className="inline-flex items-center gap-1 text-label-md text-foreground">
                <Glyph name="bolt" size={12} />
                <span>Charging</span>
              </span>
            ) : status.charging === false ? (
              <span aria-hidden="true" data-battery-note="not-charging" className="text-label-md text-muted-foreground">
                Not charging
              </span>
            ) : charging === null ? (
              <span aria-hidden="true" data-battery-note="charging-unknown" className="text-label-md text-muted-foreground">
                Charging unknown
              </span>
            ) : null}
            {stale ? (
              <span aria-hidden="true" data-battery-note="stale" className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
                <Glyph name="clock" size={12} />
                <span>Stale</span>
              </span>
            ) : null}
            {age ? (
              <span aria-hidden="true" className="text-label-md tabular-nums text-muted-foreground">
                {age}
              </span>
            ) : null}
          </>
        )}
      </span>
    );
  },
), "DeviceBattery");

export { DeviceBattery };
