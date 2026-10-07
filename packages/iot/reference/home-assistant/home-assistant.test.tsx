import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  applyDeviceSignals,
  createDeviceLedger,
  isLifecyclePending,
  lifecycleToCommandStatus,
  resolveControlState,
  selectCapabilityLifecycle,
  selectDeviceConnectivity,
  type KinetixLedgerTransition,
} from "../../src/functions";
import { encodeHomeAssistantCommand, translateHomeAssistantMessage, type HomeAssistantMessage, type HomeAssistantServiceCall } from "./adapter";
import { createLightIntegration, LightSwitch } from "./example-app";
import fixtures from "./fixtures/messages.json";

/**
 * M4B reference proof: Home Assistant–shaped fixtures → adapter → normalized signals → ledger →
 * selectors → a real KinetixUI control, with no Home Assistant instance, network or credential.
 */

const messages = fixtures as unknown as Record<string, HomeAssistantMessage>;
const entities = {
  "light.desk_lamp": { deviceId: "desk-lamp", capabilityId: "power" },
  "switch.kettle_plug": { deviceId: "kettle", capabilityId: "power" },
};
const t = (iso: string) => Date.parse(iso);
const translate = (name: string, commandIdForRequest?: (id: number) => string | undefined) =>
  translateHomeAssistantMessage(messages[name]!, { entities, commandIdForRequest });

/** Strings that only exist on the provider side of the boundary. */
const PROVIDER_VOCABULARY = /entity_id|light\.|switch\.|call_service|context|turn_on|turn_off|ha_version|service_validation_error|attributes|Entity is not available/;

describe("adapter: Home Assistant message → signals", () => {
  it("translates the initial get_states into connectivity and power reports for mapped entities only", () => {
    expect(translate("initialStates")).toEqual([
      { type: "connectivity", deviceId: "desk-lamp", state: "online" },
      { type: "report", deviceId: "desk-lamp", capabilityId: "power", value: "off", observedAt: "2026-10-07T17:59:00.000000+00:00" },
      { type: "connectivity", deviceId: "kettle", state: "online" },
      { type: "report", deviceId: "kettle", capabilityId: "power", value: "on", observedAt: "2026-10-07T17:58:00.000000+00:00" },
    ]);
  });

  it("translates a state change, a physical toggle and an unavailable entity", () => {
    expect(translate("deskLampOn")).toContainEqual({ type: "report", deviceId: "desk-lamp", capabilityId: "power", value: "on", observedAt: "2026-10-07T18:00:01.200000+00:00" });
    expect(translate("deskLampPhysicalOff")).toContainEqual(expect.objectContaining({ type: "report", value: "off" }));
    expect(translate("deskLampUnavailable")).toEqual([{ type: "connectivity", deviceId: "desk-lamp", state: "offline" }]);
  });

  it("reports no value for Home Assistant's own 'unknown' state", () => {
    expect(translate("unknownState")).toEqual([{ type: "connectivity", deviceId: "kettle", state: "online" }]);
  });

  it("turns a service-call success into an acknowledgement, never a confirmation", () => {
    expect(translate("callServiceOk", (id) => (id === 10 ? "cmd-1" : undefined))).toEqual([{ type: "acknowledgement", commandId: "cmd-1" }]);
  });

  it("turns a service-call error into a rejected result with the application's code, not Home Assistant's", () => {
    expect(translate("callServiceError", (id) => (id === 11 ? "cmd-2" : undefined))).toEqual([
      { type: "result", commandId: "cmd-2", outcome: "rejected", code: "invalid-request" },
    ]);
  });

  it("ignores the handshake, pongs, and results the application did not correlate", () => {
    expect(translate("authOk")).toEqual([]);
    expect(translate("pong")).toEqual([]);
    expect(translate("callServiceOk")).toEqual([]);
  });

  it("emits no provider vocabulary in any signal", () => {
    for (const name of Object.keys(messages)) {
      if (name.startsWith("_")) continue;
      expect(JSON.stringify(translate(name, () => "cmd"))).not.toMatch(PROVIDER_VOCABULARY);
    }
  });
});

