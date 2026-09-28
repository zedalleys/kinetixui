import type { KinetixTelemetryPoint, KinetixTelemetryQuality, KinetixTelemetrySeries } from "../types/telemetry";
import { parseTimestamp, resolveNow } from "./time";

/**
 * Telemetry helpers.
 *
 * The recurring bug these exist for is a missing reading rendered as `0`, and a three-hour-old
 * reading rendered as if it were live. Both are cases where the honest output is a word rather than a
 * number, so the formatters return one.
 */

export type FormatTelemetryOptions = {
  /**
   * Decimal places. Omit to print the value as-is.
   *
   * Clamped to the 0–100 that `toFixed` accepts, and a non-finite value is treated as absent. A
   * formatter whose whole job is to avoid presenting a misleading number must not be the thing that
   * throws in the middle of a render.
   */
  precision?: number;
  /** Shown when there is no usable value. Defaults to `"Unknown"`. */
  unknownLabel?: string;
};

/** The largest fraction digit count `Number.prototype.toFixed` accepts; beyond it, it throws. */
const MAX_FIXED_DIGITS = 100;

/**
 * A reading as text: `"23.4 °C"`, or `"72 %"`, or the unknown label.
 *
 * A non-finite value, or a point whose `quality` is `missing` or `error`, formats as the unknown
 * label and never as a number — the quality field exists precisely so this can be true.
 */
export function formatTelemetryValue(
  point: Pick<KinetixTelemetryPoint, "value" | "unit" | "quality"> | null | undefined,
  options: FormatTelemetryOptions = {},
): string {
  const unknown = options.unknownLabel ?? "Unknown";
  if (!point) return unknown;
  if (point.quality === "missing" || point.quality === "error") return unknown;
  const { value } = point;
  if (typeof value !== "number" || !Number.isFinite(value)) return unknown;
  const digits = fixedDigits(options.precision);
  const text = digits === null ? String(value) : value.toFixed(digits);
  return point.unit ? `${text} ${point.unit}` : text;
}

/**
 * The `toFixed` digit count to use, or `null` to print the value as given.
 *
 * `toFixed` throws a `RangeError` outside 0–100, so an out-of-range `precision` is clamped into it
 * rather than allowed to become an exception thrown from inside a component's render.
 */
function fixedDigits(precision: number | undefined): number | null {
  if (typeof precision !== "number" || !Number.isFinite(precision)) return null;
  return Math.min(MAX_FIXED_DIGITS, Math.max(0, Math.trunc(precision)));
}

/**
 * The quality to act on, which is not always the quality that was reported.
 *
 * An explicit `quality` wins. Otherwise a finite value is `good` and anything else is `missing`, so a
 * payload that omitted the field does not get the benefit of the doubt for a `NaN`.
 */
export function classifyTelemetryQuality(
  point: Pick<KinetixTelemetryPoint, "value" | "quality"> | null | undefined,
): KinetixTelemetryQuality {
  if (!point) return "missing";
  if (point.quality) return point.quality;
  return typeof point.value === "number" && Number.isFinite(point.value) ? "good" : "missing";
}

/**
 * Whether a reading is too old to present as current.
 *
 * **A missing or unparseable timestamp is stale.** Freshness is a claim, and an absent timestamp is
 * not evidence for it — the alternative default would let a reading with no time on it render as live.
 *
 * A non-positive or non-finite threshold is also stale, rather than quietly meaning "never stale".
 */
export function detectStaleReading(
  timestamp: string | Date | number | null | undefined,
  thresholdMs: number,
  now?: string | Date | number | null,
): boolean {
  const read = parseTimestamp(timestamp ?? null);
  if (!read) return true;
  if (typeof thresholdMs !== "number" || !Number.isFinite(thresholdMs) || thresholdMs <= 0) return true;
  return resolveNow(now) - read.getTime() > thresholdMs;
}

