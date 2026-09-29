import type { KinetixMetricDefinition, KinetixMetricThresholds } from "../types/telemetry";

/**
 * The central metric registry.
 *
 * One place says what "soil-moisture" is called, how it is usually written and how many decimals it
 * deserves, so a chart axis, a tile and an accessible summary agree. Everything here is a *default*:
 * a product with a `°F` audience or a crop with its own moisture band overrides per call.
 *
 * Thresholds are given only where they are not domain-specific. Battery and signal have widely
 * shared bands (matching `classifyBatteryLevel` and `classifySignalStrength`); air quality follows the
 * common AQI breakpoints. Temperature, humidity, soil moisture and the rest have none, on purpose —
 * 30 °C is fine in a greenhouse and an emergency in a cold store, and a wrong default is worse than
 * none.
 */
export const KINETIX_METRIC_REGISTRY: Readonly<Record<string, KinetixMetricDefinition>> = {
  temperature: { id: "temperature", label: "Temperature", unit: "°C", decimals: 1 },
  humidity: { id: "humidity", label: "Humidity", unit: "%", decimals: 0 },
  "soil-moisture": { id: "soil-moisture", label: "Soil moisture", unit: "%", decimals: 0 },
  pressure: { id: "pressure", label: "Pressure", unit: "kPa", decimals: 1 },
  "air-quality": {
    id: "air-quality",
    label: "Air quality",
    unit: "AQI",
    decimals: 0,
    thresholds: { warningHigh: 100, criticalHigh: 200 },
  },
  motion: { id: "motion", label: "Motion", decimals: 0 },
  "light-level": { id: "light-level", label: "Light level", unit: "lx", decimals: 0 },
  flow: { id: "flow", label: "Flow", unit: "L/min", decimals: 1 },
  "water-level": { id: "water-level", label: "Water level", unit: "%", decimals: 0 },
  power: { id: "power", label: "Power", unit: "W", decimals: 0 },
  energy: { id: "energy", label: "Energy", unit: "kWh", decimals: 2 },
  battery: {
    id: "battery",
    label: "Battery",
    unit: "%",
    decimals: 0,
    thresholds: { warningLow: 25, criticalLow: 10 },
  },
  "signal-strength": {
    id: "signal-strength",
    label: "Signal strength",
    unit: "%",
    decimals: 0,
    thresholds: { warningLow: 25, criticalLow: 10 },
  },
};

/** The registered metric ids, in registry order. */
export const KINETIX_METRIC_IDS: readonly string[] = Object.keys(KINETIX_METRIC_REGISTRY);

/** The definition for a metric key, matched case-insensitively with `_`/space folded to `-`; else `undefined`. */
export function getMetricDefinition(metric: string | null | undefined): KinetixMetricDefinition | undefined {
  if (typeof metric !== "string") return undefined;
  const key = metric.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return Object.prototype.hasOwnProperty.call(KINETIX_METRIC_REGISTRY, key) ? KINETIX_METRIC_REGISTRY[key] : undefined;
}

/** A label for any metric key: the registered one, or the key made readable (`heart-rate` → `Heart rate`). */
export function describeMetric(metric: string | null | undefined): string {
  const known = getMetricDefinition(metric);
  if (known) return known.label;
  if (typeof metric !== "string" || metric.trim().length === 0) return "Reading";
  const words = metric.trim().replace(/[-_\s]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The thresholds to apply for a metric: the registry default with any product override laid on top,
 * field by field. Passing `undefined` for a field keeps the default; there is no way to *remove* a
 * default bound other than overriding it, which is deliberate — silently unbounding a battery is the
 * failure to avoid.
 */
export function resolveMetricThresholds(
  metric: string | null | undefined,
  override?: KinetixMetricThresholds | null,
): KinetixMetricThresholds {
  const merged: KinetixMetricThresholds = { ...getMetricDefinition(metric)?.thresholds };
  if (override) {
    for (const key of ["warningLow", "warningHigh", "criticalLow", "criticalHigh"] as const) {
      const value = override[key];
      if (typeof value === "number" && Number.isFinite(value)) merged[key] = value;
    }
  }
  return merged;
}
