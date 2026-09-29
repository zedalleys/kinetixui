/**
 * The simulation core: pure functions over an immutable-by-convention `Simulation`.
 *
 * Read `labels.ts` first — everything here is scripted. The core has no network, no timers and no
 * clock: every function that needs "now" takes it as an argument, so the same scenario, seed and
 * call sequence always produce the same state, on the server and in a test.
 *
 * Commands run on the headless lifecycle from `@kinetixui/iot/functions`. Two rules follow from it and
 * are the point of the demo: confirmed values change **only** when a `confirm` event lands, and an
 * acknowledgement is not a confirmation.
 *
 * Events are timestamped with their *scripted* time (send time + the device's latency), not with the
 * tick that noticed them, so state does not depend on how often `tick` is called.
 */
import {
  acknowledgeAlert as acknowledgeAlertModel,
  advanceCommandLifecycle,
  clampLevel,
  evaluateReading,
  formatTelemetryValue,
  isLifecyclePending,
  describeMetric,
  normalizePowerState,
  parseTimestamp,
  snapToStep,
  startCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixActivityEvent,
  type KinetixActivityStatus,
  type KinetixDeviceAlert,
  type KinetixDeviceCapability,
} from "@kinetixui/iot/functions";
import { noiseAt, hashString } from "./prng";
import { SCRIPTED_AUTOMATION_DETAIL } from "./labels";
import type { SimCommand, SimDeviceRuntime, SimLatency, SimOptions, SimReading, SimScenario, SimSensor, SimTime, Simulation } from "./types";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_UNREACHABLE_AFTER_MS = 1500;
const DEFAULT_SAMPLE_MS = 5000;
const LIVE_CAP = 120;
const ACTOR = "You (demo)";

const iso = (ms: number) => new Date(ms).toISOString();

function toMs(time: SimTime | null | undefined): number | null {
  const parsed = parseTimestamp(time ?? null);
  return parsed ? parsed.getTime() : null;
}

export const sensorKey = (deviceId: string, metric: string) => `${deviceId}:${metric}`;
const sampleMsOf = (s: SimSensor) => (s.sampleMs && s.sampleMs > 0 ? s.sampleMs : DEFAULT_SAMPLE_MS);
const staleAfterOf = (s: SimSensor) => s.staleAfterMs ?? sampleMsOf(s) * 6;

/**
 * The drifting value of a sensor at a sample index (0 = `startAt`). A pure function of its arguments: a slow
 * sinusoid, seeded jitter, and any scripted excursion. Sampled on a fixed grid, so two callers asking
 * about the same sample get the same number.
 */
export function sampleSensor(seed: number, sensor: SimSensor, sampleIndex: number): number {
  const step = sampleMsOf(sensor);
  const key = sensorKey(sensor.deviceId, sensor.metric);
  const phase = (hashString(key) % 628) / 100;
  const waveAt = (t: number) => sensor.amplitude * Math.sin((2 * Math.PI * t) / sensor.periodMs + phase);
  const jitterAt = (i: number) => (noiseAt(seed, key, i) - 0.5) * sensor.noise;
  const t = sampleIndex * step;
  // Anchored: the wave and jitter are measured relative to their value at startAt, so `base` is exactly
  // the reading the scenario begins with, and drift is the movement away from it.
  let value = sensor.base + (waveAt(t) - waveAt(0)) + (jitterAt(sampleIndex) - jitterAt(0));
  for (const e of sensor.excursions ?? []) {
    if (t >= e.fromMs && t <= e.toMs && e.toMs > e.fromMs) {
      const x = (t - e.fromMs) / (e.toMs - e.fromMs);
      value += e.delta * (1 - Math.abs(2 * x - 1));
    }
  }
  if (sensor.min !== undefined) value = Math.max(sensor.min, value);
  if (sensor.max !== undefined) value = Math.min(sensor.max, value);
  return Number(value.toFixed(sensor.decimals ?? 1));
}

function latencyFor(sim: Simulation, deviceId: string): SimLatency {
  return sim.scenario.latency[deviceId] ?? sim.scenario.defaultLatency;
}

