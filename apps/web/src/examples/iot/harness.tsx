"use client";

/**
 * The demo harness shared by the interactive IoT examples.
 *
 * This file is NOT part of any copyable snippet, and it is not part of `@kinetixui/iot`. It is the
 * glue between the deterministic simulation (`@/lib/iot-sim`) and the package's components. It renders
 * NO package component itself: `controlOf`, `readingOf` and `trendOf` return plain data (the confirmed
 * value and the requested value separately, a resolved control state, a reading with its thresholds),
 * so each example writes the real `@kinetixui/iot` JSX in its own copyable region.
 *
 * Nothing here talks to a device. The simulation is scripted in the browser; see `SimNotice`.
 */
import * as React from "react";
import {
  describePowerState,
  resolveControlState,
  type KinetixControlState,
  type KinetixDevice,
  type KinetixDeviceCapability,
  type KinetixMetricThresholds,
  type KinetixTelemetrySeries,
} from "@kinetixui/iot/functions";
import { SIMULATION_DISCLOSURE, SIMULATION_LABEL, latestCommand, selectReading, selectSeries } from "@/lib/iot-sim";
import type { SimCommand, SimScenario, Simulation } from "@/lib/iot-sim";
import type { UseIotSimulation } from "@/lib/iot-sim/use-simulation";
import { cn } from "@/lib/utils";

export const BUTTON =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-label-sm text-foreground " +
  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** A section heading inside an example. Level 4: the page owns levels 1-3. */
