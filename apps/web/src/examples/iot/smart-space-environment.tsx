"use client";

import * as React from "react";
import {
  ActivityTimeline,
  AlertList,
  BatteryIndicator,
  CameraDeviceCard,
  CommandLifecycle,
  DeviceIcon,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  EnergySummary,
  RoutineCard,
  TelemetryGrid,
  TelemetryMetric,
} from "@kinetixui/iot/react";
import { resolveDeviceCategory, type KinetixDeviceCategory } from "@kinetixui/iot/functions";
import {
  DateStrip,
  DeviceIllustration,
  Disclosure,
  HouseMark,
  IconButton,
  IconCluster,
  Panel,
  PillSelector,
  RailItem,
  RailList,
  ShowcaseShell,
  SpaceCanvas,
  SpaceHeader,
  Stat,
  Tile,
  type HotspotState,
  type PlanHotspot,
  type RoomAmbient,
  type ShowcaseState,
} from "@/components/iot/showcase";
import { SAMPLE_IMAGE_LABEL, selectActivity, selectAlerts, selectEnergy, selectReading, selectSpaceRollups } from "@/lib/iot-sim";
import { useIotSimulation, type UseIotSimulation } from "@/lib/iot-sim/use-simulation";
import { smartSpace } from "./scenarios";
import { homeAnchors, homePlan } from "./scenarios/plans";
import { SimNotice, SimTransport, controlOf, deviceOf, readingOf, statusLineOf, type ControlBinding } from "./harness";

// kx-iot:start
/**
 * Connected Space: one home as a place, not a list. A plan of the house with the devices where they are, a
 * room rail with health rolled up from its devices, real controls for whichever room or device you pick, and
 * a side of attention, energy, activity and scenes. Built from one simulated scenario through selectors, so
 * nothing here is a hand-typed count.
 *
 * The aside is ranked, not stacked. Open alerts are always there, expanded, at every width — that is what the
 * column is for. Everything below them is grouped: what is already acknowledged, what happened earlier in the
 * day, and the routines that run themselves each sit behind a group that says what it holds and how many,
 * counted from the data. Nothing is dropped; it is one press away.
 *
 * State stays honest everywhere: the big number, the switch and the marker on the plan show what the device
 * last CONFIRMED. A request is drawn beside it as a dashed "requested, not yet confirmed" mark, and a failed
 * or unreachable one keeps the last confirmed value and offers Retry (never automatic).
 *
 * On a phone the header is ranked rather than laid out flat. PRIMARY is where you are and what needs you:
 * the house mark, the home's name, and ONE summary status line ("7 of 9 online · 3 need attention")
 * carried by a glyph and words, followed immediately by the floor/room navigation, which is what a phone
 * visitor is actually here to press. SECONDARY is the metadata that explains it: the fabricated address and
 * the simulated clock, quieter and on their own line, wrapping rather than truncating. TERTIARY — energy,
 * activity, scenes — is already behind disclosures in the aside. Nothing truthful is hidden: warnings, stale
 * readings, offline devices, open alerts, requested values and Retry stay where they were.
 *
 * SIMULATED. No device is contacted and nothing is sent over a network. The camera shows a labelled sample
 * frame, never video. Scenes and routines are shown, not executed: KinetixUI has no automation engine.
 */
const DAY_MS = 86_400_000;
const HOME = "home";
/** Fabricated, and said so. Metadata, not identity: it is quiet, it wraps, and it is never ellipsised. */
const HOME_ADDRESS = "12 Example Lane, Sample City (fabricated)";
/** How many of a day's events the aside shows before the rest are grouped behind their real count. */
const ACTIVITY_HEAD = 3;
/**
 * A group nested inside a panel or another disclosure: the same control, one tonal step quieter, so the
 * outer surface stays the card and the group reads as part of it rather than as a second card.
 */
const SUBGROUP = "bg-muted/40 shadow-none";

type IconName = "home" | "bell" | "flame" | "leaf" | "power" | "lock" | "unlock";

