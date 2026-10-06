import type { KinetixConnectivityState, KinetixDeviceConnectivity } from "../types/device-state";
import { KINETIX_CONNECTIVITY_STATES } from "../types/device-state";
import { describeConnectivity } from "./device-state";
import { describeLastSeen } from "./last-seen";
import { parseTimestamp } from "./time";

/**
 * Connection presentation (M3) over the existing connectivity model. No new state: the six
 * `KinetixConnectivityState` values are the whole vocabulary, and nothing here probes, retries or
 * knows a transport.
 */

/**
 * A connectivity state from whatever the product holds: a state string, a `KinetixDeviceConnectivity`,
 * or nothing. Missing or unrecognised input is `unknown` — never `offline`, which needs evidence.
 */
export function normalizeConnectivityState(
  input: KinetixConnectivityState | KinetixDeviceConnectivity | string | null | undefined,
): KinetixConnectivityState {
  const raw = typeof input === "string" ? input : input?.state;
  return typeof raw === "string" && (KINETIX_CONNECTIVITY_STATES as readonly string[]).includes(raw) ? (raw as KinetixConnectivityState) : "unknown";
}

export type DescribeDeviceConnectionInput = {
  state: KinetixConnectivityState | KinetixDeviceConnectivity | string | null | undefined;
  /** When the device was last heard from. */
  lastSeenAt?: string | Date | number | null;
  now?: string | Date | number | null;
  /**
   * When the last-seen time is part of the sentence. `auto` (default) adds it for every state except
   * `online`, where it says nothing the word does not; `always` and `never` do what they say.
   */
  lastSeen?: "auto" | "always" | "never";
};

/** Whether a last-seen time belongs in the sentence for this state. */
export function connectionShowsLastSeen(state: KinetixConnectivityState, mode: DescribeDeviceConnectionInput["lastSeen"] = "auto"): boolean {
  if (mode === "always") return true;
  if (mode === "never") return false;
  return state !== "online";
}

/**
 * One concise sentence for a connection: "Online", "Offline, last seen 5 minutes ago",
 * "Connection unknown". A last-seen time is added only when one was supplied and it adds meaning; it
 * is never invented ("never seen" is not said for a missing timestamp, because absence of a timestamp
 * is not evidence the device was never seen).
 */
export function describeDeviceConnection(input: DescribeDeviceConnectionInput): string {
  const state = normalizeConnectivityState(input.state);
  const seenAt = input.lastSeenAt ?? (typeof input.state === "object" && input.state ? input.state.lastSeenAt : undefined);
  const word = describeConnectivity(state);
  if (!connectionShowsLastSeen(state, input.lastSeen) || !parseTimestamp(seenAt ?? null)) return word;
  const seen = describeLastSeen(seenAt, { now: input.now });
  return `${word}, ${seen[0]!.toLowerCase()}${seen.slice(1)}`;
}
