"use client";

import * as React from "react";
import {
  AlertList,
  CameraDeviceCard,
  CommandLifecycle,
  DeviceControlCard,
  DeviceGroupCard,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  EnergySummary,
  RoutineCard,
  SpaceBreadcrumb,
  SpaceRollup,
  TelemetryGrid,
  TelemetryMetric,
} from "@kinetixui/iot/react";
import { buildSpaceTree, descendantDeviceIds, resolveDeviceCategory, spacePath } from "@kinetixui/iot/functions";
import { SAMPLE_IMAGE_LABEL, selectAlerts, selectEnergy, selectSpaceRollups } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { smartSpace } from "./scenarios";
import { BUTTON, Section, SimNotice, SimTransport, controlOf, deviceOf, readingOf, statusLineOf, type ControlBinding } from "./harness";

// kx-iot:start
/**
 * A smart space, end to end: rooms with health rolled up from their devices, real controls that show
 * requested against confirmed, air quality, a camera that is never shown as live, energy, alerts and
 * scenes. Built from one simulated scenario through selectors, so nothing here is a hand-typed count.
 *
 * SIMULATED. No device is contacted and nothing is sent over a network.
 */
const DAY_MS = 86_400_000;

/** The lifecycle of a request that has not landed, or did not. Nothing for a confirmed one. */
function Lifecycle({ binding }: { binding: ControlBinding }) {
  if (!binding.command || !binding.unsettled) return null;
  return <CommandLifecycle lifecycle={binding.command.lifecycle} formatValue={binding.format} onRetry={binding.retry} onCancel={binding.cancel} className="w-full" />;
}