/** Small original glyphs for the rail, the header and the mode tiles. Decorative: the words carry the meaning. */
function Glyph({ name, size = 20 }: { name: IconName; size?: number }) {
  const d: Record<IconName, React.ReactNode> = {
    home: <path d="M4 11 12 4l8 7M6 10v9h12v-9M10 19v-5h4v5" />,
    bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 21h4" />,
    flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" />,
    leaf: <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14ZM5 19l7-7" />,
    power: <path d="M12 3v8M7 6.5a7 7 0 1 0 10 0" />,
    lock: <path d="M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />,
    unlock: <path d="M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 6.6-1.6" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {d[name]}
    </svg>
  );
}

const MODE_ICONS: Record<string, IconName> = { heat: "flame", eco: "leaf", off: "power", locked: "lock", unlocked: "unlock" };
const withIcons = (modes: readonly { id: string; label: string }[]) => modes.map((m) => ({ ...m, icon: MODE_ICONS[m.id] ? <Glyph name={MODE_ICONS[m.id]!} size={22} /> : undefined }));

/** The lifecycle of a request that has not landed, or did not. Nothing for a confirmed one. */
function Lifecycle({ binding }: { binding: ControlBinding }) {
  if (!binding.command || !binding.unsettled) return null;
  return <CommandLifecycle lifecycle={binding.command.lifecycle} formatValue={binding.format} onRetry={binding.retry} onCancel={binding.cancel} className="w-full" />;
}

/** A worded battery row: the caption says what the meter is. Nothing when the device has no battery. */
function Battery({ value, name }: { value: number | undefined; name: string }) {
  if (value === undefined) return null;
  // Wraps below the narrowest phones: the label and the pill together exceed the content width at 320,
  // and the pill cannot shrink past its numeral, meter and word.
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 self-start">
      <span className="text-body-md text-muted-foreground">Battery</span>
      <BatteryIndicator value={value} presentation="pill" label={`${name} battery`} />
    </div>
  );
}

const shown = (value: unknown) => String(value);
const onOff = (value: unknown) => (value === "on" ? "On" : value === "off" ? "Off" : "Unknown");

/** What the plan, the tiles and the rail need to say about one device, read from the simulation. */
type DeviceView = {
  id: string;
  device: ReturnType<typeof deviceOf>;
  category: KinetixDeviceCategory;
  roomId: string;
  roomName: string;
  state: HotspotState;
  statusWord: string;
  /** The CONFIRMED value. */
  value?: string;
  /** The value asked for and not yet confirmed. */
  requested?: string;
  on: boolean;
  power?: ControlBinding;
};

function deviceView(iot: UseIotSimulation, id: string): DeviceView {
  const { sim } = iot;
  const device = deviceOf(sim, id);
  const room = sim.scenario.spaces.find((s) => s.kind === "room" && s.deviceIds?.includes(id));
  const caps = sim.scenario.capabilities[id] ?? [];
  const bind = (cap: string) => (caps.some((c) => c.id === cap) ? controlOf(iot, id, cap) : undefined);
  const power = bind("power");
  const level = bind("level");
  const setpoint = bind("setpoint");
  const lock = bind("lock");
  const controls = [power, level, setpoint, bind("mode"), lock].filter((b): b is ControlBinding => !!b);

  let value: string | undefined;
  let requested: string | undefined;
  let on = false;
  if (device.type === "light" && power) {
    on = power.confirmed === "on";
    value = on && level ? `${shown(level.confirmed)}%` : onOff(power.confirmed);
    requested = power.requested !== undefined ? onOff(power.requested) : level?.requested !== undefined ? `${shown(level.requested)}%` : undefined;
  } else if (power) {
    on = power.confirmed === "on";
    value = onOff(power.confirmed);
    requested = power.requested !== undefined ? onOff(power.requested) : undefined;
  } else if (setpoint) {
    on = bind("mode")?.confirmed === "heat";
    value = `${shown(setpoint.confirmed)} °C`;
    requested = setpoint.requested !== undefined ? `${shown(setpoint.requested)} °C` : undefined;
  } else if (lock) {
    value = lock.format(lock.confirmed);
    requested = lock.requested !== undefined ? lock.format(lock.requested) : undefined;
  } else {
    const sensor = sim.scenario.sensors.find((s) => s.deviceId === id && (s.metric === "air-quality" || s.metric === "temperature"));
    const reading = sensor ? selectReading(sim, id, sensor.metric) : undefined;
    if (sensor && reading) value = sensor.metric === "air-quality" ? `AQI ${reading.value.toFixed(0)}` : `${reading.value.toFixed(1)} ${sensor.unit ?? ""}`.trim();
  }

  const reading = sim.scenario.sensors.filter((s) => s.deviceId === id).map((s) => selectReading(sim, id, s.metric)?.evaluation.state);
  const alerted = selectAlerts(sim).some((a) => a.deviceId === id);
  let state: HotspotState = "confirmed";
  let statusWord = "Online";
  if (device.status === "offline") [state, statusWord] = ["offline", "Offline"];
  else if (controls.some((b) => b.control.availability === "pending")) [state, statusWord] = ["pending", "Waiting for the device"];
  else if (controls.some((b) => b.unsettled)) [state, statusWord] = ["warning", "Request did not land"];
  else if (device.status === "stale" || reading.some((r) => r === "stale" || r === "warning" || r === "critical") || alerted) [state, statusWord] = ["warning", device.status === "stale" ? "Stale" : "Needs attention"];
  return { id, device, category: resolveDeviceCategory(device), roomId: room?.id ?? HOME, roomName: room?.name ?? "Home", state, statusWord, value, requested, on, power };
}

