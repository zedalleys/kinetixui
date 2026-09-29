import type {
  KinetixMetricThresholds,
  KinetixReadingGlyph,
  KinetixReadingState,
  KinetixTelemetryPoint,
  KinetixTelemetryQuality,
  KinetixTelemetrySeries,
} from "../types/telemetry";
import { describeMetric, getMetricDefinition, resolveMetricThresholds } from "./metrics";
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

// ---------------------------------------------------------------------------------------------
// Readings against thresholds, and series summaries.
// ---------------------------------------------------------------------------------------------

/** The word for a reading state. Always shown alongside colour, never instead of it. */
export function describeReadingState(state: KinetixReadingState): string {
  switch (state) {
    case "normal":
      return "Normal";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "stale":
      return "Stale";
    case "unavailable":
      return "Unavailable";
  }
}

/** The semantic glyph key for a state, so no state is distinguished by colour alone. */
export function readingStateGlyph(state: KinetixReadingState): KinetixReadingGlyph {
  switch (state) {
    case "normal":
      return "check";
    case "warning":
      return "triangle";
    case "critical":
      return "octagon";
    case "stale":
      return "clock";
    case "unavailable":
      return "dash";
  }
}

/** Which side of its range a threshold breach is on. */
export type KinetixBreachSide = "low" | "high";

/** Threshold classification of a bare number: `normal`, `warning` or `critical`, and the side if not normal. */
export function classifyAgainstThresholds(
  value: number,
  thresholds: KinetixMetricThresholds,
): { level: "normal" | "warning" | "critical"; side?: KinetixBreachSide } {
  const t = thresholds;
  const has = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);
  if (has(t.criticalLow) && value <= t.criticalLow) return { level: "critical", side: "low" };
  if (has(t.criticalHigh) && value >= t.criticalHigh) return { level: "critical", side: "high" };
  if (has(t.warningLow) && value <= t.warningLow) return { level: "warning", side: "low" };
  if (has(t.warningHigh) && value >= t.warningHigh) return { level: "warning", side: "high" };
  return { level: "normal" };
}

export type EvaluateReadingInput = {
  value?: number | null;
  quality?: KinetixTelemetryQuality;
  timestamp?: string | Date | number | null;
  /** Metric key. Supplies default thresholds from the registry. */
  metric?: string;
  /** Product overrides, merged over the registry defaults field by field. */
  thresholds?: KinetixMetricThresholds | null;
  now?: string | Date | number | null;
  /** When given, an older (or undated) reading is `stale`. Omit to skip the age check. */
  staleAfterMs?: number;
};

export type KinetixReadingEvaluation = {
  state: KinetixReadingState;
  /** The threshold result for the value itself, even when `state` is `stale` — what it *would* have been. */
  level: "normal" | "warning" | "critical" | null;
  side?: KinetixBreachSide;
  word: string;
  glyph: KinetixReadingGlyph;
};

/**
 * Judge one reading.
 *
 * Precedence: `unavailable` (no usable value) beats `stale` (old) beats the threshold result. A stale
 * reading is not called `normal` however in-range it is, because an old number is not evidence of a
 * current condition. `level` still reports what the number alone would have been.
 */
export function evaluateReading(input: EvaluateReadingInput): KinetixReadingEvaluation {
  const { value, quality } = input;
  const usable =
    typeof value === "number" && Number.isFinite(value) && quality !== "missing" && quality !== "error";
  const thresholds = resolveMetricThresholds(input.metric, input.thresholds);
  const judged = usable ? classifyAgainstThresholds(value, thresholds) : null;

  let state: KinetixReadingState;
  if (!usable) state = "unavailable";
  else if (input.staleAfterMs !== undefined && detectStaleReading(input.timestamp, input.staleAfterMs, input.now)) state = "stale";
  else state = judged!.level;

  const out: KinetixReadingEvaluation = {
    state,
    level: judged ? judged.level : null,
    word: describeReadingState(state),
    glyph: readingStateGlyph(state),
  };
  if (judged?.side) out.side = judged.side;
  return out;
}

export type KinetixSeriesTrend = "rising" | "falling" | "steady" | "unknown";

export type KinetixSeriesSummary = {
  /** Points supplied, of every kind. */
  count: number;
  /** Points that are dated measurements. */
  measured: number;
  /** Points supplied but not usable as a measurement: missing, error, non-finite or undated. */
  missingCount: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  /** `max - min`, or `null` with nothing measured. */
  range: number | null;
  /** The most recent *measured* point. A newer missing point does not displace it. */
  latest: KinetixTelemetryPoint | null;
  latestAt: number | null;
  trend: KinetixSeriesTrend;
};

