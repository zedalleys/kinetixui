/**
 * A deterministic scenario harness for the device ledger (M4B). Test-only: it is not in `src`, so it is
 * neither built nor published.
 *
 * It is not a mock server. A scenario is a list of timed steps, each one thing an application would do
 * when its transport delivered a message or its timer fired: record a request, apply signals, expire.
 * Delivery delay is a later `at`; reordering is steps whose `observedAt` disagree with their `at`;
 * a dropped message is a step left out. That is enough to drive every ordering a real provider produces
 * without simulating the provider.
 */
import {
  applyDeviceSignals,
  expireDeviceCommands,
  requestDeviceChange,
  type ExpireDeviceCommandsOptions,
  type KinetixCommandIntent,
  type KinetixDeviceLedger,
  type KinetixDeviceSignal,
  type KinetixLedgerTransition,
  type RequestDeviceChangeInput,
} from "../src/functions";

export type LedgerScenarioStep =
  | { at: number; request: RequestDeviceChangeInput }
  | { at: number; signals: KinetixDeviceSignal[] }
  | { at: number; expire: ExpireDeviceCommandsOptions };

export type LedgerScenarioRun = {
  ledger: KinetixDeviceLedger;
  /** Every transition, in order. */
  transitions: KinetixLedgerTransition[];
  /** Every intent the application would have sent. */
  intents: KinetixCommandIntent[];
};

/** Run steps in `at` order (stable for equal times), as the application would on receipt. */
export function runLedgerScenario(ledger: KinetixDeviceLedger, steps: readonly LedgerScenarioStep[]): LedgerScenarioRun {
  const ordered = steps.map((step, index) => ({ step, index })).sort((a, b) => a.step.at - b.step.at || a.index - b.index);
  let current = ledger;
  const transitions: KinetixLedgerTransition[] = [];
  const intents: KinetixCommandIntent[] = [];
  for (const { step } of ordered) {
    if ("request" in step) {
      const update = requestDeviceChange(current, step.request, step.at);
      current = update.ledger;
      transitions.push(...update.transitions);
      if (update.intent) intents.push(update.intent);
    } else if ("signals" in step) {
      const update = applyDeviceSignals(current, step.signals, step.at);
      current = update.ledger;
      transitions.push(...update.transitions);
    } else {
      const update = expireDeviceCommands(current, step.at, step.expire);
      current = update.ledger;
      transitions.push(...update.transitions);
    }
  }
  return { ledger: current, transitions, intents };
}

/**
 * Signals a fake provider would emit for one device, already normalized. `skewMs` puts the device's clock
 * behind (negative) or ahead of the application's, as a real device's often is.
 */
export function fakeDevice(deviceId: string, options: { skewMs?: number } = {}) {
  const deviceTime = (at: number) => new Date(at + (options.skewMs ?? 0)).toISOString();
  return {
    report: (capabilityId: string, value: unknown, observedAtAppMs: number): KinetixDeviceSignal => ({
      type: "report",
      deviceId,
      capabilityId,
      value,
      observedAt: deviceTime(observedAtAppMs),
    }),
    snapshot: (values: Record<string, unknown>, observedAtAppMs: number): KinetixDeviceSignal => ({
      type: "snapshot",
      deviceId,
      values,
      observedAt: deviceTime(observedAtAppMs),
    }),
    ack: (commandId: string): KinetixDeviceSignal => ({ type: "acknowledgement", commandId }),
    applied: (commandId: string, value?: unknown): KinetixDeviceSignal =>
      value === undefined ? { type: "result", commandId, outcome: "applied" } : { type: "result", commandId, outcome: "applied", value },
    rejected: (commandId: string, code: string): KinetixDeviceSignal => ({ type: "result", commandId, outcome: "rejected", code }),
    link: (state: "online" | "offline" | "unreachable" | "connecting" | "unknown" | "stale"): KinetixDeviceSignal => ({ type: "connectivity", deviceId, state }),
  };
}

/** Every ordering of `items`, for order-independence checks. */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}