/** Temperature and humidity readings for the devices in a room, as words. `stale` is said, not implied. */
function ambientOf(iot: UseIotSimulation, roomId: string) {
  const ids = iot.sim.scenario.spaces.find((s) => s.id === roomId)?.deviceIds ?? [];
  const read = (metric: string) => {
    for (const id of ids) {
      const sensor = iot.sim.scenario.sensors.find((s) => s.deviceId === id && s.metric === metric);
      const reading = sensor ? selectReading(iot.sim, id, metric) : undefined;
      if (sensor && reading) {
        const text = `${reading.value.toFixed(sensor.decimals ?? 1)} ${sensor.unit ?? ""}`.trim();
        return { text: reading.evaluation.state === "stale" ? `${text} · stale` : text, source: deviceOf(iot.sim, id).name };
      }
    }
    return undefined;
  };
  return { temperature: read("temperature"), humidity: read("humidity") };
}

/**
 * A floor and its rooms inside the rail.
 *
 * Same structure as the kit's `RailGroup` — a labelled nested list — with one difference that only applies
 * below `sm`: one room per row. A two-column grid at 326px leaves about 50px for the room name, which both
 * clips the name and leaves a dead cell beside a floor with an odd number of rooms. One column per room is
 * shorter in total (nothing wraps to three lines), leaves the temperature and the warning glyph room to sit
 * on the name's line, and reads as a list you scan rather than a ragged grid. From `sm` the kit's own
 * three-column grid and `lg` single-column rail are unchanged.
 */
function FloorGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <li className="flex flex-col gap-2 lg:gap-1">
      <p id={id} className="px-1 text-label-md uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul aria-labelledby={id} className="flex flex-col gap-2 sm:grid sm:grid-cols-3 lg:flex lg:flex-col lg:gap-1">
        {children}
      </ul>
    </li>
  );
}

/**
 * `break-words` is inherited, so it reaches the rail item's own name span: a room name wider than its column
 * breaks instead of spilling past the tile. Below `sm` — where the rail is the first thing a phone visitor
 * reaches and the room tiles are full-width rows — the selected room also takes an inset ring, because a 10%
 * tint alone is not an obvious selection at arm's length. From `sm` the rail is exactly as it was.
 */
const railItemClass = (selected: boolean) => (selected ? "break-words ring-2 ring-inset ring-primary sm:ring-0" : "break-words");

