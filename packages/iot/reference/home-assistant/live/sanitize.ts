/**
 * Evidence sanitizer for live Home Assistant runs (M4C). APPLICATION/evidence code, outside the package.
 *
 * A live run may only keep what the evidence needs: message types, ids, success flags, error codes, the
 * on/off state and Home Assistant's timestamps for the ONE entity under test, renamed to a pseudonym.
 * Everything else is dropped rather than masked: access tokens, attributes (friendly names, model and
 * vendor strings), `context` (which carries user ids), error messages (free text that may name things),
 * every other entity, and any host or address. `findSensitiveContent` is the last line of defence and the
 * live run refuses to write a file it flags.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** entity id → pseudonym, e.g. `{ "light.living_room": "device-1.power" }`. Anything not in it is dropped. */
export type EntityPseudonyms = Readonly<Record<string, string>>;

const STATE_FIELDS = ["state", "last_changed", "last_updated", "last_reported"] as const;

function sanitizeState(state: unknown, pseudonyms: EntityPseudonyms): Json | undefined {
  if (!state || typeof state !== "object") return state === null ? null : undefined;
  const source = state as Record<string, unknown>;
  const pseudonym = typeof source.entity_id === "string" ? pseudonyms[source.entity_id] : undefined;
  if (!pseudonym) return undefined;
  const out: Record<string, Json> = { entity_id: pseudonym };
  for (const field of STATE_FIELDS) if (typeof source[field] === "string") out[field] = source[field] as string;
  return out;
}

/**
 * One wire message → what may be kept, or `null` when nothing about it may be kept (an event for another
 * entity, an unrecognised shape).
 */
export function sanitizeHomeAssistantMessage(message: unknown, pseudonyms: EntityPseudonyms): Json | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  const type = typeof m.type === "string" ? m.type : undefined;
  const out: Record<string, Json> = {};
  if (type) out.type = type;
  if (typeof m.id === "number") out.id = m.id;

  switch (type) {
    case "auth_required":
    case "auth_ok":
    case "auth_invalid":
      return out;
    case "auth":
      out.access_token = "[redacted]";
      return out;
    case "subscribe_events":
      if (typeof m.event_type === "string") out.event_type = m.event_type;
      return out;
    case "unsubscribe_events":
      if (typeof m.subscription === "number") out.subscription = m.subscription;
      return out;
    case "get_states":
    case "ping":
    case "pong":
      return out;
    case "call_service": {
      const target = (m.target as { entity_id?: unknown } | undefined)?.entity_id;
      const pseudonym = typeof target === "string" ? pseudonyms[target] : undefined;
      if (!pseudonym) return null;
      return { ...out, domain: String(m.domain), service: String(m.service), target: { entity_id: pseudonym } };
    }
    case "result": {
      out.success = m.success === true;
      if (m.success !== true) {
        const code = (m.error as { code?: unknown } | undefined)?.code;
        out.error = { code: typeof code === "string" ? code : "unknown" };
        return out;
      }
      if (Array.isArray(m.result)) {
        out.result = m.result.map((state) => sanitizeState(state, pseudonyms)).filter((state): state is Json => state !== undefined);
      } else {
        // A service call's result carries a `context` (with a user id); a subscription's is null.
        out.result = m.result === null || m.result === undefined ? null : "[provider-result]";
      }
      return out;
    }
    case "event": {
      const event = m.event as { event_type?: unknown; data?: Record<string, unknown> } | undefined;
      if (event?.event_type !== "state_changed") return null;
      const data = event.data ?? {};
      const pseudonym = typeof data.entity_id === "string" ? pseudonyms[data.entity_id] : undefined;
      if (!pseudonym) return null;
      const sanitized: Record<string, Json> = { entity_id: pseudonym };
      const next = sanitizeState(data.new_state, pseudonyms);
      const previous = sanitizeState(data.old_state, pseudonyms);
      if (next !== undefined) sanitized.new_state = next;
      if (previous !== undefined) sanitized.old_state = previous;
      return { ...out, event: { event_type: "state_changed", data: sanitized } };
    }
    default:
      return null;
  }
}

const PRIVATE_ADDRESS = /\b(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/;
const URL_LIKE = /\b(?:wss?|https?):\/\//i;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;

/**
 * Reasons this text may not be kept, empty when it may. Checks for the given secrets verbatim, anything
 * shaped like a token or a URL, private addresses, user-id and context fields, entity ids that are not
 * pseudonyms, and attributes.
 */
export function findSensitiveContent(text: string, options: { secrets?: readonly string[]; entityIds?: readonly string[] } = {}): string[] {
  const reasons: string[] = [];
  for (const secret of options.secrets ?? []) if (secret && text.includes(secret)) reasons.push("contains a configured secret");
  for (const entity of options.entityIds ?? []) if (entity && text.includes(entity)) reasons.push("contains a real entity id");
  if (JWT_LIKE.test(text)) reasons.push("contains a token-shaped string");
  if (URL_LIKE.test(text)) reasons.push("contains a URL");
  if (PRIVATE_ADDRESS.test(text)) reasons.push("contains a private network address");
  if (/"user_id"|"context"|"parent_id"/.test(text)) reasons.push("contains a context or user id");
  if (/"attributes"|"friendly_name"/.test(text)) reasons.push("contains entity attributes");
  return reasons;
}

/**
 * The key paths of a message, used to compare live messages against the synthetic M4B fixtures by
 * shape (never by value). Arrays contribute their first element's paths under `[]`.
 */
export function messageShape(message: unknown, prefix = ""): string[] {
  if (Array.isArray(message)) return message.length ? messageShape(message[0], `${prefix}[]`) : [`${prefix}[]`];
  if (!message || typeof message !== "object") return prefix ? [prefix] : [];
  return Object.keys(message as object)
    .sort()
    .flatMap((key) => messageShape((message as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key));
}
