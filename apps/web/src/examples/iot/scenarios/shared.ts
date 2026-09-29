/**
 * Helpers shared by the scenario fixtures. Pure and data-shaped: no clock, no randomness beyond what
 * `@/lib/iot-sim` seeds. Every scenario is **fabricated** — see `SIMULATION_DISCLOSURE`.
 */
import type { KinetixDeviceCapability, KinetixDeviceMode } from "@kinetixui/iot/functions";
import type { SimLatency } from "@/lib/iot-sim/types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** An ISO timestamp `ms` before `startAt`. */
export const agoFrom = (startAt: string) => (ms: number) => new Date(Date.parse(startAt) - ms).toISOString();

export const power = (label = "Power"): KinetixDeviceCapability => ({ id: "power", kind: "power", label });
export const level = (label: string, unit = "%", id = "level", step = 5): KinetixDeviceCapability => ({ id, kind: "level", label, min: 0, max: 100, step, unit });
export const setpoint = (label: string, min: number, max: number, step: number, unit = "°C"): KinetixDeviceCapability => ({ id: "setpoint", kind: "setpoint", label, min, max, step, unit });
export const mode = (id: string, label: string, modes: readonly KinetixDeviceMode[]): KinetixDeviceCapability => ({ id, kind: "mode", label, modes });
export const telemetry = (metric: string, label: string, unit?: string): KinetixDeviceCapability => ({
  id: metric,
  kind: "telemetry",
  label,
  metric,
  readOnly: true,
  ...(unit ? { unit } : {}),
});

export const latency = (ackMs: number, confirmMs: number, extra: Partial<SimLatency> = {}): SimLatency => ({ ackMs, confirmMs, ...extra });
