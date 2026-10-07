import { describe, expect, it } from "vitest";
import { fakeDevice, permutations, runLedgerScenario, type LedgerScenarioStep } from "../../test/device-ledger-scenario";
import {
  applyDeviceSignals,
  createDeviceLedger,
  describeCommandLifecycle,
  expireDeviceCommands,
  isLifecycleAdjusted,
  isLifecyclePending,
  lifecycleToCommandStatus,
  lifecycleToControlPhase,
  presentCommandValue,
  requestDeviceChange,
  resolveControlState,
  selectCapabilityLifecycle,
  selectDeviceConnectivity,
  summarizeDeviceState,
  toDeviceState,
  type KinetixDeviceLedger,
  type KinetixDeviceSignal,
} from "./index";

/**
 * M4B: the device ledger, driven the way an application driven by a real provider would drive it.
 *
 * Times are application-clock milliseconds. `fakeDevice` emits normalized signals; `runLedgerScenario`
 * applies them in delivery order. Each scenario named in the M4B brief has its own block.
 */

const at = (ms: number) => new Date(ms).toISOString();
const lamp = fakeDevice("lamp");
const thermostat = fakeDevice("thermostat");

function homeLedger(): KinetixDeviceLedger {
  return createDeviceLedger({
    devices: [
      { deviceId: "lamp", capabilities: ["power", "brightness"], values: { power: "off", brightness: 40 }, connectivity: "online" },
      { deviceId: "thermostat", capabilities: ["setpoint"], values: { setpoint: 20 }, connectivity: "online" },
    ],
  });
}

const power = (ledger: KinetixDeviceLedger) => selectCapabilityLifecycle(ledger, "lamp", "power")!;
const setpoint = (ledger: KinetixDeviceLedger) => selectCapabilityLifecycle(ledger, "thermostat", "setpoint")!;
const turnOn = (commandId: string, at: number): LedgerScenarioStep => ({ at, request: { commandId, deviceId: "lamp", capabilityId: "power", value: "on" } });
const setTo = (commandId: string, value: number, at: number): LedgerScenarioStep => ({
  at,
  request: { commandId, deviceId: "thermostat", capabilityId: "setpoint", value },
});
const signals = (at: number, ...list: KinetixDeviceSignal[]): LedgerScenarioStep => ({ at, signals: list });

/** Deep-freeze, so a test fails loudly if any operation mutates its input. */
function frozen<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}

describe("creation", () => {
  it("creates an empty ledger", () => {
    const ledger = createDeviceLedger({ devices: [] });
    expect(ledger.devices).toEqual({});
    expect(selectCapabilityLifecycle(ledger, "lamp", "power")).toBeUndefined();
  });

  it("starts every capability idle, with the known value, and nothing requested", () => {
    const lifecycle = power(homeLedger());
    expect(lifecycle.stage).toBe("idle");
    expect(lifecycle.confirmedValue).toBe("off");
    expect(lifecycle.requestedValue).toBeUndefined();
    expect(lifecycle.commandId).toBeUndefined();
  });

  it("starts a device's link unknown, never offline, when nobody said", () => {
    const ledger = createDeviceLedger({ devices: [{ deviceId: "plug", capabilities: ["power"] }] });
    expect(selectDeviceConnectivity(ledger, "plug").state).toBe("unknown");
    expect(selectCapabilityLifecycle(ledger, "plug", "power")!.confirmedValue).toBeUndefined();
    // A device the ledger has never heard of is unknown too, and the same object each time.
    expect(selectDeviceConnectivity(ledger, "nope")).toBe(selectDeviceConnectivity(ledger, "other"));
    expect(selectDeviceConnectivity(ledger, "nope").state).toBe("unknown");
  });

  it("normalizes an unrecognised connectivity to unknown and keeps lastSeenAt", () => {
    const ledger = createDeviceLedger({
      devices: [
        { deviceId: "a", capabilities: [], connectivity: "gone-fishing" as never },
        { deviceId: "b", capabilities: [], connectivity: { state: "offline", lastSeenAt: at(5) } },
      ],
    });
    expect(selectDeviceConnectivity(ledger, "a").state).toBe("unknown");
    expect(selectDeviceConnectivity(ledger, "b")).toEqual({ state: "offline", lastSeenAt: at(5) });
  });

  it("ignores values for capabilities it was not given", () => {
    const ledger = createDeviceLedger({ devices: [{ deviceId: "plug", capabilities: ["power"], values: { power: "on", energy: 3 } }] });
    expect(Object.keys(ledger.devices.plug!.capabilities)).toEqual(["power"]);
  });
});

