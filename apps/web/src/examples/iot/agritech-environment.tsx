"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  AutomationRuleView,
  CommandLifecycle,
  DeviceControlCard,
  DeviceGroupCard,
  DeviceHealthSummary,
  DeviceModeControl,
  DevicePowerControl,
  SpaceRollup,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import { buildSpaceTree, descendantDeviceIds, resolveDeviceCategory } from "@kinetixui/iot/functions";
import { selectActivity, selectAlerts, selectFleetHealth, selectSpaceRollups } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { agritech, agritechRainForecast } from "./scenarios";
import { Section, SimNotice, SimTransport, controlOf, deviceOf, readingOf, statusLineOf, trendOf } from "./harness";

// kx-iot:start
/**
 * Greenhouse A: climate, soil, a valve, a pump and a weather station, on one screen.
 *
 * The valve and pump are real controls: a request stays unconfirmed until the device reports. Irrigation
 * Valve 03 is deliberately flaky. It fails once, shows why, and offers Retry rather than retrying for
 * you. Soil moisture dips through its 28% threshold a few seconds after the page loads.
 *
 * SIMULATED. The rain forecast is application-provided demo data: KinetixUI fetches no forecast.
 */
export function AgritechEnvironmentExample() {
  const iot = useIotSimulation(agritech, { intervalMs: 1000 });
  const { sim } = iot;
  const tree = React.useMemo(() => buildSpaceTree(sim.scenario.spaces), [sim.scenario.spaces]);
  const rollups = selectSpaceRollups(sim);
  const zones = sim.scenario.spaces.filter((space) => space.kind === "irrigation-zone" || space.id === "field-orchard");
  const rule = sim.scenario.rules[0]!;
  const forecast = agritechRainForecast;
  const valves = [controlOf(iot, "valve-02", "position"), controlOf(iot, "valve-03", "position")];
  const pump = controlOf(iot, "pump-01", "power");

  return (
    <section aria-label="Greenhouse A" className="flex flex-col gap-6">
      <SimNotice scenario={agritech}>
        <SimTransport iot={iot} />
      </SimNotice>

      <Section title="Greenhouse A">
        <DeviceHealthSummary summary={selectFleetHealth(sim)} noun={{ one: "device", other: "devices" }} />
        <TelemetryGrid label="Greenhouse A readings">
          <TelemetryMetric {...readingOf(iot, "climate-a", "temperature")} label="Air temperature" />
          <TelemetryMetric {...readingOf(iot, "climate-a", "humidity")} label="Humidity" />
          <TelemetryMetric {...readingOf(iot, "soil-04", "soil-moisture")} label="Soil moisture · Zone 3" />
          <TelemetryMetric {...readingOf(iot, "pump-01", "flow")} label="Pump flow" />
          <TelemetryMetric {...readingOf(iot, "weather-01", "wind-speed")} label="Wind" />
          <TelemetryMetric {...readingOf(iot, "soil-05", "soil-moisture")} label="Soil moisture · Orchard" />
        </TelemetryGrid>
      </Section>

      <Section title="Soil moisture · Zone 3" hint="Seven days. The band below 28% is the threshold the irrigation rule watches.">
        <TelemetryTrend {...trendOf(iot, "soil-04", "soil-moisture")} label="Soil moisture, Zone 3, last seven days" height={140} dataTable />
      </Section>

      <Section title="Valves and pump" hint="Open, closed, running: each shows the reported state and any request still waiting on the device.">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
          {valves.map((valve) => (
            <DeviceControlCard
              key={valve.device.id}
              device={valve.device}
              active={valve.confirmed === "open"}
              control={valve.control}
              statusLine={statusLineOf(valve)}
              meta={
                <>
                  <DeviceModeControl
                    modes={valve.capability.modes ?? []}
                    value={valve.confirmed as string}
                    requested={valve.requested as string | undefined}
                    control={valve.control}
                    label={`${valve.device.name} position`}
                    onSelect={valve.send}
                    className="w-full"
                  />
                  {valve.command && valve.unsettled ? <CommandLifecycle lifecycle={valve.command.lifecycle} formatValue={valve.format} onRetry={valve.retry} onCancel={valve.cancel} className="w-full" /> : null}
                </>
              }
            />
          ))}
          <DeviceControlCard
            device={pump.device}
            active={pump.confirmed === "on"}
            control={pump.control}
            statusLine={statusLineOf(pump)}
            primaryControl={
              <DevicePowerControl state={pump.confirmed as "on" | "off"} requested={pump.requested as "on" | "off" | undefined} control={pump.control} label="Pump Station power" showLabel={false} onToggle={pump.send} />
            }
            meta={pump.command && pump.unsettled ? <CommandLifecycle lifecycle={pump.command.lifecycle} formatValue={pump.format} onRetry={pump.retry} onCancel={pump.cancel} className="w-full" /> : null}
          />
        </div>
      </Section>

      <Section title="Zones">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
          {zones.map((zone) => {
            const devices = descendantDeviceIds(tree, zone.id).map((id) => deviceOf(sim, id));
            const rollup = rollups.get(zone.id)!;
            return (
              <DeviceGroupCard
                key={zone.id}
                name={zone.name}
                kind={zone.kind === "irrigation-zone" ? "Irrigation zone" : "Field"}
                deviceCount={devices.length}
                activeCount={devices.filter((d) => d.status === "online").length}
                attentionCount={rollup.warning + rollup.critical + rollup.offline}
                category={devices[0] ? resolveDeviceCategory(devices[0]) : undefined}
                rollup={<SpaceRollup rollup={rollup} name={zone.name} compact />}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Alerts">
        <AlertList
          alerts={selectAlerts(sim, { includeAcknowledged: true })}
          deviceName={(id) => deviceOf(sim, id).name}
          onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
          now={sim.now}
        />
      </Section>

      <Section title="Automation" hint="A rule as data. Nothing evaluates it: KinetixUI has no automation engine.">
        <AutomationRuleView rule={rule} labelFor={(_kind, id) => sim.scenario.labels?.[id]} />
        <p className="text-label-md text-foreground">
          Rain forecast: {forecast.expected ? "expected" : "not expected"} ({forecast.probabilityPct}% chance)
        </p>
        <p className="text-label-sm text-muted-foreground">Application-provided demo data — KinetixUI fetches no forecast.</p>
      </Section>

      <Section title="Recent activity">
        <ActivityTimeline events={selectActivity(sim, { limit: 6 })} deviceName={(id) => deviceOf(sim, id).name} now={sim.now} />
      </Section>
    </section>
  );
}
// kx-iot:end
