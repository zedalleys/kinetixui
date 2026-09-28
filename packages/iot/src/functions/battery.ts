import type { KinetixBatteryLevel } from "../types/device";

/**
 * Battery classification.
 *
 * Bands rather than a raw percentage, because "23%" means nothing without knowing whether this
 * product considers that fine. The bands are:
 *
 * | level    | integer range | exact boundary |
 * | -------- | ------------- | -------------- |
 * | critical | 0 – 10        | `v <= 10`      |
 * | low      | 11 – 25       | `v <= 25`      |
 * | medium   | 26 – 60       | `v <= 60`      |
 * | high     | 61 – 94       | `v < 95`       |
 * | full     | 95 – 100      | `v >= 95`      |
 *
 * The second column is the one that decides: percentages arrive fractional often enough that "0–10"
 * alone leaves 10.4 undefined. Each band is closed at its upper bound, so a fraction resolves to the
 * gentler band — 10.4 is `low`, not `critical`. `full` is the exception, opening at exactly 95, so
 * that 94.9 does not read as fully charged.
 */

/** Percentages outside 0–100 are clamped: a gateway reporting 105% is a reporting bug, not a battery. */
export function clampBatteryLevel(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * The band a battery percentage falls in.
 *
 * Missing, non-numeric and non-finite input is `"unknown"` — which is not the same as `"critical"`.
 * A device that does not report a battery must not be drawn as one that is about to die.
 */
export function classifyBatteryLevel(value: number | null | undefined): KinetixBatteryLevel {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  const percent = clampBatteryLevel(value);
  if (percent <= 10) return "critical";
  if (percent <= 25) return "low";
  if (percent <= 60) return "medium";
  if (percent < 95) return "high";
  return "full";
}

/** Human-readable band name. */
export function describeBatteryLevel(level: KinetixBatteryLevel): string {
  return level === "unknown" ? "level unknown" : level;
}

/**
 * The full accessible label for a battery reading: `"Battery 72%, high"`.
 *
 * It lives here rather than inside the component so that the text a screen reader receives is
 * covered by the same unit tests as the classification, and so a non-React consumer can render it.
 */
export function describeBattery(value: number | null | undefined): string {
  const level = classifyBatteryLevel(value);
  if (level === "unknown") return "Battery level unknown";
  return `Battery ${formatBatteryPercent(value as number)}%, ${level}`;
}

/** The percentage as shown: clamped, and trimmed to at most one decimal place. */
export function formatBatteryPercent(value: number): string {
  const percent = clampBatteryLevel(value);
  return String(Math.round(percent * 10) / 10);
}
