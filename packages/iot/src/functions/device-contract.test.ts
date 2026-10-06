import { describe, expect, it } from "vitest";
import {
  describeCommandLifecycle,
  evaluateReading,
  findCapabilitiesByRole,
  isSameDeviceValue,
  presentCommandValue,
  resolveBatteryState,
  resolveCapabilitySupport,
  startCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
  type KinetixDeviceCapability,
} from "./index";

/**
 * The M1 device interaction contract, exercised against the asynchronous cases real hardware produces:
 * slow acknowledgements, lost replies, duplicate and out-of-order deliveries, devices that drop off and
 * come back. See docs/iot/DEVICE-INTERACTION-CONTRACT.md.
 *
 * Time is passed explicitly as milliseconds so every case is deterministic.
 */

const onOff = (v: unknown) => (v ? "on" : "off");

/** Feed events in order, asserting each is accepted. */
function run<T>(state: KinetixCommandLifecycle<T>, ...steps: [KinetixCommandLifecycleEvent, number][]): KinetixCommandLifecycle<T> {
  let s = state;
  for (const [event, at] of steps) {
    const result = transitionCommandLifecycle(s, event, at);
    expect(result.ok, `${event.type} at ${at} should be accepted from ${s.stage}`).toBe(true);
    s = result.state;
  }
  return s;
}

const requestOn = () => run(startCommandLifecycle({ confirmed: false, requested: true, commandId: "c1" }), [{ type: "sent" }, 0]);

