/**
 * Evidence records for real-device validation, and the release gate that reads them.
 *
 * A record says where its results came from. `simulation` records (the synthetic socket in tests) can
 * never count toward the gate, whatever their outcomes. A `live-provider` record is written only by
 * `validation-runner.mjs`, the one place a native WebSocket reaches an operator-configured Home
 * Assistant; its device block says whether the entity was a physical device or a virtual one, and only
 * a physical device with matching operator observations makes a case `pass`.
 *
 * Provenance is the operator's attestation (commit, provider version, device and firmware), not a
 * cryptographic proof; `validateEvidenceRecord` checks that it is complete and that nothing in the
 * record looks like a credential, URL or provider identifier.
 */
import { VALIDATION_CASES, evaluateCase, type CaseEvaluation } from "./cases";
import type { TraceEntry } from "./trace";

export const EVIDENCE_SCHEMA = "kinetixui.iot.device-validation/1";

export type EvidenceSource = "live-provider" | "simulation";

export type PhysicalObservation = { at: string; verdict: "matches" | "differs"; note?: string };

/**
 * - `pass` — physical device, automated pass, every observation matches.
 * - `fail` — automated fail, or an observation that differs.
 * - `not-exercised` — the run never produced the case's situation.
 * - `incomplete` — physical case with no observation recorded.
 * - `provider-only` — live provider with a virtual entity: proves provider traffic, not a device.
 * - `simulation-only` — synthetic run; never evidence for the gate.
 */
export type CaseVerdict = "pass" | "fail" | "not-exercised" | "incomplete" | "provider-only" | "simulation-only";

export type CaseRecord = {
  id: string;
  /** Trace positions of the operator's `case` and `end` entries; the validator re-evaluates this window. */
  startSeq: number;
  endSeq: number;
  startedAt: string;
  endedAt: string;
  automated: CaseEvaluation;
  physical: PhysicalObservation[];
  verdict: CaseVerdict;
};

export type EvidenceRecord = {
  schema: typeof EVIDENCE_SCHEMA;
  source: EvidenceSource;
  startedAt: string;
  finishedAt: string;
  /** Repository commit the runner was built from (40 hex). */
  commit: string;
  runtime: { node: string };
  provider: { name: "home-assistant"; version?: string; integration?: string; endpoint: "wss" | "loopback-ws" | "synthetic" };
  device: {
    /** The ledger's id for the device. The entity id never enters a record. */
    pseudonym: string;
    kind: "physical" | "virtual";
    makeModel?: string;
    firmware?: string;
    /** Radio / link between the device and the provider: zigbee, z-wave, wifi, thread, matter, bluetooth, other. */
    transport?: string;
    /** The operator named this entity as a dedicated test device (`KX_TEST_DEVICE`). */
    testDeviceAttested: boolean;
  };
  config: { timeoutMs: number };
  cases: CaseRecord[];
  trace: TraceEntry[];
};

export function caseVerdict(
  source: EvidenceSource,
  kind: "physical" | "virtual",
  physicalCase: boolean,
  automated: CaseEvaluation,
  physical: PhysicalObservation[],
): CaseVerdict {
  if (source === "simulation") return "simulation-only";
  if (automated.outcome === "fail" || physical.some((o) => o.verdict === "differs")) return "fail";
  if (automated.outcome === "not-exercised") return "not-exercised";
  if (kind === "virtual") return "provider-only";
  if (physicalCase && !physical.length) return "incomplete";
  return "pass";
}

/** Things that must never appear anywhere in a record. */
const FORBIDDEN: [string, RegExp][] = [
  ["JWT-shaped credential", /eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/],
  ["credential field", /access_token|refresh_token|authorization|bearer\s/i],
  ["URL", /\b(?:wss?|https?):\/\//i],
  ["Home Assistant entity id", /\b(?:light|switch|sensor|binary_sensor|climate|lock|media_player|fan|cover)\.[a-z0-9_]+\b/],
  ["Home Assistant context id", /\b[0-9A-HJKMNP-TV-Z]{26}\b/],
];

/** Returns a reason for each forbidden pattern or supplied secret found in `text`. */
export function findSensitive(text: string, secrets: readonly string[] = []): string[] {
  const found = FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  if (secrets.some((secret) => secret.length >= 4 && text.includes(secret))) found.push("a configured secret");
  return found;
}

const ISO = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) && value.endsWith("Z");

