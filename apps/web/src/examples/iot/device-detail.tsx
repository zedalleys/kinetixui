"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ActivityTimeline,
  AlertList,
  AutomationRuleView,
  CommandLifecycle,
  ConnectionHealth,
  DeviceControlCard,
  DeviceIdentity,
  DevicePowerControl,
  DeviceStatusBadge,
  LastSync,
  RoutineCard,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import { describeConnectivity, describeDeviceHealth } from "@kinetixui/iot/functions";
import { selectActivity, selectDeviceState } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { agritech } from "./scenarios";
import { Section, SimNotice, SimTransport, controlOf, deviceOf, readingOf, statusLineOf, trendOf, useInheritedDirection } from "./harness";
import { cn } from "@/lib/utils";

// kx-iot:start
/**
 * One device in full, as a screen with six tabs. The tabs are real `tablist` / `tab` / `tabpanel`
 * elements with roving arrow-key focus (Radix Tabs); the list scrolls sideways on a narrow screen
 * rather than wrapping the page.
 *
 * "Settings" is a read-only presentation of what the product knows about the device. Nothing on that
 * tab configures hardware, and nothing in this example sends anything: it is SIMULATED.
 */
const DEVICE_ID = "pump-01";
const TABS = ["Overview", "Controls", "Telemetry", "Automations", "Activity", "Settings"] as const;