describe("desired vs reported: the brief's ten cases", () => {
  it("1. OFF → request ON → pending → confirmed ON", () => {
    const pending = requestOn();
    expect(pending.stage).toBe("requested");
    expect(pending.confirmedValue).toBe(false);
    expect(pending.requestedValue).toBe(true);
    const done = run(pending, [{ type: "acknowledge", commandId: "c1" }, 100], [{ type: "confirm", commandId: "c1" }, 400]);
    expect(done.stage).toBe("confirmed");
    expect(done.confirmedValue).toBe(true);
    expect(describeCommandLifecycle(done, { formatValue: onOff })).toBe("Confirmed: the device reports on.");
  });

  it("2. OFF → request ON → pending → failed, with a machine-readable code; desired stays as intent", () => {
    const failed = run(requestOn(), [{ type: "fail", code: "relay-fault", reason: "Relay did not close.", commandId: "c1" }, 300]);
    expect(failed.stage).toBe("failed");
    expect(failed.reasonCode).toBe("relay-fault");
    expect(failed.requestedValue).toBe(true);
    expect(failed.confirmedValue).toBe(false);
    expect(describeCommandLifecycle(failed, { formatValue: onOff })).toBe("The change to on failed. Relay did not close. The device still reports off.");
  });

  it("3. pending → timeout keeps the reported value and says nothing about the device", () => {
    const timedOut = run(requestOn(), [{ type: "timeout", code: "no-reply" }, 10_000]);
    expect(timedOut.stage).toBe("timed-out");
    expect(timedOut.reasonCode).toBe("no-reply");
    expect(timedOut.confirmedValue).toBe(false);
  });

  it("4. pending → device offline", () => {
    const lost = run(requestOn(), [{ type: "acknowledge" }, 50], [{ type: "deviceUnreachable", code: "gateway-offline" }, 2_000]);
    expect(lost.stage).toBe("unreachable");
    expect(lost.confirmedValue).toBe(false);
    expect(presentCommandValue(lost).pending).toBe(false);
  });

  describe("5. offline → reconnect", () => {
    const offline = () => run(requestOn(), [{ type: "deviceUnreachable" }, 2_000]);

    it("reconnects already in the requested state: confirmed", () => {
      const back = run(offline(), [{ type: "report", value: true, observedAt: 60_000 }, 60_100]);
      expect(back.stage).toBe("confirmed");
      expect(back.confirmedValue).toBe(true);
    });

    it("reconnects in the old state: failed, never 'confirmed off' (gap G2 on main)", () => {
      const back = run(offline(), [{ type: "report", value: false, observedAt: 60_000 }, 60_100]);
      expect(back.stage).toBe("failed");
      expect(back.confirmedValue).toBe(false);
      expect(describeCommandLifecycle(back, { formatValue: onOff })).toBe("The change to on failed. The device still reports off.");
    });

    it("and can then be retried with a fresh correlation id", () => {
      const back = run(offline(), [{ type: "report", value: false }, 60_100], [{ type: "retry", commandId: "c2" }, 61_000]);
      expect(back.stage).toBe("retrying");
      expect(back.commandId).toBe("c2");
      expect(back.reasonCode).toBeUndefined();
    });
  });

  it("6. a duplicate acknowledgement or confirmation is harmless", () => {
    const acked = run(requestOn(), [{ type: "acknowledge", commandId: "c1" }, 100]);
    const dupAck = transitionCommandLifecycle(acked, { type: "acknowledge", commandId: "c1" }, 150);
    expect(dupAck.ok).toBe(false);
    expect(dupAck.state).toBe(acked);
    expect(dupAck.state.ackAt).toBe(new Date(100).toISOString());

    const done = run(acked, [{ type: "confirm", commandId: "c1" }, 200]);
    const dupConfirm = transitionCommandLifecycle(done, { type: "confirm", commandId: "c1" }, 250);
    expect(dupConfirm.ok).toBe(false);
    expect(dupConfirm.state).toBe(done);
    // A duplicate *report* of the same value is accepted and changes nothing that matters.
    const dupReport = run(done, [{ type: "report", value: true }, 300]);
    expect(dupReport.stage).toBe("confirmed");
    expect(dupReport.confirmedValue).toBe(true);
  });

  describe("7. a stale acknowledgement does not overwrite newer state", () => {
    it("a reply to a superseded command is refused (gap G1 on main)", () => {
      // The user asked for 50 (c1), changed their mind, and asked for 80 (c2).
      const second = run(startCommandLifecycle({ confirmed: 20, requested: 80 }), [{ type: "sent", commandId: "c2" }, 1_000]);
      for (const event of [
        { type: "confirm", value: 50, commandId: "c1" },
        { type: "acknowledge", commandId: "c1" },
        { type: "fail", commandId: "c1" },
      ] as const) {
        const late = transitionCommandLifecycle(second, event, 1_200);
        expect(late.ok).toBe(false);
        expect(late.ok || late.rejection.code).toBe("stale-response");
        expect(late.state).toBe(second);
      }
      expect(run(second, [{ type: "confirm", value: 80, commandId: "c2" }, 1_500]).stage).toBe("confirmed");
    });

    it("an out-of-order report is refused", () => {
      const s = run(requestOn(), [{ type: "report", value: true, observedAt: 5_000 }, 5_100]);
      expect(s.stage).toBe("confirmed");
      const late = transitionCommandLifecycle(s, { type: "report", value: false, observedAt: 4_000 }, 5_200);
      expect(late.ok).toBe(false);
      expect(late.ok || late.rejection.code).toBe("stale-report");
      expect(late.state.confirmedValue).toBe(true);
    });

    it("a report observed before the current send is recorded but never settles it", () => {
      const s = run(startCommandLifecycle({ confirmed: 20, requested: 50 }), [{ type: "sent" }, 10_000]);
      const early = run(s, [{ type: "report", value: 50, observedAt: 5_000 }, 11_000]);
      expect(early.stage).toBe("requested");
      expect(early.confirmedValue).toBe(50);
      const lost = run(startCommandLifecycle({ confirmed: false, requested: true }), [{ type: "sent" }, 10_000], [{ type: "deviceUnreachable" }, 12_000]);
      expect(run(lost, [{ type: "report", value: false, observedAt: 5_000 }, 13_000]).stage).toBe("unreachable");
    });

    it("uncorrelated callers keep the previous behaviour", () => {
      const s = run(startCommandLifecycle({ confirmed: 20, requested: 80 }), [{ type: "sent" }, 0], [{ type: "confirm", value: 50 }, 10]);
      expect(s.stage).toBe("confirmed");
      expect(s.confirmedValue).toBe(50);
    });
  });

  it("8. desired and reported can differ, and only reported is presented as the device's state", () => {
    const s = run(requestOn(), [{ type: "acknowledge" }, 100]);
    expect(s.requestedValue).not.toBe(s.confirmedValue);
    expect(describeCommandLifecycle(s, { formatValue: onOff })).toBe("The device acknowledged the request for on but has not confirmed it. It last reported off.");
    // An intermediate report while pending updates reported state but does not settle the request.
    const thermostat = run(startCommandLifecycle({ confirmed: 18, requested: 22 }), [{ type: "sent" }, 0], [{ type: "report", value: 19 }, 60_000]);
    expect(thermostat.stage).toBe("requested");
    expect(thermostat.confirmedValue).toBe(19);
    expect(thermostat.requestedValue).toBe(22);
  });

  it("9. stale telemetry is representable and never reads as normal", () => {
    const reading = evaluateReading({ metric: "soil-moisture", value: 31, timestamp: 0, now: 3_600_000, staleAfterMs: 900_000 });
    expect(reading.state).toBe("stale");
    expect(reading.level).toBe("normal");
  });

  it("10. an unsupported capability is representable, distinct from read-only", () => {
    const sensor: KinetixDeviceCapability[] = [{ id: "moisture", kind: "telemetry", metric: "soil-moisture", readOnly: true }];
    expect(resolveCapabilitySupport(sensor, "power")).toBe("unsupported");
    expect(resolveCapabilitySupport(sensor, "moisture")).toBe("read-only");
    expect(resolveCapabilitySupport(null, "power")).toBe("unsupported");
  });
});

