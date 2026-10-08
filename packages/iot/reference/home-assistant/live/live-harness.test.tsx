import { act, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { resolveControlState, selectCapabilityLifecycle, selectDeviceConnectivity, type KinetixPowerState } from "../../../src/functions";
import { createLightIntegration, LightSwitch, type LightIntegration, type HomeAssistantTransport } from "../example-app";
import { createDiagnosticsRecorder } from "./diagnostics";
import { createHomeAssistantSession, type HomeAssistantSession } from "./session";
import { createFakeHomeAssistant, createManualClock, type FakeHomeAssistant, type ManualClock } from "./testing/fake-home-assistant";

/**
 * M4C-A evidence matrix, AUTOMATED column: the reference session + adapter + ledger + a rendered
 * DevicePowerControl, against an in-memory Home Assistant double on a manual clock. Each `S##` test is one
 * row of the matrix in docs/iot/DEVICE-INTERACTION-CONTRACT.md §11. Passing here is fixture evidence only;
 * it says nothing about a real instance or a real lamp.
 */

const LAMP = "light.test_lamp";
const TOKEN = "test-token-not-a-secret";
const START = Date.parse("2026-10-08T09:00:00Z");
const TIMEOUT = 10_000;

type Harness = {
  clock: ManualClock;
  ha: FakeHomeAssistant;
  integration: LightIntegration;
  session: HomeAssistantSession;
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>;
  /** Advance the clock inside act(), so the rendered control keeps up. */
  advance(ms: number): void;
  power(): ReturnType<typeof selectCapabilityLifecycle<KinetixPowerState>>;
  link(): string;
  control(): ReturnType<typeof resolveControlState>;
  sent(type: string): Record<string, unknown>[];
  request(value: "on" | "off"): void;
};

let harness: Harness | undefined;
afterEach(() => {
  harness?.session.stop();
  harness?.integration.dispose();
  harness = undefined;
});

function setup(options: { initial?: "on" | "off"; calls?: "auto" | "hold"; token?: string } = {}): Harness {
  const clock = createManualClock(START);
  const ha = createFakeHomeAssistant({ clock, token: TOKEN, entities: { [LAMP]: options.initial ?? "off", "switch.unrelated_heater": "on" }, calls: options.calls ?? "hold" });
  const diagnostics = createDiagnosticsRecorder({ now: clock.now });
  let n = 0;
  // The session is the integration's transport; it is created after the integration it drives.
  const transport: HomeAssistantTransport = { send: () => null };
  const integration = createLightIntegration({
    transport,
    entities: { [LAMP]: { deviceId: "lamp", capabilityId: "power" } },
    now: clock.now,
    nextCommandId: () => `cmd-${++n}`,
    timeoutMs: TIMEOUT,
    scheduler: clock.scheduler,
    onTransitions: diagnostics.onTransitions,
  });
  const session = createHomeAssistantSession({ connect: ha.connect, accessToken: () => options.token ?? TOKEN, integration, scheduler: clock.scheduler, reconnectDelaysMs: [1_000, 2_000] });
  transport.send = session.send;
  const h: Harness = {
    clock,
    ha,
    integration,
    session,
    diagnostics,
    advance: (ms) => act(() => clock.advance(ms)),
    power: () => selectCapabilityLifecycle<KinetixPowerState>(integration.getLedger(), "lamp", "power"),
    link: () => selectDeviceConnectivity(integration.getLedger(), "lamp").state,
    control: () => resolveControlState({ connectivity: selectDeviceConnectivity(integration.getLedger(), "lamp"), lifecycle: h.power() }),
    sent: (type) => ha.received.filter((m) => m.type === type),
    request: (value) => act(() => integration.request("lamp", "power", value)),
  };
  harness = h;
  session.start();
  clock.advance(50);
  return h;
}

const switchControl = () => screen.getByRole("switch", { name: "Test lamp" });
const describedBy = () => document.getElementById(switchControl().getAttribute("aria-describedby") ?? "")?.textContent ?? "";

describe("M4C-A matrix (automated, fixture double)", () => {
  it("S01 initial state: the device's reported state is displayed once the session is ready", () => {
    const h = setup({ initial: "on" });
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    expect(h.session.status()).toBe("ready");
    expect(h.link()).toBe("online");
    expect(h.power()).toMatchObject({ stage: "idle", confirmedValue: "on" });
    expect(switchControl()).toHaveAttribute("aria-checked", "true");
    // The unrelated entity never entered the ledger.
    expect(Object.keys(h.integration.getLedger().devices)).toEqual(["lamp"]);
  });

  it("S02 request ON: recorded as requested, reported state unchanged, one service call sent", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    h.request("on");
    expect(h.power()).toMatchObject({ stage: "requested", confirmedValue: "off", requestedValue: "on", commandId: "cmd-1" });
    expect(h.sent("call_service")).toEqual([expect.objectContaining({ service: "turn_on", target: { entity_id: LAMP } })]);
    expect(switchControl()).toHaveAttribute("aria-checked", "false");
    expect(switchControl()).toHaveAttribute("data-pending");
  });

  it("S03 provider acknowledgement: acknowledged, not confirmed", () => {
    const h = setup();
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "acknowledged", confirmedValue: "off", requestedValue: "on" });
    expect(h.control().phase).toBe("requested");
  });

  it("S04 device reports ON: the request is confirmed", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    act(() => h.ha.applyState(LAMP, "on"));
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "confirmed", confirmedValue: "on", commandId: "cmd-1" });
    expect(switchControl()).toHaveAttribute("aria-checked", "true");
    expect(switchControl()).not.toHaveAttribute("data-pending");
  });

  it("S05 request OFF while ON is open: the new request supersedes the old one", () => {
    const h = setup();
    h.request("on");
    h.request("off");
    expect(h.power()).toMatchObject({ stage: "requested", requestedValue: "off", commandId: "cmd-2", supersededCommandIds: ["cmd-1"] });
    expect(h.sent("call_service").map((m) => m.service)).toEqual(["turn_on", "turn_off"]);
  });

  it("S06 device reports OFF: confirmed OFF", () => {
    const h = setup({ initial: "on" });
    h.request("off");
    h.ha.answer(h.ha.held[0]!);
    h.ha.applyState(LAMP, "off");
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "confirmed", confirmedValue: "off" });
  });

  it("S07 physical switch OFF: the UI updates with no app-originated request", () => {
    const h = setup({ initial: "on" });
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    act(() => h.ha.applyState(LAMP, "off"));
    h.advance(20);
    expect(h.sent("call_service")).toEqual([]);
    expect(h.power()).toMatchObject({ stage: "idle", confirmedValue: "off" });
    expect(switchControl()).toHaveAttribute("aria-checked", "false");
  });

  it("S08 provider disconnect: connectivity changes, the pending command is not failed, the view comes back", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    act(() => h.ha.drop());
    expect(h.session.status()).toBe("waiting-to-reconnect");
    expect(h.link()).toBe("connecting");
    expect(h.power()).toMatchObject({ stage: "acknowledged", requestedValue: "on", confirmedValue: "off" });
    expect(describedBy()).toBe("Connecting to the device. The requested change is not yet confirmed. Showing the last known setting");
    // Not re-sent on reconnect: reconnecting restores the view, not commands.
    h.advance(1_100);
    expect(h.session.status()).toBe("ready");
    expect(h.sent("call_service")).toHaveLength(1);
    expect(h.ha.openConnections()).toBe(1);
  });

  it("S09 device unavailable: offline is shown truthfully and a pending request is 'not confirmed', never 'in progress'", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    h.request("on");
    act(() => h.ha.applyState(LAMP, "unavailable"));
    h.advance(20);
    expect(h.link()).toBe("offline");
    expect(h.power()).toMatchObject({ stage: "requested", confirmedValue: "off" });
    expect(describedBy()).toBe("Device offline. The requested change is not confirmed. Showing the last known setting");
    expect(describedBy()).not.toMatch(/not yet|turning/i);
  });

  it("S10 app reconnect: restoring the link does not confirm the pending request", () => {
    const h = setup();
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    h.ha.drop();
    h.advance(1_100);
    expect(h.link()).toBe("online");
    expect(h.power()).toMatchObject({ stage: "acknowledged", confirmedValue: "off", requestedValue: "on" });
    expect(h.control().phase).toBe("requested");
  });

  it("S11 reconnect reports an unexpected value: the reported state updates, the request stays unconfirmed", () => {
    const h = setup();
    h.request("on");
    h.ha.drop();
    // While we were away someone else turned it on and off again; the snapshot says off, observed after our request.
    h.clock.advance(500);
    h.ha.applyState(LAMP, "off");
    h.advance(1_100);
    expect(h.power()).toMatchObject({ stage: "requested", confirmedValue: "off", requestedValue: "on" });
  });

  it("S12 reconnect reports the requested value: confirmation follows the usual correlation and timing rules", () => {
    const h = setup();
    h.request("on");
    h.ha.drop();
    h.clock.advance(300);
    h.ha.applyState(LAMP, "on");
    h.advance(1_100);
    expect(h.power()).toMatchObject({ stage: "confirmed", confirmedValue: "on", commandId: "cmd-1" });
  });

  it("S13 exact timeout deadline: the one-shot timer at the deadline expires the request, as timed-out, not rejected", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.advance(TIMEOUT - 1);
    expect(h.power().stage).toBe("acknowledged");
    h.advance(1);
    expect(h.power()).toMatchObject({ stage: "timed-out", confirmedValue: "off", requestedValue: "on" });
    expect(h.power().reasonCode).not.toBe("rejected");
    // The control no longer implies progress.
    expect(h.control()).toMatchObject({ phase: "failed", interactive: true });
    expect(switchControl()).not.toHaveAttribute("data-pending");
    // The diagnostics keep the expired request.
    expect(h.diagnostics.records).toContainEqual(expect.objectContaining({ cause: "expire", command: "cmd-1", lifecycle: { from: "acknowledged", to: "timed-out" } }));
  });

  it("S14 late response: a reply after the deadline is decided by the existing lifecycle rules", () => {
    const h = setup();
    h.request("on");
    h.advance(TIMEOUT);
    expect(h.power().stage).toBe("timed-out");
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    // An acknowledgement cannot reopen a timed-out request.
    expect(h.power().stage).toBe("timed-out");
    // A later report of the requested value is still the device's truth (M4A late-confirmation rule).
    h.ha.applyState(LAMP, "on");
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
  });

  it("S15 superseded command response: cannot overwrite the current command", () => {
    const h = setup();
    h.request("on");
    h.request("off");
    const [first, second] = h.ha.held;
    h.ha.answer(first!, "home_assistant_error");
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "requested", commandId: "cmd-2", requestedValue: "off" });
    h.ha.answer(second!);
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "acknowledged", commandId: "cmd-2" });
    expect(h.diagnostics.records).toContainEqual(expect.objectContaining({ cause: "result", command: "cmd-1", rejection: "stale-response" }));
  });

  it("S16 out-of-order device report: an older observation cannot overwrite newer truth", () => {
    const h = setup();
    h.ha.applyState(LAMP, "on");
    h.advance(20);
    const older = new Date(START - 5_000).toISOString();
    h.ha.inject({ id: 1, type: "event", event: { event_type: "state_changed", data: { entity_id: LAMP, new_state: { entity_id: LAMP, state: "off", last_updated: older, last_reported: older } } } });
    h.advance(20);
    expect(h.power()).toMatchObject({ confirmedValue: "on" });
    expect(h.diagnostics.records).toContainEqual(expect.objectContaining({ cause: "report", rejection: "stale-report" }));
  });

  it("S17 unsupported command: nothing is sent and no pending state is fabricated", () => {
    const h = setup();
    render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    act(() => h.integration.request("lamp", "power", 0.5));
    expect(h.sent("call_service")).toEqual([]);
    expect(h.power()).toMatchObject({ stage: "failed", reasonCode: "unsupported", confirmedValue: "off" });
    expect(switchControl()).not.toHaveAttribute("data-pending");
  });

  it("S17b not connected: a request while reconnecting is refused as not sent, never queued or replayed", () => {
    const h = setup();
    h.ha.drop();
    h.request("on");
    expect(h.power()).toMatchObject({ stage: "failed", reasonCode: "not-sent" });
    h.advance(1_100);
    expect(h.sent("call_service")).toEqual([]);
  });

  it("S18 provider rejection: shown as rejected only when Home Assistant explicitly reports an error", () => {
    const h = setup();
    h.request("on");
    h.ha.answer(h.ha.held[0]!, "service_validation_error");
    h.advance(20);
    expect(h.power()).toMatchObject({ stage: "failed", reasonCode: "invalid-request", confirmedValue: "off" });
    // Silence is not a rejection.
    const quiet = setup();
    quiet.request("on");
    quiet.advance(TIMEOUT - 1);
    expect(quiet.power().stage).toBe("requested");
  });

  it("S19 rapid repeated toggles: the latest request and its correlation stay consistent", () => {
    const h = setup({ calls: "auto" });
    h.request("on");
    h.request("off");
    h.request("on");
    expect(h.sent("call_service").map((m) => [m.id, m.service])).toEqual([
      [3, "turn_on"],
      [4, "turn_off"],
      [5, "turn_on"],
    ]);
    h.advance(1_000);
    expect(h.power()).toMatchObject({ stage: "confirmed", confirmedValue: "on", commandId: "cmd-3", supersededCommandIds: ["cmd-1", "cmd-2"] });
    expect(h.ha.state(LAMP)).toBe("on");
    // The two superseded acknowledgements were refused, not applied to cmd-3.
    expect(h.diagnostics.records.filter((r) => r.cause === "acknowledgement" && r.rejection === "stale-response").map((r) => r.command)).toEqual(["cmd-1", "cmd-2"]);
  });
  it("S20 boundary: after a full live-path run, nothing Home Assistant-specific is in the ledger", () => {
    const h = setup();
    h.request("on");
    h.ha.answer(h.ha.held[0]!, "service_validation_error");
    h.advance(20);
    h.request("off");
    h.ha.answer(h.ha.held[0]!);
    h.ha.applyState(LAMP, "off");
    h.ha.drop();
    h.advance(1_100);
    const ledger = JSON.stringify(h.integration.getLedger());
    expect(ledger).not.toMatch(/light\.|switch\.|entity_id|call_service|turn_on|turn_off|context|user_id|attributes|service_validation_error|home_assistant_error|Free text/);
    expect(JSON.stringify(h.diagnostics.records)).not.toMatch(/light\.|entity_id|service_validation_error|Free text/);
  });
});

