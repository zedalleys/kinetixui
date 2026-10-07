import type { KinetixCommandLifecycle, KinetixCommandLifecycleEvent, KinetixDeviceCommand } from "../types/command";
import type { KinetixDevice } from "../types/device";
import type {
  KinetixConnectivityState,
  KinetixDeviceCapability,
  KinetixDeviceConnectivity,
  KinetixDeviceFault,
  KinetixDeviceHealth,
  KinetixDeviceState,
} from "../types/device-state";
import type { KinetixDeviceAlert } from "../types/alert";
import type {
  KinetixCommandIntent,
  KinetixDeviceLedger,
  KinetixDeviceSignal,
  KinetixLedgerDevice,
  KinetixLedgerTransition,
  KinetixLedgerUpdate,
} from "../types/device-ledger";
import {
  isLifecyclePending,
  isLifecycleTimedOut,
  isSameDeviceValue,
  lifecycleToCommandStatus,
  startCommandLifecycle,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
} from "./commands";
import { normalizeConnectivityState } from "./connection";
import { deriveDeviceHealth } from "./device-state";
import { resolveNow } from "./time";

/**
 * The device ledger (M4B): pure reconciliation between what an application asked its devices to do and
 * what its provider says they did.
 *
 * Every function takes a ledger value and returns a new one with a list of structured transitions. The
 * ledger never sends, subscribes, schedules, retries or stores anything; the application calls these
 * from its own store when its own transport delivers a message or its own timer fires. Reconciliation
 * is the lifecycle's: each signal becomes a `KinetixCommandLifecycle` event for one capability, so every
 * M1–M4A rule (ordering by `observedAt`, settling by receipt time, correlation, supersession, adjusted
 * confirmations) applies unchanged.
 */

/** Shared so that selecting an unknown device returns the same object every time. */
const UNKNOWN_CONNECTIVITY: KinetixDeviceConnectivity = { state: "unknown" };

export type CreateDeviceLedgerInput = {
  devices: readonly {
    deviceId: string;
    /** The capabilities the application will request and read. Signals for any other are refused. */
    capabilities: readonly string[];
    /** Values already known, by capability id. Usually omitted: the provider's first snapshot fills them. */
    values?: Readonly<Record<string, unknown>>;
    /** Defaults to `unknown`: not being told is not evidence the device is gone. */
    connectivity?: KinetixConnectivityState | KinetixDeviceConnectivity;
  }[];
};

/**
 * A ledger for the devices and capabilities the application registered. Every capability starts
 * `idle`, with the known value if one was given, and every device's link starts `unknown` unless given.
 *
 * To register more devices later, merge the `devices` of a second ledger into the first: the ledger is a
 * plain value, and a device registry is the application's, not KinetixUI's.
 */
export function createDeviceLedger(input: CreateDeviceLedgerInput): KinetixDeviceLedger {
  const devices: Record<string, KinetixLedgerDevice> = {};
  for (const entry of input.devices ?? []) {
    const capabilities: Record<string, KinetixCommandLifecycle> = { ...devices[entry.deviceId]?.capabilities };
    for (const capabilityId of entry.capabilities) {
      capabilities[capabilityId] = startCommandLifecycle({ confirmed: entry.values?.[capabilityId] });
    }
    const connectivity =
      typeof entry.connectivity === "object" && entry.connectivity !== null
        ? { ...entry.connectivity, state: normalizeConnectivityState(entry.connectivity) }
        : entry.connectivity !== undefined
          ? { state: normalizeConnectivityState(entry.connectivity) }
          : UNKNOWN_CONNECTIVITY;
    devices[entry.deviceId] = { connectivity, capabilities };
  }
  return { devices };
}

export type RequestDeviceChangeInput = {
  /** The application's id for this request, unique to it. The ledger generates none. */
  commandId: string;
  deviceId: string;
  capabilityId: string;
  value: unknown;
};

/**
 * Record that the application is asking a capability to change, and get the intent to send.
 *
 * Call it when the request is handed to the transport. The capability's lifecycle becomes `requested`
 * for `value`, and an open request on the same capability is superseded: its id joins
 * `supersededCommandIds`, so its late acknowledgement, result or timeout is refused and can neither
 * settle nor revive anything. The reported value and its ordering time carry over. A request to a
 * device or capability the ledger does not hold is refused and returns no intent, so nothing is sent.
 *
 * Connectivity is not consulted. Whether a control accepts input while the device is offline is
 * `resolveControlState`'s call, and a request is a fact the ledger records either way.
 */
