import * as React from "react";
import type { KinetixDevice } from "../types/device";
import type { KinetixDeviceHealthLevel } from "../types/device-state";
import { summarizeFleetHealth, type AssessDevicesOptions, type KinetixFleetHealthSummary } from "../functions/device-state";
import { HealthBar, healthText } from "./health-bar";
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
 * Offline is reported beside the health counts, not as one of them (it overlaps them, exactly as in
 * `summarizeFleetHealth`), so the health counts still sum to the total.
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
}

const DeviceHealthSummary = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceHealthSummaryProps>(
  ({ summary, devices, assess, compact = false, noun, className, ...props }, ref) => {
    const s = summary ?? summarizeFleetHealth(devices, assess);
    const word = s.total === 1 ? (noun?.one ?? "device") : (noun?.other ?? "devices");
    const counts = s.byHealth as Partial<Record<KinetixDeviceHealthLevel, number>>;
    const detail = healthText(counts, s.offline);

    return (
      <div ref={ref} data-worst={s.worst} className={cn("flex min-w-0 flex-col gap-2 font-sans", className)} {...props}>
        <p data-health-text="" className="break-words text-label-md text-foreground">
          {s.total === 0 ? `No ${noun?.other ?? "devices"}` : `${s.total} ${word}${detail ? ` · ${detail}` : ""}`}
        </p>
        <HealthBar counts={counts} offline={s.offline} total={s.total} compact={compact} />
      </div>
    );
  },
), "DeviceHealthSummary");

export { DeviceHealthSummary };
