/**
 * Reference environment 3: a plant. Organization → Site → Line → Machine.
 *
 * Fabricated. Site 04 has 24 devices. At the start instant 22 are healthy, one pump is in warning
 * with a high-pressure alert, and one meter is offline — the split is derived by the tests from
 * `summarizeFleetHealth`, not asserted from hand-typed counts. Vibration and temperature are free
 * metric keys or registry keys with product thresholds; the library has no vocabulary for them.
 */
import type {
  KinetixActivityEvent,
  KinetixAutomation,
  KinetixAutomationRule,
  KinetixDevice,
  KinetixDeviceAlert,
  KinetixDeviceCapability,
  KinetixDeviceCommand,
  KinetixDeviceFault,
  KinetixSpaceNode,
} from "@kinetixui/iot/functions";
import { buildSeries, type SeriesSpec } from "@/lib/iot-sim/series";
import { SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";
import type { SimEnergyDevice, SimLatency, SimScenario, SimScriptedEvent, SimSensor } from "@/lib/iot-sim/types";
import { DAY, HOUR, MINUTE, agoFrom, latency, level, power, telemetry } from "./shared";

export const OPERATIONS_START = "2026-02-10T09:00:00.000Z";
export const OPERATIONS_SEED = 20260210;
const ago = agoFrom(OPERATIONS_START);

type MachineRow = {
  id: string;
  name: string;
  type: string;
  line: "line-1" | "line-2" | "line-3";
  status?: KinetixDevice["status"];
  battery?: number;
  firmware?: string;
  seenAgoMs?: number;
};

const rows: MachineRow[] = [
  // Line 1 — Mixing
  { id: "m-101", name: "Mixer motor M-101", type: "motor", line: "line-1" },
  { id: "m-102", name: "Mixer motor M-102", type: "motor", line: "line-1" },
  { id: "m-103", name: "Feed motor M-103", type: "motor", line: "line-1" },
  { id: "p-101", name: "Feed pump P-101", type: "pump", line: "line-1" },
  { id: "p-102", name: "Recirculation pump P-102", type: "pump", line: "line-1" },
  { id: "e-101", name: "Line 1 meter E-101", type: "energy-meter", line: "line-1" },
  { id: "s-101", name: "Vessel sensor S-101", type: "sensor", line: "line-1", battery: 82 },
  { id: "s-102", name: "Vessel sensor S-102", type: "sensor", line: "line-1", battery: 74 },
  // Line 2 — Packing
  { id: "m-201", name: "Conveyor motor M-201", type: "motor", line: "line-2" },
  { id: "m-202", name: "Conveyor motor M-202", type: "motor", line: "line-2" },
  { id: "m-203", name: "Packer motor M-203", type: "motor", line: "line-2" },
  { id: "p-201", name: "Transfer pump P-201", type: "pump", line: "line-2", status: "warning" },
  { id: "e-201", name: "Line 2 meter E-201", type: "energy-meter", line: "line-2", status: "offline", seenAgoMs: 3 * HOUR },
  { id: "e-202", name: "Packing meter E-202", type: "energy-meter", line: "line-2" },
  { id: "s-201", name: "Line sensor S-201", type: "sensor", line: "line-2", battery: 66 },
  { id: "s-202", name: "Line sensor S-202", type: "sensor", line: "line-2", battery: 58 },
  // Line 3 — Utilities
  { id: "g-01", name: "Site gateway G-01", type: "gateway", line: "line-3", firmware: "4.1.2" },
  { id: "m-301", name: "Compressor motor M-301", type: "motor", line: "line-3" },
  { id: "p-301", name: "Chiller pump P-301", type: "pump", line: "line-3" },
  { id: "p-302", name: "Boiler feed pump P-302", type: "pump", line: "line-3" },
  { id: "e-301", name: "Main meter E-301", type: "energy-meter", line: "line-3" },
  { id: "e-302", name: "Sub-meter E-302", type: "energy-meter", line: "line-3" },
  { id: "s-301", name: "Header pressure sensor S-301", type: "sensor", line: "line-3", battery: 91 },
  { id: "s-302", name: "Ambient sensor S-302", type: "sensor", line: "line-3", battery: 77 },
];

const LINE_NAMES = { "line-1": "Line 1 · Mixing", "line-2": "Line 2 · Packing", "line-3": "Line 3 · Utilities" } as const;

export const operationsDevices: KinetixDevice[] = rows.map((row, i) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  status: row.status ?? "online",
  ...(row.battery !== undefined ? { battery: row.battery } : {}),
  signal: 70 + ((i * 7) % 25),
  firmwareVersion: row.firmware ?? "2.1.0",
  lastSeenAt: ago(row.seenAgoMs ?? 5_000 + i * 1_500),
  site: "Site 04",
  zone: LINE_NAMES[row.line],
  locationName: `Site 04 · ${LINE_NAMES[row.line]}`,
}));

