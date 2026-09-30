"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  AutomationRuleView,
  BatteryIndicator,
  CommandLifecycle,
  DeviceGroupCard,
  DeviceHealthSummary,
  DeviceModeControl,
  DevicePowerControl,
  RoutineCard,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import { buildSpaceTree, descendantDeviceIds, evaluateReading, resolveDeviceCategory, type KinetixReadingState } from "@kinetixui/iot/functions";
import { selectActivity, selectAlerts, selectFleetHealth } from "@/lib/iot-sim";
import { useIotSimulation, type UseIotSimulation } from "@/lib/iot-sim/use-simulation";
import { cn } from "@/lib/utils";
import {
  AttentionButton,
  DeviceIllustration,
  Disclosure,
  Panel,
  PillSelector,
  ShowcaseShell,
  SpaceCanvas,
  SpaceHeader,
  StateBadge,
  StateGlyph,
  SummaryChip,
  type PlanHotspot,
  type RoomAmbient,
} from "@/components/iot/showcase";
import { agritech, agritechRainForecast } from "./scenarios";
import { fieldAnchors, fieldPlan } from "./scenarios/plans";
import { SimNotice, SimTransport, controlOf, deviceOf, readingOf, trendOf, type ControlBinding } from "./harness";

// kx-iot:start
/**
 * An agronomist's daily view of a farm. The FIELD PLAN is the centre: each zone carries its soil moisture and
 * each valve, pump and sensor is a hotspot with an honest state. Selecting a zone (in the rail, the pills on a
 * phone, or on the plan) brings up its moisture as the big number, the valve that irrigates it, and the
 * greenhouse and weather readings around it. Time series and device health come before lighting-style controls.
 *
 * Every number is only as current as its reading: a sensor that stopped reporting keeps its last value, said
 * as "last known", and never reads as a fresh measurement. The valve and pump are real controls: a request
 * stays unconfirmed until the device reports, and Irrigation Valve 03 is deliberately flaky. It fails once,
 * shows why, and offers Retry rather than retrying for you.
 *
 * SIMULATED. The irrigation rule and the rain forecast are shown, not executed: KinetixUI has no automation
 * engine and fetches no forecast.
 */
type Zone = { id: string; name: string; group: string; sensorId?: string; valveId?: string };

const ZONES: readonly Zone[] = [
  { id: "zone-2", name: "Zone 2", group: "Greenhouse A", sensorId: "soil-03", valveId: "valve-02" },
  { id: "zone-3", name: "Zone 3", group: "Greenhouse A", sensorId: "soil-04", valveId: "valve-03" },
  { id: "field-orchard", name: "Orchard block", group: "Open field", sensorId: "soil-05" },
  { id: "field-yard", name: "Utility yard", group: "Pump and weather" },
];

const SOIL_LOW = 28;

/** An abstract original farm mark: hills, crop rows and a low sun. Decorative. */
function FarmMark() {
  return (
    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm sm:size-14">
      <svg viewBox="0 0 48 48" width={36} height={36} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="34" cy="14" r="4" className="fill-warning/60 stroke-none" />
        <path d="M4 32C14 22 24 28 30 25C36 22 42 24 44 26V38a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" className="fill-success/15 stroke-success/50" strokeWidth={2} />
        <path d="M12 40V34M20 40V31M28 40V31M36 40V33" className="stroke-primary" strokeWidth={2.5} />
      </svg>
    </span>
  );
}

const ValveOpenGlyph = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />
  </svg>
);
const ValveClosedGlyph = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8" />
  </svg>
);

/** The lifecycle of a request that has not landed, or did not. Nothing for a confirmed one. */
function Lifecycle({ binding }: { binding: ControlBinding }) {
  if (!binding.command || !binding.unsettled) return null;
  return <CommandLifecycle lifecycle={binding.command.lifecycle} formatValue={binding.format} onRetry={binding.retry} onCancel={binding.cancel} className="w-full" />;
}

/** The request, worded and dashed, beside the confirmed value: never a substitute for it. */
function RequestedChip({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-dashed border-primary px-3 py-1 text-label-md font-medium text-foreground">
      <StateGlyph state="pending" size={14} className="text-primary" />
      {children}
    </p>
  );
}

