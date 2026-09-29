/**
 * Deterministic telemetry history for scenario fixtures.
 *
 * A fixture describes a series (base level, daily wave, noise, drying slope, irrigation resets, gaps,
 * a sensor that went quiet) and this turns it into `KinetixTelemetrySeries` points. The numbers come
 * from the seeded generator, so a 7-day series is a dozen lines of description rather than hundreds
 * of literals, and it is identical on every build.
 *
 * A missing interval is a point with `quality: "missing"` (value 0, never plotted), not an omitted
 * point: the reading was due and did not arrive.
 */
import type { KinetixTelemetryPoint, KinetixTelemetrySeries } from "@kinetixui/iot/functions";
import { noiseAt } from "./prng";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type SeriesSpec = {
  deviceId: string;
  metric: string;
  unit?: string;
  /** How far back the series reaches from `endAt`. */
  spanMs: number;
  stepMs: number;
  base: number;
  /** Daily wave amplitude (period one day). */
  amplitude?: number;
  /** Peak-to-peak jitter. */
  noise?: number;
  /** Linear drift per hour, restarting at each reset. */
  slopePerHour?: number;
  /** At `agoMs` before `endAt` the level jumps to `to` (an irrigation, a refill), then drifts again. */
  resets?: readonly { agoMs: number; to: number; slopePerHour?: number }[];
  min?: number;
  max?: number;
  decimals?: number;
  /** Windows, as ms before `endAt`, in which the sensor did not answer. */
  gaps?: readonly { fromAgoMs: number; toAgoMs: number }[];
  /** The sensor last reported this long before `endAt`; nothing after that is included (a stale sensor). */
  lastReportAgoMs?: number;
};

export function generateSeries(spec: SeriesSpec, seed: number, endAt: string): KinetixTelemetrySeries {
  const endMs = Date.parse(endAt);
  const decimals = spec.decimals ?? 1;
  const key = `${spec.deviceId}:${spec.metric}:history`;
  const resets = [...(spec.resets ?? [])].sort((a, b) => b.agoMs - a.agoMs);
  const points: KinetixTelemetryPoint[] = [];
  const count = Math.floor(spec.spanMs / spec.stepMs);

  for (let i = count; i >= 0; i--) {
    const ago = i * spec.stepMs;
    if (spec.lastReportAgoMs !== undefined && ago < spec.lastReportAgoMs) continue;
    const timestamp = new Date(endMs - ago).toISOString();
    if (spec.gaps?.some((g) => ago <= g.fromAgoMs && ago >= g.toAgoMs)) {
      points.push({ timestamp, metric: spec.metric, value: 0, ...(spec.unit ? { unit: spec.unit } : {}), quality: "missing" });
      continue;
    }
    let level = spec.base;
    let sinceMs = spec.spanMs - ago;
    let slope = spec.slopePerHour ?? 0;
    for (const r of resets) {
      if (ago <= r.agoMs) {
        level = r.to;
        sinceMs = r.agoMs - ago;
        slope = r.slopePerHour ?? spec.slopePerHour ?? 0;
      }
    }
    const dayPhase = (((endMs - ago) % DAY) / DAY) * 2 * Math.PI;
    let value = level + slope * (sinceMs / HOUR);
    value += (spec.amplitude ?? 0) * Math.sin(dayPhase);
    value += (noiseAt(seed, key, i) - 0.5) * (spec.noise ?? 0);
    if (spec.min !== undefined) value = Math.max(spec.min, value);
    if (spec.max !== undefined) value = Math.min(spec.max, value);
    points.push({ timestamp, metric: spec.metric, value: Number(value.toFixed(decimals)), ...(spec.unit ? { unit: spec.unit } : {}), quality: "good" });
  }
  return { deviceId: spec.deviceId, metric: spec.metric, points };
}

export function buildSeries(specs: readonly SeriesSpec[], seed: number, endAt: string): KinetixTelemetrySeries[] {
  return specs.map((spec) => generateSeries(spec, seed, endAt));
}
