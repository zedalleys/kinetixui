/**
 * Reference environment 1: a home. Home → Floor → Room → Device.
 *
 * Fabricated. Nothing here was measured and no device exists. Not everything is healthy on purpose: a
 * bedroom lamp is offline, the door lock's battery is low, a bedroom sensor has gone quiet and a space
 * heater is using more than its share.
 */
import type { KinetixActivityEvent, KinetixAutomation, KinetixAutomationRule, KinetixDevice, KinetixDeviceAlert, KinetixDeviceCommand, KinetixSpaceNode } from "@kinetixui/iot/functions";
import { buildSeries, type SeriesSpec } from "@/lib/iot-sim/series";
import { SAMPLE_IMAGE_LABEL, SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";
import type { SimScenario, SimScriptedEvent, SimSensor } from "@/lib/iot-sim/types";
import { DAY, HOUR, MINUTE, agoFrom, latency, level, mode, power, setpoint, telemetry } from "./shared";

export const SMART_SPACE_START = "2026-03-14T18:30:00.000Z";
export const SMART_SPACE_SEED = 20260314;
const ago = agoFrom(SMART_SPACE_START);

export const smartSpaceDevices: KinetixDevice[] = [
  { id: "lamp-living", name: "Living room lamp", type: "light", status: "online", signal: 88, firmwareVersion: "1.4.2", lastSeenAt: ago(20_000), room: "Living room", locationName: "Living room" },
  { id: "lamp-bedroom", name: "Bedroom lamp", type: "light", status: "offline", signal: 0, firmwareVersion: "1.4.0", lastSeenAt: ago(2 * DAY + 3 * HOUR), room: "Bedroom", locationName: "Bedroom" },
  { id: "thermostat-hall", name: "Hallway thermostat", type: "thermostat", status: "online", battery: 71, signal: 79, firmwareVersion: "3.2.1", lastSeenAt: ago(15_000), room: "Hallway", locationName: "Hallway" },
  { id: "plug-heater", name: "Space heater plug", type: "plug", status: "online", signal: 64, firmwareVersion: "2.0.3", lastSeenAt: ago(30_000), room: "Office", locationName: "Office" },
  { id: "plug-kettle", name: "Kitchen appliance plug", type: "plug", status: "online", signal: 82, firmwareVersion: "2.0.3", lastSeenAt: ago(25_000), room: "Kitchen", locationName: "Kitchen" },
  { id: "lock-front", name: "Front door lock", type: "lock", status: "online", battery: 24, signal: 71, firmwareVersion: "5.1.0", lastSeenAt: ago(45_000), room: "Hallway", locationName: "Hallway" },
  { id: "air-living", name: "Air quality sensor", type: "air-quality", status: "online", battery: 88, signal: 74, firmwareVersion: "0.9.8", lastSeenAt: ago(10_000), room: "Living room", locationName: "Living room" },
  {
    id: "camera-hall",
    name: "Hallway camera",
    type: "camera",
    status: "online",
    signal: 68,
    firmwareVersion: "6.0.1",
    lastSeenAt: ago(12_000),
    room: "Hallway",
    locationName: "Hallway",
    // Poster only. There is no stream, image request or recording behind this card.
    metadata: { posterSrc: null, posterLabel: SAMPLE_IMAGE_LABEL },
  },
  { id: "sensor-bedroom", name: "Bedroom sensor", type: "sensor", status: "stale", battery: 41, signal: 33, firmwareVersion: "1.1.0", lastSeenAt: ago(5 * HOUR), room: "Bedroom", locationName: "Bedroom" },
];

export const smartSpaceSpaces: KinetixSpaceNode[] = [
  { id: "home", name: "Demo home", kind: "home" },
  { id: "floor-ground", name: "Ground floor", kind: "floor", parentId: "home" },
  { id: "floor-upper", name: "Upper floor", kind: "floor", parentId: "home" },
  { id: "room-living", name: "Living room", kind: "room", parentId: "floor-ground", deviceIds: ["lamp-living", "air-living"] },
  { id: "room-kitchen", name: "Kitchen", kind: "room", parentId: "floor-ground", deviceIds: ["plug-kettle"] },
  { id: "room-hall", name: "Hallway", kind: "room", parentId: "floor-ground", deviceIds: ["thermostat-hall", "lock-front", "camera-hall"] },
  { id: "room-bedroom", name: "Bedroom", kind: "room", parentId: "floor-upper", deviceIds: ["lamp-bedroom", "sensor-bedroom"] },
  { id: "room-office", name: "Office", kind: "room", parentId: "floor-upper", deviceIds: ["plug-heater"] },
];

export const smartSpaceSensors: SimSensor[] = [
  // Crosses the registry's AQI warning bound (100) between 25s and 75s, then clears: the alert demo.
  { deviceId: "air-living", metric: "air-quality", unit: "AQI", decimals: 0, base: 62, amplitude: 6, periodMs: 90_000, noise: 5, alertKind: "abnormal-reading", alertLabel: "Air quality", excursions: [{ fromMs: 25_000, toMs: 75_000, delta: 55 }] },
  { deviceId: "air-living", metric: "temperature", unit: "°C", base: 21.4, amplitude: 0.3, periodMs: 240_000, noise: 0.2 },
  { deviceId: "air-living", metric: "humidity", unit: "%", decimals: 0, base: 48, amplitude: 2, periodMs: 300_000, noise: 2 },
  { deviceId: "thermostat-hall", metric: "temperature", unit: "°C", base: 19.6, amplitude: 0.2, periodMs: 300_000, noise: 0.1 },
  // Went quiet five hours before startAt and does not come back: the stale-sensor demo.
  { deviceId: "sensor-bedroom", metric: "temperature", unit: "°C", base: 18.9, amplitude: 0.2, periodMs: 300_000, noise: 0.1, silentSinceMs: 5 * HOUR, staleAfterMs: 15 * MINUTE },
];

const seriesSpecs: SeriesSpec[] = [
  { deviceId: "air-living", metric: "air-quality", unit: "AQI", decimals: 0, spanMs: DAY, stepMs: 15 * MINUTE, base: 58, amplitude: 10, noise: 8, min: 20 },
  { deviceId: "air-living", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 21.2, amplitude: 0.8, noise: 0.3 },
  // A two-hour outage in the middle of yesterday evening: due, and did not arrive.
  { deviceId: "air-living", metric: "humidity", unit: "%", decimals: 0, spanMs: DAY, stepMs: 15 * MINUTE, base: 48, amplitude: 4, noise: 3, gaps: [{ fromAgoMs: 9 * HOUR, toAgoMs: 7 * HOUR }] },
  { deviceId: "thermostat-hall", metric: "temperature", unit: "°C", spanMs: 7 * DAY, stepMs: HOUR, base: 19.5, amplitude: 1.1, noise: 0.4 },
  { deviceId: "plug-heater", metric: "power", unit: "W", decimals: 0, spanMs: DAY, stepMs: 10 * MINUTE, base: 900, amplitude: 600, noise: 120, min: 0 },
  { deviceId: "sensor-bedroom", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 19, amplitude: 0.6, noise: 0.2, lastReportAgoMs: 5 * HOUR },
];

export const smartSpaceAlerts: KinetixDeviceAlert[] = [
  { id: "alert-lamp-offline", deviceId: "lamp-bedroom", severity: "warning", kind: "device-offline", message: "Bedroom lamp has not been seen for over two days", raisedAt: ago(2 * DAY), source: "connectivity" },
  { id: "alert-lock-battery", deviceId: "lock-front", severity: "warning", kind: "low-battery", message: "Front door lock battery is low (24%)", raisedAt: ago(6 * HOUR), source: "battery", action: { id: "replace-battery", label: "Replace battery soon" } },
  { id: "alert-bedroom-stale", deviceId: "sensor-bedroom", severity: "warning", kind: "sensor-stale", message: "Bedroom sensor has not reported for 5 hours", raisedAt: ago(4 * HOUR), source: "sim:stale:temperature" },
  { id: "alert-heater-energy", deviceId: "plug-heater", severity: "info", kind: "abnormal-reading", message: "Space heater plug is using about half of today's energy", raisedAt: ago(3 * HOUR), acknowledgedAt: ago(2 * HOUR), source: "energy" },
];

export const smartSpaceActivity: KinetixActivityEvent[] = [
  { id: "act-1", timestamp: ago(12 * MINUTE), kind: "command", deviceId: "lamp-living", actor: "You (demo)", status: "confirmed", message: "Living room lamp: set brightness to 60%" },
  { id: "act-2", timestamp: ago(48 * MINUTE), kind: "automation", deviceId: "thermostat-hall", source: "Automation: Heating morning boost", status: "confirmed", message: "Hallway thermostat: target set to 20.5 °C", detail: "Scripted demo event — KinetixUI has no automation engine, so no rule was evaluated." },
  { id: "act-3", timestamp: ago(2 * HOUR), kind: "command", deviceId: "lock-front", actor: "You (demo)", status: "confirmed", message: "Front door lock: locked" },
  { id: "act-4", timestamp: ago(4 * HOUR), kind: "alert", deviceId: "sensor-bedroom", message: "Bedroom sensor stopped reporting" },
  { id: "act-5", timestamp: ago(6 * HOUR), kind: "command", deviceId: "lamp-bedroom", actor: "You (demo)", status: "timed-out", message: "Bedroom lamp: no confirmation for on", detail: "No reply from the device before the deadline." },
  { id: "act-6", timestamp: ago(1 * DAY + 2 * HOUR), kind: "firmware", deviceId: "camera-hall", source: "system", status: "confirmed", message: "Hallway camera: firmware 6.0.1 installed" },
];

export const smartSpaceCommandHistory: KinetixDeviceCommand[] = [
  { id: "hist-1", deviceId: "lamp-living", name: "set-level", status: "completed", createdAt: ago(12 * MINUTE), updatedAt: ago(12 * MINUTE - 1200) },
  { id: "hist-2", deviceId: "lock-front", name: "set-lock", status: "completed", createdAt: ago(2 * HOUR), updatedAt: ago(2 * HOUR - 2600) },
  { id: "hist-3", deviceId: "lamp-bedroom", name: "set-power", status: "expired", createdAt: ago(6 * HOUR), updatedAt: ago(6 * HOUR - 8000), errorMessage: "No reply from the device before the deadline." },
];

export const smartSpaceAutomations: KinetixAutomation[] = [
  { id: "scene-good-night", name: "Good night", kind: "scene", status: "idle", enabled: true, trigger: "Manual", actions: "Lock the front door, lights off", lastRunAt: ago(20 * HOUR) },
  { id: "scene-movie", name: "Movie time", kind: "scene", status: "idle", enabled: true, trigger: "Manual", actions: "Living room lamp to 15%", lastRunAt: ago(3 * DAY) },
  { id: "routine-evening", name: "Evening lights", kind: "routine", status: "idle", enabled: true, trigger: "After 18:30", actions: "Living room lamp on", lastRunAt: ago(24 * HOUR), nextRunAt: new Date(Date.parse(SMART_SPACE_START) + 24 * HOUR).toISOString() },
  { id: "schedule-heating", name: "Heating morning boost", kind: "schedule", status: "idle", enabled: true, trigger: "Weekdays 06:30", actions: "Hallway thermostat to 20.5 °C", lastRunAt: ago(11 * HOUR + 30 * MINUTE) },
  { id: "routine-away", name: "Away mode", kind: "routine", status: "disabled", enabled: false, trigger: "Everyone leaves", actions: "Heater plug off, lock front door" },
];

export const smartSpaceRules: KinetixAutomationRule[] = [
  {
    id: "rule-evening-lights",
    name: "Evening lights",
    enabled: true,
    trigger: { type: "schedule", subject: "time", operator: "after-time", value: "18:30" },
    conditions: [],
    actions: [{ id: "a1", target: "lamp-living", command: "turn-on" }],
  },
  {
    id: "rule-heater-off",
    name: "Heater off when the room is warm",
    enabled: true,
    trigger: { type: "metric", subject: "temperature", scope: "room-office", operator: "gt", value: 23, unit: "°C" },
    conditions: [],
    actions: [{ id: "a1", target: "plug-heater", command: "turn-off" }],
  },
];

export const smartSpaceScriptedEvents: SimScriptedEvent[] = [
  { id: "script-evening", atMs: 40_000, automationId: "routine-evening", deviceId: "lamp-living", message: "Living room lamp: Evening lights would run now" },
];

const smartSpaceSeries = buildSeries(seriesSpecs, SMART_SPACE_SEED, SMART_SPACE_START);

const lockModes = [{ id: "locked", label: "Locked" }, { id: "unlocked", label: "Unlocked" }] as const;
const climateModes = [
  { id: "heat", label: "Heat" },
  { id: "eco", label: "Eco" },
  { id: "off", label: "Off" },
] as const;

export const smartSpace: SimScenario = {
  id: "smart-space",
  name: "Smart space",
  description: "A home: Home → Floor → Room → Device. One lamp offline, one lock with a low battery, one sensor gone quiet.",
  startAt: SMART_SPACE_START,
  seed: SMART_SPACE_SEED,
  devices: smartSpaceDevices,
  spaces: smartSpaceSpaces,
  capabilities: {
    "lamp-living": [power("Lamp"), level("Brightness")],
    "lamp-bedroom": [power("Lamp"), level("Brightness")],
    "thermostat-hall": [setpoint("Target temperature", 16, 26, 0.5), mode("mode", "Mode", climateModes), telemetry("temperature", "Temperature", "°C")],
    "plug-heater": [power("Heater")],
    "plug-kettle": [power("Appliance")],
    "lock-front": [mode("lock", "Door", lockModes)],
    "air-living": [telemetry("air-quality", "Air quality", "AQI"), telemetry("temperature", "Temperature", "°C"), telemetry("humidity", "Humidity", "%")],
    "camera-hall": [],
    "sensor-bedroom": [telemetry("temperature", "Temperature", "°C")],
  },
  initialValues: {
    "lamp-living": { power: "on", level: 60 },
    "lamp-bedroom": { power: "off", level: 40 },
    "thermostat-hall": { setpoint: 20.5, mode: "heat" },
    "plug-heater": { power: "on" },
    "plug-kettle": { power: "off" },
    "lock-front": { lock: "locked" },
  },
  latency: {
    "lamp-living": latency(250, 700),
    "thermostat-hall": latency(600, 1800),
    "plug-heater": latency(400, 900),
    "plug-kettle": latency(400, 900),
    // A lock is slow on purpose: the gap between "requested" and "locked" is the demo.
    "lock-front": latency(900, 2600),
  },
  defaultLatency: latency(400, 1000),
  sensors: smartSpaceSensors,
  series: smartSpaceSeries,
  alerts: smartSpaceAlerts,
  automations: smartSpaceAutomations,
  rules: smartSpaceRules,
  activity: smartSpaceActivity,
  commandHistory: smartSpaceCommandHistory,
  scriptedEvents: smartSpaceScriptedEvents,
  energy: {
    unit: "kWh",
    periodLabel: "Today so far",
    devices: [
      { deviceId: "plug-heater", label: "Space heater plug", todayKwh: 3.9, watts: 1500 },
      { deviceId: "thermostat-hall", label: "Heating (thermostat)", todayKwh: 2.2 },
      { deviceId: "plug-kettle", label: "Kitchen appliance plug", todayKwh: 0.6, watts: 2000 },
      { deviceId: "lamp-living", label: "Living room lamp", todayKwh: 0.4, watts: 9 },
      { deviceId: "camera-hall", label: "Hallway camera", todayKwh: 0.3 },
      { deviceId: "air-living", label: "Air quality sensor", todayKwh: 0.05 },
    ],
    // Seven days ending yesterday, oldest first.
    week: [6.1, 5.8, 6.4, 6.0, 6.6, 7.2, 6.9],
    baseline: 6.2,
  },
  labels: { "lamp-living": "Living room lamp", "plug-heater": "Space heater plug", temperature: "temperature", "room-office": "Office", time: "the time" },
  disclosure: SIMULATION_DISCLOSURE,
  applicationProvided: { camera: { deviceId: "camera-hall", posterSrc: null, posterLabel: SAMPLE_IMAGE_LABEL } },
};

export default smartSpace;