export function requestDeviceChange(
  ledger: KinetixDeviceLedger,
  request: RequestDeviceChangeInput,
  now?: string | Date | number | null,
): KinetixLedgerUpdate & { intent?: KinetixCommandIntent } {
  const { commandId, deviceId, capabilityId } = request;
  const found = locate(ledger, deviceId, capabilityId, "request");
  if ("rejected" in found) return { ledger, transitions: [{ ...found.rejected, commandId }] };

  const at = new Date(resolveNow(now)).toISOString();
  const previous = found.lifecycle;
  const sent = transitionCommandLifecycle(supersedeCommandLifecycle(previous, request.value, { commandId }), { type: "sent", commandId }, at).state;
  const intent: KinetixCommandIntent = { commandId, deviceId, capabilityId, value: request.value, requestedAt: at };
  if (isLifecyclePending(previous) && previous.commandId !== undefined) intent.supersedes = previous.commandId;

  const draft = draftLedger(ledger);
  draft.setLifecycle(deviceId, capabilityId, sent);
  return {
    ledger: draft.done(),
    intent,
    transitions: [{ cause: "request", deviceId, capabilityId, commandId, from: previous.stage, to: sent.stage }],
  };
}

/**
 * Apply provider facts, in the order received. `now` is when the application received them, on the
 * same clock it used for requests.
 *
 * | signal | becomes |
 * | --- | --- |
 * | `report` | a lifecycle `report` with `receivedAt: now`: always the reported value; settles an open request only when it equals the request and arrived after it was sent |
 * | `snapshot` | one `report` per capability it names |
 * | `acknowledgement` | `acknowledge` on the request with that `commandId`: still not confirmed |
 * | `result` `applied` | `confirm` for that request, with the device's value when given (an adjusted confirmation when it differs) |
 * | `result` `rejected` | `fail` for that request, with its `code` and `reason` |
 * | `connectivity` | the device's link only. Requests stay open: a lost link is not a refusal, and a returned link is not a confirmation |
 *
 * Acknowledgements and results are routed by `commandId` alone. An id the ledger has superseded is
 * refused as `stale-response`, and an id it has never seen as `unknown-command`. A report for a device
 * or capability the ledger does not hold is refused, not added. Every refusal is a transition with a
 * `rejection`; nothing throws, and a call that changes nothing returns the same ledger object.
 */