const withUnit = (value: number, unit: string | undefined, precision = 0) => `${value.toFixed(precision)}${unit ? (unit === "%" ? "" : " ") + unit : ""}`;

/** The latest soil moisture of a sensor, judged against its own threshold and freshness window. */
function moistureOf(iot: UseIotSimulation, deviceId: string) {
  const reading = readingOf(iot, deviceId, "soil-moisture");
  const state: KinetixReadingState = evaluateReading({
    value: reading.value,
    timestamp: reading.timestamp,
    staleAfterMs: reading.staleAfterMs,
    thresholds: reading.thresholds,
    metric: "soil-moisture",
    now: reading.now,
  }).state;
  return { reading, state, value: reading.value };
}

/** A moisture bar with the irrigation threshold marked. Fresh and healthy is green; below the line is warning; old is muted. */
function MoistureBar({ value, state, name }: { value: number | null; state: KinetixReadingState; name: string }) {
  const known = value !== null && state !== "unavailable";
  const width = known ? Math.min(100, Math.max(0, value)) : 0;
  const tone = state === "stale" || state === "unavailable" ? "bg-muted-foreground/40" : state === "normal" ? "bg-success" : "bg-warning";
  const sentence = !known
    ? `${name}: no reading`
    : `${name}: ${Math.round(value)}%${state === "stale" ? ", last known value" : ""}${state === "warning" || state === "critical" ? ", below the irrigation threshold" : ""}. Irrigation threshold ${SOIL_LOW}%.`;
  return (
    <div role="img" aria-label={sentence} className="relative h-2.5 w-full rounded-full bg-muted">
      <span className={cn("absolute inset-y-0 start-0 rounded-full transition-all duration-base motion-reduce:transition-none", tone)} style={{ inlineSize: `${width}%` }} />
      <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground/70" style={{ insetInlineStart: `${SOIL_LOW}%` }} />
    </div>
  );
}

const moistureWord = (state: KinetixReadingState) =>
  state === "stale" ? "Last known" : state === "unavailable" ? "No reading" : state === "warning" || state === "critical" ? `Below ${SOIL_LOW}%` : "Soil moisture";

