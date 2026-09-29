"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  CommandLifecycle,
  DeviceControlCard,
  DeviceHealthSummary,
  DeviceLevelControl,
  DevicePowerControl,
  EnergySummary,
  SpaceBreadcrumb,
  SpaceRollup,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import { buildSpaceTree, findSpace, spacePath } from "@kinetixui/iot/functions";
import { selectActivity, selectAlerts, selectEnergy, selectFleetHealth, selectSpaceRollups } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { operations } from "./scenarios";
import { BUTTON, Section, SimNotice, SimTransport, controlOf, deviceOf, readingOf, statusLineOf, trendOf } from "./harness";

// kx-iot:start
/**
 * Site 04: fleet health, an Organization → Site → Line → Machine hierarchy with a rollup at every
 * level, equipment health, energy, faults and alerts, and the command history.
 *
 * Counts come from `summarizeFleetHealth` and `rollupSpaceHealth` over the simulated devices, not from
 * numbers typed into the page. SIMULATED: no device is contacted and nothing is sent over a network.
 */
export function OperationsEnvironmentExample() {
  const iot = useIotSimulation(operations, { intervalMs: 1000 });
  const { sim } = iot;
  const [spaceId, setSpaceId] = React.useState("site-04");

  const tree = React.useMemo(() => buildSpaceTree(sim.scenario.spaces), [sim.scenario.spaces]);
  const rollups = selectSpaceRollups(sim);
  const here = findSpace(tree, spaceId)!;
  const energy = selectEnergy(sim);
  const pump = controlOf(iot, "p-201", "power");
  const duty = controlOf(iot, "p-201", "duty");
  const commandHistory = selectActivity(sim).filter((event) => event.kind === "command");

  return (
    <section aria-label="Site 04 operations" className="flex flex-col gap-6">
      <SimNotice scenario={operations}>
        <SimTransport iot={iot} />
      </SimNotice>

      <Section title="Site 04 health">
        <DeviceHealthSummary summary={selectFleetHealth(sim)} noun={{ one: "device", other: "devices" }} />
      </Section>

      <Section title="Where it is" hint="Organization, site, line, machine. Each level rolls up the health of everything beneath it.">
        <SpaceBreadcrumb path={spacePath(tree, spaceId)} label="Selected level" onNavigate={(item) => setSpaceId(item.id)} />
        <SpaceRollup rollup={rollups.get(spaceId)!} name={here.node.name} />
        {here.children.length > 0 ? (
          <ul aria-label={`Inside ${here.node.name}`} className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3 p-0">
            {here.children.map((child) => (
              <li key={child.node.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-label-sm uppercase tracking-wide text-muted-foreground">{child.node.kind}</span>
                  {child.children.length > 0 ? (
                    <button type="button" className={`${BUTTON} justify-start text-start`} onClick={() => setSpaceId(child.node.id)}>
                      <span className="min-w-0 truncate">{child.node.name}</span>
                    </button>
                  ) : (
                    <span className="truncate text-label-md text-foreground">{child.node.name}</span>
                  )}
                </div>
                <SpaceRollup rollup={rollups.get(child.node.id)!} name={child.node.name} compact />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Equipment health · Transfer pump P-201" hint="Vibration has climbed for a week. The bands are product-set bounds, not library defaults.">
        <TelemetryGrid label="Transfer pump P-201 readings">
          <TelemetryMetric {...readingOf(iot, "p-201", "pressure")} label="Discharge pressure" />
          <TelemetryMetric {...readingOf(iot, "p-201", "vibration")} label="Vibration" />
          <TelemetryMetric {...readingOf(iot, "p-201", "temperature")} label="Casing temperature" />
        </TelemetryGrid>
        <TelemetryTrend {...trendOf(iot, "p-201", "vibration")} label="Transfer pump P-201 vibration, last seven days" height={140} dataTable />
        <div className="max-w-sm">
          <DeviceControlCard
            device={pump.device}
            active={pump.confirmed === "on"}
            control={pump.control}
            statusLine={statusLineOf(pump, duty)}
            primaryControl={
              <DevicePowerControl state={pump.confirmed as "on" | "off"} requested={pump.requested as "on" | "off" | undefined} control={pump.control} label="Transfer pump P-201 run" showLabel={false} onToggle={pump.send} />
            }
            meta={
              <>
                {pump.command && pump.unsettled ? <CommandLifecycle lifecycle={pump.command.lifecycle} formatValue={pump.format} onRetry={pump.retry} onCancel={pump.cancel} className="w-full" /> : null}
                {duty.command && duty.unsettled ? <CommandLifecycle lifecycle={duty.command.lifecycle} formatValue={duty.format} onRetry={duty.retry} onCancel={duty.cancel} className="w-full" /> : null}
              </>
            }
            expanded={<DeviceLevelControl value={duty.confirmed as number} target={duty.requested as number | undefined} unit="%" step={5} control={duty.control} label="Transfer pump P-201 duty" onCommit={duty.send} />}
          />
        </div>
      </Section>

      {energy ? (
        <Section title="Energy" hint="Simulated. Confirmed-on machines accrue as the clock runs.">
          <EnergySummary summary={energy.summary} today={energy.summary.total} days={energy.week} />
        </Section>
      ) : null}

      <Section title="Faults and alerts">
        <AlertList
          alerts={selectAlerts(sim, { includeAcknowledged: true })}
          deviceName={(id) => deviceOf(sim, id).name}
          onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
          now={sim.now}
        />
      </Section>

      <Section title="Command history" hint="Requests you send above appear here with the status the device actually reached.">
        <ActivityTimeline events={commandHistory} deviceName={(id) => deviceOf(sim, id).name} now={sim.now} label="Command history" />
      </Section>
    </section>
  );
}
// kx-iot:end
