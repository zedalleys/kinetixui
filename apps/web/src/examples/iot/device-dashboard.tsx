"use client";

import * as React from "react";
import {
  AlertCard,
  CommandStatus,
  DeviceCard,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  DeviceStateSummary,
  TelemetryCard,
} from "@kinetixui/iot/react";
import { compareDeviceAttention, describeDeviceStatus, resolveControlState, summarizeDevices } from "@kinetixui/iot/functions";
import type { KinetixDevice, KinetixDeviceStatus } from "@kinetixui/iot/functions";
import {
  DEMO_ALERTS,
  DEMO_COMMANDS,
  DEMO_DEVICES,
  DEMO_NOW,
  DEMO_READINGS,
  DEMO_SERIES,
  deviceById,
} from "./demo-fleet";

// kx-iot:start
/**
 * Everything below is LOCAL DEMO STATE.
 *
 * Toggling a device, moving a slider or acknowledging an alert changes a `useState` value in this
 * component and nothing else. `@kinetixui/iot` has no transport — no MQTT, no BLE, no WebSocket, no
 * HTTP client — so nothing here reaches a device, and a showcase that implied otherwise would be
 * advertising a capability the package does not have.
 */
const GROUPS = ["All", "Cold store A", "Plant room", "Bay 2"] as const;
type Group = (typeof GROUPS)[number];

// The product supplies these. `@kinetixui/iot` hard-codes no mode vocabulary, because the same
// control serves a chiller, an irrigation valve and a conveyor.
const MODES = [
  { id: "cool", label: "Cool" },
  { id: "hold", label: "Hold" },
  { id: "defrost", label: "Defrost", description: "Unavailable until the cycle completes", unavailable: true },
];