export function Section({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h4 className="text-label-sm uppercase tracking-wide text-muted-foreground">{title}</h4>
        {hint ? <p className="text-label-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The simulation disclosure, small and next to the example. `SIMULATION_LABEL` as a badge plus the
 * scenario's own fabricated-data statement. Never hidden behind a tooltip.
 */
export function SimNotice({ scenario, text, children, className }: { scenario?: SimScenario; text?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div data-simulation-notice="" className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-muted-foreground", className)}>
      <span className="rounded-full border border-border px-2 py-0.5 text-label-sm font-medium uppercase tracking-wide text-foreground">{SIMULATION_LABEL}</span>
      <span className="min-w-0 break-words">{text ?? scenario?.disclosure ?? SIMULATION_DISCLOSURE}</span>
      {children}
    </div>
  );
}

/** Pause / step / reset for the simulated clock. Stepping is also how a keyboard user moves time. */
export function SimTransport({ iot, className }: { iot: UseIotSimulation; className?: string }) {
  return (
    <div role="group" aria-label="Simulation clock" className={cn("flex flex-wrap items-center gap-2", className)}>
      <button type="button" className={BUTTON} onClick={iot.togglePaused} aria-pressed={iot.paused}>
        {iot.paused ? "Resume clock" : "Pause clock"}
      </button>
      <button type="button" className={BUTTON} onClick={() => iot.step(1000)}>
        Step 1 s
      </button>
      <button type="button" className={BUTTON} onClick={iot.reset}>
        Reset demo
      </button>
      {iot.reducedMotion ? <span className="text-label-sm text-muted-foreground">Reduced motion: ambient drift is off.</span> : null}
    </div>
  );
}

/** `prefers-reduced-motion: reduce`, read after mount so the server render and hydration agree. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(media.matches);
    read();
    media.addEventListener?.("change", read);
    return () => media.removeEventListener?.("change", read);
  }, []);
  return reduced;
}

/** The reading direction of an element, so Radix keyboard navigation reverses under RTL. */
export function useInheritedDirection<T extends HTMLElement>(): [React.RefObject<T | null>, "ltr" | "rtl"] {
  const ref = React.useRef<T | null>(null);
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  React.useEffect(() => {
    if (ref.current) setDir(getComputedStyle(ref.current).direction === "rtl" ? "rtl" : "ltr");
  }, []);
  return [ref, dir];
}

// ---------------------------------------------------------------------------------------------
// Data bindings: simulation state in, props for the real components out
// ---------------------------------------------------------------------------------------------

const CONTROLLABLE = new Set(["power", "level", "setpoint", "mode"]);

export const controllableCapabilities = (scenario: SimScenario, deviceId: string): KinetixDeviceCapability[] =>
  (scenario.capabilities[deviceId] ?? []).filter((c) => CONTROLLABLE.has(c.kind) && !c.readOnly);

export function formatCapabilityValue(cap: KinetixDeviceCapability, value: unknown): string {
  if (value === undefined || value === null) return "unknown";
  if (cap.kind === "power") return describePowerState(value === "on" ? "on" : value === "off" ? "off" : "unknown");
  if (cap.kind === "mode") return cap.modes?.find((m) => m.id === value)?.label ?? String(value);
  if (typeof value === "number") return `${value}${cap.unit ? (cap.unit === "%" || cap.unit.startsWith("°") ? "" : " ") + cap.unit : ""}`;
  return String(value);
}

/** The device as the simulation currently has it. */
export const deviceOf = (sim: Simulation, deviceId: string): KinetixDevice => sim.devices[deviceId]!.device;

/** Everything one control needs, read from the simulation. Nothing here renders. */
export type ControlBinding = {
  device: KinetixDevice;
  capability: KinetixDeviceCapability;
  /** What the device last REPORTED. The only value that is true. */
  confirmed: unknown;
  /** What the user ASKED for and the device has not confirmed. `undefined` when nothing is pending. */
  requested: unknown;
  /** From `resolveControlState`: availability, phase, and whether the control accepts input. */
  control: KinetixControlState;
  /** The newest command for this control, of any stage. */
  command: SimCommand | undefined;
  /** Whether that command still needs attention: in flight, or ended without confirming. */
  unsettled: boolean;
  send: (value: unknown) => void;
  retry: () => void;
  cancel: () => void;
  format: (value: unknown) => string;
};

/**
 * Bind one capability of one device to the simulation. A pending or failed command is surfaced in
 * `control`; a confirmed one is not, because "confirmed" is the ordinary state and a permanent badge
 * for it would be noise.
 */
export function controlOf(iot: UseIotSimulation, deviceId: string, capabilityId: string): ControlBinding {
  const { sim } = iot;
  const rt = sim.devices[deviceId]!;
  const capability = (sim.scenario.capabilities[deviceId] ?? []).find((c) => c.id === capabilityId)!;
  const command = latestCommand(sim, deviceId, capabilityId);
  const unsettled = !!command && command.lifecycle.stage !== "confirmed" && command.lifecycle.stage !== "cancelled";
  return {
    device: rt.device,
    capability,
    confirmed: rt.confirmedValues[capabilityId],
    requested: rt.requestedValues[capabilityId],
    control: resolveControlState({ deviceStatus: rt.device.status, lifecycle: unsettled ? command!.lifecycle : null }),
    command,
    unsettled,
    send: (value) => iot.dispatch(deviceId, capabilityId, value),
    retry: () => command && iot.retry(command.id),
    cancel: () => command && iot.cancel(command.id),
    format: (value) => formatCapabilityValue(capability, value),
  };
}

/** A status line that never states a request as fact: "Power: Off, requested On". */
export function statusLineOf(...bindings: readonly ControlBinding[]): string {
  if (bindings[0]?.device.status === "offline") return "Offline. Showing the last known settings.";
  return bindings
    .map((b) => `${b.capability.label ?? b.capability.id}: ${b.format(b.confirmed)}${b.requested !== undefined ? `, requested ${b.format(b.requested)}` : ""}`)
    .join(" · ");
}

/** Props for `TelemetryMetric`: the latest reading with the scenario's own thresholds and freshness rule. */
export function readingOf(iot: UseIotSimulation, deviceId: string, metric: string) {
  const { sim } = iot;
  const sensor = sim.scenario.sensors.find((s) => s.deviceId === deviceId && s.metric === metric);
  const reading = selectReading(sim, deviceId, metric);
  return {
    metric,
    value: reading?.value ?? null,
    unit: sensor?.unit,
    precision: sensor?.decimals,
    timestamp: reading?.timestamp,
    staleAfterMs: sensor ? (sensor.staleAfterMs ?? (sensor.sampleMs ?? 5000) * 6) : undefined,
    thresholds: sensor?.thresholds as KinetixMetricThresholds | undefined,
    now: sim.now,
  };
}

/** Props for `TelemetryTrend`: history plus the points drift has produced since the scenario began. */
export function trendOf(iot: UseIotSimulation, deviceId: string, metric: string): { series: KinetixTelemetrySeries; thresholds?: KinetixMetricThresholds; now: string } {
  const { sim } = iot;
  const sensor = sim.scenario.sensors.find((s) => s.deviceId === deviceId && s.metric === metric);
  return { series: selectSeries(sim, deviceId, metric), thresholds: sensor?.thresholds, now: sim.now };
}