describe("M4C-A reconnection state model (brief §5)", () => {
  it("walks requested → acknowledged → link lost → reconnect still OFF → device ON → confirmed, never conflating the four facts", () => {
    const h = setup();
    const facts = () => ({ reported: h.power().confirmedValue, requested: h.power().requestedValue, stage: h.power().stage, link: h.link() });
    expect(facts()).toEqual({ reported: "off", requested: undefined, stage: "idle", link: "online" });
    h.request("on");
    expect(facts()).toEqual({ reported: "off", requested: "on", stage: "requested", link: "online" });
    h.ha.answer(h.ha.held[0]!);
    h.advance(20);
    expect(facts()).toEqual({ reported: "off", requested: "on", stage: "acknowledged", link: "online" });
    h.ha.drop();
    expect(facts()).toEqual({ reported: "off", requested: "on", stage: "acknowledged", link: "connecting" });
    h.advance(1_100);
    expect(facts()).toEqual({ reported: "off", requested: "on", stage: "acknowledged", link: "online" });
    h.ha.applyState(LAMP, "on");
    h.advance(20);
    expect(facts()).toEqual({ reported: "on", requested: "on", stage: "confirmed", link: "online" });
  });

  it("…or the deadline wins: timed out, not rejected, and the control stops implying progress", () => {
    const h = setup();
    h.request("on");
    h.ha.answer(h.ha.held[0]!);
    h.ha.drop();
    h.advance(1_100);
    h.advance(TIMEOUT);
    expect(h.power()).toMatchObject({ stage: "timed-out", confirmedValue: "off", requestedValue: "on" });
    expect(h.control().phase).toBe("failed");
    expect(h.control().description).not.toMatch(/not yet|requested, not/i);
  });
});

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => v.id);
}

