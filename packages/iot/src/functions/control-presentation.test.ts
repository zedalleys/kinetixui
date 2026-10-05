import { describe, expect, it } from "vitest";
import {
  canRetryLifecycle,
  describeControlOutcome,
  resolveControlPresentation,
  startCommandLifecycle,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
  type KinetixControlPresentation,
} from "./index";

/**
 * M2A: the presentation every control reads, from one lifecycle and one strategy. The numbers in the
 * test names are the brief's minimum test list (docs/iot/IOT-MATURITY-AUDIT.md, M2A).
 *
 * Time is passed explicitly as milliseconds so every case is deterministic.
 */

function run<T>(state: KinetixCommandLifecycle<T>, ...steps: [KinetixCommandLifecycleEvent, number][]): KinetixCommandLifecycle<T> {
  let s = state;
  for (const [event, at] of steps) {
    const result = transitionCommandLifecycle(s, event, at);
    expect(result.ok, `${event.type} at ${at} should be accepted from ${s.stage}`).toBe(true);
    s = result.state;
  }
  return s;
}

const POWER = {
  formatValue: (v: unknown) => String(v),
  pendingPhrase: (v: unknown) => (v === "on" ? "Turning on" : "Turning off"),
  failedPhrase: (v: unknown) => (v === "on" ? "Could not turn on" : "Could not turn off"),
};
const PERCENT = { formatValue: (v: unknown) => `${String(v)}%` };

const turningOn = () => run(startCommandLifecycle<string>({ confirmed: "off", requested: "on", commandId: "c1" }), [{ type: "sent" }, 0]);
const view = <T,>(lifecycle: KinetixCommandLifecycle<T>, strategy?: "confirmed" | "optimistic" | "hybrid") => resolveControlPresentation({ lifecycle, strategy });

describe("strategies draw one lifecycle three ways, and none of them changes it", () => {
  it("(7) confirmed keeps the reported value while pending, and exposes the request", () => {
    const p = view(turningOn());
    expect(p).toMatchObject({ strategy: "confirmed", value: "off", valueSource: "reported", pendingValue: "on", pending: true, indicatePending: true, outcome: "pending" });
    expect(describeControlOutcome(p, POWER)).toBe("Turning on, waiting for the device.");
  });

  it("(8) optimistic shows the request immediately and makes no claim of confirmation", () => {
    const p = view(turningOn(), "optimistic");
    expect(p).toMatchObject({ value: "on", valueSource: "requested", reportedValue: "off", pending: true, indicatePending: false, outcome: "pending" });
    // Nothing is announced while it waits: the strategy chose not to mark the wait.
    expect(describeControlOutcome(p, POWER)).toBe("");
  });

  it("(9) optimistic rolls back on failure, timeout and cancel, and says so", () => {
    const failed = view(run(turningOn(), [{ type: "fail", commandId: "c1" }, 300]), "optimistic");
    expect(failed).toMatchObject({ value: "off", valueSource: "reported", rolledBack: true, unsuccessful: true, outcome: "failed" });
    expect(describeControlOutcome(failed, POWER)).toBe("Could not turn on. The device still reports off.");

    const timedOut = view(run(turningOn(), [{ type: "timeout" }, 5000]), "optimistic");
    expect(timedOut).toMatchObject({ value: "off", rolledBack: true, outcome: "timed-out" });
    expect(describeControlOutcome(timedOut, POWER)).toBe("Could not turn on: the device did not answer. It last reported off.");

    const cancelled = view(run(turningOn(), [{ type: "cancel" }, 200]), "optimistic");
    expect(cancelled).toMatchObject({ value: "off", rolledBack: true, outcome: "cancelled" });
    expect(describeControlOutcome(cancelled, POWER)).toBe("Cancelled. The device still reports off.");
  });

  it("(10) hybrid shows the request with the pending indication kept on", () => {
    const p = view(turningOn(), "hybrid");
    expect(p).toMatchObject({ value: "on", valueSource: "requested", reportedValue: "off", indicatePending: true });
    expect(describeControlOutcome(p, POWER)).toBe("Turning on, waiting for the device.");
  });

  it("confirmed does not roll back (nothing moved), but a failure is still unsuccessful and worded", () => {
    const p = view(run(turningOn(), [{ type: "fail", commandId: "c1" }, 300]));
    expect(p).toMatchObject({ value: "off", rolledBack: false, unsuccessful: true });
  });

  it("success reads as the device's own value, under every strategy", () => {
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      const p = view(run(turningOn(), [{ type: "confirm", commandId: "c1" }, 400]), strategy);
      expect(p).toMatchObject({ value: "on", valueSource: "reported", pending: false, outcome: "confirmed", unsuccessful: false });
      expect(describeControlOutcome(p, POWER)).toBe("On.");
    }
  });

  it("the strategy never changes the lifecycle it reads", () => {
    const lifecycle = turningOn();
    const before = JSON.stringify(lifecycle);
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) view(lifecycle, strategy);
    expect(JSON.stringify(lifecycle)).toBe(before);
  });
});