export function AgritechEnvironmentExample() {
  const iot = useIotSimulation(agritech, { intervalMs: 1000 });
  const { sim } = iot;
  const [zoneId, setZoneId] = React.useState("zone-3");
  const [hotspotId, setHotspotId] = React.useState<string | null>(null);
  const alertsRef = React.useRef<HTMLDivElement>(null);

  const tree = React.useMemo(() => buildSpaceTree(sim.scenario.spaces), [sim.scenario.spaces]);
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const rule = sim.scenario.rules[0]!;
  const forecast = agritechRainForecast;
  const alerts = selectAlerts(sim, { includeAcknowledged: true });
  const openAlerts = alerts.filter((a) => !a.resolvedAt);
  const alertDevices = new Set(openAlerts.map((a) => a.deviceId));

  const pump = controlOf(iot, "pump-01", "power");
  const flow = readingOf(iot, "pump-01", "flow");
  const pressure = readingOf(iot, "pump-01", "pressure");
  const air = readingOf(iot, "climate-a", "temperature");
  const humidity = readingOf(iot, "climate-a", "humidity");
  const outside = readingOf(iot, "weather-01", "temperature");
  const wind = readingOf(iot, "weather-01", "wind-speed");

  const selectZone = (id: string) => {
    setZoneId(id);
    setHotspotId(null);
  };
  const selectHotspot = (id: string) => {
    setHotspotId(id);
    const room = fieldAnchors[id]?.roomId;
    if (ZONES.some((z) => z.id === room)) setZoneId(room!);
  };

  // ---- the plan: one hotspot per placed device, with its honest state and confirmed value ----
  const hotspots: PlanHotspot[] = sim.scenario.devices.flatMap((device): PlanHotspot[] => {
    const at = fieldAnchors[device.id];
    if (!at) return [];
    // A zone's soil reading is drawn on the plan as its moisture chip (with its state in words), so its sensor
    // is not a second marker stacked on the same few pixels.
    if (device.type === "soil-sensor" && at.roomId.startsWith("zone-")) return [];
    const category = resolveDeviceCategory(device);
    let value: string | undefined;
    let requested: string | undefined;
    let pending = false;
    let attention = alertDevices.has(device.id) || device.status === "stale";
    if (device.type === "soil-sensor") {
      const m = moistureOf(iot, device.id);
      if (m.value !== null) value = `${withUnit(m.value, "%")}${m.state === "stale" ? " · last known" : ""}`;
      if (m.state !== "normal") attention = true;
    } else if (device.type === "valve") {
      const valve = controlOf(iot, device.id, "position");
      value = valve.format(valve.confirmed);
      pending = valve.requested !== undefined;
      if (pending) requested = valve.format(valve.requested);
      if (valve.command && valve.unsettled && !pending) attention = true;
    } else if (device.id === "pump-01") {
      value = `${pump.format(pump.confirmed)}${flow.value !== null ? ` · ${withUnit(flow.value, flow.unit, 0)}` : ""}`;
      pending = pump.requested !== undefined;
      if (pending) requested = pump.format(pump.requested);
    } else if (device.id === "climate-a") {
      value = air.value !== null ? withUnit(air.value, air.unit, 1) : undefined;
    } else if (device.id === "weather-01") {
      value = wind.value !== null ? withUnit(wind.value, wind.unit, 0) : undefined;
    } else {
      value = "Connected";
    }
    const state = device.status === "offline" ? "offline" : pending ? "pending" : attention ? "warning" : "confirmed";
    return [{ id: device.id, roomId: at.roomId, x: at.x, y: at.y, category, state, label: device.name, value, requested }];
  });

  const soil = (id: string) => moistureOf(iot, id);
  const ambient: RoomAmbient = {
    "zone-2": [soil("soil-03").value !== null ? withUnit(soil("soil-03").value!, "%") : "—"],
    "zone-3": [soil("soil-04").value !== null ? `${withUnit(soil("soil-04").value!, "%")}${soil("soil-04").state === "warning" ? " low" : ""}` : "—"],
    "field-orchard": [soil("soil-05").value === null ? "—" : soil("soil-05").state === "stale" ? `Last ${withUnit(soil("soil-05").value!, "%")}` : withUnit(soil("soil-05").value!, "%")],
    "field-yard": [pump.confirmed === "on" ? "Pump on" : "Pump off"],
  };

  // ---- rail rows: zone name, moisture as the big number, a bar under it ----
  const zoneRow = (z: Zone) => {
    const ids = descendantDeviceIds(tree, z.id);
    const devices = ids.map((id) => deviceOf(sim, id));
    const m = z.sensorId ? soil(z.sensorId) : null;
    const attention = devices.filter((d) => alertDevices.has(d.id) || d.status !== "online").length;
    const valve = z.valveId ? controlOf(iot, z.valveId, "position") : null;
    const big = m ? (m.value !== null ? withUnit(m.value, "%") : "—") : flow.value !== null ? withUnit(flow.value, "") : "—";
    return (
      <li key={z.id} className="min-w-0">
        <DeviceGroupCard
          variant="row"
          name={z.name}
          kind={z.group}
          deviceCount={devices.length}
          activeCount={devices.filter((d) => d.status === "online").length}
          attentionCount={attention}
          category={devices[0] ? resolveDeviceCategory(devices[0]) : undefined}
          summary={valve ? `Valve ${valve.format(valve.confirmed).toLowerCase()}` : z.id === "field-yard" ? `Pump ${pump.confirmed === "on" ? "running" : "stopped"}` : undefined}
          selected={z.id === zoneId}
          onSelect={() => selectZone(z.id)}
          className={z.id === zoneId ? "ring-2 ring-primary" : undefined}
          trailing={
            <span className={cn("flex min-w-16 flex-col items-end text-end", m?.state === "stale" && "text-muted-foreground")}>
              <span className="text-headline-sm tabular-nums">
                <span className="sr-only">{m ? "Soil moisture " : "Pump flow "}</span>
                <bdi>{big}</bdi>
                {!m && flow.unit ? <span className="text-label-md text-muted-foreground"> {flow.unit}</span> : null}
              </span>
              <span className="text-label-md text-muted-foreground">{m ? moistureWord(m.state) : "Pump flow"}</span>
            </span>
          }
          rollup={m ? <MoistureBar value={m.value} state={m.state} name={`${z.name} soil moisture`} /> : undefined}
        />
      </li>
    );
  };

  const sensor = zone.sensorId ? deviceOf(sim, zone.sensorId) : null;
  const zoneMoisture = zone.sensorId ? soil(zone.sensorId) : null;
  const valve = zone.valveId ? controlOf(iot, zone.valveId, "position") : null;
  const attentionCount = openAlerts.length;

  const pumpBlock = (large: boolean) => (
    <Panel
      title="Pump Station"
      description={large ? "Feeds every irrigation zone" : "Supplies this zone"}
      className={large ? undefined : "bg-muted/40 shadow-none"}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DeviceIllustration category="pump" on={pump.confirmed === "on"} size={large ? "lg" : "md"} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-headline-sm text-foreground">{pump.confirmed === "on" ? "Running" : "Stopped"}</p>
            <p className="text-body-sm text-muted-foreground">Reported by the pump</p>
            {pump.requested !== undefined ? <RequestedChip>Requested: {pump.format(pump.requested)}, not yet confirmed</RequestedChip> : null}
          </div>
        </div>
        <DevicePowerControl
          state={pump.confirmed as "on" | "off"}
          requested={pump.requested as "on" | "off" | undefined}
          control={pump.control}
          label="Pump Station power"
          size="lg"
          onToggle={pump.send}
        />
      </div>
      {large ? null : (
        <TelemetryMetric {...flow} label="Pump flow" size="md" quietWhenNormal />
      )}
      <Lifecycle binding={pump} />
    </Panel>
  );

  // ---- the focus area: hero numeral, then what to do about it ----
  const hero =
    zoneMoisture && sensor ? (
      <Panel title={`${zone.name} soil moisture`} description={`${zone.group} · ${sensor.name}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <TelemetryMetric {...zoneMoisture.reading} label="Soil moisture" size="xl" className="sm:min-w-48" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <MoistureBar value={zoneMoisture.value} state={zoneMoisture.state} name={`${zone.name} soil moisture`} />
            <p className="text-body-md text-muted-foreground">The irrigation rule watches {SOIL_LOW}%. The tick on the bar marks it.</p>
            <div className="flex flex-wrap items-center gap-3">
              <BatteryIndicator presentation="pill" value={sensor.battery} label={`${sensor.name} battery`} />
              <span className="text-body-sm text-muted-foreground">{sensor.name}</span>
            </div>
          </div>
          <DeviceIllustration category="soil-sensor" on={zoneMoisture.state !== "stale"} size="lg" className="hidden sm:block" />
        </div>
        {zoneMoisture.state === "stale" ? (
          <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-body-md text-foreground">
            <StateGlyph state="offline" className="mt-0.5 text-muted-foreground" />
            <span>{sensor.name} has not reported recently. This is its last known value, not the current soil moisture, so it is not used to judge this block.</span>
          </p>
        ) : null}
      </Panel>
    ) : (
      <Panel title="Pump Station" description="Utility yard · what the irrigation runs on">
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
          <TelemetryMetric {...flow} label="Pump flow" size="xl" />
          <TelemetryMetric {...pressure} label="Line pressure" size="lg" quietWhenNormal />
        </div>
      </Panel>
    );

  const irrigation = valve ? (
    <>
      <Panel title="Irrigation valve" description={`${valve.device.name} · ${valve.device.locationName ?? zone.name}`}>
        <div className="flex items-center gap-4">
          <DeviceIllustration category="valve" on={valve.confirmed === "open"} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-display-sm tabular-nums text-foreground">{valve.format(valve.confirmed)}</p>
            <p className="text-body-md text-muted-foreground">Reported by the valve</p>
            {valve.requested !== undefined ? <RequestedChip>Requested: {valve.format(valve.requested)}, not yet confirmed</RequestedChip> : null}
            {valve.device.status === "offline" ? <StateBadge state="offline">Offline. Showing the last known position.</StateBadge> : null}
          </div>
        </div>
        <DeviceModeControl
          presentation="tiles"
          modes={(valve.capability.modes ?? []).map((m) => ({ ...m, icon: m.id === "open" ? <ValveOpenGlyph /> : <ValveClosedGlyph /> }))}
          value={valve.confirmed as string}
          requested={valve.requested as string | undefined}
          control={valve.control}
          label={`${valve.device.name} position`}
          onSelect={valve.send}
        />
        <Lifecycle binding={valve} />
      </Panel>
      {pumpBlock(false)}
    </>
  ) : zone.id === "field-yard" ? (
    pumpBlock(true)
  ) : (
    <Panel title="Irrigation" description="No valve is registered for this block">
      <p className="text-body-md text-muted-foreground">Soil Sensor 05 only reads. There is nothing here to open or close, so the plan and the rail are the way to check on this block.</p>
    </Panel>
  );

  const conditions = (
    <Panel title="Conditions" description="Greenhouse A air, and the weather station in the utility yard">
      <TelemetryGrid label="Conditions" columns={4}>
        <TelemetryMetric {...air} label="Greenhouse air" size="lg" quietWhenNormal />
        <TelemetryMetric {...humidity} label="Humidity" size="lg" quietWhenNormal />
        <TelemetryMetric {...outside} label="Outside air" size="lg" quietWhenNormal />
        <TelemetryMetric {...wind} label="Wind" size="lg" quietWhenNormal />
      </TelemetryGrid>
    </Panel>
  );

  const trendCard = (deviceId: string, metric: string, label: string, height = 140) => (
    <TelemetryTrend {...trendOf(iot, deviceId, metric)} label={label} height={height} dataTable staleAfterMs={readingOf(iot, deviceId, metric).staleAfterMs} />
  );

  const focus = (
    <>
      {hero}
      {zone.sensorId ? (
        <Disclosure title={`${zone.name} moisture, last 7 days`}>{trendCard(zone.sensorId, "soil-moisture", `${zone.name} soil moisture, last seven days`, 160)}</Disclosure>
      ) : (
        <Disclosure title="Pump flow, last 24 hours">{trendCard("pump-01", "flow", "Pump flow, last 24 hours", 160)}</Disclosure>
      )}
      {irrigation}
      {conditions}
      <Disclosure title="Air and weather, last 24 hours">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {trendCard("climate-a", "temperature", "Greenhouse air temperature, last 24 hours")}
          {trendCard("climate-a", "humidity", "Greenhouse humidity, last 24 hours")}
          {trendCard("weather-01", "temperature", "Outside air temperature, last 24 hours")}
          {trendCard("pump-01", "flow", "Pump flow, last 24 hours")}
        </div>
      </Disclosure>
    </>
  );

  // ---- the aside: attention first, then device health, then the rule, then activity ----
  const batteryDevices = sim.scenario.devices
    .filter((d) => d.battery !== undefined || d.status !== "online")
    .map((d) => deviceOf(sim, d.id))
    .sort((a, b) => Number(a.status === "online") - Number(b.status === "online") || (a.battery ?? 101) - (b.battery ?? 101));

  const aside = (
    <>
      <div ref={alertsRef} tabIndex={-1} id="agritech-attention" className="min-w-0 focus-visible:outline-none md:col-span-2 xl:col-span-1">
        <Panel title="Needs attention" description={openAlerts.length === 0 ? "Nothing is waiting on you" : `${openAlerts.length} open`}>
          <AlertList
            alerts={alerts}
            deviceName={(id) => deviceOf(sim, id).name}
            onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
            now={sim.now}
            label="Farm alerts"
          />
        </Panel>
      </div>

      <Panel title="Device health" description="Batteries and reporting, lowest first">
        <DeviceHealthSummary summary={selectFleetHealth(sim)} size="lg" noun={{ one: "device", other: "devices" }} />
        <ul aria-label="Batteries and reporting" className="m-0 flex list-none flex-col gap-3 p-0">
          {batteryDevices.map((d) => (
            <li key={d.id} className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted/40 p-3">
              <span className="flex min-w-0 items-center gap-3">
                <DeviceIllustration category={resolveDeviceCategory(d)} on={d.status === "online"} size="sm" className="size-8" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-md text-foreground">{d.name}</span>
                  <span className="text-body-sm text-muted-foreground">{d.locationName}</span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {d.battery !== undefined ? <BatteryIndicator presentation="pill" value={d.battery} label={`${d.name} battery`} className="bg-card" /> : null}
                {d.status !== "online" ? <StateBadge state="offline">Not reporting</StateBadge> : null}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Irrigation rule" description="Shown, not executed: KinetixUI has no automation engine." className="md:col-span-2 xl:col-span-1">
        <AutomationRuleView rule={rule} labelFor={(_kind, id) => sim.scenario.labels?.[id]} />
        <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3">
          <p className="text-title-sm text-foreground">
            Rain forecast: {forecast.expected ? "expected" : "not expected"} ({forecast.probabilityPct}% chance)
          </p>
          <p className="text-body-sm text-muted-foreground">Application-provided demo data — KinetixUI fetches no forecast.</p>
        </div>
        <div className="flex flex-col gap-3">
          {sim.automations.map((automation) => (
            <RoutineCard key={automation.id} automation={automation} now={sim.now} className="bg-muted/40" />
          ))}
        </div>
      </Panel>

      <Disclosure title="Activity" count={selectActivity(sim, { limit: 6 }).length} countNoun="events" className="md:col-span-2 xl:col-span-1">
        <ActivityTimeline variant="compact" events={selectActivity(sim, { limit: 6 })} deviceName={(id) => deviceOf(sim, id).name} now={sim.now} />
      </Disclosure>
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SimNotice scenario={agritech}>
        <SimTransport iot={iot} />
      </SimNotice>

      <ShowcaseShell
        label="Demo Farm"
        railLabel="Fields and zones"
        canvasLabel="Farm plan"
        focusLabel={`${zone.name} detail`}
        asideLabel="Attention, device health and irrigation rule"
        header={
          <SpaceHeader
            identity={<FarmMark />}
            eyebrow="Farm · 3 fields"
            title="Demo Farm"
            location="Greenhouse A, Orchard block, Utility yard"
            status={attentionCount > 0 ? "warning" : "confirmed"}
            statusWord={attentionCount > 0 ? `${attentionCount} open ${attentionCount === 1 ? "alert" : "alerts"}` : "All clear"}
            chips={
              <>
                <SummaryChip label="Air" value={air.value !== null ? withUnit(air.value, air.unit, 1) : "—"} />
                <SummaryChip label="Humidity" value={humidity.value !== null ? withUnit(humidity.value, humidity.unit) : "—"} />
                <SummaryChip label="Rain" value={`${forecast.probabilityPct}% · demo data`} />
              </>
            }
            attention={
              <AttentionButton
                count={attentionCount}
                label={attentionCount === 1 ? "needs attention" : "need attention"}
                onClick={() => {
                  alertsRef.current?.scrollIntoView({ block: "start" });
                  alertsRef.current?.focus({ preventScroll: true });
                }}
              />
            }
          />
        }
        rail={
          <div className="flex flex-col gap-3">
            <p className="hidden text-label-md uppercase tracking-wide text-muted-foreground lg:block">Fields and zones</p>
            <div className="lg:hidden">
              <PillSelector label="Zone" options={ZONES.map((z) => ({ id: z.id, label: z.name }))} value={zoneId} onChange={selectZone} />
            </div>
            <ul aria-label="Zones" className="m-0 hidden list-none flex-col gap-2 p-0 lg:flex">
              {ZONES.map(zoneRow)}
            </ul>
          </div>
        }
        canvas={
          <SpaceCanvas
            plan={fieldPlan}
            selectedRoomId={zoneId}
            onSelectRoom={(id) => ZONES.some((z) => z.id === id) && selectZone(id)}
            hotspots={hotspots}
            selectedHotspotId={hotspotId}
            onSelectHotspot={selectHotspot}
            ambient={ambient}
            hotspotLabels="selected"
          />
        }
        focus={focus}
        aside={aside}
      />
    </div>
  );
}
// kx-iot:end