describe("requests", () => {
  it("records a request as requested, never as the device's value, and returns the intent to send", () => {
    const { ledger, intent, transitions } = requestDeviceChange(homeLedger(), { commandId: "c1", deviceId: "lamp", capabilityId: "power", value: "on" }, 1_000);
    expect(intent).toEqual({ commandId: "c1", deviceId: "lamp", capabilityId: "power", value: "on", requestedAt: at(1_000) });
    expect(power(ledger)).toMatchObject({ stage: "requested", requestedValue: "on", confirmedValue: "off", commandId: "c1", sentAt: at(1_000), attempts: 1 });
    expect(transitions).toEqual([{ cause: "request", deviceId: "lamp", capabilityId: "power", commandId: "c1", from: "idle", to: "requested" }]);
  });

  it("supersedes an open request on the same capability and names it on the intent", () => {
    const first = requestDeviceChange(homeLedger(), { commandId: "a", deviceId: "thermostat", capabilityId: "setpoint", value: 22 }, 1_000);
    const second = requestDeviceChange(first.ledger, { commandId: "b", deviceId: "thermostat", capabilityId: "setpoint", value: 24 }, 2_000);
    expect(second.intent?.supersedes).toBe("a");
    expect(setpoint(second.ledger)).toMatchObject({ stage: "requested", requestedValue: 24, commandId: "b", supersededCommandIds: ["a"], confirmedValue: 20 });
  });

  it("does not name a settled request as superseded, but still refuses its late replies", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), signals(2_000, thermostat.report("setpoint", 22, 2_000)), setTo("b", 24, 3_000)]);
    expect(run.intents[1]!.supersedes).toBeUndefined();
    expect(setpoint(run.ledger).supersededCommandIds).toEqual(["a"]);
  });

  it("keeps capabilities independent", () => {
    const run = runLedgerScenario(homeLedger(), [
      turnOn("p", 1_000),
      { at: 1_100, request: { commandId: "b", deviceId: "lamp", capabilityId: "brightness", value: 80 } },
      signals(2_000, lamp.report("power", "on", 2_000)),
    ]);
    expect(power(run.ledger).stage).toBe("confirmed");
    expect(selectCapabilityLifecycle(run.ledger, "lamp", "brightness")).toMatchObject({ stage: "requested", requestedValue: 80, confirmedValue: 40 });
  });

  it("refuses a request for a device or capability it does not hold, and returns no intent to send", () => {
    const ledger = homeLedger();
    const device = requestDeviceChange(ledger, { commandId: "x", deviceId: "garage", capabilityId: "power", value: "on" }, 1);
    expect(device.intent).toBeUndefined();
    expect(device.ledger).toBe(ledger);
    expect(device.transitions[0]!.rejection?.code).toBe("unknown-device");
    const capability = requestDeviceChange(ledger, { commandId: "x", deviceId: "lamp", capabilityId: "colour", value: "red" }, 1);
    expect(capability.intent).toBeUndefined();
    expect(capability.transitions[0]!.rejection?.code).toBe("unknown-capability");
  });
});