describe("correlation: replies and reports that arrive out of order", () => {
  it("(11) a response to a superseded request cannot confirm the current one", () => {
    const first = run(startCommandLifecycle<number>({ confirmed: 20, requested: 40, commandId: "c40" }), [{ type: "sent" }, 0]);
    const second = run(supersedeCommandLifecycle(first, 80, { commandId: "c80" }), [{ type: "sent" }, 100]);
    const late = transitionCommandLifecycle(second, { type: "confirm", value: 40, commandId: "c40" }, 300);
    expect(late.ok).toBe(false);
    expect(late.ok ? null : late.rejection.code).toBe("stale-response");
    expect(view(late.state)).toMatchObject({ value: 20, pendingValue: 80, outcome: "pending" });
  });

  it("(12) a physical-switch report updates the reported value, with no request open", () => {
    const idle = startCommandLifecycle<string>({ confirmed: "off" });
    const pressed = run(idle, [{ type: "report", value: "on", observedAt: new Date(50).toISOString() }, 60]);
    expect(view(pressed)).toMatchObject({ value: "on", valueSource: "reported", pending: false, outcome: "idle" });
  });

  it("(13) a report observed before the last accepted one cannot overwrite it", () => {
    const idle = startCommandLifecycle<string>({ confirmed: "off" });
    const newer = run(idle, [{ type: "report", value: "on", observedAt: new Date(200).toISOString() }, 210]);
    const older = transitionCommandLifecycle(newer, { type: "report", value: "off", observedAt: new Date(100).toISOString() }, 220);
    expect(older.ok ? null : older.rejection.code).toBe("stale-report");
    expect(view(older.state).value).toBe("on");
  });
});

describe("level: rapid commands", () => {
  it("(14) 20 → 40 → 80: the latest intent survives, and a late 40 never reads as a confirmed 80", () => {
    const first = run(startCommandLifecycle<number>({ confirmed: 20, requested: 40, commandId: "c40" }), [{ type: "sent" }, 0]);
    const second = run(supersedeCommandLifecycle(first, 80, { commandId: "c80" }), [{ type: "sent" }, 100]);
    expect(second.requestedValue).toBe(80);

    // The late reply for 40 is refused outright.
    const reply = transitionCommandLifecycle(second, { type: "confirm", value: 40, commandId: "c40" }, 250);
    expect(reply.ok).toBe(false);

    // A report of 40 the device made on its way up is the truth about the device, but not about 80.
    const passing = run(reply.state, [{ type: "report", value: 40, observedAt: new Date(260).toISOString() }, 270]);
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      const p = view(passing, strategy);
      expect(p.outcome).toBe("pending");
      expect(p.reportedValue).toBe(40);
      expect(p.pendingValue).toBe(80);
    }
    expect(describeControlOutcome(view(passing), PERCENT)).toBe("Changing to 80%, waiting for the device.");

    // Only the device reaching 80 confirms 80.
    const done = run(passing, [{ type: "report", value: 80, observedAt: new Date(400).toISOString() }, 410]);
    expect(view(done)).toMatchObject({ outcome: "confirmed", value: 80 });
    expect(describeControlOutcome(view(done), PERCENT)).toBe("80%.");
  });

  it("superseding keeps report ordering, so a report older than the last accepted one is still refused", () => {
    const first = run(
      startCommandLifecycle<number>({ confirmed: 20, requested: 40, commandId: "c40" }),
      [{ type: "sent" }, 0],
      [{ type: "report", value: 30, observedAt: new Date(50).toISOString() }, 60],
    );
    const second = supersedeCommandLifecycle(first, 80, { commandId: "c80" });
    expect(second).toMatchObject({ stage: "idle", confirmedValue: 30, requestedValue: 80, commandId: "c80", maxAttempts: first.maxAttempts });
    const sent = run(second, [{ type: "sent" }, 100]);
    const stale = transitionCommandLifecycle(sent, { type: "report", value: 20, observedAt: new Date(10).toISOString() }, 120);
    expect(stale.ok ? null : stale.rejection.code).toBe("stale-report");
  });
});