/**
 * Brief §6: the existing DevicePowerControl, unchanged, in every state the live path can produce. Each row
 * is what a sighted user reads, what a screen reader announces, and whether the control takes input.
 * Visual checks (zoom, narrow, themes, reduced motion) are the existing browser gates' job: no rendered
 * surface changed in M4C-A.
 */
const PRESENTATION: { state: string; arrange(): Harness; checked: boolean; pending: boolean; interactive: boolean; label: string; description: string | RegExp }[] = [
  { state: "online and idle", arrange: () => setup(), checked: false, pending: false, interactive: true, label: "Off", description: "" },
  { state: "requested, unconfirmed", arrange: () => { const h = setup(); h.request("on"); return h; }, checked: false, pending: true, interactive: false, label: "Turning on", description: "Change requested, not yet confirmed by the device" },
  { state: "acknowledged, unconfirmed", arrange: () => { const h = setup(); h.request("on"); h.ha.answer(h.ha.held[0]!); h.advance(20); return h; }, checked: false, pending: true, interactive: false, label: "Turning on", description: "Change requested, not yet confirmed by the device" },
  { state: "offline with a pending request", arrange: () => { const h = setup(); h.request("on"); h.ha.applyState(LAMP, "unavailable"); h.advance(20); return h; }, checked: false, pending: true, interactive: false, label: "Turning on", description: "Device offline. The requested change is not confirmed. Showing the last known setting" },
  { state: "reconnecting", arrange: () => { const h = setup(); h.ha.drop(); return h; }, checked: false, pending: false, interactive: false, label: "Off", description: "Connecting to the device. Showing the last known setting" },
  { state: "timed out", arrange: () => { const h = setup(); h.request("on"); h.advance(TIMEOUT); return h; }, checked: false, pending: false, interactive: true, label: "Off", description: /did not confirm in time, so the change may still apply/ },
  { state: "explicitly rejected", arrange: () => { const h = setup(); h.request("on"); h.ha.answer(h.ha.held[0]!, "unauthorized"); h.advance(20); return h; }, checked: false, pending: false, interactive: true, label: "Off", description: /Could not turn on\. The device still reports off/ },
  { state: "confirmed at the requested value", arrange: () => { const h = setup(); h.request("on"); h.ha.applyState(LAMP, "on"); h.advance(20); return h; }, checked: true, pending: false, interactive: true, label: "On", description: "" },
  { state: "physical override", arrange: () => { const h = setup({ initial: "on" }); h.ha.applyState(LAMP, "off"); h.advance(20); return h; }, checked: false, pending: false, interactive: true, label: "Off", description: "" },
  { state: "credential refused (status unknown)", arrange: () => setup({ token: "wrong" }), checked: false, pending: false, interactive: false, label: "Unknown", description: "Device status unknown" },
  { state: "unsupported value (nothing sent)", arrange: () => { const h = setup(); act(() => h.integration.request("lamp", "power", 0.5)); return h; }, checked: false, pending: false, interactive: true, label: "Off", description: /Could not turn off\. The device still reports off/ },
];

