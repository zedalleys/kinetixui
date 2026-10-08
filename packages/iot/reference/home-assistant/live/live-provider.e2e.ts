/**
 * M4C-B live-provider evidence run. MANUAL ONLY: never part of `pnpm test` or CI, because it needs an
 * authorized Home Assistant instance and talks to a real device.
 *
 *   KX_HA_URL=wss://<host>/api/websocket KX_HA_TOKEN=… KX_HA_ENTITY=light.<test_lamp> \
 *   KX_HA_EVIDENCE_DIR=<dir> pnpm --filter @kinetixui/iot test:live
 *
 * Run it on a server or workstation you control (the token lives only in that process's environment),
 * against ONE entity you are allowed to switch. It turns that entity on and off. With
 * KX_HA_PHYSICAL_WAIT_MS set, it waits that long for an operator to press the device's own switch.
 *
 * What it writes to KX_HA_EVIDENCE_DIR, all sanitized (`sanitize.ts`), and only if `findSensitiveContent`
 * finds nothing: `wire.json` (messages, entity renamed `device-1.power`), `diagnostics.json` (ledger
 * transitions), `results.json` (each live scenario: expected, observed, pass) and `shapes.json` (live
 * message shapes against the synthetic M4B fixtures). Without configuration every test is skipped and
 * nothing is written: live validation is then BLOCKED, never "passed".
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { selectCapabilityLifecycle, selectDeviceConnectivity } from "../../../src/functions";
import { createLightIntegration, type HomeAssistantTransport } from "../example-app";
import fixtures from "../fixtures/messages.json";
import { readLiveConfig } from "./config";
import { createDiagnosticsRecorder } from "./diagnostics";
import { findSensitiveContent, messageShape, sanitizeHomeAssistantMessage } from "./sanitize";
import { createHomeAssistantSession, type HomeAssistantSocket, type HomeAssistantSocketHandlers } from "./session";

const parsed = readLiveConfig(process.env);
const configured = parsed.ok;

describe.skipIf(!configured)("M4C-B live provider (manual)", () => {
  if (!parsed.ok) return;
  const config = parsed.config;
  const pseudonyms = { [config.entityId]: "device-1.power" };
  const wire: unknown[] = [];
  /** Every key path seen per message type, across all variants (subscription ack, snapshot, call result, error). */
  const shapes = new Map<string, Set<string>>();
  const results: { scenario: string; expected: string; observed: string; pass: boolean }[] = [];
  let lastSocket: WebSocket | null = null;

  const connect = (handlers: HomeAssistantSocketHandlers): HomeAssistantSocket => {
    const socket = new WebSocket(config.url);
    lastSocket = socket;
    socket.addEventListener("message", (event) => handlers.message(String(event.data)));
    socket.addEventListener("close", () => handlers.close());
    const queue: string[] = [];
    socket.addEventListener("open", () => queue.splice(0).forEach((data) => socket.send(data)));
    return {
      send: (data) => (socket.readyState === WebSocket.OPEN ? socket.send(data) : queue.push(data)),
      close: () => socket.close(),
    };
  };

  const diagnostics = createDiagnosticsRecorder({ now: Date.now });
  let n = 0;
  const run = `live-${Date.now()}`;
  // The session is the integration's transport; it is created after the integration it drives.
  const transport: HomeAssistantTransport = { send: () => null };
  const integration = createLightIntegration({
    transport,
    entities: { [config.entityId]: { deviceId: "device-1", capabilityId: "power" } },
    now: Date.now,
    nextCommandId: () => `${run}-${++n}`,
    timeoutMs: config.timeoutMs,
    scheduler: { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
    onTransitions: diagnostics.onTransitions,
  });
  const session = createHomeAssistantSession({
    connect,
    accessToken: () => process.env.KX_HA_TOKEN!,
    integration,
    scheduler: { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
    onWire: (_direction, message) => {
      const kept = sanitizeHomeAssistantMessage(message, pseudonyms);
      if (kept === null) return;
      wire.push(kept);
      const type = (kept as { type?: string }).type ?? "unknown";
      const paths = shapes.get(type) ?? new Set<string>();
      messageShape(kept).forEach((path) => paths.add(path));
      shapes.set(type, paths);
    },
  });
  transport.send = session.send;

  const power = () => selectCapabilityLifecycle(integration.getLedger(), "device-1", "power");
  const link = () => selectDeviceConnectivity(integration.getLedger(), "device-1").state;
  const waitFor = async (predicate: () => boolean, ms: number) => {
    const until = Date.now() + ms;
    while (!predicate() && Date.now() < until) await new Promise((r) => setTimeout(r, 25));
    return predicate();
  };
  const record = (scenario: string, expected: string, observed: string, pass: boolean) => {
    results.push({ scenario, expected, observed, pass });
    diagnostics.scenario(scenario);
  };
  const serviceCalls = () => wire.filter((m) => (m as { type?: string }).type === "call_service").length;
  const toggle = (value: unknown) => (value === "on" ? "off" : "on");

  afterAll(() => {
    session.stop();
    integration.dispose();
    const host = new URL(config.url).hostname;
    const files = {
      "wire.json": wire,
      "diagnostics.json": diagnostics.records,
      "results.json": results,
      "shapes.json": compareShapes(shapes),
    };
    for (const [name, content] of Object.entries(files)) {
      const text = JSON.stringify(content, null, 2);
      const reasons = findSensitiveContent(text, { secrets: [process.env.KX_HA_TOKEN!, host], entityIds: [config.entityId] });
      if (reasons.length) throw new Error(`Refusing to write ${name}: ${reasons.join(", ")}`);
      mkdirSync(config.evidenceDir, { recursive: true });
      writeFileSync(join(config.evidenceDir, name), `${text}\n`);
    }
  });

  it("L01 connects, authenticates and reads the real device state", async () => {
    diagnostics.scenario("L01 initial state");
    session.start();
    const ready = await waitFor(() => session.status() === "ready", 15_000);
    const observed = `session ${session.status()}, link ${link()}, reported ${String(power().confirmedValue)}`;
    record("L01 initial state", "session ready, link online, reported on|off", observed, ready && link() === "online" && (power().confirmedValue === "on" || power().confirmedValue === "off"));
    expect(ready).toBe(true);
  });

  it("L02–L04 request, acknowledgement, device-reported confirmation (and back)", async () => {
    for (const label of ["L02-L04 first toggle", "L05-L06 second toggle"]) {
      diagnostics.scenario(label);
      const want = toggle(power().confirmedValue);
      integration.request("device-1", "power", want);
      const commandId = power().commandId;
      const acked = await waitFor(() => diagnostics.records.some((r) => r.command === commandId && r.cause === "acknowledgement" && r.lifecycle?.to === "acknowledged"), config.timeoutMs);
      const ackWasNotConfirmation = diagnostics.records.filter((r) => r.command === commandId && r.cause === "acknowledgement").every((r) => r.lifecycle?.to !== "confirmed");
      const confirmed = await waitFor(() => power().stage === "confirmed" && power().commandId === commandId, config.timeoutMs);
      record(label, `ack → acknowledged (not confirmed), then a state_changed report confirms ${want}`, `acked ${acked}, ack-not-confirmation ${ackWasNotConfirmation}, stage ${power().stage}, reported ${String(power().confirmedValue)}`, acked && ackWasNotConfirmation && confirmed && power().confirmedValue === want);
      expect(confirmed).toBe(true);
    }
  });

  it("L07 physical switch: a report with no app request updates the state (operator window)", async () => {
    if (config.physicalWaitMs <= 0) {
      record("L07 physical switch", "operator presses the device's own switch", "not run: KX_HA_PHYSICAL_WAIT_MS unset (BLOCKED)", false);
      return;
    }
    diagnostics.scenario("L07 physical switch");
    const before = power().confirmedValue;
    const changed = await waitFor(() => power().confirmedValue !== before, config.physicalWaitMs);
    record("L07 physical switch", "reported state changes with no app request", `before ${String(before)}, after ${String(power().confirmedValue)}, stage ${power().stage}`, changed && (power().stage === "idle" || power().stage === "confirmed"));
  });

  it("L08–L10 link loss and reconnect: connecting, nothing failed or re-sent, the snapshot decides", async () => {
    diagnostics.scenario("L08-L10 reconnect");
    const want = toggle(power().confirmedValue);
    const callsBefore = serviceCalls();
    integration.request("device-1", "power", want);
    const commandId = power().commandId;
    lastSocket?.close();
    const connecting = await waitFor(() => link() === "connecting", 2_000);
    const stageWhileDown = power().stage;
    const back = await waitFor(() => session.status() === "ready", 15_000);
    const settled = await waitFor(() => power().stage === "confirmed" || power().stage === "timed-out", config.timeoutMs + 2_000);
    const sends = serviceCalls() - callsBefore;
    record(
      "L08-L10 reconnect",
      "link connecting while down; request not failed; one service call total for it; confirmed by report or timed out by its deadline",
      `connecting ${connecting}, stage while down ${stageWhileDown}, ready again ${back}, final ${power().stage} for ${power().commandId === commandId ? "same command" : "another command"}, call_service for it ${sends}`,
      connecting && stageWhileDown !== "failed" && back && settled && sends === 1,
    );
    expect(back).toBe(true);
  });

  it("L11 rapid toggles: superseded acknowledgements are refused, the last request settles", async () => {
    diagnostics.scenario("L11 rapid toggles");
    const first = toggle(power().confirmedValue);
    integration.request("device-1", "power", first);
    integration.request("device-1", "power", toggle(first));
    integration.request("device-1", "power", first);
    const last = power().commandId;
    const settled = await waitFor(() => power().stage === "confirmed" && power().commandId === last, config.timeoutMs);
    const refused = diagnostics.records.filter((r) => r.scenario === "L11 rapid toggles" && r.rejection === "stale-response").length;
    record("L11 rapid toggles", "last command confirmed; earlier acks refused as stale-response", `stage ${power().stage}, last ${power().commandId === last}, refused ${refused}`, settled && refused >= 2);
  });
});

/** Live message shapes against the synthetic fixtures': what the fixtures got wrong, if anything. */
function compareShapes(live: Map<string, Set<string>>) {
  const fixtureShapes = new Map<string, Set<string>>();
  for (const message of Object.values(fixtures as Record<string, unknown>)) {
    const type = (message as { type?: string })?.type;
    if (!type) continue;
    const set = fixtureShapes.get(type) ?? new Set();
    messageShape(message).forEach((path) => set.add(path));
    fixtureShapes.set(type, set);
  }
  return [...live].map(([type, seen]) => {
    const paths = [...seen].sort();
    const known = fixtureShapes.get(type);
    return { type, inFixtures: Boolean(known), onlyLive: known ? paths.filter((p) => !known.has(p)) : paths };
  });
}