export const operationsSpaces: KinetixSpaceNode[] = [
  { id: "org", name: "Demo Manufacturing Co", kind: "organization" },
  { id: "site-04", name: "Site 04", kind: "site", parentId: "org" },
  { id: "line-1", name: LINE_NAMES["line-1"], kind: "line", parentId: "site-04" },
  { id: "line-2", name: LINE_NAMES["line-2"], kind: "line", parentId: "site-04" },
  { id: "line-3", name: LINE_NAMES["line-3"], kind: "line", parentId: "site-04" },
  // Each machine is a space holding its own device, so a rollup can be read at any of the four levels.
  ...rows.map((row) => ({ id: `machine-${row.id}`, name: row.name, kind: "machine", parentId: row.line, deviceIds: [row.id] })),
];

const motorCaps = (): KinetixDeviceCapability[] => [power("Run"), level("Speed", "%", "speed")];
const pumpCaps = (): KinetixDeviceCapability[] => [power("Run"), level("Duty", "%", "duty")];

const capabilities: Record<string, KinetixDeviceCapability[]> = {};
const initialValues: Record<string, Record<string, unknown>> = {};
const latencyScript: Record<string, SimLatency> = {};
for (const row of rows) {
  if (row.type === "motor") {
    capabilities[row.id] = motorCaps();
    initialValues[row.id] = { power: "on", speed: 60 };
    latencyScript[row.id] = latency(800, 2000);
  } else if (row.type === "pump") {
    capabilities[row.id] = pumpCaps();
    initialValues[row.id] = { power: "on", duty: 55 };
    latencyScript[row.id] = latency(900, 2400);
  } else if (row.type === "energy-meter") {
    capabilities[row.id] = [telemetry("power", "Load", "kW")];
  } else if (row.type === "gateway") {
    capabilities[row.id] = [{ id: "restart", kind: "action", label: "Restart gateway" }];
    latencyScript[row.id] = latency(1200, 4500);
  } else {
    capabilities[row.id] = [];
  }
}
initialValues["p-102"] = { power: "off", duty: 0 };

export const operationsSensors: SimSensor[] = [
  // The warning pump: pressure starts above its bound and eases below it for a while (the alert clears), then returns.
  { deviceId: "p-201", metric: "pressure", unit: "kPa", decimals: 0, base: 712, amplitude: 5, periodMs: 120_000, noise: 4, thresholds: { warningHigh: 700, criticalHigh: 800 }, alertKind: "pressure-high", alertLabel: "Discharge pressure", excursions: [{ fromMs: 30_000, toMs: 90_000, delta: -40 }] },
  // Free metric keys. Vibration crosses its product-set bound once, then settles.
  { deviceId: "p-201", metric: "vibration", unit: "mm/s", base: 3.9, amplitude: 0.2, periodMs: 90_000, noise: 0.2, thresholds: { warningHigh: 4.5, criticalHigh: 7.1 }, alertKind: "abnormal-reading", alertLabel: "Vibration", excursions: [{ fromMs: 25_000, toMs: 85_000, delta: 1.6 }] },
  { deviceId: "p-201", metric: "temperature", unit: "°C", base: 68, amplitude: 0.8, periodMs: 240_000, noise: 0.6 },
  { deviceId: "m-101", metric: "vibration", unit: "mm/s", base: 1.8, amplitude: 0.15, periodMs: 90_000, noise: 0.15, thresholds: { warningHigh: 4.5, criticalHigh: 7.1 } },
  { deviceId: "m-101", metric: "temperature", unit: "°C", base: 54, amplitude: 0.6, periodMs: 240_000, noise: 0.4 },
  { deviceId: "m-203", metric: "vibration", unit: "mm/s", base: 2.1, amplitude: 0.2, periodMs: 80_000, noise: 0.2, thresholds: { warningHigh: 4.5, criticalHigh: 7.1 } },
  { deviceId: "m-301", metric: "temperature", unit: "°C", base: 71, amplitude: 1, periodMs: 240_000, noise: 0.6, thresholds: { warningHigh: 85, criticalHigh: 95 } },
  { deviceId: "s-301", metric: "pressure", unit: "kPa", decimals: 0, base: 742, amplitude: 4, periodMs: 150_000, noise: 3, thresholds: { warningHigh: 800 } },
  { deviceId: "e-301", metric: "power", unit: "kW", base: 41.2, amplitude: 1.5, periodMs: 120_000, noise: 1, min: 0 },
  { deviceId: "e-101", metric: "power", unit: "kW", base: 12.4, amplitude: 0.8, periodMs: 120_000, noise: 0.5, min: 0 },
];

