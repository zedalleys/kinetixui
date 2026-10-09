import { describe, expect, it } from "vitest";
import { selectCapabilityLifecycle, selectDeviceConnectivity } from "../../src/functions";
import { createLiveSession, validateEndpoint, type Socket } from "./live-session";

function harness(maxRetries = 3) {
  let now = 1_000;
  let command = 0;
  const sockets: (Socket & { sent: Record<string, unknown>[]; receive: (m: unknown) => void; closed: boolean })[] = [];
  const app = createLiveSession({
    endpoint: "wss://provider.example/api/websocket",
    entities: { "light.fixture": { deviceId: "lamp", capabilityId: "power" } },
    getToken: () => "synthetic-test-credential",
    now: () => now, nextCommandId: () => `command-${++command}`,
    timeoutMs: 100, retryMs: 10, maxRetries,
    connect: () => {
      const socket = { sent: [] as Record<string, unknown>[], closed: false,
        onmessage: null, onclose: null, onerror: null,
        send(data: string) { this.sent.push(JSON.parse(data)); },
        close() { this.closed = true; },
        receive(m: unknown) { (this as Socket).onmessage?.({ data: JSON.stringify(m) }); },
      };
      sockets.push(socket);
      return socket;
    },
  });
  const socket = () => sockets.at(-1)!;
  const result = (id: unknown, result: unknown = null, success = true) => socket().receive({ type: "result", id, success, result, error: success ? undefined : { code: "unauthorized", message: "synthetic" } });
  const state = (value = "off", time = now) => ({ entity_id: "light.fixture", state: value, last_updated: new Date(time).toISOString() });
  const ready = (value = "off") => {
    socket().receive({ type: "auth_required" });
    expect(socket().sent.at(-1)).toEqual({ type: "auth", access_token: "synthetic-test-credential" });
    socket().receive({ type: "auth_ok" });
    const subscription = socket().sent.at(-1)!.id;
    result(subscription);
    result(socket().sent.at(-1)!.id, [state(value)]);
    return subscription;
  };
  const event = (subscription: unknown, value: string, time = now) => socket().receive({ type: "event", id: subscription, event: { event_type: "state_changed", data: { entity_id: "light.fixture", new_state: state(value, time) } } });
  const lamp = () => selectCapabilityLifecycle(app.getLedger(), "lamp", "power")!;
  app.start();
  return { app, socket, sockets, ready, result, event, lamp, advance: (ms: number) => { now += ms; app.tick(); } };
}

