import { describe, expect, it } from "vitest";
import {
  advanceCommandLifecycle,
  isLifecycleAdjusted,
  presentCommandValue,
  startCommandLifecycle,
  summarizeDeviceState,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
  type KinetixDeviceState,
} from "./index";

/**
 * M4A: lifecycle edges that real devices reach and simulations do not (RFC probes P1, P2, P4, P5).
 *
 * A simulated device shares the application's clock, ids and timers. A real one has its own clock,
 * answers commands the user has already replaced, rounds what it was asked for, and is reported in
 * fresh objects on every snapshot. Each block reproduces one of those and pins the behaviour.
 */

const at = (ms: number) => new Date(ms).toISOString();

function run<T>(state: KinetixCommandLifecycle<T>, ...steps: [KinetixCommandLifecycleEvent, number][]): KinetixCommandLifecycle<T> {
  let s = state;
  for (const [event, now] of steps) {
    const result = transitionCommandLifecycle(s, event, now);
    if (!result.ok) throw new Error(`${event.type} refused from ${s.stage}: ${result.rejection.code}`);
    s = result.state;
  }
  return s;
}

/** Request 22 at app time 10s, correlated as `a`. */
const sentAt10s = () => run(startCommandLifecycle<number>({ confirmed: 20, requested: 22, commandId: "a" }), [{ type: "sent", commandId: "a" }, 10_000]);

describe("P1: a device clock behind the application's", () => {
  it("settles the request when the report was received after the send, whatever the device's clock says", () => {
    // The device applied 22 one second after the send, but its clock is four seconds behind ours.
    const r = transitionCommandLifecycle(sentAt10s(), { type: "report", value: 22, observedAt: at(7_000), receivedAt: at(11_000) }, 11_000);
    expect(r.ok).toBe(true);
    expect(r.state.stage).toBe("confirmed");
    expect(r.state.confirmedValue).toBe(22);
    // Ordering keeps the device's own clock: the next report is compared against 7s, not 11s.
    expect(r.state.reportedAt).toBe(at(7_000));
  });

  it("still refuses to settle on a report the application received before it sent", () => {
    const r = transitionCommandLifecycle(sentAt10s(), { type: "report", value: 22, observedAt: at(9_000), receivedAt: at(9_500) }, 11_000);
    expect(r.ok).toBe(true);
    expect(r.state.stage).toBe("requested");
    expect(r.state.confirmedValue).toBe(22);
  });

  it("keeps stale-report protection on the device's clock when receivedAt is newer", () => {
    const first = run(sentAt10s(), [{ type: "report", value: 21, observedAt: at(8_000), receivedAt: at(10_500) }, 10_500]);
    const late = transitionCommandLifecycle(first, { type: "report", value: 22, observedAt: at(7_500), receivedAt: at(11_000) }, 11_000);
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.rejection.code).toBe("stale-report");
    expect(late.state).toBe(first);
  });

  it("without receivedAt, the existing rule is unchanged: an observation stamped before the send never settles", () => {
    const r = transitionCommandLifecycle(sentAt10s(), { type: "report", value: 22, observedAt: at(7_000) }, 11_000);
    expect(r.state.stage).toBe("requested");
  });

  it("an unreadable receivedAt is ignored rather than trusted", () => {
    const r = transitionCommandLifecycle(sentAt10s(), { type: "report", value: 22, observedAt: at(7_000), receivedAt: "not a time" }, 11_000);
    expect(r.state.stage).toBe("requested");
  });
});

describe("P2: a timeout belongs to the request it was started for", () => {
  /** `a` sent at 0, replaced by `b` sent at 100. */
  const replaced = () => {
    const a = run(startCommandLifecycle<number>({ confirmed: 20, requested: 21, commandId: "a" }), [{ type: "sent", commandId: "a" }, 0]);
    return run(supersedeCommandLifecycle(a, 22, { commandId: "b" }), [{ type: "sent", commandId: "b" }, 100]);
  };

  it("a timeout for a superseded request is refused as stale-response, and the current one stays pending", () => {
    const b = replaced();
    const r = transitionCommandLifecycle(b, { type: "timeout", commandId: "a" }, 8_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.code).toBe("stale-response");
    expect(r.state).toBe(b);
    expect(presentCommandValue(r.state, "hybrid").pending).toBe(true);
  });

  it("a timeout naming another request than the current one is refused, as a response would be", () => {
    const r = transitionCommandLifecycle(sentAt10s(), { type: "timeout", commandId: "z" }, 20_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.code).toBe("stale-response");
  });

  it("a timeout for the current request times it out, with its reason and code", () => {
    const r = transitionCommandLifecycle(replaced(), { type: "timeout", commandId: "b", code: "gateway-timeout" }, 8_100);
    expect(r.ok).toBe(true);
    expect(r.state.stage).toBe("timed-out");
    expect(r.state.reasonCode).toBe("gateway-timeout");
  });

  it("an uncorrelated timeout keeps its previous behaviour", () => {
    expect(advanceCommandLifecycle(replaced(), { type: "timeout" }, 8_000).stage).toBe("timed-out");
  });

  it("a late confirm for the superseded request is still refused (M1 guarantee unchanged)", () => {
    const r = transitionCommandLifecycle(replaced(), { type: "confirm", value: 21, commandId: "a" }, 200);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.code).toBe("stale-response");
  });
});

