/**
 * Test doubles for the M4C harness: a manual clock and an in-memory Home Assistant that speaks the
 * subset of the WebSocket protocol the session uses. Deterministic, no network, no credential.
 *
 * These model Home Assistant's documented behaviour (auth handshake, increasing ids, `state_changed`
 * events, a `call_service` result that only means "dispatched"). They are not evidence that a real
 * instance behaves this way: that is what the live run (`live-provider.e2e.ts`) is for.
 */
import type { HomeAssistantSocket, HomeAssistantSocketHandlers, SessionScheduler } from "../session";

/** A clock whose time only moves when a test says so. */
export function createManualClock(start: number) {
  let now = start;
  let seq = 0;
  const timers = new Map<number, { at: number; seq: number; callback: () => void }>();
  const scheduler: SessionScheduler = {
    setTimeout(callback, ms) {
      const id = ++seq;
      timers.set(id, { at: now + Math.max(0, ms), seq: id, callback });
      return id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
  };
  return {
    scheduler,
    now: () => now,
    pending: () => timers.size,
    /** Moves time forward, running every timer due on the way in order (including ones they schedule). */
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        let next: [number, { at: number; seq: number; callback: () => void }] | undefined;
        for (const entry of timers) if (entry[1].at <= target && (!next || entry[1].at < next[1].at || (entry[1].at === next[1].at && entry[1].seq < next[1].seq))) next = entry;
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
      }
      now = target;
    },
  };
}

export type ManualClock = ReturnType<typeof createManualClock>;

type EntityState = { state: string; last_changed: string; last_updated: string; last_reported: string };
type Connection = { handlers: HomeAssistantSocketHandlers; authed: boolean; subscriptions: Set<number>; lastId: number; open: boolean };
type HeldCall = { connection: Connection; id: number; entityId: string; service: string };

export type FakeHomeAssistantOptions = {
  clock: ManualClock;
  token: string;
  entities: Record<string, string>;
  /** Network delay for every message the fake sends. */
  latencyMs?: number;
  /**
   * How service calls behave. `auto`: reply success, then the device reports the new state after
   * `deviceDelayMs`. `hold`: nothing happens until the test calls `answer` / `applyState`.
   */
  calls?: "auto" | "hold";
  deviceDelayMs?: number;
};