export function applyDeviceSignals(
  ledger: KinetixDeviceLedger,
  signals: readonly KinetixDeviceSignal[],
  now?: string | Date | number | null,
): KinetixLedgerUpdate {
  const at = new Date(resolveNow(now)).toISOString();
  const draft = draftLedger(ledger);
  const transitions: KinetixLedgerTransition[] = [];

  const report = (cause: "report" | "snapshot", deviceId: string, capabilityId: string, value: unknown, observedAt: string | Date | number | undefined) => {
    const found = locate(draft.current(), deviceId, capabilityId, cause);
    if ("rejected" in found) return transitions.push(found.rejected);
    const event: KinetixCommandLifecycleEvent = { type: "report", value, receivedAt: at };
    if (observedAt !== undefined) event.observedAt = observedAt;
    apply(cause, deviceId, capabilityId, found.lifecycle, event);
  };

  const apply = (
    cause: KinetixLedgerTransition["cause"],
    deviceId: string,
    capabilityId: string,
    lifecycle: KinetixCommandLifecycle,
    event: KinetixCommandLifecycleEvent,
  ) => {
    const result = transitionCommandLifecycle(lifecycle, event, at);
    const commandId = "commandId" in event && event.commandId !== undefined ? event.commandId : lifecycle.commandId;
    const transition: KinetixLedgerTransition = { cause, deviceId, capabilityId, from: lifecycle.stage, to: result.state.stage };
    if (commandId !== undefined) transition.commandId = commandId;
    if (!result.ok) transition.rejection = result.rejection;
    else if (!isSameLifecycle(lifecycle, result.state)) draft.setLifecycle(deviceId, capabilityId, result.state);
    transitions.push(transition);
  };

  for (const signal of signals ?? []) {
    switch (signal?.type) {
      case "report":
        report("report", signal.deviceId, signal.capabilityId, signal.value, signal.observedAt);
        break;
      case "snapshot": {
        if (!draft.current().devices[signal.deviceId]) {
          transitions.push(unknownDevice("snapshot", signal.deviceId));
          break;
        }
        for (const [capabilityId, value] of Object.entries(signal.values ?? {})) report("snapshot", signal.deviceId, capabilityId, value, signal.observedAt);
        break;
      }
      case "acknowledgement":
      case "result": {
        const found = findCommand(draft.current(), signal.commandId);
        if (!found) {
          transitions.push({
            cause: signal.type,
            commandId: signal.commandId,
            rejection: { code: "unknown-command", message: `No request with id ${signal.commandId} is known to the ledger.` },
          });
          break;
        }
        const event: KinetixCommandLifecycleEvent =
          signal.type === "acknowledgement"
            ? { type: "acknowledge", commandId: signal.commandId }
            : signal.outcome === "applied"
              ? { type: "confirm", commandId: signal.commandId, ...(signal.value !== undefined ? { value: signal.value } : {}) }
              : { type: "fail", commandId: signal.commandId, code: signal.code, reason: signal.reason };
        apply(signal.type, found.deviceId, found.capabilityId, found.lifecycle, event);
        break;
      }
      case "connectivity": {
        const device = draft.current().devices[signal.deviceId];
        if (!device) {
          transitions.push(unknownDevice("connectivity", signal.deviceId));
          break;
        }
        const previous = device.connectivity;
        const next: KinetixDeviceConnectivity = { ...previous, state: normalizeConnectivityState(signal.state) };
        if (signal.lastSeenAt !== undefined) next.lastSeenAt = signal.lastSeenAt;
        if (next.state !== previous.state || next.lastSeenAt !== previous.lastSeenAt) draft.setConnectivity(signal.deviceId, next);
        transitions.push({ cause: "connectivity", deviceId: signal.deviceId, connectivity: { from: previous.state, to: next.state } });
        break;
      }
      default:
        transitions.push({
          cause: "report",
          rejection: { code: "illegal-transition", message: `"${String((signal as { type?: unknown })?.type)}" is not a device signal.` },
        });
    }
  }
  return { ledger: draft.done(), transitions };
}

export type ExpireDeviceCommandsOptions = {
  /**
   * How long a request may stay open, measured from its latest send. A number, or a function for
   * per-capability deadlines. A non-positive or non-finite value expires nothing.
   */
  timeoutMs?: number | ((target: { deviceId: string; capabilityId: string }) => number);
  /**
   * Expire exactly this request, as a per-request timer firing would. Refused as `stale-response` when
   * it has been superseded, so a timer left over from a replaced request cannot time out its successor.
   * With `timeoutMs` as well, it expires only once that much time has passed.
   */
  commandId?: string;
};

/**
 * Time out open requests. The application decides when to call it (an interval, a timer per request,
 * on focus); KinetixUI decides what a timeout means.
 *
 * Every timeout carries the request's own `commandId`, so it can only reach the request it was meant
 * for. A timed-out request says the change may still apply, never that the device refused, and a later
 * report or result can still settle it. With neither option, nothing expires.
 */
