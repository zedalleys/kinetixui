"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { classifyBatteryLevel } from "../functions/battery";
import { BatteryIndicator } from "./battery-indicator";
import { LastSync } from "./last-sync";
import { SignalStrength } from "./signal-strength";
import { cn } from "./cn";

/**
 * Module-private: the battery / signal / last-update row of a device card, at one of two densities.
 * Shared by `DeviceCard` and `CameraDeviceCard`; not exported from the package.
 *
 * - `full` is the row as it always was: every indicator the device carries, side by side.
 * - `glance` keeps only the exception in view — a battery that is low or critical — and puts the rest
 *   (the battery when it is fine, the signal, when the device last reported) behind one native
 *   `<details>`. Nothing is removed: it is one press away, and a keyboard and screen-reader user reaches
 *   it as an ordinary disclosure.
 */
export type DeviceCardDensity = "full" | "glance";

export function batteryNeedsAttention(battery: number | undefined): boolean {
  const level = classifyBatteryLevel(battery);
  return level === "low" || level === "critical";
}

export function DeviceMeta({
  device,
  now,
  density,
  className,
}: {
  device: KinetixDevice;
  now?: string | Date | number | null;
  density: DeviceCardDensity;
  className?: string;
}) {
  const battery = device?.battery;
  const signal = device?.signal;
  const lastSeen = device?.lastSeenAt;
  const hasBattery = battery !== undefined;
  const hasSignal = signal !== undefined;
  const hasLastSeen = lastSeen !== undefined;
  if (!hasBattery && !hasSignal && !hasLastSeen) return null;

  if (density === "full") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
        {hasBattery ? <BatteryIndicator value={battery} /> : null}
        {hasSignal ? <SignalStrength value={signal} /> : null}
        {hasLastSeen ? <LastSync value={lastSeen} now={now ?? undefined} className="text-label-md text-muted-foreground" /> : null}
      </div>
    );
  }

  const batteryInline = hasBattery && batteryNeedsAttention(battery);
  const tucked = (hasBattery && !batteryInline) || hasSignal || hasLastSeen;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {batteryInline ? <BatteryIndicator value={battery} /> : null}
      {tucked ? (
        <details data-device-meta="" className="group/meta min-w-0">
          <summary
            className={cn(
              "inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg text-label-lg text-muted-foreground marker:hidden md:min-h-9",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 rtl:-scale-x-100 group-open/meta:rotate-90">
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
            Device details
          </summary>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {hasBattery && !batteryInline ? <BatteryIndicator value={battery} /> : null}
            {hasSignal ? <SignalStrength value={signal} /> : null}
            {hasLastSeen ? <LastSync value={lastSeen} now={now ?? undefined} className="text-label-md text-muted-foreground" /> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