export function DeviceDashboardExample() {
  const [group, setGroup] = React.useState<Group>("All");
  const [selectedId, setSelectedId] = React.useState<string>("probe-a");
  const [overrides, setOverrides] = React.useState<Record<string, KinetixDeviceStatus>>({});
  const [acknowledged, setAcknowledged] = React.useState<Record<string, string>>({});
  // Confirmed values — what the imaginary device has reported.
  const [powered, setPowered] = React.useState<"on" | "off">("on");
  const [intensity, setIntensity] = React.useState(62);
  const [target, setTarget] = React.useState(4);
  const [mode, setMode] = React.useState("cool");

  // Requested values — what the user has asked for and the device has not confirmed yet.
  const [pending, setPending] = React.useState<null | { kind: "power" | "level" | "target" | "mode"; value: string | number }>(null);

  // A command that resolves after a beat, so the requested-versus-confirmed gap is visible rather
  // than theoretical. A product would replace this with whatever its transport reports back.
  React.useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (pending.kind === "power") setPowered(pending.value as "on" | "off");
      if (pending.kind === "level") setIntensity(pending.value as number);
      if (pending.kind === "target") setTarget(pending.value as number);
      if (pending.kind === "mode") setMode(pending.value as string);
      setPending(null);
    }, 1100);
    return () => clearTimeout(timer);
  }, [pending]);

  const request = (kind: "power" | "level" | "target" | "mode", value: string | number) => setPending({ kind, value });

  const devices: KinetixDevice[] = DEMO_DEVICES.map((device) =>
    overrides[device.id] ? { ...device, status: overrides[device.id]! } : device,
  );
  const inGroup = group === "All" ? devices : devices.filter((device) => device.locationName === group);
  const ordered = [...inGroup].sort(compareDeviceAttention);
  const summary = summarizeDevices(inGroup);
  const selected = deviceById(selectedId);

  // One resolution for all four controls, so they cannot disagree about whether the device is
  // reachable or a command is outstanding.
  const control = resolveControlState({
    deviceStatus: selected.status,
    commandStatus: pending ? "sent" : undefined,
  });
  const alerts = DEMO_ALERTS.map((a) => (acknowledged[a.id] ? { ...a, acknowledgedAt: acknowledged[a.id] } : a));
  const openAlerts = alerts.filter((a) => !a.acknowledgedAt);

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------------------------------------------- header */}
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className="text-title-sm text-foreground">Cold chain · Site 4</h3>
          {/* A count, not a verdict. Whether two offline devices is fine depends on what they are. */}
          <p className="text-label-sm text-muted-foreground">
            {summary.total} device{summary.total === 1 ? "" : "s"} · {summary.needsAttention} needing attention ·{" "}
            {openAlerts.length} open alert{openAlerts.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* The group selector every product surveyed puts here, generalised from "rooms". */}
        <div role="tablist" aria-label="Device group" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {GROUPS.map((name) => (
            <button
              key={name}
              role="tab"
              type="button"
              aria-selected={group === name}
              onClick={() => setGroup(name)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-label-sm transition-colors duration-200 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                group === name ? "bg-foreground text-background" : "border border-input text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {name}
            </button>
          ))}
        </div>

        <DeviceStateSummary devices={inGroup} />
      </header>

      {/* ---------------------------------------------------------------- fleet + detail */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Devices" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
          {ordered.map((device) => {
            const isSelected = device.id === selectedId;
            return (
              <DeviceCard
                key={device.id}
                device={device}
                reading={DEMO_READINGS[device.id]}
                now={DEMO_NOW}
                className={isSelected ? "border-foreground/40 ring-1 ring-foreground/20" : ""}
                action={
                  <button
                    type="button"
                    onClick={() => setSelectedId(device.id)}
                    aria-pressed={isSelected}
                    className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="sr-only">Show details for {device.name}. </span>
                    Details
                  </button>
                }
              />
            );
          })}
          {ordered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-label-md text-muted-foreground">
              No devices in this group.
            </p>
          ) : null}
        </section>

        {/* The detail panel: the tile-to-detail pattern, as a column beside the grid on wide screens
            and a section below it on narrow ones. */}
        <aside aria-label={`Detail: ${selected.name}`} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Selected device</span>
            <span className="text-title-sm text-foreground">{selected.name}</span>
            <span className="text-label-sm text-muted-foreground">{selected.locationName}</span>
          </div>

          {/* The control layer, wired to LOCAL DEMO STATE.
              A request is held for 1.1s before it "confirms", because that is what a device on a
              real network does — and because the state worth showing is the one in between. Nothing
              here reaches a device: `@kinetixui/iot` has no transport of any kind. */}
          <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
            <legend className="sr-only">Demonstration controls for {selected.name}</legend>

            <DevicePowerControl
              state={powered}
              requested={pending?.kind === "power" ? (pending.value as "on" | "off") : undefined}
              control={control}
              label={`${selected.name} power`}
              onToggle={(next) => request("power", next)}
            />

            <DeviceLevelControl
              value={intensity}
              target={pending?.kind === "level" ? (pending.value as number) : undefined}
              control={control}
              label="Intensity"
              unit="%"
              onCommit={(next) => request("level", next)}
            />

            <DeviceSetpointControl
              current={selected.id === "probe-a" ? 4.2 : undefined}
              target={target}
              requestedTarget={pending?.kind === "target" ? (pending.value as number) : undefined}
              min={-20}
              max={25}
              unit="°C"
              label="Target temperature"
              control={control}
              onCommit={(next) => request("target", next)}
            />

            <DeviceModeControl
              modes={MODES}
              value={mode}
              requested={pending?.kind === "mode" ? (pending.value as string) : undefined}
              control={control}
              label="Operating mode"
              onSelect={(id) => request("mode", id)}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-label-md text-foreground">Simulate a state</span>
              <div className="flex flex-wrap gap-1.5">
                {(["online", "syncing", "stale", "offline", "error"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOverrides((prev) => ({ ...prev, [selected.id]: status }))}
                    className="rounded-full border border-input px-2.5 py-1 text-label-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    {describeDeviceStatus(status)}
                  </button>
                ))}
              </div>
              {/* One polite live region for the whole panel, announced only when the reader acted.
                  Telemetry updates are deliberately NOT announced — a dashboard that narrates every
                  reading is a dashboard nobody can use with a screen reader. */}
              <p aria-live="polite" className="text-label-sm text-muted-foreground">
                {overrides[selected.id] ? `${selected.name} is now ${describeDeviceStatus(overrides[selected.id]!).toLowerCase()}.` : ""}
              </p>
            </div>
          </fieldset>
        </aside>
      </div>

      {/* ---------------------------------------------------------------- telemetry */}
      <section aria-label="Telemetry" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
        <TelemetryCard series={DEMO_SERIES.temperature} metric="Temperature" precision={1} now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.humidity} metric="Humidity" now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.load} metric="Load" precision={1} now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.airQuality} metric="PM2.5" now={DEMO_NOW} />
      </section>

      {/* ---------------------------------------------------------------- alerts + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Alerts" className="flex flex-col gap-2">
          <h4 className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Alerts</h4>
          {openAlerts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-label-md text-muted-foreground">
              Nothing unacknowledged.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {openAlerts.map((alert) => (
                <li key={alert.id}>
                  <AlertCard
                    alert={alert}
                    deviceName={deviceById(alert.deviceId).name}
                    now={DEMO_NOW}
                    action={
                      <button
                        type="button"
                        onClick={() => setAcknowledged((prev) => ({ ...prev, [alert.id]: DEMO_NOW }))}
                        className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="sr-only">Acknowledge alert: {alert.message}. </span>
                        Acknowledge
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Activity" className="flex flex-col gap-2">
          <h4 className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Recent commands</h4>
          {/* The time-rail activity list: the timestamp gutter is the structure, not a trailing note. */}
          <ul className="flex flex-col">
            {DEMO_COMMANDS.map((command) => (
              <li key={command.id} className="grid grid-cols-[auto_1fr] gap-3 border-s border-border ps-4 pb-4 last:pb-0">
                <span aria-hidden="true" className="-ms-[1.3rem] mt-1.5 size-2 rounded-full bg-border" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-label-md text-foreground">{deviceById(command.deviceId).name}</span>
                  <CommandStatus command={command} showName now={DEMO_NOW} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
// kx-iot:end
