"use client";

/**
 * Building Operations demo: a dark operations console over the simulated building in `@/lib/building-ops`.
 *
 * Everything shown is derived from one simulated time (`useOpsClock`) and one view state (`reduceView`), so the
 * plan, the floor rail, the totals, the alerts, the inspector and the camera list cannot disagree: they are all
 * read from the same snapshot in the same render.
 *
 * Demo code for the website. It uses `@kinetixui/ui` and `@kinetixui/iot` as a consumer would and adds nothing
 * to either package.
 */
import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Building2, Camera, CameraOff, FastForward, FlaskConical, Maximize2, Minimize2, Pause, Play, RotateCcw, Users } from "lucide-react";
import { AlertList } from "@kinetixui/iot/react";
import { Button, NativeSelect, NativeSelectOption, Switch, Label, Toggle } from "@kinetixui/ui";
import {
  BUILDING,
  DEFAULT_SCENARIO,
  DEFAULT_SEED,
  SCENARIOS,
  buildingOccupancy,
  deriveAlerts,
  deriveSnapshot,
  filterCameras,
  findCamera,
  findFloor,
  findZone,
  floorCameraSummary,
  floorOccupancy,
  formatAgo,
  formatClock,
  formatElapsed,
  getScenario,
  initialViewState,
  isScenarioId,
  openAlertCount,
  reduceView,
  type BuildingDef,
  type FloorDef,
  type OpsAlert,
  type OpsSnapshot,
  type OpsViewAction,
  type OpsViewState,
  type ScenarioId,
} from "@/lib/building-ops";
import { useOpsClock, type OpsClockOptions } from "@/lib/building-ops/use-ops-clock";
import { cn } from "@/lib/utils";
import { CameraInspector, CameraList } from "./camera-panel";
import { FloorPlan } from "./floor-plan";
import { StatusText, ZONE_TONE_TEXT, zoneState } from "./status";

export type BuildingOpsDemoProps = {
  /** Scenario to open with. The `?scenario=` URL parameter overrides it after mount. */
  initialScenario?: ScenarioId;
  seed?: number;
  /** Clock options; tests inject a manual clock. */
  clock?: OpsClockOptions;
  /** Read and write `?scenario=` in the address bar. Off in tests. */
  syncUrl?: boolean;
};

const STEP_MS = 15_000;

