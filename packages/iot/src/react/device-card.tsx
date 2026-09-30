"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { normalizeDeviceStatus } from "../functions/status";
import { BatteryIndicator } from "./battery-indicator";
import { DeviceIdentity } from "./device-identity";
import { DeviceStatusBadge } from "./device-status-badge";
import { LastSync } from "./last-sync";
import { SensorReading } from "./sensor-reading";
import { SignalStrength } from "./signal-strength";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceCard — one device, as a card.
 *
 * This composes the five primitives rather than re-deriving their semantics: the badge normalises
 * the status, the battery and signal indicators classify their own values, `LastSync` decides what
 * "recently" means, and `SensorReading` decides whether a value may be shown as a number at all. The
 * card's own job is layout and a couple of rules about what to show when.
 *
 * **The reading is suppressed while the device is in transition.** A device that is `syncing`,
 * `pairing` or `updating` shows its status where the reading would be, not a value from before the
 * transition started. Shipped products do this — IKEA's list rows read `100%` or `Updating`, never
 * both — and the reason generalises: a number rendered beside "Updating" is read as the current
 * number, and it is not.
 *
 * **The action slot is one place.** Every connected-device product surveyed puts a device's primary
 * control in the same corner of every card, so this takes an `action` node and positions it, rather
 * than growing a `onToggle`/`onPower`/`onRun` prop surface it cannot predict. What the control *is*
 * belongs to the product; where it sits belongs to the card.
 */
export interface DeviceCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  device: KinetixDevice;
  /**
   * The device's primary control, rendered in the card's trailing header position. A button, a
   * switch, a menu — this module does not supply one, because a control implies a transport.
   */
  action?: React.ReactNode;
  /** A headline reading for this device. Omit for a card that is only identity and state. */
  reading?: {
    metric: string;
    value: number | null | undefined;
    unit?: string;
    quality?: React.ComponentProps<typeof SensorReading>["quality"];
    precision?: number;
  };
  /** Extra content below the footer — a trend, a control, a description. */
  footer?: React.ReactNode;
  /** Reference instant for the relative "last seen" text. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number;
  /** Hide the battery / signal / last-seen row. */
  hideMeta?: boolean;
  /** Show the device's category icon tile (state-tinted) before its name. Off by default. */
  showIcon?: boolean;
  /** Size of the headline reading. `lg` draws it as a hero numeral. Default `md`. */
  readingSize?: "md" | "lg" | "xl";
}

/** Statuses during which a previously-reported value must not be presented as current. */
const IN_TRANSITION = new Set(["syncing", "pairing", "updating"]);

const DeviceCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceCardProps>(
  ({ device, action, reading, footer, now, hideMeta = false, showIcon = false, readingSize = "md", className, ...props }, ref) => {
    const status = normalizeDeviceStatus(device?.status);
    const transitioning = IN_TRANSITION.has(status);
    const hasMeta = !hideMeta && (device?.battery !== undefined || device?.signal !== undefined || device?.lastSeenAt !== undefined);

    return (
      <div
        ref={ref}
        data-status={status}
        className={cn(
          "flex flex-col gap-4 rounded-2xl bg-card p-4 font-sans text-card-foreground shadow-sm",
          // A device changing state settles rather than snapping, so the change is legible as a
          // change. 300ms is the `motion.duration.base` token; `motion-reduce:` is Tailwind's own
          // variant, so this needs no stylesheet from the consumer and no page-level rule.
          "transition-colors duration-base ease-out motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {showIcon ? (
            <DeviceIdentity
              device={device}
              active={status === "online"}
              secondary={device?.locationName ?? device?.type ?? null}
              className="min-w-0"
            />
          ) : (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-title-sm text-foreground">{device?.name}</span>
              {device?.locationName || device?.type ? (
                <span className="truncate text-label-md text-muted-foreground">
                  {device?.locationName ?? device?.type}
                </span>
              ) : null}
            </div>
          )}
          {/* `ms-auto` rather than `ml-auto`: the trailing corner is the end edge, which flips under RTL. */}
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <DeviceStatusBadge status={status} />
            {action}
          </div>
        </div>

        {reading ? (
          transitioning ? (
            // The reading's slot, holding the reason there is no reading rather than a stale one.
            <div className="flex flex-col gap-0.5" data-reading="suppressed">
              <span className="text-label-md text-muted-foreground">{reading.metric}</span>
              <span className={cn("tabular-nums text-muted-foreground", readingSize === "md" ? "text-title-sm" : "text-headline-lg leading-none")}>—</span>
              <span className="text-label-md text-muted-foreground">Not current while {status}</span>
            </div>
          ) : (
            <SensorReading
              metric={reading.metric}
              value={reading.value}
              unit={reading.unit}
              quality={reading.quality}
              precision={reading.precision}
              size={readingSize}
            />
          )
        ) : null}

        {hasMeta ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {device?.battery !== undefined ? <BatteryIndicator value={device.battery} /> : null}
            {device?.signal !== undefined ? <SignalStrength value={device.signal} /> : null}
            {device?.lastSeenAt !== undefined ? (
              <LastSync value={device.lastSeenAt} now={now} className="text-label-md text-muted-foreground" />
            ) : null}
          </div>
        ) : null}

        {footer}
      </div>
    );
  },
), "DeviceCard");

export { DeviceCard };
