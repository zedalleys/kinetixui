import * as React from "react";
import type { KinetixMetricThresholds, KinetixTelemetryQuality } from "../types/telemetry";
import { describeMetric, getMetricDefinition } from "../functions/metrics";
import { evaluateReading, formatTelemetryValue } from "../functions/telemetry";
import { LastSync } from "./last-sync";
import { MetricStatus } from "./metric-status";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * TelemetryMetric — one reading: label, value, unit, how fresh, and whether to believe it.
 *
 * The label, unit and decimal places default from the metric registry, and the status comes from
 * `evaluateReading`, so a product that supplies only `metric="soil-moisture"` and a value gets a
 * sensible tile. Everything can be overridden.
 *
 * **A number is only shown as current when it is.**
 * - `unavailable` (no usable value, or quality `missing`/`error`): the value slot reads "—", never 0.
 * - `stale` (older than `staleAfterMs`, or undated): the number is kept but labelled "Last known" and
 *   set in the muted tone — useful, but not presented as the present. The trend arrow is dropped for
 *   both, because a direction is a claim about now.
 *
 * The state is a glyph and a word (`MetricStatus`); the trend is an arrow and a word ("Rising").
 */
export interface TelemetryMetricProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Metric key. Supplies the default label, unit, precision and thresholds from the registry. */
  metric: string;
  /** Display name, already localised. Defaults to the registry label for `metric`. */
  label?: string;
  value: number | null | undefined;
  unit?: string;
  quality?: KinetixTelemetryQuality;
  precision?: number;
  /** When the value was measured. Drives the freshness stamp and, with `staleAfterMs`, staleness. */
  timestamp?: string | Date | number | null;
  /** Older than this, or undated, is `stale`. Omit to skip the age check. */
  staleAfterMs?: number;
  thresholds?: KinetixMetricThresholds | null;
  /** Direction of change, from `summarizeSeries`. Shown as an arrow and a word, only for a current reading. */
  trend?: "rising" | "falling" | "steady" | "unknown";
  /** Reference instant. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number | null;
  /** Hide the status glyph and word for a plain `normal` reading. Attention states always show. */
  quietWhenNormal?: boolean;
}

const TREND: Record<"rising" | "falling" | "steady", { glyph: "trend-up" | "trend-down" | "trend-flat"; word: string }> = {
  rising: { glyph: "trend-up", word: "Rising" },
  falling: { glyph: "trend-down", word: "Falling" },
  steady: { glyph: "trend-flat", word: "Steady" },
};

const TelemetryMetric = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryMetricProps>(
  (
    { metric, label, value, unit, quality, precision, timestamp, staleAfterMs, thresholds, trend, now, quietWhenNormal = false, className, ...props },
    ref,
  ) => {
    const definition = getMetricDefinition(metric);
    const evaluation = evaluateReading({ value, quality, timestamp, metric, thresholds, now, staleAfterMs });
    const state = evaluation.state;
    const unavailable = state === "unavailable";
    const stale = state === "stale";
    const shown = formatTelemetryValue(
      { value: value ?? Number.NaN, unit: unit ?? definition?.unit, quality },
      { precision: precision ?? definition?.decimals, unknownLabel: "—" },
    );
    const trendInfo = !unavailable && !stale && trend && trend !== "unknown" ? TREND[trend] : null;
    const hideStatus = quietWhenNormal && state === "normal";

    return (
      <div
        ref={ref}
        data-reading-state={state}
        className={cn("flex min-w-0 flex-col gap-1 font-sans", className)}
        {...props}
      >
        <span className="break-words text-label-sm text-muted-foreground">{label ?? describeMetric(metric)}</span>
        <span className={cn("break-words text-title-sm tabular-nums", unavailable || stale ? "text-muted-foreground" : "text-foreground")}>
          {shown}
          {unavailable ? <span className="sr-only"> No reading</span> : null}
        </span>
        {stale ? <span data-last-known="" className="text-label-sm text-muted-foreground">Last known value</span> : null}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {hideStatus ? null : <MetricStatus state={state} />}
          {trendInfo ? (
            <span data-trend={trend} className="inline-flex items-center gap-1 text-label-sm text-muted-foreground">
              <Glyph name={trendInfo.glyph} size={12} />
              <span>{trendInfo.word}</span>
            </span>
          ) : null}
          {timestamp !== undefined && timestamp !== null ? <LastSync value={timestamp} now={now} className="text-label-sm" /> : null}
        </span>
      </div>
    );
  },
), "TelemetryMetric");

export { TelemetryMetric };
