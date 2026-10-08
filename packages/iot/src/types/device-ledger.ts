/**
 * The device ledger model (M4B): what KinetixUI knows about a set of devices and the changes asked of
 * them, in a form a real provider can feed.
 *
 * KinetixUI owns device-interaction truth, not device infrastructure. Everything here is a value: the
 * application keeps the ledger in its own store (React state, Zustand, Redux, a server), its transport
 * receives provider messages, an adapter it owns translates them into {@link KinetixDeviceSignal}s, and
 * the pure functions in `functions/device-ledger.ts` reconcile them. Nothing here opens a connection,
 * holds a credential, schedules a timer, or knows which provider is on the other side.
 *
 * Each capability of each device has exactly one {@link KinetixCommandLifecycle}. It is `idle` when
 * nothing is asked of it, and an idle lifecycle still tracks what the device reports, so the reported
 * value lives in one place.
 */

import type { KinetixCommandLifecycle, KinetixCommandLifecycleStage, KinetixLifecycleRejection } from "./command";
import type { KinetixConnectivityState, KinetixDeviceConnectivity } from "./device-state";

/**
 * A fact about a device, already translated out of the provider's own vocabulary.
 *
 * Provider payloads never pass through: an adapter maps a provider's entity, topic or cluster to the
 * application's `deviceId` and `capabilityId`, and a provider's request id to the KinetixUI `commandId`
 * the application chose, before a signal reaches the ledger.
 *
 * - `report` — the device's value for one capability. Device truth, whoever caused it: an answer to
 *   a request, a physical switch, another app, a periodic push. Not an answer by itself.
 * - `snapshot` — several capabilities of one device observed together, as a provider sends on connect
 *   or reconnect. Each value is applied exactly as a `report`.
 * - `acknowledgement` — the provider or device accepted a request. It is never a confirmation.
 * - `result` — the provider's verdict on a request: `applied` (with the value the device took, when it
 *   says) or `rejected` (with the application's code). Only for providers whose reply speaks for the
 *   device; a provider that only says "accepted" sends an `acknowledgement`.
 * - `connectivity` — the device's link, in the six states KinetixUI already uses. It never settles,
 *   fails or times out a request: a lost link is not a refusal.
 *
 * `observedAt` is the provider's or device's time for the observation, on its own clock; it only
 * orders reports against each other. When the application received a signal is the `now` it passes
 * to `applyDeviceSignals`, on its own clock, and that is what decides whether a report came after a
 * request was sent.
 */
export type KinetixDeviceSignal =
  | { type: "report"; deviceId: string; capabilityId: string; value: unknown; observedAt?: string | Date | number }
  | { type: "snapshot"; deviceId: string; values: Readonly<Record<string, unknown>>; observedAt?: string | Date | number }
  | { type: "acknowledgement"; commandId: string }
  | { type: "result"; commandId: string; outcome: "applied" | "rejected"; value?: unknown; code?: string; reason?: string }
  | { type: "connectivity"; deviceId: string; state: KinetixConnectivityState; lastSeenAt?: string | Date };

/**
 * What the application should ask the provider to do, in KinetixUI's words. Returned by
 * `requestDeviceChange`; an adapter turns it into a provider command and the application's transport
 * sends it.
 *
 * It carries no URL, token, topic, service name or SDK object, and it never will: those are the
 * adapter's and the application's.
 */
export type KinetixCommandIntent = {
  /** The application's id for this request. Correlates every acknowledgement and result for it. */
  commandId: string;
  deviceId: string;
  capabilityId: string;
  /** The value requested. Never the device's state until a report or result confirms it. */
  value: unknown;
  /** When the ledger recorded the request, on the application's clock (ISO). */
  requestedAt: string;
  /** The open request this one replaced, if any. A provider that can cancel may use it; the ledger already refuses its late replies. */
  supersedes?: string;
};

/** One device in a ledger. */
export type KinetixLedgerDevice = {
  /** The device's link. `unknown` until a `connectivity` signal says otherwise. */
  connectivity: KinetixDeviceConnectivity;
  /** Capability id → its lifecycle. Every registered capability has one. */
  capabilities: Readonly<Record<string, KinetixCommandLifecycle>>;
};

/**
 * The application's normalized knowledge of its devices and outstanding requests. A plain, immutable
 * value: every ledger function returns a new one (or the same object when nothing changed) and never
 * mutates its input. Read it through `selectCapabilityLifecycle`, `selectDeviceConnectivity` and
 * `toDeviceState` rather than by shape.
 *
 * It holds only the devices and capabilities the application registered with `createDeviceLedger`.
 * Signals for anything else are refused, so a provider that streams every entity it knows does not
 * turn the ledger into a device registry.
 */
export type KinetixDeviceLedger = {
  devices: Readonly<Record<string, KinetixLedgerDevice>>;
};

/**
 * Why the ledger did not apply something. The ledger is returned unchanged for that item.
 *
 * The lifecycle's own codes pass through (`stale-response`, `stale-report`, `illegal-transition`,
 * `max-attempts`), plus three for things the ledger has never heard of.
 */
export type KinetixLedgerRejection = {
  code: KinetixLifecycleRejection["code"] | "unknown-device" | "unknown-capability" | "unknown-command";
  message: string;
};

/**
 * One structured record of what a ledger operation did, so an application can log, debug, notify or
 * audit without KinetixUI performing any of those itself. Accepted and refused items are both
 * recorded; nothing is thrown.
 *
 * - `cause` — the signal type, or `request` / `expire` for the ledger's own operations.
 * - `from` / `to` — the capability's lifecycle stage before and after (equal when only the reported
 *   value moved).
 * - `connectivity` — the link before and after, for a `connectivity` signal.
 */
export type KinetixLedgerTransition = {
  cause: KinetixDeviceSignal["type"] | "request" | "expire";
  deviceId?: string;
  capabilityId?: string;
  commandId?: string;
  from?: KinetixCommandLifecycleStage;
  to?: KinetixCommandLifecycleStage;
  connectivity?: { from: KinetixConnectivityState; to: KinetixConnectivityState };
  rejection?: KinetixLedgerRejection;
};

/** What every ledger operation returns: the next ledger, and what happened on the way. */
export type KinetixLedgerUpdate = {
  ledger: KinetixDeviceLedger;
  transitions: KinetixLedgerTransition[];
};