describe("M4C-A application session (synthetic, no provider/hardware)", () => {
  it("authenticates, subscribes before snapshot, and keeps acceptance separate from confirmation", () => {
    const h = harness();
    expect(h.app.request("lamp", "on")).toBe(false);
    const sub = h.ready();
    expect(h.socket().sent.slice(1).map(m => m.type)).toEqual(["subscribe_events", "get_states"]);
    h.advance(1);
    expect(h.app.request("lamp", "on")).toBe(true);
    const call = h.socket().sent.at(-1)!;
    expect(call).toMatchObject({ type: "call_service", target: { entity_id: "light.fixture" } });
    h.result(call.id);
    expect(h.lamp()).toMatchObject({ stage: "acknowledged", confirmedValue: "off", commandId: "command-1" });
    h.event(sub, "on");
    expect(h.lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
    expect(JSON.stringify(h.app.getLedger())).not.toMatch(/synthetic-test-credential|entity_id|light\.fixture|access_token|wss:/);
  });

  it("routes request IDs to command IDs and ignores duplicates, unknown arrays and wrong subscriptions", () => {
    const h = harness(); const sub = h.ready(); h.advance(1);
    h.app.request("lamp", "on"); const a = h.socket().sent.at(-1)!.id;
    h.app.request("lamp", "off"); const b = h.socket().sent.at(-1)!.id;
    h.result(a);
    expect(h.lamp()).toMatchObject({ stage: "requested", commandId: "command-2" });
    h.result(999, [{ entity_id: "light.fixture", state: "on" }]);
    h.event(999, "on");
    expect(h.lamp().confirmedValue).toBe("off");
    h.result(b, null, false);
    expect(h.lamp()).toMatchObject({ stage: "failed", reasonCode: "forbidden", confirmedValue: "off" });
    h.result(b); h.event(sub, "on");
    expect(h.lamp().stage).toBe("failed");
    expect(h.lamp().confirmedValue).toBe("on");
    expect(h.app.status().pendingRequests).toBe(0);
  });

  it("expires at the exact deadline and a late report can still confirm", () => {
    const h = harness(); const sub = h.ready(); h.advance(1);
    h.app.request("lamp", "on"); const id = h.socket().sent.at(-1)!.id;
    h.advance(100);
    expect(h.lamp()).toMatchObject({ stage: "timed-out", confirmedValue: "off" });
    expect(h.app.status().pendingRequests).toBe(0);
    h.result(id); expect(h.lamp().stage).toBe("timed-out");
    h.event(sub, "on"); expect(h.lamp().stage).toBe("confirmed");
  });

  it("discards old callbacks, reconnects and resnapshots without replaying a pending command", () => {
    const h = harness(); h.ready(); h.advance(1); h.app.request("lamp", "on");
    const old = h.socket(); const callback = old.onmessage!; const id = old.sent.at(-1)!.id;
    old.onclose!();
    expect(h.lamp().stage).toBe("requested");
    expect(selectDeviceConnectivity(h.app.getLedger(), "lamp").state).toBe("connecting");
    expect(h.app.request("lamp", "off")).toBe(false);
    h.advance(10); h.ready();
    expect(h.socket().sent.filter(m => m.type === "call_service")).toHaveLength(0);
    h.app.request("lamp", "on");
    callback({ data: JSON.stringify({ type: "result", id: h.socket().sent.at(-1)!.id, success: true, result: null }) });
    h.result(id);
    expect(h.lamp().stage).toBe("requested");
    expect(h.socket().sent.filter(m => m.type === "call_service")).toHaveLength(1);
    h.app.stop(); h.advance(10_000);
    expect(h.sockets).toHaveLength(2);
  });

  it("lets a reconnect snapshot confirm, but rejects older observations", () => {
    const h = harness(); const sub = h.ready(); h.advance(1); h.app.request("lamp", "on");
    h.event(sub, "off", 2_000); h.event(sub, "on", 1_500);
    expect(h.lamp().confirmedValue).toBe("off");
    h.socket().onclose!(); h.advance(1_000); h.ready("on");
    expect(h.lamp().stage).toBe("confirmed");
  });

  it("bounds retry attempts and never retries authentication rejection", () => {
    const h = harness(1); h.advance(100);
    expect(h.app.status().fault).toBe("auth-timeout"); h.advance(10);
    h.advance(100); expect(h.app.status().phase).toBe("blocked");
    expect(selectDeviceConnectivity(h.app.getLedger(), "lamp").state).toBe("unknown"); h.advance(1000);
    expect(h.sockets).toHaveLength(2);
    const denied = harness(); denied.socket().receive({ type: "auth_invalid", message: "secret raw provider text" });
    denied.advance(1000); expect(denied.sockets).toHaveLength(1);
    expect(JSON.stringify(denied.app.status())).not.toMatch(/secret/);
    expect(selectDeviceConnectivity(denied.app.getLedger(), "lamp").state).toBe("unknown");
  });

  it("times out setup and rejects malformed, oversized or mismatched frames without throwing", () => {
    const h = harness(); h.socket().receive({ type: "auth_required" }); h.socket().receive({ type: "auth_ok" });
    h.advance(100); expect(h.app.status().fault).toBe("setup-timeout");
    for (const frame of ["{", "x".repeat(1_048_577), "null"]) {
      const bad = harness(); bad.socket().onmessage!({ data: frame });
      expect(bad.app.status().phase).toBe("retry");
    }
    const bad = harness(); const sub = bad.ready();
    bad.socket().receive({ type: "event", id: sub, event: { event_type: "state_changed", data: { entity_id: "light.fixture", new_state: { entity_id: "light.other", state: "on" } } } });
    expect(bad.app.status().fault).toBe("invalid-state");
  });

  it("handles send failure as uncertain, clears correlation, and sends no unsupported target", () => {
    const h = harness(); h.ready(); h.advance(1);
    expect(h.app.request("unmapped", "on")).toBe(false);
    h.socket().send = () => { throw new Error("secret"); };
    expect(h.app.request("lamp", "on")).toBe(false);
    expect(h.lamp().stage).toBe("requested");
    expect(h.app.status()).toMatchObject({ fault: "transport-send", pendingRequests: 0 });
    h.advance(100); expect(h.lamp().stage).toBe("timed-out");
  });

  it("does not send to unavailable or removed entities, and reconnect alone confirms nothing", () => {
    const h = harness(); const sub = h.ready(); h.advance(1); h.app.request("lamp", "on");
    h.event(sub, "unavailable");
    expect(h.lamp().stage).toBe("requested");
    expect(h.app.request("lamp", "off")).toBe(false);
    h.socket().receive({ type: "event", id: sub, event: { event_type: "state_changed", data: { entity_id: "light.fixture", new_state: null } } });
    expect(selectDeviceConnectivity(h.app.getLedger(), "lamp").state).toBe("unknown");
    h.socket().onclose!(); h.advance(10);
    expect(h.lamp().stage).toBe("requested"); h.ready();
    expect(h.lamp()).toMatchObject({ stage: "requested", confirmedValue: "off" });
  });

  it("ignores malformed snapshots and permanently blocks rejected subscriptions", () => {
    const h = harness(); h.socket().receive({ type: "auth_required" }); h.socket().receive({ type: "auth_ok" });
    h.result(h.socket().sent.at(-1)!.id, null, false);
    expect(h.app.status()).toMatchObject({ phase: "blocked", fault: "setup-rejected" });
    expect(selectDeviceConnectivity(h.app.getLedger(), "lamp").state).toBe("unknown");
    const bad = harness(); bad.socket().receive({ type: "auth_required" }); bad.socket().receive({ type: "auth_ok" });
    bad.result(bad.socket().sent.at(-1)!.id);
    bad.result(bad.socket().sent.at(-1)!.id, [{ entity_id: "light.fixture", state: "on", last_updated: "bad" }]);
    expect(bad.app.status().fault).toBe("invalid-snapshot");
    expect(bad.lamp().confirmedValue).toBeUndefined();
  });

  it("bounds unanswered commands and forgets them on expiry", () => {
    const h = harness(); h.ready(); h.advance(1);
    for (let i = 0; i < 64; i++) expect(h.app.request("lamp", i % 2 ? "off" : "on")).toBe(true);
    expect(h.app.request("lamp", "on")).toBe(false);
    h.advance(100); expect(h.app.status().pendingRequests).toBe(0);
  });
});

describe("endpoint security boundary", () => {
  it("requires TLS except explicit loopback, and rejects credentials/query/path confusion", () => {
    for (const url of ["ws://remote.example/api/websocket", "wss://user:pass@host/api/websocket", "wss://host/api/websocket?token=x", "wss://host/other", "https://host/api/websocket", "wss://host/api/websocket#x"]) {
      expect(() => validateEndpoint(url, true)).toThrow();
    }
    expect(() => validateEndpoint("ws://localhost/api/websocket")).toThrow();
    expect(validateEndpoint("ws://127.0.0.1/api/websocket", true)).toBe("ws://127.0.0.1/api/websocket");
    expect(validateEndpoint("wss://host/api/websocket")).toBe("wss://host/api/websocket");
  });
});
