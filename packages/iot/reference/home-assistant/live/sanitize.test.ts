import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/messages.json";
import { readLiveConfig } from "./config";
import { findSensitiveContent, messageShape, sanitizeHomeAssistantMessage } from "./sanitize";

const pseudonyms = { "light.living_room_lamp": "device-1.power" };
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0In0.signature-part";

/** A worst-case message set: everything a real instance could send that must not be kept. */
const raw = [
  { type: "auth", access_token: TOKEN },
  { type: "auth_invalid", message: "Invalid access token or password from 192.168.1.20" },
  {
    id: 2,
    type: "result",
    success: true,
    result: [
      { entity_id: "light.living_room_lamp", state: "off", attributes: { friendly_name: "Private Name's lamp", ip: "192.168.1.40" }, last_changed: "2026-10-08T09:00:00+00:00", last_updated: "2026-10-08T09:00:00+00:00", context: { id: "c", parent_id: null, user_id: "u-123" } },
      { entity_id: "lock.front_door", state: "locked", attributes: {}, last_changed: "x", last_updated: "x" },
    ],
  },
  { id: 3, type: "call_service", domain: "light", service: "turn_on", target: { entity_id: "light.living_room_lamp" } },
  { id: 3, type: "result", success: true, result: { context: { id: "c", parent_id: null, user_id: "u-123" } } },
  { id: 4, type: "result", success: false, error: { code: "home_assistant_error", message: "light.living_room_lamp at http://10.0.0.5:8123 failed" } },
  { id: 1, type: "event", event: { event_type: "state_changed", data: { entity_id: "lock.front_door", new_state: { entity_id: "lock.front_door", state: "unlocked" } } } },
  { id: 1, type: "event", event: { event_type: "state_changed", data: { entity_id: "light.living_room_lamp", old_state: { entity_id: "light.living_room_lamp", state: "off" }, new_state: { entity_id: "light.living_room_lamp", state: "on", attributes: { friendly_name: "Private Name's lamp" }, last_reported: "2026-10-08T09:00:01+00:00", context: { user_id: "u-123" } } } } },
  { type: "something_new", url: "https://ha.example.com" },
];

describe("evidence sanitizer", () => {
  const kept = raw.map((m) => sanitizeHomeAssistantMessage(m, pseudonyms)).filter((m) => m !== null);
  const text = JSON.stringify(kept);

  it("keeps nothing a live evidence file must not hold", () => {
    expect(findSensitiveContent(text, { secrets: [TOKEN], entityIds: ["light.living_room_lamp", "lock.front_door"] })).toEqual([]);
    expect(text).not.toMatch(/Private Name|front_door|u-123|192\.168|10\.0\.0|example\.com/);
  });

  it("keeps what the evidence needs: types, ids, outcomes, the pseudonymous state and Home Assistant's timestamps", () => {
    expect(kept).toContainEqual({ type: "auth", access_token: "[redacted]" });
    expect(kept).toContainEqual({ id: 3, type: "call_service", domain: "light", service: "turn_on", target: { entity_id: "device-1.power" } });
    expect(kept).toContainEqual({ id: 3, type: "result", success: true, result: "[provider-result]" });
    expect(kept).toContainEqual({ id: 4, type: "result", success: false, error: { code: "home_assistant_error" } });
    expect(kept).toContainEqual({
      id: 1,
      type: "event",
      event: { event_type: "state_changed", data: { entity_id: "device-1.power", old_state: { entity_id: "device-1.power", state: "off" }, new_state: { entity_id: "device-1.power", state: "on", last_reported: "2026-10-08T09:00:01+00:00" } } },
    });
    // The unrelated entity's event and the unknown message are dropped whole.
    expect(kept).toHaveLength(raw.length - 2);
  });

  it("flags unsanitized text", () => {
    expect(findSensitiveContent(JSON.stringify(raw), { secrets: [TOKEN] })).toEqual(
      expect.arrayContaining(["contains a configured secret", "contains a token-shaped string", "contains a URL", "contains a private network address", "contains a context or user id", "contains entity attributes"]),
    );
  });

  it("compares by shape, so live messages can be checked against the synthetic M4B fixtures", () => {
    const fixtureShapes = Object.values(fixtures as Record<string, unknown>).map((m) => messageShape(m));
    expect(fixtureShapes.length).toBeGreaterThan(5);
    expect(messageShape({ id: 1, type: "event", event: { event_type: "x", data: { entity_id: "a" } } })).toEqual(["event.data.entity_id", "event.event_type", "id", "type"]);
  });
});

describe("live configuration", () => {
  const good = { KX_HA_URL: "wss://ha.example.test/api/websocket", KX_HA_TOKEN: "t", KX_HA_ENTITY: "light.test_lamp", KX_HA_EVIDENCE_DIR: "/tmp/e" };

  it("has no defaults for the endpoint, the credential, the entity or the evidence location", () => {
    expect(readLiveConfig({})).toEqual({ ok: false, missing: ["KX_HA_URL", "KX_HA_TOKEN", "KX_HA_ENTITY", "KX_HA_EVIDENCE_DIR"], problems: [] });
  });

  it("never puts the token in the parsed config", () => {
    const result = readLiveConfig(good);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain('"t"');
  });

  it("refuses plain ws:// unless explicitly allowed, URLs with credentials, and anything but one light or switch", () => {
    const problems = (env: Record<string, string>) => {
      const r = readLiveConfig({ ...good, ...env });
      return r.ok ? [] : r.problems;
    };
    expect(problems({ KX_HA_URL: "ws://ha.local/api/websocket" })).toEqual(["KX_HA_URL must use wss:// (ws:// needs KX_HA_ALLOW_INSECURE=1)"]);
    expect(problems({ KX_HA_URL: "ws://ha.local/api/websocket", KX_HA_ALLOW_INSECURE: "1" })).toEqual([]);
    expect(problems({ KX_HA_URL: "wss://u:p@ha.example.test/api/websocket" })).toEqual(["KX_HA_URL must not carry credentials, a query string or a fragment"]);
    expect(problems({ KX_HA_URL: "wss://ha.example.test/api/websocket#x" })).toEqual(["KX_HA_URL must not carry credentials, a query string or a fragment"]);
    expect(problems({ KX_HA_ENTITY: "lock.front_door" })).toEqual(["KX_HA_ENTITY must be one light.* or switch.* entity"]);
  });
});
