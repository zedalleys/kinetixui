/**
 * Operator-driven validation run: the live session (#325), a trace recorder, the case catalogue and the
 * evidence record, behind a line-based command interface. `validation-runner.mjs` wires it to a native
 * WebSocket, stdin and the file system; tests wire it to the synthetic socket and mark it `simulation`.
 *
 * Safety: no device command is sent unless the operator named the configured entity as a dedicated test
 * device (`testDevice` must equal `entityId`), and none is sent automatically, ever.
 */
import { createLiveSession, type Socket } from "../live-session";
import { VALIDATION_CASES, evaluateCase, findCase } from "./cases";
import { EVIDENCE_SCHEMA, caseVerdict, findSensitive, validateEvidenceRecord, type CaseRecord, type EvidenceRecord, type EvidenceSource, type PhysicalObservation } from "./evidence";
import { createTraceRecorder } from "./trace";

export const VALIDATION_DEVICE = "validation-device";

export type ValidationRunOptions = {
  source: EvidenceSource;
  endpoint: string;
  allowLoopback?: boolean;
  entityId: string;
  getToken: () => string;
  connect: (endpoint: string) => Socket;
  now: () => number;
  nextCommandId: () => string;
  timeoutMs?: number;
  /**
   * Reconnect policy. Defaults give about two minutes (2 s doubling, six tries), enough for a Home
   * Assistant restart (H07); the #325 session's own default of three quick tries would block first.
   */
  retryMs?: number;
  maxRetries?: number;
  /** Must equal `entityId` before any `on` / `off` is sent. */
  testDevice?: string;
  device: { kind: "physical" | "virtual"; makeModel?: string; firmware?: string; transport?: string };
  integration?: string;
  commit: string;
  node: string;
  /** Writes a validated record; returns where it went. */
  save?: (name: string, json: string) => string;
};

