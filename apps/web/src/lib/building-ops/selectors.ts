/**
 * Read models over a snapshot: floor and building totals, camera rows, and alerts. Pure.
 *
 * The totals rule is the one the demo exists to show: a floor total adds up **current** zone readings only.
 * A zone whose sensor is stale or silent is named as not reporting and left out, so the total is marked
 * partial rather than quietly low; a floor with no current reading has no total at all, never zero.
 */
import type { KinetixDeviceAlert } from "@kinetixui/iot/functions";
import {
  BUSY_RATIO,
  HISTORY_MS,
  OCCUPANCY_STALE_MS,
  SENSOR_SAMPLE_MS,
  cameraStatusAt,
  isoAt,
  linkStateAt,
  occupancySample,
  sensorReportsAt,
} from "./engine";
import { formatClock } from "./format";
import type { BuildingDef, CameraDef, CameraStatus, FloorCameraSummary, FloorDef, FloorOccupancy, OpsSnapshot, Scenario } from "./types";

/* ------------------------------------------------------------------ occupancy */

export function floorOccupancy(floor: FloorDef, snapshot: OpsSnapshot): FloorOccupancy {
  let people = 0;
  let reporting = 0;
  const notReporting: string[] = [];
  const overCapacity: string[] = [];
  for (const zone of floor.zones) {
    const z = snapshot.zones[zone.id];
    if (z && z.freshness === "fresh" && z.value !== null) {
      people += z.value;
      reporting += 1;
      if (z.load === "over") overCapacity.push(zone.id);
    } else {
      notReporting.push(zone.id);
    }
  }
  return {
    floorId: floor.id,
    people: reporting > 0 ? people : null,
    reportingZones: reporting,
    totalZones: floor.zones.length,
    capacity: floor.zones.reduce((sum, z) => sum + z.capacity, 0),
    notReporting,
    overCapacity,
  };
}

export type BuildingOccupancy = {
  people: number | null;
  reportingZones: number;
  totalZones: number;
  capacity: number;
  /** Floors with at least one zone not reporting. */
  partialFloors: readonly string[];
};

export function buildingOccupancy(building: BuildingDef, snapshot: OpsSnapshot): BuildingOccupancy {
  const floors = building.floors.map((f) => floorOccupancy(f, snapshot));
  const reporting = floors.reduce((n, f) => n + f.reportingZones, 0);
  return {
    people: reporting > 0 ? floors.reduce((n, f) => n + (f.people ?? 0), 0) : null,
    reportingZones: reporting,
    totalZones: floors.reduce((n, f) => n + f.totalZones, 0),
    capacity: floors.reduce((n, f) => n + f.capacity, 0),
    partialFloors: floors.filter((f) => f.notReporting.length > 0).map((f) => f.floorId),
  };
}

/* ------------------------------------------------------------------ cameras */

export function needsAttention(status: CameraStatus | undefined): boolean {
  return !status || status.connectivity !== "online" || status.telemetryFreshness !== "fresh";
}

export function floorCameraSummary(floor: FloorDef, snapshot: OpsSnapshot): FloorCameraSummary {
  let online = 0;
  let staleTelemetry = 0;
  for (const camera of floor.cameras) {
    const s = snapshot.cameras[camera.id];
    if (s?.connectivity === "online") {
      online += 1;
      if (s.telemetryFreshness !== "fresh") staleTelemetry += 1;
    }
  }
  return { floorId: floor.id, total: floor.cameras.length, online, down: floor.cameras.length - online, staleTelemetry };
}

export type CameraFilter = "all" | "attention" | "online";

export function filterCameras(
  floor: FloorDef,
  snapshot: OpsSnapshot,
  filter: { status: CameraFilter; zoneId: string | null },
): CameraDef[] {
  return floor.cameras.filter((camera) => {
    if (filter.zoneId && camera.zoneId !== filter.zoneId) return false;
    const s = snapshot.cameras[camera.id];
    if (filter.status === "attention") return needsAttention(s);
    if (filter.status === "online") return s?.connectivity === "online";
    return true;
  });
}

/* ------------------------------------------------------------------ alerts */