const rollupWords = (r: { total: number; offline: number; warning: number; critical: number }) => {
  const parts = [r.critical ? `${r.critical} critical` : "", r.warning ? `${r.warning} needs attention` : "", r.offline ? `${r.offline} offline` : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "All devices well";
};

/* ---------------------------------- focus compositions ---------------------------------- */

/** The thermostat as the room's hero: a ring around the confirmed target, a request drawn dashed, mode tiles beneath. */
function ClimateHero({ iot, id, roomName }: { iot: UseIotSimulation; id: string; roomName: string }) {
  const target = controlOf(iot, id, "setpoint");
  const mode = controlOf(iot, id, "mode");
  const battery = target.device.battery;
  return (
    <Panel title={target.device.name} description={statusLineOf(target, mode)} as="h5" data-device={id}>
      <div className="grid min-w-0 items-center gap-6 md:grid-cols-2">
        <DeviceSetpointControl
          presentation="ring"
          current={readingOf(iot, id, "temperature").value}
          target={target.confirmed as number}
          requestedTarget={target.requested as number | undefined}
          min={target.capability.min ?? 16}
          max={target.capability.max ?? 26}
          step={target.capability.step ?? 0.5}
          unit="°C"
          secondary={`${roomName} · ${mode.format(mode.confirmed)} mode`}
          control={target.control}
          label={`${target.device.name} target`}
          onCommit={target.send}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <DeviceModeControl
            presentation="tiles"
            modes={withIcons(mode.capability.modes ?? [])}
            value={mode.confirmed as string}
            requested={mode.requested as string | undefined}
            control={mode.control}
            label={`${target.device.name} mode`}
            onSelect={mode.send}
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          />
          <Battery value={battery} name={target.device.name} />
        </div>
      </div>
      <Lifecycle binding={target} />
      <Lifecycle binding={mode} />
    </Panel>
  );
}

/** A light: the object, a big switch, and a fat brightness pill. An offline lamp says so and keeps its last settings. */
function LightPanel({ iot, id }: { iot: UseIotSimulation; id: string }) {
  const power = controlOf(iot, id, "power");
  const level = controlOf(iot, id, "level");
  const offline = power.device.status === "offline";
  return (
    <Panel title={power.device.name} description={statusLineOf(power, level)} as="h5" data-device={id} className={offline ? "border-2 border-dashed border-border" : undefined}>
      <div className="flex min-w-0 items-center gap-4">
        <span className="shrink-0 rounded-2xl bg-muted/60 p-2">
          <DeviceIllustration category="light" on={power.confirmed === "on" && !offline} size="lg" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-headline-lg tabular-nums text-foreground">{power.confirmed === "on" ? `${shown(level.confirmed)}%` : "Off"}</p>
          <DevicePowerControl
            size="lg"
            state={power.confirmed as "on" | "off"}
            requested={power.requested as "on" | "off" | undefined}
            control={power.control}
            label={`${power.device.name} power`}
            onToggle={power.send}
          />
        </div>
      </div>
      <DeviceLevelControl variant="pill" size="lg" value={level.confirmed as number} target={level.requested as number | undefined} unit="%" step={5} control={level.control} label={`${power.device.name} brightness`} onCommit={level.send} />
      <Lifecycle binding={power} />
      <Lifecycle binding={level} />
    </Panel>
  );
}

/** A switched plug: one tile, the confirmed state big, the request dashed. */
function PlugTile({ iot, id }: { iot: UseIotSimulation; id: string }) {
  const power = controlOf(iot, id, "power");
  return (
    <div className="flex min-w-0 flex-col gap-3" data-device={id}>
      <Tile
        name={power.device.name}
        state={statusLineOf(power)}
        visual={<DeviceIllustration category="plug" on={power.confirmed === "on"} />}
        value={onOff(power.confirmed)}
        requested={power.requested !== undefined}
        requestedWord={`Requested ${onOff(power.requested)}, not yet confirmed`}
        control={<DevicePowerControl size="lg" state={power.confirmed as "on" | "off"} requested={power.requested as "on" | "off" | undefined} control={power.control} label={`${power.device.name} power`} showLabel={false} onToggle={power.send} />}
      />
      <Lifecycle binding={power} />
    </div>
  );
}

/** The door: locked or unlocked as icon tiles. The lock is slow on purpose, so the gap between asking and locked is visible. */
function LockPanel({ iot, id }: { iot: UseIotSimulation; id: string }) {
  const lock = controlOf(iot, id, "lock");
  return (
    <Panel title={lock.device.name} description={statusLineOf(lock)} as="h5" data-device={id}>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <p className="text-headline-lg text-foreground">{lock.format(lock.confirmed)}</p>
        <Battery value={lock.device.battery} name={lock.device.name} />
      </div>
      <DeviceModeControl presentation="tiles" modes={withIcons(lock.capability.modes ?? [])} value={lock.confirmed as string} requested={lock.requested as string | undefined} control={lock.control} label="Front door lock" onSelect={lock.send} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} />
      <Lifecycle binding={lock} />
    </Panel>
  );
}

