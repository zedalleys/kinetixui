import { describe, expect, it } from "vitest";
import {
  KINETIX_PAIRING_FAILURES,
  KINETIX_PAIRING_STAGES,
  advancePairing,
  buildSpaceTree,
  descendantDeviceIds,
  detectSeriesGaps,
  getMetricDefinition,
  latestPoint,
  resolveDeviceCategory,
  startPairingFlow,
  summarizeAutomationRule,
  summarizeEnergy,
  summarizeFleetHealth,
  rollupSpaceHealth,
  thresholdCrossings,
  transitionPairing,
  validateAutomationRule,
  type KinetixPairingMethod,
} from "@kinetixui/iot/functions";
import { createSimulation, tick } from "@/lib/iot-sim/core";
import { buildSeries } from "@/lib/iot-sim/series";
import { selectAlerts, selectDeviceState, selectFleetHealth, selectReading } from "@/lib/iot-sim/selectors";
import { SAMPLE_IMAGE_LABEL, SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";
import type { SimScenario } from "@/lib/iot-sim/types";
import { agritech, agritechRainForecast, agritechRule, scenarioList, scenarios, smartSpace, operations, getScenario } from "./index";
import { pairingDevices, pairingFailureScenarios, pairingHappyPath } from "./pairing";

const DAY = 86_400_000;

function referencedDeviceIds(s: SimScenario): [string, string][] {
  const out: [string, string][] = [];
  const add = (where: string, id: string | undefined) => id !== undefined && out.push([where, id]);
  s.spaces.forEach((n) => n.deviceIds?.forEach((id) => add(`space ${n.id}`, id)));
  s.alerts.forEach((a) => add(`alert ${a.id}`, a.deviceId));
  s.activity.forEach((a) => add(`activity ${a.id}`, a.deviceId));
  s.commandHistory?.forEach((c) => add(`command ${c.id}`, c.deviceId));
  s.sensors.forEach((x) => add(`sensor ${x.metric}`, x.deviceId));
  s.series.forEach((x) => add(`series ${x.metric}`, x.deviceId));
  s.scriptedEvents.forEach((e) => {
    add(`script ${e.id}`, e.deviceId);
    add(`script effect ${e.id}`, e.effect?.deviceId);
  });
  s.energy?.devices.forEach((d) => add(`energy ${d.deviceId}`, d.deviceId));
  Object.keys(s.capabilities).forEach((id) => add("capabilities", id));
  Object.keys(s.initialValues).forEach((id) => add("initialValues", id));
  Object.keys(s.latency).forEach((id) => add("latency", id));
  Object.keys(s.faults ?? {}).forEach((id) => add("faults", id));
  return out;
}

describe.each(scenarioList.map((s) => [s.id, s] as const))("scenario %s", (_id, s) => {
  it("has a fixed, parsable start instant and a disclosure", () => {
    expect(new Date(s.startAt).toISOString()).toBe(s.startAt);
    expect(s.disclosure).toContain(SIMULATION_DISCLOSURE);
    expect(getScenario(s.id)).toBe(s);
  });

  it("has a space tree with no issues, and every device is placed exactly once", () => {
    const tree = buildSpaceTree(s.spaces);
    expect(tree.issues).toEqual([]);
    expect(tree.roots).toHaveLength(1);
    const placed = s.spaces.flatMap((n) => [...(n.deviceIds ?? [])]);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(s.devices.map((d) => d.id).sort());
    expect(descendantDeviceIds(tree, tree.roots[0]!.node.id)).toHaveLength(s.devices.length);
  });

  it("only references devices that exist, and device ids are unique", () => {
    const ids = s.devices.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const missing = referencedDeviceIds(s).filter(([, id]) => !ids.includes(id));
    expect(missing).toEqual([]);
  });

  it("carries rules that validate and summarise", () => {
    expect(s.rules.length).toBeGreaterThan(0);
    for (const rule of s.rules) {
      expect(validateAutomationRule(rule), rule.id).toEqual([]);
      expect(summarizeAutomationRule(rule, { label: (_k, id) => s.labels?.[id] })).toMatch(/^When .+\.$/);
    }
  });

  it("has telemetry that is sorted, parsable, ends at or before the start, and includes a gap or a stale sensor", () => {
    expect(s.series.length).toBeGreaterThan(3);
    const start = Date.parse(s.startAt);
    let sawGap = false;
    let sawStale = false;
    for (const series of s.series) {
      const times = series.points.map((p) => Date.parse(p.timestamp as string));
      expect(times.every(Number.isFinite), `${series.deviceId}/${series.metric}`).toBe(true);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(Math.max(...times)).toBeLessThanOrEqual(start);
      expect(series.points.every((p) => p.metric === series.metric)).toBe(true);
      if (series.points.some((p) => p.quality === "missing")) sawGap = true;
      const last = latestPoint(series);
      if (last && start - Date.parse(last.timestamp as string) > 60 * 60_000) sawStale = true;
    }
    expect(sawGap).toBe(true);
    expect(sawStale).toBe(true);
  });

  it("is not all healthy, and its simulation starts from the same state every time", () => {
    const a = createSimulation(s);
    const b = createSimulation(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const fleet = selectFleetHealth(a);
    expect(fleet.byHealth.healthy).toBeLessThan(fleet.total);
    expect(fleet.total).toBe(s.devices.length);
    expect(JSON.stringify(tick(a, new Date(Date.parse(s.startAt) + 90_000)))).toBe(JSON.stringify(tick(b, new Date(Date.parse(s.startAt) + 90_000))));
  });

  it("generates its history from the seed, identically each time, and differently for another seed", () => {
    const specsFor = (seed: number) => buildSeries([{ deviceId: "x", metric: "temperature", spanMs: DAY, stepMs: 900_000, base: 20, noise: 4 }], seed, s.startAt);
    expect(specsFor(s.seed)).toEqual(specsFor(s.seed));
    expect(specsFor(s.seed)).not.toEqual(specsFor(s.seed + 1));
  });

  it("only starts open sensor-derived alerts that the readings agree with", () => {
    const sim = createSimulation(s);
    for (const alert of s.alerts.filter((a) => a.source?.startsWith("sim:threshold:"))) {
      const metric = alert.source!.split(":")[2]!;
      const reading = selectReading(sim, alert.deviceId, metric)!;
      expect(["warning", "critical"], `${alert.id} vs ${reading.value}`).toContain(reading.evaluation.state);
    }
  });
});

describe("smart-space", () => {
  it("covers the device types the demos need, with one offline device", () => {
    const categories = new Set(smartSpace.devices.map((d) => resolveDeviceCategory(d)));
    for (const c of ["light", "thermostat", "plug", "lock", "air-quality", "camera"] as const) expect(categories.has(c), c).toBe(true);
    const fleet = selectFleetHealth(createSimulation(smartSpace));
    expect(fleet.offline).toBe(1);
  });

  it("has Home → Floor → Room → Device depth", () => {
    const tree = buildSpaceTree(smartSpace.spaces);
    expect(tree.byId.get("home")!.node.kind).toBe("home");
    expect(tree.byId.get("room-hall")!.depth).toBe(2);
    expect(tree.byId.get("room-hall")!.parent!.node.kind).toBe("floor");
  });

  it("uses a null poster and the sample-image label for the camera, with no live feed", () => {
    const camera = smartSpace.devices.find((d) => d.id === "camera-hall")!;
    expect(camera.metadata).toEqual({ posterSrc: null, posterLabel: SAMPLE_IMAGE_LABEL });
    expect(SAMPLE_IMAGE_LABEL).toBe("Sample image — no live feed");
  });

  it("derives its energy story: a high-consumption device, a flagged total and a rising week", () => {
    const energy = smartSpace.energy!;
    const summary = summarizeEnergy(energy.devices.map((d) => ({ id: d.deviceId, deviceId: d.deviceId, value: d.todayKwh })), { baseline: energy.baseline });
    expect(summary.top[0]!.deviceId).toBe("plug-heater");
    expect(summary.top[0]!.share).toBeGreaterThan(0.4);
    expect(summary.flags).toContain("high-consumption");
    expect(energy.week).toHaveLength(7);
  });

  it("has scenes and routines, and a lock that is slower than a lamp", () => {
    expect(smartSpace.automations.map((a) => a.kind)).toEqual(expect.arrayContaining(["scene", "routine", "schedule"]));
    expect(smartSpace.latency["lock-front"]!.confirmMs).toBeGreaterThan(smartSpace.latency["lamp-living"]!.confirmMs);
  });

  it("raises the air-quality alert when the sensor drifts past its bound, then clears it", () => {
    let sim = createSimulation(smartSpace);
    const start = Date.parse(smartSpace.startAt);
    const openAir = () => selectAlerts(sim).filter((a) => a.deviceId === "air-living");
    for (let t = 500; t <= 55_000; t += 500) sim = tick(sim, new Date(start + t));
    expect(openAir()).toHaveLength(1);
    for (let t = 55_500; t <= 110_000; t += 500) sim = tick(sim, new Date(start + t));
    expect(openAir()).toHaveLength(0);
  });
});

describe("agritech", () => {
  const sim = createSimulation(agritech);
  const value = (device: string, metric: string) => selectReading(sim, device, metric)!.value;

  it("starts at the Greenhouse A headline numbers, derived from the sensors", () => {
    expect(value("climate-a", "temperature")).toBe(24.6);
    expect(value("climate-a", "humidity")).toBe(61);
    expect(value("soil-04", "soil-moisture")).toBe(34);
    expect(selectReading(sim, "soil-04", "soil-moisture")!.evaluation.state).toBe("normal");
  });

  it("has the valve open, the pump running, the weather station online and Soil Sensor 04 on a low battery", () => {
    expect(sim.devices["valve-02"]!.confirmedValues.position).toBe("open");
    expect(sim.devices["pump-01"]!.confirmedValues.power).toBe("on");
    expect(sim.devices["weather-01"]!.device.status).toBe("online");
    const soil = selectDeviceState(sim, "soil-04")!;
    expect(soil.health.reasons.map((r) => r.code)).toContain("battery-low");
    expect(soil.device.battery).toBeLessThan(25);
    expect(agritech.capabilities["pump-01"]!.map((c) => c.metric).filter(Boolean)).toEqual(expect.arrayContaining(["pressure", "flow"]));
  });

  it("crosses the 28% soil-moisture threshold in its seven-day series", () => {
    const series = agritech.series.find((s) => s.deviceId === "soil-04" && s.metric === "soil-moisture")!;
    expect(Date.parse(series.points[0]!.timestamp as string)).toBe(Date.parse(agritech.startAt) - 7 * DAY);
    const crossings = thresholdCrossings(series, { warningLow: 28 });
    expect(crossings.some((c) => c.to === "warning" && c.side === "low")).toBe(true);
    expect(crossings.some((c) => c.to === "normal")).toBe(true);
    const values = series.points.map((p) => p.value);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(25);
    expect(Math.min(...values)).toBeLessThanOrEqual(28);
    expect(Math.abs(latestPoint(series)!.value - 34)).toBeLessThanOrEqual(2);
  });

  it("holds exactly the requested automation rule, and summarises it in a sensible sentence", () => {
    expect(agritechRule.trigger).toMatchObject({ subject: "soil-moisture", operator: "lt", value: 28, unit: "%" });
    expect(agritechRule.conditions).toHaveLength(1);
    expect(agritechRule.conditions[0]).toMatchObject({ subject: "rain-forecast", operator: "neq", value: "expected", join: "and" });
    expect(agritechRule.actions).toEqual([{ id: "a1", target: "zone-3", command: "open", durationMinutes: 12 }]);
    expect(validateAutomationRule(agritechRule)).toEqual([]);
    expect(summarizeAutomationRule(agritechRule, { label: (_k, id) => agritech.labels?.[id] })).toBe(
      "When soil moisture falls below 28%, provided rain is not expected, open Zone 3 irrigation for 12 minutes.",
    );
  });

  it("labels the rain forecast as application-provided and fetches nothing", () => {
    expect(agritechRainForecast.label).toMatch(/Application-provided/);
    expect(agritechRainForecast.label).toMatch(/fetches nothing/);
    expect(agritech.applicationProvided).toHaveProperty("rainForecast");
    expect(agritech.disclosure).toMatch(/application-provided/i);
  });

  it("has low-battery, low-flow and sensor-stale alerts, and the pump-started activity", () => {
    const kinds = agritech.alerts.map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(["low-battery", "flow-low", "sensor-stale"]));
    expect(agritech.activity.some((e) => e.message === "Pump started" && e.source === "Automation: Morning irrigation")).toBe(true);
    expect(detectSeriesGaps(agritech.series.find((s) => s.deviceId === "weather-01")!, { maxGapMs: 3_600_000 })).toBeDefined();
  });

  it("raises a soil-moisture alert when drift crosses 28%, and logs the rule as a scripted event only", () => {
    let s = createSimulation(agritech);
    const start = Date.parse(agritech.startAt);
    for (let t = 500; t <= 60_000; t += 500) s = tick(s, new Date(start + t));
    expect(selectAlerts(s).some((a) => a.deviceId === "soil-04" && a.kind === "abnormal-reading")).toBe(true);
    const scripted = s.activity.find((e) => e.kind === "automation" && /Rule would fire/.test(e.message))!;
    expect(scripted.detail).toMatch(/Scripted demo event/);
    expect(s.devices["valve-03"]!.confirmedValues.position).toBe("closed");
  });

  it("has a Farm → Field → Irrigation Zone → Device tree", () => {
    const tree = buildSpaceTree(agritech.spaces);
    expect(tree.byId.get("zone-3")!.parent!.node.kind).toBe("field");
    expect(tree.byId.get("zone-3")!.node.kind).toBe("irrigation-zone");
    expect(tree.byId.get("farm")!.node.kind).toBe("farm");
  });
});

describe("operations", () => {
  const sim = createSimulation(operations);

  it("has Site 04 with 24 devices: 22 healthy, one in warning, one offline — derived, not typed", () => {
    const tree = buildSpaceTree(operations.spaces);
    const rollup = rollupSpaceHealth(tree, operations.devices, { alerts: operations.alerts, now: operations.startAt, staleAfterMs: 15 * 60_000 }).get("site-04")!;
    expect(rollup.total).toBe(24);
    expect(rollup.healthy).toBe(22);
    expect(rollup.offline).toBe(1);

    const fleet = summarizeFleetHealth(operations.devices, { alerts: operations.alerts, now: operations.startAt, staleAfterMs: 15 * 60_000 });
    const entries = fleet.entries;
    const offline = entries.filter((e) => e.connectivity.state === "offline");
    const warningOnline = entries.filter((e) => e.health.level === "warning" && e.connectivity.state === "online");
    expect(offline).toHaveLength(1);
    expect(warningOnline).toHaveLength(1);
    expect(fleet.byHealth.healthy).toBe(22);
    // Offline is itself a warning-level verdict, so the health counts read 22 healthy, 2 warning.
    expect(fleet.byHealth.warning).toBe(2);
    expect(selectFleetHealth(sim).byHealth.healthy).toBe(22);
    expect(rollupSpaceHealth(tree, operations.devices).get("org")!.total).toBe(24);
  });

  it("has motors, pumps, meters and a gateway", () => {
    const categories = new Set(operations.devices.map((d) => resolveDeviceCategory(d)));
    for (const c of ["motor", "pump", "meter", "gateway"] as const) expect(categories.has(c), c).toBe(true);
  });

  it("uses free metric keys for equipment health", () => {
    expect(getMetricDefinition("vibration")).toBeUndefined();
    expect(operations.sensors.some((x) => x.metric === "vibration")).toBe(true);
    expect(operations.series.some((x) => x.metric === "vibration")).toBe(true);
    const vibration = operations.series.find((x) => x.deviceId === "p-201" && x.metric === "vibration")!;
    expect(latestPoint(vibration)!.value).toBeGreaterThan(vibration.points[0]!.value);
  });

  it("has maintenance alerts, a fault on the warning pump, and command history", () => {
    expect(operations.alerts.map((a) => a.kind)).toEqual(expect.arrayContaining(["firmware-update-required", "pressure-high", "device-offline"]));
    const pump = selectDeviceState(sim, "p-201")!;
    expect(pump.faults).toHaveLength(1);
    expect(pump.health.level).toBe("warning");
    expect(operations.commandHistory!.length).toBeGreaterThan(2);
    expect(operations.commandHistory!.some((c) => c.status === "failed")).toBe(true);
  });

  it("has one dominant consumer", () => {
    const summary = summarizeEnergy(operations.energy!.devices.map((d) => ({ id: d.deviceId, deviceId: d.deviceId, value: d.todayKwh })), { baseline: operations.energy!.baseline });
    expect(summary.top[0]!.deviceId).toBe("m-301");
    expect(summary.flags).toContain("high-consumption");
  });
});

describe("registry", () => {
  it("lists all three scenarios", () => {
    expect(Object.keys(scenarios).sort()).toEqual(["agritech", "operations", "smart-space"]);
    expect(getScenario("nope")).toBeUndefined();
  });
});

describe("pairing fixtures", () => {
  const methods: KinetixPairingMethod[] = ["bluetooth", "network", "qr", "manual-code", "cloud"];

  it("offers a discoverable device for every method", () => {
    for (const m of methods) {
      expect(pairingDevices[m].length, m).toBeGreaterThan(0);
      expect(pairingDevices[m].every((d) => d.method === m)).toBe(true);
    }
    expect(pairingDevices.qr[0]!.code).toBeTruthy();
    expect(pairingDevices["manual-code"][0]!.code).toBeTruthy();
  });

  it("walks the happy path through every stage to complete", () => {
    expect(pairingHappyPath.map((s) => s.stage)).toEqual(KINETIX_PAIRING_STAGES.filter((s) => s !== "complete"));
    let state = advancePairing(startPairingFlow(), { type: "start", method: "bluetooth" });
    for (const step of pairingHappyPath) {
      expect(state.stage).toBe(step.stage);
      state = advancePairing(state, { type: "next" });
    }
    expect(state.status).toBe("complete");
  });

  it("has at least four failure scenarios covering the required codes", () => {
    expect(pairingFailureScenarios.length).toBeGreaterThanOrEqual(4);
    const codes = pairingFailureScenarios.map((f) => f.code);
    for (const code of ["device-not-found", "already-owned", "weak-signal", "firmware-update-required", "partial-provisioning"]) expect(codes).toContain(code);
  });

  it.each(pairingFailureScenarios.map((f) => [f.id, f] as const))("failure %s agrees with the registry and the state machine", (_id, f) => {
    const info = KINETIX_PAIRING_FAILURES[f.code];
    expect(f.expectRecovery).toEqual(info.recovery.map((r) => r.kind));
    expect(f.expectRetryable).toBe(info.retryable);
    expect(f.expectCleanup).toBe(info.needsCleanup);
    expect(f.stage).toBe(info.stage);
    expect(pairingDevices[f.method].length).toBeGreaterThan(0);

    let state = advancePairing(startPairingFlow(), { type: "start", method: f.method });
    while (state.stage !== f.stage) state = advancePairing(state, { type: "next" });
    state = advancePairing(state, { type: "fail", code: f.code });
    expect(state.status).toBe("failed");
    expect(state.failure).toBe(f.code);
    expect(state.needsCleanup).toBe(f.expectCleanup);
    const retried = transitionPairing(state, { type: "retry" });
    expect(retried.ok).toBe(f.expectRetryable);
  });
});