const TAB_TRIGGER = cn(
  "-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-4 text-label-md text-muted-foreground",
  "transition-colors hover:text-foreground motion-reduce:transition-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  "data-[state=active]:border-primary data-[state=active]:text-foreground",
);
const PANEL = "flex flex-col gap-6 pt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DeviceDetailExample() {
  const iot = useIotSimulation(agritech, { intervalMs: 1000 });
  const { sim } = iot;
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Overview");
  const [rootRef, dir] = useInheritedDirection<HTMLDivElement>();

  const device = deviceOf(sim, DEVICE_ID);
  const state = selectDeviceState(sim, DEVICE_ID)!;
  const power = controlOf(iot, DEVICE_ID, "power");
  const powerControl = (
    <DevicePowerControl state={power.confirmed as "on" | "off"} requested={power.requested as "on" | "off" | undefined} control={power.control} label={`${device.name} power`} onToggle={power.send} />
  );
  const lifecycle = power.command ? (
    <CommandLifecycle lifecycle={power.command.lifecycle} formatValue={power.format} onRetry={power.retry} onCancel={power.cancel} />
  ) : null;
  const running = state.confirmedValues.power === "on";
  const alerts = state.alerts.filter((alert) => !alert.resolvedAt);
  const routines = sim.automations.filter((automation) => automation.actions?.toLowerCase().includes("pump"));
  const rules = sim.scenario.rules.filter((rule) => rule.actions.some((action) => action.target === DEVICE_ID));

  return (
    <article ref={rootRef} aria-label={`${device.name} detail`} className="flex flex-col gap-4">
      <SimNotice scenario={agritech}>
        <SimTransport iot={iot} />
      </SimNotice>

      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <DeviceIdentity device={device} active={running && device.status === "online"} size="lg" />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-md text-foreground">
          {/* The word "Running" is the CONFIRMED state. A request in flight is never shown here. */}
          <span>{running ? "Running" : "Stopped"}</span>
          <DeviceStatusBadge status={device.status} />
          <span className="text-muted-foreground">
            {/* LastSync's own accessible label is the whole sentence ("Last seen 4 seconds ago"); the
                visible prefix is hidden from assistive technology so it is not read twice. */}
            <span aria-hidden="true">Last seen </span>
            <LastSync value={device.lastSeenAt} now={sim.now} />
          </span>
        </p>
      </header>

      <Tabs.Root value={tab} onValueChange={(next) => setTab(next as (typeof TABS)[number])} dir={dir}>
        {/* The scroller is a plain wrapper: the tabs inside it are focusable, so keyboard users reach it. */}
        <div className="overflow-x-auto border-b border-border">
          <Tabs.List aria-label={`${device.name} sections`} className="flex w-max min-w-full">
            {TABS.map((name) => (
              <Tabs.Trigger key={name} value={name} className={TAB_TRIGGER}>
                {name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <Tabs.Content value="Overview" className={PANEL}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6">
            <Section title="Health">
              <p className="text-label-md text-foreground">
                {describeDeviceHealth(state.health.level)} · {describeConnectivity(state.connectivity.state)}
              </p>
              <ul className="m-0 list-disc ps-5 text-label-md text-muted-foreground">
                {state.health.reasons.length === 0 ? <li>No issues reported.</li> : state.health.reasons.map((reason, i) => <li key={i}>{reason.message}</li>)}
              </ul>
            </Section>
            <Section title="Connectivity">
              <ConnectionHealth device={device} now={sim.now} />
            </Section>
          </div>
          <Section title="Primary readings">
            <TelemetryGrid label={`${device.name} readings`}>
              <TelemetryMetric {...readingOf(iot, DEVICE_ID, "flow")} label="Flow" />
              <TelemetryMetric {...readingOf(iot, DEVICE_ID, "pressure")} label="Pressure" />
            </TelemetryGrid>
          </Section>
          <Section title="Alerts">
            <AlertList alerts={alerts} deviceName={() => undefined} onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)} now={sim.now} emptyLabel="No open alerts." hideSummary />
          </Section>
          <Section title="Quick controls">
            <div className="flex flex-wrap items-start gap-3">{powerControl}</div>
            {power.unsettled ? lifecycle : null}
          </Section>
        </Tabs.Content>

        <Tabs.Content value="Controls" className={PANEL}>
          <Section title="Controls" hint="The switch shows what the pump reported. A request stays visibly unconfirmed until the pump agrees.">
            <div className="max-w-sm">
              <DeviceControlCard device={device} active={running} control={power.control} statusLine={statusLineOf(power)} primaryControl={powerControl} />
            </div>
            {lifecycle}
          </Section>
        </Tabs.Content>

        <Tabs.Content value="Telemetry" className={PANEL}>
          <Section title="Flow" hint="The band below 20 L/min is the low-flow threshold. Gaps are drawn as gaps.">
            <TelemetryTrend {...trendOf(iot, DEVICE_ID, "flow")} label="Pump flow, last 24 hours" height={140} dataTable />
          </Section>
          <Section title="Pressure">
            <TelemetryTrend {...trendOf(iot, DEVICE_ID, "pressure")} label="Pump pressure, last 24 hours" height={120} dataTable />
          </Section>
        </Tabs.Content>

        <Tabs.Content value="Automations" className={PANEL}>
          <Section title="Routines that involve this pump" hint="Shown, not executed: KinetixUI has no automation engine.">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
              {routines.map((automation) => (
                <RoutineCard key={automation.id} automation={automation} now={sim.now} />
              ))}
            </div>
          </Section>
          {rules.length > 0 ? (
            rules.map((rule) => <AutomationRuleView key={rule.id} rule={rule} />)
          ) : (
            <p className="text-label-sm text-muted-foreground">No structured rule in this scenario targets the pump directly.</p>
          )}
        </Tabs.Content>

        <Tabs.Content value="Activity" className={PANEL}>
          <Section title="Commands and state changes">
            <ActivityTimeline events={selectActivity(sim, { deviceId: DEVICE_ID })} deviceName={() => undefined} now={sim.now} label={`${device.name} activity`} />
          </Section>
        </Tabs.Content>

        <Tabs.Content value="Settings" className={PANEL}>
          <Section title="About this device" hint="Read-only. Nothing on this tab configures hardware; it presents what the product knows.">
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-x-6 gap-y-3 text-label-md">
              {(
                [
                  ["Device id", device.id],
                  ["Type", device.type],
                  ["Firmware", device.firmwareVersion ?? "Not reported"],
                  ["Site", device.site ?? "Not set"],
                  ["Zone", device.zone ?? "Not set"],
                  ["Location", device.locationName ?? "Not set"],
                  ["Signal", device.signal === undefined ? "Not reported" : `${device.signal}%`],
                  ["Battery", device.battery === undefined ? "Not reported" : `${device.battery}%`],
                ] as const
              ).map(([term, value]) => (
                <div key={term} className="min-w-0">
                  <dt className="text-label-sm text-muted-foreground">{term}</dt>
                  <dd className="m-0 break-words text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </Tabs.Content>
      </Tabs.Root>
    </article>
  );
}
// kx-iot:end
