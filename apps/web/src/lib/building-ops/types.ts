/**
 * Types for the Building Operations demo (`/demos/building-operations`).
 *
 * Demo code, not library code: nothing here is exported from a published package. The building, its floors,
 * cameras and sensors are fixtures, and every reading is a pure function of a seed and a simulated time.
 *
 * Two ideas are kept apart on purpose and the types make it hard to mix them up:
 * - **Occupancy** is a count of people in a zone, reported by that zone's occupancy sensor. It is never
 *   derived from cameras, and a camera count is never an occupancy figure.
 * - **Freshness** is part of every reading. A reading that stopped arriving is carried as "last known at
 *   <time>", never as a current value and never as zero.
 */
import type { KinetixConnectivityState } from "@kinetixui/iot/functions";

/** A rectangle in plan units. The plan's viewBox is `0 0 PLAN_WIDTH PLAN_HEIGHT`. */
export type PlanRect = { x: number; y: number; width: number; height: number };

export type ZoneKind = "workspace" | "meeting" | "social" | "lobby" | "service" | "event";

export type ZoneDef = {
  id: string;
  floorId: string;
  name: string;
  kind: ZoneKind;
  /** Rated occupancy for the zone (people). */
  capacity: number;
  rect: PlanRect;
  /** Typical share of capacity in use during the simulated morning, 0–1. */
  baseline: number;
};

export type CameraNetwork = {
  ip: string;
  vlan: number;
  subnetMask: string;
  gateway: string;
  mac: string;
  switchPort: string;
};

export type CameraDef = {
  id: string;
  /** Unique across the building, e.g. `GF-ATR-01`. */
  name: string;
  /** Where it is mounted, in words. */
  mount: string;
  floorId: string;
  zoneId: string;
  /** Marker position in plan units. */
  x: number;
  y: number;
  network: CameraNetwork;
  /** Nominal telemetry the simulated health endpoint reports around. */
  nominal: { frameRate: number; bitrateKbps: number; temperatureC: number };
};

export type FloorLayout = "services" | "lobby" | "office" | "conference";

export type FloorDef = {
  id: string;
  /** Short code shown in the floor rail: `B1`, `GF`, `L1`. */
  code: string;
  name: string;
  layout: FloorLayout;
  zones: readonly ZoneDef[];
  cameras: readonly CameraDef[];
};

export type BuildingDef = {
  id: string;
  name: string;
  site: string;
  /** IANA zone used for every displayed clock time, so server and browser render the same text. */
  timeZone: string;
  /** Top floor first: the order the floor rail lists them in. */
  floors: readonly FloorDef[];
};

/* ------------------------------------------------------------------ scenarios */

export type ScenarioId = "normal" | "crowded" | "camera-offline" | "stale-telemetry" | "recovery";

/**
 * A scripted event. `at` is milliseconds from the scenario's start and may be negative: a scenario can open
 * with a condition already in progress (a camera that went offline four minutes ago).
 */
export type ScenarioEvent =
  | { at: number; kind: "camera-offline" | "camera-online"; cameraId: string }
  | { at: number; kind: "camera-telemetry-silent" | "camera-telemetry-reporting"; cameraId: string }
  | { at: number; kind: "sensor-silent" | "sensor-reporting"; zoneId: string }
  | { at: number; kind: "link-down" | "link-connecting" | "link-up"; floorId: string };

/** A scripted rise in a zone's occupancy, eased in from `from` to `peakAt` and held. */
export type OccupancySurge = { zoneId: string; from: number; peakAt: number; peakFraction: number };

/** A line in the scenario's visible script, so a viewer knows what is about to happen and when. */
export type ScenarioBeat = { at: number; text: string };

export type Scenario = {
  id: ScenarioId;
  label: string;
  summary: string;
  /** The floor the scenario opens on, so the thing it demonstrates is on screen. */
  floorId: string;
  /** The camera selected when the scenario opens. */
  cameraId: string;
  events: readonly ScenarioEvent[];
  surges: readonly OccupancySurge[];
  beats: readonly ScenarioBeat[];
};

/* ------------------------------------------------------------------ derived state */

export type Freshness = "fresh" | "stale" | "none";

/** One zone's occupancy at a moment. `value` is the last reported count; `freshness` says whether it is current. */
export type ZoneOccupancy = {
  zoneId: string;
  /** Last reported people count, or null if the sensor has never reported in the window. */
  value: number | null;
  /** When `value` was reported (ISO). */
  observedAt: string | null;
  freshness: Freshness;
  capacity: number;
  /** Load band of a **fresh** reading only. A stale or missing reading has no band. */
  load: "normal" | "busy" | "over" | null;
};

export type CameraTelemetry = {
  frameRate: number;
  bitrateKbps: number;
  temperatureC: number;
  /** When these values were reported (ISO). */
  observedAt: string;
};

export type CameraStatus = {
  cameraId: string;
  connectivity: KinetixConnectivityState;
  /** Last heartbeat (ISO). */
  lastSeenAt: string;
  /** The latest telemetry report the system holds, current or not. Null before the first report. */
  telemetry: CameraTelemetry | null;
  telemetryFreshness: Freshness;
};

export type FloorOccupancy = {
  floorId: string;
  /** Sum of fresh zone readings only. Null when no zone on the floor has a current reading. */
  people: number | null;
  reportingZones: number;
  totalZones: number;
  /** Capacity of every zone on the floor. */
  capacity: number;
  /** Zones whose reading is stale or missing, so the total is partial. */
  notReporting: readonly string[];
  overCapacity: readonly string[];
};

export type FloorCameraSummary = {
  floorId: string;
  total: number;
  online: number;
  /** Offline, unreachable, connecting or unknown. */
  down: number;
  /** Online, but telemetry has stopped arriving. */
  staleTelemetry: number;
};

export type OpsSnapshot = {
  scenarioId: ScenarioId;
  /** ISO time the snapshot describes. */
  now: string;
  /** Milliseconds since the scenario started. */
  elapsedMs: number;
  zones: Readonly<Record<string, ZoneOccupancy>>;
  cameras: Readonly<Record<string, CameraStatus>>;
  links: Readonly<Record<string, "up" | "down" | "connecting">>;
};
