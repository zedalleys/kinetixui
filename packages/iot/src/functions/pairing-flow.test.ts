import { describe, expect, it } from "vitest";
import {
  KINETIX_PAIRING_FAILURES,
  KINETIX_PAIRING_METHODS,
  KINETIX_PAIRING_STAGES,
  advancePairing,
  describePairingFailure,
  describePairingMethod,
  describePairingStage,
  getPairingFailure,
  getPairingProgress,
  getPairingRecovery,
  normalizePairingCode,
  pairingFlowSteps,
  pairingFlowToStatus,
  startPairingFlow,
  transitionPairing,
  validatePairingCode,
  type KinetixPairingEvent,
  type KinetixPairingFailureCode,
  type KinetixPairingFlowState,
} from "./index";

const run = (events: KinetixPairingEvent[], from = startPairingFlow()): KinetixPairingFlowState => events.reduce(advancePairing, from);
const started = run([{ type: "start", method: "qr" }]);
const NEXT: KinetixPairingEvent = { type: "next" };
const ALL_CODES: KinetixPairingFailureCode[] = [
  "permission-denied", "device-not-found", "timeout", "already-owned", "unsupported-device", "unsupported-firmware",
  "authentication-failed", "weak-signal", "wrong-network", "connection-lost", "firmware-update-required",
  "partial-provisioning", "verification-failed",
];

describe("pairing vocabulary", () => {
  it("has the stages and methods in order", () => {
    expect(KINETIX_PAIRING_STAGES).toEqual(["discover", "identify", "authenticate", "configure", "assign", "verify", "complete"]);
    expect(KINETIX_PAIRING_METHODS).toEqual(["bluetooth", "network", "qr", "manual-code", "cloud"]);
    for (const s of KINETIX_PAIRING_STAGES) expect(describePairingStage(s).length).toBeGreaterThan(0);
    for (const m of KINETIX_PAIRING_METHODS) expect(describePairingMethod(m).length).toBeGreaterThan(0);
  });
});

describe("failure registry", () => {
  it("covers every code with a title, description, recovery and a stage", () => {
    expect(Object.keys(KINETIX_PAIRING_FAILURES).sort()).toEqual([...ALL_CODES].sort());
    for (const code of ALL_CODES) {
      const f = KINETIX_PAIRING_FAILURES[code];
      expect(f.code).toBe(code);
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
      expect(KINETIX_PAIRING_STAGES).toContain(f.stage);
      expect(f.recovery.length).toBeGreaterThan(0);
      expect(f.recovery.some((r) => r.kind === "cancel"), `${code} can always be cancelled`).toBe(true);
      expect(new Set(f.recovery.map((r) => r.id)).size).toBe(f.recovery.length);
      // A retryable failure offers retry; a non-retryable one does not pretend to.
      expect(f.recovery.some((r) => r.kind === "retry"), code).toBe(f.retryable);
    }
  });
  it("marks partial-state failures for cleanup and the rest not", () => {
    const dirty = ALL_CODES.filter((c) => KINETIX_PAIRING_FAILURES[c].needsCleanup).sort();
    expect(dirty).toEqual(["connection-lost", "partial-provisioning", "verification-failed"]);
  });
  it("offers the right kind of recovery where it matters", () => {
    const kinds = (c: KinetixPairingFailureCode) => getPairingRecovery(c).map((r) => r.kind);
    expect(kinds("permission-denied")).toContain("settings");
    expect(kinds("wrong-network")).toContain("settings");
    expect(kinds("firmware-update-required")).toContain("update");
    expect(kinds("unsupported-firmware")).toContain("update");
    expect(kinds("already-owned")).toContain("reset");
    expect(kinds("unsupported-device")).toContain("contact");
    expect(kinds("authentication-failed")).toContain("back");
    expect(KINETIX_PAIRING_FAILURES["already-owned"].retryable).toBe(false);
  });
  it("makes no diagnosis in its copy", () => {
    for (const c of ALL_CODES) expect(KINETIX_PAIRING_FAILURES[c].description).not.toMatch(/because|probably|likely|caused/i);
  });
  it("describes failures and falls back gracefully for unknown codes", () => {
    expect(describePairingFailure("device-not-found")).toBe("Device not found. No device was found to set up.");
    expect(describePairingFailure("nonsense")).toBe("Setup failed. Setup did not finish.");
    expect(getPairingFailure(null).retryable).toBe(true);
    expect(getPairingFailure("__proto__").title).toBe("Setup failed");
    expect(getPairingRecovery(undefined).map((r) => r.kind)).toEqual(["retry", "cancel"]);
  });
});

