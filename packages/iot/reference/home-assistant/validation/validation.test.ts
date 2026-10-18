import { describe, expect, it } from "vitest";
import type { Socket } from "../live-session";
import { evaluateCase, VALIDATION_CASES } from "./cases";
import { releaseGate, validateEvidenceRecord, type EvidenceRecord } from "./evidence";
import { createValidationRun, type ValidationRunOptions } from "./runner";

// Synthetic socket only. Nothing in this file is real-device evidence: every record it builds is either
// `simulation` (and so `simulation-only`), or a gate-logic fixture that is never written to disk.

const ENTITY = "light.validation_fixture";
const TOKEN = "synthetic-validation-credential";
const COMMIT = "0".repeat(40);

type FakeSocket = Socket & { sent: Record<string, unknown>[]; receive: (m: unknown) => void };

function harness(overrides: Partial<ValidationRunOptions> = {}) {
  let now = Date.parse("2026-10-11T12:00:00.000Z");
  let command = 0;
  const sockets: FakeSocket[] = [];
  const run = createValidationRun({
    source: "simulation",
    endpoint: "wss://provider.example/api/websocket",
    entityId: ENTITY,
    getToken: () => TOKEN,
    now: () => now,
    nextCommandId: () => `command-${++command}`,
    timeoutMs: 1_000,
    testDevice: ENTITY,
    device: { kind: "physical", makeModel: "Synthetic plug", firmware: "0.0.0", transport: "wifi" },
    integration: "synthetic",
    commit: COMMIT,
    node: "22",
    connect: () => {
      const socket: FakeSocket = {
        sent: [], onmessage: null, onclose: null, onerror: null,
        send(data: string) { this.sent.push(JSON.parse(data)); },
        close() {},
        receive(m: unknown) { this.onmessage?.({ data: JSON.stringify(m) }); },
      };
      sockets.push(socket);
      return socket;
    },
    ...overrides,
  });
  const socket = () => sockets.at(-1)!;
  const state = (value: string, time = now) => ({ entity_id: ENTITY, state: value, last_updated: new Date(time).toISOString() });
  let subscription: unknown;
  const ready = (value = "off", time = now) => {
    socket().receive({ type: "auth_required", ha_version: "2026.10.1" });
    socket().receive({ type: "auth_ok", ha_version: "2026.10.1" });
    subscription = socket().sent.at(-1)!.id;
    socket().receive({ type: "result", id: subscription, success: true, result: null });
    socket().receive({ type: "result", id: socket().sent.at(-1)!.id, success: true, result: [state(value, time)] });
  };
  const ack = (success = true) => {
    const call = [...socket().sent].reverse().find((m) => m.type === "call_service")!;
    socket().receive({ type: "result", id: call.id, success, result: null, error: success ? undefined : { code: "home_assistant_error", message: "synthetic" } });
  };
  const report = (value: string, time = now) =>
    socket().receive({ type: "event", id: subscription, event: { event_type: "state_changed", data: { entity_id: ENTITY, new_state: state(value, time) } } });
  /** Answers every command call not yet answered, oldest first (a provider replying late). */
  const ackAll = () => {
    for (const call of socket().sent.filter((m) => m.type === "call_service" && !answered.has(m.id))) {
      answered.add(call.id);
      socket().receive({ type: "result", id: call.id, success: true, result: null });
    }
  };
  const answered = new Set<unknown>();
  const advance = (ms: number) => { now += ms; run.session.tick(); };
  const say = (...lines: string[]) => lines.map((line) => run.handle(line));
  run.session.start();
  return { run, socket, sockets, ready, ack, ackAll, report, advance, say, now: () => now };
}

/** The full operator script, against a well-behaved synthetic provider. */
function fullRun(h: ReturnType<typeof harness>) {
  h.ready("off");
  h.advance(5);
  h.say("case H01", "observe matches", "end");
  h.say("case H02", "on"); h.advance(40); h.ack(); h.advance(300); h.report("on"); h.say("observe matches lamp lit", "end");
  h.say("case H04"); h.advance(1_000); h.report("off"); h.say("observe matches button press", "end");
  h.say("case H05", "on"); h.advance(50); h.ack(); h.advance(200); h.report("unavailable"); h.advance(1_000); h.say("observe matches", "end");
  h.say("case H06"); h.advance(500); h.report("on"); h.say("observe matches came back on", "end");
  h.say("case H07", "off"); h.advance(10); h.socket().onclose!(); h.advance(2_100); h.ready("off"); h.say("end");
  h.say("case H09", "burst"); h.ackAll(); h.advance(100); h.report("on"); h.say("observe matches", "end");
}

