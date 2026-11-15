"use client";

import * as React from "react";
import type { KinetixTelemetryQuality } from "../types/telemetry";
import { classifyTelemetryQuality, formatTelemetryValue } from "../functions/telemetry";
import { cn } from "./cn";
import { ReadingPlaceholder } from "./reading-placeholder";
import { withDisplayName } from "./display-name";

/**
 * SensorReading — one metric, its value and its unit.
 *
 * Nothing is hidden from assistive technology here: the visible text is already the whole fact
 * (`Temperature` / `23.4 °C`), so adding an `aria-label` would only be a second copy to keep in sync.
 *
 * A reading whose quality is `missing` or `error` shows the unknown label rather than a number, and
 * says which of the two it was in words. That is the case this component exists for — a sensor that
 * did not answer must not render as a confident zero.
 *
 * `loading` is the fourth answer, and the only one that is about the caller rather than the sensor: a
 * reading has been asked for and nothing has come back. It draws a placeholder in the value's slot and
 * the word "Loading" — never the unknown label, which would say the sensor was asked and had nothing.
 * With a value already in hand it is a refresh: the number stays and only `aria-busy` is set.
 */
export interface SensorReadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Display name for the metric, already localised, e.g. `"Temperature"`. */
  metric: string;
  value: number | null | undefined;
  /** Display unit, e.g. `"°C"`. Printed after the value, never converted. */
  unit?: string;
  quality?: KinetixTelemetryQuality;
  /** Decimal places. Omit to print the value as given. */
  precision?: number;
  /** Shown in place of a value that cannot be presented as a measurement. Defaults to `"Unknown"`. */
  unknownLabel?: string;
  /** `md` (default) is one line of text; `lg` and `xl` draw the value as a hero numeral with a smaller, muted unit. */
  size?: "md" | "lg" | "xl";
  /**
   * A reading has been asked for and has not arrived yet. A placeholder and "Loading" with no usable
   * value; with one, a refresh that keeps the value and only sets `aria-busy`.
   *
   * The word is visible text, not an `aria-label`: this component's rule is that what is on screen is
   * the whole fact, and a placeholder bar on its own says nothing to a screen reader.
   */
  loading?: boolean;
}

const VALUE_SIZE = { md: "text-title-sm", lg: "text-headline-lg", xl: "text-display-sm" } as const;

const QUALITY_NOTE: Partial<Record<KinetixTelemetryQuality, string>> = {
  estimated: "Estimated",
  missing: "No reading",
  error: "Sensor error",
};

const LOADING_NOTE = "Loading";

const SensorReading = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, SensorReadingProps>(
  ({ metric, value, unit, quality, precision, unknownLabel, size = "md", loading = false, className, ...props }, ref) => {
    const point = { value: value ?? Number.NaN, unit, quality };
    const resolved = classifyTelemetryQuality(point);
    // A usable number is never replaced by a placeholder. `classifyTelemetryQuality` returns `missing`
    // or `error` for exactly the cases where there is nothing to show, so it is also the test for
    // whether this is a first load or a refresh over a value that is already true.
    const pending = loading && (resolved === "missing" || resolved === "error");
    const note = pending ? LOADING_NOTE : QUALITY_NOTE[resolved];
    // A hero numeral carries its unit separately so the unit can be smaller. Only when there IS a
    // measurement: the unknown label ("Unknown", "—") must never grow a unit after it.
    const measured = size !== "md" && unit && resolved !== "missing" && resolved !== "error" && typeof value === "number" && Number.isFinite(value);

    return (
      <div
        ref={ref}
        data-quality={resolved}
        aria-busy={loading || undefined}
        data-loading={pending ? "pending" : loading ? "refreshing" : undefined}
        className={cn("flex flex-col gap-0.5 font-sans", className)}
        {...props}
      >
        <span className={cn("text-muted-foreground", size === "md" ? "text-label-md" : "text-body-md")}>{metric}</span>
        <span
          // The gate seam for the layout-stability measurement: the slot has to be findable so its
          // height can be compared pending against loaded.
          data-reading-value=""
          className={cn(
            "tabular-nums text-foreground",
            // A value that is not a measurement is never drawn as a hero numeral.
            size === "md" || !measured ? VALUE_SIZE.md : VALUE_SIZE[size],
            size !== "md" && measured && "leading-none",
            !measured && resolved !== "good" && size !== "md" && "text-muted-foreground",
          )}
        >
          {/* A reading still on its way holds its slot. The unknown label is deliberately not reused for
              it: "Unknown" is this component's word for a sensor that answered with nothing. */}
          {pending ? (
            <ReadingPlaceholder width={size === "md" ? 4 : 5} />
          ) : (
          /* A measurement is a number and its unit as one left-to-right run: in an RTL page the unit's
             letters and neutral characters ("°C", "kWh", "L/min") otherwise reorder around the digits,
             so "23.4 °C" renders as "°C 23.4". The unknown label is isolated for the same reason. */
          <bdi dir="ltr">
            {measured ? (
              <>
                {formatTelemetryValue({ value: value as number, quality }, { precision })}
                <span className="text-title-md text-muted-foreground"> {unit}</span>
              </>
            ) : (
              formatTelemetryValue(point, { precision, unknownLabel })
            )}
          </bdi>
          )}
        </span>
        {/* A qualifier only when there is something to qualify — "good" needs no annotation. */}
        {note ? <span className="text-label-md text-muted-foreground">{note}</span> : null}
      </div>
    );
  },
), "SensorReading");

export { SensorReading };
