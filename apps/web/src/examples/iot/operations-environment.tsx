"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  BatteryIndicator,
  CommandLifecycle,
  ConnectionHealth,
  DeviceHealthSummary,
  DeviceLevelControl,
  DevicePowerControl,
  EnergySummary,
  FirmwareStatus,
  RoutineCard,
  SignalStrength,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "@kinetixui/iot/react";
import {
  buildSpaceTree,
  descendantDeviceIds,
  formatRelativeTime,
  resolveDeviceCategory,
} from "@kinetixui/iot/functions";
import {
  selectActivity,
  selectAlerts,
  selectEnergy,
  selectFleetHealth,
  selectSpaceRollups,
} from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import {
  AttentionButton,
  Disclosure,
  DeviceIllustration,
  Panel,
  RailItem,
  RailList,
  SpaceCanvas,
  SpaceHeader,
  Stat,
  StateBadge,
  StateGlyph,
  SummaryChip,
  showcaseStateWord,
  type PlanHotspot,
  type ShowcaseState,
} from "@/components/iot/showcase";
import { siteAnchors, sitePlan } from "./scenarios/plans";
import { operations } from "./scenarios";
import {
  SimNotice,
  SimTransport,
  controlOf,
  deviceOf,
  readingOf,
  trendOf,
  type ControlBinding,
} from "./harness";

// kx-iot:start
/**
 * Site 04 as a shift supervisor sees it: fleet health and utilisation on top, an alert queue to triage, the site
 * plan as the map, and one selected machine to inspect and command. Every figure is derived from the simulation
 * (`summarizeFleetHealth`, `rollupSpaceHealth`, confirmed values, readings) rather than typed into the page.
 *
 * State honesty: the big numbers are what the devices last CONFIRMED. A request shows beside them as a dashed,
 * worded "requested, not yet confirmed" until the device agrees; an offline meter shows its last reading as stale,
 * never as current. Routines are shown, not executed: KinetixUI has no automation engine.
 *
 * SIMULATED. No device is contacted and nothing is sent over a network.
 */
const STALE_AFTER_MS = 15 * 60_000;
const DAY_MS = 86_400_000;
/** The load meter that reports for each line. Application configuration, not something the package knows. */
const LINE_METER: Record<string, string> = {
  "line-1": "e-101",
  "line-2": "e-201",
  "line-3": "e-301",
};
/** Firmware a product's back end says exists. Application-provided demo data: KinetixUI checks nothing. */
const FIRMWARE_AVAILABLE: Record<string, string> = { "g-01": "4.2.0" };
const METRIC_LABEL: Record<string, string> = {
  vibration: "Vibration",
  temperature: "Temperature",
  pressure: "Pressure",
  power: "Load",
};

const isMachine = (iot: ReturnType<typeof useIotSimulation>, id: string) =>
  (iot.sim.scenario.capabilities[id] ?? []).some((c) => c.kind === "power");
const isDown = (status: string) =>
  status === "offline" || status === "unreachable";
const isRunning = (iot: ReturnType<typeof useIotSimulation>, id: string) => {
  const rt = iot.sim.devices[id]!;
  return rt.confirmedValues.power === "on" && !isDown(rt.device.status);
};

/** The lifecycle of a request that has not landed, or did not. Nothing for a confirmed one. */
function Lifecycle({ binding }: { binding: ControlBinding }) {
  if (!binding.command || !binding.unsettled) return null;
  return (
    <CommandLifecycle
      lifecycle={binding.command.lifecycle}
      formatValue={binding.format}
      onRetry={binding.retry}
      onCancel={binding.cancel}
      className="w-full"
    />
  );
}

