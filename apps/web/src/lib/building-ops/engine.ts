/**
 * The Building Operations simulation: pure functions of (building, scenario, seed, elapsed time).
 *
 * There is no state to advance and no clock inside. `deriveSnapshot` answers "what does the operations system
 * know at this moment?" directly, so the same inputs always give the same answer — on the server, in the
 * browser, and in a test — however often it is asked. The React hook only decides which moment to ask about.
 *
 * Reporting model (all simulated):
 * - each zone's occupancy sensor reports a people count every {@link SENSOR_SAMPLE_MS};
 * - each camera sends a heartbeat every {@link HEARTBEAT_MS} and a health-telemetry report every
 *   {@link TELEMETRY_SAMPLE_MS};
 * - nothing reports while its floor's network link is down or reconnecting, or while a script has silenced it.
 *
 * A reading older than its stale window is *stale*: it keeps its last value and timestamp but is never counted
 * as current. A sensor with no report in the history window has *no* reading. Neither is ever turned into zero.
 */
import { noiseAt } from "@/lib/iot-sim/prng";
import { SCENARIO_START } from "./fixtures";
import type {
  BuildingDef,
  CameraDef,
  CameraStatus,
  CameraTelemetry,
  FloorDef,
  Freshness,
  OpsSnapshot,
  Scenario,
  ScenarioEvent,
  ZoneDef,
  ZoneOccupancy,
} from "./types";

export const SENSOR_SAMPLE_MS = 5_000;
export const HEARTBEAT_MS = 5_000;
export const TELEMETRY_SAMPLE_MS = 10_000;
/** An occupancy count older than this is stale. Six missed reports. */
export const OCCUPANCY_STALE_MS = 30_000;
/** Camera health telemetry older than this is stale. Four and a half missed reports. */
export const TELEMETRY_STALE_MS = 45_000;
/** How far before the scenario start the system's memory reaches. */
export const HISTORY_MS = 10 * 60_000;
/** A zone at or above this share of its capacity is "busy". */
export const BUSY_RATIO = 0.85;

export const DEFAULT_SEED = 7;

const startMs = Date.parse(SCENARIO_START);
export const isoAt = (elapsedMs: number) => new Date(startMs + elapsedMs).toISOString();

/* ------------------------------------------------------------------ scripted state at a time */

type EventOf<K extends ScenarioEvent["kind"]> = Extract<ScenarioEvent, { kind: K }>;

/** The latest event of the given kinds for a subject at or before `t`, or undefined. */
function latest<K extends ScenarioEvent["kind"]>(
  events: readonly ScenarioEvent[],
  kinds: readonly K[],
  matches: (e: EventOf<K>) => boolean,
  t: number,
): EventOf<K> | undefined {
  let found: EventOf<K> | undefined;
  for (const e of events) {
    if (!(kinds as readonly string[]).includes(e.kind) || e.at > t) continue;
    const typed = e as EventOf<K>;
    if (!matches(typed)) continue;
    if (!found || typed.at >= found.at) found = typed;
  }
  return found;
}

export function linkStateAt(scenario: Scenario, floorId: string, t: number): "up" | "down" | "connecting" {
  const e = latest(scenario.events, ["link-down", "link-connecting", "link-up"] as const, (x) => x.floorId === floorId, t);
  return !e || e.kind === "link-up" ? "up" : e.kind === "link-down" ? "down" : "connecting";
}

function cameraOfflineAt(scenario: Scenario, cameraId: string, t: number): boolean {
  return latest(scenario.events, ["camera-offline", "camera-online"] as const, (x) => x.cameraId === cameraId, t)?.kind === "camera-offline";
}

function telemetrySilentAt(scenario: Scenario, cameraId: string, t: number): boolean {
  return (
    latest(scenario.events, ["camera-telemetry-silent", "camera-telemetry-reporting"] as const, (x) => x.cameraId === cameraId, t)?.kind ===
    "camera-telemetry-silent"
  );
}

function sensorSilentAt(scenario: Scenario, zoneId: string, t: number): boolean {
  return latest(scenario.events, ["sensor-silent", "sensor-reporting"] as const, (x) => x.zoneId === zoneId, t)?.kind === "sensor-silent";
}

/** Whether a zone's sensor delivers a report at time `t`. */
export function sensorReportsAt(scenario: Scenario, zone: ZoneDef, t: number): boolean {
  return linkStateAt(scenario, zone.floorId, t) === "up" && !sensorSilentAt(scenario, zone.id, t);
}

function cameraAnswersAt(scenario: Scenario, camera: CameraDef, t: number): boolean {
  return linkStateAt(scenario, camera.floorId, t) === "up" && !cameraOfflineAt(scenario, camera.id, t);
}

/* ------------------------------------------------------------------ simulated values */

const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/**
 * The people count a zone's sensor reports at sample index `i` (time `i * SENSOR_SAMPLE_MS` from the start).
 * A slow seeded drift around the zone's baseline, plus any scripted surge. Pure.
 */
export function occupancySample(seed: number, scenario: Scenario, zone: ZoneDef, i: number): number {
  const t = i * SENSOR_SAMPLE_MS;
  const phase = noiseAt(seed, `${zone.id}:phase`, 0) * Math.PI * 2;
  const jitter = (noiseAt(seed, zone.id, i) - 0.5) * 0.05;
  let fraction = zone.baseline + 0.07 * Math.sin((2 * Math.PI * t) / 420_000 + phase) + jitter;
  const surge = scenario.surges.find((x) => x.zoneId === zone.id);
  if (surge && t >= surge.from) {
    const eased = smoothstep((t - surge.from) / Math.max(1, surge.peakAt - surge.from));
    fraction = zone.baseline + (surge.peakFraction - zone.baseline) * eased + jitter * 0.4;
  }
  return Math.max(0, Math.round(zone.capacity * fraction));
}