export type SummarizeSeriesOptions = {
  /**
   * How far the last measured value must be from the first to count as moving, in the metric's own
   * units. Defaults to 5% of the series range. A non-finite or negative value falls back to that.
   */
  tolerance?: number;
};

/** Measured points in time order. Ties keep input order, so the result is deterministic. */
function measuredPoints(series: KinetixTelemetrySeries | null | undefined): { point: KinetixTelemetryPoint; at: number }[] {
  return sortTelemetryPoints(series).filter(({ point }) => {
    const quality = classifyTelemetryQuality(point);
    return quality !== "missing" && quality !== "error" && typeof point.value === "number" && Number.isFinite(point.value);
  });
}

/**
 * Summarise a series. Every field survives an empty series, an all-missing one, a single point,
 * out-of-order points and `NaN` — the answer is `null`/`unknown`, never a made-up zero.
 *
 * Trend compares the last measured value with the first. It is a coarse "which way did it go"
 * signal, not a fit: two points can be `rising`, and a series that climbs then returns is `steady`.
 * Fewer than two measurements is `unknown`.
 */
export function summarizeSeries(
  series: KinetixTelemetrySeries | null | undefined,
  options: SummarizeSeriesOptions = {},
): KinetixSeriesSummary {
  const count = series && Array.isArray(series.points) ? series.points.length : 0;
  const ordered = measuredPoints(series);
  if (ordered.length === 0) {
    return { count, measured: 0, missingCount: count, min: null, max: null, avg: null, range: null, latest: null, latestAt: null, trend: "unknown" };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const { point } of ordered) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
    sum += point.value;
  }
  const range = max - min;
  const last = ordered[ordered.length - 1]!;

  let trend: KinetixSeriesTrend = "unknown";
  if (ordered.length >= 2) {
    const tolerance =
      typeof options.tolerance === "number" && Number.isFinite(options.tolerance) && options.tolerance >= 0
        ? options.tolerance
        : range * 0.05;
    const delta = last.point.value - ordered[0]!.point.value;
    trend = delta > tolerance ? "rising" : delta < -tolerance ? "falling" : "steady";
  }

  return {
    count,
    measured: ordered.length,
    missingCount: count - ordered.length,
    min,
    max,
    avg: sum / ordered.length,
    range,
    latest: last.point,
    latestAt: last.at,
    trend,
  };
}

export type KinetixSeriesGap = {
  /** Millisecond stamps of the measured points either side of the gap. */
  fromAt: number;
  toAt: number;
  durationMs: number;
};

export type DetectSeriesGapsOptions = {
  /** A silence longer than this is a gap. Wins over `expectedIntervalMs`. */
  maxGapMs?: number;
  /** How often the sensor reports. A gap is longer than this times `toleranceFactor`. */
  expectedIntervalMs?: number;
  /** Defaults to 2: one missed report is jitter, two is a gap. */
  toleranceFactor?: number;
};

/**
 * Silences between consecutive *measured* points. Missing-quality points do not bridge a gap — a
 * sensor reporting `missing` every minute has not been heard from. With no usable threshold the
 * answer is no gaps, since none can be claimed.
 */
export function detectSeriesGaps(
  series: KinetixTelemetrySeries | null | undefined,
  options: DetectSeriesGapsOptions = {},
): KinetixSeriesGap[] {
  const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  let limit: number | null = null;
  if (positive(options.maxGapMs)) limit = options.maxGapMs;
  else if (positive(options.expectedIntervalMs)) {
    limit = options.expectedIntervalMs * (positive(options.toleranceFactor) ? options.toleranceFactor : 2);
  }
  if (limit === null) return [];

  const ordered = measuredPoints(series);
  const gaps: KinetixSeriesGap[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const durationMs = ordered[i]!.at - ordered[i - 1]!.at;
    if (durationMs > limit) gaps.push({ fromAt: ordered[i - 1]!.at, toAt: ordered[i]!.at, durationMs });
  }
  return gaps;
}

export type KinetixThresholdCrossing = {
  /** Millisecond stamp of the reading that changed level. */
  at: number;
  value: number;
  from: "normal" | "warning" | "critical";
  to: "normal" | "warning" | "critical";
  side?: KinetixBreachSide;
};

/**
 * Every point at which the series changed threshold level, in time order. The first measurement has
 * nothing before it and so is never a crossing. Returning to `normal` is a crossing too — a UI
 * showing "recovered at 14:02" needs it.
 */