/** A device alert with the floor it belongs to, so lists can be filtered per floor. */
export type OpsAlert = KinetixDeviceAlert & { floorId: string };

/** Keep resolved alerts on screen for this long after they clear. */
export const RESOLVED_VISIBLE_MS = 15 * 60_000;

type Episode = { start: number; end: number | null };

/** Turn a per-sample boolean into episodes. `null` means "unknown at this sample": the condition holds. */
function episodes(times: readonly number[], test: (t: number) => boolean | null): Episode[] {
  const out: Episode[] = [];
  let open: Episode | null = null;
  for (const t of times) {
    const v = test(t);
    if (v === null) continue;
    if (v && !open) {
      open = { start: t, end: null };
      out.push(open);
    } else if (!v && open) {
      open.end = t;
      open = null;
    }
  }
  return out;
}

/**
 * Every alert raised in the history window up to `elapsedMs`, open ones and recently resolved ones.
 *
 * Derived by replaying the script on the sample grid, so an alert's `raisedAt` is the moment its condition
 * began, and the same moment however often the page re-renders. Conditions:
 * - a zone at or above {@link BUSY_RATIO} of capacity (warning), or over it (critical) — fresh readings only;
 *   a sample with no current reading neither raises nor clears it;
 * - a floor's network link down or reconnecting (critical, one alert for the floor, not one per device);
 * - a camera offline on a working link (warning);
 * - a zone sensor not reporting on a working link (warning: its zone is left out of totals);
 * - a camera online but its health telemetry stale (info).
 */