const seriesSpecs: SeriesSpec[] = [
  // Vibration on the warning pump climbs over the week: the equipment-health story.
  { deviceId: "p-201", metric: "vibration", unit: "mm/s", spanMs: 7 * DAY, stepMs: HOUR, base: 2.6, slopePerHour: 0.0078, amplitude: 0.15, noise: 0.25, min: 0 },
  { deviceId: "p-201", metric: "pressure", unit: "kPa", decimals: 0, spanMs: DAY, stepMs: 10 * MINUTE, base: 660, slopePerHour: 2.2, noise: 10 },
  { deviceId: "p-201", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 64, amplitude: 1.6, noise: 0.6 },
  { deviceId: "m-101", metric: "vibration", unit: "mm/s", spanMs: 7 * DAY, stepMs: HOUR, base: 1.8, amplitude: 0.1, noise: 0.2, min: 0 },
  { deviceId: "m-301", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 70, amplitude: 2, noise: 0.8, gaps: [{ fromAgoMs: 14 * HOUR, toAgoMs: 13 * HOUR }] },
  { deviceId: "e-301", metric: "power", unit: "kW", spanMs: DAY, stepMs: 15 * MINUTE, base: 38, amplitude: 9, noise: 3, min: 0 },
  // The offline meter's history stops three hours ago: a stale series.
  { deviceId: "e-201", metric: "power", unit: "kW", spanMs: DAY, stepMs: 15 * MINUTE, base: 14, amplitude: 4, noise: 1.5, min: 0, lastReportAgoMs: 3 * HOUR },
];

export const operationsAlerts: KinetixDeviceAlert[] = [
  { id: "alert-p201-pressure", deviceId: "p-201", severity: "warning", kind: "pressure-high", message: "Discharge pressure above its limit: 712 kPa", raisedAt: ago(52 * MINUTE), source: "sim:threshold:pressure", action: { id: "inspect", label: "Raise maintenance ticket" } },
  { id: "alert-e201-offline", deviceId: "e-201", severity: "warning", kind: "device-offline", message: "Line 2 meter E-201 stopped reporting", raisedAt: ago(3 * HOUR), source: "connectivity" },
  { id: "alert-g01-firmware", deviceId: "g-01", severity: "info", kind: "firmware-update-required", message: "Gateway firmware 4.2.0 is available; 4.1.2 is installed", raisedAt: ago(1 * DAY + 4 * HOUR), source: "firmware" },
];

export const operationsFaults: Record<string, KinetixDeviceFault[]> = {
  "p-201": [{ id: "fault-p201-1", code: "P-214", message: "Discharge pressure above limit", severity: "warning", raisedAt: ago(52 * MINUTE) }],
};

export const operationsActivity: KinetixActivityEvent[] = [
  { id: "act-1", timestamp: ago(52 * MINUTE), kind: "alert", deviceId: "p-201", message: "Transfer pump P-201: discharge pressure above its limit" },
  { id: "act-2", timestamp: ago(1 * HOUR + 10 * MINUTE), kind: "command", deviceId: "p-201", actor: "Shift lead (demo)", status: "confirmed", message: "Transfer pump P-201: duty set to 55%" },
  { id: "act-3", timestamp: ago(3 * HOUR), kind: "alert", deviceId: "e-201", message: "Line 2 meter E-201 stopped reporting" },
  { id: "act-4", timestamp: ago(3 * HOUR + 2 * MINUTE), kind: "command", deviceId: "e-201", actor: "Shift lead (demo)", status: "unreachable", message: "Line 2 meter E-201: unreachable, restart not confirmed" },
  { id: "act-5", timestamp: ago(5 * HOUR), kind: "automation", deviceId: "m-301", source: "Automation: Shift start sequence", status: "confirmed", message: "Compressor motor M-301: started", detail: "Scripted demo event — KinetixUI has no automation engine, so no rule was evaluated." },
  { id: "act-6", timestamp: ago(1 * DAY + 4 * HOUR), kind: "firmware", deviceId: "g-01", source: "system", status: "confirmed", message: "Site gateway G-01: firmware 4.1.2 installed" },
];

