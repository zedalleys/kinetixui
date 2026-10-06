"use client";

import * as React from "react";
import type { KinetixConnectivityState, KinetixDeviceConnectivity } from "../types/device-state";
import { connectionShowsLastSeen, describeDeviceConnection, normalizeConnectivityState } from "../functions/connection";
import { describeConnectivity } from "../functions/device-state";
import { formatLastSeen } from "../functions/last-seen";
import { describeReadingAge } from "../functions/reading";
import { parseTimestamp } from "../functions/time";
import { Glyph, type GlyphName } from "./glyph";
import { SignalStrength } from "./signal-strength";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * DeviceConnection — the device's link, in one marker and one word (M3).
 *
 * A presentation of the existing `KinetixConnectivityState`, with no state of its own: `online`,
 * `offline`, `unreachable`, `stale`, `connecting` and `unknown`, each a different **shape** as well as a
 * different word, so none depends on colour:
 *
 * | State | Marker | Word |
 * | --- | --- | --- |
 * | online | filled disc | Online |
 * | offline | empty ring | Offline |
 * | unreachable | ringed cross | Unreachable |
 * | stale | clock | Data is out of date |
 * | connecting | half-filled ring (still) | Connecting |
 * | unknown | dash | Connection unknown |
 *
 * `stale` means the last-known evidence is old, not that the device is disconnected; `connecting` never
 * looks online; a missing state is `unknown`, never `offline`. Nothing pulses or spins — the link's
 * state is the meaning, not the motion, so reduced motion loses nothing.
 *
 * `lastSeenAt` is shown (as "5m ago", spoken in full) for every state except `online`, where it adds
 * nothing; `transportLabel` is the product's own words ("Thread via Hall hub") — no protocol is known
 * here; `signal` is optional 0–100 data drawn by `SignalStrength`.
 *
 * Not a live region: a passive change of link state is not announced unless the product decides it is
 * an event worth interrupting for, and then it owns that announcement.
 */
export interface DeviceConnectionProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** A connectivity state or a `KinetixDeviceConnectivity`. Missing or unrecognised is `unknown`. */
  state: KinetixConnectivityState | KinetixDeviceConnectivity | null | undefined;
  /** When the device was last heard from. Falls back to `state.lastSeenAt`. */
  lastSeenAt?: string | Date | number | null;
  /** When the current or last session started, if the product tracks it. Shown in `detail` density only. */
  lastConnectedAt?: string | Date | number | null;
  /** Display text for the link, supplied by the product. Never parsed. */
  transportLabel?: string;
  /** 0–100 signal, when reported. Falls back to `state.signal`. */
  signal?: number | null;
  /** When the last-seen time is shown. `auto` (default): for every state except `online`. */
  lastSeen?: "auto" | "always" | "never";
  /** `inline` (default) is one line; `detail` stacks the facts under the status. */
  density?: "inline" | "detail";
  now?: string | Date | number | null;
  /** Replace the accessible sentence. Blank falls back to the generated one. */
  label?: string;
}

const MARKER: Record<KinetixConnectivityState, { glyph: GlyphName; tone: string }> = {
  online: { glyph: "record", tone: "text-primary" },
  offline: { glyph: "circle", tone: "text-muted-foreground" },
  unreachable: { glyph: "circle-x", tone: "text-destructive" },
  stale: { glyph: "clock", tone: "text-muted-foreground" },
  connecting: { glyph: "circle-half", tone: "text-foreground" },
  unknown: { glyph: "dash", tone: "text-muted-foreground" },
};

const DeviceConnection = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, DeviceConnectionProps>(
  ({ state, lastSeenAt, lastConnectedAt, transportLabel, signal, lastSeen = "auto", density = "inline", now, label, className, ...props }, ref) => {
    const resolved = normalizeConnectivityState(state);
    const fromState = typeof state === "object" && state ? state : undefined;
    const seenAt = lastSeenAt ?? fromState?.lastSeenAt ?? null;
    const signalValue = signal ?? fromState?.signal;
    const marker = MARKER[resolved];
    const showSeen = connectionShowsLastSeen(resolved, lastSeen) && parseTimestamp(seenAt) !== null;
    const connectedAt = density === "detail" && parseTimestamp(lastConnectedAt ?? null) ? lastConnectedAt : null;
    const transport = transportLabel?.trim() ? transportLabel.trim() : null;
    const detail = density === "detail";

    let sentence = describeDeviceConnection({ state: resolved, lastSeenAt: seenAt, now, lastSeen });
    if (transport) sentence += `, ${transport}`;
    if (connectedAt) sentence += `, ${describeReadingAge(connectedAt, { now, verb: "connected" })}`;
    sentence = resolveLabel(label, sentence);

    return (
      <span
        ref={ref}
        data-connectivity={resolved}
        data-density={density}
        className={cn(
          "inline-flex max-w-full font-sans text-body-sm text-foreground",
          detail ? "flex-col items-start gap-1" : "flex-wrap items-center gap-x-2 gap-y-1",
          className,
        )}
        {...props}
      >
        <span className="sr-only" data-connection-sentence="">
          {sentence}
        </span>
        <span aria-hidden="true" className="inline-flex items-center gap-1.5">
          <Glyph name={marker.glyph} size={14} className={cn("shrink-0", marker.tone)} data-connection-marker={marker.glyph} />
          <span className={cn(resolved === "online" || resolved === "connecting" ? "font-medium" : "font-normal")}>{describeConnectivity(resolved)}</span>
        </span>
        {showSeen ? (
          <span aria-hidden="true" data-last-seen="" className="text-label-md tabular-nums text-muted-foreground">
            {detail ? `Last seen ${formatLastSeen(seenAt, { now }).replace(/^Just now$/, "just now")}` : formatLastSeen(seenAt, { now })}
          </span>
        ) : null}
        {connectedAt ? (
          <span aria-hidden="true" className="text-label-md tabular-nums text-muted-foreground">
            Connected {formatLastSeen(connectedAt, { now }).replace(/^Just now$/, "just now")}
          </span>
        ) : null}
        {transport ? (
          <span aria-hidden="true" data-transport="" className="min-w-0 break-words text-label-md text-muted-foreground">
            {transport}
          </span>
        ) : null}
        {typeof signalValue === "number" && Number.isFinite(signalValue) ? <SignalStrength value={signalValue} /> : null}
      </span>
    );
  },
), "DeviceConnection");

export { DeviceConnection };