export function deriveAlerts(building: BuildingDef, scenario: Scenario, seed: number, elapsedMs: number): OpsAlert[] {
  const now = elapsedMs;
  const times: number[] = [];
  for (let t = -HISTORY_MS; t <= now; t += SENSOR_SAMPLE_MS) times.push(t);
  if (times[times.length - 1] !== now) times.push(now);

  const alerts: OpsAlert[] = [];
  const add = (a: Omit<OpsAlert, "id" | "raisedAt" | "resolvedAt"> & { ep: Episode }) => {
    const { ep, ...rest } = a;
    if (ep.end !== null && now - ep.end > RESOLVED_VISIBLE_MS) return;
    alerts.push({
      ...rest,
      id: `${rest.kind}:${rest.deviceId}:${ep.start}`,
      raisedAt: isoAt(ep.start),
      ...(ep.end !== null ? { resolvedAt: isoAt(ep.end) } : {}),
    });
  };

  for (const floor of building.floors) {
    const linkDown = (t: number) => linkStateAt(scenario, floor.id, t) !== "up";

    for (const ep of episodes(times, linkDown)) {
      const reconnecting = ep.end === null && linkStateAt(scenario, floor.id, now) === "connecting";
      add({
        ep,
        floorId: floor.id,
        deviceId: floor.id,
        kind: "network-link",
        severity: "critical",
        message: reconnecting
          ? `${floor.code} network link reconnecting. ${floor.cameras.length} cameras and ${floor.zones.length} occupancy sensors are not reporting yet.`
          : ep.end === null
            ? `${floor.code} network link down. ${floor.cameras.length} cameras and ${floor.zones.length} occupancy sensors are unreachable; floor occupancy is unavailable.`
            : `${floor.code} network link restored at ${formatClock(building, isoAt(ep.end))}. Cameras and sensors are reporting again.`,
        source: "sim:network",
        sourceLabel: "Network monitor (simulated)",
      });
    }

    for (const zone of floor.zones) {
      // Load: decided by samples the sensor actually delivered.
      const load = (t: number) => {
        if (!sensorReportsAt(scenario, zone, t) || t % SENSOR_SAMPLE_MS !== 0) return null;
        return occupancySample(seed, scenario, zone, t / SENSOR_SAMPLE_MS) / zone.capacity >= BUSY_RATIO;
      };
      for (const ep of episodes(times, load)) {
        // The message describes the latest delivered reading inside the episode.
        const lastT = ep.end ?? now;
        let at = Math.floor(lastT / SENSOR_SAMPLE_MS) * SENSOR_SAMPLE_MS;
        while (at > ep.start && !sensorReportsAt(scenario, zone, at)) at -= SENSOR_SAMPLE_MS;
        const value = occupancySample(seed, scenario, zone, at / SENSOR_SAMPLE_MS);
        // Severity escalates while the episode is open; a resolved alert keeps its worst level.
        let peak = 0;
        for (let t = ep.start; t <= lastT; t += SENSOR_SAMPLE_MS) {
          if (sensorReportsAt(scenario, zone, t)) peak = Math.max(peak, occupancySample(seed, scenario, zone, t / SENSOR_SAMPLE_MS));
        }
        const over = (ep.end === null ? value : peak) > zone.capacity;
        add({
          ep,
          floorId: floor.id,
          deviceId: zone.id,
          kind: "capacity",
          severity: over ? "critical" : "warning",
          message: over
            ? `${zone.name} is over its rated capacity: ${value} people for ${zone.capacity}.`
            : `${zone.name} is near its rated capacity: ${value} people for ${zone.capacity}.`,
          source: "sim:capacity",
          sourceLabel: "Capacity rule (simulated)",
        });
      }

      const scriptedSensor = scenario.events.some((e) => ("zoneId" in e && e.zoneId === zone.id) || ("floorId" in e && e.floorId === floor.id));
      const silent = (t: number) => {
        if (!scriptedSensor) return false;
        if (linkDown(t)) return null; // covered by the floor's link alert
        let last: number | null = null;
        for (let at = Math.floor(t / SENSOR_SAMPLE_MS) * SENSOR_SAMPLE_MS; at >= -HISTORY_MS; at -= SENSOR_SAMPLE_MS) {
          if (sensorReportsAt(scenario, zone, at)) {
            last = at;
            break;
          }
        }
        return last === null || t - last > OCCUPANCY_STALE_MS;
      };
      for (const ep of episodes(times, silent)) {
        add({
          ep,
          floorId: floor.id,
          deviceId: zone.id,
          kind: "stale-reading",
          severity: "warning",
          message:
            ep.end === null
              ? `${zone.name} occupancy sensor is not reporting. Its last count is shown as last known and left out of the floor total.`
              : `${zone.name} occupancy sensor is reporting again.`,
          source: "sim:sensor",
          sourceLabel: "Sensor reporting check (simulated)",
        });
      }
    }

    for (const camera of floor.cameras) {
      const offline = (t: number) => {
        if (linkDown(t)) return null;
        const e = scenario.events
          .filter((x) => (x.kind === "camera-offline" || x.kind === "camera-online") && x.cameraId === camera.id && x.at <= t)
          .sort((a, b) => a.at - b.at)
          .pop();
        return e?.kind === "camera-offline";
      };
      const scripted = scenario.events.some((e) => "cameraId" in e && e.cameraId === camera.id);
      if (!scripted) continue;
      for (const ep of episodes(times, offline)) {
        add({
          ep,
          floorId: floor.id,
          deviceId: camera.id,
          kind: "device-offline",
          severity: "warning",
          message: ep.end === null ? `${camera.name} is offline (${camera.mount}).` : `${camera.name} is back online.`,
          source: "sim:camera",
          sourceLabel: "Camera heartbeat check (simulated)",
        });
      }

      const telemetryStale = (t: number) => {
        if (linkDown(t) || offline(t)) return null;
        // Same rule the snapshot applies, so the alert and the inspector agree on when it went stale.
        return cameraStatusAt(seed, scenario, camera, t).telemetryFreshness !== "fresh";
      };
      for (const ep of episodes(times, telemetryStale)) {
        add({
          ep,
          floorId: floor.id,
          deviceId: camera.id,
          kind: "stale-telemetry",
          severity: "info",
          message:
            ep.end === null
              ? `${camera.name} answers, but its health telemetry has stopped arriving. Values are shown as last known.`
              : `${camera.name} health telemetry is arriving again.`,
          source: "sim:telemetry",
          sourceLabel: "Telemetry freshness check (simulated)",
        });
      }
    }
  }
  return alerts;
}

/** Open (unresolved) alert counts for one floor. */
export function openAlertCount(alerts: readonly OpsAlert[], floorId: string): number {
  return alerts.filter((a) => a.floorId === floorId && !a.resolvedAt).length;
}