function ReadingsPanel({ iot, id, title, metrics }: { iot: UseIotSimulation; id: string; title: string; metrics: { metric: string; label: string }[] }) {
  const device = deviceOf(iot.sim, id);
  return (
    <Panel title={title} description={device.name} as="h5" data-device={id}>
      <TelemetryGrid label={`${device.name} readings`}>
        {metrics.map((m) => (
          <TelemetryMetric key={m.metric} {...readingOf(iot, id, m.metric)} label={m.label} />
        ))}
      </TelemetryGrid>
      <Battery value={device.battery} name={device.name} />
    </Panel>
  );
}

function DevicePanel({ iot, id, roomName }: { iot: UseIotSimulation; id: string; roomName: string }) {
  const device = deviceOf(iot.sim, id);
  switch (device.type) {
    case "thermostat":
      return <ClimateHero iot={iot} id={id} roomName={roomName} />;
    case "light":
      return <LightPanel iot={iot} id={id} />;
    case "plug":
      return <PlugTile iot={iot} id={id} />;
    case "lock":
      return <LockPanel iot={iot} id={id} />;
    case "air-quality":
      return (
        <ReadingsPanel
          iot={iot}
          id={id}
          title={`Air · ${roomName}`}
          metrics={[
            { metric: "air-quality", label: "Air quality" },
            { metric: "temperature", label: "Temperature" },
            { metric: "humidity", label: "Humidity" },
          ]}
        />
      );
    case "camera":
      return (
        <div className="min-w-0" data-device={id}>
          <CameraDeviceCard device={device} scene="entrance" posterLabel={SAMPLE_IMAGE_LABEL} privacy="off" now={iot.sim.now} />
        </div>
      );
    default:
      return <ReadingsPanel iot={iot} id={id} title={`Sensor · ${roomName}`} metrics={[{ metric: "temperature", label: "Temperature" }]} />;
  }
}

/* ---------------------------------- the composition ---------------------------------- */