export function expireDeviceCommands(
  ledger: KinetixDeviceLedger,
  now: string | Date | number | null | undefined,
  options: ExpireDeviceCommandsOptions,
): KinetixLedgerUpdate {
  const at = resolveNow(now);
  const deadline = (deviceId: string, capabilityId: string) =>
    typeof options.timeoutMs === "function" ? options.timeoutMs({ deviceId, capabilityId }) : options.timeoutMs;
  const draft = draftLedger(ledger);
  const transitions: KinetixLedgerTransition[] = [];

  const expire = (deviceId: string, capabilityId: string, lifecycle: KinetixCommandLifecycle, commandId: string | undefined) => {
    const result = transitionCommandLifecycle(lifecycle, commandId !== undefined ? { type: "timeout", commandId } : { type: "timeout" }, at);
    const transition: KinetixLedgerTransition = { cause: "expire", deviceId, capabilityId, from: lifecycle.stage, to: result.state.stage };
    if (commandId !== undefined) transition.commandId = commandId;
    if (!result.ok) transition.rejection = result.rejection;
    else draft.setLifecycle(deviceId, capabilityId, result.state);
    transitions.push(transition);
  };

  if (options.commandId !== undefined) {
    const found = findCommand(ledger, options.commandId);
    if (!found) {
      transitions.push({
        cause: "expire",
        commandId: options.commandId,
        rejection: { code: "unknown-command", message: `No request with id ${options.commandId} is known to the ledger.` },
      });
    } else {
      const ms = deadline(found.deviceId, found.capabilityId);
      if (ms === undefined || isLifecycleTimedOut(found.lifecycle, at, ms)) expire(found.deviceId, found.capabilityId, found.lifecycle, options.commandId);
    }
    return { ledger: draft.done(), transitions };
  }

  if (options.timeoutMs === undefined) return { ledger, transitions };
  for (const [deviceId, device] of Object.entries(ledger.devices)) {
    for (const [capabilityId, lifecycle] of Object.entries(device.capabilities)) {
      const ms = deadline(deviceId, capabilityId);
      if (ms !== undefined && isLifecyclePending(lifecycle) && isLifecycleTimedOut(lifecycle, at, ms)) expire(deviceId, capabilityId, lifecycle, lifecycle.commandId);
    }
  }
  return { ledger: draft.done(), transitions };
}

/**
 * The lifecycle for one capability: what the device reports (`confirmedValue`), what was asked
 * (`requestedValue`), the stage, and whether it settled adjusted (`isLifecycleAdjusted`). Pass it
 * straight to a control's `lifecycle` prop. The same object is returned until that capability changes,
 * so it is safe as a memo or selector result. `undefined` for a device or capability the ledger lacks.
 * `T` types the values for a control's props (`selectCapabilityLifecycle<KinetixPowerState>(…)`); it is
 * not checked.
 */
export function selectCapabilityLifecycle<T = unknown>(
  ledger: KinetixDeviceLedger,
  deviceId: string,
  capabilityId: string,
): KinetixCommandLifecycle<T> | undefined {
  // The ledger holds whatever the provider reported; `T` is the caller's statement of what that capability carries.
  return ledger.devices[deviceId]?.capabilities[capabilityId] as KinetixCommandLifecycle<T> | undefined;
}

/** The device's link, for `resolveControlState({ connectivity })` and `DeviceConnection`. `unknown` for a device the ledger lacks. */
export function selectDeviceConnectivity(ledger: KinetixDeviceLedger, deviceId: string): KinetixDeviceConnectivity {
  return ledger.devices[deviceId]?.connectivity ?? UNKNOWN_CONNECTIVITY;
}

export type ToDeviceStateInput = {
  /** Identity is the application's: the ledger holds no names, models or rooms. */
  device: KinetixDevice;
  capabilities?: KinetixDeviceCapability[];
  /** Defaults to `deriveDeviceHealth` over the device's status and battery and the ledger's link. */
  health?: KinetixDeviceHealth;
  faults?: KinetixDeviceFault[];
  alerts?: KinetixDeviceAlert[];
};

/**
 * A {@link KinetixDeviceState} for `summarizeDeviceState`, `DeviceStateSummary` and the device cards,
 * derived from the ledger so that reported and requested values are never stored twice.
 *
 * `confirmedValues` are the reported values. `requestedValues` and `pendingCommands` hold only open
 * requests: a timed-out or failed request is not still being asked for, and is described by its
 * lifecycle instead. A pending command's `name` is its capability id.
 */
export function toDeviceState(ledger: KinetixDeviceLedger, input: ToDeviceStateInput): KinetixDeviceState {
  const deviceId = input.device.id;
  const connectivity = selectDeviceConnectivity(ledger, deviceId);
  const confirmedValues: Record<string, unknown> = {};
  const requestedValues: Record<string, unknown> = {};
  const pendingCommands: KinetixDeviceCommand[] = [];
  for (const [capabilityId, lifecycle] of Object.entries(ledger.devices[deviceId]?.capabilities ?? {})) {
    if (lifecycle.confirmedValue !== undefined) confirmedValues[capabilityId] = lifecycle.confirmedValue;
    if (!isLifecyclePending(lifecycle)) continue;
    if (lifecycle.requestedValue !== undefined) requestedValues[capabilityId] = lifecycle.requestedValue;
    pendingCommands.push({
      id: lifecycle.commandId ?? capabilityId,
      deviceId,
      name: capabilityId,
      status: lifecycleToCommandStatus(lifecycle) ?? "sent",
      createdAt: lifecycle.sentAt ?? new Date(0).toISOString(),
    });
  }
  const faults = input.faults ?? [];
  const alerts = input.alerts ?? [];
  return {
    device: input.device,
    connectivity,
    health: input.health ?? deriveDeviceHealth({ status: input.device.status, connectivity, battery: input.device.battery, faults, alerts }),
    capabilities: input.capabilities ?? [],
    confirmedValues,
    requestedValues,
    pendingCommands,
    faults,
    alerts,
  };
}

