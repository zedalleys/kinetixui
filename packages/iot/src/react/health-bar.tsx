import * as React from "react";
import type { KinetixDeviceHealthLevel } from "../types/device-state";
import { describeDeviceHealth } from "../functions/device-state";
import { cn } from "./cn";
import { Glyph, HEALTH_GLYPH } from "./glyph";

/**
 * Internal: the segmented health bar and its legend, shared by `DeviceHealthSummary` and
 * `SpaceRollup` so the two cannot drift apart.
 *
 * **The bar and the legend are visual; the sentence the caller prints is the data.** Segments differ by fill *and* by border style
 * (solid, dashed, dotted, outlined) so they stay distinguishable in greyscale, but a bar of five
 * proportional slivers is not something to rely on — so both are `aria-hidden` and the caller prints
 * the same counts as a sentence, which is what assistive technology reads (once, not three times).
 */
export type HealthCounts = Partial<Record<KinetixDeviceHealthLevel, number>>;

const ORDER: readonly KinetixDeviceHealthLevel[] = ["critical", "warning", "degraded", "unknown", "healthy"];

const SEGMENT: Record<KinetixDeviceHealthLevel, string> = {
  healthy: "border border-transparent bg-primary",
  degraded: "border border-solid border-primary bg-primary/30",
  warning: "border-2 border-dashed border-foreground bg-background",
  critical: "border border-transparent bg-destructive",
  unknown: "border-2 border-dotted border-muted-foreground bg-muted",
};

export function HealthBar({
  counts,
  offline,
  total,
  compact = false,
}: {
  counts: HealthCounts;
  offline?: number;
  total: number;
  compact?: boolean;
}) {
  const present = ORDER.filter((level) => (counts[level] ?? 0) > 0);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {total > 0 ? (
        <div aria-hidden="true" data-health-bar="" className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
          {present.map((level) => (
            <span key={level} data-segment={level} className={cn("h-full min-w-1.5 rounded-full", SEGMENT[level])} style={{ flexGrow: counts[level] }} />
          ))}
        </div>
      ) : null}
      {compact ? null : (
        <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
          {present.map((level) => (
            <li key={level} data-legend={level} className="inline-flex items-center gap-1.5 text-label-sm text-foreground">
              <Glyph name={HEALTH_GLYPH[level]} size={12} />
              <span className="tabular-nums">{counts[level]}</span>
              <span>{describeDeviceHealth(level)}</span>
            </li>
          ))}
          {offline && offline > 0 ? (
            <li data-legend="offline" className="inline-flex items-center gap-1.5 text-label-sm text-foreground">
              <Glyph name="slash" size={12} />
              <span className="tabular-nums">{offline}</span>
              <span>Offline</span>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

/** "22 healthy · 1 warning · 1 offline" — nonzero, worst first, healthy last; the text form of the bar. */
export function healthText(counts: HealthCounts, offline: number | undefined): string {
  const parts: string[] = [];
  for (const level of ORDER) {
    const n = counts[level] ?? 0;
    if (n > 0) parts.push(`${n} ${describeDeviceHealth(level).toLowerCase()}`);
  }
  if (offline && offline > 0) parts.push(`${offline} offline`);
  return parts.join(" · ");
}