export function SmartSpaceEnvironmentExample() {
  const iot = useIotSimulation(smartSpace, { intervalMs: 1000 });
  const { sim } = iot;
  const [spaceId, setSpaceId] = React.useState("room-hall");
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({});
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.parse(sim.startAt) - (6 - i) * DAY_MS).toISOString().slice(0, 10)), [sim.startAt]);
  const [day, setDay] = React.useState(days[6]!);

  const spaces = sim.scenario.spaces;
  const rollups = selectSpaceRollups(sim);
  const floors = spaces.filter((s) => s.kind === "floor");
  const room = spaces.find((s) => s.id === spaceId && s.kind === "room");
  const allViews = Object.keys(sim.devices).map((id) => deviceView(iot, id));
  // Open alerts are the point of the aside and are never folded away. Ones already acknowledged are kept —
  // nothing is dropped — but grouped behind a count, so a handled alert stops competing with an open one.
  const openAlerts = selectAlerts(sim);
  const alerts = selectAlerts(sim, { includeAcknowledged: true });
  const handledAlerts = alerts.filter((a) => !openAlerts.some((open) => open.id === a.id));
  const needAttention = openAlerts.length;
  const online = allViews.filter((v) => v.device.status === "online").length;
  const clock = `${sim.now.slice(11, 16)} UTC`;

  const selectRoom = (id: string) => {
    setSpaceId(id);
    setDeviceId(null);
  };
  const selectDevice = (id: string) => {
    const view = allViews.find((v) => v.id === id);
    if (!view) return;
    setSpaceId(view.roomId);
    setDeviceId(id);
  };
  const jumpToAlerts = () => {
    const el = document.getElementById("space-alerts");
    el?.scrollIntoView({ block: "start" });
    el?.focus({ preventScroll: true });
  };

  const hotspots: PlanHotspot[] = allViews
    .filter((v) => homeAnchors[v.id])
    .map((v) => ({ id: v.id, roomId: homeAnchors[v.id]!.roomId, x: homeAnchors[v.id]!.x, y: homeAnchors[v.id]!.y, category: v.category, state: v.state, label: v.device.name, value: v.value, requested: v.requested }));
  const ambient: RoomAmbient = Object.fromEntries(
    spaces
      .filter((s) => s.kind === "room")
      .map((s) => {
        const a = ambientOf(iot, s.id);
        return [s.id, [a.temperature?.text, a.humidity?.text].filter((t): t is string => !!t)];
      }),
  );

  // A scene is fired by hand, so it leads; a routine or a schedule fires itself, so it keeps its own group.
  // Both groups sit under the same "shown, not executed" sentence, and the group states its real count.
  const scenes = sim.automations.filter((a) => a.kind === "scene");
  const selfRunning = sim.automations.filter((a) => a.kind !== "scene");
  const routineCard = (automation: (typeof sim.automations)[number]) => {
    const on = enabled[automation.id] ?? automation.enabled;
    return (
      <RoutineCard
        key={automation.id}
        automation={{ ...automation, enabled: on, status: on ? (automation.status === "disabled" ? "idle" : automation.status) : "disabled" }}
        now={sim.now}
        onToggleEnabled={(next) => setEnabled((prev) => ({ ...prev, [automation.id]: next }))}
      />
    );
  };

  const energy = selectEnergy(sim);
  const dayLabels = energy ? [...energy.week.map((_, i) => new Date(Date.parse(sim.startAt) - (energy.week.length - i) * DAY_MS).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })), "Today"] : [];
  const activity = selectActivity(sim).map((e) => ({ e, date: new Date(e.timestamp).toISOString().slice(0, 10) }));
  const dayEvents = activity.filter((a) => a.date === day).map((a) => a.e);
  const stripDays = days.map((date) => ({ id: date, date, count: activity.filter((a) => a.date === date).length }));
  // The timeline is newest first, so the head is what happened last. The tail is kept, behind its real count.
  const latestEvents = dayEvents.slice(0, ACTIVITY_HEAD);
  const earlierEvents = dayEvents.slice(ACTIVITY_HEAD);

  const roomDevices = room?.deviceIds ?? [];
  const chosen = deviceId && roomDevices.includes(deviceId) ? deviceId : null;
  const floorName = spaces.find((s) => s.id === room?.parentId)?.name;
  const ambientHere = room ? ambientOf(iot, room.id) : undefined;
  const homeRollup = rollups.get(HOME);
  const air = readingOf(iot, "air-living", "air-quality");
  const airState = selectReading(sim, "air-living", "air-quality")?.evaluation.state;
  const airShown: ShowcaseState = airState === "warning" ? "warning" : airState === "critical" ? "critical" : "confirmed";

  // One summary status line, not two chips racing the title: how much of the home is reachable and how much
  // of it wants you, in one sentence, with the kit's glyph so the state is never colour alone.
  const summaryLine = `${online} of ${allViews.length} online · ${needAttention} ${needAttention === 1 ? "needs" : "need"} attention`;

  const header = (
    <SpaceHeader
      eyebrow={`Home · ${floors.length} floors`}
      title={spaces.find((s) => s.id === HOME)?.name ?? "Home"}
      identity={<HouseMark />}
      status={needAttention ? "warning" : "confirmed"}
      statusWord={<bdi>{summaryLine}</bdi>}
      chips={
        // Secondary metadata, one quiet block rather than three pills racing the title: the fabricated address
        // and the simulated clock. It shares its row with the icon buttons instead of pushing them onto a row
        // of their own, and it wraps — a truncated address tells you neither the street nor that it is fake.
        // "Simulated" stays in the words: that is a truth claim about the clock, not decoration.
        <p className="flex min-w-0 flex-1 flex-col gap-0.5 text-body-sm text-muted-foreground md:flex-none md:flex-row md:items-center md:gap-2">
          <bdi>{HOME_ADDRESS}</bdi>
          <bdi className="tabular-nums">Simulated clock {clock}</bdi>
        </p>
      }
      actions={
        <IconCluster label="Home">
          <IconButton label="Show the whole home" pressed={spaceId === HOME} onClick={() => selectRoom(HOME)}>
            <Glyph name="home" />
          </IconButton>
          <IconButton label="Jump to alerts" badge={needAttention} onClick={jumpToAlerts}>
            <Glyph name="bell" />
          </IconButton>
        </IconCluster>
      }
    />
  );

  const rail = (
    <RailList aria-label="Home and rooms">
      <RailItem
        icon={<Glyph name="home" />}
        name="Whole home"
        state={`${online} of ${allViews.length} online`}
        health={homeRollup && homeRollup.warning + homeRollup.critical > 0 ? "warning" : undefined}
        healthWord={homeRollup ? rollupWords(homeRollup) : undefined}
        selected={spaceId === HOME}
        onSelect={() => selectRoom(HOME)}
        className={railItemClass(spaceId === HOME)}
      />
      {floors.map((floor) => (
        <FloorGroup key={floor.id} label={floor.name}>
          {spaces
            .filter((s) => s.parentId === floor.id)
            .map((r) => {
              const rollup = rollups.get(r.id)!;
              const a = ambientOf(iot, r.id);
              return (
                <RailItem
                  key={r.id}
                  icon={<DeviceIcon category={resolveDeviceCategory(deviceOf(sim, r.deviceIds?.[0] ?? ""))} size={20} />}
                  name={r.name}
                  state={a.temperature?.text ?? `${rollup.total} ${rollup.total === 1 ? "device" : "devices"}`}
                  health={rollup.critical ? "critical" : rollup.warning ? "warning" : rollup.offline ? "offline" : undefined}
                  healthWord={rollupWords(rollup)}
                  count={rollup.total}
                  selected={spaceId === r.id}
                  onSelect={() => selectRoom(r.id)}
                  className={railItemClass(spaceId === r.id)}
                />
              );
            })}
        </FloorGroup>
      ))}
    </RailList>
  );

  const canvas = (
    <SpaceCanvas
      plan={homePlan}
      selectedRoomId={room ? room.id : null}
      onSelectRoom={selectRoom}
      hotspots={hotspots}
      selectedHotspotId={chosen}
      onSelectHotspot={selectDevice}
      ambient={ambient}
      hotspotLabels="selected"
    />
  );

  const focus = room ? (
    <>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex min-w-0 flex-col">
          {floorName ? <p className="text-label-md uppercase tracking-wide text-muted-foreground">{floorName}</p> : null}
          <h4 className="text-headline-lg text-foreground">{room.name}</h4>
          <p className="text-body-md text-muted-foreground">
            <bdi>
              {roomDevices.length} {roomDevices.length === 1 ? "device" : "devices"} · {rollupWords(rollups.get(room.id)!)}
            </bdi>
          </p>
        </div>
        {/* The room's temperature is context for the controls below, not the primary value of the screen, so
            on a phone it is a reading beside the room name rather than a second display-sized number racing
            it. From `sm` it keeps the size it had. */}
        {ambientHere?.temperature ? (
          <p className="flex flex-col items-start sm:items-end">
            <span className="text-headline-sm tabular-nums text-foreground sm:text-display-sm">
              <bdi>{ambientHere.temperature.text}</bdi>
            </span>
            <span className="text-body-sm text-muted-foreground">Room temperature · {ambientHere.temperature.source}</span>
          </p>
        ) : null}
      </div>
      {roomDevices.length > 1 ? (
        <PillSelector
          label={`Devices in ${room.name}`}
          showAll
          allLabel="Whole room"
          value={chosen ?? "all"}
          onChange={(id) => setDeviceId(id === "all" ? null : id)}
          options={roomDevices.map((id) => ({ id, label: deviceOf(sim, id).name, icon: <DeviceIcon category={resolveDeviceCategory(deviceOf(sim, id))} size={16} /> }))}
        />
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-4">
        {(chosen ? [chosen] : roomDevices).map((id) => (
          <DevicePanel key={id} iot={iot} id={id} roomName={room.name} />
        ))}
      </div>
    </>
  ) : (
    <>
      <div className="flex min-w-0 flex-col gap-1 px-1">
        <p className="text-label-md uppercase tracking-wide text-muted-foreground">Whole home</p>
        <h4 className="text-headline-lg text-foreground">{spaces.find((s) => s.id === HOME)?.name}</h4>
      </div>
      <Panel title="At a glance" as="h5">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Stat size="lg" label="Living room" value={ambientOf(iot, "room-living").temperature?.text.split(" ")[0] ?? "—"} unit="°C" />
          <Stat size="lg" label="Air quality" value={air.value === null ? "—" : Math.round(air.value)} unit="AQI" state={airShown} stateWord={airShown === "confirmed" ? "Within range" : undefined} />
          <Stat size="lg" label="Energy today" value={energy ? energy.summary.total.toFixed(1) : "—"} unit={energy?.summary.unit} />
        </div>
      </Panel>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {allViews.map((v) => (
          <Tile
            key={v.id}
            name={v.device.name}
            state={`${v.roomName} · ${v.statusWord}`}
            value={v.value}
            requested={v.requested !== undefined}
            requestedWord={`Requested ${v.requested}, not yet confirmed`}
            visual={<DeviceIllustration category={v.category} on={v.on && v.state !== "offline"} size="md" />}
            onSelect={() => selectDevice(v.id)}
            control={
              v.power ? (
                <DevicePowerControl size="sm" showLabel={false} state={v.power.confirmed as "on" | "off"} requested={v.power.requested as "on" | "off" | undefined} control={v.power.control} label={`${v.device.name} power`} onToggle={v.power.send} />
              ) : undefined
            }
          />
        ))}
      </div>
    </>
  );

  const aside = (
    <>
      <Panel id="space-alerts" tabIndex={-1} title="Needs attention" description={needAttention ? <bdi>{needAttention} to review</bdi> : "All clear"} as="h5" className="scroll-mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-span-2 xl:col-span-1">
        <AlertList hideSummary alerts={openAlerts} onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)} now={sim.now} emptyLabel="Nothing is open. Acknowledged alerts are below." />
        {handledAlerts.length ? (
          <Disclosure title="Acknowledged" count={handledAlerts.length} countNoun="acknowledged alerts" defaultOpen={false} className={SUBGROUP}>
            <AlertList hideSummary alerts={handledAlerts} label="Acknowledged alerts" now={sim.now} />
          </Disclosure>
        ) : null}
      </Panel>

      {energy ? (
        <Disclosure title="Energy" count={energy.summary.items.length} countNoun="devices">
          <EnergySummary
            presentation="sparkline"
            summary={energy.summary}
            today={energy.summary.total}
            days={[...energy.week, energy.summary.total]}
            dayLabels={dayLabels}
            dailyBaseline={sim.scenario.energy?.baseline}
            updatedLabel="Simulated. Moves with the demo clock."
          />
        </Disclosure>
      ) : null}

      <Disclosure title="Activity" count={dayEvents.length} countNoun="events on this day">
        <DateStrip label="Activity day" days={stripDays} value={day} onChange={setDay} now={sim.now} />
        <ActivityTimeline variant="blocks" events={latestEvents} now={sim.now} emptyLabel="Nothing happened on this day." />
        {earlierEvents.length ? (
          <Disclosure title="Earlier on this day" count={earlierEvents.length} countNoun="earlier events" defaultOpen={false} className={SUBGROUP}>
            <ActivityTimeline variant="blocks" events={earlierEvents} label="Earlier activity" now={sim.now} />
          </Disclosure>
        ) : null}
      </Disclosure>

      <Disclosure title="Scenes and routines" count={sim.automations.length} countNoun="scenes and routines">
        <p className="text-body-sm text-muted-foreground">Shown, not executed: KinetixUI has no automation engine.</p>
        {scenes.length ? <div className="flex flex-col gap-3">{scenes.map(routineCard)}</div> : null}
        {/* "Runs on its own" is short enough to sit beside its count and chevron without truncating at 292px. */}
        {selfRunning.length ? (
          <Disclosure title="Runs on its own" count={selfRunning.length} countNoun="routines and schedules" defaultOpen={false} className={SUBGROUP}>
            <div className="flex flex-col gap-3">{selfRunning.map(routineCard)}</div>
          </Disclosure>
        ) : null}
      </Disclosure>
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SimNotice scenario={smartSpace}>
        <SimTransport iot={iot} />
      </SimNotice>
      <ShowcaseShell label="Connected space" railLabel="Home and rooms" canvasLabel="Home plan" focusLabel={room ? room.name : "Whole home"} asideLabel="Attention, energy, activity and scenes" header={header} rail={rail} canvas={canvas} focus={focus} aside={aside} />
    </div>
  );
}
// kx-iot:end
