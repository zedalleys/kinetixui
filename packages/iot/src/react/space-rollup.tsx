import * as React from "react";
import type { KinetixSpaceHealthRollup } from "../types/hierarchy";
import { describeDeviceHealth } from "../functions/device-state";
import { HealthBar, bucketsFromCounts, healthText } from "./health-bar";
import { Glyph, HEALTH_GLYPH } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * SpaceRollup — the health of everything beneath one space: text first, bar second.
 *
 * `rollup` is one entry of `rollupSpaceHealth(tree, devices)`. The sentence gives one bucket per device
 * ("5 devices · 3 healthy · 1 warning · 1 offline"), preceded by the **worst** level found anywhere
 * below as a glyph and a word — because a room with one critical pump is critical, and the rollup says so before
 * the counts do. `rollupSpaceHealth` reports offline beside the health counts (an offline device is
 * also in `warning`), so the buckets are made exclusive here — approximately, since a rollup carries
 * counts and not per-device entries; see `health-bar.tsx`. Devices placed in the space but absent from the list supplied are counted as unknown
 * and called out, never dropped.
 */
export interface SpaceRollupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  rollup: KinetixSpaceHealthRollup;
  /** Name of the space, used to make the accessible name specific. */
  name?: string;
  /** Sentence and bar only, no legend. */
  compact?: boolean;
}

const SpaceRollup = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, SpaceRollupProps>(
  ({ rollup, name, compact = false, className, ...props }, ref) => {
    const empty = rollup.total === 0;
    const buckets = bucketsFromCounts(rollup, rollup.offline);
    return (
      <div
        ref={ref}
        data-worst={rollup.worst}
        role="group"
        aria-label={name ? `Health of ${name}` : "Health rollup"}
        className={cn("flex min-w-0 flex-col gap-2.5 font-sans", className)}
        {...props}
      >
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-md text-foreground">
          {empty ? null : (
            <span data-worst-label="" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md", rollup.worst === "critical" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground")}>
              <Glyph name={HEALTH_GLYPH[rollup.worst]} size={14} />
              <span>{describeDeviceHealth(rollup.worst)}</span>
            </span>
          )}
          <span data-rollup-text="" className="break-words text-body-sm text-muted-foreground">{empty ? "No devices." : `${rollup.total} ${rollup.total === 1 ? "device" : "devices"} · ${healthText(buckets)}`}</span>
        </p>
        <HealthBar buckets={buckets} compact={compact} />
        {rollup.missing > 0 ? (
          <p data-missing="" className="text-body-sm text-muted-foreground">
            {rollup.missing} {rollup.missing === 1 ? "device is" : "devices are"} placed here but not in the device list, counted as unknown.
          </p>
        ) : null}
      </div>
    );
  },
), "SpaceRollup");

export { SpaceRollup };
