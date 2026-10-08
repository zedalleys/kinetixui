/**
 * Opt-in structured diagnostics for the reference integration (M4C). APPLICATION code, outside the
 * package. Pass `recorder.onTransitions` as the integration's `onTransitions` to keep a log of what the
 * ledger decided; nothing is recorded unless the application asks.
 *
 * Records hold the application's own device and capability ids (already pseudonyms: the ledger never sees
 * an entity id), the command id, the cause, the lifecycle and connectivity before and after, and any
 * rejection code. They never hold provider messages, values from other devices, or credentials.
 */
import type { KinetixLedgerTransition } from "../../../src/functions";

export type DiagnosticRecord = {
  scenario: string;
  /** Application clock (ms since epoch), when the transition was committed. */
  at: number;
  cause: KinetixLedgerTransition["cause"];
  device?: string;
  capability?: string;
  command?: string;
  lifecycle?: { from?: string; to?: string };
  connectivity?: { from: string; to: string };
  rejection?: string;
};

export function createDiagnosticsRecorder(options: { now(): number; scenario?: string }) {
  let scenario = options.scenario ?? "unlabelled";
  const records: DiagnosticRecord[] = [];
  return {
    records,
    /** Labels the records that follow, e.g. `S04 device reports ON`. */
    scenario(id: string) {
      scenario = id;
    },
    onTransitions(transitions: KinetixLedgerTransition[]) {
      for (const t of transitions) {
        const record: DiagnosticRecord = { scenario, at: options.now(), cause: t.cause };
        if (t.deviceId) record.device = t.deviceId;
        if (t.capabilityId) record.capability = t.capabilityId;
        if (t.commandId) record.command = t.commandId;
        if (t.from || t.to) record.lifecycle = { from: t.from, to: t.to };
        if (t.connectivity) record.connectivity = { from: t.connectivity.from, to: t.connectivity.to };
        if (t.rejection) record.rejection = t.rejection.code;
        records.push(record);
      }
    },
  };
}
