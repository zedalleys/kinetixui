import { describe, expect, it } from "vitest";
import { agritech } from "@/examples/iot/scenarios/agritech";
import {
  acknowledgeAlert,
  cancelCommand,
  createSimulation,
  dispatchCommand,
  hasCommandInFlight,
  latestCommand,
  retryCommand,
  setDeviceReachable,
  tick,
} from "./core";
import { selectAlerts, selectConnectivity, selectDeviceState, selectDeviceSummary, selectEnergy, selectFleetHealth, selectReading, selectSeries } from "./selectors";
import { at, testScenario } from "./test-scenario";
import type { Simulation } from "./types";

/** Tick in fixed steps, as the hook would. */
function run(sim: Simulation, fromMs: number, toMs: number, stepMs = 500): Simulation {
  let s = sim;
  for (let t = fromMs + stepMs; t <= toMs; t += stepMs) s = tick(s, at(t));
  return s;
}
const stage = (sim: Simulation, id: string) => sim.commands.find((c) => c.id === id)!.lifecycle.stage;

describe("determinism", () => {
  it("gives identical state for the same seed and the same calls", () => {
    const drive = (seed: number) => {
      let s = createSimulation(testScenario, { seed });
      s = dispatchCommand(s, "lamp", "power", "on", at(1000));
      return run(s, 1000, 40_000);
    };
    expect(JSON.stringify(drive(11))).toBe(JSON.stringify(drive(11)));
    expect(JSON.stringify(drive(11).readings)).not.toBe(JSON.stringify(drive(12).readings));
  });

  it("does not depend on how often it is ticked", () => {
    const start = createSimulation(testScenario);
    const fine = run(start, 0, 60_000, 500);
    const coarse = tick(start, at(60_000));
    expect(coarse.readings).toEqual(fine.readings);
    const shape = (sim: Simulation) => sim.alerts.map((a) => [a.deviceId, a.kind, a.raisedAt, a.resolvedAt]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    expect(shape(coarse)).toEqual(shape(fine));
    expect(coarse.live).toEqual(fine.live);
  });

  it("starts exactly at the scenario base value", () => {
    const sim = createSimulation(testScenario);
    expect(sim.readings["probe:temperature"]!.value).toBe(25);
    expect(sim.now).toBe(testScenario.startAt);
  });

  it("does not mutate the simulation it was given, and returns it unchanged for a non-advancing time", () => {
    const sim = createSimulation(testScenario);
    const before = JSON.stringify(sim);
    const next = tick(sim, at(5000));
    expect(JSON.stringify(sim)).toBe(before);
    expect(next).not.toBe(sim);
    expect(tick(next, at(5000))).toBe(next);
    expect(tick(next, at(1000))).toBe(next);
  });
});

describe("command honesty", () => {
  it("keeps the confirmed value until the device confirms, and does not treat an ack as a confirm", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "lamp", "power", "on", at(1000));
    const id = s.lastCommandId!;
    expect(stage(s, id)).toBe("requested");
    expect(s.devices.lamp!.confirmedValues.power).toBe("off");
    expect(s.devices.lamp!.requestedValues.power).toBe("on");

    s = tick(s, at(1000 + 300));
    expect(stage(s, id)).toBe("acknowledged");
    expect(s.devices.lamp!.confirmedValues.power).toBe("off");
    expect(s.devices.lamp!.requestedValues.power).toBe("on");
    expect(selectDeviceSummary(s, "lamp")!.description).toMatch(/requested but not confirmed/);

    s = tick(s, at(1000 + 900));
    expect(stage(s, id)).toBe("confirmed");
    expect(s.devices.lamp!.confirmedValues.power).toBe("on");
    expect(s.devices.lamp!.requestedValues.power).toBeUndefined();
  });

  it("stamps events with their scripted time, not the tick that noticed them", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "lamp", "power", "on", at(1000));
    s = tick(s, at(20_000));
    const cmd = s.commands[0]!;
    expect(cmd.lifecycle.ackAt).toBe(at(1200));
    expect(cmd.lifecycle.settledAt).toBe(at(1800));
  });

  it("refuses a second request while one is in flight, and refuses invalid input", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "lamp", "power", "on", at(0));
    const first = s.lastCommandId;
    const again = dispatchCommand(s, "lamp", "power", "off", at(100));
    expect(again.commands).toHaveLength(1);
    expect(again.lastCommandId).toBeNull();
    expect(dispatchCommand(s, "nope", "power", "on", at(100)).commands).toHaveLength(1);
    expect(dispatchCommand(s, "lamp", "level", "abc", at(100)).commands).toHaveLength(1);
    expect(dispatchCommand(s, "probe", "temperature", 3, at(100)).commands).toHaveLength(1);
    expect(first).toBe("sim-cmd-1");
  });

  it("clamps and snaps a level to the capability's own range and step", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "lamp", "level", 47, at(0));
    expect(s.commands[0]!.lifecycle.requestedValue).toBe(45);
    s = run(s, 0, 2000);
    s = dispatchCommand(s, "lamp", "level", 500, at(2500));
    expect(s.commands[1]!.lifecycle.requestedValue).toBe(100);
  });

  it("can cancel; cancelling leaves the confirmed value alone", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "lamp", "power", "on", at(0));
    const id = s.lastCommandId!;
    s = cancelCommand(s, id, at(100));
    expect(stage(s, id)).toBe("cancelled");
    expect(s.devices.lamp!.confirmedValues.power).toBe("off");
    expect(s.devices.lamp!.requestedValues.power).toBeUndefined();
    s = run(s, 100, 5000);
    expect(s.devices.lamp!.confirmedValues.power).toBe("off");
  });

  it("appends activity for each stage, and reports whether time must flow", () => {
    let s = createSimulation(testScenario);
    expect(hasCommandInFlight(s)).toBe(false);
    s = dispatchCommand(s, "lamp", "power", "on", at(0));
    expect(hasCommandInFlight(s)).toBe(true);
    s = tick(s, at(2000));
    expect(hasCommandInFlight(s)).toBe(false);
    expect(s.activity.filter((e) => e.deviceId === "lamp" && e.kind === "command").map((e) => e.status)).toEqual(["requested", "acknowledged", "confirmed"]);
  });
});