describe("signals", () => {
  it("applies a snapshot as one report per capability, refusing capabilities it does not hold", () => {
    const { ledger, transitions } = applyDeviceSignals(homeLedger(), [lamp.snapshot({ power: "on", brightness: 70, energy: 12 }, 1_000)], 1_000);
    expect(power(ledger).confirmedValue).toBe("on");
    expect(selectCapabilityLifecycle(ledger, "lamp", "brightness")!.confirmedValue).toBe(70);
    expect(ledger.devices.lamp!.capabilities).not.toHaveProperty("energy");
    expect(transitions.map((t) => [t.cause, t.capabilityId, t.rejection?.code])).toEqual([
      ["snapshot", "power", undefined],
      ["snapshot", "brightness", undefined],
      ["snapshot", "energy", "unknown-capability"],
    ]);
  });

  it("refuses signals for devices it does not hold instead of adding them", () => {
    const ledger = homeLedger();
    const { ledger: next, transitions } = applyDeviceSignals(
      ledger,
      [fakeDevice("garage").report("power", "on", 1), fakeDevice("garage").snapshot({ power: "on" }, 1), fakeDevice("garage").link("offline")],
      1,
    );
    expect(next).toBe(ledger);
    expect(transitions.map((t) => t.rejection?.code)).toEqual(["unknown-device", "unknown-device", "unknown-device"]);
  });

  it("refuses an acknowledgement or result for a command it never saw", () => {
    const ledger = homeLedger();
    const { ledger: next, transitions } = applyDeviceSignals(ledger, [lamp.ack("ghost"), lamp.applied("ghost")], 1);
    expect(next).toBe(ledger);
    expect(transitions.map((t) => t.rejection?.code)).toEqual(["unknown-command", "unknown-command"]);
  });

  it("records a connectivity change on the device only", () => {
    const requested = requestDeviceChange(homeLedger(), { commandId: "c", deviceId: "lamp", capabilityId: "power", value: "on" }, 1).ledger;
    const { ledger, transitions } = applyDeviceSignals(requested, [{ type: "connectivity", deviceId: "lamp", state: "offline", lastSeenAt: at(1) }], 2);
    expect(selectDeviceConnectivity(ledger, "lamp")).toEqual({ state: "offline", lastSeenAt: at(1) });
    expect(power(ledger)).toBe(power(requested));
    expect(transitions).toEqual([{ cause: "connectivity", deviceId: "lamp", connectivity: { from: "online", to: "offline" } }]);
  });

  it("refuses something that is not a signal without throwing", () => {
    const ledger = homeLedger();
    const { ledger: next, transitions } = applyDeviceSignals(ledger, [{ type: "telemetry" } as never], 1);
    expect(next).toBe(ledger);
    expect(transitions[0]!.rejection?.code).toBe("illegal-transition");
  });

  it("never mutates its input, and returns the same ledger when nothing changed", () => {
    const ledger = frozen(homeLedger());
    const requested = requestDeviceChange(ledger, { commandId: "c", deviceId: "lamp", capabilityId: "power", value: "on" }, 1);
    frozen(requested.ledger);
    const acked = applyDeviceSignals(requested.ledger, [lamp.ack("c"), lamp.report("power", "on", 2), lamp.link("offline")], 2);
    frozen(acked.ledger);
    expect(() => expireDeviceCommands(acked.ledger, 99_000, { timeoutMs: 1 })).not.toThrow();
    // Untouched devices keep their identity.
    expect(acked.ledger.devices.thermostat).toBe(ledger.devices.thermostat);
    // A batch of refusals changes nothing at all.
    expect(applyDeviceSignals(acked.ledger, [lamp.ack("c")], 3).ledger).toBe(acked.ledger);
  });
});