/** A deep-enough copy that every container the core mutates is fresh. Elements are treated as immutable. */
function draftOf(sim: Simulation): Simulation {
  const devices: Record<string, SimDeviceRuntime> = {};
  for (const [id, rt] of Object.entries(sim.devices)) {
    devices[id] = { ...rt, device: { ...rt.device }, confirmedValues: { ...rt.confirmedValues }, requestedValues: { ...rt.requestedValues } };
  }
  return {
    ...sim,
    devices,
    commands: [...sim.commands],
    readings: { ...sim.readings },
    live: { ...sim.live },
    alerts: [...sim.alerts],
    activity: [...sim.activity],
    automations: [...sim.automations],
    energyAccrued: { ...sim.energyAccrued },
    failuresServed: { ...sim.failuresServed },
    firedScripts: [...sim.firedScripts],
    counters: { ...sim.counters },
  };
}

function log(sim: Simulation, event: Omit<KinetixActivityEvent, "id"> & { timestamp: string }): void {
  sim.counters.activity += 1;
  sim.activity.push({ id: `sim-activity-${sim.counters.activity}`, ...event });
}

function findCapability(sim: Simulation, deviceId: string, capabilityId: string): KinetixDeviceCapability | undefined {
  return sim.scenario.capabilities[deviceId]?.find((c) => c.id === capabilityId);
}

function describeValue(cap: KinetixDeviceCapability | undefined, value: unknown): string {
  if (cap?.kind === "power") return normalizePowerState(value as boolean | "on" | "off") === "on" ? "on" : "off";
  if (cap?.kind === "mode") return cap.modes?.find((m) => m.id === value)?.label.toLowerCase() ?? String(value);
  if (typeof value === "number") return `${value}${cap?.unit ? (cap.unit.startsWith("%") || cap.unit.startsWith("°") ? "" : " ") + cap.unit : ""}`;
  return String(value);
}

function deviceName(sim: Simulation, deviceId: string): string {
  return sim.devices[deviceId]?.device.name ?? deviceId;
}

// ---------------------------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------------------------

export function createSimulation(scenario: SimScenario, options: SimOptions = {}): Simulation {
  const seed = options.seed ?? scenario.seed;
  const startAt = options.startAt ?? scenario.startAt;
  const startMs = toMs(startAt);
  if (startMs === null) throw new Error(`createSimulation: "${String(startAt)}" is not a usable start time.`);

  const devices: Record<string, SimDeviceRuntime> = {};
  for (const device of scenario.devices) {
    devices[device.id] = {
      device: { ...device },
      reachable: device.status !== "offline",
      unreachable: false,
      confirmedValues: { ...(scenario.initialValues[device.id] ?? {}) },
      requestedValues: {},
    };
  }

  const readings: Record<string, SimReading> = {};
  for (const s of scenario.sensors) {
    const step = sampleMsOf(s);
    const idx = Math.floor(-(s.silentSinceMs ?? 0) / step);
    readings[sensorKey(s.deviceId, s.metric)] = {
      deviceId: s.deviceId,
      metric: s.metric,
      value: sampleSensor(seed, s, idx),
      ...(s.unit ? { unit: s.unit } : {}),
      timestamp: iso(startMs + idx * step),
      sampleIndex: idx,
    };
  }

  const sim: Simulation = {
    scenario,
    seed,
    startAt: iso(startMs),
    now: iso(startMs),
    devices,
    commands: [],
    readings,
    live: {},
    alerts: [...scenario.alerts],
    activity: [...scenario.activity],
    automations: [...scenario.automations],
    energyAccrued: {},
    failuresServed: {},
    firedScripts: [],
    counters: { command: 0, activity: 0, alert: 0 },
    lastCommandId: null,
  };
  return sim;
}

// ---------------------------------------------------------------------------------------------
// Alerts derived from readings
// ---------------------------------------------------------------------------------------------

const isOpen = (a: KinetixDeviceAlert) => parseTimestamp(a.resolvedAt ?? null) === null;

function raiseAlert(sim: Simulation, alert: Omit<KinetixDeviceAlert, "id">): KinetixDeviceAlert {
  sim.counters.alert += 1;
  const full: KinetixDeviceAlert = { id: `sim-alert-${sim.counters.alert}`, ...alert };
  sim.alerts.push(full);
  log(sim, { timestamp: String(alert.raisedAt), kind: "alert", deviceId: alert.deviceId, source: alert.source, message: alert.message });
  return full;
}