describe("unreachable device", () => {
  it("goes requested → timed-out → unreachable, then a retry succeeds once the device answers", () => {
    let s = createSimulation(testScenario);
    expect(s.devices.ghost!.reachable).toBe(false);
    s = dispatchCommand(s, "ghost", "power", "on", at(0));
    const id = s.lastCommandId!;
    expect(stage(s, id)).toBe("requested");

    s = tick(s, at(1500)); // no ack ever arrives from an unreachable device
    expect(stage(s, id)).toBe("requested");
    s = tick(s, at(2100));
    expect(stage(s, id)).toBe("timed-out");
    expect(s.devices.ghost!.confirmedValues.power).toBe("off");

    s = tick(s, at(2600));
    expect(stage(s, id)).toBe("unreachable");
    expect(s.devices.ghost!.confirmedValues.power).toBe("off");
    expect(selectConnectivity(s, "ghost").state).toBe("unreachable");
    expect(selectAlerts(s).some((a) => a.deviceId === "ghost" && a.kind === "command-failed")).toBe(true);

    s = setDeviceReachable(s, "ghost", true, at(3000));
    expect(selectConnectivity(s, "ghost").state).toBe("online");
    s = retryCommand(s, id, at(3100));
    expect(stage(s, id)).toBe("retrying");
    expect(s.commands[0]!.lifecycle.attempts).toBe(2);
    expect(s.devices.ghost!.requestedValues.power).toBe("on");

    s = tick(s, at(3100 + 900));
    expect(stage(s, id)).toBe("confirmed");
    expect(s.devices.ghost!.confirmedValues.power).toBe("on");
    expect(selectAlerts(s, { includeAcknowledged: true }).some((a) => a.kind === "command-failed")).toBe(false);
  });

  it("makes a reachable device stop answering, and refuses retries past the attempt cap", () => {
    let s = createSimulation(testScenario);
    s = setDeviceReachable(s, "lamp", false, at(0));
    expect(s.devices.lamp!.device.status).toBe("offline");
    s = dispatchCommand(s, "lamp", "power", "on", at(100));
    const id = s.lastCommandId!;
    for (let i = 0; i < 4; i++) {
      s = tick(s, at(100 + 10_000 * (i + 1)));
      s = retryCommand(s, id, at(100 + 10_000 * (i + 1) + 1));
    }
    expect(s.commands[0]!.lifecycle.attempts).toBe(3);
  });
});

describe("flaky device", () => {
  it("fails once with the confirmed value intact, then succeeds on retry", () => {
    let s = createSimulation(testScenario);
    s = dispatchCommand(s, "flaky", "power", "on", at(0));
    const id = s.lastCommandId!;
    s = tick(s, at(900));
    expect(stage(s, id)).toBe("failed");
    expect(s.commands[0]!.lifecycle.reason).toBe("Did not move.");
    expect(s.devices.flaky!.confirmedValues.power).toBe("off");
    expect(s.devices.flaky!.requestedValues.power).toBeUndefined();

    s = retryCommand(s, id, at(1000));
    s = tick(s, at(2000));
    expect(stage(s, id)).toBe("confirmed");
    expect(s.devices.flaky!.confirmedValues.power).toBe("on");
    expect(s.commands[0]!.lifecycle.attempts).toBe(2);
    expect(s.failuresServed.flaky).toBe(1);
  });

  it("follows the agritech valve script (the demo's flaky valve)", () => {
    let s = createSimulation(agritech);
    s = dispatchCommand(s, "valve-03", "position", "open", agritech.startAt);
    const id = s.lastCommandId!;
    expect(s.devices["valve-03"]!.confirmedValues.position).toBe("closed");
    s = tick(s, new Date(Date.parse(agritech.startAt) + 2500).toISOString());
    expect(stage(s, id)).toBe("failed");
    expect(latestCommand(s, "valve-03", "position")!.lifecycle.reason).toBe("Valve position not reported.");
  });
});

