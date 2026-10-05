"use client";

import * as React from "react";
import type { KinetixMetricThresholds, KinetixTelemetrySeries } from "../types/telemetry";
import { classifyTelemetryQuality, describeTelemetryQuality, evaluateReading, latestPoint, telemetryExtent } from "../functions/telemetry";
import { MetricStatus } from "./metric-status";
import { SensorReading } from "./sensor-reading";
import { TelemetryTrend, type TelemetryTrendProps } from "./telemetry-trend";
import { LastSync } from "./last-sync";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * TelemetryCard — one metric: its newest reading, its recent shape, and how much to trust it.
 *
 * The composition every surveyed product converges on — a dominant current value, a small plot, and
 * the bounds in text — with one addition they all omit: when the newest point is `missing` or
 * `error`, the card says so in the place the number would be. Every reference shows a confident
 * figure in every tile, because a concept shot has no dropouts. A real fleet does.
 *
 * `latestPoint` decides what "newest" means (by timestamp, not array position), `SensorReading`
 * decides whether that value may be shown as a number, and `TelemetryTrend` decides where the line
 * breaks. This card arranges them and adds nothing to the semantics.
 *
 * Give it `thresholds` and/or `staleAfterMs` and it also states the reading's condition — a
 * `MetricStatus` glyph and word — and labels an out-of-date value "Last known" rather than letting it
 * pass as current. `trendProps` forwards the trend's own options (gaps, summary row, time range, the
 * "View data" table) without this card growing a prop for each.
 */
export interface TelemetryCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  series: KinetixTelemetrySeries | null | undefined;
  /** Display name for the metric, already localised. Defaults to the series' own `metric` key. */
  metric?: string;
  /** Decimal places for the value and the bounds. */
  precision?: number;
  /** Size of the headline value. `lg` (default) is a hero numeral; `md` is one line of text. */
  valueSize?: "md" | "lg" | "xl";
  /** Drop the plot and show only the reading. */
  hideTrend?: boolean;
  /** Plot height in pixels. */
  trendHeight?: number;
  /** Extra content below the plot — a control, a link, a note. */
  footer?: React.ReactNode;
  /** Reference instant for the "last reading" time. */
  now?: string | Date | number;
  /** Draw bounds on the trend and state the reading's condition. */
  thresholds?: KinetixMetricThresholds | null;
  /** A newest reading older than this is stale: shown as "Last known", not as current. */
  staleAfterMs?: number;
  /** Forwarded to the `TelemetryTrend`. `series`, `precision` and `height` stay this card's. */
  trendProps?: Omit<TelemetryTrendProps, "series" | "precision" | "height" | "thresholds" | "staleAfterMs" | "now">;
}

const TelemetryCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryCardProps>(
  ({ series, metric, precision, valueSize = "lg", hideTrend = false, trendHeight, footer, now, thresholds, staleAfterMs, trendProps, className, ...props }, ref) => {
    const newest = latestPoint(series);
    const quality = classifyTelemetryQuality(newest);
    const extent = telemetryExtent(series);
    const name = metric ?? series?.metric ?? "Telemetry";
    // Only judged when the caller opted in, so existing cards render exactly as before.
    const judged = thresholds !== undefined || staleAfterMs !== undefined;
    const evaluation = judged
      ? evaluateReading({
          value: newest?.value,
          quality: newest?.quality,
          timestamp: newest?.timestamp,
          metric: series?.metric,
          thresholds,
          now,
          staleAfterMs,
        })
      : null;

    return (
      <div
        ref={ref}
        data-quality={quality}
        className={cn(
          "flex flex-col gap-4 rounded-2xl bg-card p-4 font-sans text-card-foreground shadow-sm sm:p-5",
          "transition-colors duration-base ease-enter motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <SensorReading
            metric={name}
            value={newest?.value}
            unit={newest?.unit}
            quality={newest?.quality}
            precision={precision}
            size={valueSize}
          />
          {/* The freshness stamp sits with the reading rather than in a page header, which is where
              every product that gets this right puts it. */}
          {newest?.timestamp ? <LastSync value={newest.timestamp} now={now} className="shrink-0 text-label-md" /> : null}
        </div>

        {hideTrend ? null : (
          <TelemetryTrend
            series={series}
            precision={precision}
            height={trendHeight}
            thresholds={thresholds}
            staleAfterMs={staleAfterMs}
            now={now}
            {...trendProps}
            label={trendProps?.label ?? `${name} over the last ${extent.measured} reading${extent.measured === 1 ? "" : "s"}`}
          />
        )}

        {/* Only when there is something to qualify: a measured reading needs no annotation, and a
            label under every value trains people to stop reading them. */}
        {evaluation ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-label-md text-muted-foreground">
            <MetricStatus state={evaluation.state} />
            {evaluation.state === "stale" ? <span data-last-known="">Last known value, out of date</span> : null}
          </p>
        ) : null}
        {quality !== "good" ? (
          <p className="text-label-md text-muted-foreground">{describeTelemetryQuality(quality)}</p>
        ) : null}

        {footer}
      </div>
    );
  },
), "TelemetryCard");

export { TelemetryCard };