export function createValidationRun(options: ValidationRunOptions) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const attested = Boolean(options.testDevice) && options.testDevice === options.entityId;
  const startedAt = new Date(options.now()).toISOString();
  // The recorder needs the session's status and ledger, and the session needs the recorder's observer.
  const late: { recorder?: ReturnType<typeof createTraceRecorder> } = {};
  const session = createLiveSession({
    endpoint: options.endpoint,
    allowLoopback: options.allowLoopback,
    entities: { [options.entityId]: { deviceId: VALIDATION_DEVICE, capabilityId: "power" } },
    getToken: options.getToken,
    connect: options.connect,
    now: options.now,
    nextCommandId: options.nextCommandId,
    timeoutMs,
    retryMs: options.retryMs ?? 2_000,
    maxRetries: options.maxRetries ?? 6,
    onLedger: (update) => late.recorder?.onLedger(update),
  });
  const trace = createTraceRecorder({ deviceId: VALIDATION_DEVICE, capabilityId: "power", now: options.now, status: session.status, getLedger: session.getLedger });
  late.recorder = trace;
  const cases: CaseRecord[] = [];
  let open: { id: string; start: number; startedAt: string; physical: PhysicalObservation[] } | undefined;
  const secrets = () => {
    const values = [options.getToken(), options.endpoint, options.entityId];
    try { values.push(new URL(options.endpoint).host); } catch { /* validated by the session */ }
    return values;
  };

  const record = (): EvidenceRecord => {
    const status = session.status();
    const provider: EvidenceRecord["provider"] = {
      name: "home-assistant",
      endpoint: options.source === "simulation" ? "synthetic" : options.endpoint.startsWith("wss:") ? "wss" : "loopback-ws",
    };
    if (status.providerVersion) provider.version = status.providerVersion;
    if (options.integration) provider.integration = options.integration;
    const device: EvidenceRecord["device"] = { pseudonym: VALIDATION_DEVICE, kind: options.device.kind, testDeviceAttested: attested };
    for (const key of ["makeModel", "firmware", "transport"] as const) if (options.device[key]) device[key] = options.device[key];
    return {
      schema: EVIDENCE_SCHEMA,
      source: options.source,
      startedAt,
      finishedAt: new Date(options.now()).toISOString(),
      commit: options.commit,
      runtime: { node: options.node },
      provider,
      device,
      config: { timeoutMs },
      cases: [...cases],
      trace: [...trace.entries],
    };
  };

  const handle = (line: string): string[] => {
    const [command = "", ...rest] = line.trim().split(/\s+/);
    switch (command) {
      case "status":
        return [JSON.stringify({ session: session.status(), device: trace.entries.at(-1)?.view ?? null, openCase: open?.id ?? null })];
      case "cases":
        return VALIDATION_CASES.map((c) => `${c.id}  ${c.title}${c.physical ? "  [physical]" : ""}`);
      case "case": {
        const found = findCase(rest[0] ?? "");
        if (!found) return ["Unknown case. Type `cases` for the list."];
        if (open) return [`Case ${open.id} is open. Type \`end\` first.`];
        open = { id: found.id, start: trace.operator(`case ${found.id}`), startedAt: new Date(options.now()).toISOString(), physical: [] };
        return [`${found.id} — ${found.title}`, ...found.steps.map((s, i) => `  ${i + 1}. ${s}`), "Pass when:", ...found.criteria.map((c) => `  - ${c}`), `Observe: ${found.observe}`];
      }
      case "on":
      case "off": {
        if (!attested) return ["Refused: set KX_TEST_DEVICE to the configured entity id to confirm it is a dedicated test device. No command sent."];
        trace.operator(command);
        return [JSON.stringify({ dispatched: session.request(VALIDATION_DEVICE, command) })];
      }
      case "burst": {
        // H09: three requests in one turn of the event loop, so replies to the first two arrive after their replacement.
        if (!attested) return ["Refused: set KX_TEST_DEVICE to the configured entity id to confirm it is a dedicated test device. No command sent."];
        trace.operator("burst");
        return [JSON.stringify({ dispatched: (["on", "off", "on"] as const).map((value) => session.request(VALIDATION_DEVICE, value)) })];
      }
      case "observe": {
        if (!open) return ["No case is open."];
        const verdict = rest[0];
        if (verdict !== "matches" && verdict !== "differs") return ["Usage: observe matches|differs [short note]"];
        const note = rest.slice(1).join(" ");
        const sensitive = findSensitive(note, secrets());
        if (sensitive.length) return [`Refused: the note looks like it contains ${sensitive.join(", ")}. Describe what you saw without identifiers.`];
        if (note.length > 280) return ["Refused: keep the note under 280 characters."];
        trace.operator("observe");
        open.physical.push({ at: new Date(options.now()).toISOString(), verdict, ...(note ? { note } : {}) });
        return [`Recorded: ${verdict}.`];
      }
      case "end": {
        if (!open) return ["No case is open."];
        const end = trace.operator("end");
        const window = trace.entries.slice(open.start, end + 1);
        const automated = evaluateCase(open.id, window);
        const physicalCase = Boolean(findCase(open.id)?.physical);
        const verdict = caseVerdict(options.source, options.device.kind, physicalCase, automated, open.physical);
        cases.push({ id: open.id, startSeq: open.start, endSeq: end, startedAt: open.startedAt, endedAt: new Date(options.now()).toISOString(), automated, physical: open.physical, verdict });
        open = undefined;
        return [
          `${cases.at(-1)!.id}: ${verdict} (automated ${automated.outcome}${automated.reason ? `: ${automated.reason}` : ""})`,
          ...automated.checks.map((c) => `  ${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`),
          ...(Object.keys(automated.metrics).length ? [`  metrics ${JSON.stringify(automated.metrics)}`] : []),
        ];
      }
      case "save": {
        if (open) return [`Case ${open.id} is open. Type \`end\` first.`];
        const value = record();
        const errors = validateEvidenceRecord(value, secrets());
        if (errors.length) return ["Not saved:", ...errors.map((e) => `  - ${e}`)];
        if (!options.save) return ["Not saved: no destination configured."];
        const name = `${value.startedAt.replace(/[:.]/g, "-")}-${value.source}-${value.device.kind}.json`;
        return [`Saved ${options.save(name, `${JSON.stringify(value, null, 2)}\n`)}`];
      }
      default:
        return ["Commands: status, cases, case <id>, on, off, burst, observe matches|differs [note], end, save, quit"];
    }
  };

  return { session, trace, handle, record, attested };
}
