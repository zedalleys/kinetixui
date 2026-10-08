/**
 * Reference application wiring (M4B). Everything in this file is APPLICATION code: it is what a product
 * team writes, not something `@kinetixui/iot` ships. It exists to make the ownership boundary visible.
 *
 *   inbound:  Home Assistant ─▶ app transport ─▶ adapter.translate ─▶ KinetixDeviceSignal[]
 *             ─▶ applyDeviceSignals (app-owned ledger) ─▶ selectors ─▶ DevicePowerControl
 *
 *   outbound: DevicePowerControl.onToggle ─▶ requestDeviceChange ─▶ KinetixCommandIntent
 *             ─▶ adapter.encode ─▶ app transport ─▶ Home Assistant ─▶ device
 *
 * The application owns: the WebSocket and its authentication (`transport`, never shown here, holding no
 * token in this file), request-id correlation (`requestIds`), the store (`ledger` plus listeners), the
 * clock, the timeout schedule (`tick`), and what to do when a link drops (`linkLost`). KinetixUI owns
 * the ledger rules, the selectors and the control. The adapter owns only translation.
 */
import * as React from "react";
import {
  applyDeviceSignals,
  createDeviceLedger,
  expireDeviceCommands,
  requestDeviceChange,
  resolveControlState,
  selectCapabilityLifecycle,
  selectDeviceConnectivity,
  type KinetixDeviceLedger,
  type KinetixDeviceSignal,
  type KinetixLedgerTransition,
  type KinetixPowerState,
} from "../../src/functions";
import { DevicePowerControl } from "../../src/react";
import { encodeHomeAssistantCommand, translateHomeAssistantMessage, type HomeAssistantEntityMap, type HomeAssistantMessage, type HomeAssistantServiceCall } from "./adapter";

/**
 * The application's connection to Home Assistant, behind its own server-side proxy in a real product.
 * `send` returns the message id it assigned, which Home Assistant echoes on the reply.
 */
export type HomeAssistantTransport = { send(call: HomeAssistantServiceCall): number };

export type LightIntegrationOptions = {
  transport: HomeAssistantTransport;
  entities: HomeAssistantEntityMap;
  /** The application's clock. */
  now: () => number;
  /** The application's id generator. KinetixUI generates no ids. */
  nextCommandId: () => string;
  /** The application's timeout policy. */
  timeoutMs: number;
  /** Where structured transitions go: logging, analytics, an audit trail. KinetixUI sends nothing. */
  onTransitions?: (transitions: KinetixLedgerTransition[]) => void;
};

/** An application-owned store around one ledger value. Could equally be Zustand, Redux or server state. */
export function createLightIntegration(options: LightIntegrationOptions) {
  const targets = Object.values(options.entities);
  let ledger: KinetixDeviceLedger = createDeviceLedger({
    devices: [...new Set(targets.map((t) => t.deviceId))].map((deviceId) => ({
      deviceId,
      capabilities: targets.filter((t) => t.deviceId === deviceId).map((t) => t.capabilityId),
    })),
  });
  const listeners = new Set<() => void>();
  const requestIds = new Map<number, string>();

  const commit = (update: { ledger: KinetixDeviceLedger; transitions: KinetixLedgerTransition[] }) => {
    options.onTransitions?.(update.transitions);
    if (update.ledger === ledger) return;
    ledger = update.ledger;
    listeners.forEach((listener) => listener());
  };
  const apply = (signals: KinetixDeviceSignal[]) => commit(applyDeviceSignals(ledger, signals, options.now()));

  return {
    getLedger: () => ledger,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Called by the application's socket handler for every message. */
    receive(message: HomeAssistantMessage) {
      apply(translateHomeAssistantMessage(message, { entities: options.entities, commandIdForRequest: (id) => requestIds.get(id) }));
      // A request id answers once. Forgetting it stops a later message that reuses the id from being read as this reply.
      if (message.type === "result" && typeof message.id === "number") requestIds.delete(message.id);
    },
    /** The application's socket closed: we lost our view, the devices did not go offline. */
    linkLost() {
      // Request ids belong to the closed session; a new session may number its messages from 1 again.
      requestIds.clear();
      apply([...new Set(targets.map((t) => t.deviceId))].map((deviceId) => ({ type: "connectivity", deviceId, state: "connecting" })));
    },
    /** A control asked for a change. */
    request(deviceId: string, capabilityId: string, value: unknown) {
      const update = requestDeviceChange(ledger, { commandId: options.nextCommandId(), deviceId, capabilityId, value }, options.now());
      if (!update.intent) return commit(update);
      const call = encodeHomeAssistantCommand(update.intent, { entities: options.entities });
      commit(update);
      if (!call) {
        // The adapter cannot express it, so nothing is sent. The request is recorded and refused with this
        // application's own code, so the control and the transition log both say it did not happen.
        return apply([{ type: "result", commandId: update.intent.commandId, outcome: "rejected", code: "unsupported" }]);
      }
      requestIds.set(options.transport.send(call), update.intent.commandId);
    },
    /** The application's timer. */
    tick() {
      commit(expireDeviceCommands(ledger, options.now(), { timeoutMs: options.timeoutMs }));
    },
  };
}

export type LightIntegration = ReturnType<typeof createLightIntegration>;

/** A KinetixUI control reading the app-owned ledger through KinetixUI selectors. */
export function LightSwitch({ integration, deviceId, label }: { integration: LightIntegration; deviceId: string; label: string }) {
  const ledger = React.useSyncExternalStore(integration.subscribe, integration.getLedger);
  const lifecycle = selectCapabilityLifecycle<KinetixPowerState>(ledger, deviceId, "power");
  const connectivity = selectDeviceConnectivity(ledger, deviceId);
  return (
    <DevicePowerControl
      label={label}
      lifecycle={lifecycle}
      control={resolveControlState({ connectivity, lifecycle })}
      onToggle={(next) => integration.request(deviceId, "power", next)}
    />
  );
}