describe("advancePairing", () => {
  it("walks the happy path discover → … → complete", () => {
    const seen: string[] = [started.stage];
    let s = started;
    while (s.status === "active") {
      s = advancePairing(s, NEXT);
      seen.push(s.stage);
    }
    expect(seen).toEqual([...KINETIX_PAIRING_STAGES]);
    expect(s).toMatchObject({ status: "complete", stage: "complete", method: "qr" });
  });
  it("starts only from idle and only with a real method", () => {
    expect(startPairingFlow()).toEqual({ status: "idle", stage: "discover", needsCleanup: false, retries: 0 });
    expect(advancePairing(startPairingFlow(), NEXT)).toEqual(startPairingFlow());
    expect(transitionPairing(started, { type: "start", method: "bluetooth" }).ok).toBe(false);
    expect(transitionPairing(startPairingFlow(), { type: "start", method: "carrier-pigeon" as never }).ok).toBe(false);
  });
  it("goes back one stage, but not from the first, and not from idle", () => {
    const at2 = run([NEXT, NEXT], started);
    expect(advancePairing(at2, { type: "back" }).stage).toBe("identify");
    expect(transitionPairing(started, { type: "back" }).ok).toBe(false);
    expect(transitionPairing(startPairingFlow(), { type: "back" }).ok).toBe(false);
  });
  it("records a failure, and retry re-enters the same stage with a count", () => {
    const failed = run([NEXT, { type: "fail", code: "timeout" }], started);
    expect(failed).toMatchObject({ status: "failed", stage: "identify", failure: "timeout", needsCleanup: false });
    const retried = advancePairing(failed, { type: "retry" });
    expect(retried).toMatchObject({ status: "active", stage: "identify", retries: 1 });
    expect(retried.failure).toBeUndefined();
    expect(advancePairing(advancePairing(retried, { type: "fail", code: "timeout" }), { type: "retry" }).retries).toBe(2);
    expect(advancePairing(retried, NEXT).retries).toBe(0);
  });
  it("carries needsCleanup for partial-state failures until the flow moves on", () => {
    const failed = run([NEXT, NEXT, NEXT, { type: "fail", code: "partial-provisioning" }], started);
    expect(failed.needsCleanup).toBe(true);
    expect(advancePairing(failed, { type: "retry" }).needsCleanup).toBe(true);
  });
  it("refuses retry for a non-retryable failure, with a typed reason", () => {
    const failed = run([NEXT, { type: "fail", code: "already-owned" }], started);
    const r = transitionPairing(failed, { type: "retry" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rejection.code).toBe("not-retryable");
    expect(r.state).toBe(failed);
  });
  it("goes back from a failure to the stage before it, clearing the failure", () => {
    const failed = run([NEXT, NEXT, { type: "fail", code: "authentication-failed" }], started);
    expect(failed.stage).toBe("authenticate");
    expect(advancePairing(failed, { type: "back" })).toMatchObject({ status: "active", stage: "identify" });
    expect(advancePairing(advancePairing(failed, { type: "back" }), { type: "back" }).stage).toBe("discover");
    expect(transitionPairing(run([{ type: "fail", code: "device-not-found" }], started), { type: "back" }).ok).toBe(false);
  });
  it("cancels an active or failed flow, and cancelled and complete are terminal", () => {
    expect(advancePairing(started, { type: "cancel" }).status).toBe("cancelled");
    expect(advancePairing(run([{ type: "fail", code: "timeout" }], started), { type: "cancel" }).status).toBe("cancelled");
    const cancelled = advancePairing(started, { type: "cancel" });
    const complete = run(Array(6).fill(NEXT), started);
    expect(complete.status).toBe("complete");
    for (const t of [cancelled, complete]) {
      for (const e of [NEXT, { type: "back" }, { type: "cancel" }, { type: "retry" }, { type: "fail", code: "timeout" }, { type: "start", method: "qr" }] as KinetixPairingEvent[]) {
        expect(transitionPairing(t, e).ok, `${t.status} ${e.type}`).toBe(false);
        expect(advancePairing(t, e)).toBe(t);
      }
    }
  });
  it("rejects a fail or retry in the wrong status, and garbage events, without throwing", () => {
    expect(transitionPairing(startPairingFlow(), { type: "fail", code: "timeout" }).ok).toBe(false);
    expect(transitionPairing(started, { type: "retry" }).ok).toBe(false);
    expect(advancePairing(started, null as never)).toBe(started);
    expect(advancePairing(started, { type: "teleport" } as never)).toBe(started);
  });
  it("is pure and deterministic", () => {
    const frozen = Object.freeze({ ...started });
    expect(advancePairing(frozen, NEXT)).toEqual(advancePairing(frozen, NEXT));
    expect(frozen.stage).toBe("discover");
  });
  it("accepts every failure code from an active flow", () => {
    for (const code of ALL_CODES) expect(advancePairing(started, { type: "fail", code }).failure).toBe(code);
  });
});

describe("existing pairing behaviour and bridges", () => {
  it("preserves getPairingProgress and validatePairingCode", () => {
    expect(getPairingProgress([{ id: "a", label: "A", status: "complete" }, { id: "b", label: "B", status: "active" }])).toMatchObject({ completed: 1, total: 2, ratio: 0.5 });
    expect(getPairingProgress(null).ratio).toBe(0);
    expect(normalizePairingCode("a1b-2c3")).toBe("A1B2C3");
    expect(validatePairingCode("a1b-2c3")).toBe(true);
    expect(validatePairingCode("12345", { digitsOnly: true, length: 5 })).toBe(true);
    expect(validatePairingCode("12ab", { digitsOnly: true, length: 4 })).toBe(false);
  });
  it("projects the flow onto steps that getPairingProgress understands", () => {
    const steps = pairingFlowSteps(run([NEXT, NEXT], started));
    expect(steps.map((s) => s.id)).toEqual(["discover", "identify", "authenticate", "configure", "assign", "verify"]);
    expect(steps.map((s) => s.status)).toEqual(["complete", "complete", "active", "pending", "pending", "pending"]);
    expect(getPairingProgress(steps)).toMatchObject({ completed: 2, total: 6, hasError: false });
    const failed = pairingFlowSteps(run([NEXT, { type: "fail", code: "timeout" }], started));
    expect(getPairingProgress(failed).hasError).toBe(true);
    expect(pairingFlowSteps(startPairingFlow()).every((s) => s.status !== "active")).toBe(true);
    expect(pairingFlowSteps(run(Array(6).fill(NEXT), started)).every((s) => s.status === "complete")).toBe(true);
  });
  it("maps to the older KinetixPairingStatus", () => {
    expect(pairingFlowToStatus(startPairingFlow())).toBe("idle");
    expect(pairingFlowToStatus(started)).toBe("scanning");
    expect(pairingFlowToStatus(run([NEXT], started))).toBe("found");
    expect(pairingFlowToStatus(run([NEXT, NEXT], started))).toBe("authenticating");
    expect(pairingFlowToStatus(run([NEXT, NEXT, NEXT], started))).toBe("connecting");
    expect(pairingFlowToStatus(run(Array(6).fill(NEXT), started))).toBe("paired");
    expect(pairingFlowToStatus(run([{ type: "fail", code: "timeout" }], started))).toBe("failed");
    expect(pairingFlowToStatus(run([{ type: "cancel" }], started))).toBe("cancelled");
  });
});