describe("adapter: intent → Home Assistant service call", () => {
  const intent = (deviceId: string, value: unknown, capabilityId = "power") => ({ commandId: "c", deviceId, capabilityId, value, requestedAt: "2026-10-07T18:00:00.000Z" });

  it("maps on and off to turn_on and turn_off in the entity's own domain", () => {
    expect(encodeHomeAssistantCommand(intent("desk-lamp", "on"), { entities })).toEqual({
      type: "call_service",
      domain: "light",
      service: "turn_on",
      target: { entity_id: "light.desk_lamp" },
    });
    expect(encodeHomeAssistantCommand(intent("kettle", false), { entities })).toEqual({
      type: "call_service",
      domain: "switch",
      service: "turn_off",
      target: { entity_id: "switch.kettle_plug" },
    });
  });

  it("returns null for anything it cannot express, so the application sends nothing", () => {
    expect(encodeHomeAssistantCommand(intent("garage", "on"), { entities })).toBeNull();
    expect(encodeHomeAssistantCommand(intent("desk-lamp", 0.5), { entities })).toBeNull();
    expect(encodeHomeAssistantCommand(intent("desk-lamp", 40, "brightness"), { entities })).toBeNull();
    expect(encodeHomeAssistantCommand(intent("hall", "on"), { entities: { "sensor.hall": { deviceId: "hall", capabilityId: "power" } } })).toBeNull();
  });

  it("puts no credential, URL or request id in the command: those are the transport's", () => {
    const call = encodeHomeAssistantCommand(intent("desk-lamp", "on"), { entities })!;
    expect(Object.keys(call).sort()).toEqual(["domain", "service", "target", "type"]);
    expect(JSON.stringify(call)).not.toMatch(/token|https?:|wss?:|"id"/i);
  });
});

/** The application around the adapter: a fake transport, a clock, ids. */
function harness() {
  let now = t("2026-10-07T17:59:59Z");
  let nextRequest = 10;
  let nextCommand = 1;
  const sent: { id: number; call: HomeAssistantServiceCall }[] = [];
  const log: KinetixLedgerTransition[] = [];
  const integration = createLightIntegration({
    transport: { send: (call) => (sent.push({ id: nextRequest, call }), nextRequest++) },
    entities,
    now: () => now,
    nextCommandId: () => `cmd-${nextCommand++}`,
    timeoutMs: 30_000,
    onTransitions: (transitions) => log.push(...transitions),
  });
  const at = (iso: string, fn: () => void) => {
    now = t(iso);
    act(fn);
  };
  const lamp = () => selectCapabilityLifecycle(integration.getLedger(), "desk-lamp", "power")!;
  return { integration, sent, log, at, lamp };
}

