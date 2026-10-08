/**
 * Home Assistant WebSocket session for the reference integration (M4C-A). APPLICATION code, like
 * `example-app.tsx`: a product team writes this, `@kinetixui/iot` never ships or imports it.
 *
 * It owns what the device ledger deliberately does not: the socket, the authentication handshake, the
 * `state_changed` subscription, message ids and their correlation, reconnecting, and cleanup. It feeds
 * every inbound message to the integration (which runs the pure adapter and the ledger) and is the
 * integration's transport for outbound service calls.
 *
 *   connect ─▶ auth_required ─▶ auth ─▶ auth_ok ─▶ subscribe_events(state_changed) ─▶ get_states ─▶ ready
 *      ▲                                   │
 *      │                              auth_invalid ─▶ unauthorized (stops; never retries a refused credential)
 *      └── backoff ◀── socket closed (not by us) ─▶ integration.linkLost()  (devices: connecting)
 *
 * Rules it keeps:
 * - The access token is read from `accessToken()` at the moment the `auth` message is sent and is never
 *   stored, logged or passed to `onWire` (which sees `[redacted]`). Run this on a server: a browser that
 *   can read the token can leak it.
 * - Message ids start at 1 on every connection and only go up, as Home Assistant requires. Ids from a
 *   closed connection mean nothing on the next one; the integration forgets them in `linkLost`.
 * - Reconnecting restores the VIEW (subscription and a fresh `get_states`), never a command. Nothing is
 *   queued while disconnected and nothing is re-sent: `send` returns `null` and the integration records
 *   the request as not sent. A command that was in flight when the link dropped stays open until a report,
 *   a result or its deadline settles it.
 * - Every timer goes through the injected scheduler, so tests (and evidence runs) are deterministic.
 */
import type { HomeAssistantMessage, HomeAssistantServiceCall } from "../adapter";

/** What the session needs from a socket. `connectNodeWebSocket` in `live-provider.e2e.ts` adapts a real one. */
export type HomeAssistantSocket = { send(data: string): void; close(): void };
export type HomeAssistantSocketHandlers = { message(data: string): void; close(): void };

export type SessionScheduler = {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

/** The integration surface the session drives. `createLightIntegration` satisfies it. */
export type SessionIntegration = {
  receive(message: HomeAssistantMessage): void;
  linkLost(): void;
  linkClosed(): void;
};

export type HomeAssistantSessionStatus =
  | "idle"
  | "connecting"
  | "authenticating"
  | "subscribing"
  | "ready"
  | "waiting-to-reconnect"
  | "unauthorized"
  | "closed";

export type HomeAssistantSessionOptions = {
  /** Opens a socket to the application's configured Home Assistant WebSocket endpoint. */
  connect(handlers: HomeAssistantSocketHandlers): HomeAssistantSocket;
  /** Server-side secret lookup, called once per authentication. */
  accessToken(): string;
  integration: SessionIntegration;
  scheduler: SessionScheduler;
  /** Delay before each reconnect attempt; the last value repeats. Reconnecting is for the view only. */
  reconnectDelaysMs?: readonly number[];
  onStatus?(status: HomeAssistantSessionStatus): void;
  /** Every message in and out, for evidence capture. Callers sanitize before keeping anything. */
  onWire?(direction: "in" | "out", message: unknown): void;
};

export const DEFAULT_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

export function createHomeAssistantSession(options: HomeAssistantSessionOptions) {
  const delays = options.reconnectDelaysMs?.length ? options.reconnectDelaysMs : DEFAULT_RECONNECT_DELAYS_MS;
  let status: HomeAssistantSessionStatus = "idle";
  let socket: HomeAssistantSocket | null = null;
  let nextId = 1;
  let subscriptionId: number | null = null;
  let statesRequestId: number | null = null;
  let attempt = 0;
  let reconnectTimer: unknown = null;
  /** Bumped per connection, so a late callback from a socket we already left changes nothing. */
  let generation = 0;

  const setStatus = (next: HomeAssistantSessionStatus) => {
    if (next === status) return;
    status = next;
    options.onStatus?.(next);
  };

  const write = (message: Record<string, unknown>, wire: Record<string, unknown> = message) => {
    options.onWire?.("out", wire);
    socket?.send(JSON.stringify(message));
  };

  const nextMessageId = () => nextId++;

  const open = () => {
    const mine = ++generation;
    nextId = 1;
    subscriptionId = null;
    statesRequestId = null;
    setStatus("connecting");
    socket = options.connect({
      message: (data) => {
        if (mine === generation) receive(data);
      },
      close: () => {
        if (mine === generation) dropped();
      },
    });
  };

  const receive = (data: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      options.onWire?.("in", { type: "unparseable" });
      return;
    }
    // Home Assistant may coalesce messages into an array when the client opts in; this client does not, but tolerates it.
    for (const message of Array.isArray(parsed) ? parsed : [parsed]) handle(message as HomeAssistantMessage);
  };

  const handle = (message: HomeAssistantMessage) => {
    options.onWire?.("in", message);
    switch (message.type) {
      case "auth_required":
        setStatus("authenticating");
        write({ type: "auth", access_token: options.accessToken() }, { type: "auth", access_token: "[redacted]" });
        return;
      case "auth_ok":
        attempt = 0;
        setStatus("subscribing");
        subscriptionId = nextMessageId();
        write({ id: subscriptionId, type: "subscribe_events", event_type: "state_changed" });
        // After the subscription, so no change can fall between the snapshot and the first event. The
        // ledger orders the two by observation time if they overlap.
        statesRequestId = nextMessageId();
        write({ id: statesRequestId, type: "get_states" });
        return;
      case "auth_invalid":
        // A refused credential does not get better by retrying it. Stop, and say we know nothing.
        stop("unauthorized");
        return;
    }
    options.integration.receive(message);
    if (message.type === "result" && message.id === statesRequestId) setStatus("ready");
  };

  const dropped = () => {
    socket = null;
    generation++;
    options.integration.linkLost();
    const delay = delays[Math.min(attempt, delays.length - 1)]!;
    attempt++;
    setStatus("waiting-to-reconnect");
    reconnectTimer = options.scheduler.setTimeout(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const stop = (final: "closed" | "unauthorized") => {
    if (reconnectTimer !== null) options.scheduler.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    const current = socket;
    if (current && subscriptionId !== null && status === "ready") write({ id: nextMessageId(), type: "unsubscribe_events", subscription: subscriptionId });
    generation++;
    socket = null;
    current?.close();
    options.integration.linkClosed();
    setStatus(final);
  };

  return {
    status: () => status,
    /** Opens the first connection. */
    start() {
      if (status === "idle" || status === "closed") open();
    },
    /** Unsubscribes, closes, cancels any reconnect, and leaves every device `unknown`. */
    stop() {
      if (status !== "closed" && status !== "unauthorized" && status !== "idle") stop("closed");
    },
    /**
     * The integration's transport. Returns the message id Home Assistant will echo, or `null` when the
     * session is not ready to carry a command (nothing is queued for later).
     */
    send(call: HomeAssistantServiceCall): number | null {
      if (status !== "ready" || !socket) return null;
      const id = nextMessageId();
      write({ id, ...call });
      return id;
    },
  };
}

export type HomeAssistantSession = ReturnType<typeof createHomeAssistantSession>;
