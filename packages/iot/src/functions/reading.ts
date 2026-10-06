import type { KinetixReadingDelta } from "../types/monitoring";
import { describeLastSeen } from "./last-seen";
import { parseTimestamp } from "./time";

/**
 * Reading helpers shared by the monitoring components (M3): the change between two readings, and one
 * spoken phrase for a reading.
 */

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/**
 * The change from `previous` to `current`, or `null` when either is missing. A single sample has no
 * change, and an absent comparison is not zero, so no delta is invented for either.
 */
export function resolveReadingDelta(current: number | null | undefined, previous: number | null | undefined): KinetixReadingDelta | null {
  if (!finite(current) || !finite(previous)) return null;
  const value = current - previous;
  return { value, direction: value > 0 ? "up" : value < 0 ? "down" : "none" };
}

export type DescribeTelemetryReadingInput = {
  label: string;
  /**
   * What the value is: `known` (a number), `unknown` (nothing reported), `unavailable` (the source
   * says it cannot give one now) or `unsupported` (the device does not measure this).
   */
  availability: "known" | "unknown" | "unavailable" | "unsupported";
  /** The value as displayed, e.g. `"21.4"` or a product formatter's `"1 234,5"`. */
  valueText?: string;
  /** The unit as spoken. A product may pass "degrees Celsius" for `°C`. */
  unitText?: string;
  /** A status word, when one applies ("normal", "warning", or a product's own). */
  status?: string;
  stale?: boolean;
  /** "up 0.4 °C from the previous reading". */
  deltaText?: string;
  /** "reference 4 to 7". */
  rangeText?: string;
  /** "measured 5 minutes ago". */
  ageText?: string;
};

/**
 * One phrase a screen reader hears for a reading: "Temperature 21.4 °C, normal, measured 1 minute ago",
 * "Soil moisture 31 percent, stale reading, last known value", "Heart rate unknown, no reading",
 * "Glucose not supported by this device".
 *
 * Unknown and unavailable say so in words and never contain a number; stale is always named.
 */
export function describeTelemetryReading(input: DescribeTelemetryReadingInput): string {
  const { label } = input;
  switch (input.availability) {
    case "unsupported":
      return `${label} not supported by this device`;
    case "unavailable":
      return `${label} unavailable, no reading`;
    case "unknown":
      return `${label} unknown, no reading`;
    case "known":
      break;
  }
  const value = [input.valueText, input.unitText].filter((t) => t && t.trim()).join(" ");
  const parts = [`${label} ${value}`.trim()];
  if (input.stale) parts.push("stale reading, last known value");
  else if (input.status) parts.push(input.status);
  if (input.deltaText) parts.push(input.deltaText);
  if (input.rangeText) parts.push(input.rangeText);
  if (input.ageText) parts.push(input.ageText);
  return parts.join(", ");
}

/**
 * How old a reading is, as a phrase: "measured 5 minutes ago", "reported just now". `""` when the
 * timestamp is missing or unusable — an undated reading has no age to state, and is not "never".
 */
export function describeReadingAge(
  value: string | Date | number | null | undefined,
  options: { now?: string | Date | number | null; verb?: string } = {},
): string {
  if (!parseTimestamp(value ?? null)) return "";
  return describeLastSeen(value, { now: options.now }).replace(/^Last seen/, options.verb ?? "measured");
}
