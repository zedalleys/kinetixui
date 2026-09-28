"use client";

import * as React from "react";
import {
  BatteryIndicator,
  DeviceStatusBadge,
  LastSync,
  SensorReading,
  SignalStrength,
} from "@kinetixui/iot/react";
import type { KinetixDeviceStatus, KinetixTelemetryQuality } from "@kinetixui/iot/functions";
import { Label } from "@kinetixui/ui";

/**
 * The interactive half of /iot: the five shipped primitives, driven by a handful of controls.
 *
 * Scope, deliberately: this demonstrates component behaviour and nothing else. There is no device, no
 * transport, no simulated telemetry stream and no persisted state — the controls set props, the primitives
 * render them, and that is the whole mechanism. Anything that looked like a device simulator would be
 * claiming the thing this module explicitly does not do.
 *
 * `now` is a fixed instant rather than `Date.now()`. `LastSync` is relative-time output, so a live clock would
 * make the page render differently on the server and the client and produce a hydration mismatch — and the
 * primitive takes `now` as a prop precisely so a caller can be deterministic. The slider moves the reading
 * away from that instant instead.
 */

/** The reference instant every relative time on this page is measured from. */
const NOW = "2026-01-01T12:00:00.000Z";

/** Status options, in the order a fleet list would sort them — the same order the package exports. */
const STATUSES: readonly KinetixDeviceStatus[] = [
  "online",
  "stale",
  "syncing",
  "updating",
  "pairing",
  "warning",
  "error",
  "offline",
  "disabled",
];

const QUALITIES: readonly { value: KinetixTelemetryQuality; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "estimated", label: "Estimated" },
  { value: "missing", label: "No reading" },
  { value: "error", label: "Sensor error" },
];

/** Minutes-ago stops for the Last sync control. `null` is "never reported", which is not the same as "old". */
const LAST_SEEN_STEPS: readonly { minutes: number | null; label: string }[] = [
  { minutes: 0, label: "now" },
  { minutes: 5, label: "5m" },
  { minutes: 90, label: "90m" },
  { minutes: 60 * 26, label: "26h" },
  { minutes: 60 * 24 * 3, label: "3d" },
  { minutes: null, label: "never" },
];

function instantFor(minutes: number | null): string | null {
  if (minutes === null) return null;
  return new Date(Date.parse(NOW) - minutes * 60_000).toISOString();
}

/** A labelled row in the control column. `htmlFor`/`id` are real, so every control has a name. */
function Control({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** One primitive in the preview column: what it is, then the thing itself. */
function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border py-3 last:border-b-0">
      <code className="font-mono text-xs text-muted-foreground">{name}</code>
      <div className="flex min-h-7 items-center">{children}</div>
    </div>
  );
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const rangeClass =
  "h-9 w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function DeviceShowcase() {
  const [status, setStatus] = React.useState<KinetixDeviceStatus>("online");
  const [battery, setBattery] = React.useState(72);
  const [signal, setSignal] = React.useState(84);
  const [temperature, setTemperature] = React.useState(23.4);
  const [quality, setQuality] = React.useState<KinetixTelemetryQuality>("good");
  const [lastSeenStep, setLastSeenStep] = React.useState(1);
  const [batteryReported, setBatteryReported] = React.useState(true);
  const [signalReported, setSignalReported] = React.useState(true);

  const step = LAST_SEEN_STEPS[lastSeenStep] ?? LAST_SEEN_STEPS[1]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      {/* ── preview ─────────────────────────────────────────────── */}
      {/* `self-start` so the card sizes to its rows. Grid items stretch to the row height by default, and the
          controls column is the taller of the two — which left a large empty area under SensorReading. */}
      <div className="self-start rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-display text-base font-semibold">Environment Sensor</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">env-sensor-04</p>
          </div>
          <DeviceStatusBadge status={status} />
        </div>

        <div className="mt-2">
          <Row name="DeviceStatusBadge">
            <DeviceStatusBadge status={status} />
          </Row>
          <Row name="BatteryIndicator">
            <BatteryIndicator value={batteryReported ? battery : null} />
          </Row>
          <Row name="SignalStrength">
            <SignalStrength value={signalReported ? signal : null} />
          </Row>
          <Row name="LastSync">
            <LastSync value={instantFor(step.minutes)} now={NOW} />
          </Row>
          <Row name="SensorReading">
            <SensorReading metric="Temperature" value={temperature} unit="°C" precision={1} quality={quality} />
          </Row>
        </div>
      </div>

      {/* ── controls ────────────────────────────────────────────── */}
      <div className="grid content-start gap-5">
        <Control id="iot-demo-status" label="Status">
          <select
            id="iot-demo-status"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as KinetixDeviceStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Control>

        <Control id="iot-demo-battery" label={batteryReported ? `Battery — ${battery}%` : "Battery — not reported"}>
          <input
            id="iot-demo-battery"
            type="range"
            min={0}
            max={100}
            step={1}
            value={battery}
            disabled={!batteryReported}
            onChange={(e) => setBattery(Number(e.target.value))}
            className={rangeClass}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!batteryReported}
              onChange={(e) => setBatteryReported(!e.target.checked)}
              className="size-3.5 accent-primary"
            />
            Device reports no battery
          </label>
        </Control>

        <Control id="iot-demo-signal" label={signalReported ? `Signal — ${signal}` : "Signal — not reported"}>
          <input
            id="iot-demo-signal"
            type="range"
            min={0}
            max={100}
            step={1}
            value={signal}
            disabled={!signalReported}
            onChange={(e) => setSignal(Number(e.target.value))}
            className={rangeClass}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!signalReported}
              onChange={(e) => setSignalReported(!e.target.checked)}
              className="size-3.5 accent-primary"
            />
            Device reports no signal
          </label>
        </Control>

        <Control id="iot-demo-last-seen" label={`Last sync — ${step.label}`}>
          <input
            id="iot-demo-last-seen"
            type="range"
            min={0}
            max={LAST_SEEN_STEPS.length - 1}
            step={1}
            value={lastSeenStep}
            onChange={(e) => setLastSeenStep(Number(e.target.value))}
            className={rangeClass}
          />
        </Control>

        <Control id="iot-demo-temperature" label={`Temperature — ${temperature.toFixed(1)} °C`}>
          <input
            id="iot-demo-temperature"
            type="range"
            min={-10}
            max={45}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className={rangeClass}
          />
        </Control>

        <Control id="iot-demo-quality" label="Reading quality">
          <select
            id="iot-demo-quality"
            className={selectClass}
            value={quality}
            onChange={(e) => setQuality(e.target.value as KinetixTelemetryQuality)}
          >
            {QUALITIES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </Control>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Every control sets a prop on a real primitive. Nothing here connects to a device — see{" "}
          <span className="text-foreground">Bring your own connection</span> below.
        </p>
      </div>
    </div>
  );
}
