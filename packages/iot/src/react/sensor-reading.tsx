"use client";

import * as React from "react";
import type { KinetixTelemetryQuality } from "../types/telemetry";
import { classifyTelemetryQuality, formatTelemetryValue } from "../functions/telemetry";
import { cn } from "./cn";
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
}

const VALUE_SIZE = { md: "text-title-sm", lg: "text-headline-lg", xl: "text-display-sm" } as const;

const QUALITY_NOTE: Partial<Record<KinetixTelemetryQuality, string>> = {
  estimated: "Estimated",
  missing: "No reading",
  error: "Sensor error",
};

const SensorReading = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, SensorReadingProps>(
  ({ metric, value, unit, quality, precision, unknownLabel, size = "md", className, ...props }, ref) => {
    const point = { value: value ?? Number.NaN, unit, quality };
    const resolved = classifyTelemetryQuality(point);
    const note = QUALITY_NOTE[resolved];
    // A hero numeral carries its unit separately so the unit can be smaller. Only when there IS a
    // measurement: the unknown label ("Unknown", "—") must never grow a unit after it.
    const measured = size !== "md" && unit && resolved !== "missing" && resolved !== "error" && typeof value === "number" && Number.isFinite(value);
    return (
      <div
        ref={ref}
        data-quality={resolved}
        className={cn("flex flex-col gap-0.5 font-sans", className)}
        {...props}
      >
        <span className={cn("text-muted-foreground", size === "md" ? "text-label-md" : "text-body-md")}>{metric}</span>
        <span
          className={cn(
            "tabular-nums text-foreground",
            // A value that is not a measurement is never drawn as a hero numeral.
            size === "md" || !measured ? VALUE_SIZE.md : VALUE_SIZE[size],
            size !== "md" && measured && "leading-none",
            !measured && resolved !== "good" && size !== "md" && "text-muted-foreground",
          )}
        >
          {measured ? (
            <>
              {formatTelemetryValue({ value: value as number, quality }, { precision })}
              <span className="text-title-md text-muted-foreground"> {unit}</span>
            </>
          ) : (
            formatTelemetryValue(point, { precision, unknownLabel })
          )}
        </span>
        {/* A qualifier only when there is something to qualify — "good" needs no annotation. */}
        {note ? <span className="text-label-md text-muted-foreground">{note}</span> : null}
      </div>
    );
  },
), "SensorReading");

export { SensorReading };
