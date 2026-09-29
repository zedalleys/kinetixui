import { describe, expect, it } from "vitest";
import {
  advanceCommandLifecycle,
  canRetryLifecycle,
  describeCommandLifecycle,
  describeLifecycleStage,
  isLifecyclePending,
  isLifecycleSettled,
  isLifecycleTimedOut,
  lifecycleToCommandStatus,
  lifecycleToControlPhase,
  resolveControlState,
  startCommandLifecycle,
  transitionCommandLifecycle,
  KINETIX_COMMAND_LIFECYCLE_STAGES,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
} from "./index";

const T0 = "2026-09-27T12:00:00.000Z";
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const onOff = (v: unknown) => (v === true ? "on" : v === false ? "off" : String(v));

describe("command lifecycle", () => {
  it("represents OFF → TURNING ON → TIMEOUT → UNREACHABLE → RETRY exactly", () => {
    const labels: string[] = [];
    let s: KinetixCommandLifecycle<boolean> = startCommandLifecycle({ confirmed: false, requested: true });
    labels.push(describeLifecycleStage(s.stage)); // OFF: nothing requested yet
    expect(describeCommandLifecycle(s, { formatValue: onOff })).toMatch(/reports off/);

    s = advanceCommandLifecycle(s, { type: "sent" }, T0);
    expect(s.stage).toBe("requested"); // TURNING ON
    expect(s.confirmedValue).toBe(false);
    s = advanceCommandLifecycle(s, { type: "timeout" }, at(10_000));
    expect(s.stage).toBe("timed-out"); // TIMEOUT
    s = advanceCommandLifecycle(s, { type: "deviceUnreachable", reason: "No route to device." }, at(11_000));
    expect(s.stage).toBe("unreachable"); // UNREACHABLE
    s = advanceCommandLifecycle(s, { type: "retry" }, at(20_000));
    expect(s.stage).toBe("retrying"); // RETRY
    expect(s.attempts).toBe(2);
    expect(s.confirmedValue).toBe(false); // never flipped along the way
    expect(s.sentAt).toBe(at(20_000));
    expect(s.settledAt).toBeUndefined();
    expect(labels).toEqual(["Idle"]);
  });

  it("never treats acknowledged as confirmed", () => {
    let s = startCommandLifecycle({ confirmed: "off", requested: "on" });
    s = advanceCommandLifecycle(advanceCommandLifecycle(s, { type: "sent" }, T0), { type: "acknowledge" }, at(1));
    expect(s.stage).toBe("acknowledged");
    expect(s.confirmedValue).toBe("off");
    expect(lifecycleToCommandStatus(s)).toBe("acknowledged");
    expect(lifecycleToControlPhase(s)).toBe("requested");
    expect(resolveControlState({ deviceStatus: "online", lifecycle: s })).toMatchObject({ phase: "requested", availability: "pending", interactive: false });
  });

  it("only a confirm changes the confirmed value, and the device's own value wins", () => {
    let s = startCommandLifecycle({ confirmed: 20, requested: 100 });
    s = advanceCommandLifecycle(s, { type: "sent" }, T0);
    s = advanceCommandLifecycle(s, { type: "confirm", value: 80 }, at(5));
    expect(s).toMatchObject({ stage: "confirmed", confirmedValue: 80, requestedValue: 100, settledAt: at(5) });
    expect(describeCommandLifecycle(s)).toBe("Confirmed: the device reports 80.");
  });

  it("confirm without a value confirms the requested one", () => {
    const s = advanceCommandLifecycle(advanceCommandLifecycle(startCommandLifecycle({ confirmed: false, requested: true }), { type: "sent" }, T0), { type: "confirm" }, T0);
    expect(s.confirmedValue).toBe(true);
  });

  it("accepts a late confirmation after timeout or unreachable, because the device's word is the truth", () => {
    let s = startCommandLifecycle({ confirmed: false, requested: true });
    s = advanceCommandLifecycle(s, { type: "sent" }, T0);
    s = advanceCommandLifecycle(s, { type: "timeout" }, at(1));
    expect(advanceCommandLifecycle(s, { type: "confirm" }, at(2)).stage).toBe("confirmed");
    const u = advanceCommandLifecycle(s, { type: "deviceUnreachable" }, at(2));
    expect(advanceCommandLifecycle(u, { type: "confirm" }, at(3)).stage).toBe("confirmed");
  });

  describe("illegal transitions", () => {
    const events: KinetixCommandLifecycleEvent[] = [
      { type: "sent" },
      { type: "acknowledge" },
      { type: "confirm" },
      { type: "fail" },
      { type: "timeout" },
      { type: "deviceUnreachable" },
      { type: "retry" },
      { type: "cancel" },
    ];
    const at1 = (stage: string): KinetixCommandLifecycle => ({ ...startCommandLifecycle(), stage: stage as never, attempts: 1 });

    it("rejects with the same state object and never throws", () => {
      const idle = startCommandLifecycle();
      for (const e of events.filter((e) => e.type !== "sent")) {
        const r = transitionCommandLifecycle(idle, e, T0);
        expect(r.ok).toBe(false);
        expect(r.state).toBe(idle);
        expect(advanceCommandLifecycle(idle, e, T0)).toBe(idle);
      }
    });

    it("treats confirmed and cancelled as terminal", () => {
      for (const stage of ["confirmed", "cancelled"]) {
        const s = at1(stage);
        for (const e of events) expect(advanceCommandLifecycle(s, e, T0)).toBe(s);
      }
    });

    it("cannot skip straight to confirmed from idle or acknowledge after a timeout", () => {
      expect(transitionCommandLifecycle(startCommandLifecycle(), { type: "confirm" }, T0).ok).toBe(false);
      expect(transitionCommandLifecycle(at1("timed-out"), { type: "acknowledge" }, T0).ok).toBe(false);
      expect(transitionCommandLifecycle(at1("requested"), { type: "sent" }, T0).ok).toBe(false);
      expect(transitionCommandLifecycle(at1("failed"), { type: "confirm" }, T0).ok).toBe(false);
    });

    it("refuses retry once attempts reach the maximum, with its own code", () => {
      let s = startCommandLifecycle({ maxAttempts: 2 });
      s = advanceCommandLifecycle(s, { type: "sent" }, T0);
      s = advanceCommandLifecycle(s, { type: "timeout" }, T0);
      expect(canRetryLifecycle(s)).toBe(true);
      s = advanceCommandLifecycle(s, { type: "retry" }, T0);
      s = advanceCommandLifecycle(s, { type: "timeout" }, T0);
      expect(canRetryLifecycle(s)).toBe(false);
      const r = transitionCommandLifecycle(s, { type: "retry" }, T0);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.rejection.code).toBe("max-attempts");
    });

    it("survives a garbage event", () => {
      const s = startCommandLifecycle();
      expect(advanceCommandLifecycle(s, null as never, T0)).toBe(s);
      expect(advanceCommandLifecycle(s, { type: "explode" } as never, T0)).toBe(s);
    });
  });

  it("does not mutate its input and is deterministic", () => {
    const s0 = startCommandLifecycle({ confirmed: 1, requested: 2 });
    const frozen = Object.freeze({ ...s0 });
    const a = advanceCommandLifecycle(frozen, { type: "sent" }, T0);
    const b = advanceCommandLifecycle(frozen, { type: "sent" }, T0);
    expect(a).toEqual(b);
    expect(frozen.stage).toBe("idle");
  });

  it("clears the old ack and reason on retry, and records reasons on failure", () => {
    let s = startCommandLifecycle();
    s = advanceCommandLifecycle(s, { type: "sent" }, T0);
    s = advanceCommandLifecycle(s, { type: "acknowledge" }, at(1));
    s = advanceCommandLifecycle(s, { type: "fail", reason: "Rejected." }, at(2));
    expect(s).toMatchObject({ stage: "failed", reason: "Rejected.", settledAt: at(2), ackAt: at(1) });
    s = advanceCommandLifecycle(s, { type: "retry" }, at(3));
    expect(s.ackAt).toBeUndefined();
    expect(s.reason).toBeUndefined();
  });

  it("clamps a bad maxAttempts to the default", () => {
    for (const bad of [0, -1, NaN, Infinity]) expect(startCommandLifecycle({ maxAttempts: bad }).maxAttempts).toBe(3);
    expect(startCommandLifecycle({ maxAttempts: 5.9 }).maxAttempts).toBe(5);
  });

  describe("isLifecycleTimedOut", () => {
    const sent = advanceCommandLifecycle(startCommandLifecycle(), { type: "sent" }, T0);
    it("measures from the latest send", () => {
      expect(isLifecycleTimedOut(sent, at(9_999), 10_000)).toBe(false);
      expect(isLifecycleTimedOut(sent, at(10_001), 10_000)).toBe(true);
      const retried = advanceCommandLifecycle(advanceCommandLifecycle(sent, { type: "timeout" }, at(10_001)), { type: "retry" }, at(20_000));
      expect(isLifecycleTimedOut(retried, at(25_000), 10_000)).toBe(false);
    });
    it("is true once declared, false when idle or settled, and false for a bad timeout", () => {
      expect(isLifecycleTimedOut(advanceCommandLifecycle(sent, { type: "timeout" }, T0), T0, 1)).toBe(true);
      expect(isLifecycleTimedOut(startCommandLifecycle(), at(1e9), 1)).toBe(false);
      expect(isLifecycleTimedOut(advanceCommandLifecycle(sent, { type: "confirm" }, T0), at(1e9), 1)).toBe(false);
      for (const bad of [0, -5, NaN, Infinity]) expect(isLifecycleTimedOut(sent, at(1e9), bad)).toBe(false);
    });
  });

  describe("describeCommandLifecycle never claims the request is the device's state before confirmation", () => {
    it("names the requested value as requested and the confirmed one as last reported", () => {
      const base = startCommandLifecycle({ confirmed: false, requested: true, maxAttempts: 3 });
      const sent = advanceCommandLifecycle(base, { type: "sent" }, T0);
      const stages: KinetixCommandLifecycle<boolean>[] = [
        sent,
        advanceCommandLifecycle(sent, { type: "acknowledge" }, T0),
        advanceCommandLifecycle(sent, { type: "fail", reason: "Refused." }, T0),
        advanceCommandLifecycle(sent, { type: "timeout" }, T0),
        advanceCommandLifecycle(sent, { type: "deviceUnreachable" }, T0),
        advanceCommandLifecycle(advanceCommandLifecycle(sent, { type: "timeout" }, T0), { type: "retry" }, T0),
        advanceCommandLifecycle(sent, { type: "cancel" }, T0),
      ];
      for (const s of stages) {
        const text = describeCommandLifecycle(s, { formatValue: onOff });
        expect(text, s.stage).not.toMatch(/the device (is|reports) on/i);
        expect(text, s.stage).not.toMatch(/^Confirmed/);
        expect(text, s.stage).toMatch(/off/); // the confirmed value is always present
        expect(text, s.stage).toMatch(/on/);
      }
      expect(describeCommandLifecycle(stages[5]!, { formatValue: onOff })).toContain("attempt 2 of 3");
      expect(describeCommandLifecycle(stages[2]!, { formatValue: onOff })).toContain("Refused.");
    });
    it("handles missing values", () => {
      expect(describeCommandLifecycle(startCommandLifecycle())).toBe("No change requested. The device reports unknown.");
    });
  });

  describe("mappers", () => {
    it("maps every stage, and only confirmed reaches completed/confirmed", () => {
      const table = {
        idle: [null, "idle"],
        requested: ["sent", "requested"],
        acknowledged: ["acknowledged", "requested"],
        confirmed: ["completed", "confirmed"],
        failed: ["failed", "failed"],
        "timed-out": ["expired", "failed"],
        unreachable: ["failed", "failed"],
        retrying: ["sent", "requested"],
        cancelled: ["cancelled", "idle"],
      } as const;
      expect(Object.keys(table).sort()).toEqual([...KINETIX_COMMAND_LIFECYCLE_STAGES].sort());
      for (const [stage, [status, phase]] of Object.entries(table)) {
        expect(lifecycleToCommandStatus({ stage: stage as never })).toBe(status);
        expect(lifecycleToControlPhase({ stage: stage as never })).toBe(phase);
        if (stage !== "confirmed") {
          expect(status).not.toBe("completed");
          expect(phase).not.toBe("confirmed");
        }
      }
    });
    it("resolveControlState accepts a lifecycle, but an explicit commandStatus wins and old inputs are unchanged", () => {
      const s = advanceCommandLifecycle(startCommandLifecycle(), { type: "sent" }, T0);
      expect(resolveControlState({ deviceStatus: "online", lifecycle: s }).phase).toBe("requested");
      expect(resolveControlState({ deviceStatus: "online", lifecycle: s, commandStatus: "completed" }).phase).toBe("confirmed");
      expect(resolveControlState({ deviceStatus: "online", lifecycle: startCommandLifecycle() }).phase).toBe("idle");
      const timedOut = advanceCommandLifecycle(s, { type: "timeout" }, T0);
      expect(resolveControlState({ deviceStatus: "online", lifecycle: timedOut })).toMatchObject({ phase: "failed", interactive: true });
      expect(resolveControlState({ deviceStatus: "online", commandStatus: "sent" }).phase).toBe("requested");
    });
    it("pending and settled predicates partition the stages", () => {
      for (const stage of KINETIX_COMMAND_LIFECYCLE_STAGES) {
        const p = isLifecyclePending({ stage });
        const d = isLifecycleSettled({ stage });
        expect(p && d).toBe(false);
        expect(p || d || stage === "idle").toBe(true);
      }
    });
  });
});
