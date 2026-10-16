"use client";

import * as React from "react";
import { NativeSelect, NativeSelectOption, Slider } from "@kinetixui/ui";
import {
  BatteryIndicator,
  DeviceStatusBadge,
  LastSync,
  SensorReading,
  SignalStrength,
} from "@kinetixui/iot/react";
import type { KinetixDeviceStatus, KinetixTelemetryQuality } from "@kinetixui/iot/functions";
import { Checkbox, Label } from "@kinetixui/ui";
import { useDocumentDirection } from "@/lib/use-document-direction";

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
const LAST_SEEN_STEPS: readonly { minutes: number | null; label: string; spoken: string }[] = [
  { minutes: 0, label: "now", spoken: "now" },
  { minutes: 5, label: "5m", spoken: "5 minutes ago" },
  { minutes: 90, label: "90m", spoken: "90 minutes ago" },
  { minutes: 60 * 26, label: "26h", spoken: "26 hours ago" },
  { minutes: 60 * 24 * 3, label: "3d", spoken: "3 days ago" },
  { minutes: null, label: "never", spoken: "never reported" },
];

function instantFor(minutes: number | null): string | null {
  if (minutes === null) return null;
  return new Date(Date.parse(NOW) - minutes * 60_000).toISOString();
}

/**
 * A labelled row in the control column. Every control has a name: a native control through `htmlFor`/`id`, and a
 * library `Slider` through `aria-labelledby` on the label's own id, because its named element is the thumb
 * (`role="slider"`), not the root a `for` attribute would point at.
 */
function Control({ id, label, slider = false, children }: { id: string; label: string; slider?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label
        id={`${id}-label`}
        htmlFor={slider ? undefined : id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
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
  // Radix reads direction from context or `dir`; this page has no provider, so pass the document's.
  const dir = useDocumentDirection();

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
          <NativeSelect
            id="iot-demo-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as KinetixDeviceStatus)}
          >
            {STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {s}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Control>

        {/* The library Slider: one thumb, so the value is a one-item array. `h-9` keeps the 36px pointer target the
            native range had: Radix takes a press anywhere on the root, not only on the 16px thumb. Battery and
            signal are disabled while the device reports no value; the Slider says so on its thumb. */}
        <Control id="iot-demo-battery" slider label={batteryReported ? `Battery — ${battery}%` : "Battery — not reported"}>
          <Slider
            id="iot-demo-battery"
            aria-labelledby="iot-demo-battery-label"
            aria-valuetext={`${battery}%`}
            dir={dir}
            min={0}
            max={100}
            step={1}
            value={[battery]}
            disabled={!batteryReported}
            onValueChange={([next]) => setBattery(next!)}
            className="h-9"
          />
          <Label className="flex min-h-6 cursor-pointer items-center gap-2 py-1 text-xs font-normal leading-normal text-muted-foreground">
            <Checkbox checked={!batteryReported} onCheckedChange={(checked) => setBatteryReported(checked !== true)} />
            Device reports no battery
          </Label>
        </Control>

        <Control id="iot-demo-signal" slider label={signalReported ? `Signal — ${signal}` : "Signal — not reported"}>
          <Slider
            id="iot-demo-signal"
            aria-labelledby="iot-demo-signal-label"
            dir={dir}
            min={0}
            max={100}
            step={1}
            value={[signal]}
            disabled={!signalReported}
            onValueChange={([next]) => setSignal(next!)}
            className="h-9"
          />
          <Label className="flex min-h-6 cursor-pointer items-center gap-2 py-1 text-xs font-normal leading-normal text-muted-foreground">
            <Checkbox checked={!signalReported} onCheckedChange={(checked) => setSignalReported(checked !== true)} />
            Device reports no signal
          </Label>
        </Control>

        <Control id="iot-demo-last-seen" label={`Last sync — ${step.label}`} slider>
          <Slider
            id="iot-demo-last-seen"
            aria-labelledby="iot-demo-last-seen-label"
            aria-valuetext={step.spoken}
            dir={dir}
            min={0}
            max={LAST_SEEN_STEPS.length - 1}
            step={1}
            value={[lastSeenStep]}
            onValueChange={([next]) => setLastSeenStep(next!)}
            className="h-9"
          />
        </Control>

        <Control id="iot-demo-temperature" label={`Temperature — ${temperature.toFixed(1)} °C`} slider>
          <Slider
            id="iot-demo-temperature"
            aria-labelledby="iot-demo-temperature-label"
            dir={dir}
            min={-10}
            max={45}
            step={0.1}
            value={[temperature]}
            onValueChange={([next]) => setTemperature(next!)}
            className="h-9"
          />
        </Control>

        <Control id="iot-demo-quality" label="Reading quality">
          <NativeSelect
            id="iot-demo-quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as KinetixTelemetryQuality)}
          >
            {QUALITIES.map((q) => (
              <NativeSelectOption key={q.value} value={q.value}>
                {q.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Control>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Every control sets a prop on a real primitive. Nothing here connects to a device — see{" "}
          <span className="text-foreground">Bring your own connection</span> below.
        </p>
      </div>
    </div>
  );
}
