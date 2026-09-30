"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { describeDeviceStatus, normalizeDeviceStatus } from "../functions/status";
import { classifySignalStrength, describeSignal } from "../functions/signal";
import { describeLastSeen } from "../functions/last-seen";
import { detectStaleReading } from "../functions/telemetry";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * ConnectionHealth — what is known about reaching this device, written out.
 *
 * This is the troubleshooting surface, and the hardest thing about it is not adding a diagnosis.
 * This module has no transport, so it cannot know *why* a device is unreachable: a weak signal and a
 * dead gateway and a firewall rule all arrive here as the same absence. What it can do is separate
 * the signals that are usually collapsed into one red dot, so the person reading has the facts to
 * make the diagnosis themselves.
 *
 * Four rows, each independently true or unknown:
 *
 * - **Status** — what the fleet backend says the device is doing.
 * - **Signal** — reported quality, or explicitly not reported. `none` and `unknown` are different.
 * - **Last seen** — when the device was last heard from, in words.
 * - **Data freshness** — whether the newest reading is inside `freshnessMs`. This is the row that
 *   catches the case a status field alone gets wrong: a device can be "online" and have sent nothing
 *   for six hours, and only this row says so.
 *
 * Nothing here pulses, retries or probes. It renders what it was handed.
 */
export interface ConnectionHealthProps extends Omit<React.HTMLAttributes<HTMLDListElement>, "children"> {
  device: KinetixDevice;
  /**
   * How old the newest reading may be before it is called stale, in milliseconds. Omit to leave the
   * freshness row out entirely rather than guess a threshold — how fresh is fresh is a property of
   * the device, and a soil probe reporting twice a day is not unhealthy.
   */
  freshnessMs?: number;
  /** Timestamp of the newest reading, if the product tracks it separately from `lastSeenAt`. */
  lastReadingAt?: string | Date | number | null;
  /** Reference instant. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number;
}

function Row({ term, children, state }: { term: string; children: React.ReactNode; state?: string }) {
  return (
    <div data-state={state} className="flex min-h-11 items-baseline justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <dt className="text-body-sm text-muted-foreground">{term}</dt>
      <dd className="m-0 text-end text-title-sm text-foreground">{children}</dd>
    </div>
  );
}

const ConnectionHealth = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDListElement, ConnectionHealthProps>(
  ({ device, freshnessMs, lastReadingAt, now, className, ...props }, ref) => {
    const status = normalizeDeviceStatus(device?.status);
    const signalLevel = classifySignalStrength(device?.signal);
    const readingAt = lastReadingAt ?? device?.lastSeenAt ?? null;

    // Only computed when a threshold was supplied. Without one there is no such thing as stale here,
    // and inventing a default would make every slow-reporting device look broken.
    const stale = freshnessMs === undefined ? null : detectStaleReading(readingAt, freshnessMs, now);

    return (
      <dl ref={ref} data-status={status} className={cn("font-sans", className)} {...props}>
        <Row term="Status" state={status}>
          {describeDeviceStatus(status)}
        </Row>
        <Row term="Signal" state={signalLevel}>
          {describeSignal(device?.signal)}
        </Row>
        <Row term="Last seen">{describeLastSeen(device?.lastSeenAt, { now })}</Row>
        {stale === null ? null : (
          <Row term="Data" state={stale ? "stale" : "fresh"}>
            {stale ? "Older than expected" : "Up to date"}
          </Row>
        )}
      </dl>
    );
  },
), "ConnectionHealth");

export { ConnectionHealth };