export const operationsCommandHistory: KinetixDeviceCommand[] = [
  { id: "hist-1", deviceId: "p-201", name: "set-duty", status: "completed", createdAt: ago(1 * HOUR + 10 * MINUTE), updatedAt: ago(1 * HOUR + 10 * MINUTE - 2400) },
  { id: "hist-2", deviceId: "e-201", name: "restart", status: "failed", createdAt: ago(3 * HOUR + 2 * MINUTE), updatedAt: ago(3 * HOUR), errorMessage: "The device could not be reached." },
  { id: "hist-3", deviceId: "m-301", name: "set-power", status: "completed", createdAt: ago(5 * HOUR), updatedAt: ago(5 * HOUR - 2000) },
  { id: "hist-4", deviceId: "p-102", name: "set-power", status: "completed", createdAt: ago(9 * HOUR), updatedAt: ago(9 * HOUR - 2400) },
];

export const operationsAutomations: KinetixAutomation[] = [
  { id: "auto-shift-start", name: "Shift start sequence", kind: "schedule", status: "idle", enabled: true, trigger: "Weekdays 04:00", actions: "Compressor on, then feed pumps", lastRunAt: ago(5 * HOUR), nextRunAt: new Date(Date.parse(OPERATIONS_START) + 19 * HOUR).toISOString() },
  { id: "auto-pressure", name: "Trip pump on critical pressure", kind: "routine", status: "idle", enabled: true, trigger: "Discharge pressure above 800 kPa", actions: "Transfer pump off, notify shift lead" },
  { id: "auto-vibration", name: "Vibration watch", kind: "routine", status: "disabled", enabled: false, trigger: "Vibration above 7.1 mm/s", actions: "Notify maintenance" },
];

export const operationsRules: KinetixAutomationRule[] = [
  {
    id: "rule-pressure-trip",
    name: "Trip pump on critical pressure",
    enabled: true,
    trigger: { type: "metric", subject: "pressure", scope: "line-2", operator: "gt", value: 800, unit: "kPa" },
    conditions: [],
    actions: [{ id: "a1", target: "p-201", command: "turn-off" }],
  },
];

export const operationsScriptedEvents: SimScriptedEvent[] = [
  { id: "script-pressure", atMs: 45_000, automationId: "auto-pressure", deviceId: "p-201", message: "Transfer pump P-201: pressure trip would evaluate now (scripted; no rule engine runs)" },
];

const energyDevices: SimEnergyDevice[] = [
  { deviceId: "m-301", label: "Compressor motor M-301", todayKwh: 186, watts: 22000 },
  { deviceId: "p-301", label: "Chiller pump P-301", todayKwh: 64, watts: 7500 },
  { deviceId: "p-302", label: "Boiler feed pump P-302", todayKwh: 41, watts: 5500 },
  { deviceId: "m-101", label: "Mixer motor M-101", todayKwh: 38, watts: 4500 },
  { deviceId: "m-102", label: "Mixer motor M-102", todayKwh: 36, watts: 4500 },
  { deviceId: "m-203", label: "Packer motor M-203", todayKwh: 31, watts: 3800 },
  { deviceId: "m-201", label: "Conveyor motor M-201", todayKwh: 29, watts: 3000 },
  { deviceId: "m-202", label: "Conveyor motor M-202", todayKwh: 27, watts: 3000 },
  { deviceId: "p-201", label: "Transfer pump P-201", todayKwh: 33, watts: 4000 },
  { deviceId: "m-103", label: "Feed motor M-103", todayKwh: 22, watts: 2800 },
  { deviceId: "p-101", label: "Feed pump P-101", todayKwh: 18, watts: 2200 },
];

export const operations: SimScenario = {
  id: "operations",
  name: "Operations",
  description: "A plant: Organization → Site → Line → Machine. Site 04 has 24 devices — a pump in warning and a meter offline.",
  startAt: OPERATIONS_START,
  seed: OPERATIONS_SEED,
  devices: operationsDevices,
  spaces: operationsSpaces,
  capabilities,
  initialValues,
  latency: latencyScript,
  defaultLatency: latency(500, 1200),
  sensors: operationsSensors,
  series: buildSeries(seriesSpecs, OPERATIONS_SEED, OPERATIONS_START),
  alerts: operationsAlerts,
  faults: operationsFaults,
  automations: operationsAutomations,
  rules: operationsRules,
  activity: operationsActivity,
  commandHistory: operationsCommandHistory,
  scriptedEvents: operationsScriptedEvents,
  energy: { unit: "kWh", periodLabel: "Today so far", devices: energyDevices, week: [478, 501, 455, 490, 512, 520, 536], baseline: 470 },
  labels: { pressure: "discharge pressure", "line-2": "Line 2", "p-201": "Transfer pump P-201" },
  disclosure: SIMULATION_DISCLOSURE,
};

export default operations;
