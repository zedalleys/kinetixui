/**
 * The telemetry model.
 *
 * A reading is a number, a unit, a time and a statement about how much to trust it. That last part
 * is the one usually left out, and it is why device dashboards show a confident 0 where they mean
 * "the sensor did not answer". `quality` exists so missingness survives the trip to the UI.
 *
 * No chart library is involved. A series here is data, not a plotted thing.
 */

/**
 * How much to trust a reading.
 *
 * - `good` — reported by the device and believed
 * - `estimated` — interpolated, smoothed or derived rather than measured
 * - `missing` — no reading; the value must not be presented as a measurement
 * - `error` — the device reported a fault for this metric
 */
export type KinetixTelemetryQuality = "good" | "estimated" | "missing" | "error";

export type KinetixTelemetryPoint = {
  timestamp: string | Date;
  /** Product-defined metric key, e.g. "temperature", "soil-moisture", "heart-rate". */
  metric: string;
  value: number;
  /** Display unit, e.g. "°C", "%", "bpm". Not converted or validated by this module. */
  unit?: string;
  quality?: KinetixTelemetryQuality;
};

export type KinetixTelemetrySeries = {
  deviceId: string;
  metric: string;
  points: KinetixTelemetryPoint[];
};

/**
 * Warning and critical bounds for a metric. All four are optional: a one-sided metric (battery only
 * matters when low; pressure only when high) sets two, and a product overrides whichever it knows.
 * Bounds are **inclusive** — a reading that reaches a bound has breached it.
 */
export type KinetixMetricThresholds = {
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
};

/**
 * How to treat one reading. `stale`, `unavailable` and `loading` are states in their own right rather
 * than flavours of `normal`, so a value that cannot be trusted never renders as fine.
 *
 * `loading` is the one that is about **us**, not the device. The other four answer "what did the
 * device say?"; `loading` answers "have we been told yet?". A surface awaiting its first reading is
 * not `unavailable` — that claims the device was asked and had nothing to give — and it is certainly
 * not a measured `0`. Keeping them apart is why this member exists.
 */
export type KinetixReadingState = "normal" | "warning" | "critical" | "stale" | "unavailable" | "loading";

/**
 * Every reading state, attention first.
 *
 * The first five are ordered by how much they should pull the eye, so a surface reducing several
 * readings to one worst case can compare positions. `loading` is **last and deliberately outside that
 * ordering**: it is not a verdict about a value, so it cannot be more or less severe than one. Last is
 * the safe place for it — an `indexOf` comparison written for the five ranks it least severe, which
 * never promotes a pending reading over a real alarm.
 */
export const KINETIX_READING_STATES: readonly KinetixReadingState[] = [
  "critical",
  "warning",
  "stale",
  "unavailable",
  "normal",
  "loading",
] as const;

/**
 * A semantic glyph key for a reading state, so a UI can pair every state with a shape as well as a
 * colour. Keys, not icons: the product maps them to whatever icon set it has.
 */
export type KinetixReadingGlyph = "check" | "triangle" | "octagon" | "clock" | "dash" | "circle-dot";

/** A metric this package knows how to label and format. Defaults only — a product overrides any of it. */
export type KinetixMetricDefinition = {
  id: string;
  label: string;
  /** Default display unit. Absent for unitless metrics. */
  unit?: string;
  /** Decimal places to show by default. */
  decimals: number;
  /** Default thresholds, only where a bound is not domain-specific. Most metrics have none. */
  thresholds?: KinetixMetricThresholds;
};