/** An abstract original plant mark: a saw-tooth roofline over a chimney. Decorative. */
function PlantMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm sm:size-14"
    >
      <svg
        viewBox="0 0 48 48"
        width={36}
        height={36}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M8 40V24l10 6V24l10 6V24l10 6v10Z"
          className="fill-primary/10 stroke-primary"
          strokeWidth={2.5}
        />
        <path
          d="M36 30V10h5v22"
          className="fill-card stroke-muted-foreground/50"
          strokeWidth={2}
        />
        <path
          d="M6 40h38"
          className="stroke-muted-foreground/50"
          strokeWidth={2}
        />
        <circle
          cx="36"
          cy="6"
          r="2"
          className="fill-muted-foreground/30 stroke-none"
        />
      </svg>
    </span>
  );
}

/** Line status from its rollup: one word, one glyph, never colour alone. */
function lineStatus(r: {
  critical: number;
  warning: number;
  degraded: number;
  offline: number;
}): { state: ShowcaseState; word: string } {
  if (r.critical > 0) return { state: "critical", word: "Critical" };
  if (r.warning > 0 || r.degraded > 0)
    return { state: "warning", word: "Needs attention" };
  if (r.offline > 0) return { state: "offline", word: "Device offline" };
  return { state: "confirmed", word: "Running" };
}