describe("P4: a confirmation the device adjusted", () => {
  const pending = () => run(startCommandLifecycle<number>({ confirmed: 20, requested: 22 }), [{ type: "sent" }, 0]);

  it("is recognisable when the device confirms a value other than the request", () => {
    const s = run(pending(), [{ type: "confirm", value: 21.5 }, 500]);
    expect(s.stage).toBe("confirmed");
    expect(s.confirmedValue).toBe(21.5);
    expect(s.requestedValue).toBe(22);
    expect(s.adjustedValue).toBe(21.5);
    expect(isLifecycleAdjusted(s)).toBe(true);
  });

  it("is not claimed for an exact confirmation, by value or by default", () => {
    expect(isLifecycleAdjusted(run(pending(), [{ type: "confirm", value: 22 }, 500]))).toBe(false);
    expect(isLifecycleAdjusted(run(pending(), [{ type: "confirm" }, 500]))).toBe(false);
  });

  it("compares structured values by content", () => {
    const red = { mode: "rgb", r: 255, g: 0, b: 0 };
    const s = run(startCommandLifecycle<object>({ requested: red }), [{ type: "sent" }, 0], [{ type: "confirm", value: { ...red } }, 1]);
    expect(isLifecycleAdjusted(s)).toBe(false);
  });

  it("is not claimed when an unrelated report later moves a confirmed value", () => {
    const s = run(pending(), [{ type: "report", value: 22, observedAt: at(300) }, 300], [{ type: "report", value: 19, observedAt: at(900) }, 900]);
    expect(s.stage).toBe("confirmed");
    expect(s.confirmedValue).toBe(19);
    expect(isLifecycleAdjusted(s)).toBe(false);
  });

  it("is not claimed for a differing report while the request is open: that is not a confirmation", () => {
    const s = run(pending(), [{ type: "report", value: 21.5, observedAt: at(300) }, 300]);
    expect(s.stage).toBe("requested");
    expect(isLifecycleAdjusted(s)).toBe(false);
  });

  it("describes how the request settled, so a later physical change does not erase it", () => {
    const s = run(pending(), [{ type: "confirm", value: 21.5 }, 500], [{ type: "report", value: 19, observedAt: at(900) }, 900]);
    expect(s.confirmedValue).toBe(19);
    expect(s.adjustedValue).toBe(21.5);
    expect(isLifecycleAdjusted(s)).toBe(true);
  });

  it("does not carry into the next request", () => {
    const adjusted = run(pending(), [{ type: "confirm", value: 21.5 }, 500]);
    const next = supersedeCommandLifecycle(adjusted, 23);
    expect(next.adjustedValue).toBeUndefined();
    expect(isLifecycleAdjusted(next)).toBe(false);
  });

  it("changes nothing a strategy draws", () => {
    const s = run(pending(), [{ type: "confirm", value: 21.5 }, 500]);
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      const p = presentCommandValue(s, strategy);
      expect(p.value, strategy).toBe(21.5);
      expect(p.rolledBack, strategy).toBe(false);
    }
  });
});

describe("P5: summarizeDeviceState compares values by content", () => {
  const base = (confirmedValues: Record<string, unknown>, requestedValues: Record<string, unknown>): KinetixDeviceState => ({
    device: { id: "lamp-1", name: "Lamp", type: "light", status: "online" },
    connectivity: { state: "online" },
    health: { level: "healthy", reasons: [], faults: [] },
    capabilities: [],
    confirmedValues,
    requestedValues,
    pendingCommands: [],
    faults: [],
    alerts: [],
  });

  it("a requested colour equal to the reported one is not unconfirmed, though they are different objects", () => {
    const s = summarizeDeviceState(base({ color: { mode: "rgb", r: 1, g: 2, b: 3 } }, { color: { mode: "rgb", r: 1, g: 2, b: 3 } }));
    expect(s.unconfirmed).toEqual([]);
    expect(s.description).not.toMatch(/requested but not confirmed/);
  });

  it("a requested colour that differs is still unconfirmed", () => {
    const s = summarizeDeviceState(base({ color: { mode: "rgb", r: 1, g: 2, b: 3 } }, { color: { mode: "temperature", kelvin: 2700 } }));
    expect(s.unconfirmed).toEqual(["color"]);
  });

  it("primitives behave as before", () => {
    const s = summarizeDeviceState(base({ power: true, level: 40, mode: "eco" }, { power: true, level: 60, mode: "eco" }));
    expect(s.unconfirmed).toEqual(["level"]);
  });
});