export function BuildingOpsDemo({ initialScenario = DEFAULT_SCENARIO, seed = DEFAULT_SEED, clock: clockOptions, syncUrl = true }: BuildingOpsDemoProps) {
  const building = BUILDING;
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>(initialScenario);
  const scenario = getScenario(scenarioId);
  const [view, dispatch] = React.useReducer(
    (state: OpsViewState, action: OpsViewAction) => reduceView(building, state, action),
    scenario,
    initialViewState,
  );
  const clock = useOpsClock(clockOptions);
  const [acknowledged, setAcknowledged] = React.useState<Record<string, string>>({});

  const snapshot = React.useMemo(() => deriveSnapshot(building, scenario, seed, clock.elapsedMs), [building, scenario, seed, clock.elapsedMs]);
  const alerts = React.useMemo(
    () => deriveAlerts(building, scenario, seed, clock.elapsedMs).map((a) => (acknowledged[a.id] ? { ...a, acknowledgedAt: acknowledged[a.id] } : a)),
    [building, scenario, seed, clock.elapsedMs, acknowledged],
  );

  const floor = findFloor(building, view.floorId)!;
  const zoneName = React.useCallback((id: string) => findZone(building, id)?.name ?? id, [building]);
  const cameras = filterCameras(floor, snapshot, { status: view.status, zoneId: view.zoneId });
  const selectedCamera = view.cameraId ? findCamera(building, view.cameraId) : undefined;

  const loadScenario = React.useCallback(
    (id: ScenarioId) => {
      setScenarioId(id);
      dispatch({ type: "scenario", scenario: getScenario(id) });
      setAcknowledged({});
      clock.restart();
    },
    [clock],
  );
  // Alert ids are deterministic, so a replayed alert would otherwise come back already acknowledged.
  const restartScenario = React.useCallback(() => {
    setAcknowledged({});
    clock.restart();
  }, [clock]);

  // `?scenario=` selects a scenario on load; choosing one writes it back, so a link reproduces the view.
  React.useEffect(() => {
    if (!syncUrl) return;
    const fromUrl = new URLSearchParams(window.location.search).get("scenario");
    if (isScenarioId(fromUrl) && fromUrl !== scenarioId) loadScenario(fromUrl);
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chooseScenario = (id: ScenarioId) => {
    loadScenario(id);
    if (syncUrl) {
      const url = new URL(window.location.href);
      if (id === DEFAULT_SCENARIO) url.searchParams.delete("scenario");
      else url.searchParams.set("scenario", id);
      window.history.replaceState(window.history.state, "", url);
    }
  };

  // Fullscreen: the whole console, through the standard API. Hidden where the browser has none.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [canFullscreen, setCanFullscreen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  React.useEffect(() => {
    setCanFullscreen(typeof document !== "undefined" && !!document.fullscreenEnabled);
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  // Announce newly opened alerts once, politely. Nothing is announced for the steady per-second refresh.
  const [announcement, setAnnouncement] = React.useState("");
  const seenAlerts = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    const openIds = alerts.filter((a) => !a.resolvedAt).map((a) => a.id);
    if (seenAlerts.current === null) {
      seenAlerts.current = new Set(openIds);
      return;
    }
    const fresh = alerts.filter((a) => !a.resolvedAt && !seenAlerts.current!.has(a.id));
    const resolved = alerts.filter((a) => a.resolvedAt && seenAlerts.current!.has(a.id));
    seenAlerts.current = new Set(openIds);
    if (fresh.length) setAnnouncement(`New alert: ${fresh.map((a) => a.message).join(" ")}`);
    else if (resolved.length) setAnnouncement(`Resolved: ${resolved.map((a) => a.message).join(" ")}`);
  }, [alerts]);
  React.useEffect(() => {
    seenAlerts.current = null;
    setAnnouncement(`Scenario loaded: ${scenario.label}.`);
  }, [scenario]);

  const floorAlerts = alerts.filter((a) => a.floorId === floor.id);
  const pastBeats = scenario.beats.filter((b) => b.at <= clock.elapsedMs);
  const nextBeat = scenario.beats.find((b) => b.at > clock.elapsedMs);

  return (
    <div
      ref={rootRef}
      data-building-ops=""
      data-scenario={scenario.id}
      className={cn("dark bg-background text-foreground [color-scheme:dark]", isFullscreen && "h-full overflow-auto")}
    >
      <div className="mx-auto grid max-w-[110rem] grid-cols-[minmax(0,1fr)] gap-3 px-3 py-3 sm:gap-4 sm-rem:px-4 sm:py-4 lg-rem:px-6">
        {/* Console header */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="break-words font-display text-title-lg font-semibold">{building.name}</h1>
              <p className="text-body-sm text-muted-foreground">Building operations · {building.site}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#bo-about"
              data-simulated-indicator=""
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-warning px-3 py-1 text-label-md font-semibold text-warning outline-none focus-visible:shadow-focus"
            >
              <FlaskConical aria-hidden="true" className="size-4" />
              Simulated data
            </a>
            {canFullscreen ? (
              <Button variant="Outline" size="sm" onClick={toggleFullscreen} aria-pressed={isFullscreen}>
                {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </Button>
            ) : null}
          </div>
        </header>

        {/* Scenario and playback */}
        <section aria-label="Scenario and simulated time" className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card px-4 py-3 xl-rem:grid-cols-[auto_minmax(0,1fr)] xl-rem:items-center">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <div className="grid min-w-0 max-w-full basis-full gap-1 sm:basis-auto">
              <Label htmlFor="bo-scenario" className="text-label-sm text-muted-foreground">
                Scenario
              </Label>
              <NativeSelect id="bo-scenario" className="max-w-full" value={scenario.id} onChange={(e) => isScenarioId(e.target.value) && chooseScenario(e.target.value)}>
                {SCENARIOS.map((s, i) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {i + 1}. {s.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button variant="Outline" size="sm" onClick={() => clock.setPlaying(!clock.playing)} aria-label={clock.playing ? "Pause simulation" : "Play simulation"}>
              {clock.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span aria-hidden="true">{clock.playing ? "Pause" : "Play"}</span>
            </Button>
            <Button variant="Outline" size="sm" onClick={() => clock.step(STEP_MS)} aria-label="+15 s, advance simulated time by 15 seconds">
              <FastForward aria-hidden="true" />
              <span aria-hidden="true">+15 s</span>
            </Button>
            <Button variant="Ghost" size="sm" onClick={restartScenario} aria-label="Restart scenario">
              <RotateCcw aria-hidden="true" />
              <span aria-hidden="true">Restart</span>
            </Button>
          </div>
          <div className="grid min-w-0 gap-1 text-body-sm">
            <p className="tabular-nums text-foreground">
              <span className="text-muted-foreground">Simulated time </span>
              <span data-sim-clock="">{formatClock(building, snapshot.now)} UTC</span>
              <span className="text-muted-foreground"> · {formatElapsed(clock.elapsedMs)} into the scenario{clock.playing ? "" : " · paused"}</span>
            </p>
            <p className="break-words text-muted-foreground">{scenario.summary}</p>
            <p className="break-words text-foreground" data-beat="">
              {pastBeats.length ? pastBeats[pastBeats.length - 1]!.text : null}
              {nextBeat ? <span className="text-muted-foreground"> Next at {formatElapsed(nextBeat.at)}: {nextBeat.text}</span> : null}
            </p>
          </div>
        </section>

        <p role="status" aria-live="polite" className="sr-only" data-announcer="">
          {announcement}
        </p>

        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] items-start gap-4",
            // The side column spans the main rows; the last row is `1fr` so a tall side column grows that row
            // (whose content sits at its top) instead of opening gaps between the totals, the plan and the details.
            "lg-rem:grid-cols-[minmax(0,1fr)_22rem] lg-rem:grid-rows-[auto_auto_auto_1fr] lg-rem:[grid-template-areas:'rail_rail'_'kpis_side'_'map_side'_'details_side']",
            "xl-rem:grid-cols-[8.5rem_minmax(0,1fr)_24rem] xl-rem:grid-rows-[auto_auto_1fr] xl-rem:[grid-template-areas:'rail_kpis_side'_'rail_map_side'_'rail_details_side']",
          )}
        >
          <div className="min-w-0 lg-rem:[grid-area:rail] xl-rem:self-stretch">
            <FloorRail building={building} snapshot={snapshot} alerts={alerts} floorId={floor.id} onSelect={(id) => dispatch({ type: "floor", floorId: id })} />
          </div>

          <div className="min-w-0 lg-rem:[grid-area:kpis]">
            <Totals building={building} floor={floor} snapshot={snapshot} alerts={floorAlerts} />
          </div>

          <section aria-labelledby="bo-plan-title" className="grid min-w-0 gap-3 rounded-xl border border-border bg-card p-3 lg-rem:[grid-area:map] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 id="bo-plan-title" className="text-title-sm font-semibold">
                {floor.name} <span className="font-normal text-muted-foreground">plan</span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Switch id="bo-layer-cameras" checked={view.showCameras} onCheckedChange={(on) => dispatch({ type: "layer", layer: "cameras", on })} />
                  <Label htmlFor="bo-layer-cameras" className="text-label-md">
                    Camera markers
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="bo-layer-occupancy" checked={view.showOccupancy} onCheckedChange={(on) => dispatch({ type: "layer", layer: "occupancy", on })} />
                  <Label htmlFor="bo-layer-occupancy" className="text-label-md">
                    Occupancy
                  </Label>
                </div>
              </div>
            </div>
            <FloorPlan
              floor={floor}
              snapshot={snapshot}
              selectedCameraId={view.cameraId}
              zoneId={view.zoneId}
              showCameras={view.showCameras}
              showOccupancy={view.showOccupancy}
              onSelectCamera={(id) => dispatch({ type: "camera", cameraId: id })}
              onSelectZone={(id) => dispatch({ type: "zone", zoneId: id })}
              zoneName={zoneName}
            />
            <PlanLegend />
          </section>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 sm-rem:grid-cols-2 lg-rem:grid-cols-[minmax(0,1fr)] lg-rem:[grid-area:side]">
            <CameraInspector building={building} camera={selectedCamera} floor={floor} snapshot={snapshot} zoneName={zoneName} />
            <CameraList
              floor={floor}
              cameras={cameras}
              snapshot={snapshot}
              selectedId={view.cameraId}
              status={view.status}
              zoneId={view.zoneId}
              zoneName={zoneName}
              onSelect={(id) => dispatch({ type: "camera", cameraId: id })}
              onStatus={(status) => dispatch({ type: "status", status })}
              onClearZone={() => dispatch({ type: "zone", zoneId: null })}
            />
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg-rem:[grid-area:details]">
            <ZoneTable floor={floor} snapshot={snapshot} zoneId={view.zoneId} onSelect={(id) => dispatch({ type: "zone", zoneId: id })} building={building} />
            <section aria-labelledby="bo-alerts-title" className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <h2 id="bo-alerts-title" className="text-title-sm font-semibold">
                Alerts on {floor.code}
              </h2>
              <AlertList
                alerts={floorAlerts}
                label={`Alerts on ${floor.code}`}
                emptyLabel={`No alerts on ${floor.code}.`}
                deviceName={(id) => findCamera(building, id)?.name ?? findZone(building, id)?.name ?? findFloor(building, id)?.name}
                onAcknowledge={(a) => setAcknowledged((prev) => ({ ...prev, [a.id]: snapshot.now }))}
                now={snapshot.now}
              />
            </section>
          </div>
        </div>

        <About />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ floor rail */

function FloorRail({
  building,
  snapshot,
  alerts,
  floorId,
  onSelect,
}: {
  building: BuildingDef;
  snapshot: OpsSnapshot;
  alerts: readonly OpsAlert[];
  floorId: string;
  onSelect: (id: string) => void;
}) {
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const floors = building.floors;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = floors.length - 1;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i === last ? 0 : i + 1)
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i === 0 ? last : i - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(floors[next]!.id);
    refs.current.get(floors[next]!.id)?.focus();
  };
  return (
    <nav aria-label="Floors" className="rounded-xl border border-border bg-card p-2 xl-rem:h-full">
      <div role="radiogroup" aria-label="Floor" className="flex gap-2 overflow-x-auto p-0.5 xl-rem:flex-col xl-rem:overflow-visible">
        {floors.map((f, i) => {
          const occ = floorOccupancy(f, snapshot);
          const cams = floorCameraSummary(f, snapshot);
          const open = openAlertCount(alerts, f.id);
          const selected = f.id === floorId;
          const people = occ.people === null ? "no current occupancy" : `${occ.people} people${occ.notReporting.length ? ", partial" : ""}`;
          return (
            <button
              key={f.id}
              ref={(el) => {
                if (el) refs.current.set(f.id, el);
                else refs.current.delete(f.id);
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-floor-option={f.id}
              aria-label={`${f.code}, ${f.name.split(" · ")[1] ?? f.name}: ${people}; ${cams.online} of ${cams.total} cameras online${open ? `; ${open} open alert${open === 1 ? "" : "s"}` : ""}`}
              onClick={() => onSelect(f.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "grid min-w-[7.5rem] shrink-0 gap-1 rounded-lg border px-3 py-2 text-start outline-none xl-rem:min-w-0",
                "transition-colors duration-fast ease-standard motion-reduce:transition-none focus-visible:shadow-focus",
                selected ? "border-primary bg-primary/15" : "border-transparent bg-surface-grouped hover:border-border hover:bg-accent",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={cn("font-display text-title-md font-semibold", selected ? "text-foreground" : "text-foreground/90")}>{f.code}</span>
                {open ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive px-1.5 text-label-sm font-semibold text-destructive-foreground">
                    <AlertTriangle aria-hidden="true" className="size-3" />
                    {open}
                  </span>
                ) : null}
              </span>
              <span className="inline-flex items-center gap-1 text-label-sm tabular-nums text-foreground">
                <Users aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                {occ.people === null ? "—" : occ.people}
                {occ.people !== null && occ.notReporting.length ? <span className="text-muted-foreground">+?</span> : null}
              </span>
              {/* Text stays at body contrast on the selected tint; the glyph (a non-text cue, 3:1) carries the colour. */}
              <span className="inline-flex items-center gap-1 text-label-sm tabular-nums text-foreground">
                {cams.down ? (
                  <CameraOff aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <Camera aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {cams.online}/{cams.total}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ totals */

function Tile({ label, value, detail, tone, data }: { label: string; value: React.ReactNode; detail: React.ReactNode; tone?: "warn" | "bad"; data: string }) {
  return (
    <div data-total={data} className={cn("grid content-start gap-1 rounded-xl border bg-card p-4", tone === "bad" ? "border-destructive" : tone === "warn" ? "border-warning" : "border-border")}>
      <dt className="text-label-md text-muted-foreground">{label}</dt>
      <dd className="font-display text-headline-sm font-semibold tabular-nums text-foreground">{value}</dd>
      <dd className="text-body-sm text-muted-foreground">{detail}</dd>
    </div>
  );
}

function Totals({ building, floor, snapshot, alerts }: { building: BuildingDef; floor: FloorDef; snapshot: OpsSnapshot; alerts: readonly OpsAlert[] }) {
  const occ = floorOccupancy(floor, snapshot);
  const all = buildingOccupancy(building, snapshot);
  const cams = floorCameraSummary(floor, snapshot);
  const open = alerts.filter((a) => !a.resolvedAt);
  const critical = open.filter((a) => a.severity === "critical").length;
  const partial = occ.notReporting.length > 0;
  return (
    <dl aria-label={`Totals for ${floor.code}`} className="grid grid-cols-1 gap-3 sm-rem:grid-cols-2 xl-rem:grid-cols-4">
      <Tile
        data="floor-people"
        label={`People on ${floor.code}`}
        value={occ.people === null ? "Unavailable" : partial ? `${occ.people}+` : occ.people}
        tone={occ.overCapacity.length ? "bad" : partial || occ.people === null ? "warn" : undefined}
        detail={
          occ.people === null
            ? `No current reading from any of ${occ.totalZones} zones.`
            : partial
              ? `Partial: ${occ.reportingZones} of ${occ.totalZones} zones reporting. Rated capacity ${occ.capacity}.`
              : `All ${occ.totalZones} zones reporting. Rated capacity ${occ.capacity}.`
        }
      />
      <Tile
        data="building-people"
        label="People in building"
        value={all.people === null ? "Unavailable" : all.partialFloors.length ? `${all.people}+` : all.people}
        detail={all.partialFloors.length ? `Partial: ${all.reportingZones} of ${all.totalZones} zones reporting.` : `All ${all.totalZones} zones reporting.`}
      />
      <Tile
        data="floor-cameras"
        label={`Cameras on ${floor.code}`}
        value={`${cams.online} of ${cams.total} online`}
        tone={cams.down ? "bad" : cams.staleTelemetry ? "warn" : undefined}
        detail={
          [cams.down ? `${cams.down} not answering` : null, cams.staleTelemetry ? `${cams.staleTelemetry} with stale telemetry` : null].filter(Boolean).join(" · ") ||
          "Devices, not people: cameras do not count occupancy here."
        }
      />
      <Tile
        data="floor-alerts"
        label={`Open alerts on ${floor.code}`}
        value={open.length}
        tone={critical ? "bad" : open.length ? "warn" : undefined}
        detail={open.length ? `${critical} critical · ${open.length - critical} other` : "Nothing needs attention."}
      />
    </dl>
  );
}

/* ------------------------------------------------------------------ zones */

function ZoneTable({
  building,
  floor,
  snapshot,
  zoneId,
  onSelect,
}: {
  building: BuildingDef;
  floor: FloorDef;
  snapshot: OpsSnapshot;
  zoneId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section aria-labelledby="bo-zones-title" className="grid min-w-0 gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <h2 id="bo-zones-title" className="text-title-sm font-semibold">
        Zones on {floor.code}
      </h2>
      <p className="text-body-sm text-muted-foreground">Occupancy comes from each zone&rsquo;s people-counting sensor (simulated). Select a zone to filter its cameras.</p>
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border text-start text-label-md text-muted-foreground">
              <th scope="col" className="py-2 pe-3 text-start font-medium">Zone</th>
              <th scope="col" className="py-2 pe-3 text-end font-medium">People</th>
              <th scope="col" className="py-2 pe-3 text-end font-medium">Capacity</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Status</th>
              <th scope="col" className="py-2 text-start font-medium">Last report</th>
            </tr>
          </thead>
          <tbody>
            {floor.zones.map((zone) => {
              const z = snapshot.zones[zone.id];
              const s = zoneState(z);
              const current = z?.freshness === "fresh";
              const selected = zoneId === zone.id;
              return (
                <tr key={zone.id} data-zone-row={zone.id} className={cn("border-b border-border/60 last:border-0", selected && "bg-accent")}>
                  <th scope="row" className="py-1.5 pe-3 text-start font-normal">
                    {/* The library Toggle: pressed selects the zone, pressing again clears the selection. */}
                    <Toggle
                      size="sm"
                      pressed={selected}
                      onPressedChange={(on) => onSelect(on ? zone.id : null)}
                      className="h-auto min-h-8 justify-start px-1 py-1 text-start text-label-lg text-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2"
                    >
                      {zone.name}
                    </Toggle>
                  </th>
                  <td className="py-1.5 pe-3 text-end tabular-nums">
                    {z?.value === null || z === undefined ? (
                      <span className="text-muted-foreground">No reading</span>
                    ) : current ? (
                      <span className="text-foreground">{z.value}</span>
                    ) : (
                      <span className="text-muted-foreground">Last known {z.value}</span>
                    )}
                  </td>
                  <td className="py-1.5 pe-3 text-end tabular-nums text-muted-foreground">{zone.capacity}</td>
                  <td className="py-1.5 pe-3">
                    <StatusText Icon={s.Icon} word={s.word} className={cn("text-label-md", ZONE_TONE_TEXT[s.tone], s.tone !== "ok" && "font-medium")} />
                  </td>
                  <td className="py-1.5 tabular-nums text-muted-foreground">
                    {z?.observedAt ? `${formatClock(building, z.observedAt)} (${formatAgo(z.observedAt, snapshot.now)})` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ legend and disclosure */

function PlanLegend() {
  const item = (swatch: React.ReactNode, text: string) => (
    <li className="inline-flex items-center gap-1.5">
      {swatch}
      <span>{text}</span>
    </li>
  );
  return (
    <ul aria-label="Plan legend" className="flex flex-wrap gap-x-4 gap-y-1.5 text-label-sm text-muted-foreground">
      {item(<span aria-hidden="true" className="size-3 rounded-sm border border-foreground/50 bg-primary/10" />, "Within capacity")}
      {item(<span aria-hidden="true" className="size-3 rounded-sm border border-foreground/50 bg-warning/40" />, "Near capacity (85%+)")}
      {item(
        <span aria-hidden="true" className="size-3 rounded-sm border border-foreground/50 bg-[repeating-linear-gradient(45deg,hsl(var(--destructive)/0.6)_0_2px,transparent_2px_5px)]" />,
        "Over capacity (hatched)",
      )}
      {item(
        <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-muted-foreground bg-[radial-gradient(hsl(var(--muted-foreground)/0.6)_1px,transparent_1px)] [background-size:4px_4px]" />,
        "Not reporting (dotted)",
      )}
      {item(<Camera aria-hidden="true" className="size-3.5" />, "Camera placeholder marker")}
    </ul>
  );
}

function About() {
  return (
    <section id="bo-about" aria-labelledby="bo-about-title" className="grid gap-3 rounded-xl border border-border bg-card p-4 text-body-sm text-muted-foreground">
      <h2 id="bo-about-title" className="text-title-sm font-semibold text-foreground">
        What is simulated
      </h2>
      <ul className="grid list-disc gap-1.5 ps-5">
        <li>
          Everything. The building, its floors, sensors, cameras, network values and alerts are fixtures, and every reading is generated in your
          browser from a fixed seed and a simulated clock. Nothing is sent or received over a network.
        </li>
        <li>
          Occupancy comes from simulated per-zone people-counting sensors. Cameras do not count people here: there is no video, no image, no
          recording, no people detection and no on-device inference behind any marker.
        </li>
        <li>
          A reading that stops arriving is shown as last known with its time and left out of totals; a floor with no current readings shows no
          total rather than zero.
        </li>
        <li>This page does not stand in for validation against real devices.</li>
      </ul>
      <p>
        Built with <code className="font-mono text-foreground">@kinetixui/ui</code> and the experimental{" "}
        <code className="font-mono text-foreground">@kinetixui/iot</code> React components.{" "}
        <Link href="/iot" className="font-medium text-foreground underline underline-offset-4">
          Back to the IoT lab
        </Link>
        {" · "}
        <Link href="/docs/iot" className="font-medium text-foreground underline underline-offset-4">
          IoT docs
        </Link>
      </p>
    </section>
  );
}