export function SmartSpaceEnvironmentExample() {
  const iot = useIotSimulation(smartSpace, { intervalMs: 1000 });
  const { sim } = iot;
  const [spaceId, setSpaceId] = React.useState("home");
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({ "thermostat-hall": true });
  const disclose = (id: string) => ({ open: !!openIds[id], onOpenChange: (open: boolean) => setOpenIds((prev) => ({ ...prev, [id]: open })) });
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({});

  const tree = React.useMemo(() => buildSpaceTree(sim.scenario.spaces), [sim.scenario.spaces]);
  const rollups = selectSpaceRollups(sim);
  const rooms = sim.scenario.spaces.filter((space) => space.kind === "room");
  const shownIds = new Set(descendantDeviceIds(tree, spaceId));
  const show = (deviceId: string) => shownIds.has(deviceId);
  const lamp = controlOf(iot, "lamp-living", "power");
  const brightness = controlOf(iot, "lamp-living", "level");
  const thermostat = controlOf(iot, "thermostat-hall", "setpoint");
  const thermostatMode = controlOf(iot, "thermostat-hall", "mode");
  const heater = controlOf(iot, "plug-heater", "power");
  const lock = controlOf(iot, "lock-front", "lock");
  const bedroom = controlOf(iot, "lamp-bedroom", "power");
  const energy = selectEnergy(sim);
  const dayLabels = energy?.week.map((_, i) =>
    new Date(Date.parse(sim.startAt) - (energy.week.length - i) * DAY_MS).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }),
  );

  return (
    <section aria-label="Smart space" className="flex flex-col gap-6">
      <SimNotice scenario={smartSpace}>
        <SimTransport iot={iot} />
      </SimNotice>

      <Section title="Rooms" hint="Health is rolled up from the devices in each room. Select one to filter the controls below.">
        <SpaceBreadcrumb path={spacePath(tree, spaceId)} label="Selected space" onNavigate={(item) => setSpaceId(item.id)} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
          {rooms.map((room) => {
            const ids = descendantDeviceIds(tree, room.id);
            const rollup = rollups.get(room.id)!;
            const devices = ids.map((id) => deviceOf(sim, id));
            return (
              <DeviceGroupCard
                key={room.id}
                name={room.name}
                kind="Room"
                deviceCount={devices.length}
                activeCount={devices.filter((d) => d.status === "online").length}
                attentionCount={rollup.warning + rollup.critical + rollup.offline}
                category={devices[0] ? resolveDeviceCategory(devices[0]) : undefined}
                path={<SpaceBreadcrumb path={spacePath(tree, room.id)} label={`Location of ${room.name}`} />}
                rollup={<SpaceRollup rollup={rollup} name={room.name} compact />}
                onSelect={() => setSpaceId(room.id)}
                aria-current={spaceId === room.id ? "true" : undefined}
                className={spaceId === room.id ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined}
              />
            );
          })}
        </div>
        {spaceId !== "home" ? (
          <button type="button" className={`${BUTTON} self-start`} onClick={() => setSpaceId("home")}>
            Show the whole home
          </button>
        ) : null}
      </Section>

      <Section title="Controls" hint="Each control shows what the device reported. A request stays visibly unconfirmed until the device agrees.">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
          {show("lamp-living") ? (
            <DeviceControlCard
              device={lamp.device}
              active={lamp.confirmed === "on"}
              control={lamp.control}
              statusLine={statusLineOf(lamp, brightness)}
              primaryControl={
                <DevicePowerControl state={lamp.confirmed as "on" | "off"} requested={lamp.requested as "on" | "off" | undefined} control={lamp.control} label="Living room lamp power" showLabel={false} onToggle={lamp.send} />
              }
              meta={<Lifecycle binding={lamp} />}
              expanded={
                <>
                  <DeviceLevelControl value={brightness.confirmed as number} target={brightness.requested as number | undefined} unit="%" step={5} control={brightness.control} label="Living room lamp brightness" onCommit={brightness.send} />
                  <Lifecycle binding={brightness} />
                </>
              }
              {...disclose("lamp-living")}
            />
          ) : null}

          {show("thermostat-hall") ? (
            <DeviceControlCard
              device={thermostat.device}
              active={thermostatMode.confirmed === "heat"}
              control={thermostat.control}
              statusLine={statusLineOf(thermostat, thermostatMode)}
              meta={<Lifecycle binding={thermostat} />}
              expanded={
                <>
                  <DeviceSetpointControl
                    current={readingOf(iot, "thermostat-hall", "temperature").value}
                    target={thermostat.confirmed as number}
                    requestedTarget={thermostat.requested as number | undefined}
                    min={16}
                    max={26}
                    step={0.5}
                    unit="°C"
                    control={thermostat.control}
                    label="Hallway thermostat target"
                    onCommit={thermostat.send}
                  />
                  <DeviceModeControl modes={thermostatMode.capability.modes ?? []} value={thermostatMode.confirmed as string} requested={thermostatMode.requested as string | undefined} control={thermostatMode.control} label="Hallway thermostat mode" onSelect={thermostatMode.send} />
                  <Lifecycle binding={thermostatMode} />
                </>
              }
              {...disclose("thermostat-hall")}
            />
          ) : null}

          {show("plug-heater") ? (
            <DeviceControlCard
              device={heater.device}
              active={heater.confirmed === "on"}
              control={heater.control}
              statusLine={statusLineOf(heater)}
              primaryControl={
                <DevicePowerControl state={heater.confirmed as "on" | "off"} requested={heater.requested as "on" | "off" | undefined} control={heater.control} label="Space heater plug power" showLabel={false} onToggle={heater.send} />
              }
              meta={<Lifecycle binding={heater} />}
            />
          ) : null}

          {show("lock-front") ? (
            <DeviceControlCard
              device={lock.device}
              control={lock.control}
              statusLine={statusLineOf(lock)}
              meta={
                <>
                  <DeviceModeControl modes={lock.capability.modes ?? []} value={lock.confirmed as string} requested={lock.requested as string | undefined} control={lock.control} label="Front door lock" onSelect={lock.send} className="w-full" />
                  <Lifecycle binding={lock} />
                </>
              }
            />
          ) : null}

          {show("lamp-bedroom") ? (
            <DeviceControlCard
              device={bedroom.device}
              control={bedroom.control}
              statusLine={statusLineOf(bedroom)}
              primaryControl={
                <DevicePowerControl state={bedroom.confirmed as "on" | "off"} control={bedroom.control} label="Bedroom lamp power" showLabel={false} onToggle={bedroom.send} />
              }
            />
          ) : null}
        </div>
      </Section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6">
        <Section title="Air quality · Living room">
          <TelemetryGrid label="Living room air">
            <TelemetryMetric {...readingOf(iot, "air-living", "air-quality")} label="Air quality" />
            <TelemetryMetric {...readingOf(iot, "air-living", "temperature")} label="Temperature" />
            <TelemetryMetric {...readingOf(iot, "air-living", "humidity")} label="Humidity" />
          </TelemetryGrid>
        </Section>

        <Section title="Camera" hint="A sample frame. No video, stream or recording exists behind this card.">
          <CameraDeviceCard device={deviceOf(sim, "camera-hall")} posterLabel={SAMPLE_IMAGE_LABEL} privacy="off" now={sim.now} />
        </Section>
      </div>

      {energy ? (
        <Section title="Energy" hint="Simulated consumption. Devices that are confirmed on accrue as the clock runs.">
          <EnergySummary summary={energy.summary} today={energy.summary.total} days={energy.week} dayLabels={dayLabels} />
        </Section>
      ) : null}

      <Section title="Alerts">
        <AlertList
          alerts={selectAlerts(sim, { includeAcknowledged: true })}
          deviceName={(id) => deviceOf(sim, id).name}
          onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
          now={sim.now}
        />
      </Section>

      <Section title="Scenes and routines" hint="Shown, not executed: KinetixUI has no automation engine.">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
          {sim.automations.map((automation) => {
            const on = enabled[automation.id] ?? automation.enabled;
            return (
              <RoutineCard
                key={automation.id}
                automation={{ ...automation, enabled: on, status: on ? (automation.status === "disabled" ? "idle" : automation.status) : "disabled" }}
                now={sim.now}
                onToggleEnabled={(next) => setEnabled((prev) => ({ ...prev, [automation.id]: next }))}
              />
            );
          })}
        </div>
      </Section>
    </section>
  );
}
// kx-iot:end