/**
 * Every reason a record cannot be committed as evidence; empty when it can. `secrets` are values the
 * runner knows (the token, the endpoint, the entity id) and must not find in the record.
 */
export function validateEvidenceRecord(record: EvidenceRecord, secrets: readonly string[] = []): string[] {
  const errors: string[] = [];
  if (record.schema !== EVIDENCE_SCHEMA) errors.push("unknown schema");
  if (record.source !== "live-provider" && record.source !== "simulation") errors.push("unknown source");
  if (!ISO(record.startedAt) || !ISO(record.finishedAt)) errors.push("startedAt/finishedAt must be UTC ISO times");
  if (!/^[0-9a-f]{40}$/.test(record.commit ?? "")) errors.push("commit must be a full 40-character SHA");
  if (!record.runtime?.node) errors.push("runtime.node missing");
  if (record.source === "live-provider") {
    if (!record.provider?.version) errors.push("live-provider record needs the provider version (Home Assistant sends it at authentication)");
    else if (!/^20\d{2}\.\d{1,2}\.\d+/.test(record.provider.version)) errors.push("provider version is not a Home Assistant release (YYYY.M.patch)");
    if (!record.provider?.integration) errors.push("live-provider record needs the integration that owns the device (KX_HA_INTEGRATION)");
    if (record.provider?.endpoint === "synthetic") errors.push("live-provider record cannot use a synthetic endpoint");
    if (!record.device?.testDeviceAttested) errors.push("device was not attested as a dedicated test device");
    if (record.device?.kind === "physical") {
      for (const key of ["makeModel", "firmware", "transport"] as const) {
        if (!record.device[key]) errors.push(`physical device needs device.${key}`);
      }
    }
  } else if (record.provider?.endpoint !== "synthetic") {
    errors.push("a simulation record must say its endpoint was synthetic");
  }
  const trace = record.trace ?? [];
  if (trace.some((e, i) => e?.seq !== i)) errors.push("trace is not contiguous");
  for (const entry of record.cases ?? []) {
    // Never trust a stored outcome: recompute it from the recorded trace window.
    const start = trace[entry.startSeq];
    const end = trace[entry.endSeq];
    if (start?.operator !== `case ${entry.id}` || end?.operator !== "end" || entry.endSeq <= entry.startSeq) {
      errors.push(`${entry.id}: case window does not match the trace`);
    } else if (JSON.stringify(evaluateCase(entry.id, trace.slice(entry.startSeq, entry.endSeq + 1))) !== JSON.stringify(entry.automated)) {
      errors.push(`${entry.id}: automated result does not follow from the trace`);
    }
    const expected = caseVerdict(record.source, record.device?.kind, Boolean(VALIDATION_CASES.find((c) => c.id === entry.id)?.physical), entry.automated, entry.physical);
    if (entry.verdict !== expected) errors.push(`${entry.id}: verdict ${entry.verdict} does not follow from its results (expected ${expected})`);
    for (const o of entry.physical) {
      if (o.note && o.note.length > 280) errors.push(`${entry.id}: observation note longer than 280 characters`);
    }
  }
  const text = JSON.stringify(record);
  for (const reason of findSensitive(text, secrets)) errors.push(`record contains ${reason}`);
  return errors;
}

/** The cases the held `@kinetixui/iot` changesets need from a physical device before release. */
export const RELEASE_REQUIRED_CASES = ["H01", "H02", "H04", "H05", "H06", "H07", "H09"] as const;

export type GateRow = { id: string; status: "pass" | "missing"; evidence: string[] };

/**
 * Whether committed records cover the release: each required case needs a `pass` verdict in at least
 * one valid live-provider record of a physical device. H03 is reported, never required: whether it is
 * exercised depends on the two clocks, which the operator does not control.
 */
export function releaseGate(records: { name: string; record: EvidenceRecord }[]): { ready: boolean; rows: GateRow[]; invalid: string[] } {
  const invalid = records.filter(({ record }) => validateEvidenceRecord(record).length).map(({ name }) => name);
  const usable = records.filter(({ name, record }) => !invalid.includes(name) && record.source === "live-provider" && record.device.kind === "physical");
  const rows = RELEASE_REQUIRED_CASES.map((id) => {
    const evidence = usable.filter(({ record }) => record.cases.some((c) => c.id === id && c.verdict === "pass")).map(({ name }) => name);
    return { id, status: evidence.length ? ("pass" as const) : ("missing" as const), evidence };
  });
  return { ready: rows.every((r) => r.status === "pass"), rows, invalid };
}
