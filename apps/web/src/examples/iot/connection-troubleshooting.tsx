import { ConnectionHealth, DeviceStatusBadge } from "@kinetixui/iot/react";
import { DEMO_NOW, deviceById } from "./demo-fleet";
import type { KinetixDevice } from "@kinetixui/iot/functions";

// kx-iot:start
/**
 * Six devices that a single "offline" dot would describe identically, and the facts that tell them
 * apart. The library does not diagnose the cause — it has no transport and cannot know whether a
 * gateway died or a firewall changed — it separates the signals so a person can.
 */
const CASES: { device: KinetixDevice; what: string }[] = [
  { device: deviceById("probe-a"), what: "Reporting on schedule. Nothing to do." },
  { device: deviceById("probe-b"), what: "Reachable, but the data behind it is hours old — the case a status field alone gets wrong." },
  { device: deviceById("air-1"), what: "Weak signal and a fault reported by the device itself." },
  { device: deviceById("probe-c"), what: "Not heard from in days, and the battery was nearly flat when it was." },
  { device: { ...deviceById("gateway-1"), signal: undefined }, what: "No signal figure reported. Not the same as a signal of zero." },
  { device: deviceById("meter-1"), what: "Mid-update. Its last reading is not its current reading." },
];

export function ConnectionTroubleshootingExample() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {CASES.map(({ device, what }) => (
        <div key={device.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-title-md text-foreground">{device.name}</span>
            <DeviceStatusBadge status={device.status} />
          </div>
          <ConnectionHealth device={device} freshnessMs={10 * 60_000} now={DEMO_NOW} />
          <p className="text-body-md text-muted-foreground">{what}</p>
        </div>
      ))}
    </div>
  );
}
// kx-iot:end