function resolveWhere(sim: Simulation, at: string, match: (a: KinetixDeviceAlert) => boolean, message: (a: KinetixDeviceAlert) => string): void {
  sim.alerts = sim.alerts.map((a) => {
    if (!isOpen(a) || !match(a)) return a;
    log(sim, { timestamp: at, kind: "alert", deviceId: a.deviceId, source: a.source, message: message(a) });
    return { ...a, resolvedAt: at };
  });
}

function judgeSample(sim: Simulation, s: SimSensor, value: number, atMs: number): void {
  const evaluation = evaluateReading({ value, quality: "good", metric: s.metric, thresholds: s.thresholds });
  const source = `sim:threshold:${s.metric}`;
  const at = iso(atMs);
  const label = s.alertLabel ?? describeMetric(s.metric);
  const open = sim.alerts.find((a) => isOpen(a) && a.deviceId === s.deviceId && a.source === source);
  if (evaluation.state === "warning" || evaluation.state === "critical") {
    if (!open) {
      const text = formatTelemetryValue({ value, unit: s.unit, quality: "good" }, { precision: s.decimals ?? 1 });
      raiseAlert(sim, {
        deviceId: s.deviceId,
        severity: evaluation.state,
        message: `${label} ${evaluation.side === "low" ? "below" : "above"} its limit: ${text}`,
        raisedAt: at,
        kind: s.alertKind ?? "abnormal-reading",
        source,
      });
    } else if (open.severity !== evaluation.state) {
      sim.alerts = sim.alerts.map((a) => (a.id === open.id ? { ...a, severity: evaluation.state as "warning" | "critical" } : a));
    }
  } else if (evaluation.state === "normal" && open) {
    resolveWhere(sim, at, (a) => a.id === open.id, () => `${label} back within its limits`);
  }
}

