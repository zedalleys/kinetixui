"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  AutomationRuleView,
  CommandLifecycle,
  ConnectionHealth,
  DevicePowerControl,
  DeviceStatusBadge,
  LastSync,
  RoutineCard,
  SpaceBreadcrumb,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import { buildSpaceTree, describeConnectivity, describeDeviceHealth, resolveDeviceCategory, spacePath } from "@kinetixui/iot/functions";
import { selectActivity, selectDeviceState } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { DeviceIllustration, Disclosure, PillSelector, StateBadge, StateGlyph, type ShowcaseState } from "@/components/iot/showcase";
import { agritech } from "./scenarios";
import { SimNotice, SimTransport, controlOf, deviceOf, readingOf, trendOf } from "./harness";
import { cn } from "@/lib/utils";

// kx-iot:start
/**
 * One device as a product view rather than a settings page. The device is the pump station of the farm
 * scenario, and the page is composed in two zones:
 *
 *   - the ZONE OF ACTION: who the device is, the one control that matters, and what it is measuring;
 *   - the ZONE OF CONTEXT: what needs attention, what happened, what is scheduled, how healthy it is.
 *
 * Below `lg` the two zones become one designed column: the control first, the readings second, and the
 * rest behind disclosures that say how much is inside. The large "Running / Stopped" word is the
 * CONFIRMED state. A request that has not landed appears beneath it as its own dashed, worded
 * treatment, and never replaces it.
 *
 * SIMULATED. Nothing configures hardware and nothing is sent; the routines are SHOWN, never executed.
 */
const DEVICE_ID = "pump-01";
const METRICS = [
  { id: "flow", label: "Flow" },
  { id: "pressure", label: "Pressure" },
] as const;

