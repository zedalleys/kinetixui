"use client";

import * as React from "react";
import type { KinetixTelemetrySeries } from "../types/telemetry";
import { classifyTelemetryQuality, describeTelemetryQuality, latestPoint, telemetryExtent } from "../functions/telemetry";
import { SensorReading } from "./sensor-reading";
import { TelemetryTrend } from "./telemetry-trend";
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
 */
export interface TelemetryCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  series: KinetixTelemetrySeries | null | undefined;
  /** Display name for the metric, already localised. Defaults to the series' own `metric` key. */
  metric?: string;
  /** Decimal places for the value and the bounds. */
  precision?: number;
  /** Drop the plot and show only the reading. */
  hideTrend?: boolean;
  /** Plot height in pixels. */
  trendHeight?: number;
  /** Extra content below the plot — a control, a link, a note. */
  footer?: React.ReactNode;
  /** Reference instant for the "last reading" time. */
  now?: string | Date | number;
}

const TelemetryCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryCardProps>(
  ({ series, metric, precision, hideTrend = false, trendHeight, footer, now, className, ...props }, ref) => {
    const newest = latestPoint(series);
    const quality = classifyTelemetryQuality(newest);
    const extent = telemetryExtent(series);
    const name = metric ?? series?.metric ?? "Telemetry";

    return (
      <div
        ref={ref}
        data-quality={quality}
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 font-sans text-card-foreground",
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
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
          />
          {/* The freshness stamp sits with the reading rather than in a page header, which is where
              every product that gets this right puts it. */}
          {newest?.timestamp ? <LastSync value={newest.timestamp} now={now} className="shrink-0 text-label-sm" /> : null}
        </div>

        {hideTrend ? null : (
          <TelemetryTrend
            series={series}
            precision={precision}
            height={trendHeight}
            label={`${name} over the last ${extent.measured} reading${extent.measured === 1 ? "" : "s"}`}
          />
        )}

        {/* Only when there is something to qualify: a measured reading needs no annotation, and a
            label under every value trains people to stop reading them. */}
        {quality !== "good" ? (
          <p className="text-label-sm text-muted-foreground">{describeTelemetryQuality(quality)}</p>
        ) : null}

        {footer}
      </div>
    );
  },
), "TelemetryCard");

export { TelemetryCard };