describe("reconciliation", () => {
  it("normal confirmation: request 22 → acknowledgement → report 22 → confirmed", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), signals(1_200, thermostat.ack("a")), signals(1_800, thermostat.report("setpoint", 22, 1_700))]);
    expect(run.transitions.map((t) => t.to)).toEqual(["requested", "acknowledged", "confirmed"]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: 22, commandId: "a" });
    expect(isLifecycleAdjusted(setpoint(run.ledger))).toBe(false);
  });

  it("report without acknowledgement: an acknowledgement is not required for truth", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), signals(1_800, thermostat.report("setpoint", 22, 1_700))]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: 22 });
  });

  it("acknowledgement without report stays unconfirmed, then times out as 'may still apply', never failed", () => {
    const acked = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_100, lamp.ack("c"))]);
    expect(power(acked.ledger)).toMatchObject({ stage: "acknowledged", confirmedValue: "off", requestedValue: "on" });
    expect(lifecycleToControlPhase(power(acked.ledger))).toBe("requested");
    expect(presentCommandValue(power(acked.ledger), "confirmed")).toMatchObject({ value: "off", pending: true, indicatePending: true });

    const expired = expireDeviceCommands(acked.ledger, 12_000, { timeoutMs: 10_000 });
    expect(power(expired.ledger).stage).toBe("timed-out");
    expect(power(expired.ledger).confirmedValue).toBe("off");
    expect(lifecycleToCommandStatus(power(expired.ledger))).toBe("expired");
    expect(expired.transitions).toEqual([{ cause: "expire", deviceId: "lamp", capabilityId: "power", commandId: "c", from: "acknowledged", to: "timed-out" }]);
  });

  it("adjusted confirmation: request 22, the device applies 21.5 → confirmed 21.5, never 22", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), signals(1_500, thermostat.applied("a", 21.5))]);
    const lifecycle = setpoint(run.ledger);
    expect(lifecycle).toMatchObject({ stage: "confirmed", confirmedValue: 21.5, adjustedValue: 21.5, requestedValue: 22 });
    expect(isLifecycleAdjusted(lifecycle)).toBe(true);
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) expect(presentCommandValue(lifecycle, strategy).value).toBe(21.5);
    expect(describeCommandLifecycle(lifecycle)).toBe("Confirmed: the device reports 21.5.");
    expect(toDeviceState(run.ledger, { device: { id: "thermostat", name: "Thermostat", status: "online" } }).confirmedValues.setpoint).toBe(21.5);
  });

  it("an applied result without a value confirms the request as asked", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_100, lamp.applied("c"))]);
    expect(power(run.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
    expect(isLifecycleAdjusted(power(run.ledger))).toBe(false);
  });

  it("a rejected result fails the request with the application's code and keeps the reported value", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_100, lamp.rejected("c", "forbidden"))]);
    expect(power(run.ledger)).toMatchObject({ stage: "failed", reasonCode: "forbidden", confirmedValue: "off" });
  });

  it("unrelated report: request 22, report 21.5 updates the reported value and leaves the request open", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), signals(1_500, thermostat.report("setpoint", 21.5, 1_400))]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "requested", confirmedValue: 21.5, requestedValue: 22 });
    expect(isLifecycleAdjusted(setpoint(run.ledger))).toBe(false);
    expect(describeCommandLifecycle(setpoint(run.ledger))).toBe("Requested 22. Waiting for the device; not yet confirmed. It last reported 21.5.");
  });

  it("physical change: confirmed 20, someone turns the dial to 18, the ledger believes the device", () => {
    const run = runLedgerScenario(homeLedger(), [
      setTo("a", 20, 1_000),
      signals(1_200, thermostat.report("setpoint", 20, 1_100)),
      signals(5_000, thermostat.report("setpoint", 18, 4_900)),
    ]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: 18 });
    expect(presentCommandValue(setpoint(run.ledger), "optimistic").value).toBe(18);
  });

  it("physical change with no request ever made is accepted too", () => {
    const { ledger } = applyDeviceSignals(homeLedger(), [lamp.report("power", "on", 3_000)], 3_000);
    expect(power(ledger)).toMatchObject({ stage: "idle", confirmedValue: "on" });
    expect(toDeviceState(ledger, { device: { id: "lamp", name: "Lamp", status: "online" } }).confirmedValues.power).toBe("on");
  });

  it("disconnect during a pending command: not failed, not refused, and not presented as progressing", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_500, lamp.link("offline"))]);
    const lifecycle = power(run.ledger);
    expect(lifecycle.stage).toBe("requested");
    expect(isLifecyclePending(lifecycle)).toBe(true);
    expect(lifecycleToCommandStatus(lifecycle)).not.toBe("failed");
    expect(lifecycle.reasonCode).toBeUndefined();

    const control = resolveControlState({ connectivity: selectDeviceConnectivity(run.ledger, "lamp"), lifecycle });
    expect(control.availability).toBe("offline");
    expect(control.phase).toBe("requested");
    expect(control.description).toBe("Device offline. The requested change is not confirmed. Showing the last known setting");
    expect(control.description).not.toMatch(/not yet|in progress|failed/i);

    const summary = summarizeDeviceState(toDeviceState(run.ledger, { device: { id: "lamp", name: "Lamp", status: "online" } }));
    expect(summary.connectivity).toBe("offline");
    expect(summary.description).not.toMatch(/in progress/);
  });

  it("reconnect: a returned link alone confirms nothing; the fresh snapshot decides", () => {
    const base: LedgerScenarioStep[] = [turnOn("c", 1_000), signals(1_500, lamp.link("offline")), signals(9_000, lamp.link("connecting")), signals(9_500, lamp.link("online"))];
    const linkOnly = runLedgerScenario(homeLedger(), base);
    expect(power(linkOnly.ledger)).toMatchObject({ stage: "requested", confirmedValue: "off" });

    const stillOff = runLedgerScenario(homeLedger(), [...base, signals(9_600, lamp.snapshot({ power: "off", brightness: 40 }, 9_550))]);
    expect(power(stillOff.ledger)).toMatchObject({ stage: "requested", confirmedValue: "off" });
    // ... and it then times out as "may still apply", not as a failure.
    expect(power(expireDeviceCommands(stillOff.ledger, 20_000, { timeoutMs: 10_000 }).ledger).stage).toBe("timed-out");

    const didApply = runLedgerScenario(homeLedger(), [...base, signals(9_600, lamp.snapshot({ power: "on", brightness: 40 }, 9_550))]);
    expect(power(didApply.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
  });

  it("timeout: a correlated timeout expires that command and says it may still apply", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), { at: 5_000, expire: { commandId: "c" } }]);
    expect(power(run.ledger)).toMatchObject({ stage: "timed-out", commandId: "c" });
    expect(describeCommandLifecycle(power(run.ledger))).toMatch(/timed out/);
    expect(lifecycleToCommandStatus(power(run.ledger))).toBe("expired");
    // A late matching report still settles it: the device told the truth late.
    const late = applyDeviceSignals(run.ledger, [lamp.report("power", "on", 6_000)], 6_000);
    expect(power(late.ledger).stage).toBe("confirmed");
  });

  it("a per-request timer with a deadline waits for the deadline", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), { at: 3_000, expire: { commandId: "c", timeoutMs: 5_000 } }]);
    expect(power(run.ledger).stage).toBe("requested");
    expect(run.transitions).toHaveLength(1);
  });

  it("stale timeout: a timer for replaced command A cannot time out B", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), setTo("b", 24, 2_000), { at: 11_000, expire: { commandId: "a" } }]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "requested", commandId: "b", requestedValue: 24 });
    expect(run.transitions.at(-1)).toMatchObject({ cause: "expire", commandId: "a", rejection: { code: "stale-response" } });
  });

  it("policy expiry measures from the current request's own send", () => {
    // A was sent at 1s and replaced at 8s; at 12s A would be past 10s, B is not.
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), setTo("b", 24, 8_000), { at: 12_000, expire: { timeoutMs: 10_000 } }]);
    expect(setpoint(run.ledger).stage).toBe("requested");
    expect(setpoint(expireDeviceCommands(run.ledger, 18_001, { timeoutMs: 10_000 }).ledger)).toMatchObject({ stage: "timed-out", commandId: "b" });
  });

  it("late response to a replaced command: A's acknowledgement and result neither revive A nor touch B", () => {
    const run = runLedgerScenario(homeLedger(), [
      setTo("a", 22, 1_000),
      setTo("b", 24, 2_000),
      signals(3_000, thermostat.ack("a"), thermostat.applied("a", 22), thermostat.rejected("a", "busy")),
    ]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "requested", commandId: "b", requestedValue: 24, confirmedValue: 20 });
    expect(run.transitions.slice(-3).map((t) => t.rejection?.code)).toEqual(["stale-response", "stale-response", "stale-response"]);
  });

  it("late report of the replaced value is device truth, but cannot confirm B", () => {
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), setTo("b", 24, 2_000), signals(3_000, thermostat.report("setpoint", 22, 2_900))]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "requested", commandId: "b", requestedValue: 24, confirmedValue: 22 });
  });

  it("out-of-order reports: an older observation delivered later is refused", () => {
    const run = runLedgerScenario(homeLedger(), [
      signals(5_000, thermostat.report("setpoint", 19, 4_000)),
      signals(5_100, thermostat.report("setpoint", 23, 3_000)),
    ]);
    expect(setpoint(run.ledger)).toMatchObject({ confirmedValue: 19, reportedAt: at(4_000) });
    expect(run.transitions.at(-1)?.rejection?.code).toBe("stale-report");
  });

  it("device clock behind the application's: a report received after the send settles it (M4A two clocks)", () => {
    const skewed = fakeDevice("thermostat", { skewMs: -4_000 });
    const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 10_000), signals(11_000, skewed.report("setpoint", 22, 11_000))]);
    expect(setpoint(run.ledger)).toMatchObject({ stage: "confirmed", reportedAt: at(7_000) });
  });

  it("a report received before the send never settles the request that followed", () => {
    const run = runLedgerScenario(homeLedger(), [signals(900, lamp.report("power", "on", 900)), turnOn("c", 1_000)]);
    // The device was already on: the request is open until the device speaks after it.
    expect(power(run.ledger)).toMatchObject({ stage: "requested", confirmedValue: "on" });
  });

  it("report before acknowledgement: confirmed, and the late acknowledgement is absorbed", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_200, lamp.report("power", "on", 1_150)), signals(1_300, lamp.ack("c"))]);
    expect(power(run.ledger).stage).toBe("confirmed");
    expect(run.transitions.at(-1)).toMatchObject({ cause: "acknowledgement", from: "confirmed", to: "confirmed", rejection: { code: "illegal-transition" } });
  });

  it("structural equality: a reported colour equal to the requested one confirms it", () => {
    const ledger = createDeviceLedger({ devices: [{ deviceId: "bulb", capabilities: ["color"], values: { color: { r: 0, g: 0, b: 0 } } }] });
    const requested = requestDeviceChange(ledger, { commandId: "c", deviceId: "bulb", capabilityId: "color", value: { r: 255, g: 0, b: 0 } }, 1_000);
    const { ledger: next } = applyDeviceSignals(
      requested.ledger,
      [{ type: "report", deviceId: "bulb", capabilityId: "color", value: { r: 255, g: 0, b: 0 }, observedAt: at(1_100) }],
      1_100,
    );
    expect(selectCapabilityLifecycle(next, "bulb", "color")!.stage).toBe("confirmed");
  });
});