export function DeviceDetailExample() {
  const iot = useIotSimulation(agritech, { intervalMs: 1000 });
  const { sim } = iot;
  const [metric, setMetric] = React.useState<(typeof METRICS)[number]["id"]>("flow");

  const device = deviceOf(sim, DEVICE_ID);
  const state = selectDeviceState(sim, DEVICE_ID)!;
  const power = controlOf(iot, DEVICE_ID, "power");
  const tree = React.useMemo(() => buildSpaceTree(sim.scenario.spaces), [sim.scenario.spaces]);
  const home = sim.scenario.spaces.find((space) => space.deviceIds?.includes(DEVICE_ID));

  // CONFIRMED: what the pump last reported. `requested` is separate and only ever shown as a request.
  const running = state.confirmedValues.power === "on";
  const online = device.status === "online";
  const requestedPower = power.requested as "on" | "off" | undefined;
  const alerts = state.alerts.filter((alert) => !alert.resolvedAt);
  const routines = sim.automations.filter((automation) => automation.actions?.toLowerCase().includes("pump"));
  const rules = sim.scenario.rules.filter((rule) => rule.actions.some((action) => action.target === DEVICE_ID));
  const activity = selectActivity(sim, { deviceId: DEVICE_ID });
  const health: ShowcaseState = !online ? "offline" : state.health.level === "critical" ? "critical" : state.health.level === "warning" ? "warning" : "confirmed";
  const flow = readingOf(iot, DEVICE_ID, "flow");
  const pressure = readingOf(iot, DEVICE_ID, "pressure");

  return (
    <article aria-label={`${device.name} detail`} className="flex flex-col gap-4 sm:gap-6">
      <SimNotice scenario={agritech}>
        <SimTransport iot={iot} />
      </SimNotice>

      {/* ------------------------------------------------------------------ identity */}
      <header className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-16 shrink-0 items-center justify-center rounded-2xl p-2 transition-colors duration-fast motion-reduce:transition-none sm:size-28",
              running && online ? "bg-primary/10" : "bg-card shadow-sm",
            )}
          >
            <DeviceIllustration category={resolveDeviceCategory(device)} on={running && online} size="lg" className="size-full" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            {/* Wraps rather than truncates: at 320 the illustration left too little room and the name was cut. */}
            <h4 className="break-words text-headline-md text-foreground">{device.name}</h4>
            {home ? <SpaceBreadcrumb path={spacePath(tree, home.id)} label={`Location of ${device.name}`} /> : null}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-md">
              <DeviceStatusBadge status={device.status} />
              <span className="text-muted-foreground">
                {/* LastSync's own accessible label is the whole sentence ("Last seen 4 seconds ago"); the
                    visible prefix is hidden from assistive technology so it is not read twice. */}
                <span aria-hidden="true">Last seen </span>
                <LastSync value={device.lastSeenAt} now={sim.now} />
              </span>
              {alerts.length > 0 ? (
                <StateBadge state="warning">
                  {alerts.length} open {alerts.length === 1 ? "alert" : "alerts"}
                </StateBadge>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {/* ============================================================ zone of action */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <section aria-label="Pump control" className="flex min-w-0 flex-col gap-5 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-md text-muted-foreground">Pump status</p>
                <StateBadge state={online ? "confirmed" : "offline"}>{online ? "Confirmed by the pump" : "Last known, pump offline"}</StateBadge>
              </div>
              {/* The word "Running" is the CONFIRMED state. A request in flight is never shown here. */}
              {/* The request sits under the confirmed word as a full-width block, not beside it as a pill:
                  at phone width a rounded pill wrapped its sentence into a lozenge, and this has to stay
                  readable to stay honest. */}
              <p className="flex min-w-0 flex-col items-start gap-2 text-display-sm text-foreground">
                <span>{running ? "Running" : "Stopped"}</span>
                {requestedPower !== undefined ? (
                  <span className="flex min-w-0 items-start gap-2 self-stretch rounded-xl border-2 border-dashed border-primary bg-primary/10 p-3 text-body-md font-medium text-foreground">
                    <StateGlyph state="pending" className="mt-0.5 text-primary" />
                    {power.format(requestedPower)} requested, not yet confirmed. The pump still reports {running ? "running" : "stopped"}.
                  </span>
                ) : null}
              </p>
              <p className="text-body-md text-muted-foreground">{online ? `As last reported by the pump. ${describeConnectivity(state.connectivity.state)}.` : "Offline. Showing the last known state."}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-muted/60 p-4">
              <div className="flex min-h-11 min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
                <span className="text-title-md text-foreground">Pump power</span>
                <DevicePowerControl
                  state={power.confirmed as "on" | "off"}
                  requested={requestedPower}
                  control={power.control}
                  label={`${device.name} power`}
                  size="lg"
                  onToggle={power.send}
                />
              </div>
              {power.command && power.unsettled ? (
                <CommandLifecycle lifecycle={power.command.lifecycle} formatValue={power.format} onRetry={power.retry} onCancel={power.cancel} density="compact" />
              ) : null}
            </div>
          </section>

          <section aria-label="Readings" className="flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* One step below the confirmed "Running": the readings are what the pump measures, not what it is. */}
              <TelemetryMetric {...flow} label="Flow" size="lg" className="rounded-xl bg-muted/60 p-4" />
              <TelemetryMetric {...pressure} label="Pressure" size="lg" className="rounded-xl bg-muted/60 p-4" />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h5 className="text-title-md text-foreground">Last 24 hours</h5>
                <PillSelector label="Chart metric" options={METRICS} value={metric} onChange={(id) => setMetric(id as (typeof METRICS)[number]["id"])} className="rounded-full bg-muted/60 p-1" />
              </div>
              <TelemetryTrend {...trendOf(iot, DEVICE_ID, metric)} label={metric === "flow" ? "Pump flow, last 24 hours" : "Pump pressure, last 24 hours"} height={160} dataTable />
              {metric === "flow" ? <p className="text-body-sm text-muted-foreground">The band below 20 L/min is the low-flow limit. Gaps are drawn as gaps.</p> : null}
            </div>
          </section>

          <Disclosure title="About this device" defaultOpen={false}>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 text-body-md">
              {(
                [
                  ["Device id", device.id],
                  ["Type", device.type],
                  ["Firmware", device.firmwareVersion ?? "Not reported"],
                  ["Site", device.site ?? "Not set"],
                  ["Zone", device.zone ?? "Not set"],
                  ["Battery", device.battery === undefined ? "Not reported" : `${device.battery}%`],
                ] as const
              ).map(([term, value]) => (
                <div key={term} className="min-w-0">
                  <dt className="text-body-sm text-muted-foreground">{term}</dt>
                  <dd className="m-0 break-words text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-body-sm text-muted-foreground">Read-only. Nothing here configures hardware; it presents what the product knows.</p>
          </Disclosure>
        </div>

        {/* ============================================================ zone of context */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Disclosure title="Alerts" count={alerts.length} countNoun="open alerts" defaultOpen={alerts.length > 0 ? true : undefined}>
            <AlertList alerts={alerts} deviceName={() => undefined} onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)} now={sim.now} emptyLabel="No open alerts." hideSummary variant="list" />
          </Disclosure>

          <Disclosure title="Health and connection">
            <div className="flex flex-col gap-1">
              <p className="text-title-md text-foreground">
                {describeDeviceHealth(state.health.level)} · {describeConnectivity(state.connectivity.state)}
              </p>
              <p className="flex items-center gap-2 text-body-md text-muted-foreground">
                <StateBadge state={health}>{state.health.reasons.length === 0 ? "No issues reported." : state.health.reasons.map((reason) => reason.message).join(", ")}</StateBadge>
              </p>
            </div>
            <ConnectionHealth device={device} now={sim.now} />
          </Disclosure>

          <Disclosure title="Automation" count={routines.length + rules.length} countNoun="routines and rules">
            <p className="text-body-sm text-muted-foreground">Shown, not executed: KinetixUI has no automation engine.</p>
            {routines.map((automation) => (
              <RoutineCard key={automation.id} automation={automation} now={sim.now} />
            ))}
            {rules.map((rule) => (
              <AutomationRuleView key={rule.id} rule={rule} />
            ))}
            {routines.length + rules.length === 0 ? <p className="text-body-md text-muted-foreground">No routine or rule involves this pump.</p> : null}
          </Disclosure>

          <Disclosure title="Activity" count={activity.length} countNoun="events">
            <ActivityTimeline events={activity} deviceName={() => undefined} now={sim.now} label={`${device.name} activity`} variant="blocks" />
          </Disclosure>
        </div>
      </div>
    </article>
  );
}
// kx-iot:end
