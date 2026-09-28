"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { normalizeDeviceStatus } from "../functions/status";
import { formatTelemetryValue } from "../functions/telemetry";
import { BatteryIndicator } from "./battery-indicator";
import { DeviceStatusBadge } from "./device-status-badge";
import { LastSync } from "./last-sync";
import { SignalStrength } from "./signal-strength";
import { cn } from "./cn";

/**
 * DeviceListItem — the same facts as `DeviceCard`, at list density.
 *
 * A fleet of four hundred devices is a list, not a grid of cards, and the list form is not a smaller
 * card: it drops to a single line of identity, one value, and the state. This exists as its own
 * component rather than a `dense` prop on `DeviceCard` because the two lay out nothing in common —
 * a prop that changes every child's arrangement is two components sharing a name.
 *
 * The transition rule from `DeviceCard` applies here too, and matters more: in a list the value
 * column is scanned vertically, so one stale number among live ones is read as live. A device that
 * is `syncing`, `pairing` or `updating` shows its status word in the value column instead.
 *
 * Renders as a `<li>` by default so a list of these is a list to assistive technology. Pass `as` to
 * change it where the surrounding markup is a table row or a grid.
 */
export interface DeviceListItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  device: KinetixDevice;
  /** The one value this row shows. Omit for a row that is identity and state only. */
  reading?: { value: number | null | undefined; unit?: string; precision?: number };
  /** The device's primary control, in the trailing position. */
  action?: React.ReactNode;
  /** Reference instant for the relative "last seen" text. */
  now?: string | Date | number;
  /** Element to render. Defaults to `li`. */
  as?: React.ElementType;
}

const IN_TRANSITION = new Set(["syncing", "pairing", "updating"]);

const DeviceListItem = React.forwardRef<HTMLElement, DeviceListItemProps>(
  ({ device, reading, action, now, as: Tag = "li", className, ...props }, ref) => {
    const status = normalizeDeviceStatus(device?.status);
    const transitioning = IN_TRANSITION.has(status);

    return (
      <Tag
        ref={ref}
        data-status={status}
        className={cn(
          "flex items-center gap-3 border-b border-border px-3 py-2.5 font-sans last:border-b-0",
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label-md text-foreground">{device?.name}</span>
          {device?.locationName || device?.type ? (
            <span className="truncate text-label-sm text-muted-foreground">{device?.locationName ?? device?.type}</span>
          ) : null}
        </span>

        {reading ? (
          <span className="ms-auto shrink-0 text-end text-label-md tabular-nums text-foreground" data-reading={transitioning ? "suppressed" : undefined}>
            {transitioning ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatTelemetryValue({ value: reading.value ?? Number.NaN, unit: reading.unit }, { precision: reading.precision })
            )}
          </span>
        ) : null}

        <span className={cn("flex shrink-0 items-center gap-3", reading ? "" : "ms-auto")}>
          {device?.battery !== undefined ? <BatteryIndicator value={device.battery} hideValue /> : null}
          {device?.signal !== undefined ? <SignalStrength value={device.signal} hideValue /> : null}
          {device?.lastSeenAt !== undefined ? (
            // Hidden below `sm`: at list density this is the first thing to go, and the status badge
            // beside it already says whether the device is reachable.
            <LastSync value={device.lastSeenAt} now={now} className="hidden text-label-sm sm:inline" />
          ) : null}
          <DeviceStatusBadge status={status} />
          {action}
        </span>
      </Tag>
    );
  },
);
DeviceListItem.displayName = "DeviceListItem";

export { DeviceListItem };
