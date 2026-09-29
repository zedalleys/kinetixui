"use client";

import * as React from "react";
import type { KinetixTelemetrySeries } from "../types/telemetry";
import { classifyTelemetryQuality, formatTelemetryValue, sortTelemetryPoints, telemetryExtent } from "../functions/telemetry";
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
}

/** The plot's internal coordinate space. Width is arbitrary; the SVG stretches to its container. */
const VIEW_W = 100;

/**
 * Split an ordered series into the runs of consecutive drawable points.
 *
 * A run ends at the first point that is not a measurement, so the returned array is "the line
 * segments", and the spaces between them are the dropouts. A single-point run is kept: one reading
 * surrounded by silence is still a reading, and it is drawn as a dot rather than dropped.
 */
function drawableRuns(series: KinetixTelemetrySeries | null | undefined): { at: number; value: number }[][] {
  const runs: { at: number; value: number }[][] = [];
  let run: { at: number; value: number }[] = [];
  for (const { point, at } of sortTelemetryPoints(series)) {
    const quality = classifyTelemetryQuality(point);
    const usable = quality !== "missing" && quality !== "error" && typeof point.value === "number" && Number.isFinite(point.value);
    if (!usable) {
      if (run.length > 0) runs.push(run);
      run = [];
      continue;
    }
    run.push({ at, value: point.value });
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

const TelemetryTrend = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryTrendProps>(
  ({ series, label, precision, hideBounds = false, height = 48, emptyLabel, className, ...props }, ref) => {
    const extent = telemetryExtent(series);
    const runs = drawableRuns(series);
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
    const spanY = extent.max !== null && extent.min !== null ? extent.max - extent.min : 0;
    const x = (at: number) => (spanX === 0 ? VIEW_W / 2 : ((at - extent.from!) / spanX) * VIEW_W);
    const y = (value: number) => (spanY === 0 ? height / 2 : height - ((value - extent.min!) / spanY) * height);

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

        {hideBounds ? null : (
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
      </div>
    );
  },
), "TelemetryTrend");

export { TelemetryTrend };
