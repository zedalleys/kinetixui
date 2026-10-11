/**
 * Validation trace: what the ledger did during a real-device run, in provider-neutral terms.
 *
 * Reference only, never built into or exported by `@kinetixui/iot`. The recorder is fed by the live
 * session's `onLedger` observer, so it sees the ledger and its transitions and nothing else: no frame,
 * entity id, URL or credential can enter a trace through it. Operator notes are the one free-text
 * input, and `evidence.ts` refuses a record whose notes look like any of those.
 */
import {
  describeControlState,
  resolveControlState,
  selectCapabilityLifecycle,
  selectDeviceConnectivity,
  summarizeDeviceState,
  toDeviceState,
  type KinetixControlAvailability,
  type KinetixControlPhase,
  type KinetixDeviceLedger,
  type KinetixLedgerTransition,
} from "../../../src/functions";

/** The validated capability as the UI would read it, after one ledger change. */
export type DeviceView = {
  connectivity: string;
  stage: string;
  confirmedValue?: unknown;
  requestedValue?: unknown;
  commandId?: string;
  /** Application clock (ISO). */
  sentAt?: string;
  ackAt?: string;
  settledAt?: string;
  /** Provider clock (ISO): when the provider says the device's value was observed. */
  reportedAt?: string;
  reasonCode?: string;
  /** What `resolveControlState` derives: the input every control draws and announces from. */
  availability: KinetixControlAvailability;
  phase: KinetixControlPhase;
  /** `describeControlState` — the sentence the held offline-wording changeset changed. */
  description: string;
  /** `summarizeDeviceState` sentence for the device. */
  summary: string;
};

export type TraceEntry = {
  seq: number;
  /** Application clock (ISO). */
  at: string;
  kind: "ledger" | "operator";
  cause?: "signals" | "request" | "expire";
  transitions?: KinetixLedgerTransition[];
  /** Operator command: `on`, `off`, `case H05`, `end`, `observe`. Never free text. */
  operator?: string;
  session: { phase: string; fault?: string };
  view: DeviceView;
};

export type SessionStatus = { phase: string; fault?: string };

export function viewDevice(ledger: KinetixDeviceLedger, deviceId: string, capabilityId: string): DeviceView {
  const lifecycle = selectCapabilityLifecycle(ledger, deviceId, capabilityId);
  const connectivity = selectDeviceConnectivity(ledger, deviceId);
  const control = resolveControlState({ connectivity, lifecycle: lifecycle ?? undefined });
  const state = toDeviceState(ledger, { device: { id: deviceId, name: "Validation device", type: "power", status: "online" } });
  const view: DeviceView = {
    connectivity: connectivity.state,
    stage: lifecycle?.stage ?? "idle",
    availability: control.availability,
    phase: control.phase,
    description: describeControlState(control.availability, control.phase),
    summary: summarizeDeviceState(state).description,
  };
  if (lifecycle) {
    for (const key of ["confirmedValue", "requestedValue", "commandId", "sentAt", "ackAt", "settledAt", "reportedAt", "reasonCode"] as const) {
      if (lifecycle[key] !== undefined) (view as Record<string, unknown>)[key] = lifecycle[key];
    }
  }
  return view;
}

/** Operator commands a trace may carry. Anything else is refused, so free text never lands in `operator`. */
const OPERATOR = /^(on|off|end|observe|case H\d{2})$/;

export function createTraceRecorder(options: {
  deviceId: string;
  capabilityId: string;
  now: () => number;
  status: () => SessionStatus;
  getLedger: () => KinetixDeviceLedger;
}) {
  const entries: TraceEntry[] = [];
  const session = (): SessionStatus => {
    const { phase, fault } = options.status();
    return fault ? { phase, fault } : { phase };
  };
  const push = (entry: Omit<TraceEntry, "seq" | "session" | "view">, ledger: KinetixDeviceLedger) => {
    entries.push({ seq: entries.length, ...entry, session: session(), view: viewDevice(ledger, options.deviceId, options.capabilityId) });
  };
  return {
    entries,
    /** Pass as the live session's `onLedger`. */
    onLedger(update: { cause: "signals" | "request" | "expire"; transitions: KinetixLedgerTransition[]; ledger: KinetixDeviceLedger; at: number }) {
      push({ at: new Date(update.at).toISOString(), kind: "ledger", cause: update.cause, transitions: update.transitions }, update.ledger);
    },
    operator(command: string) {
      if (!OPERATOR.test(command)) throw new Error("Not an operator command");
      push({ at: new Date(options.now()).toISOString(), kind: "operator", operator: command }, options.getLedger());
      return entries.length - 1;
    },
  };
}
