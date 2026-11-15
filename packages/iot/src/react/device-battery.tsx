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
import { ReadingPlaceholder } from "./reading-placeholder";
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
 * - **Loading.** `loading` says a reading has been asked for and has not arrived: a placeholder where
 *   the percentage goes, the word "Loading", and `aria-busy`. Deliberately **not** "Unknown", which is
 *   this component's answer for a device that was asked and reported nothing — the two send a person to
 *   two different places. With a percentage already in hand `loading` is a refresh: the cell, the
 *   number and the band stay exactly as they are and only `aria-busy` is set.
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
  /**
   * A reading has been asked for and has not arrived yet. A placeholder and "Loading" where there is no
   * percentage; a refresh that changes nothing but `aria-busy` where there is one.
   *
   * `support="unsupported"` wins: a device with no battery is not waiting for one.
   */
  loading?: boolean;
}

const DeviceBattery = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, DeviceBatteryProps>(
  ({ value, charging, updatedAt, staleAfterMs, freshness, thresholds, support, showAge = false, now, label, loading = false, className, ...props }, ref) => {
    const unsupported = support === "unsupported";
    const status = resolveBatteryState({ percent: value ?? null, charging }, { thresholds });
    const fresh = resolveFreshness({ observedAt: updatedAt, staleAfterMs, now, freshness });
    const stale = !unsupported && fresh === "stale";
    const known = !unsupported && status.available;
    // A device with no battery is not loading one, and a percentage already in hand is not replaced.
    const asked = loading && !unsupported;
    const pending = asked && !known;
    const alarm = known && status.low;
    const percent = known ? formatBatteryPercent(value as number) : null;
    // Not while pending: an age dates a reading, and there is not one yet.
    const age = showAge && !unsupported && !pending && parseTimestamp(updatedAt ?? null) ? formatLastSeen(updatedAt, { now }) : null;
    const generated = describeDeviceBattery({ value, charging, freshness: fresh, support, thresholds, loading: pending });
    const sentence = resolveLabel(label, age ? `${generated}, ${describeReadingAge(updatedAt, { now, verb: "reported" })}` : generated);

    return (
      <span
        ref={ref}
        data-battery-level={unsupported ? "unsupported" : status.level}
        data-charging={unsupported ? undefined : String(status.charging)}
        data-freshness={unsupported ? undefined : fresh}
        aria-busy={asked || undefined}
        data-loading={pending ? "pending" : asked ? "refreshing" : undefined}
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
                  data-battery-pending={pending ? "" : undefined}
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
              <span data-battery-value="" className={cn("tabular-nums", known && !stale ? "text-foreground" : "text-muted-foreground")}>
                {/* A pending percentage holds its slot. "—" is the word for a device that reported
                    nothing, so it is not borrowed for a reading still on its way. */}
                {pending ? <ReadingPlaceholder width={3} /> : <bdi dir="ltr">{percent !== null ? `${percent}%` : "—"}</bdi>}
              </span>
            </span>
            {pending ? (
              <span aria-hidden="true" data-battery-note="loading" className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
                <Glyph name="circle-dot" size={12} />
                <span>Loading</span>
              </span>
            ) : !known ? (
              // Paired with `dash`, the glyph every other unknown reading in this family draws.
              // Measured at this branch's head from the built Storybook: `telemetry-unknown`,
              // `telemetry-unavailable`, `energy-unknown` and `connection-unknown` each render one
              // `svg[data-glyph="dash"]`, `battery-unsupported` renders `slash`, and the `loading`
              // note directly above renders `circle-dot` — `battery-unknown` alone rendered none.
              // The word is not the reason: `telemetry-unknown` shows "Unknown" too and still draws
              // the dash. So this was an omission, which is why the gate had to carry an exception
              // for it, and the exception goes with it.
              <span aria-hidden="true" data-battery-note="unknown" className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
                <Glyph name="dash" size={12} />
                <span>Unknown</span>
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