describe("drift, alerts and derived state", () => {
  it("raises an alert when a sensor crosses its threshold and clears it when it returns", () => {
    let s = createSimulation(testScenario);
    expect(selectAlerts(s)).toHaveLength(0);
    s = run(s, 0, 40_000);
    const open = selectAlerts(s).filter((a) => a.deviceId === "probe");
    expect(open).toHaveLength(1);
    expect(open[0]!.kind).toBe("abnormal-reading");
    expect(open[0]!.severity).toBe("warning");
    expect(selectReading(s, "probe", "temperature")!.evaluation.state).toBe("warning");

    s = run(s, 40_000, 90_000);
    expect(selectAlerts(s).filter((a) => a.deviceId === "probe")).toHaveLength(0);
    const all = s.alerts.filter((a) => a.deviceId === "probe");
    expect(all).toHaveLength(1);
    expect(all[0]!.resolvedAt).toBeDefined();
    expect(selectReading(s, "probe", "temperature")!.evaluation.state).toBe("normal");
    expect(s.activity.filter((e) => e.deviceId === "probe" && e.kind === "alert")).toHaveLength(2);
  });

  it("raises a stale alert for a sensor that stopped reporting, and never reports it as normal", () => {
    const s = tick(createSimulation(testScenario), at(1000));
    expect(selectReading(s, "quiet", "temperature")!.evaluation.state).toBe("stale");
    expect(s.alerts.some((a) => a.deviceId === "quiet" && a.kind === "sensor-stale")).toBe(true);
  });

  it("keeps a bounded live series after the scenario history", () => {
    const s = run(createSimulation(testScenario), 0, 30_000, 1000);
    expect(selectSeries(s, "probe", "temperature").points.length).toBeGreaterThan(20);
    const far = tick(s, at(10_000_000));
    expect(far.live["probe:temperature"]!.length).toBeLessThanOrEqual(120);
  });

  it("logs scripted automation events as scripted, changes nothing else, and only once", () => {
    let s = run(createSimulation(testScenario), 0, 12_000);
    const events = s.activity.filter((e) => e.kind === "automation");
    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toMatch(/Scripted demo event/);
    expect(events[0]!.source).toBe("Automation: Evening");
    expect(s.devices.lamp!.confirmedValues.power).toBe("off");
    expect(s.automations[0]!.lastRunAt).toBe(at(10_000));
    s = run(s, 12_000, 20_000);
    expect(s.activity.filter((e) => e.kind === "automation")).toHaveLength(1);
  });

  it("acknowledges an alert without resolving it", () => {
    let s = tick(createSimulation(testScenario), at(1000));
    const alert = s.alerts.find((a) => a.kind === "sensor-stale")!;
    s = acknowledgeAlert(s, alert.id, at(2000));
    const after = s.alerts.find((a) => a.id === alert.id)!;
    expect(after.acknowledgedAt).toBe(at(2000));
    expect(after.resolvedAt).toBeUndefined();
    expect(selectAlerts(s).some((a) => a.id === alert.id)).toBe(false);
    expect(selectAlerts(s, { includeAcknowledged: true }).some((a) => a.id === alert.id)).toBe(true);
  });

  it("derives device health, fleet health and energy from the headless functions", () => {
    let s = createSimulation(testScenario);
    expect(selectDeviceState(s, "ghost")!.health.level).toBe("warning");
    expect(selectDeviceState(s, "lamp")!.health.level).toBe("healthy");
    const fleet = selectFleetHealth(s);
    expect(fleet.total).toBe(5);
    expect(fleet.offline).toBe(1);

    s = dispatchCommand(s, "lamp", "power", "on", at(0));
    s = tick(s, at(1000));
    const before = selectEnergy(s)!.summary.items.find((i) => i.id === "lamp")!.value;
    s = tick(s, at(3_601_000));
    const after = selectEnergy(s)!.summary.items.find((i) => i.id === "lamp")!.value;
    expect(after - before).toBeGreaterThan(0.9); // one hour at 1000 W, lamp confirmed on
  });

  it("reports an unknown reachability change as a no-op", () => {
    const s = createSimulation(testScenario);
    expect(setDeviceReachable(s, "nope", false)).toBe(s);
    expect(setDeviceReachable(s, "lamp", true)).toBe(s);
  });
});