export function createFakeHomeAssistant(options: FakeHomeAssistantOptions) {
  const { clock } = options;
  const latency = options.latencyMs ?? 10;
  const deviceDelay = options.deviceDelayMs ?? 200;
  const iso = (ms: number) => new Date(ms).toISOString().replace("Z", "+00:00");
  const states = new Map<string, EntityState>();
  for (const [entityId, state] of Object.entries(options.entities)) {
    const at = iso(clock.now() - 60_000);
    states.set(entityId, { state, last_changed: at, last_updated: at, last_reported: at });
  }
  const connections: Connection[] = [];
  /** Every message any client sent, parsed. Assertions read this to prove what was (not) sent. */
  const received: Record<string, unknown>[] = [];
  const held: HeldCall[] = [];
  let mode = options.calls ?? "auto";
  /** Handshake request types the fake answers with an error, once each. */
  const refusals = new Set<string>();

  const deliver = (connection: Connection, message: unknown, delay = latency) => {
    clock.scheduler.setTimeout(() => {
      if (connection.open) connection.handlers.message(JSON.stringify(message));
    }, delay);
  };

  const stateObject = (entityId: string) => ({ entity_id: entityId, attributes: { friendly_name: "Private name" }, context: { id: "ctx", parent_id: null, user_id: "user-secret" }, ...states.get(entityId)! });

  const broadcast = (entityId: string, previous: EntityState | undefined) => {
    for (const connection of connections) {
      if (!connection.open || !connection.authed) continue;
      for (const subscription of connection.subscriptions) {
        deliver(connection, {
          id: subscription,
          type: "event",
          event: {
            event_type: "state_changed",
            data: { entity_id: entityId, old_state: previous ? { entity_id: entityId, ...previous } : null, new_state: stateObject(entityId) },
          },
        });
      }
    }
  };

  const fake = {
    received,
    connections,
    /** `session.connect` for tests. */
    connect(handlers: HomeAssistantSocketHandlers): HomeAssistantSocket {
      const connection: Connection = { handlers, authed: false, subscriptions: new Set(), lastId: 0, open: true };
      connections.push(connection);
      deliver(connection, { type: "auth_required", ha_version: "2026.10.0" });
      return {
        send(data: string) {
          if (!connection.open) return;
          const message = JSON.parse(data) as Record<string, unknown>;
          received.push(message);
          fake.handle(connection, message);
        },
        close() {
          connection.open = false;
        },
      };
    },
    handle(connection: Connection, message: Record<string, unknown>) {
      if (message.type === "auth") {
        if (message.access_token === options.token) {
          connection.authed = true;
          deliver(connection, { type: "auth_ok", ha_version: "2026.10.0" });
        } else {
          deliver(connection, { type: "auth_invalid", message: "Invalid access token or password" });
          clock.scheduler.setTimeout(() => fake.drop(connection), latency + 1);
        }
        return;
      }
      if (!connection.authed) return;
      const id = message.id as number;
      // Home Assistant closes the connection on a non-increasing id; this fake records it for tests to assert on.
      if (!(id > connection.lastId)) throw new Error(`message id ${id} did not increase (last ${connection.lastId})`);
      connection.lastId = id;
      if (refusals.delete(message.type as string)) {
        deliver(connection, { id, type: "result", success: false, error: { code: "unknown_error", message: "refused by the test" } });
        return;
      }
      switch (message.type) {
        case "subscribe_events":
          connection.subscriptions.add(id);
          deliver(connection, { id, type: "result", success: true, result: null });
          return;
        case "unsubscribe_events":
          connection.subscriptions.delete(message.subscription as number);
          deliver(connection, { id, type: "result", success: true, result: null });
          return;
        case "get_states":
          deliver(connection, { id, type: "result", success: true, result: [...states.keys()].map(stateObject) });
          return;
        case "call_service": {
          const entityId = (message.target as { entity_id: string }).entity_id;
          const call: HeldCall = { connection, id, entityId, service: message.service as string };
          if (mode === "hold") {
            held.push(call);
            return;
          }
          fake.answer(call);
          clock.scheduler.setTimeout(() => fake.applyState(entityId, call.service === "turn_on" ? "on" : "off"), deviceDelay);
          return;
        }
      }
    },
    /** Answers the next `subscribe_events` or `get_states` with an error result. */
    refuseNext(type: "subscribe_events" | "get_states") {
      refusals.add(type);
    },
    /** Switch between automatic and held service calls mid-scenario. */
    setCalls(next: "auto" | "hold") {
      mode = next;
    },
    /** Held service calls, oldest first. */
    held,
    /** Replies to a held call: success (dispatched) by default, or an error code. */
    answer(call: HeldCall, error?: string) {
      const index = held.indexOf(call);
      if (index >= 0) held.splice(index, 1);
      deliver(
        call.connection,
        error
          ? { id: call.id, type: "result", success: false, error: { code: error, message: `Free text naming ${call.entityId}` } }
          : { id: call.id, type: "result", success: true, result: { context: { id: "ctx", parent_id: null, user_id: "user-secret" } } },
      );
    },
    /** The device reports a state now (a command took effect, or someone pressed its own switch). */
    applyState(entityId: string, state: string, observedAt = clock.now()) {
      const previous = states.get(entityId);
      const at = iso(observedAt);
      const changed = previous?.state !== state;
      states.set(entityId, { state, last_changed: changed ? at : (previous?.last_changed ?? at), last_updated: at, last_reported: at });
      broadcast(entityId, previous);
    },
    /** Sends a raw message to the newest open connection: a late or replayed reply, an old event. */
    inject(message: unknown, delay = latency) {
      const connection = [...connections].reverse().find((c) => c.open);
      if (connection) deliver(connection, message, delay);
    },
    /** Closes a connection from the server side (network loss, Home Assistant restart). */
    drop(connection = [...connections].reverse().find((c) => c.open)) {
      if (!connection || !connection.open) return;
      connection.open = false;
      connection.handlers.close();
    },
    state: (entityId: string) => states.get(entityId)?.state,
    openConnections: () => connections.filter((c) => c.open).length,
  };
  return fake;
}

export type FakeHomeAssistant = ReturnType<typeof createFakeHomeAssistant>;