// ---------------------------------------------------------------------------------------------
// Module-private helpers.
// ---------------------------------------------------------------------------------------------

type Located = { lifecycle: KinetixCommandLifecycle } | { rejected: KinetixLedgerTransition };

function unknownDevice(cause: KinetixLedgerTransition["cause"], deviceId: string): KinetixLedgerTransition {
  return { cause, deviceId, rejection: { code: "unknown-device", message: `Device ${deviceId} is not in the ledger.` } };
}

function locate(ledger: KinetixDeviceLedger, deviceId: string, capabilityId: string, cause: KinetixLedgerTransition["cause"]): Located {
  const device = ledger.devices[deviceId];
  if (!device) return { rejected: unknownDevice(cause, deviceId) };
  const lifecycle = device.capabilities[capabilityId];
  if (!lifecycle) {
    return {
      rejected: {
        cause,
        deviceId,
        capabilityId,
        rejection: { code: "unknown-capability", message: `Device ${deviceId} has no capability ${capabilityId} in the ledger.` },
      },
    };
  }
  return { lifecycle };
}

/**
 * The capability a command id belongs to: the one whose current request it is, else the one that
 * superseded it (whose lifecycle then refuses it as `stale-response`). Found by scanning rather than
 * kept in an index, so there is no second record of ids to drift from the lifecycles.
 */
function findCommand(
  ledger: KinetixDeviceLedger,
  commandId: string,
): { deviceId: string; capabilityId: string; lifecycle: KinetixCommandLifecycle } | undefined {
  let superseded: { deviceId: string; capabilityId: string; lifecycle: KinetixCommandLifecycle } | undefined;
  for (const [deviceId, device] of Object.entries(ledger.devices)) {
    for (const [capabilityId, lifecycle] of Object.entries(device.capabilities)) {
      if (lifecycle.commandId === commandId) return { deviceId, capabilityId, lifecycle };
      if (!superseded && lifecycle.supersededCommandIds?.includes(commandId)) superseded = { deviceId, capabilityId, lifecycle };
    }
  }
  return superseded;
}

/**
 * Whether an accepted event left a lifecycle as it was: a provider repeating the value it already
 * reported. Keeping the old object keeps selectors stable, so a chatty provider does not re-render
 * every control on every push.
 */
function isSameLifecycle(a: KinetixCommandLifecycle, b: KinetixCommandLifecycle): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof KinetixCommandLifecycle>;
  return [...keys].every((key) => (key === "confirmedValue" ? isSameDeviceValue(a[key], b[key]) : Object.is(a[key], b[key])));
}

/** Copy-on-write over a ledger: untouched devices and capabilities keep their identity. */
function draftLedger(base: KinetixDeviceLedger) {
  let devices: Record<string, KinetixLedgerDevice> | null = null;
  const copied = new Set<string>();
  const writable = (deviceId: string): KinetixLedgerDevice => {
    devices ??= { ...base.devices };
    if (!copied.has(deviceId)) {
      const device = devices[deviceId]!;
      devices[deviceId] = { ...device, capabilities: { ...device.capabilities } };
      copied.add(deviceId);
    }
    return devices[deviceId]!;
  };
  return {
    current: (): KinetixDeviceLedger => (devices ? { ...base, devices } : base),
    setLifecycle(deviceId: string, capabilityId: string, lifecycle: KinetixCommandLifecycle) {
      (writable(deviceId).capabilities as Record<string, KinetixCommandLifecycle>)[capabilityId] = lifecycle;
    },
    setConnectivity(deviceId: string, connectivity: KinetixDeviceConnectivity) {
      writable(deviceId).connectivity = connectivity;
    },
    done: (): KinetixDeviceLedger => (devices ? { ...base, devices } : base),
  };
}
