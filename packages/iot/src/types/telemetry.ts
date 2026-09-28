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