describe("reconnect", () => {
  const lost = () => run(turningOn(), [{ type: "deviceUnreachable", reason: "No route to the hub." }, 2000]);

  it("(17) the device returns in the requested state: confirmed, and announced as the device's value", () => {
    const back = run(lost(), [{ type: "report", value: "on", observedAt: new Date(9000).toISOString() }, 9001]);
    const p = view(back);
    expect(p).toMatchObject({ outcome: "confirmed", value: "on" });
    expect(describeControlOutcome(p, POWER)).toBe("On.");
  });

  it("(18) the device returns in a different state: failed, retryable, and worded", () => {
    const unreachable = view(lost(), "optimistic");
    expect(unreachable).toMatchObject({ outcome: "unreachable", value: "off", rolledBack: true });
    expect(describeControlOutcome(unreachable, POWER)).toBe("Could not turn on: the device is unreachable. It last reported off.");

    const back = run(lost(), [{ type: "report", value: "off", observedAt: new Date(9000).toISOString() }, 9001]);
    expect(back.stage).toBe("failed");
    expect(canRetryLifecycle(back)).toBe(true);
    const p = view(back);
    expect(p).toMatchObject({ outcome: "failed", unsuccessful: true, value: "off" });
    expect(describeControlOutcome(p, POWER)).toBe("Could not turn on. The device still reports off.");
  });
});

describe("the legacy value props go through the same rules", () => {
  it("an open request is pending; equal values are idle; null is not a value", () => {
    expect(resolveControlPresentation({ reported: "off", requested: "on" })).toMatchObject({ pending: true, value: "off", pendingValue: "on", fromLifecycle: false, outcome: "pending" });
    expect(resolveControlPresentation({ reported: "off", requested: "on", strategy: "hybrid" }).value).toBe("on");
    expect(resolveControlPresentation({ reported: 40, requested: 40 })).toMatchObject({ pending: false, outcome: "idle", value: 40 });
    expect(resolveControlPresentation({ reported: null, requested: null })).toMatchObject({ pending: false, value: undefined });
  });

  it("an unrecognised strategy falls back to confirmed rather than to a guess", () => {
    expect(resolveControlPresentation({ reported: "off", requested: "on", strategy: "eager" as never })).toMatchObject({ strategy: "confirmed", value: "off" });
  });
});

describe("describeControlOutcome", () => {
  it("(20) every unsuccessful outcome names the request and the device's value", () => {
    const base = view(turningOn());
    const said = (outcome: KinetixControlPresentation["outcome"]) => describeControlOutcome({ ...base, outcome, pending: false }, POWER);
    expect(said("idle")).toBe("");
    for (const outcome of ["failed", "timed-out", "unreachable"] as const) {
      expect(said(outcome)).toMatch(/^Could not turn on/);
      expect(said(outcome)).toMatch(/off\.$/);
    }
  });

  it("defaults to a generic sentence and says unknown rather than inventing a value", () => {
    const p = view(run(startCommandLifecycle<number>({ requested: 40 }), [{ type: "sent" }, 0], [{ type: "fail" }, 10]));
    expect(describeControlOutcome(p)).toBe("Could not change to 40. The device still reports unknown.");
  });
});
