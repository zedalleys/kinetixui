import { afterEach, describe, expect, it } from "vitest";
import { selectCapabilityLifecycle, selectDeviceConnectivity } from "../../../src/functions";
import { createLightIntegration, type LightIntegration, type HomeAssistantTransport } from "../example-app";
import { createHomeAssistantSession, type HomeAssistantSessionStatus } from "./session";
import { createFakeHomeAssistant, createManualClock } from "./testing/fake-home-assistant";

/** Session mechanics: handshake, credentials, ids, subscription, reconnect, cleanup. */

const LAMP = "light.test_lamp";
const TOKEN = "test-token-not-a-secret";

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

function setup(options: { token?: string; delays?: number[] } = {}) {
  const clock = createManualClock(Date.parse("2026-10-08T09:00:00Z"));
  const ha = createFakeHomeAssistant({ clock, token: TOKEN, entities: { [LAMP]: "off" }, calls: "hold" });
  const statuses: HomeAssistantSessionStatus[] = [];
  const wire: { direction: "in" | "out"; message: unknown }[] = [];
  let tokenReads = 0;
  let n = 0;
  // The session is the integration's transport; it is created after the integration it drives.
  const transport: HomeAssistantTransport = { send: () => null };
  const integration: LightIntegration = createLightIntegration({
    transport,
    entities: { [LAMP]: { deviceId: "lamp", capabilityId: "power" } },
    now: clock.now,
    nextCommandId: () => `cmd-${++n}`,
    timeoutMs: 10_000,
    scheduler: clock.scheduler,
  });
  const session = createHomeAssistantSession({
    connect: ha.connect,
    accessToken: () => {
      tokenReads++;
      return options.token ?? TOKEN;
    },
    integration,
    scheduler: clock.scheduler,
    reconnectDelaysMs: options.delays ?? [1_000, 2_000],
    onStatus: (s) => statuses.push(s),
    onWire: (direction, message) => wire.push({ direction, message }),
  });
  transport.send = session.send;
  cleanup = () => {
    session.stop();
    integration.dispose();
  };
  const link = () => selectDeviceConnectivity(integration.getLedger(), "lamp").state;
  const power = () => selectCapabilityLifecycle(integration.getLedger(), "lamp", "power");
  return { clock, ha, session, integration, statuses, wire, link, power, tokenReads: () => tokenReads };
}

describe("session: handshake and credentials", () => {
  it("authenticates, subscribes to state_changed, then takes a snapshot, and is ready only after the snapshot", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    expect(h.statuses).toEqual(["connecting", "authenticating", "subscribing", "ready"]);
    expect(h.ha.received.map((m) => m.type)).toEqual(["auth", "subscribe_events", "get_states"]);
    expect(h.ha.received[1]).toEqual({ id: 1, type: "subscribe_events", event_type: "state_changed" });
    expect(h.ha.received[2]).toEqual({ id: 2, type: "get_states" });
    expect(h.link()).toBe("online");
  });

  it("never passes the token to the wire log, and reads it only when authenticating", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    expect(h.tokenReads()).toBe(1);
    expect(JSON.stringify(h.wire)).not.toContain(TOKEN);
    expect(h.wire).toContainEqual({ direction: "out", message: { type: "auth", access_token: "[redacted]" } });
  });

  it("stops on a refused credential: no retry, and the devices read unknown rather than connecting", () => {
    const h = setup({ token: "wrong" });
    h.session.start();
    h.clock.advance(50);
    expect(h.session.status()).toBe("unauthorized");
    expect(h.link()).toBe("unknown");
    h.clock.advance(60_000);
    expect(h.ha.connections).toHaveLength(1);
    expect(h.tokenReads()).toBe(1);
  });

  it("refuses to carry a command before it is ready", () => {
    const h = setup();
    h.session.start();
    expect(h.session.send({ type: "call_service", domain: "light", service: "turn_on", target: { entity_id: LAMP } })).toBeNull();
    expect(h.ha.received).toEqual([]);
  });
});

