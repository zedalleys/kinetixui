"use client";

import * as React from "react";
import type { KinetixMetricThresholds, KinetixTelemetrySeries } from "../types/telemetry";
import { resolveMetricThresholds } from "../functions/metrics";
import {
  classifyTelemetryQuality,
  describeReadingState,
  describeSeriesForAssistiveTech,
  describeTelemetryQuality,
  detectSeriesGaps,
  detectStaleReading,
  evaluateReading,
  formatTelemetryValue,
  sortTelemetryPoints,
  summarizeSeries,
  telemetryExtent,
} from "../functions/telemetry";
import { MetricStatus } from "./metric-status";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * TelemetryTrend — a series over time, with its gaps left as gaps.
 *
 * Three decisions distinguish this from a sparkline:
 *
 * **Missing readings break the line.** A point whose quality is `missing` or `error`, or whose value
 * is not finite, ends the current segment and starts a new one after it. Nothing is interpolated
 * across a dropout, because a straight line between two readings an hour apart is a claim that the
 * sensor was answering in between — the exact claim `quality` exists to prevent. A dropout is drawn
 * as absence, which is what it is.
 *
 * **The bounds are text.** Every product reference worth copying writes its axis endpoints out
 * (`0`/`100%`, `00:00`/`24:00`, `16°`/`32°`) rather than leaving them to be inferred from pixel
 * positions. Doing the same here means the chart's textual equivalent is not a hidden parallel
 * description that can drift — it is the visible footer, read by everyone.
 *
 * **The plot stays left-to-right under RTL.** The surrounding text uses logical properties and flips,
 * but the SVG is pinned `dir="ltr"` so oldest is always at the start edge of the plot. Mirroring a
 * time axis would make the same series tell opposite stories in two locales, and "this line is
 * rising" is a statement about the data, not about the page.
 *
 * There is no chart library here, and no canvas: one `<svg>` with one or more `<polyline>` elements.
 *
 * ## Optional additions (all off unless asked for; the original props are unchanged)
 *
 * - `thresholds` draws each bound as a **line with its own dash pattern** (warning dashed, critical
 *   dotted) and lists it in a legend that names the bound in words — a threshold is never only a
 *   colour. The plot's range widens to include them so they are always on screen.
 * - `maxGapMs` breaks the line wherever two measured points are further apart than that, in addition
 *   to breaking at `missing`/`error` points. Still nothing is interpolated.
 * - `staleAfterMs` marks the last reading with a dashed vertical rule and a "Stale" status when it is
 *   too old to present as current.
 * - `showSummary` prints Min / Average / Max (and the latest value) instead of the bare range;
 *   `showTimeRange` prints the span of time covered.
 * - **The plot always has a text equivalent.** `describeSeriesForAssistiveTech` supplies a paragraph
 *   linked from the plot with `aria-describedby`; it lives in a `hidden` element, which is a valid
 *   description source and is not read a second time by browse-mode. `dataTable` adds a real
 *   `<table>` inside `<details>` ("View data") so every point is available without a pointer, a
 *   colour, or the chart.
 */
export interface TelemetryTrendProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  series: KinetixTelemetrySeries | null | undefined;
  /**
   * Accessible name for the plot. Defaults to a generated summary of the same facts the footer
   * shows. It replaces the name, never removes it.
   */
  label?: string;
  /** Decimal places for the printed bounds. Omit to print them as given. */
  precision?: number;
  /** Drop the min/max footer. Only do this where the same numbers are already beside the chart. */
  hideBounds?: boolean;
  /** Plot height in pixels. The width always fills the container. */
  height?: number;
  /** Shown in place of a plot when nothing in the series can be drawn. */
  emptyLabel?: string;
  /** Draw warning/critical bounds. Merged over the metric registry's defaults, field by field. */
  thresholds?: KinetixMetricThresholds | null;
  /** Break the line where measured points are further apart than this many milliseconds. */
  maxGapMs?: number;
  /** Mark the newest reading stale when it is older than this. Needs `now` for a deterministic result. */
  staleAfterMs?: number;
  /** Reference instant for staleness. */
  now?: string | Date | number | null;
  /** Print Min / Average / Max (and Latest) below the plot instead of the bare range. */
  showSummary?: boolean;
  /** Print the time span the series covers. */
  showTimeRange?: boolean;
  /** How a millisecond stamp reads. Defaults to `YYYY-MM-DD HH:MM UTC`, which needs no locale. */
  formatTime?: (at: number) => string;
  /** Add a "View data" `<details>` holding every point in a `<table>`. */
  dataTable?: boolean;
  /** Most recent rows the table shows. Defaults to 50. */
  maxTableRows?: number;
  /** Label for the data disclosure. Defaults to "View data". */
  dataLabel?: string;
}

