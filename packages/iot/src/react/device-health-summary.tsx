import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { summarizeFleetHealth, type AssessDevicesOptions, type KinetixFleetHealthSummary } from "../functions/device-state";
import { HealthBar, bucketsFromCounts, bucketsFromEntries, bucketTotal, healthText } from "./health-bar";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceHealthSummary — "24 devices · 22 healthy · 1 warning · 1 offline", and the bar behind it.
 *
 * Give it either a computed `summary` (`summarizeFleetHealth`) or the `devices` themselves (with
 * `assess` carrying the alerts, `now` and staleness window) and it computes one. The sentence is the
 * primary output; the bar is `aria-hidden` and its segments differ in fill *and* border style (solid,
 * dashed, dotted), with a legend that repeats every count as a glyph, a number and a word.
 *
 * **The buckets are mutually exclusive and sum to the total.** `summarizeFleetHealth` reports offline
 * *beside* the health counts, and an offline device is also a warning-level verdict, so the raw numbers
 * count it twice. This component gives every device one bucket — offline or unreachable is `offline`,
 * whatever its health level; everything else is its health level — so a 24-device site reads
 * "22 healthy · 1 warning · 1 offline", not "1 warning · 1 offline" for a single device. With `entries`
 * (present on every `summarizeFleetHealth` result) that is exact; with hand-built counts it is an
 * approximation that takes offline out of `warning` first — see `health-bar.tsx`.
 */
export interface DeviceHealthSummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** An already-computed summary. Wins over `devices`. */
  summary?: KinetixFleetHealthSummary;
  /** Devices to summarise when no `summary` is given. */
  devices?: readonly KinetixDevice[] | null;
  /** Alerts, `now` and `staleAfterMs` for the computation from `devices`. */
  assess?: AssessDevicesOptions;
  /** Drop the legend and keep the sentence and bar. */
  compact?: boolean;
  /** The noun for what is counted. Defaults to "device" / "devices". */
  noun?: { one: string; other: string };
  /** `md` (default) or `lg` — the size of the headline numeral and the bar. */
  size?: "md" | "lg";
}

const DeviceHealthSummary = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceHealthSummaryProps>(
  ({ summary, devices, assess, compact = false, noun, size = "md", className, ...props }, ref) => {
    const s = summary ?? summarizeFleetHealth(devices, assess);
    const buckets = s.entries.length > 0 ? bucketsFromEntries(s.entries) : bucketsFromCounts(s.byHealth, s.offline);
    const total = s.total > 0 ? s.total : bucketTotal(buckets);
    const detail = healthText(buckets);
    const word = total === 1 ? (noun?.one ?? "device") : (noun?.other ?? "devices");

    return (
      <div ref={ref} data-worst={s.worst} data-size={size} className={cn("flex min-w-0 flex-col gap-3 font-sans", className)} {...props}>
        {/* The whole sentence is one element, so it reads (and is asserted) as one: "24 devices · 22 healthy…".
            The numeral is scaled up; the per-bucket detail is shown here only when there is no legend. */}
        <p data-health-text="" className="m-0 flex flex-wrap items-baseline gap-x-2 break-words">
          {total === 0 ? (
            <span className="text-title-md text-muted-foreground">{`No ${noun?.other ?? "devices"}`}</span>
          ) : (
            <>
              <span className={cn("tabular-nums text-foreground", size === "lg" ? "text-display-md font-semibold" : "text-headline-md font-semibold")}>{total}</span>
              <span className="text-title-md text-foreground">{` ${word}`}</span>
              {detail ? <span className={compact ? "text-body-md text-muted-foreground" : "sr-only"}>{` · ${detail}`}</span> : null}
            </>
          )}
        </p>
        <HealthBar buckets={buckets} compact={compact} size={size} />
      </div>
    );
  },
), "DeviceHealthSummary");

export { DeviceHealthSummary };