describe("fixture flow: provider → adapter → ledger → selector → control", () => {
  it("runs the light from first snapshot through request, confirmation, physical toggle, disconnect and reconnect", () => {
    const { integration, sent, log, at, lamp } = harness();
    render(<LightSwitch integration={integration} deviceId="desk-lamp" label="Desk lamp" />);
    const control = () => screen.getByRole("switch", { name: "Desk lamp" });

    // Before Home Assistant says anything: unknown, never offline, and not operable.
    expect(selectDeviceConnectivity(integration.getLedger(), "desk-lamp").state).toBe("unknown");
    expect(control()).toBeDisabled();

    at("2026-10-07T17:59:59.500Z", () => {
      integration.receive(messages.authOk!);
      integration.receive(messages.initialStates!);
    });
    expect(lamp()).toMatchObject({ stage: "idle", confirmedValue: "off" });
    expect(control()).toHaveAttribute("aria-checked", "false");
    expect(control()).toBeEnabled();

    // The user turns it on. The control does not claim it is on.
    at("2026-10-07T18:00:00Z", () => control().click());
    expect(sent).toEqual([{ id: 10, call: { type: "call_service", domain: "light", service: "turn_on", target: { entity_id: "light.desk_lamp" } } }]);
    expect(lamp()).toMatchObject({ stage: "requested", requestedValue: "on", confirmedValue: "off", commandId: "cmd-1" });
    expect(control()).toHaveAttribute("aria-checked", "false");
    expect(control()).toHaveAttribute("data-pending");

    // Home Assistant accepted the service call: acknowledged, still not on.
    at("2026-10-07T18:00:00.300Z", () => integration.receive(messages.callServiceOk!));
    expect(lamp().stage).toBe("acknowledged");
    expect(control()).toHaveAttribute("aria-checked", "false");

    // The state change is the confirmation.
    at("2026-10-07T18:00:01.300Z", () => integration.receive(messages.deskLampOn!));
    expect(lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
    expect(control()).toHaveAttribute("aria-checked", "true");
    expect(control()).not.toHaveAttribute("data-pending");

    // Someone switches it off at the wall. No request exists; the ledger believes the device.
    at("2026-10-07T18:05:00.100Z", () => integration.receive(messages.deskLampPhysicalOff!));
    expect(lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "off" });
    expect(control()).toHaveAttribute("aria-checked", "false");

    // The user asks for on again; the entity becomes unavailable before anything answers.
    at("2026-10-07T18:05:30Z", () => control().click());
    at("2026-10-07T18:06:00.100Z", () => integration.receive(messages.deskLampUnavailable!));
    expect(lamp()).toMatchObject({ stage: "requested", commandId: "cmd-2" });
    expect(lifecycleToCommandStatus(lamp())).not.toBe("failed");
    const offline = resolveControlState({ connectivity: selectDeviceConnectivity(integration.getLedger(), "desk-lamp"), lifecycle: lamp() });
    expect(offline.description).toBe("Device offline. The requested change is not confirmed. Showing the last known setting");
    expect(control()).toBeDisabled();
    expect(screen.getByRole("status").textContent ?? "").not.toMatch(/turning on|waiting/i);

    // The app's socket drops and comes back: connecting, never offline from our side.
    at("2026-10-07T18:07:00Z", () => integration.linkLost());
    expect(selectDeviceConnectivity(integration.getLedger(), "desk-lamp").state).toBe("connecting");

    // The reconnect snapshot says off: reconnecting did not make the request succeed.
    at("2026-10-07T18:08:01Z", () => integration.receive(messages.reconnectStatesStillOff!));
    expect(selectDeviceConnectivity(integration.getLedger(), "desk-lamp").state).toBe("online");
    expect(lamp()).toMatchObject({ stage: "requested", confirmedValue: "off" });

    // A stale "on" from before the disconnect is delivered late: refused, it cannot overwrite newer truth.
    at("2026-10-07T18:08:02Z", () => integration.receive(messages.staleDeskLampOn!));
    expect(lamp().confirmedValue).toBe("off");
    expect(log.at(-1)).toMatchObject({ cause: "report", rejection: { code: "stale-report" } });

    // The application's timer: timed out, "may still apply", never refused.
    at("2026-10-07T18:08:10Z", () => integration.tick());
    expect(lamp()).toMatchObject({ stage: "timed-out", commandId: "cmd-2", confirmedValue: "off" });
    expect(lamp().reasonCode).toBeUndefined();

    // Nothing Home Assistant–specific reached the ledger.
    expect(JSON.stringify(integration.getLedger())).not.toMatch(PROVIDER_VOCABULARY);
  });

  it("confirms a request made while disconnected only when the reconnect snapshot shows it applied", () => {
    const { integration, at, lamp } = harness();
    at("2026-10-07T17:59:59.500Z", () => integration.receive(messages.initialStates!));
    at("2026-10-07T18:05:30Z", () => integration.request("desk-lamp", "power", "on"));
    at("2026-10-07T18:06:00.100Z", () => integration.receive(messages.deskLampUnavailable!));
    at("2026-10-07T18:08:01Z", () => integration.receive(messages.reconnectStatesOn!));
    expect(lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
  });

  it("records a service-call error as a refusal with the application's code, keeping the reported value", () => {
    const { integration, at, lamp, sent } = harness();
    at("2026-10-07T17:59:59.500Z", () => integration.receive(messages.initialStates!));
    at("2026-10-07T18:00:00Z", () => integration.request("desk-lamp", "power", "on"));
    at("2026-10-07T18:00:00Z", () => integration.request("desk-lamp", "power", "off"));
    expect(sent.map((s) => s.id)).toEqual([10, 11]);
    // Message 10 answered the first, superseded request: refused. 11 was the current one.
    at("2026-10-07T18:00:00.400Z", () => integration.receive({ ...messages.callServiceOk!, id: 10 } as HomeAssistantMessage));
    expect(lamp().stage).toBe("requested");
    at("2026-10-07T18:00:00.500Z", () => integration.receive(messages.callServiceError!));
    expect(lamp()).toMatchObject({ stage: "failed", reasonCode: "invalid-request", confirmedValue: "off", commandId: "cmd-2" });
  });

  it("sends nothing for a capability the application never registered", () => {
    const { integration, sent, log, at } = harness();
    at("2026-10-07T18:00:00Z", () => integration.request("desk-lamp", "brightness", 40));
    expect(sent).toEqual([]);
    expect(log.at(-1)?.rejection?.code).toBe("unknown-capability");
  });

  it("sends nothing for a value the adapter cannot express, and records the request as refused", () => {
    const { integration, sent, log, at, lamp } = harness();
    at("2026-10-07T17:59:59.500Z", () => integration.receive(messages.initialStates!));
    at("2026-10-07T18:00:00Z", () => integration.request("desk-lamp", "power", 0.5));
    expect(sent).toEqual([]);
    expect(lamp()).toMatchObject({ stage: "failed", reasonCode: "unsupported", confirmedValue: "off" });
    expect(log.slice(-2).map((t) => [t.cause, t.to, t.rejection?.code])).toEqual([
      ["request", "requested", undefined],
      ["result", "failed", undefined],
    ]);
  });

  it("forgets request ids once answered and when the session drops, so a reused id is not read as an old reply", () => {
    const { integration, at, lamp } = harness();
    at("2026-10-07T17:59:59.500Z", () => integration.receive(messages.initialStates!));
    at("2026-10-07T18:05:30Z", () => integration.request("desk-lamp", "power", "on"));
    // The session drops before Home Assistant answers request 10; the new session numbers from 10 again.
    at("2026-10-07T18:07:00Z", () => integration.linkLost());
    at("2026-10-07T18:08:01Z", () => integration.receive({ ...messages.reconnectStatesOn!, id: 10 } as HomeAssistantMessage));
    expect(selectDeviceConnectivity(integration.getLedger(), "desk-lamp").state).toBe("online");
    expect(lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });

    // An answered id is forgotten too.
    const second = harness();
    second.at("2026-10-07T18:00:00Z", () => second.integration.request("desk-lamp", "power", "on"));
    second.at("2026-10-07T18:00:00.300Z", () => second.integration.receive(messages.callServiceOk!));
    second.at("2026-10-07T18:00:01Z", () => second.integration.receive({ ...messages.reconnectStatesOn!, id: 10 } as HomeAssistantMessage));
    expect(second.lamp()).toMatchObject({ stage: "confirmed", confirmedValue: "on" });
  });
});

describe("the same ledger without Home Assistant", () => {
  it("accepts the same signals from any provider: the lifecycle model does not change", () => {
    // What an MQTT or cloud adapter would emit for the same device. Not an MQTT implementation.
    const ledger = createDeviceLedger({ devices: [{ deviceId: "desk-lamp", capabilities: ["power"], values: { power: "off" } }] });
    const ha = applyDeviceSignals(ledger, translate("deskLampOn"), t("2026-10-07T18:00:02Z")).ledger;
    const other = applyDeviceSignals(
      ledger,
      [
        { type: "connectivity", deviceId: "desk-lamp", state: "online" },
        { type: "report", deviceId: "desk-lamp", capabilityId: "power", value: "on", observedAt: "2026-10-07T18:00:01.200000+00:00" },
      ],
      t("2026-10-07T18:00:02Z"),
    ).ledger;
    expect(other).toEqual(ha);
    expect(isLifecyclePending(selectCapabilityLifecycle(other, "desk-lamp", "power")!)).toBe(false);
  });
});
