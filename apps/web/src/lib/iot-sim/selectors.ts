/**
 * Read-only views over a `Simulation`, built from the headless functions so the demo cannot diverge
 * from the library: health comes from `deriveDeviceHealth`, rollups from `rollupSpaceHealth`, energy
 * from `summarizeEnergy`, readings from `evaluateReading`.
 */
import {
  activeAlerts,
  assessDevices,
  buildSpaceTree,
  deriveDeviceConnectivity,
  deriveDeviceHealth,
  energyTrend,
  evaluateReading,
  isLifecyclePending,
  lifecycleToCommandStatus,
  rollupSpaceHealth,
  sortActivity,
  summarizeDeviceState,
  summarizeEnergy,
  summarizeFleetHealth,
  type KinetixActivityEvent,
  type KinetixDevice,
  type KinetixDeviceAlert,
  type KinetixDeviceCommand,
  type KinetixDeviceConnectivity,
  type KinetixDeviceState,
  type KinetixDeviceStateSummary,
  type KinetixEnergySummary,
  type KinetixEnergyTrend,
  type KinetixFleetHealthSummary,
  type KinetixSpaceHealthRollup,
  type KinetixTelemetrySeries,
} from "@kinetixui/iot/functions";
import { sensorKey } from "./core";
import type { SimCommand, SimReadingView, Simulation } from "./types";

/** A device online but silent for longer than this reads as stale. */
export const SIM_STALE_AFTER_MS = 15 * 60_000;

export function selectDevices(sim: Simulation): KinetixDevice[] {
  return sim.scenario.devices.map((d) => sim.devices[d.id]?.device ?? d);
}

export function selectConnectivity(sim: Simulation, deviceId: string): KinetixDeviceConnectivity {
  const rt = sim.devices[deviceId];
  if (!rt) return { state: "offline" };
  const base = deriveDeviceConnectivity(rt.device, { now: sim.now, staleAfterMs: SIM_STALE_AFTER_MS });
  // Only a failed attempt to reach the device can say "unreachable"; the sim records that on the runtime.
  return rt.unreachable ? { ...base, state: "unreachable" } : base;
}

export function toDeviceCommand(command: SimCommand): KinetixDeviceCommand {
  const status = lifecycleToCommandStatus(command.lifecycle) ?? "queued";
  return {
    id: command.id,
    deviceId: command.deviceId,
    name: command.name,
    status,
    createdAt: command.createdAt,
    updatedAt: command.updatedAt,
    payload: { capabilityId: command.capabilityId, value: command.lifecycle.requestedValue },
    ...(command.lifecycle.reason ? { errorMessage: command.lifecycle.reason } : {}),
  };
}

/** The composed device state a device screen needs: identity, connectivity, health, controls and both value maps. */
export function selectDeviceState(sim: Simulation, deviceId: string): KinetixDeviceState | undefined {
  const rt = sim.devices[deviceId];
  if (!rt) return undefined;
  const connectivity = selectConnectivity(sim, deviceId);
  const alerts = sim.alerts.filter((a) => a.deviceId === deviceId);
  const faults = [...(sim.scenario.faults?.[deviceId] ?? [])];
  const health = deriveDeviceHealth({ status: rt.device.status, connectivity, battery: rt.device.battery, faults, alerts });
  return {
    device: rt.device,
    connectivity,
    health,
    capabilities: [...(sim.scenario.capabilities[deviceId] ?? [])],
    confirmedValues: rt.confirmedValues,
    requestedValues: rt.requestedValues,
    pendingCommands: sim.commands.filter((c) => c.deviceId === deviceId && isLifecyclePending(c.lifecycle)).map(toDeviceCommand),
    faults,
    alerts,
  };
}

export function selectDeviceSummary(sim: Simulation, deviceId: string): KinetixDeviceStateSummary | undefined {
  const state = selectDeviceState(sim, deviceId);
  return state ? summarizeDeviceState(state) : undefined;
}

export function selectFleetHealth(sim: Simulation): KinetixFleetHealthSummary {
  return summarizeFleetHealth(selectDevices(sim), { alerts: sim.alerts, now: sim.now, staleAfterMs: SIM_STALE_AFTER_MS });
}

export function selectSpaceRollups(sim: Simulation): Map<string, KinetixSpaceHealthRollup> {
  return rollupSpaceHealth(buildSpaceTree(sim.scenario.spaces), selectDevices(sim), { alerts: sim.alerts, now: sim.now, staleAfterMs: SIM_STALE_AFTER_MS });
}

export function selectAssessedDevices(sim: Simulation) {
  return assessDevices(selectDevices(sim), { alerts: sim.alerts, now: sim.now, staleAfterMs: SIM_STALE_AFTER_MS });
}

/** The current reading of a sensor with its evaluation (normal / warning / critical / stale). */
export function selectReading(sim: Simulation, deviceId: string, metric: string): SimReadingView | undefined {
  const reading = sim.readings[sensorKey(deviceId, metric)];
  const sensor = sim.scenario.sensors.find((s) => s.deviceId === deviceId && s.metric === metric);
  if (!reading || !sensor) return undefined;
  const evaluation = evaluateReading({
    value: reading.value,
    quality: "good",
    metric,
    thresholds: sensor.thresholds,
    timestamp: reading.timestamp,
    now: sim.now,
    staleAfterMs: sensor.staleAfterMs ?? (sensor.sampleMs ?? 5000) * 6,
  });
  return { ...reading, evaluation };
}

/** Scenario history followed by the points drift has produced since `startAt`. */
export function selectSeries(sim: Simulation, deviceId: string, metric: string): KinetixTelemetrySeries {
  const history = sim.scenario.series.find((s) => s.deviceId === deviceId && s.metric === metric);
  return { deviceId, metric, points: [...(history?.points ?? []), ...(sim.live[sensorKey(deviceId, metric)] ?? [])] };
}

export function selectAlerts(sim: Simulation, options: { includeAcknowledged?: boolean; includeResolved?: boolean } = {}): KinetixDeviceAlert[] {
  return activeAlerts(sim.alerts, options);
}

export function selectActivity(sim: Simulation, options: { deviceId?: string; limit?: number } = {}): KinetixActivityEvent[] {
  const filtered = options.deviceId ? sim.activity.filter((e) => e.deviceId === options.deviceId) : sim.activity;
  const sorted = sortActivity(filtered);
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

export function selectCommandHistory(sim: Simulation, deviceId?: string): SimCommand[] {
  const list = deviceId ? sim.commands.filter((c) => c.deviceId === deviceId) : sim.commands;
  return [...list].reverse();
}

export type SimEnergySelection = {
  summary: KinetixEnergySummary;
  trend: KinetixEnergyTrend;
  /** The seven daily totals the trend was computed from. */
  week: readonly (number | null)[];
};

/** Today's per-device breakdown (start-of-scenario total plus what confirmed-on devices have drawn since). */
export function selectEnergy(sim: Simulation): SimEnergySelection | undefined {
  const energy = sim.scenario.energy;
  if (!energy) return undefined;
  const items = energy.devices.map((d) => ({
    id: d.deviceId,
    deviceId: d.deviceId,
    label: d.label ?? sim.devices[d.deviceId]?.device.name ?? d.deviceId,
    value: d.todayKwh + (sim.energyAccrued[d.deviceId] ?? 0),
  }));
  return {
    summary: summarizeEnergy(items, { unit: energy.unit, baseline: energy.baseline, limit: energy.limit, topCount: 3 }),
    trend: energyTrend(energy.week),
    week: energy.week,
  };
}
