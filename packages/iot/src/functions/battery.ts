import type { KinetixBatteryLevel, KinetixBatteryState, KinetixBatteryStatus } from "../types/device";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixBatteryThresholds, KinetixFreshness } from "../types/monitoring";

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
 *
 * `critical` and `low` are a product's policy as much as a fact (a wearable at 25 % has a day; a door
 * lock at 25 % has months), so both boundaries can be overridden with {@link KinetixBatteryThresholds}.
 * The bands above `low` are not policy and stay where they are.
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
export function classifyBatteryLevel(value: number | null | undefined, thresholds?: KinetixBatteryThresholds | null): KinetixBatteryLevel {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  const percent = clampBatteryLevel(value);
  const { critical, low } = resolveBatteryThresholds(thresholds);
  if (percent <= critical) return "critical";
  if (percent <= low) return "low";
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

/**
 * A battery's level, availability and charging state in one value.
 *
 * Charging does not soften a low or critical band: a phone at 4 % on a charger is still at 4 %, and
 * a UI decides whether charging changes the urgency it shows.
 */
export function resolveBatteryState(
  state: KinetixBatteryState | null | undefined,
  options: { thresholds?: KinetixBatteryThresholds | null } = {},
): KinetixBatteryStatus {
  const level = classifyBatteryLevel(state?.percent ?? null, options.thresholds);
  const charging = typeof state?.charging === "boolean" ? state.charging : "unknown";
  return {
    level,
    available: level !== "unknown",
    charging,
    low: level === "low" || level === "critical",
    critical: level === "critical",
  };
}

const DEFAULT_CRITICAL = 10;
const DEFAULT_LOW = 25;

const percentOrNull = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) ? clampBatteryLevel(n) : null);

/**
 * The `critical` and `low` boundaries in force. A missing or unusable override keeps its default; a
 * `low` below `critical` is raised to `critical`, so the bands never overlap.
 */
export function resolveBatteryThresholds(thresholds?: KinetixBatteryThresholds | null): { critical: number; low: number } {
  const critical = percentOrNull(thresholds?.critical) ?? DEFAULT_CRITICAL;
  const low = percentOrNull(thresholds?.low) ?? DEFAULT_LOW;
  return { critical, low: Math.max(low, critical) };
}

export type DescribeDeviceBatteryInput = {
  /** 0–100, or absent when the device did not report one. */
  value?: number | null;
  /** `true`, `false`; `null` when the device reports that it cannot tell; absent when not reported. */
  charging?: boolean | null;
  freshness?: KinetixFreshness;
  support?: KinetixCapabilitySupport;
  thresholds?: KinetixBatteryThresholds | null;
};

/**
 * One accessible sentence for a battery, with nothing implied that was not reported:
 * "Battery 42 percent", "Battery 42 percent, charging", "Battery 18 percent, low, stale reading",
 * "Battery level unknown", "Battery not supported by this device".
 *
 * - An unknown level is never 0 %.
 * - Charging is only mentioned when it was reported; `false` is "not charging", `null` (the device says
 *   it cannot tell) is "charging state unknown", and a full battery says nothing about a charger.
 * - `stale` is about the reading's age, so it never says "offline".
 * - `unknown` freshness (no timestamp or no policy) adds nothing, rather than a word on every reading.
 */
export function describeDeviceBattery(input: DescribeDeviceBatteryInput): string {
  if (input.support === "unsupported") return "Battery not supported by this device";
  const status = resolveBatteryState({ percent: input.value ?? null, charging: input.charging ?? null }, { thresholds: input.thresholds });
  const parts: string[] = [];
  parts.push(status.available ? `Battery ${formatBatteryPercent(input.value as number)} percent` : "Battery level unknown");
  if (status.critical) parts.push("critical");
  else if (status.low) parts.push("low");
  if (status.charging === true) parts.push("charging");
  else if (status.charging === false) parts.push("not charging");
  else if (input.charging === null) parts.push("charging state unknown");
  if (input.freshness === "stale") parts.push(status.available ? "stale reading" : "last reading is stale");
  return parts.join(", ");
}