describe("order independence", () => {
  it("ends confirmed whichever order the acknowledgement, report and link arrive in", () => {
    const pieces = [lamp.ack("c"), lamp.report("power", "on", 1_500), lamp.link("online")];
    for (const order of permutations(pieces)) {
      const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), ...order.map((signal, i) => signals(2_000 + i, signal))]);
      expect(power(run.ledger)).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
    }
  });

  it("never lets any ordering of A's late replies settle B", () => {
    const late = [thermostat.ack("a"), thermostat.applied("a", 22), thermostat.rejected("a", "busy"), thermostat.report("setpoint", 22, 2_500)];
    for (const order of permutations(late)) {
      const run = runLedgerScenario(homeLedger(), [setTo("a", 22, 1_000), setTo("b", 24, 2_000), ...order.map((signal, i) => signals(3_000 + i, signal))]);
      expect(setpoint(run.ledger)).toMatchObject({ stage: "requested", commandId: "b", requestedValue: 24 });
    }
  });
});

describe("selectors", () => {
  it("keeps the same objects when a provider repeats a value it already reported", () => {
    const first = applyDeviceSignals(homeLedger(), [lamp.report("power", "on", 1_000), lamp.link("online")], 1_000).ledger;
    const repeat = applyDeviceSignals(first, [lamp.report("power", "on", 1_000), lamp.link("online")], 2_000);
    expect(repeat.ledger).toBe(first);
    expect(repeat.transitions.map((t) => t.rejection)).toEqual([undefined, undefined]);
    // A newer observation of the same value moves `reportedAt`, which is a change.
    expect(power(applyDeviceSignals(first, [lamp.report("power", "on", 3_000)], 3_000).ledger)).not.toBe(power(first));
  });

  it("returns the same lifecycle object until that capability changes", () => {
    const requested = requestDeviceChange(homeLedger(), { commandId: "c", deviceId: "lamp", capabilityId: "power", value: "on" }, 1).ledger;
    const next = applyDeviceSignals(requested, [thermostat.report("setpoint", 21, 2)], 2).ledger;
    expect(power(next)).toBe(power(requested));
    expect(setpoint(next)).not.toBe(setpoint(requested));
  });

  it("derives a device state with no second copy of reported or requested values", () => {
    const run = runLedgerScenario(homeLedger(), [
      turnOn("c", 1_000),
      setTo("s", 22, 1_000),
      signals(1_200, thermostat.report("setpoint", 22, 1_100)),
      signals(1_300, lamp.link("online")),
    ]);
    const state = toDeviceState(run.ledger, { device: { id: "lamp", name: "Desk lamp", status: "online" } });
    expect(state.confirmedValues).toEqual({ power: "off", brightness: 40 });
    expect(state.requestedValues).toEqual({ power: "on" });
    expect(state.pendingCommands).toEqual([{ id: "c", deviceId: "lamp", name: "power", status: "sent", createdAt: at(1_000) }]);
    expect(state.connectivity.state).toBe("online");
    expect(state.health.level).toBe("healthy");
    expect(summarizeDeviceState(state).description).toBe("Desk lamp: healthy. online. 1 change requested but not confirmed.");
    // A settled request is no longer asked for.
    expect(toDeviceState(run.ledger, { device: { id: "thermostat", name: "Thermostat", status: "online" } }).requestedValues).toEqual({});
  });

  it("derives an unknown device as unknown, never offline", () => {
    const state = toDeviceState(homeLedger(), { device: { id: "garage", name: "Garage", status: "online" } });
    expect(state.connectivity.state).toBe("unknown");
    expect(state.confirmedValues).toEqual({});
  });
});