function judgeStale(sim: Simulation, nowMs: number): void {
  const startMs = toMs(sim.startAt)!;
  const at = iso(nowMs);
  for (const s of sim.scenario.sensors) {
    const reading = sim.readings[sensorKey(s.deviceId, s.metric)];
    if (!reading) continue;
    const ev = evaluateReading({ value: reading.value, quality: "good", metric: s.metric, timestamp: reading.timestamp, now: nowMs, staleAfterMs: staleAfterOf(s) });
    const stale = ev.state === "stale";
    const open = sim.alerts.find((a) => isOpen(a) && a.deviceId === s.deviceId && a.kind === "sensor-stale");
    if (stale && !open) {
      // The moment it became stale, not the tick that noticed: keeps the log independent of tick cadence.
      const becameStale = Math.min(nowMs, Math.max(startMs, (toMs(reading.timestamp) ?? nowMs) + staleAfterOf(s) + 1));
      raiseAlert(sim, { deviceId: s.deviceId, severity: "warning", message: `${s.alertLabel ?? describeMetric(s.metric)} sensor has stopped reporting`, raisedAt: iso(becameStale), kind: "sensor-stale", source: `sim:stale:${s.metric}` });
    } else if (!stale && open?.source?.startsWith("sim:")) {
      resolveWhere(sim, at, (a) => a.id === open.id, () => `${s.alertLabel ?? describeMetric(s.metric)} sensor is reporting again`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Advancing time
// ---------------------------------------------------------------------------------------------

function advanceSensors(sim: Simulation, nowMs: number): void {
  const startMs = toMs(sim.startAt)!;
  for (const s of sim.scenario.sensors) {
    if (s.silentSinceMs !== undefined) continue;
    const rt = sim.devices[s.deviceId];
    if (!rt || !rt.reachable) continue;
    const key = sensorKey(s.deviceId, s.metric);
    const reading = sim.readings[key];
    if (!reading) continue;
    const step = sampleMsOf(s);
    const latest = Math.floor((nowMs - startMs) / step);
    if (latest <= reading.sampleIndex) continue;
    const from = Math.max(reading.sampleIndex + 1, latest - (LIVE_CAP - 1));
    const points = [...(sim.live[key] ?? [])];
    let last = reading;
    for (let i = from; i <= latest; i++) {
      const value = sampleSensor(sim.seed, s, i);
      const ts = startMs + i * step;
      points.push({ timestamp: iso(ts), metric: s.metric, value, ...(s.unit ? { unit: s.unit } : {}), quality: "good" });
      last = { ...last, value, timestamp: iso(ts), sampleIndex: i };
      judgeSample(sim, s, value, ts);
    }
    last = { ...last, sampleIndex: latest };
    sim.readings[key] = last;
    sim.live[key] = points.slice(-LIVE_CAP);
  }
}

function stepCommand(sim: Simulation, index: number, nowMs: number): void {
  for (let guard = 0; guard < 8; guard++) {
    const cmd = sim.commands[index]!;
    const lc = cmd.lifecycle;
    const rt = sim.devices[cmd.deviceId];
    if (!rt) return;
    const lat = latencyFor(sim, cmd.deviceId);
    const sentMs = toMs(lc.sentAt);
    if (sentMs === null) return;
    const timeoutMs = lat.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const tAck = sentMs + lat.ackMs;
    const tConfirm = sentMs + Math.max(lat.confirmMs, lat.ackMs);
    const tTimeout = sentMs + timeoutMs;
    const cap = findCapability(sim, cmd.deviceId, cmd.capabilityId);
    const name = deviceName(sim, cmd.deviceId);
    const want = describeValue(cap, lc.requestedValue);

    const apply = (event: Parameters<typeof advanceCommandLifecycle>[1], at: number, status: KinetixActivityStatus, message: string) => {
      const next = advanceCommandLifecycle(lc, event, iso(at));
      sim.commands[index] = { ...cmd, lifecycle: next, updatedAt: iso(at) };
      log(sim, { timestamp: iso(at), kind: "command", deviceId: cmd.deviceId, actor: ACTOR, status, message, ...(next.reason ? { detail: next.reason } : {}) });
    };

    if (lc.stage === "requested" || lc.stage === "retrying") {
      if (!rt.reachable) {
        if (tTimeout <= nowMs) {
          apply({ type: "timeout", reason: "No reply from the device before the deadline." }, tTimeout, "timed-out", `${name}: no confirmation for ${want}`);
          continue;
        }
        return;
      }
      if (tAck <= nowMs && tAck <= tTimeout) {
        apply({ type: "acknowledge" }, tAck, "acknowledged", `${name}: acknowledged the request for ${want} (not yet confirmed)`);
        continue;
      }
      if (tTimeout <= nowMs) {
        apply({ type: "timeout", reason: "No reply from the device before the deadline." }, tTimeout, "timed-out", `${name}: no confirmation for ${want}`);
        continue;
      }
      return;
    }

    if (lc.stage === "acknowledged") {
      if (!rt.reachable) {
        if (tTimeout <= nowMs) {
          apply({ type: "timeout", reason: "Acknowledged, but the device did not confirm before the deadline." }, tTimeout, "timed-out", `${name}: no confirmation for ${want}`);
          continue;
        }
        return;
      }
      if (tConfirm <= nowMs && tConfirm <= tTimeout) {
        const served = sim.failuresServed[cmd.deviceId] ?? 0;
        if ((lat.failFirst ?? 0) > served) {
          sim.failuresServed[cmd.deviceId] = served + 1;
          apply({ type: "fail", reason: lat.failReason ?? "The device reported that it could not complete the change." }, tConfirm, "failed", `${name}: could not change to ${want}`);
          delete rt.requestedValues[cmd.capabilityId];
          raiseCommandAlert(sim, cmd.deviceId, `Command to ${name} failed`, iso(tConfirm));
        } else {
          apply({ type: "confirm" }, tConfirm, "confirmed", `${name}: confirmed ${want}`);
          rt.confirmedValues[cmd.capabilityId] = lc.requestedValue;
          delete rt.requestedValues[cmd.capabilityId];
          resolveWhere(sim, iso(tConfirm), (a) => a.deviceId === cmd.deviceId && a.source === "sim:command", () => `Command to ${name} succeeded on retry`);
        }
        continue;
      }
      if (tTimeout <= nowMs) {
        apply({ type: "timeout", reason: "Acknowledged, but the device did not confirm before the deadline." }, tTimeout, "timed-out", `${name}: no confirmation for ${want}`);
        continue;
      }
      return;
    }

    if (lc.stage === "timed-out") {
      const settled = toMs(lc.settledAt) ?? tTimeout;
      const tUnreachable = settled + (lat.unreachableAfterMs ?? DEFAULT_UNREACHABLE_AFTER_MS);
      if (!rt.reachable && tUnreachable <= nowMs) {
        apply({ type: "deviceUnreachable", reason: "The device could not be reached." }, tUnreachable, "unreachable", `${name}: unreachable, ${want} was not confirmed`);
        rt.unreachable = true;
        raiseCommandAlert(sim, cmd.deviceId, `${name} is unreachable; the change was not confirmed`, iso(tUnreachable));
        continue;
      }
      return;
    }
    return;
  }
}

function raiseCommandAlert(sim: Simulation, deviceId: string, message: string, at: string): void {
  const open = sim.alerts.find((a) => isOpen(a) && a.deviceId === deviceId && a.source === "sim:command");
  if (open) return;
  raiseAlert(sim, { deviceId, severity: "warning", message, raisedAt: at, kind: "command-failed", source: "sim:command" });
}

function fireScripts(sim: Simulation, nowMs: number): void {
  const startMs = toMs(sim.startAt)!;
  const due = sim.scenario.scriptedEvents
    .filter((e) => !sim.firedScripts.includes(e.id) && startMs + e.atMs <= nowMs)
    .sort((a, b) => a.atMs - b.atMs);
  for (const e of due) {
    const at = iso(startMs + e.atMs);
    sim.firedScripts.push(e.id);
    const automation = e.automationId ? sim.automations.find((a) => a.id === e.automationId) : undefined;
    log(sim, {
      timestamp: at,
      kind: e.automationId ? "automation" : "system",
      ...(e.deviceId ? { deviceId: e.deviceId } : {}),
      source: e.source ?? (automation ? `Automation: ${automation.name}` : "Scenario script"),
      status: "confirmed",
      message: e.message,
      ...(e.automationId ? { detail: SCRIPTED_AUTOMATION_DETAIL } : {}),
    });
    if (automation) sim.automations = sim.automations.map((a) => (a.id === automation.id ? { ...a, lastRunAt: at, status: "idle" as const } : a));
    if (e.effect) {
      const rt = sim.devices[e.effect.deviceId];
      if (rt && rt.reachable) rt.confirmedValues[e.effect.capabilityId] = e.effect.value;
    }
  }
}

function accrueEnergy(sim: Simulation, fromMs: number, toMsValue: number): void {
  const energy = sim.scenario.energy;
  if (!energy) return;
  const hours = (toMsValue - fromMs) / 3_600_000;
  for (const item of energy.devices) {
    if (!item.watts) continue;
    const rt = sim.devices[item.deviceId];
    const power = sim.scenario.capabilities[item.deviceId]?.find((c) => c.kind === "power");
    if (!rt || !power || !rt.reachable) continue;
    if (normalizePowerState(rt.confirmedValues[power.id] as "on" | "off") === "on") {
      sim.energyAccrued[item.deviceId] = (sim.energyAccrued[item.deviceId] ?? 0) + (item.watts / 1000) * hours;
    }
  }
}

/**
 * Advance the simulation to `now`. Returns the same object when `now` is not later than the
 * simulation's own time, so a caller can skip a re-render with `next === prev`.
 */
export function tick(sim: Simulation, now: SimTime): Simulation {
  const nowMs = toMs(now);
  const prevMs = toMs(sim.now)!;
  if (nowMs === null || nowMs <= prevMs) return sim;
  const next = draftOf(sim);
  next.now = iso(nowMs);
  next.lastCommandId = null;
  advanceSensors(next, nowMs);
  for (let i = 0; i < next.commands.length; i++) stepCommand(next, i, nowMs);
  fireScripts(next, nowMs);
  judgeStale(next, nowMs);
  accrueEnergy(next, prevMs, nowMs);
  // A reachable, non-stale device is heard from every tick; a stale or silent one is not.
  for (const rt of Object.values(next.devices)) {
    if (rt.reachable && rt.device.status !== "stale" && rt.device.status !== "disabled") rt.device.lastSeenAt = iso(nowMs);
  }
  return next;
}

// ---------------------------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------------------------

function normalizeRequested(cap: KinetixDeviceCapability, value: unknown): { ok: true; value: unknown } | { ok: false } {
  switch (cap.kind) {
    case "power": {
      const power = normalizePowerState(value as boolean | "on" | "off");
      return power === "unknown" ? { ok: false } : { ok: true, value: power };
    }
    case "level":
    case "setpoint": {
      const min = cap.min ?? 0;
      const max = cap.max ?? 100;
      const clamped = clampLevel(typeof value === "number" ? value : Number.NaN, min, max);
      if (clamped === null) return { ok: false };
      return { ok: true, value: cap.step ? snapToStep(clamped, min, max, cap.step) : clamped };
    }
    case "mode": {
      const mode = cap.modes?.find((m) => m.id === value);
      return mode && !mode.unavailable ? { ok: true, value: mode.id } : { ok: false };
    }
    case "action":
      return { ok: true, value };
    default:
      return { ok: false };
  }
}

/** The newest command for a control, of any stage. */
export function latestCommand(sim: Simulation, deviceId: string, capabilityId: string): SimCommand | undefined {
  for (let i = sim.commands.length - 1; i >= 0; i--) {
    const c = sim.commands[i]!;
    if (c.deviceId === deviceId && c.capabilityId === capabilityId) return c;
  }
  return undefined;
}

/**
 * Ask a device to change. The simulation is first advanced to `now`, then the request is recorded as
 * `requested`. **Nothing is confirmed here**: the confirmed value changes only when the scripted
 * device reports it. A request for a control that already has one in flight, an unknown control, a
 * read-only one or an invalid value is refused and the simulation is returned as advanced, with
 * `lastCommandId === null`.
 */
export function dispatchCommand(sim: Simulation, deviceId: string, capabilityId: string, value: unknown, now: SimTime): Simulation {
  const current = tick(sim, now);
  const nowMs = toMs(current.now)!;
  const rt = current.devices[deviceId];
  const cap = findCapability(current, deviceId, capabilityId);
  const refuse = () => (current.lastCommandId === null ? current : { ...current, lastCommandId: null });
  if (!rt || !cap || cap.readOnly || cap.kind === "telemetry") return refuse();
  const existing = latestCommand(current, deviceId, capabilityId);
  if (existing && isLifecyclePending(existing.lifecycle)) return refuse();
  const normalized = normalizeRequested(cap, value);
  if (!normalized.ok) return refuse();

  const next = draftOf(current);
  next.counters.command += 1;
  const id = `sim-cmd-${next.counters.command}`;
  const confirmed = next.devices[deviceId]!.confirmedValues[capabilityId];
  const lifecycle = advanceCommandLifecycle(startCommandLifecycle({ confirmed, requested: normalized.value, maxAttempts: 3 }), { type: "sent" }, iso(nowMs));
  next.commands.push({ id, deviceId, capabilityId, name: cap.kind === "action" ? capabilityId : `set-${capabilityId}`, lifecycle, createdAt: iso(nowMs), updatedAt: iso(nowMs) });
  next.devices[deviceId]!.requestedValues[capabilityId] = normalized.value;
  log(next, {
    timestamp: iso(nowMs),
    kind: "command",
    deviceId,
    actor: ACTOR,
    status: "requested",
    message: `${deviceName(next, deviceId)}: requested ${cap.label ?? capabilityId} → ${describeValue(cap, normalized.value)}`,
    detail: "Requested, not yet confirmed by the device.",
  });
  next.lastCommandId = id;
  return next;
}

/** Send a failed, timed-out or unreachable command again. Refused past `maxAttempts` or from a stage that cannot retry. */
export function retryCommand(sim: Simulation, commandId: string, now: SimTime): Simulation {
  const current = tick(sim, now);
  const index = current.commands.findIndex((c) => c.id === commandId);
  if (index === -1) return current;
  const cmd = current.commands[index]!;
  const nowMs = toMs(current.now)!;
  const result = transitionCommandLifecycle(cmd.lifecycle, { type: "retry" }, iso(nowMs));
  if (!result.ok) return current;
  const next = draftOf(current);
  next.commands[index] = { ...cmd, lifecycle: result.state, updatedAt: iso(nowMs) };
  next.devices[cmd.deviceId]!.requestedValues[cmd.capabilityId] = result.state.requestedValue;
  const cap = findCapability(next, cmd.deviceId, cmd.capabilityId);
  log(next, {
    timestamp: iso(nowMs),
    kind: "command",
    deviceId: cmd.deviceId,
    actor: ACTOR,
    status: "requested",
    message: `${deviceName(next, cmd.deviceId)}: retrying ${describeValue(cap, result.state.requestedValue)} (attempt ${result.state.attempts} of ${result.state.maxAttempts})`,
    detail: "Requested again, not yet confirmed.",
  });
  return next;
}

/** Withdraw a request. It does not prove the device did nothing; the confirmed value is untouched. */
export function cancelCommand(sim: Simulation, commandId: string, now: SimTime): Simulation {
  const current = tick(sim, now);
  const index = current.commands.findIndex((c) => c.id === commandId);
  if (index === -1) return current;
  const cmd = current.commands[index]!;
  const nowMs = toMs(current.now)!;
  const result = transitionCommandLifecycle(cmd.lifecycle, { type: "cancel", reason: "Cancelled by the user." }, iso(nowMs));
  if (!result.ok) return current;
  const next = draftOf(current);
  next.commands[index] = { ...cmd, lifecycle: result.state, updatedAt: iso(nowMs) };
  delete next.devices[cmd.deviceId]!.requestedValues[cmd.capabilityId];
  const cap = findCapability(next, cmd.deviceId, cmd.capabilityId);
  log(next, {
    timestamp: iso(nowMs),
    kind: "command",
    deviceId: cmd.deviceId,
    actor: ACTOR,
    status: "cancelled",
    message: `${deviceName(next, cmd.deviceId)}: cancelled the request for ${describeValue(cap, result.state.requestedValue)}`,
    detail: "Cancelled. This does not prove the device did nothing.",
  });
  return next;
}

/** Flip a device between answering and not answering. This is the demo's "pull the plug" switch. */
export function setDeviceReachable(sim: Simulation, deviceId: string, reachable: boolean, now?: SimTime): Simulation {
  const current = now === undefined ? sim : tick(sim, now);
  const rt = current.devices[deviceId];
  if (!rt || rt.reachable === reachable) return current;
  const next = draftOf(current);
  const target = next.devices[deviceId]!;
  const nowMs = toMs(next.now)!;
  const at = iso(nowMs);
  const name = deviceName(next, deviceId);
  target.reachable = reachable;
  if (!reachable) {
    if (target.device.status !== "offline") target.statusBeforeOffline = target.device.status;
    target.device.status = "offline";
    log(next, { timestamp: at, kind: "system", deviceId, source: "Simulation", message: `${name} stopped answering (simulated)` });
    if (!next.alerts.some((a) => isOpen(a) && a.deviceId === deviceId && a.kind === "device-offline")) {
      raiseAlert(next, { deviceId, severity: "warning", message: `${name} is offline`, raisedAt: at, kind: "device-offline", source: "sim:reachability" });
    }
  } else {
    target.unreachable = false;
    target.device.status = target.statusBeforeOffline && target.statusBeforeOffline !== "offline" ? target.statusBeforeOffline : "online";
    target.device.lastSeenAt = at;
    log(next, { timestamp: at, kind: "system", deviceId, source: "Simulation", message: `${name} is answering again (simulated)` });
    resolveWhere(next, at, (a) => a.deviceId === deviceId && a.kind === "device-offline", () => `${name} is back online`);
    // Samples due while it was away were never taken; do not invent them.
    const startMs = toMs(next.startAt)!;
    for (const s of next.scenario.sensors) {
      const key = sensorKey(s.deviceId, s.metric);
      const reading = next.readings[key];
      if (s.deviceId === deviceId && reading && s.silentSinceMs === undefined) {
        next.readings[key] = { ...reading, sampleIndex: Math.max(reading.sampleIndex, Math.floor((nowMs - startMs) / sampleMsOf(s))) };
      }
    }
  }
  return next;
}

/** Mark an alert seen. Acknowledged is not resolved: it stays in the list and keeps counting against health. */
export function acknowledgeAlert(sim: Simulation, alertId: string, now?: SimTime): Simulation {
  const current = now === undefined ? sim : tick(sim, now);
  const alert = current.alerts.find((a) => a.id === alertId);
  if (!alert || alert.acknowledgedAt) return current;
  const next = draftOf(current);
  const acknowledged = acknowledgeAlertModel(alert, next.now);
  next.alerts = next.alerts.map((a) => (a.id === alertId ? acknowledged : a));
  log(next, { timestamp: next.now, kind: "alert", deviceId: alert.deviceId, actor: ACTOR, message: `Alert acknowledged: ${alert.message}` });
  return next;
}

/** Whether any command is still waiting on a device. The hook uses it to decide if time must flow. */
export function hasCommandInFlight(sim: Simulation): boolean {
  return sim.commands.some((c) => isLifecyclePending(c.lifecycle) || (c.lifecycle.stage === "timed-out" && sim.devices[c.deviceId]?.reachable === false));
}