function telemetrySample(seed: number, camera: CameraDef, i: number, observedAt: string): CameraTelemetry {
  const n = (key: string) => noiseAt(seed, `${camera.id}:${key}`, i) - 0.5;
  return {
    frameRate: camera.nominal.frameRate,
    bitrateKbps: Math.round(camera.nominal.bitrateKbps * (1 + n("bitrate") * 0.16)),
    temperatureC: Math.round((camera.nominal.temperatureC + n("temperature") * 2.4) * 10) / 10,
    observedAt,
  };
}

/* ------------------------------------------------------------------ last report lookups */

/** The latest grid time at or before `t` (grid anchored at 0, so negative times work). */
const gridFloor = (t: number, step: number) => Math.floor(t / step) * step;

function freshnessOf(now: number, observed: number | null, staleAfter: number): Freshness {
  if (observed === null) return "none";
  return now - observed > staleAfter ? "stale" : "fresh";
}

export function zoneOccupancyAt(seed: number, scenario: Scenario, zone: ZoneDef, t: number): ZoneOccupancy {
  let observed: number | null = null;
  for (let at = gridFloor(t, SENSOR_SAMPLE_MS); at >= -HISTORY_MS; at -= SENSOR_SAMPLE_MS) {
    if (sensorReportsAt(scenario, zone, at)) {
      observed = at;
      break;
    }
  }
  const value = observed === null ? null : occupancySample(seed, scenario, zone, observed / SENSOR_SAMPLE_MS);
  // A known-broken path makes a reading last-known at once; a silent sensor only ages into stale.
  const freshness = observed !== null && linkStateAt(scenario, zone.floorId, t) !== "up" ? "stale" : freshnessOf(t, observed, OCCUPANCY_STALE_MS);
  const ratio = value === null ? 0 : value / zone.capacity;
  return {
    zoneId: zone.id,
    value,
    observedAt: observed === null ? null : isoAt(observed),
    freshness,
    capacity: zone.capacity,
    load: freshness !== "fresh" ? null : ratio > 1 ? "over" : ratio >= BUSY_RATIO ? "busy" : "normal",
  };
}

export function cameraStatusAt(seed: number, scenario: Scenario, camera: CameraDef, t: number): CameraStatus {
  const link = linkStateAt(scenario, camera.floorId, t);
  const connectivity: CameraStatus["connectivity"] =
    link === "down" ? "unreachable" : link === "connecting" ? "connecting" : cameraOfflineAt(scenario, camera.id, t) ? "offline" : "online";

  let lastSeen = -HISTORY_MS;
  for (let at = gridFloor(t, HEARTBEAT_MS); at >= -HISTORY_MS; at -= HEARTBEAT_MS) {
    if (cameraAnswersAt(scenario, camera, at)) {
      lastSeen = at;
      break;
    }
  }

  let observed: number | null = null;
  for (let at = gridFloor(t, TELEMETRY_SAMPLE_MS); at >= -HISTORY_MS; at -= TELEMETRY_SAMPLE_MS) {
    if (cameraAnswersAt(scenario, camera, at) && !telemetrySilentAt(scenario, camera.id, at)) {
      observed = at;
      break;
    }
  }
  return {
    cameraId: camera.id,
    connectivity,
    lastSeenAt: isoAt(lastSeen),
    telemetry: observed === null ? null : telemetrySample(seed, camera, observed / TELEMETRY_SAMPLE_MS, isoAt(observed)),
    // A camera the system cannot reach has no current telemetry, however recent the last report was.
    telemetryFreshness: observed !== null && connectivity !== "online" ? "stale" : freshnessOf(t, observed, TELEMETRY_STALE_MS),
  };
}

/* ------------------------------------------------------------------ snapshot */

export function deriveSnapshot(building: BuildingDef, scenario: Scenario, seed: number, elapsedMs: number): OpsSnapshot {
  const zones: Record<string, ZoneOccupancy> = {};
  const cameras: Record<string, CameraStatus> = {};
  const links: Record<string, "up" | "down" | "connecting"> = {};
  for (const floor of building.floors) {
    links[floor.id] = linkStateAt(scenario, floor.id, elapsedMs);
    for (const zone of floor.zones) zones[zone.id] = zoneOccupancyAt(seed, scenario, zone, elapsedMs);
    for (const camera of floor.cameras) cameras[camera.id] = cameraStatusAt(seed, scenario, camera, elapsedMs);
  }
  return { scenarioId: scenario.id, now: isoAt(elapsedMs), elapsedMs, zones, cameras, links };
}

/* ------------------------------------------------------------------ lookups */

export function findFloor(building: BuildingDef, floorId: string): FloorDef | undefined {
  return building.floors.find((f) => f.id === floorId);
}

export function findCamera(building: BuildingDef, cameraId: string): CameraDef | undefined {
  for (const f of building.floors) {
    const c = f.cameras.find((x) => x.id === cameraId);
    if (c) return c;
  }
  return undefined;
}

export function findZone(building: BuildingDef, zoneId: string): ZoneDef | undefined {
  for (const f of building.floors) {
    const z = f.zones.find((x) => x.id === zoneId);
    if (z) return z;
  }
  return undefined;
}
