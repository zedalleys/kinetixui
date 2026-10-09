/** Application-side session, not a package export. Credentials belong to the server caller. */
import { applyDeviceSignals, createDeviceLedger, expireDeviceCommands, requestDeviceChange, selectDeviceConnectivity, type KinetixDeviceSignal } from "../../src/functions";
import { encodeHomeAssistantCommand, translateHomeAssistantMessage, type HomeAssistantEntityMap, type HomeAssistantMessage } from "./adapter";

export type Socket = {
  send(data: string): void;
  close(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
};
type Pending = { kind: "subscribe" | "snapshot" | "command"; deadline: number; commandId?: string };
type Phase = "stopped" | "auth-required" | "auth-ok" | "subscribing" | "snapshot" | "ready" | "retry" | "blocked";
type Message = Record<string, unknown>;
const object = (value: unknown): value is Message => value !== null && typeof value === "object" && !Array.isArray(value);

/** No arbitrary browser-supplied URL: a server operator configures exactly one endpoint. */
export function validateEndpoint(endpoint: string, allowLoopback = false): string {
  const url = new URL(endpoint);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "wss:" && !(allowLoopback && loopback && url.protocol === "ws:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/api/websocket") {
    throw new Error("Use wss://HOST/api/websocket; insecure ws requires explicit loopback opt-in");
  }
  return url.href;
}

export function createLiveSession(options: {
  endpoint: string;
  allowLoopback?: boolean;
  entities: HomeAssistantEntityMap;
  /** Called only by a trusted server-side owner, never exposed in diagnostics or the ledger. */
  getToken: () => string;
  connect: (endpoint: string) => Socket;
  now: () => number;
  nextCommandId: () => string;
  timeoutMs?: number;
  retryMs?: number;
  maxRetries?: number;
}) {
  const endpoint = validateEndpoint(options.endpoint, options.allowLoopback);
  const entities = Object.fromEntries(Object.entries(options.entities).map(([entity, target]) => {
    if (!/^(light|switch)\.[a-z0-9_]+$/.test(entity) || !target.deviceId || target.capabilityId !== "power") {
      throw new Error("Only explicitly mapped light/switch power targets are supported");
    }
    return [entity, { ...target }];
  }));
  const targets = Object.values(entities);
  if (!targets.length || new Set(targets.map(t => t.deviceId)).size !== targets.length) {
    throw new Error("Map each device to exactly one binary-power entity");
  }
  const timeoutMs = options.timeoutMs ?? 30_000;
  const retryMs = options.retryMs ?? 1_000;
  const maxRetries = options.maxRetries ?? 3;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(retryMs) || retryMs <= 0 ||
      !Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error("Invalid timeout/retry policy");
  let ledger = createDeviceLedger({ devices: targets.map(t => ({ deviceId: t.deviceId, capabilities: [t.capabilityId] })) });
  let socket: Socket | undefined;
  let generation = 0;
  let nextId = 1;
  let subscriptionId: number | undefined;
  let phase: Phase = "stopped";
  let phaseDeadline = 0;
  let retryAt = 0;
  let retries = 0;
  let fault: string | undefined;
  const pending = new Map<number, Pending>();
  const apply = (signals: KinetixDeviceSignal[]) => { ledger = applyDeviceSignals(ledger, signals, options.now()).ledger; };
  const detach = () => {
    generation++;
    const old = socket;
    socket = undefined;
    pending.clear();
    subscriptionId = undefined;
    if (old) {
      old.onmessage = old.onclose = old.onerror = null;
      try { old.close(); } catch { /* A failed transport is already detached. */ }
    }
  };
  const lost = (code: string, terminal = false) => {
    detach();
    fault = code; // Fixed codes only; never raw messages, URLs, credentials or exception text.
    apply(targets.map(t => ({ type: "connectivity", deviceId: t.deviceId, state: "connecting" })));
    phase = terminal || retries >= maxRetries ? "blocked" : "retry";
    retryAt = options.now() + retryMs * 2 ** retries;
  };
  const send = (message: Message, entry: Pending) => {
    const id = nextId++;
    pending.set(id, entry); // Correlate BEFORE sending, including synchronously replying test transports.
    try { socket!.send(JSON.stringify({ ...message, id })); } catch { lost("transport-send"); }
    return id;
  };
  const state = (value: unknown): boolean => object(value) && typeof value.entity_id === "string" &&
    typeof value.state === "string" && [value.last_reported, value.last_updated].every(v =>
      v === undefined || (typeof v === "string" && Number.isFinite(Date.parse(v))));
  const receive = (raw: unknown) => {
    if (typeof raw !== "string" || raw.length > 1_048_576) return lost("invalid-frame");
    let m: unknown;
    try { m = JSON.parse(raw); } catch { return lost("invalid-json"); }
    if (!object(m) || typeof m.type !== "string") return lost("invalid-message");
    if (m.type === "auth_invalid") return lost("auth-invalid", true);
    if (phase === "auth-required" && m.type === "auth_required") {
      phase = "auth-ok";
      phaseDeadline = options.now() + timeoutMs;
      try {
        const token = options.getToken();
        if (!token.trim()) return lost("missing-credential", true);
        socket!.send(JSON.stringify({ type: "auth", access_token: token }));
      } catch { lost("authentication-send", true); }
      return;
    }
    if (phase === "auth-ok" && m.type === "auth_ok") {
      phase = "subscribing";
      // Allocate before send so even a synchronous result belongs to this subscription.
      subscriptionId = nextId;
      send({ type: "subscribe_events", event_type: "state_changed" }, { kind: "subscribe", deadline: options.now() + timeoutMs });
      return;
    }
    if (m.type === "result" && Number.isSafeInteger(m.id) && typeof m.success === "boolean") {
      const id = m.id as number;
      const entry = pending.get(id);
      if (!entry) return; // Unknown, duplicate and old-session results are never snapshots.
      pending.delete(id);
      if (entry.kind === "command") {
        if (m.success && !object(m.result) && m.result !== null) return lost("invalid-result");
        if (!m.success && !object(m.error)) return lost("invalid-result");
        apply(translateHomeAssistantMessage(m as HomeAssistantMessage, { entities, commandIdForRequest: () => entry.commandId }));
      } else if (!m.success) {
        lost("setup-rejected", true);
      } else if (entry.kind === "subscribe") {
        phase = "snapshot";
        send({ type: "get_states" }, { kind: "snapshot", deadline: options.now() + timeoutMs });
      } else {
        if (!Array.isArray(m.result) || !m.result.every(state)) return lost("invalid-snapshot");
        apply(translateHomeAssistantMessage(m as HomeAssistantMessage, { entities }));
        phase = "ready";
        fault = undefined;
      }
      return;
    }
    if (m.type === "event" && m.id === subscriptionId && ["snapshot", "ready"].includes(phase)) {
      if (!object(m.event) || m.event.event_type !== "state_changed" || !object(m.event.data)) return lost("invalid-event");
      const data = m.event.data;
      if (typeof data.entity_id !== "string") return lost("invalid-event");
      if (data.new_state === null) {
        const target = entities[data.entity_id];
        if (target) apply([{ type: "connectivity", deviceId: target.deviceId, state: "unknown" }]);
      } else {
        if (!state(data.new_state) || (data.new_state as Message).entity_id !== data.entity_id) return lost("invalid-state");
        apply(translateHomeAssistantMessage(m as HomeAssistantMessage, { entities }));
      }
    }
  };
  const open = () => {
    detach();
    phase = "auth-required";
    phaseDeadline = options.now() + timeoutMs;
    const session = generation;
    try {
      socket = options.connect(endpoint);
      socket.onmessage = event => { if (session === generation) receive(event.data); };
      socket.onclose = () => { if (session === generation) lost("transport-closed"); };
      socket.onerror = () => { if (session === generation) lost("transport-error"); };
    } catch { lost("transport-connect"); }
  };
  return {
    getLedger: () => ledger,
    status: () => ({ phase, fault, retries, pendingRequests: pending.size }),
    start() { if (phase === "stopped") open(); },
    stop() { detach(); phase = "stopped"; },
    request(deviceId: string, value: "on" | "off") {
      if (value !== "on" && value !== "off") return false;
      if (phase !== "ready" || pending.size >= 64 || selectDeviceConnectivity(ledger, deviceId).state !== "online") return false;
      const update = requestDeviceChange(ledger, { commandId: options.nextCommandId(), deviceId, capabilityId: "power", value }, options.now());
      ledger = update.ledger;
      if (!update.intent) return false;
      const call = encodeHomeAssistantCommand(update.intent, { entities });
      if (!call) return false;
      send(call, { kind: "command", commandId: update.intent.commandId, deadline: options.now() + timeoutMs });
      // Send failure leaves an uncertain request; never retries a device command.
      return phase === "ready";
    },
    /** Server owner schedules this clock; deadlines include auth, setup and command expiry. */
    tick() {
      const now = options.now();
      ledger = expireDeviceCommands(ledger, now, { timeoutMs }).ledger;
      if (["auth-required", "auth-ok"].includes(phase) && now >= phaseDeadline) lost("auth-timeout");
      for (const [id, entry] of pending) {
        if (now < entry.deadline) continue;
        if (entry.kind !== "command") { lost("setup-timeout"); break; }
        pending.delete(id);
      }
      if (phase === "retry" && now >= retryAt) { retries++; open(); }
    },
  };
}
