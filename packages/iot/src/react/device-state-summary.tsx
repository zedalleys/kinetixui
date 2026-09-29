"use client";

import * as React from "react";
import type { KinetixDevice, KinetixDeviceStatus } from "../types/device";
import { KINETIX_DEVICE_STATUSES } from "../types/device";
import { describeDeviceStatus } from "../functions/status";
import { summarizeDevices } from "../functions/group";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceStateSummary — how a group of devices is doing, as counts.
 *
 * Counts, not a verdict. Every dashboard reference surveyed opens with a line like "2 active devices"
 * and every one of them is a count; none of them says "healthy", because whether two devices offline
 * is fine depends on what the devices are. That judgement stays with the product, and this renders
 * the numbers it would be made from.
 *
 * Statuses with no devices in them are **omitted from the visible list but present in the accessible
 * summary**, which is the compromise that keeps a long tail of zeroes from burying the two numbers
 * that matter while still letting a screen-reader user ask what the full picture is. Pass
 * `showEmpty` to render them all, which is what a fixed-layout dashboard tile wants.
 */
export interface DeviceStateSummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  devices: readonly KinetixDevice[] | null | undefined;
  /** Render a row for every status, including the zeroes. */
  showEmpty?: boolean;
  /** Restrict the visible rows to these statuses, in this order. */
  statuses?: readonly KinetixDeviceStatus[];
  /** Replace the accessible summary sentence. */
  label?: string;
}

const DeviceStateSummary = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceStateSummaryProps>(
  ({ devices, showEmpty = false, statuses, label, className, ...props }, ref) => {
    const summary = summarizeDevices(devices);
    const order = statuses ?? KINETIX_DEVICE_STATUSES;
    const visible = order.filter((status) => showEmpty || summary.byStatus[status] > 0);

    // Every non-zero status, in severity order, whether or not it is visible.
    const spoken =
      summary.total === 0
        ? "No devices"
        : `${summary.total} device${summary.total === 1 ? "" : "s"}: ` +
          KINETIX_DEVICE_STATUSES.filter((status) => summary.byStatus[status] > 0)
            .map((status) => `${summary.byStatus[status]} ${describeDeviceStatus(status).toLowerCase()}`)
            .join(", ");

    return (
      <div
        ref={ref}
        data-total={summary.total}
        data-attention={summary.needsAttention}
        className={cn("font-sans", className)}
        {...props}
      >
        {/* One accessible sentence for the whole group; the chips below repeat it visually and are
            hidden, so a screen reader reads the summary once rather than as N unlabelled numbers. */}
        <p className="sr-only">{label && label.trim().length > 0 ? label : spoken}</p>
        <ul aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {visible.map((status) => (
            <li key={status} data-status={status} className="flex items-baseline gap-1.5">
              <span className="text-title-sm tabular-nums text-foreground">{summary.byStatus[status]}</span>
              <span className="text-label-sm text-muted-foreground">{describeDeviceStatus(status).toLowerCase()}</span>
            </li>
          ))}
          {visible.length === 0 ? <li className="text-label-sm text-muted-foreground">No devices</li> : null}
        </ul>
      </div>
    );
  },
), "DeviceStateSummary");

export { DeviceStateSummary };