describe("real-device validation harness (synthetic socket — simulation only)", () => {
  it("covers every required case for the held changesets with automated criteria", () => {
    const h = harness();
    fullRun(h);
    const record = h.run.record();
    expect(record.cases.map((c) => [c.id, c.automated.outcome])).toEqual([
      ["H01", "pass"], ["H02", "pass"], ["H04", "pass"], ["H05", "pass"], ["H06", "pass"], ["H07", "pass"], ["H09", "pass"],
    ]);
    // Simulation can never be evidence, however green.
    expect(record.cases.every((c) => c.verdict === "simulation-only")).toBe(true);
    expect(validateEvidenceRecord(record, [TOKEN, ENTITY])).toEqual([]);
    expect(releaseGate([{ name: "sim.json", record }])).toMatchObject({ ready: false });
    expect(record.provider).toEqual({ name: "home-assistant", version: "2026.10.1", integration: "synthetic", endpoint: "synthetic" });
  });

  it("records the held offline wording while a request is open and the link is gone", () => {
    const h = harness();
    fullRun(h);
    const h05 = h.run.record().cases.find((c) => c.id === "H05")!;
    expect(h05.automated.checks.map((c) => c.ok)).toEqual([true, true, true, true, true]);
    expect(h05.automated.checks[2]!.detail).toBe("Device offline. The requested change is not confirmed. Showing the last known setting");
    expect(h05.automated.checks.at(-1)).toMatchObject({ name: "timeout reads may-still-apply, never failed", detail: "timed-out" });
  });

  it("refuses every device command until the entity is attested as a test device", () => {
    for (const testDevice of [undefined, "light.some_other_device"]) {
      const h = harness({ testDevice });
      h.ready();
      expect(h.say("on")[0]![0]).toMatch(/^Refused/);
      expect(h.socket().sent.some((m) => m.type === "call_service")).toBe(false);
      expect(h.run.record().device.testDeviceAttested).toBe(false);
    }
  });

  it("never sends a command on its own, including across a reconnect", () => {
    const h = harness();
    h.ready(); h.advance(10); h.socket().onclose!(); h.advance(2_000); h.ready(); h.advance(5_000);
    expect(h.sockets.flatMap((s) => s.sent).filter((m) => m.type === "call_service")).toHaveLength(0);
  });

  it("refuses observation notes and records that carry credentials or provider identifiers", () => {
    const h = harness();
    h.ready();
    h.say("case H01");
    for (const note of [TOKEN, `saw ${ENTITY}`, "via wss://provider.example", "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkw.c2lnbmF0dXJlLXN5bnRoZXRpYw"]) {
      expect(h.say(`observe matches ${note}`)[0]![0]).toMatch(/^Refused/);
    }
    h.say("end");
    const leaked = JSON.parse(JSON.stringify(h.run.record())) as EvidenceRecord;
    leaked.cases[0]!.physical.push({ at: leaked.startedAt, verdict: "matches", note: TOKEN });
    expect(validateEvidenceRecord(leaked, [TOKEN])).toContain("record contains a configured secret");
    expect(JSON.stringify(h.run.record())).not.toMatch(/synthetic-validation-credential|light\.|wss:|access_token/);
  });

  it("rejects a verdict that does not follow from its results, and a simulation dressed as hardware", () => {
    const h = harness();
    fullRun(h);
    const forged = JSON.parse(JSON.stringify(h.run.record())) as EvidenceRecord;
    forged.cases[0]!.verdict = "pass";
    expect(validateEvidenceRecord(forged).join()).toMatch(/H01: verdict pass does not follow/);
    const relabelled = { ...forged, source: "live-provider" as const };
    expect(validateEvidenceRecord(relabelled).join()).toMatch(/synthetic endpoint/);
  });

  it("opens the release gate only on passing physical-device cases from valid live-provider records", () => {
    // Gate-logic fixture: the same synthetic run built as if from a live provider. Never written to disk.
    const live = harness({ source: "live-provider" });
    fullRun(live);
    const record = live.run.record();
    record.provider.endpoint = "wss";
    expect(record.cases.every((c) => c.verdict === "pass")).toBe(true);
    expect(releaseGate([{ name: "live.json", record }])).toMatchObject({ ready: true, invalid: [] });

    const virtual = harness({ source: "live-provider", device: { kind: "virtual" } });
    fullRun(virtual);
    const provider = virtual.run.record();
    provider.provider.endpoint = "wss";
    expect(provider.cases.every((c) => c.verdict === "provider-only")).toBe(true);
    expect(releaseGate([{ name: "virtual.json", record: provider }]).ready).toBe(false);

    const unobserved = harness({ source: "live-provider" });
    unobserved.ready(); unobserved.advance(5); unobserved.say("case H01", "end");
    expect(unobserved.run.record().cases[0]!.verdict).toBe("incomplete");
  });

  it("calls a case not exercised, never passed, when the provider refuses before the link drops", () => {
    const h = harness();
    h.ready(); h.advance(5);
    h.say("case H05", "on"); h.ack(false); h.report("unavailable"); const [out] = h.say("end");
    expect(out![0]).toMatch(/^H05: simulation-only \(automated not-exercised: the provider refused the command/);
  });

  it("measures provider clock skew and only claims the M4A rule when the provider clock was behind", () => {
    // The whole provider clock runs 5 s behind: its snapshot and its report alike.
    const behind = harness();
    behind.ready("off", behind.now() - 5_000); behind.advance(5);
    behind.say("case H03", "on"); behind.ack(); behind.advance(100); behind.report("on", behind.now() - 5_000);
    behind.say("end");
    expect(behind.run.record().cases[0]!.automated).toMatchObject({ outcome: "pass", metrics: { observedMinusSentMs: -4_900 } });

    const ahead = harness();
    ahead.ready(); ahead.advance(5);
    ahead.say("case H03", "on"); ahead.ack(); ahead.advance(100); ahead.report("on");
    ahead.say("end");
    expect(ahead.run.record().cases[0]!.automated.outcome).toBe("not-exercised");
  });

  it("fails H02 when an acknowledgement is taken as confirmation, and H05 on the pre-change wording", () => {
    const h = harness();
    fullRun(h);
    const trace = h.run.record().trace;
    const window = (id: string) => {
      const start = trace.findIndex((e) => e.operator === `case ${id}`);
      return trace.slice(start, trace.findIndex((e, i) => i > start && e.operator === "end") + 1).map((e) => structuredClone(e));
    };
    const h02 = window("H02");
    const ack = h02.find((e) => e.transitions?.some((t) => t.cause === "acknowledgement"))!;
    ack.view.stage = "confirmed";
    ack.view.confirmedValue = "on";
    expect(evaluateCase("H02", h02).outcome).toBe("fail");

    const h05 = window("H05");
    for (const e of h05) if (e.view.availability === "offline") e.view.description = "Change requested, not yet confirmed by the device";
    expect(evaluateCase("H05", h05).outcome).toBe("fail");
  });

  it("documents a step list, criteria and an observation for every case", () => {
    for (const c of VALIDATION_CASES) {
      expect(c.steps.length && c.criteria.length && c.observe).toBeTruthy();
      expect(c.changesets.length).toBeGreaterThan(0);
    }
  });
});

describe("review findings (#342)", () => {
  it("does not pass H05 until the command timeout has passed", () => {
    const h = harness();
    h.ready(); h.advance(5);
    h.say("case H05", "on"); h.ack(); h.advance(100); h.report("unavailable");
    const [out] = h.say("end");
    expect(out![0]).toMatch(/not-exercised: the command timeout never passed/);
  });

  it("does not pass H09 unless a reply to a replaced request is refused as stale", () => {
    const h = harness();
    h.ready(); h.advance(5);
    h.say("case H09");
    for (const value of ["on", "off", "on"]) { h.say(value); h.ackAll(); h.advance(500); }
    h.report("on");
    const [out] = h.say("end");
    expect(out![0]).toMatch(/not-exercised: no reply to a replaced request/);
  });

  it("recomputes every case from the trace instead of trusting stored outcomes", () => {
    const h = harness();
    h.ready(); h.advance(5);
    h.say("case H05", "on"); h.ack(); h.report("unavailable"); h.say("observe matches", "end");
    const forged = JSON.parse(JSON.stringify(h.run.record())) as EvidenceRecord;
    forged.cases[0]!.automated = { outcome: "pass", checks: [], metrics: {} };
    forged.cases[0]!.verdict = "simulation-only";
    expect(validateEvidenceRecord(forged)).toContain("H05: automated result does not follow from the trace");
    const truncated = JSON.parse(JSON.stringify(h.run.record())) as EvidenceRecord;
    truncated.trace = [];
    expect(validateEvidenceRecord(truncated)).toContain("H05: case window does not match the trace");
  });
});

describe("committed evidence records", () => {
  it("are all valid live-provider records (none may be simulation)", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    // Vitest runs from the package root (jsdom gives import.meta.url a non-file scheme).
    const dir = join(process.cwd(), "reference/home-assistant/validation/records");
    expect(readdirSync(dir)).toContain("README.md");
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const record = JSON.parse(readFileSync(join(dir, name), "utf8")) as EvidenceRecord;
      expect({ name, source: record.source, errors: validateEvidenceRecord(record) }).toEqual({ name, source: "live-provider", errors: [] });
    }
  });
});