/**
 * The most recent point in a series, by timestamp, or `null` for an empty series.
 *
 * Points are not assumed to be sorted, and points with an unusable timestamp are skipped rather than
 * treated as epoch zero — which would make an undated reading the oldest thing in every series.
 *
 * Ties go to the point that appears **last** in the array. Two readings sharing a timestamp is a
 * duplicate-delivery artefact rather than a meaningful ordering, and preferring the later element is
 * at least the one a caller appending to a series would expect to win.
 */
export function latestPoint(series: KinetixTelemetrySeries | null | undefined): KinetixTelemetryPoint | null {
  if (!series || !Array.isArray(series.points)) return null;
  let best: KinetixTelemetryPoint | null = null;
  let bestAt = -Infinity;
  for (const point of series.points) {
    const at = parseTimestamp(point?.timestamp ?? null);
    if (!at) continue;
    if (at.getTime() >= bestAt) {
      best = point;
      bestAt = at.getTime();
    }
  }
  return best;
}

/** Human-readable text for a telemetry quality. The word a reading is annotated with. */
export function describeTelemetryQuality(quality: KinetixTelemetryQuality): string {
  switch (quality) {
    case "good":
      return "Measured";
    case "estimated":
      return "Estimated";
    case "missing":
      return "No reading";
    case "error":
      return "Sensor error";
  }
}

/**
 * A series' points in time order, each paired with the timestamp that was parsed out of it.
 *
 * Points whose timestamp is unusable are **dropped**, not sorted to the front. A reading with no time
 * on it cannot be placed on a time axis, and placing it anyway is how an undated value ends up
 * rendered as the oldest or newest thing in a chart.
 *
 * The returned `at` is a millisecond stamp, so a caller plotting the series does not parse each
 * timestamp a second time.
 */
export function sortTelemetryPoints(
  series: KinetixTelemetrySeries | null | undefined,
): { point: KinetixTelemetryPoint; at: number }[] {
  if (!series || !Array.isArray(series.points)) return [];
  const dated: { point: KinetixTelemetryPoint; at: number }[] = [];
  for (const point of series.points) {
    const parsed = parseTimestamp(point?.timestamp ?? null);
    if (!parsed) continue;
    dated.push({ point, at: parsed.getTime() });
  }
  return dated.sort((a, b) => a.at - b.at);
}

/**
 * The bounds of a series, over the points that are actually measurements.
 *
 * `missing` and `error` points, and non-finite values, are excluded from `min`/`max` and counted in
 * `missing` instead. That is the whole reason this is not `Math.min(...values)`: a series where the
 * sensor dropped out reports those gaps as `value: 0, quality: "missing"` often enough that letting
 * them into the extent would drag the axis to zero and make a flat-lining sensor look like a real
 * measurement of nothing.
 *
 * `null` bounds mean there is nothing plottable — a caller must render an empty state rather than an
 * axis from `null` to `null`. `from`/`to` still describe the time span the series covers, because a
 * window with no readings in it is itself worth showing.
 */
export type KinetixTelemetryExtent = {
  /** Lowest measured value, or `null` when nothing was measured. */
  min: number | null;
  /** Highest measured value, or `null` when nothing was measured. */
  max: number | null;
  /** First and last usable timestamps, as millisecond stamps, or `null` for an empty series. */
  from: number | null;
  to: number | null;
  /** How many points carry a value that may be plotted. */
  measured: number;
  /** How many points are present but unusable as measurements. */
  missing: number;
};

export function telemetryExtent(series: KinetixTelemetrySeries | null | undefined): KinetixTelemetryExtent {
  const ordered = sortTelemetryPoints(series);
  let min: number | null = null;
  let max: number | null = null;
  let measured = 0;
  let missing = 0;

  for (const { point } of ordered) {
    const quality = classifyTelemetryQuality(point);
    if (quality === "missing" || quality === "error") {
      missing += 1;
      continue;
    }
    const { value } = point;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      missing += 1;
      continue;
    }
    measured += 1;
    if (min === null || value < min) min = value;
    if (max === null || value > max) max = value;
  }

  return {
    min,
    max,
    from: ordered.length > 0 ? ordered[0]!.at : null,
    to: ordered.length > 0 ? ordered[ordered.length - 1]!.at : null,
    measured,
    missing,
  };
}