describe("M4C-A presentation (automated, fixture double)", () => {
  it.each(PRESENTATION)("$state", async (row) => {
    const h = row.arrange();
    const { container } = render(<LightSwitch integration={h.integration} deviceId="lamp" label="Test lamp" />);
    const el = switchControl();
    expect(el).toHaveAttribute("aria-checked", String(row.checked));
    expect(el.hasAttribute("data-pending")).toBe(row.pending);
    expect(el.hasAttribute("aria-busy")).toBe(row.pending);
    expect((el as HTMLButtonElement).disabled).toBe(!row.interactive);
    expect(el.parentElement!.textContent).toMatch(new RegExp(`^${row.label}`));
    const said = `${describedBy()} ${el.parentElement!.textContent}`;
    if (row.description === "") expect(describedBy()).toBe("");
    else expect(said).toMatch(row.description);
    // Nothing that is not progressing may read as progressing.
    if (!row.pending) expect(said).not.toMatch(/not yet confirmed|waiting for the device/i);
    expect(await axeViolations(container)).toEqual([]);
    // Keyboard: an interactive control is reachable and activates (a button: Space and Enter); a non-interactive one cannot take focus or send anything.
    const before = h.sent("call_service").length;
    el.focus();
    expect(document.activeElement).toBe(row.interactive ? el : document.body);
    if (row.interactive) {
      act(() => el.click());
      expect(h.sent("call_service").length).toBe(before + (h.session.status() === "ready" ? 1 : 0));
    }
  });

  it("has no adjusted-value state for binary power: the adapter can only report on or off (documented gap)", () => {
    const h = setup();
    h.request("on");
    h.ha.applyState(LAMP, "on");
    h.advance(20);
    expect(h.power().adjustedValue).toBeUndefined();
  });

  it("FINDING F1: Home Assistant's own 'unknown' state leaves the last known value on screen as if current", () => {
    // Recorded, not fixed: the M4B adapter deliberately reports no value for 'unknown'. Whether Home
    // Assistant emits 'unknown' for a live light (after a restart, say) needs the live run; see the report.
    const h = setup({ initial: "on" });
    h.ha.applyState(LAMP, "unknown");
    h.advance(20);
    expect(h.power()).toMatchObject({ confirmedValue: "on" });
    expect(h.control().availability).toBe("ready");
  });
});
