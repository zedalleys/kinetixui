import * as React from "react";
import type { KinetixDeviceHealthLevel } from "../types/device-state";
import type { KinetixFleetHealthEntry } from "../functions/device-state";
import { describeDeviceHealth } from "../functions/device-state";
import { cn } from "./cn";
import { Glyph, HEALTH_GLYPH, type GlyphName } from "./glyph";

/**
 * Internal: mutually exclusive health buckets, the segmented bar and its legend. Shared by
 * `DeviceHealthSummary` and `SpaceRollup` so the two cannot drift apart.
 *
 * ## Buckets are exclusive, and they sum to the total
 * The headless summaries report **offline beside the health counts**, because an offline device also
 * has a health level (offline is a warning-level verdict) and so it appears in `byHealth.warning` *and*
 * in `offline`. Printed as they stand, "1 warning · 1 offline" would describe one device twice and a
 * bar built from both would be wider than the fleet. The UI therefore presents **one bucket per
 * device**: a device that is offline or unreachable is `offline`, whatever its health level, and every
 * other device is counted at its health level.
 *
 * - From `entries` (a `summarizeFleetHealth` result carries them) this is exact.
 * - From bare counts it is an approximation: the offline count is taken out of `warning` first (where
 *   an offline verdict lands), then out of the next-worst buckets if `warning` runs out. A caller that
 *   has the per-device entries should pass them.
 *
 * **The bar and the legend are visual; the sentence the caller prints is the data.** Segments differ by
 * fill *and* border style (solid, dashed, dotted, double) so they stay distinguishable in greyscale,
 * but a bar of proportional slivers is not something to rely on — so both are `aria-hidden` and the
 * caller prints the same counts as a sentence, which assistive technology reads once.
 */
export type HealthBucket = KinetixDeviceHealthLevel | "offline";
export type HealthBuckets = Record<HealthBucket, number>;

/**
 * Healthy first (the number people look for), then the buckets that need someone, worst first, with
 * offline last. One order for the sentence, the bar and the legend, so they read the same way.
 */
const ORDER: readonly HealthBucket[] = ["healthy", "critical", "warning", "degraded", "unknown", "offline"];

const SEGMENT: Record<HealthBucket, string> = {
  healthy: "border border-transparent bg-primary",
  degraded: "border border-solid border-primary bg-primary/30",
  warning: "border-2 border-dashed border-foreground bg-background",
  critical: "border border-transparent bg-destructive",
  unknown: "border-2 border-dotted border-muted-foreground bg-muted",
  offline: "border-4 border-double border-muted-foreground bg-muted",
};

const bucketGlyph = (bucket: HealthBucket): GlyphName => (bucket === "offline" ? "slash" : HEALTH_GLYPH[bucket]);
const WORD: Record<HealthBucket, string> = {
  healthy: "healthy",
  degraded: "degraded",
  warning: "warning",
  critical: "critical",
  unknown: "unknown",
  offline: "offline",
};

const isOffline = (entry: KinetixFleetHealthEntry) => entry.connectivity.state === "offline" || entry.connectivity.state === "unreachable";

/** One bucket per device. Exact. */
export function bucketsFromEntries(entries: readonly KinetixFleetHealthEntry[]): HealthBuckets {
  const b: HealthBuckets = { healthy: 0, degraded: 0, warning: 0, critical: 0, unknown: 0, offline: 0 };
  for (const entry of entries) {
    if (isOffline(entry)) b.offline += 1;
    else b[entry.health.level] += 1;
  }
  return b;
}

/** Counts that overlap (`offline` is also inside a health count) turned into exclusive ones. Approximate. */
export function bucketsFromCounts(counts: Partial<Record<KinetixDeviceHealthLevel, number>>, offline: number | undefined): HealthBuckets {
  const b: HealthBuckets = {
    healthy: counts.healthy ?? 0,
    degraded: counts.degraded ?? 0,
    warning: counts.warning ?? 0,
    critical: counts.critical ?? 0,
    unknown: counts.unknown ?? 0,
    offline: 0,
  };
  let remaining = Math.max(0, offline ?? 0);
  for (const level of ["warning", "degraded", "critical", "unknown"] as const) {
    const take = Math.min(b[level], remaining);
    b[level] -= take;
    b.offline += take;
    remaining -= take;
  }
  // Offline devices the health counts cannot account for still exist; they are not silently dropped.
  b.offline += remaining;
  return b;
}

export const bucketTotal = (b: HealthBuckets): number => ORDER.reduce((sum, key) => sum + b[key], 0);

export function HealthBar({ buckets, compact = false, size = "md" }: { buckets: HealthBuckets; compact?: boolean; size?: "md" | "lg" }) {
  const present = ORDER.filter((key) => buckets[key] > 0);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {present.length > 0 ? (
        // Each segment keeps its own fill *and* border pattern (solid, dashed, dotted, double), so the bar
        // still separates in greyscale; the legend below repeats every bucket with a glyph and a word.
        <div aria-hidden="true" data-health-bar="" className={cn("flex w-full gap-1 overflow-hidden rounded-full", size === "lg" ? "h-4" : "h-3")}>
          {present.map((key) => (
            <span key={key} data-segment={key} data-count={buckets[key]} className={cn("h-full min-w-2 rounded-full", SEGMENT[key])} style={{ flexGrow: buckets[key] }} />
          ))}
        </div>
      ) : null}
      {compact ? null : (
        <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
          {present.map((key) => (
            <li key={key} data-legend={key} className="inline-flex items-center gap-1.5 text-label-md text-muted-foreground">
              <Glyph name={bucketGlyph(key)} size={14} className="text-foreground" />
              <span className="font-medium tabular-nums text-foreground">{buckets[key]}</span>
              <span>{key === "unknown" ? "Health unknown" : key === "offline" ? "Offline" : describeDeviceHealth(key)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "22 healthy · 1 warning · 1 offline" — nonzero buckets, worst first, healthy last; the text form of the bar. */
export function healthText(buckets: HealthBuckets): string {
  return ORDER.filter((key) => buckets[key] > 0)
    .map((key) => `${buckets[key]} ${WORD[key]}`)
    .join(" · ");
}
