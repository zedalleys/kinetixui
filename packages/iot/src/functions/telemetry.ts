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
  /** Decimal places. Omit to print the value as-is. */
  precision?: number;
  /** Shown when there is no usable value. Defaults to `"Unknown"`. */
  unknownLabel?: string;
};

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
  const text = typeof options.precision === "number" ? value.toFixed(Math.max(0, Math.trunc(options.precision))) : String(value);
  return point.unit ? `${text} ${point.unit}` : text;
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