describe("session: ids, reconnect and cleanup", () => {
  it("numbers messages from 1 on every connection and only upwards", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    h.integration.request("lamp", "power", "on");
    expect(h.ha.received.at(-1)).toMatchObject({ id: 3, type: "call_service" });
    h.ha.drop();
    h.clock.advance(1_100);
    expect(h.ha.received.slice(-2)).toEqual([
      { id: 1, type: "subscribe_events", event_type: "state_changed" },
      { id: 2, type: "get_states" },
    ]);
    h.integration.request("lamp", "power", "off");
    expect(h.ha.received.at(-1)).toMatchObject({ id: 3, type: "call_service", service: "turn_off" });
  });

  it("a reply id from the previous connection cannot acknowledge the old command on the new one", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    h.integration.request("lamp", "power", "on");
    h.ha.drop();
    h.clock.advance(1_100);
    // A message reusing id 3 (the old command's id) arrives on the new connection.
    h.ha.inject({ id: 3, type: "result", success: true, result: { context: { id: "x", parent_id: null, user_id: null } } });
    h.clock.advance(20);
    expect(h.power()).toMatchObject({ stage: "requested", commandId: "cmd-1" });
  });

  it("backs off between reconnect attempts, repeating the last delay, and resets after a good connection", () => {
    const h = setup({ delays: [1_000, 3_000] });
    h.session.start();
    h.clock.advance(50);
    const connectsAfter = (ms: number) => {
      const before = h.ha.connections.length;
      h.clock.advance(ms);
      return h.ha.connections.length - before;
    };
    h.ha.drop();
    expect(connectsAfter(999)).toBe(0);
    expect(connectsAfter(1)).toBe(1);
    h.ha.drop(); // dropped again before authenticating
    expect(connectsAfter(2_999)).toBe(0);
    expect(connectsAfter(1)).toBe(1);
    h.ha.drop();
    expect(connectsAfter(2_999)).toBe(0);
    expect(connectsAfter(1)).toBe(1);
    h.clock.advance(50);
    expect(h.session.status()).toBe("ready");
    h.ha.drop();
    expect(connectsAfter(1_000)).toBe(1);
  });

  it("stop() unsubscribes, closes, cancels a pending reconnect, and ignores anything the old socket still delivers", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    h.session.stop();
    expect(h.ha.received.at(-1)).toEqual({ id: 3, type: "unsubscribe_events", subscription: 1 });
    expect(h.ha.openConnections()).toBe(0);
    expect(h.session.status()).toBe("closed");
    expect(h.link()).toBe("unknown");
    h.ha.applyState(LAMP, "on");
    h.clock.advance(60_000);
    expect(h.power()).toMatchObject({ confirmedValue: "off" });
    expect(h.ha.connections).toHaveLength(1);

    const again = setup();
    again.session.start();
    again.clock.advance(50);
    again.ha.drop();
    again.session.stop();
    again.clock.advance(60_000);
    expect(again.ha.connections).toHaveLength(1);
    expect(again.clock.pending()).toBe(0);
  });

  it("does not retry a command after a reconnect", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    h.integration.request("lamp", "power", "on");
    for (let i = 0; i < 3; i++) {
      h.ha.drop();
      h.clock.advance(3_000);
    }
    expect(h.ha.received.filter((m) => m.type === "call_service")).toHaveLength(1);
  });

  it("schedules exactly one deadline per sent command and clears them on dispose", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    const before = h.clock.pending();
    h.integration.request("lamp", "power", "on");
    expect(h.clock.pending()).toBe(before + 1);
    h.integration.request("lamp", "power", "off");
    expect(h.clock.pending()).toBe(before + 2);
    h.integration.dispose();
    expect(h.clock.pending()).toBe(before);
  });

  it("tolerates unparseable and coalesced messages", () => {
    const h = setup();
    h.session.start();
    h.clock.advance(50);
    h.ha.connections[0]!.handlers.message("not json");
    h.ha.connections[0]!.handlers.message(JSON.stringify([{ type: "pong", id: 9 }, { type: "pong", id: 10 }]));
    expect(h.session.status()).toBe("ready");
    expect(h.wire.filter((w) => w.direction === "in" && (w.message as { type: string }).type === "pong")).toHaveLength(2);
  });
});
