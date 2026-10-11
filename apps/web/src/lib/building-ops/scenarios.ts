/**
 * The five scripted scenarios. Each opens on the floor and camera that shows its point, and lists its beats so
 * a viewer can see what is about to happen. Times are milliseconds from the scenario start; negative times are
 * history the scenario opens with.
 */
import type { Scenario, ScenarioId } from "./types";

const s = (seconds: number) => seconds * 1000;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "normal",
    label: "Normal operation",
    summary: "Every occupancy sensor and camera is reporting. Occupancy drifts with the morning, inside every zone's rating.",
    floorId: "gf",
    cameraId: "gf-cam-4",
    events: [],
    surges: [],
    beats: [{ at: 0, text: "All sensors and cameras reporting. No open alerts." }],
  },
  {
    id: "crowded",
    label: "Crowded zone",
    summary: "An event fills the ground-floor Atrium past its rated capacity of 180.",
    floorId: "gf",
    cameraId: "gf-cam-5",
    events: [],
    surges: [{ zoneId: "gf-atr", from: s(-80), peakAt: s(60), peakFraction: 1.18 }],
    beats: [
      { at: 0, text: "Atrium is busy and still filling." },
      { at: s(15), text: "Atrium passes its rated capacity: the alert turns critical." },
      { at: s(60), text: "Occupancy peaks at about 210 people." },
    ],
  },
  {
    id: "camera-offline",
    label: "Offline camera",
    summary: "One Level 2 camera stopped responding four minutes ago. Its last heartbeat and telemetry are shown as last known.",
    floorId: "l2",
    cameraId: "l2-cam-3",
    events: [{ at: s(-240), kind: "camera-offline", cameraId: "l2-cam-3" }],
    surges: [],
    beats: [{ at: 0, text: "L2-FOC-01 has been offline for 4 minutes. Occupancy on the floor is unaffected: it comes from the zone sensors." }],
  },
  {
    id: "stale-telemetry",
    label: "Stale telemetry",
    summary:
      "On Level 1, the Meeting suite's occupancy sensor and one camera's health telemetry have stopped arriving, while the camera itself still answers.",
    floorId: "l1",
    cameraId: "l1-cam-5",
    events: [
      { at: s(-180), kind: "sensor-silent", zoneId: "l1-meet" },
      { at: s(-120), kind: "camera-telemetry-silent", cameraId: "l1-cam-5" },
    ],
    surges: [],
    beats: [
      { at: 0, text: "Meeting suite occupancy is 3 minutes old: excluded from the floor total, shown as last known." },
      { at: 0, text: "L1-HUB-01 is online, but its telemetry is 2 minutes old." },
    ],
  },
  {
    id: "recovery",
    label: "Recovery after link failure",
    summary: "Level 3's network link failed 40 seconds ago. It starts reconnecting at 0:20 and is back at 0:30.",
    floorId: "l3",
    cameraId: "l3-cam-1",
    events: [
      { at: s(-40), kind: "link-down", floorId: "l3" },
      { at: s(20), kind: "link-connecting", floorId: "l3" },
      { at: s(30), kind: "link-up", floorId: "l3" },
    ],
    surges: [],
    beats: [
      { at: 0, text: "Level 3 link down: every camera unreachable, floor occupancy unavailable." },
      { at: s(20), text: "Link reconnecting." },
      { at: s(30), text: "Link restored: cameras online, sensors report again, the alert resolves." },
    ],
  },
];

export const DEFAULT_SCENARIO: ScenarioId = "normal";

export const SCENARIO_IDS: readonly ScenarioId[] = SCENARIOS.map((x) => x.id);

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && (SCENARIO_IDS as readonly string[]).includes(value);
}

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((x) => x.id === id)!;
}