/** The plot's internal coordinate space. Width is arbitrary; the SVG stretches to its container. */
const VIEW_W = 100;

const defaultFormatTime = (at: number) => `${new Date(at).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/** Warning is dashed, critical is dotted: two patterns, so the two levels differ without colour. */
const DASH = { warning: "4 3", critical: "1 3" } as const;

/**
 * Split an ordered series into the runs of consecutive drawable points.
 *
 * A run ends at the first point that is not a measurement, so the returned array is "the line
 * segments", and the spaces between them are the dropouts. A single-point run is kept: one reading
 * surrounded by silence is still a reading, and it is drawn as a dot rather than dropped.
 */
function drawableRuns(series: KinetixTelemetrySeries | null | undefined, maxGapMs?: number): { at: number; value: number }[][] {
  const runs: { at: number; value: number }[][] = [];
  let run: { at: number; value: number }[] = [];
  const gapLimit = typeof maxGapMs === "number" && Number.isFinite(maxGapMs) && maxGapMs > 0 ? maxGapMs : null;
  for (const { point, at } of sortTelemetryPoints(series)) {
    const quality = classifyTelemetryQuality(point);
    const usable = quality !== "missing" && quality !== "error" && typeof point.value === "number" && Number.isFinite(point.value);
    if (!usable) {
      if (run.length > 0) runs.push(run);
      run = [];
      continue;
    }
    // A silence longer than the caller's limit ends the run even though both neighbours are real.
    const previous = run[run.length - 1];
    if (gapLimit !== null && previous && at - previous.at > gapLimit) {
      runs.push(run);
      run = [];
    }
    run.push({ at, value: point.value });
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/** Every point as a real table, newest last, capped so a long series cannot flood the page. */
function DataTable({
  series, precision, fmtTime, thresholds, maxRows,
}: {
  series: KinetixTelemetrySeries | null | undefined;
  precision: number | undefined;
  fmtTime: (at: number) => string;
  thresholds: KinetixMetricThresholds | null | undefined;
  maxRows: number;
}) {
  const all = sortTelemetryPoints(series);
  const limit = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 50;
  const rows = all.length > limit ? all.slice(all.length - limit) : all;
  const withStatus = thresholds !== undefined;
  const unit = series?.points?.find((p) => typeof p?.unit === "string" && p.unit.length > 0)?.unit;
  return (
    <div className="flex flex-col gap-1.5">
      <table className="w-full border-collapse text-label-sm">
        <caption className="sr-only">{series?.metric ?? "Telemetry"} readings, oldest first</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="py-1 pe-3 text-start font-normal">Time</th>
            <th scope="col" className="py-1 pe-3 text-start font-normal">Value</th>
            <th scope="col" className="py-1 pe-3 text-start font-normal">Quality</th>
            {withStatus ? <th scope="col" className="py-1 text-start font-normal">Status</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ point, at }, i) => {
            const quality = classifyTelemetryQuality(point);
            return (
              <tr key={i} className="border-b border-border/60 text-foreground">
                <td className="py-1 pe-3 align-top">
                  <time dateTime={new Date(at).toISOString()}>{fmtTime(at)}</time>
                </td>
                <td className="py-1 pe-3 align-top tabular-nums">
                  {formatTelemetryValue({ value: point.value, unit: point.unit ?? unit, quality }, { precision, unknownLabel: "No reading" })}
                </td>
                <td className="py-1 pe-3 align-top">{describeTelemetryQuality(quality)}</td>
                {withStatus ? (
                  <td className="py-1 align-top">
                    {describeReadingState(
                      evaluateReading({ value: point.value, quality, timestamp: point.timestamp, metric: series?.metric, thresholds }).state,
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {all.length > rows.length ? (
        <p className="text-muted-foreground">
          Showing the latest {rows.length} of {all.length} points.
        </p>
      ) : null}
    </div>
  );
}

const TelemetryTrend = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryTrendProps>(
  (
    {
      series, label, precision, hideBounds = false, height = 48, emptyLabel, thresholds, maxGapMs, staleAfterMs, now,
      showSummary = false, showTimeRange = false, formatTime, dataTable = false, maxTableRows = 50, dataLabel, className, ...props
    },
    ref,
  ) => {
    const descriptionId = React.useId();
    const extent = telemetryExtent(series);
    const runs = drawableRuns(series, maxGapMs);
    const fmtTime = formatTime ?? defaultFormatTime;
    const summaryStats = summarizeSeries(series);
    const resolvedThresholds = thresholds === undefined ? null : resolveMetricThresholds(series?.metric, thresholds);
    const bounds = resolvedThresholds
      ? (
          [
            ["critical", "high", resolvedThresholds.criticalHigh],
            ["warning", "high", resolvedThresholds.warningHigh],
            ["warning", "low", resolvedThresholds.warningLow],
            ["critical", "low", resolvedThresholds.criticalLow],
          ] as const
        ).flatMap(([level, side, value]) => (typeof value === "number" && Number.isFinite(value) ? [{ level, side, value }] : []))
      : [];
    const staleLatest =
      staleAfterMs !== undefined && summaryStats.latest !== null && detectStaleReading(summaryStats.latest.timestamp, staleAfterMs, now);
    const gapCount = maxGapMs !== undefined ? detectSeriesGaps(series, { maxGapMs }).length : 0;
    const unit = series?.points?.find((point) => typeof point?.unit === "string" && point.unit.length > 0)?.unit;
    const empty = extent.min === null || extent.max === null;

    const print = (value: number | null) =>
      formatTelemetryValue({ value: value ?? Number.NaN, unit }, { precision, unknownLabel: emptyLabel ?? "Unknown" });

    /**
     * Map a point into the view box.
     *
     * A zero-width span (one reading, or several sharing a timestamp) puts everything at the centre
     * rather than dividing by zero, and a zero-height span draws a flat line through the middle —
     * which is the honest picture of a value that did not move.
     */
    const spanX = extent.to !== null && extent.from !== null ? extent.to - extent.from : 0;
    // With thresholds the vertical range widens to include them, so a bound is never off-plot. Without
    // them it is exactly the data's own range, as before.
    const domainMin = extent.min === null ? null : Math.min(extent.min, ...bounds.map((b) => b.value));
    const domainMax = extent.max === null ? null : Math.max(extent.max, ...bounds.map((b) => b.value));
    const spanY = domainMax !== null && domainMin !== null ? domainMax - domainMin : 0;
    const x = (at: number) => (spanX === 0 ? VIEW_W / 2 : ((at - extent.from!) / spanX) * VIEW_W);
    const y = (value: number) => (spanY === 0 ? height / 2 : height - ((value - domainMin!) / spanY) * height);

    const summary = empty
      ? `${series?.metric ?? "Telemetry"}: no readings to plot`
      : `${series?.metric ?? "Telemetry"}: ${extent.measured} reading${extent.measured === 1 ? "" : "s"} ` +
        `from ${print(extent.min)} to ${print(extent.max)}` +
        (extent.missing > 0 ? `, ${extent.missing} missing` : "");

    return (
      <div
        ref={ref}
        data-empty={empty ? "" : undefined}
        className={cn("flex flex-col gap-1.5 font-sans", className)}
        {...props}
      >
        <div
          role="img"
          aria-label={resolveLabel(label, summary)}
          aria-describedby={descriptionId}
          // Pinned LTR: the plot's reading order belongs to the data, not the page. See the note above.
          dir="ltr"
          className="relative w-full overflow-hidden rounded-sm bg-muted/40"
          style={{ height }}
        >
          {empty ? null : (
            <svg
              aria-hidden="true"
              className="block h-full w-full text-foreground"
              viewBox={`0 0 ${VIEW_W} ${height}`}
              preserveAspectRatio="none"
              focusable="false"
            >
              {bounds.map((b) => (
                <line
                  key={`${b.level}-${b.side}`}
                  data-threshold={`${b.level}-${b.side}`}
                  x1={0}
                  x2={VIEW_W}
                  y1={y(b.value)}
                  y2={y(b.value)}
                  stroke="currentColor"
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  strokeDasharray={DASH[b.level]}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {staleLatest && summaryStats.latestAt !== null ? (
                <line
                  data-stale-marker=""
                  x1={x(summaryStats.latestAt)}
                  x2={x(summaryStats.latestAt)}
                  y1={0}
                  y2={height}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {runs.map((run, index) => {
                const points = run.map((entry) => `${x(entry.at)},${y(entry.value)}`).join(" ");
                // A one-point run has no line to draw, so it becomes a dot — visible, and still a gap
                // on both sides rather than a line reaching out to its neighbours.
                if (run.length === 1) {
                  return (
                    <circle
                      key={index}
                      cx={x(run[0]!.at)}
                      cy={y(run[0]!.value)}
                      r={1.5}
                      fill="currentColor"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }
                return (
                  <polyline
                    key={index}
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // Without this, `preserveAspectRatio="none"` stretches the stroke with the geometry
                    // and the line thickens as the container widens.
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
          )}
          {empty ? (
            <span className="absolute inset-0 flex items-center justify-center text-label-sm text-muted-foreground">
              {emptyLabel ?? "No readings"}
            </span>
          ) : null}
        </div>

        {/* The text equivalent of the plot. `hidden` is a valid `aria-describedby` target, so it is
            read once as the plot's description rather than a second time as loose text. */}
        <p id={descriptionId} hidden data-series-description="">
          {describeSeriesForAssistiveTech(series, {
            thresholds: thresholds ?? undefined,
            now,
            staleAfterMs,
            maxGapMs,
            decimals: precision,
            formatTime: fmtTime,
          })}
        </p>

        {bounds.length > 0 ? (
          <ul aria-label="Thresholds" className="flex flex-wrap gap-x-4 gap-y-0.5 text-label-sm text-muted-foreground">
            {bounds.map((b) => (
              <li key={`${b.level}-${b.side}`} data-threshold-legend={`${b.level}-${b.side}`} className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" focusable="false" width={20} height={6} viewBox="0 0 20 6" className="shrink-0">
                  <line x1={0} x2={20} y1={3} y2={3} stroke="currentColor" strokeWidth={1.5} strokeDasharray={DASH[b.level]} />
                </svg>
                <span>
                  {b.level === "critical" ? "Critical" : "Warning"} {b.side === "high" ? "at or above" : "at or below"} {print(b.value)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {showTimeRange && extent.from !== null && extent.to !== null ? (
          <p data-time-range="" className="text-label-sm text-muted-foreground">
            <time dateTime={new Date(extent.from).toISOString()}>{fmtTime(extent.from)}</time>
            {" – "}
            <time dateTime={new Date(extent.to).toISOString()}>{fmtTime(extent.to)}</time>
          </p>
        ) : null}

        {showSummary && !empty ? (
          <dl data-summary="" className="flex flex-wrap gap-x-5 gap-y-0.5 text-label-sm">
            {(
              [
                ["Min", summaryStats.min],
                ["Average", summaryStats.avg],
                ["Max", summaryStats.max],
              ] as const
            ).map(([name, v]) => (
              <div key={name} className="flex gap-1.5">
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="tabular-nums text-foreground">{print(v)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {hideBounds || showSummary ? null : (
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-label-sm text-muted-foreground">
            <span>{empty ? (emptyLabel ?? "No readings") : `${print(extent.min)} – ${print(extent.max)}`}</span>
            {/* Stated, not implied by a shorter line: a gap the reader cannot count is a gap they will not notice. */}
            {extent.missing > 0 ? (
              <span data-missing={extent.missing}>
                {extent.missing} missing of {extent.measured + extent.missing}
              </span>
            ) : null}
          </p>
        )}

        {(showSummary && extent.missing > 0) || gapCount > 0 || staleLatest ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-label-sm text-muted-foreground">
            {showSummary && extent.missing > 0 ? (
              <span data-missing={extent.missing}>
                {extent.missing} missing of {extent.measured + extent.missing}
              </span>
            ) : null}
            {gapCount > 0 ? (
              <span data-gaps={gapCount}>
                {gapCount} {gapCount === 1 ? "gap" : "gaps"} in the data
              </span>
            ) : null}
            {staleLatest ? (
              <span data-stale="" className="inline-flex items-center gap-1.5">
                <MetricStatus state="stale" />
                <span>Latest reading is out of date</span>
              </span>
            ) : null}
          </p>
        ) : null}

        {dataTable && !empty ? (
          <details data-data-table="" className="text-label-sm">
            <summary className="min-h-9 cursor-pointer py-1.5 text-label-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {dataLabel ?? "View data"}
            </summary>
            <DataTable
              series={series}
              precision={precision}
              fmtTime={fmtTime}
              thresholds={thresholds}
              maxRows={maxTableRows}
            />
          </details>
        ) : null}
      </div>
    );
  },
), "TelemetryTrend");

export { TelemetryTrend };
