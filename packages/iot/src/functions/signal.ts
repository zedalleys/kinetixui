import type { KinetixSignalLevel } from "../types/device";

/**
 * Signal classification.
 *
 * The input is a **normalised 0–100 quality**, not dBm and not RSSI. That is a deliberate narrowing:
 * dBm scales differ per radio (Wi-Fi, LTE, LoRa and BLE do not share a usable range), so a module
 * that accepted dBm would have to guess the radio to band it, and would be wrong for somebody. The
 * conversion belongs in the product, next to the radio it knows about.
 *
 * | level     | range    |
 * | --------- | -------- |
 * | none      | 0        |
 * | weak      | 1 – 25   |
 * | fair      | 26 – 50  |
 * | good      | 51 – 80  |
 * | excellent | 81 – 100 |
 */

export function clampSignalStrength(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * The band a normalised signal value falls in.
 *
 * `"unknown"` for missing or non-finite input; `"none"` only for a reported zero. A device that does
 * not report signal is not a device with no signal.
 */
export function classifySignalStrength(value: number | null | undefined): KinetixSignalLevel {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  const percent = clampSignalStrength(value);
  if (percent <= 0) return "none";
  if (percent <= 25) return "weak";
  if (percent <= 50) return "fair";
  if (percent <= 80) return "good";
  return "excellent";
}

/**
 * How many of `bars` segments to fill for a signal value — the shape a bar meter needs, kept out of
 * the component so it can be tested directly.
 *
 * `"none"` and `"unknown"` both fill zero; they differ in the label, not the picture.
 */
export function signalBars(value: number | null | undefined, bars = 4): number {
  const level = classifySignalStrength(value);
  switch (level) {
    case "unknown":
    case "none":
      return 0;
    case "weak":
      return Math.max(1, Math.round(bars * 0.25));
    case "fair":
      return Math.max(1, Math.round(bars * 0.5));
    case "good":
      return Math.max(1, Math.round(bars * 0.75));
    case "excellent":
      return bars;
  }
}

/** The full accessible label: `"Signal 84%, excellent"`. */
export function describeSignal(value: number | null | undefined): string {
  const level = classifySignalStrength(value);
  if (level === "unknown") return "Signal strength unknown";
  if (level === "none") return "No signal";
  return `Signal ${formatSignalPercent(value as number)}%, ${level}`;
}

export function formatSignalPercent(value: number): string {
  return String(Math.round(clampSignalStrength(value) * 10) / 10);
}
