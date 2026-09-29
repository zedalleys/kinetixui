"use client";

import * as React from "react";
import {
  DeviceControlCard,
  DeviceGroupCard,
  DeviceLevelControl,
  DevicePowerControl,
  RoutineCard,
} from "@kinetixui/iot/react";
import { resolveControlState } from "@kinetixui/iot/functions";
import type { KinetixAutomation, KinetixDevice } from "@kinetixui/iot/functions";

// kx-iot:start
/**
 * A connected space: zones, the devices in one of them, and the automations that run it.
 *
 * Everything below is LOCAL DEMO STATE, and every device, zone and routine here is invented.
 * Toggling something changes a `useState` value in this component. `@kinetixui/iot` has no transport
 * — no MQTT, no BLE, no Matter, no WebSocket — so nothing reaches a device, and a showcase implying
 * otherwise would be advertising a capability the package does not have.
 *
 * The one behaviour worth watching: a command is held for 1.1s before it confirms. During that
 * window the control shows what you **asked for** as clearly distinct from what the device has
 * **reported**, which is the gap most device UIs paper over with an optimistic update.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const ahead = (ms: number) => new Date(Date.parse(NOW) + ms).toISOString();

const ZONES = [
  { id: "hall", name: "Packing hall", kind: "Zone", deviceCount: 12, activeCount: 7, category: "light" as const, summary: "21°C · 48% RH" },
  { id: "field", name: "North field", kind: "Zone", deviceCount: 8, activeCount: 4, attentionCount: 1, category: "pump" as const, summary: "3 of 8 valves open" },
  { id: "store", name: "Cold store", kind: "Site", deviceCount: 5, activeCount: 0, category: "sensor" as const, summary: "All within range" },
];

const FIXTURES: KinetixDevice[] = [
  { id: "bench", name: "Bench lamps", type: "light", status: "online", lastSeenAt: ago(30_000), locationName: "Packing hall" },
  { id: "bay", name: "Loading bay flood", type: "light", status: "online", lastSeenAt: ago(90_000), locationName: "Packing hall" },
  { id: "yard", name: "Yard flood", type: "light", status: "offline", lastSeenAt: ago(3 * 3_600_000), locationName: "Packing hall" },
];

const ROUTINES: KinetixAutomation[] = [
  {
    id: "shutdown",
    name: "End of shift",
    kind: "scene",
    status: "idle",
    enabled: true,
    actions: "9 lights off, 2 doors locked",
    lastRunAt: ago(14 * 3_600_000),
  },
  {
    id: "irrigation",
    name: "Evening irrigation",
    kind: "schedule",
    status: "idle",
    enabled: true,
    trigger: "Weekdays 18:30",
    actions: "2 valves, 40 min",
    lastRunAt: ago(20 * 3_600_000),
    nextRunAt: ahead(6 * 3_600_000),
  },
  {
    id: "frost",
    name: "Frost protection",
    kind: "routine",
    status: "failed",
    enabled: true,
    trigger: "Outside below 2°C",
    actions: "Circulation pump",
    lastRunAt: ago(90 * 60_000),
    errorMessage: "Pump did not acknowledge",
  },
];

type Pending = { id: string; kind: "power" | "level"; value: string | number };

export function ConnectedSpaceExample() {
  const [zoneId, setZoneId] = React.useState("hall");
  const [power, setPower] = React.useState<Record<string, "on" | "off">>({ bench: "on", bay: "off", yard: "on" });
  const [level, setLevel] = React.useState<Record<string, number>>({ bench: 100, bay: 40, yard: 70 });
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [routines, setRoutines] = React.useState(ROUTINES);
  const [openId, setOpenId] = React.useState<string | null>("bench");

  React.useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (pending.kind === "power") setPower((p) => ({ ...p, [pending.id]: pending.value as "on" | "off" }));
      if (pending.kind === "level") setLevel((l) => ({ ...l, [pending.id]: pending.value as number }));
      setPending(null);
    }, 1100);
    return () => clearTimeout(timer);
  }, [pending]);

  const controlFor = (device: KinetixDevice) =>
    resolveControlState({
      deviceStatus: device.status,
      commandStatus: pending?.id === device.id ? "sent" : undefined,
    });

  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0]!;

  return (
    <section aria-label="Connected space" className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ zones */}
      <div>
        <h3 className="mb-3 text-label-sm uppercase tracking-wide text-muted-foreground">Zones</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
          {ZONES.map((z) => (
            <DeviceGroupCard
              key={z.id}
              name={z.name}
              kind={z.kind}
              deviceCount={z.deviceCount}
              activeCount={z.activeCount}
              attentionCount={z.attentionCount}
              category={z.category}
              summary={z.summary}
              onSelect={() => setZoneId(z.id)}
              className={z.id === zoneId ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- the devices */}
      <div>
        <h3 className="mb-3 text-label-sm uppercase tracking-wide text-muted-foreground">{zone.name} — fixtures</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
          {FIXTURES.map((device) => {
            const control = controlFor(device);
            const requestedPower = pending?.id === device.id && pending.kind === "power" ? (pending.value as "on" | "off") : undefined;
            const on = power[device.id] === "on";

            return (
              <DeviceControlCard
                key={device.id}
                device={device}
                active={on && device.status === "online"}
                control={control}
                open={openId === device.id}
                onOpenChange={(next) => setOpenId(next ? device.id : null)}
                statusLine={
                  device.status === "offline"
                    ? "Last reachable 3h ago"
                    : requestedPower
                      ? `Turning ${requestedPower}`
                      : on
                        ? `${level[device.id]}% brightness`
                        : "Off"
                }
                primaryControl={
                  <DevicePowerControl
                    state={power[device.id]}
                    requested={requestedPower}
                    control={control}
                    label={`${device.name} power`}
                    showLabel={false}
                    onToggle={(next) => setPending({ id: device.id, kind: "power", value: next })}
                  />
                }
                expanded={
                  <DeviceLevelControl
                    value={level[device.id]}
                    target={pending?.id === device.id && pending.kind === "level" ? (pending.value as number) : undefined}
                    control={control}
                    label={`${device.name} brightness`}
                    unit="%"
                    onCommit={(next) => setPending({ id: device.id, kind: "level", value: next })}
                  />
                }
              />
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- routines */}
      <div>
        <h3 className="mb-3 text-label-sm uppercase tracking-wide text-muted-foreground">Automations</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
          {routines.map((automation) => (
            <RoutineCard
              key={automation.id}
              automation={automation}
              now={NOW}
              onToggleEnabled={(next) =>
                setRoutines((rs) => rs.map((r) => (r.id === automation.id ? { ...r, enabled: next } : r)))
              }
              onRun={() => {
                // A run that finishes on its own, so "running" is a state you can actually watch.
                setRoutines((rs) => rs.map((r) => (r.id === automation.id ? { ...r, status: "running" } : r)));
                setTimeout(
                  () =>
                    setRoutines((rs) =>
                      rs.map((r) => (r.id === automation.id ? { ...r, status: "idle", lastRunAt: NOW } : r)),
                    ),
                  1800,
                );
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
// kx-iot:end