describe("reported state outside a request (gap G3 on main)", () => {
  it("an idle lifecycle tracks a physical switch without inventing a request", () => {
    const s = run(startCommandLifecycle({ confirmed: false }), [{ type: "report", value: true }, 10]);
    expect(s.stage).toBe("idle");
    expect(s.confirmedValue).toBe(true);
    expect(s.attempts).toBe(0);
  });

  it("a late report matching the request settles a timeout as confirmed", () => {
    const s = run(requestOn(), [{ type: "timeout" }, 10_000], [{ type: "report", value: true }, 20_000]);
    expect(s.stage).toBe("confirmed");
  });

  it("a report that differs after a timeout keeps the timeout: it may still run", () => {
    const s = run(requestOn(), [{ type: "timeout" }, 10_000], [{ type: "report", value: false }, 20_000]);
    expect(s.stage).toBe("timed-out");
  });

  it("compares structured values by content", () => {
    const red = { r: 255, g: 0, b: 0 };
    const s = run(startCommandLifecycle({ confirmed: { r: 0, g: 0, b: 255 }, requested: red }), [{ type: "sent" }, 0], [{ type: "report", value: { r: 255, g: 0, b: 0 } }, 10]);
    expect(s.stage).toBe("confirmed");
    expect(isSameDeviceValue([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
    expect(isSameDeviceValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(isSameDeviceValue(new Date(0), new Date(0))).toBe(false);
  });
});

describe("interaction strategies", () => {
  const pending = () => run(startCommandLifecycle({ confirmed: 20, requested: 80 }), [{ type: "sent" }, 0]);

  it("confirmed is the default and draws only the reported value", () => {
    const p = presentCommandValue(pending());
    expect(p).toMatchObject({ strategy: "confirmed", value: 20, valueSource: "reported", pendingValue: 80, pending: true, indicatePending: true, rolledBack: false });
  });

  it("optimistic draws the request and tracks confirmation silently", () => {
    expect(presentCommandValue(pending(), "optimistic")).toMatchObject({ value: 80, valueSource: "requested", reportedValue: 20, indicatePending: false });
  });

  it("hybrid draws the request as a target and keeps pending visible", () => {
    expect(presentCommandValue(pending(), "hybrid")).toMatchObject({ value: 80, valueSource: "requested", reportedValue: 20, indicatePending: true });
  });

  it("on failure every strategy returns to the reported value; optimistic and hybrid report a rollback", () => {
    const failed = run(pending(), [{ type: "fail" }, 100]);
    expect(presentCommandValue(failed, "confirmed")).toMatchObject({ value: 20, rolledBack: false, pending: false });
    expect(presentCommandValue(failed, "optimistic")).toMatchObject({ value: 20, valueSource: "reported", rolledBack: true });
    expect(presentCommandValue(failed, "hybrid")).toMatchObject({ value: 20, rolledBack: true });
  });

  it("after confirmation all strategies agree", () => {
    const done = run(pending(), [{ type: "confirm" }, 100]);
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      expect(presentCommandValue(done, strategy)).toMatchObject({ value: 80, valueSource: "reported", pending: false, rolledBack: false });
    }
  });

  it("an unknown strategy falls back to confirmed, and a strategy never changes the lifecycle", () => {
    const s = pending();
    const before = JSON.stringify(s);
    expect(presentCommandValue(s, "eager" as never).strategy).toBe("confirmed");
    presentCommandValue(s, "optimistic");
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("capability-oriented devices: validation cases, no device classes", () => {
  const devices: Record<string, KinetixDeviceCapability[]> = {
    lamp: [
      { id: "power", kind: "power", role: "power" },
      { id: "brightness", kind: "level", role: "brightness", min: 0, max: 100, unit: "%" },
      { id: "color", kind: "color", role: "color" },
    ],
    speaker: [
      { id: "power", kind: "power", role: "power" },
      { id: "playback", kind: "mode", role: "media-playback", modes: [{ id: "playing", label: "Playing" }, { id: "paused", label: "Paused" }] },
      { id: "volume", kind: "level", role: "volume", min: 0, max: 100 },
      { id: "battery", kind: "telemetry", role: "battery", metric: "battery", readOnly: true },
    ],
    camera: [
      { id: "preview", kind: "media", role: "camera-preview", readOnly: true },
      { id: "live", kind: "media", role: "live-stream", readOnly: true },
      { id: "recording", kind: "power", role: "recording" },
      { id: "motion", kind: "power", role: "motion-detection" },
      { id: "privacy", kind: "power", role: "privacy" },
    ],
    doorLock: [
      { id: "lock", kind: "mode", role: "lock", modes: [{ id: "locked", label: "Locked" }, { id: "unlocked", label: "Unlocked" }] },
      { id: "battery", kind: "telemetry", role: "battery", metric: "battery", readOnly: true },
    ],
    airConditioner: [
      { id: "power", kind: "power", role: "power" },
      { id: "target", kind: "setpoint", role: "temperature-setpoint", min: 16, max: 30, step: 0.5, unit: "°C" },
      { id: "fan", kind: "level", role: "fan-speed", min: 1, max: 5 },
      { id: "humidity", kind: "telemetry", role: "humidity", metric: "humidity", readOnly: true },
      { id: "mode", kind: "mode", role: "operating-mode", modes: [{ id: "cool", label: "Cool" }, { id: "dry", label: "Dry" }] },
    ],
    irrigationValve: [
      { id: "open", kind: "power", role: "irrigation-zone" },
      { id: "flow", kind: "telemetry", metric: "flow", readOnly: true },
    ],
    soilSensor: [
      { id: "moisture", kind: "telemetry", metric: "soil-moisture", readOnly: true },
      { id: "battery", kind: "telemetry", role: "battery", metric: "battery", readOnly: true },
    ],
    infusionPump: [
      { id: "rate", kind: "setpoint", role: "infusion-rate", min: 0.1, max: 999, unit: "mL/h" },
      { id: "start", kind: "action" },
    ],
    conveyorMotor: [
      { id: "run", kind: "power", role: "power" },
      { id: "speed", kind: "level", min: 0, max: 1_500, unit: "rpm" },
    ],
  };

  it("expresses each device as data and answers support questions by id", () => {
    expect(resolveCapabilitySupport(devices.lamp, "color")).toBe("supported");
    expect(resolveCapabilitySupport(devices.camera, "live")).toBe("read-only");
    expect(resolveCapabilitySupport(devices.soilSensor, "power")).toBe("unsupported");
    expect(resolveCapabilitySupport(devices.doorLock, "brightness")).toBe("unsupported");
  });

  it("finds capabilities by role across unrelated domains", () => {
    const withBattery = Object.entries(devices)
      .filter(([, caps]) => findCapabilitiesByRole(caps, "battery").length > 0)
      .map(([name]) => name);
    expect(withBattery).toEqual(["speaker", "doorLock", "soilSensor"]);
    expect(findCapabilitiesByRole(devices.infusionPump, "infusion-rate")).toHaveLength(1);
  });

  it("a level is a level whatever it means: one lifecycle shape serves brightness and pump speed", () => {
    for (const [id, from, to] of [["brightness", 10, 70], ["speed", 0, 1_200]] as const) {
      const s = run(startCommandLifecycle({ confirmed: from, requested: to, commandId: id }), [{ type: "sent" }, 0], [{ type: "confirm", commandId: id }, 50]);
      expect(s.confirmedValue).toBe(to);
    }
  });
});

describe("battery state", () => {
  it("separates unavailable from empty, and charging from not reported", () => {
    expect(resolveBatteryState(undefined)).toEqual({ level: "unknown", available: false, charging: "unknown", low: false, critical: false });
    expect(resolveBatteryState({ percent: 4, charging: true })).toEqual({ level: "critical", available: true, charging: true, low: true, critical: true });
    expect(resolveBatteryState({ percent: 20 })).toMatchObject({ level: "low", low: true, critical: false, charging: "unknown" });
    expect(resolveBatteryState({ percent: 80, charging: false })).toMatchObject({ level: "high", low: false, charging: false });
  });
});
