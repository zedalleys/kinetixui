/**
 * Reference Home Assistant adapter for the KinetixUI device ledger (M4B).
 *
 * This is NOT part of `@kinetixui/iot`. It lives outside `src`, is never built or published, and nothing
 * in the package imports it. It exists to prove the boundary: an adapter is two pure translation
 * functions, and everything Home Assistant–specific stays on this side of them.
 *
 *   Home Assistant message ──translateHomeAssistantMessage──▶ KinetixDeviceSignal[]
 *   KinetixCommandIntent   ──encodeHomeAssistantCommand─────▶ Home Assistant service call
 *
 * It does not open a WebSocket, authenticate, hold a token, subscribe, assign request ids, retry, or keep
 * state. The application does all of that (see `example-app.tsx`). The message shapes below are the
 * subset of the Home Assistant WebSocket API this proof needs, written from its public documentation;
 * they were not validated against a live instance in M4B.
 *
 * Scope: binary power for `light.*` and `switch.*` entities, the first physical-proof target.
 */
import type { KinetixCommandIntent, KinetixDeviceSignal } from "../../src/functions";

/** A Home Assistant state object, as `get_states` and `state_changed` carry it. */
export type HomeAssistantState = {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  /** Newer Home Assistant versions: when the integration last reported, even without a change. */
  last_reported?: string;
  context?: { id: string; parent_id: string | null; user_id: string | null };
};

/** The inbound messages this adapter reads. Anything else translates to no signals. */
export type HomeAssistantMessage =
  | { type: "event"; id?: number; event: { event_type: string; data?: { entity_id?: string; new_state?: HomeAssistantState | null; old_state?: HomeAssistantState | null } } }
  | { type: "result"; id: number; success: true; result: unknown }
  | { type: "result"; id: number; success: false; error: { code: string; message: string } }
  | { type: string; [key: string]: unknown };

/** The outbound command. The application's transport adds the message `id` it correlates on. */
export type HomeAssistantServiceCall = {
  type: "call_service";
  domain: "light" | "switch";
  service: "turn_on" | "turn_off";
  target: { entity_id: string };
};

/**
 * The application's mapping from Home Assistant entities to its own device and capability ids. It is
 * configuration the application owns; the ledger never sees an entity id.
 */
export type HomeAssistantEntityMap = Readonly<Record<string, { deviceId: string; capabilityId: string }>>;

export type TranslateHomeAssistantOptions = {
  entities: HomeAssistantEntityMap;
  /**
   * Home Assistant correlates a reply by the message `id` the application's transport assigned. The
   * transport keeps that mapping and answers here with the KinetixUI `commandId`, so provider ids never
   * reach the ledger. `undefined` means the reply is not for a command (a `get_states` result, say).
   */
  commandIdForRequest?: (requestId: number) => string | undefined;
};

const POWER_DOMAINS = ["light", "switch"] as const;

/**
 * Home Assistant message → normalized signals.
 *
 * - `state_changed` / `get_states` for a mapped entity: `unavailable` → `connectivity: offline` (Home
 *   Assistant's integration has lost the device); any other state → `connectivity: online`, plus a
 *   `report` of `on` / `off` observed at `last_reported ?? last_updated` (Home Assistant's clock).
 *   `unknown` reports no value: Home Assistant does not know it either.
 * - A `result` for a `call_service` the application sent: `success` → **acknowledgement**, never a
 *   confirmation. Home Assistant answers a service call once it has dispatched it, not once the light
 *   has changed; the later `state_changed` is the confirmation. A failure → `result: rejected` with one
 *   of the application's own codes (`errorCode` below). Home Assistant's code and English message stay
 *   here: the user-facing words for a code are the application's.
 * - Everything else (auth handshake, pong, unmapped entities, other domains) → no signals.
 */
export function translateHomeAssistantMessage(message: HomeAssistantMessage, options: TranslateHomeAssistantOptions): KinetixDeviceSignal[] {
  if (message.type === "event") {
    const event = (message as Extract<HomeAssistantMessage, { type: "event" }>).event;
    if (event?.event_type !== "state_changed" || !event.data?.new_state) return [];
    return stateSignals(event.data.new_state, options.entities);
  }
  if (message.type === "result") {
    const result = message as Extract<HomeAssistantMessage, { type: "result"; success: boolean }>;
    const commandId = typeof result.id === "number" ? options.commandIdForRequest?.(result.id) : undefined;
    if (commandId !== undefined) {
      return result.success
        ? [{ type: "acknowledgement", commandId }]
        : [{ type: "result", commandId, outcome: "rejected", code: errorCode(result.error?.code) }];
    }
    if (result.success && Array.isArray(result.result)) return (result.result as HomeAssistantState[]).flatMap((state) => stateSignals(state, options.entities));
  }
  return [];
}

/**
 * Home Assistant error codes → the codes this application uses. KinetixUI defines no codes; these are
 * conventions of this reference, and a real application picks its own.
 */
function errorCode(code: string | undefined): string {
  switch (code) {
    case "unauthorized":
      return "forbidden";
    case "not_found":
      return "not-found";
    case "service_validation_error":
      return "invalid-request";
    default:
      return "provider-error";
  }
}

function stateSignals(state: HomeAssistantState, entities: HomeAssistantEntityMap): KinetixDeviceSignal[] {
  const target = entities[state?.entity_id];
  if (!target) return [];
  if (state.state === "unavailable") return [{ type: "connectivity", deviceId: target.deviceId, state: "offline" }];
  const observedAt = state.last_reported ?? state.last_updated;
  const signals: KinetixDeviceSignal[] = [{ type: "connectivity", deviceId: target.deviceId, state: "online" }];
  if (state.state === "on" || state.state === "off") {
    const report: KinetixDeviceSignal = { type: "report", deviceId: target.deviceId, capabilityId: target.capabilityId, value: state.state };
    if (observedAt !== undefined) report.observedAt = observedAt;
    signals.push(report);
  }
  return signals;
}

/**
 * KinetixUI command intent → Home Assistant service call, or `null` when this adapter cannot express it
 * (an unmapped device, a capability other than power, a value other than on/off). The application then
 * sends nothing and may record the request as rejected with its own code.
 */
export function encodeHomeAssistantCommand(intent: KinetixCommandIntent, options: { entities: HomeAssistantEntityMap }): HomeAssistantServiceCall | null {
  const entityId = Object.keys(options.entities).find((id) => {
    const target = options.entities[id]!;
    return target.deviceId === intent.deviceId && target.capabilityId === intent.capabilityId;
  });
  if (!entityId) return null;
  const domain = entityId.split(".")[0] as (typeof POWER_DOMAINS)[number];
  if (!POWER_DOMAINS.includes(domain)) return null;
  const on = intent.value === "on" || intent.value === true;
  const off = intent.value === "off" || intent.value === false;
  if (!on && !off) return null;
  return { type: "call_service", domain, service: on ? "turn_on" : "turn_off", target: { entity_id: entityId } };
}