describe("expiry options", () => {
  it("expires per capability when given a function, and nothing without a deadline", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("p", 1_000), setTo("s", 22, 1_000)]);
    const fn = expireDeviceCommands(run.ledger, 4_000, { timeoutMs: ({ capabilityId }) => (capabilityId === "power" ? 2_000 : 60_000) });
    expect(power(fn.ledger).stage).toBe("timed-out");
    expect(setpoint(fn.ledger).stage).toBe("requested");
    expect(expireDeviceCommands(run.ledger, 99_000, {}).ledger).toBe(run.ledger);
    expect(expireDeviceCommands(run.ledger, 99_000, { timeoutMs: 0 }).ledger).toBe(run.ledger);
    expect(expireDeviceCommands(run.ledger, 99_000, { timeoutMs: Number.NaN }).ledger).toBe(run.ledger);
  });

  it("refuses to expire an unknown command or a settled one", () => {
    const run = runLedgerScenario(homeLedger(), [turnOn("c", 1_000), signals(1_100, lamp.report("power", "on", 1_050))]);
    expect(expireDeviceCommands(run.ledger, 9_000, { commandId: "zzz" }).transitions[0]!.rejection?.code).toBe("unknown-command");
    expect(expireDeviceCommands(run.ledger, 9_000, { commandId: "c" }).transitions[0]!.rejection?.code).toBe("illegal-transition");
  });
});