export function thresholdCrossings(
  series: KinetixTelemetrySeries | null | undefined,
  thresholds?: KinetixMetricThresholds | null,
): KinetixThresholdCrossing[] {
  const resolved = resolveMetricThresholds(series?.metric, thresholds);
  const crossings: KinetixThresholdCrossing[] = [];
  let previous: "normal" | "warning" | "critical" | null = null;
  for (const { point, at } of measuredPoints(series)) {
    const judged = classifyAgainstThresholds(point.value, resolved);
    if (previous !== null && judged.level !== previous) {
      const crossing: KinetixThresholdCrossing = { at, value: point.value, from: previous, to: judged.level };
      if (judged.side) crossing.side = judged.side;
      crossings.push(crossing);
    }
    previous = judged.level;
  }
  return crossings;
}

export type DescribeSeriesOptions = {
  /** Override the label. Defaults to the registry's for the series' metric. */
  label?: string;
  /** Override the unit. Defaults to the points' own, then the registry's. */
  unit?: string;
  decimals?: number;
  thresholds?: KinetixMetricThresholds | null;
  now?: string | Date | number | null;
  /** When given, the paragraph says whether the latest reading is stale. */
  staleAfterMs?: number;
  /** When given, gaps longer than this are reported. */
  maxGapMs?: number;
  /** How a millisecond stamp reads. Defaults to `YYYY-MM-DD HH:MM UTC`, which needs no locale. */
  formatTime?: (at: number) => string;
};

const defaultFormatTime = (at: number) => `${new Date(at).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/**
 * One plain-English paragraph a screen reader can read in place of a chart: what it is, the span,
 * the latest value, the extremes, and anything that should not be missed — gaps, missing readings,
 * threshold breaches and staleness. It states measurements and counts only; it offers no cause.
 */
export function describeSeriesForAssistiveTech(
  series: KinetixTelemetrySeries | null | undefined,
  options: DescribeSeriesOptions = {},
): string {
  const definition = getMetricDefinition(series?.metric);
  const label = options.label ?? describeMetric(series?.metric);
  const decimals = options.decimals ?? definition?.decimals;
  const fmtTime = options.formatTime ?? defaultFormatTime;
  const summary = summarizeSeries(series);

  if (summary.count === 0) return `${label}: no readings.`;
  if (summary.measured === 0) {
    return `${label}: ${summary.count} ${summary.count === 1 ? "point" : "points"}, none with a usable reading.`;
  }

  const unit = options.unit ?? summary.latest?.unit ?? definition?.unit;
  const fmt = (value: number) => formatTelemetryValue({ value, unit }, { precision: decimals });
  const ordered = measuredPoints(series);
  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;

  const sentences: string[] = [];
  if (summary.measured === 1) {
    sentences.push(`${label}: one reading, ${fmt(last.point.value)} at ${fmtTime(last.at)}.`);
  } else {
    sentences.push(`${label}: ${summary.measured} readings from ${fmtTime(first.at)} to ${fmtTime(last.at)}.`);
    sentences.push(`Latest ${fmt(last.point.value)}. Lowest ${fmt(summary.min!)}, highest ${fmt(summary.max!)}, average ${fmt(summary.avg!)}.`);
    if (summary.trend !== "unknown") sentences.push(`Overall ${summary.trend}.`);
  }

  if (summary.missingCount > 0) {
    sentences.push(`${summary.missingCount} ${summary.missingCount === 1 ? "point has" : "points have"} no usable reading.`);
  }

  if (options.maxGapMs !== undefined) {
    const gaps = detectSeriesGaps(series, { maxGapMs: options.maxGapMs });
    if (gaps.length > 0) {
      const longest = Math.max(...gaps.map((g) => g.durationMs));
      sentences.push(`${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"} in the data, the longest ${formatDuration(longest)}.`);
    }
  }

  const crossings = thresholdCrossings(series, options.thresholds);
  const warnings = crossings.filter((c) => c.to === "warning").length;
  const criticals = crossings.filter((c) => c.to === "critical").length;
  const latestLevel = classifyAgainstThresholds(last.point.value, resolveMetricThresholds(series?.metric, options.thresholds));
  if (warnings > 0 || criticals > 0) {
    const parts: string[] = [];
    if (warnings > 0) parts.push(`entered warning ${warnings} ${warnings === 1 ? "time" : "times"}`);
    if (criticals > 0) parts.push(`entered critical ${criticals} ${criticals === 1 ? "time" : "times"}`);
    sentences.push(`It ${parts.join(" and ")}.`);
  }
  if (latestLevel.level !== "normal") {
    sentences.push(`The latest reading is ${latestLevel.level}${latestLevel.side ? `, ${latestLevel.side}` : ""}.`);
  }

  if (options.staleAfterMs !== undefined && detectStaleReading(last.point.timestamp, options.staleAfterMs, options.now)) {
    sentences.push("The latest reading is out of date.");
  }
  return sentences.join(" ");
}

/** `90_000` → `"2 minutes"`. Whole units, rounded down, never zero: coarse on purpose. */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}
