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
}

const QUALITY_NOTE: Partial<Record<KinetixTelemetryQuality, string>> = {
  estimated: "Estimated",
  missing: "No reading",
  error: "Sensor error",
};

const SensorReading = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, SensorReadingProps>(
  ({ metric, value, unit, quality, precision, unknownLabel, className, ...props }, ref) => {
    const point = { value: value ?? Number.NaN, unit, quality };
    const resolved = classifyTelemetryQuality(point);
    const note = QUALITY_NOTE[resolved];
    return (
      <div
        ref={ref}
        data-quality={resolved}
        className={cn("flex flex-col gap-0.5 font-sans", className)}
        {...props}
      >
        <span className="text-label-sm text-muted-foreground">{metric}</span>
        <span className="text-title-sm text-foreground">
          {formatTelemetryValue(point, { precision, unknownLabel })}
        </span>
        {/* A qualifier only when there is something to qualify — "good" needs no annotation. */}
        {note ? <span className="text-label-sm text-muted-foreground">{note}</span> : null}
      </div>
    );
  },
), "SensorReading");

export { SensorReading };