export function OperationsEnvironmentExample() {
  const iot = useIotSimulation(operations, { intervalMs: 1000 });
  const { sim } = iot;
  const [lineId, setLineId] = React.useState("line-2");
  const [deviceId, setDeviceId] = React.useState("p-201");
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({});
  const triageRef = React.useRef<HTMLDivElement>(null);

  const tree = React.useMemo(
    () => buildSpaceTree(sim.scenario.spaces),
    [sim.scenario.spaces],
  );
  const rollups = selectSpaceRollups(sim);
  const fleet = selectFleetHealth(sim);
  const lines = sim.scenario.spaces.filter((space) => space.kind === "line");
  const line = lines.find((l) => l.id === lineId) ?? lines[0]!;
  const alerts = selectAlerts(sim, { includeAcknowledged: true });
  const openAlerts = selectAlerts(sim);
  const energy = selectEnergy(sim);
  const dayLabels = energy?.week.map((_, i) =>
    new Date(
      Date.parse(sim.startAt) - (energy.week.length - i) * DAY_MS,
    ).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }),
  );
  const siteRollup = rollups.get("site-04")!;

  // Utilisation: machines whose CONFIRMED power is on, over machines that can be run at all.
  const machineIds = Object.keys(sim.devices).filter((id) =>
    isMachine(iot, id),
  );
  const running = machineIds.filter((id) => isRunning(iot, id)).length;
  const siteLoad = readingOf(iot, "e-301", "power");

  const lineOf = (id: string) => siteAnchors[id]?.roomId ?? lines[0]!.id;
  const select = (id: string) => {
    setDeviceId(id);
    setLineId(lineOf(id));
  };
  const chooseLine = (id: string) => {
    setLineId(id);
    // Land on the machine that most needs a look: an open alert, else the first device on the line.
    const ids = descendantDeviceIds(tree, id);
    const flagged = ids.find(
      (d) =>
        openAlerts.some((a) => a.deviceId === d) ||
        sim.devices[d]!.device.status === "warning",
    );
    setDeviceId(flagged ?? ids[0]!);
  };

  const valueOf = (id: string): string | undefined => {
    if (isMachine(iot, id)) {
      if (isDown(sim.devices[id]!.device.status)) return undefined;
      const level = (sim.scenario.capabilities[id] ?? []).find(
        (c) => c.kind === "level",
      );
      const confirmed = level
        ? (sim.devices[id]!.confirmedValues[level.id] as number | undefined)
        : undefined;
      return isRunning(iot, id)
        ? `Running${confirmed !== undefined ? ` ${confirmed}%` : ""}`
        : "Stopped";
    }
    const sensor = sim.scenario.sensors.find((s) => s.deviceId === id);
    if (!sensor) return undefined;
    const reading = readingOf(iot, id, sensor.metric);
    return reading.value === null
      ? undefined
      : `${reading.value.toFixed(sensor.decimals ?? 1)} ${sensor.unit ?? ""}`.trim();
  };

  const requestedOf = (id: string): string | undefined => {
    const rt = sim.devices[id]!;
    const cap = (sim.scenario.capabilities[id] ?? []).find(
      (c) => rt.requestedValues[c.id] !== undefined,
    );
    return cap
      ? controlOf(iot, id, cap.id).format(rt.requestedValues[cap.id])
      : undefined;
  };

  // The plan marks machines, the gateway and anything that needs a look; meters and sensors live in the equipment list.
  const onPlan = (id: string) =>
    id === deviceId ||
    isMachine(iot, id) ||
    deviceOf(sim, id).type === "gateway" ||
    deviceOf(sim, id).status !== "online";
  const hotspots: PlanHotspot[] = Object.keys(siteAnchors)
    .filter(onPlan)
    .map((id) => {
      const device = deviceOf(sim, id);
      const anchor = siteAnchors[id]!;
      const requested = requestedOf(id);
      const state: PlanHotspot["state"] = isDown(device.status)
        ? "offline"
        : device.status === "warning"
          ? "warning"
          : requested
            ? "pending"
            : "confirmed";
      return {
        id,
        roomId: anchor.roomId,
        x: anchor.x,
        y: anchor.y,
        category: resolveDeviceCategory(device),
        state,
        label: device.name,
        value: valueOf(id),
        requested,
      };
    });

  const device = deviceOf(sim, deviceId);
  const category = resolveDeviceCategory(device);
  const caps = sim.scenario.capabilities[deviceId] ?? [];
  const power = caps.some((c) => c.kind === "power")
    ? controlOf(iot, deviceId, "power")
    : null;
  const levelCap = caps.find((c) => c.kind === "level");
  const level = levelCap ? controlOf(iot, deviceId, levelCap.id) : null;
  const down = isDown(device.status);
  const pending = [power, level].filter(
    (b): b is ControlBinding => !!b && b.requested !== undefined,
  );
  const availableFirmware = FIRMWARE_AVAILABLE[deviceId];
  const inspectorState: ShowcaseState = down
    ? "offline"
    : device.status === "warning"
      ? "warning"
      : pending.length
        ? "pending"
        : "confirmed";
  const lineName = lines.find((l) => l.id === lineOf(deviceId))?.name;

  // Telemetry for the selected device: live sensors first, then any history the device only has as a series.
  const metrics = [
    ...new Set([
      ...sim.scenario.sensors
        .filter((s) => s.deviceId === deviceId)
        .map((s) => s.metric),
      ...sim.scenario.series
        .filter((s) => s.deviceId === deviceId)
        .map((s) => s.metric),
    ]),
  ];
  const metricProps = (metric: string) => {
    const live = readingOf(iot, deviceId, metric);
    if (live.value !== null) return { ...live, label: METRIC_LABEL[metric] };
    // No live reading: show the last point of the history, dated, so it reads as stale and not as now.
    const last = trendOf(iot, deviceId, metric).series.points.at(-1);
    return {
      metric,
      label: METRIC_LABEL[metric],
      value: last?.value ?? null,
      unit: last?.unit,
      timestamp: last?.timestamp,
      staleAfterMs: STALE_AFTER_MS,
      now: sim.now,
    };
  };

  const lineDevices = descendantDeviceIds(tree, line.id)
    .map((id) => ({
      id,
      device: deviceOf(sim, id),
      rank: isDown(sim.devices[id]!.device.status)
        ? 1
        : sim.devices[id]!.device.status === "warning"
          ? 0
          : 2,
    }))
    .sort((a, b) => a.rank - b.rank);
  const status = lineStatus(rollups.get(line.id)!);
  const meter = LINE_METER[line.id]!;
  const lineLoad = readingOf(iot, meter, "power");
  const lineMachines = descendantDeviceIds(tree, line.id).filter((id) =>
    isMachine(iot, id),
  );

  const attentionCount =
    siteRollup.warning + siteRollup.critical + siteRollup.offline;

  return (
    <section aria-label="Site 04 operations" className="flex flex-col gap-4">
      <SimNotice scenario={operations}>
        <SimTransport iot={iot} />
      </SimNotice>

      <div className="flex min-w-0 flex-col gap-6 rounded-container bg-muted/40 p-4 sm:p-6 lg:gap-8 lg:p-8">
        <SpaceHeader
          identity={<PlantMark />}
          eyebrow="Demo Manufacturing Co · Shift supervisor"
          title="Site 04"
          location="3 lines · 24 devices"
          status={attentionCount > 0 ? "warning" : "confirmed"}
          statusWord={
            attentionCount > 0
              ? `${siteRollup.warning + siteRollup.critical} warning · ${siteRollup.offline} offline`
              : "All systems running"
          }
          chips={
            siteLoad.value !== null ? (
              <SummaryChip
                label="Site load"
                value={`${siteLoad.value.toFixed(1)} kW`}
              />
            ) : undefined
          }
          attention={
            <AttentionButton
              count={openAlerts.length}
              label={
                openAlerts.length === 1 ? "alert to triage" : "alerts to triage"
              }
              onClick={() => {
                triageRef.current?.focus();
                triageRef.current?.scrollIntoView?.({ block: "nearest" });
              }}
            />
          }
        />

        <Panel
          aria-label="Fleet health"
          className="lg:flex-row lg:items-center lg:justify-between lg:gap-8"
        >
          {/* An overview count, not the primary state of anything: one step below the selected machine. */}
          <DeviceHealthSummary
            summary={fleet}
            noun={{ one: "device", other: "devices" }}
            className="lg:max-w-2xl lg:flex-1"
          />
          {/* Overview figures, so one step below the selected machine's own reported state. */}
          <div className="grid grid-cols-2 gap-4 lg:flex lg:gap-10">
            <Stat
              size="md"
              label="Utilisation"
              value={
                machineIds.length
                  ? Math.round((running / machineIds.length) * 100)
                  : 0
              }
              unit="%"
              trend={`${running} of ${machineIds.length} machines running`}
            />
            <Stat
              size="md"
              label="Site load"
              value={
                siteLoad.value !== null
                  ? siteLoad.value.toFixed(1)
                  : "No reading"
              }
              unit={siteLoad.value !== null ? "kW" : undefined}
              trend="Main meter E-301"
            />
          </div>
        </Panel>

        <div className="grid min-w-0 grid-cols-1 gap-6 md:gap-8 lg:grid-cols-12">
          {/* Attend first: the queue, then the lines, then the equipment on the selected line. */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <div
              ref={triageRef}
              tabIndex={-1}
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Panel
                title="Alert triage"
                description="Worst first. Acknowledging keeps the alert on the list."
                action={
                  <span className="text-headline-sm tabular-nums text-foreground">
                    {openAlerts.length}
                    <span className="sr-only"> to acknowledge</span>
                  </span>
                }
              >
                <AlertList
                  variant="list"
                  alerts={alerts}
                  deviceName={(id) => deviceOf(sim, id).name}
                  onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
                  now={sim.now}
                  label="Site 04 alerts"
                />
              </Panel>
            </div>

            <Panel title="Lines" tone="surface">
              <RailList aria-label="Production lines" className="gap-1">
                {lines.map((l) => {
                  const r = rollups.get(l.id)!;
                  const s = lineStatus(r);
                  const ids = descendantDeviceIds(tree, l.id).filter((id) =>
                    isMachine(iot, id),
                  );
                  return (
                    <RailItem
                      key={l.id}
                      name={l.name}
                      state={`${s.word} · ${ids.filter((id) => isRunning(iot, id)).length}/${ids.length} running`}
                      health={s.state}
                      healthWord={s.word}
                      selected={l.id === line.id}
                      onSelect={() => chooseLine(l.id)}
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          width={18}
                          height={18}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          focusable="false"
                        >
                          <path d="M3 18V9l6 4V9l6 4V6h3v12Z" />
                        </svg>
                      }
                    />
                  );
                })}
              </RailList>
            </Panel>

            <Disclosure
              title="Equipment"
              count={lineDevices.length}
              countNoun="devices"
            >
              <ul
                aria-label={`Equipment on ${line.name}`}
                className="m-0 flex list-none flex-col divide-y divide-border p-0"
              >
                {lineDevices.map(({ id, device: d }) => {
                  const s: ShowcaseState = isDown(d.status)
                    ? "offline"
                    : d.status === "warning"
                      ? "warning"
                      : requestedOf(id)
                        ? "pending"
                        : "confirmed";
                  const v = valueOf(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-current={id === deviceId ? "true" : undefined}
                        onClick={() => select(id)}
                        className={`flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${id === deviceId ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"}`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body-md text-foreground">
                            {d.name}
                          </span>
                          {s !== "confirmed" ? (
                            <span className="inline-flex items-center gap-1 text-body-sm font-normal text-muted-foreground">
                              <StateGlyph state={s} size={14} />
                              {s === "pending"
                                ? "Requested, not confirmed"
                                : showcaseStateWord(s)}
                            </span>
                          ) : null}
                        </span>
                        {v ? (
                          <bdi className="shrink-0 text-body-md font-normal tabular-nums text-muted-foreground">
                            {v}
                          </bdi>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Disclosure>
          </div>

          <div className="flex min-w-0 flex-col gap-6 md:gap-8 lg:col-span-8">
            <Panel
              title="Site plan"
              description={`${line.name} is highlighted. Select a machine on the plan.`}
              aria-label="Site plan"
              className="p-2 sm:p-5"
              action={
                <span className="inline-flex items-center gap-1.5 text-body-md text-foreground">
                  <StateGlyph
                    state={status.state}
                    className={
                      status.state === "confirmed"
                        ? "text-success"
                        : status.state === "warning"
                          ? "text-warning"
                          : "text-muted-foreground"
                    }
                  />
                  {status.word}
                </span>
              }
            >
              <SpaceCanvas
                plan={sitePlan}
                selectedRoomId={line.id}
                onSelectRoom={chooseLine}
                hotspots={hotspots}
                selectedHotspotId={deviceId}
                onSelectHotspot={select}
              />
              <dl className="m-0 grid grid-cols-2 gap-4 rounded-xl bg-muted/60 p-4 sm:grid-cols-4">
                <div className="flex flex-col">
                  <dt className="text-body-sm text-muted-foreground">
                    Running
                  </dt>
                  <dd className="m-0 text-headline-sm tabular-nums text-foreground">
                    {lineMachines.filter((id) => isRunning(iot, id)).length}
                    <span className="text-title-md text-muted-foreground">
                      {" "}
                      / {lineMachines.length}
                    </span>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-body-sm text-muted-foreground">
                    Line load
                  </dt>
                  <dd className="m-0 text-headline-sm tabular-nums text-foreground">
                    {lineLoad.value !== null ? (
                      <>
                        {lineLoad.value.toFixed(1)}
                        <span className="text-title-md text-muted-foreground">
                          {" "}
                          kW
                        </span>
                      </>
                    ) : (
                      <span className="text-title-md text-muted-foreground">
                        No reading
                      </span>
                    )}
                  </dd>
                  {lineLoad.value === null ? (
                    <dd className="m-0 text-body-sm text-muted-foreground">
                      {deviceOf(sim, meter).name} is offline
                    </dd>
                  ) : null}
                </div>
                <div className="flex flex-col sm:col-span-2">
                  <dt className="text-body-sm text-muted-foreground">Status</dt>
                  <dd className="m-0 text-body-md text-foreground">
                    <StateBadge state={status.state}>{status.word}</StateBadge>
                    <span className="block text-body-sm text-muted-foreground">
                      {rollups.get(line.id)!.warning} warning ·{" "}
                      {rollups.get(line.id)!.offline} offline ·{" "}
                      {rollups.get(line.id)!.healthy} healthy
                    </span>
                  </dd>
                </div>
              </dl>
            </Panel>

            <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:gap-8">
              <Panel aria-label={`Selected machine: ${device.name}`}>
                <div className="flex min-w-0 flex-wrap items-start gap-4">
                  <DeviceIllustration
                    category={category}
                    on={isRunning(iot, deviceId)}
                    size="md"
                    className="sm:size-28"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h4 className="text-title-lg text-foreground">
                      {device.name}
                    </h4>
                    <p className="text-body-md text-muted-foreground">
                      {lineName}
                    </p>
                    <StateBadge state={inspectorState}>
                      {down
                        ? "Offline. Showing the last known settings."
                        : device.status === "warning"
                          ? "Needs attention"
                          : pending.length
                            ? "Requested, not yet confirmed"
                            : "Confirmed"}
                    </StateBadge>
                  </div>
                  {power ? (
                    <p
                      className="flex w-full flex-col sm:w-auto sm:items-end sm:text-end"
                      aria-live="off"
                    >
                      <span className="text-body-sm text-muted-foreground">
                        Reported
                      </span>
                      {/* The selected machine's CONFIRMED state: the largest thing in this region. */}
                      <span className="text-headline-lg tabular-nums text-foreground">
                        {down
                          ? "Offline"
                          : isRunning(iot, deviceId)
                            ? "Running"
                            : "Stopped"}
                      </span>
                    </p>
                  ) : null}
                </div>

                {power ? (
                  <div
                    role="group"
                    aria-label={`${device.name} controls`}
                    className={`flex min-w-0 flex-col gap-4 rounded-xl bg-muted/60 p-4 ${pending.length ? "border-2 border-dashed border-primary" : ""}`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-title-md text-foreground">
                          Run
                        </span>
                        <span className="text-body-md text-muted-foreground">
                          {power.format(power.confirmed)}
                          {power.requested !== undefined
                            ? `, requested ${power.format(power.requested)} — not yet confirmed`
                            : ""}
                        </span>
                      </div>
                      <DevicePowerControl
                        state={power.confirmed as "on" | "off"}
                        requested={power.requested as "on" | "off" | undefined}
                        control={power.control}
                        label={`${device.name} run`}
                        size="lg"
                        showLabel={false}
                        onToggle={power.send}
                      />
                    </div>
                    <Lifecycle binding={power} />
                    {level && levelCap ? (
                      <>
                        {/* The `track` variant, not `pill`: at 326px the pill's inline label and value had
                            nowhere to go and clipped, and the track also words a pending request. */}
                        <DeviceLevelControl
                          value={level.confirmed as number}
                          target={level.requested as number | undefined}
                          unit="%"
                          step={5}
                          control={level.control}
                          label={levelCap.label ?? levelCap.id}
                          onCommit={level.send}
                        />
                        <Lifecycle binding={level} />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-xl bg-muted/60 p-4 text-body-md text-muted-foreground">
                    {down
                      ? "This device is offline. It reports nothing and accepts no commands until it reconnects."
                      : "Read-only device: it reports, and has nothing to command."}
                  </p>
                )}
              </Panel>

              {/* Tertiary: how the device is connected and what firmware it runs. Present and complete,
                  but behind a disclosure on a phone so it does not sit beside the run control. */}
              <Disclosure title="Connection and firmware">
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <ConnectionHealth
                      device={device}
                      freshnessMs={STALE_AFTER_MS}
                      now={sim.now}
                      aria-label={`${device.name} connection`}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body-md text-muted-foreground">
                        Signal
                      </span>
                      <SignalStrength value={down ? null : device.signal} />
                    </div>
                    {device.battery !== undefined ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-body-md text-muted-foreground">
                          Battery
                        </span>
                        <BatteryIndicator value={device.battery} />
                      </div>
                    ) : null}
                    <FirmwareStatus
                      showVersions
                      firmware={{
                        currentVersion: device.firmwareVersion,
                        availableVersion:
                          availableFirmware ?? device.firmwareVersion,
                        status: availableFirmware
                          ? "update-available"
                          : "up-to-date",
                      }}
                    />
                    {availableFirmware ? (
                      <p className="text-body-sm text-muted-foreground">
                        Availability is application-provided demo data. No
                        update is sent.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Disclosure>

              <Disclosure
                title="Telemetry"
                count={metrics.length}
                countNoun="metrics"
              >
                {metrics.length === 0 ? (
                  <p className="text-body-md text-muted-foreground">
                    This device reports no measurements.
                  </p>
                ) : (
                  <>
                    {down ? (
                      <p className="rounded-xl bg-muted/60 p-3 text-body-md text-foreground">
                        Offline since{" "}
                        {formatRelativeTime(device.lastSeenAt ?? "", {
                          now: sim.now,
                        })}
                        . The figures below are the last history, marked stale,
                        not current readings.
                      </p>
                    ) : null}
                    <TelemetryGrid label={`${device.name} readings`}>
                      {metrics.map((metric) => (
                        <TelemetryMetric
                          key={metric}
                          {...metricProps(metric)}
                          size="lg"
                        />
                      ))}
                    </TelemetryGrid>
                    <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {metrics
                        .filter(
                          (metric) =>
                            trendOf(iot, deviceId, metric).series.points
                              .length > 1,
                        )
                        .map((metric) => (
                          <div
                            key={metric}
                            className="flex min-w-0 flex-col gap-2"
                          >
                            <h5 className="text-title-sm text-foreground">
                              {METRIC_LABEL[metric] ?? metric} trend
                            </h5>
                            <TelemetryTrend
                              {...trendOf(iot, deviceId, metric)}
                              staleAfterMs={STALE_AFTER_MS}
                              label={`${device.name} ${METRIC_LABEL[metric] ?? metric}`}
                              height={120}
                              precision={1}
                              showSummary
                              dataTable
                            />
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </Disclosure>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Disclosure
            title="Shift log"
            count={selectActivity(sim).length}
            countNoun="events"
          >
            <ActivityTimeline
              variant="blocks"
              events={selectActivity(sim, { limit: 6 })}
              deviceName={(id) => deviceOf(sim, id).name}
              now={sim.now}
              label="Shift log"
            />
          </Disclosure>

          <Disclosure
            title="Routines"
            count={sim.automations.length}
            countNoun="routines"
          >
            <p className="text-body-sm text-muted-foreground">
              Shown, not executed: KinetixUI has no automation engine.
            </p>
            <div className="flex flex-col gap-3">
              {sim.automations.map((automation) => {
                const on = enabled[automation.id] ?? automation.enabled;
                return (
                  <RoutineCard
                    key={automation.id}
                    automation={{
                      ...automation,
                      enabled: on,
                      status: on
                        ? automation.status === "disabled"
                          ? "idle"
                          : automation.status
                        : "disabled",
                    }}
                    now={sim.now}
                    onToggleEnabled={(next) =>
                      setEnabled((prev) => ({ ...prev, [automation.id]: next }))
                    }
                  />
                );
              })}
            </div>
          </Disclosure>

          {energy ? (
            <Disclosure title="Energy today" defaultOpen={false}>
              <EnergySummary
                presentation="sparkline"
                summary={energy.summary}
                today={energy.summary.total}
                days={energy.week}
                dayLabels={dayLabels}
                updatedLabel="Simulated, updates with the clock"
              />
            </Disclosure>
          ) : null}
        </div>
      </div>
    </section>
  );
}
// kx-iot:end
