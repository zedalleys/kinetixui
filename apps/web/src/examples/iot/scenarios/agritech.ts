/**
 * Reference environment 2: a farm. Farm → Field → Irrigation Zone → Device.
 *
 * Fabricated. The headline state is fixed: Greenhouse A reads 24.6 °C, 61% humidity and 34% soil
 * moisture; Irrigation Valve 02 is open; the pump station is running; Soil Sensor 04 has a low
 * battery; the second valve is flaky and fails once before it works.
 *
 * The rain forecast is **application-provided demo data**. KinetixUI fetches no weather; the weather
 * station below reports what it measures, and the forecast is a value the application would supply.
 */
import type { KinetixActivityEvent, KinetixAutomation, KinetixAutomationRule, KinetixDevice, KinetixDeviceAlert, KinetixDeviceCommand, KinetixSpaceNode } from "@kinetixui/iot/functions";
import { buildSeries, type SeriesSpec } from "@/lib/iot-sim/series";
import { APPLICATION_PROVIDED_LABEL, SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";
import type { SimScenario, SimScriptedEvent, SimSensor } from "@/lib/iot-sim/types";
import { DAY, HOUR, MINUTE, agoFrom, latency, mode, power, telemetry } from "./shared";

export const AGRITECH_START = "2026-05-09T06:40:00.000Z";
export const AGRITECH_SEED = 20260509;
const ago = agoFrom(AGRITECH_START);

export const agritechDevices: KinetixDevice[] = [
  { id: "climate-a", name: "Greenhouse A climate sensor", type: "sensor", status: "online", battery: 83, signal: 86, firmwareVersion: "2.3.0", lastSeenAt: ago(20_000), site: "Demo Farm", zone: "Greenhouse A", locationName: "Greenhouse A" },
  { id: "valve-02", name: "Irrigation Valve 02", type: "valve", status: "online", signal: 77, firmwareVersion: "1.8.4", lastSeenAt: ago(15_000), site: "Demo Farm", zone: "Zone 2", locationName: "Greenhouse A · Zone 2" },
  { id: "valve-03", name: "Irrigation Valve 03", type: "valve", status: "online", signal: 58, firmwareVersion: "1.8.4", lastSeenAt: ago(25_000), site: "Demo Farm", zone: "Zone 3", locationName: "Greenhouse A · Zone 3" },
  { id: "soil-03", name: "Soil Sensor 03", type: "soil-sensor", status: "online", battery: 67, signal: 72, firmwareVersion: "1.2.1", lastSeenAt: ago(40_000), site: "Demo Farm", zone: "Zone 2", locationName: "Greenhouse A · Zone 2" },
  // Battery 18%: below the registry's low bound, so the health verdict comes from the number, not from this comment.
  { id: "soil-04", name: "Soil Sensor 04", type: "soil-sensor", status: "online", battery: 18, signal: 61, firmwareVersion: "1.2.1", lastSeenAt: ago(30_000), site: "Demo Farm", zone: "Zone 3", locationName: "Greenhouse A · Zone 3" },
  { id: "pump-01", name: "Pump Station", type: "pump", status: "online", signal: 90, firmwareVersion: "3.0.2", lastSeenAt: ago(10_000), site: "Demo Farm", zone: "Utility yard", locationName: "Utility yard" },
  { id: "weather-01", name: "Weather Station", type: "weather-station", status: "online", battery: 92, signal: 81, firmwareVersion: "2.0.0", lastSeenAt: ago(35_000), site: "Demo Farm", zone: "Utility yard", locationName: "Utility yard" },
  // Not reporting for 3 hours: the stale-sensor demo.
  { id: "soil-05", name: "Soil Sensor 05", type: "soil-sensor", status: "stale", battery: 55, signal: 24, firmwareVersion: "1.1.9", lastSeenAt: ago(3 * HOUR), site: "Demo Farm", zone: "Orchard block", locationName: "Orchard block" },
  { id: "gateway-farm", name: "Farm gateway", type: "gateway", status: "online", signal: 94, firmwareVersion: "4.2.0", lastSeenAt: ago(8_000), site: "Demo Farm", zone: "Utility yard", locationName: "Utility yard" },
];

export const agritechSpaces: KinetixSpaceNode[] = [
  { id: "farm", name: "Demo Farm", kind: "farm" },
  { id: "field-greenhouse-a", name: "Greenhouse A", kind: "field", parentId: "farm", deviceIds: ["climate-a"] },
  { id: "zone-2", name: "Irrigation Zone 2", kind: "irrigation-zone", parentId: "field-greenhouse-a", deviceIds: ["valve-02", "soil-03"] },
  { id: "zone-3", name: "Irrigation Zone 3", kind: "irrigation-zone", parentId: "field-greenhouse-a", deviceIds: ["valve-03", "soil-04"] },
  { id: "field-orchard", name: "Orchard block", kind: "field", parentId: "farm", deviceIds: ["soil-05"] },
  { id: "field-yard", name: "Utility yard", kind: "field", parentId: "farm", deviceIds: ["pump-01", "weather-01", "gateway-farm"] },
];

const SOIL_LOW = 28;

export const agritechSensors: SimSensor[] = [
  { deviceId: "climate-a", metric: "temperature", unit: "°C", base: 24.6, amplitude: 0.3, periodMs: 240_000, noise: 0.2 },
  { deviceId: "climate-a", metric: "humidity", unit: "%", decimals: 0, base: 61, amplitude: 1.5, periodMs: 300_000, noise: 1.5 },
  // Dips through 28% between 30s and 90s, then recovers: the threshold-crossing demo.
  { deviceId: "soil-04", metric: "soil-moisture", unit: "%", decimals: 0, base: 34, amplitude: 0.4, periodMs: 300_000, noise: 0.4, thresholds: { warningLow: SOIL_LOW }, alertKind: "abnormal-reading", alertLabel: "Soil moisture", excursions: [{ fromMs: 30_000, toMs: 90_000, delta: -8 }] },
  { deviceId: "soil-03", metric: "soil-moisture", unit: "%", decimals: 0, base: 41, amplitude: 0.4, periodMs: 300_000, noise: 0.4, thresholds: { warningLow: SOIL_LOW } },
  // Running with low flow (18 L/min is under the 20 bound); it recovers between 20s and 80s, then falls back.
  { deviceId: "pump-01", metric: "flow", unit: "L/min", base: 18, amplitude: 0.6, periodMs: 120_000, noise: 0.6, thresholds: { warningLow: 20 }, alertKind: "flow-low", alertLabel: "Pump flow", excursions: [{ fromMs: 20_000, toMs: 80_000, delta: 26 }] },
  { deviceId: "pump-01", metric: "pressure", unit: "kPa", base: 312, amplitude: 4, periodMs: 150_000, noise: 3 },
  { deviceId: "weather-01", metric: "temperature", unit: "°C", base: 16.4, amplitude: 0.2, periodMs: 400_000, noise: 0.2 },
  // Not in the metric registry: a free metric key, formatted from its own unit.
  { deviceId: "weather-01", metric: "wind-speed", unit: "km/h", base: 11, amplitude: 2, periodMs: 90_000, noise: 2, min: 0 },
  { deviceId: "soil-05", metric: "soil-moisture", unit: "%", decimals: 0, base: 37, amplitude: 0.3, periodMs: 300_000, noise: 0.3, silentSinceMs: 3 * HOUR, staleAfterMs: 30 * MINUTE },
];

const seriesSpecs: SeriesSpec[] = [
  // Seven days of drying and irrigating: it falls to about 27% two days ago, an irrigation lifts it, and it dries to 34%.
  { deviceId: "soil-04", metric: "soil-moisture", unit: "%", decimals: 0, spanMs: 7 * DAY, stepMs: HOUR, base: 43, slopePerHour: -0.2, amplitude: 0.5, noise: 0.6, resets: [{ agoMs: 5 * DAY, to: 42 }, { agoMs: 46 * HOUR, to: 45, slopePerHour: -0.24 }], min: 10, max: 60 },
  { deviceId: "soil-03", metric: "soil-moisture", unit: "%", decimals: 0, spanMs: 7 * DAY, stepMs: HOUR, base: 44, slopePerHour: -0.1, amplitude: 0.5, noise: 0.6, resets: [{ agoMs: 3 * DAY, to: 46 }], min: 10, max: 60 },
  { deviceId: "climate-a", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 23.5, amplitude: 3.2, noise: 0.4 },
  { deviceId: "climate-a", metric: "humidity", unit: "%", decimals: 0, spanMs: DAY, stepMs: 15 * MINUTE, base: 62, amplitude: -6, noise: 2 },
  { deviceId: "pump-01", metric: "flow", unit: "L/min", spanMs: DAY, stepMs: 10 * MINUTE, base: 38, noise: 4, min: 0, resets: [{ agoMs: 40 * MINUTE, to: 18 }] },
  { deviceId: "pump-01", metric: "pressure", unit: "kPa", spanMs: DAY, stepMs: 10 * MINUTE, base: 310, noise: 8 },
  // The weather station skipped ninety minutes overnight.
  { deviceId: "weather-01", metric: "temperature", unit: "°C", spanMs: DAY, stepMs: 15 * MINUTE, base: 15, amplitude: 4, noise: 0.5, gaps: [{ fromAgoMs: 17 * HOUR, toAgoMs: 15.5 * HOUR }] },
  { deviceId: "soil-05", metric: "soil-moisture", unit: "%", decimals: 0, spanMs: DAY, stepMs: 30 * MINUTE, base: 38, slopePerHour: -0.05, noise: 0.4, lastReportAgoMs: 3 * HOUR },
];

export const agritechAlerts: KinetixDeviceAlert[] = [
  { id: "alert-soil-04-battery", deviceId: "soil-04", severity: "warning", kind: "low-battery", message: "Soil Sensor 04 battery is low (18%)", raisedAt: ago(9 * HOUR), source: "battery", action: { id: "schedule-visit", label: "Plan a battery change" } },
  { id: "alert-pump-flow", deviceId: "pump-01", severity: "warning", kind: "flow-low", message: "Pump flow below its limit: 18.0 L/min", raisedAt: ago(25 * MINUTE), source: "sim:threshold:flow" },
  { id: "alert-soil-05-stale", deviceId: "soil-05", severity: "warning", kind: "sensor-stale", message: "Soil Sensor 05 has not reported for 3 hours", raisedAt: ago(2 * HOUR + 30 * MINUTE), source: "sim:stale:soil-moisture" },
];

export const agritechActivity: KinetixActivityEvent[] = [
  { id: "act-1", timestamp: ago(34 * MINUTE), kind: "automation", deviceId: "pump-01", source: "Automation: Morning irrigation", status: "confirmed", message: "Pump started", detail: "Scripted demo event — KinetixUI has no automation engine, so no rule was evaluated." },
  { id: "act-2", timestamp: ago(33 * MINUTE), kind: "command", deviceId: "valve-02", source: "Automation: Morning irrigation", status: "confirmed", message: "Irrigation Valve 02: opened" },
  { id: "act-3", timestamp: ago(9 * HOUR), kind: "alert", deviceId: "soil-04", message: "Soil Sensor 04 battery is low (18%)" },
  { id: "act-4", timestamp: ago(11 * HOUR), kind: "command", deviceId: "valve-03", actor: "You (demo)", status: "failed", message: "Irrigation Valve 03: could not change to open", detail: "Valve position not reported." },
  { id: "act-5", timestamp: ago(11 * HOUR - 40_000), kind: "command", deviceId: "valve-03", actor: "You (demo)", status: "confirmed", message: "Irrigation Valve 03: confirmed open (on retry)" },
  { id: "act-6", timestamp: ago(2 * DAY - 2 * HOUR), kind: "system", deviceId: "soil-04", source: "Irrigation", status: "confirmed", message: "Soil moisture recovered after irrigation (27% → 45%)" },
];

export const agritechCommandHistory: KinetixDeviceCommand[] = [
  { id: "hist-1", deviceId: "valve-02", name: "set-position", status: "completed", createdAt: ago(33 * MINUTE), updatedAt: ago(33 * MINUTE - 1400) },
  { id: "hist-2", deviceId: "valve-03", name: "set-position", status: "failed", createdAt: ago(11 * HOUR), updatedAt: ago(11 * HOUR - 1800), errorMessage: "Valve position not reported." },
  { id: "hist-3", deviceId: "valve-03", name: "set-position", status: "completed", createdAt: ago(11 * HOUR - 40_000), updatedAt: ago(11 * HOUR - 42_000) },
];

export const agritechAutomations: KinetixAutomation[] = [
  { id: "auto-morning", name: "Morning irrigation", kind: "schedule", status: "idle", enabled: true, trigger: "Daily 06:00", actions: "Pump on, Zone 2 valve open", lastRunAt: ago(40 * MINUTE), nextRunAt: new Date(Date.parse(AGRITECH_START) + 23 * HOUR + 20 * MINUTE).toISOString() },
  { id: "auto-dry-zone-3", name: "Irrigate Zone 3 when dry", kind: "routine", status: "idle", enabled: true, trigger: "Soil moisture below 28%, no rain expected", actions: "Open Zone 3 irrigation for 12 minutes", lastRunAt: ago(2 * DAY + 4 * HOUR) },
];

/**
 * WHEN soil moisture < 28% AND rain is not expected THEN open Zone 3 irrigation FOR 12 minutes.
 * "Rain is not expected" comes from application-provided data; nothing here fetches it.
 */
export const agritechRule: KinetixAutomationRule = {
  id: "rule-dry-zone-3",
  name: "Irrigate Zone 3 when dry",
  enabled: true,
  trigger: { type: "metric", subject: "soil-moisture", operator: "lt", value: SOIL_LOW, unit: "%" },
  conditions: [{ id: "c1", subject: "rain-forecast", operator: "neq", value: "expected", join: "and" }],
  actions: [{ id: "a1", target: "zone-3", command: "open", durationMinutes: 12 }],
};

export const agritechRules: KinetixAutomationRule[] = [agritechRule];

export const agritechRainForecast = {
  expected: false,
  probabilityPct: 15,
  label: APPLICATION_PROVIDED_LABEL,
} as const;

export const agritechScriptedEvents: SimScriptedEvent[] = [
  // Soil moisture crosses 28% at about 45s (see the excursion above). This is a scripted log line, not an engine.
  { id: "script-dry", atMs: 50_000, automationId: "auto-dry-zone-3", deviceId: "valve-03", message: "Rule would fire: soil moisture below 28% and no rain expected, so open Zone 3 irrigation for 12 minutes" },
];

const valveModes = [{ id: "open", label: "Open" }, { id: "closed", label: "Closed" }] as const;

export const agritech: SimScenario = {
  id: "agritech",
  name: "Agritech",
  description: "A farm: Farm → Field → Irrigation Zone → Device. An open valve, a running pump with low flow, a low-battery soil sensor and a flaky second valve.",
  startAt: AGRITECH_START,
  seed: AGRITECH_SEED,
  devices: agritechDevices,
  spaces: agritechSpaces,
  capabilities: {
    "climate-a": [telemetry("temperature", "Temperature", "°C"), telemetry("humidity", "Humidity", "%")],
    "valve-02": [mode("position", "Valve", valveModes)],
    "valve-03": [mode("position", "Valve", valveModes)],
    "soil-03": [telemetry("soil-moisture", "Soil moisture", "%")],
    "soil-04": [telemetry("soil-moisture", "Soil moisture", "%")],
    "soil-05": [telemetry("soil-moisture", "Soil moisture", "%")],
    "pump-01": [power("Pump"), telemetry("pressure", "Pressure", "kPa"), telemetry("flow", "Flow", "L/min")],
    "weather-01": [telemetry("temperature", "Temperature", "°C"), telemetry("wind-speed", "Wind speed", "km/h")],
    "gateway-farm": [],
  },
  initialValues: {
    "valve-02": { position: "open" },
    "valve-03": { position: "closed" },
    "pump-01": { power: "on" },
  },
  latency: {
    "valve-02": latency(500, 1400),
    // The flaky valve: it acknowledges, then reports it could not move. The second attempt works.
    "valve-03": latency(600, 1800, { failFirst: 1, failReason: "Valve position not reported." }),
    "pump-01": latency(700, 2200),
  },
  defaultLatency: latency(400, 1000),
  sensors: agritechSensors,
  series: buildSeries(seriesSpecs, AGRITECH_SEED, AGRITECH_START),
  alerts: agritechAlerts,
  automations: agritechAutomations,
  rules: agritechRules,
  activity: agritechActivity,
  commandHistory: agritechCommandHistory,
  scriptedEvents: agritechScriptedEvents,
  energy: {
    unit: "kWh",
    periodLabel: "Today so far",
    devices: [
      { deviceId: "pump-01", label: "Pump Station", todayKwh: 4.6, watts: 1800 },
      { deviceId: "gateway-farm", label: "Farm gateway", todayKwh: 0.12 },
      { deviceId: "valve-02", label: "Irrigation Valve 02", todayKwh: 0.03 },
    ],
    week: [22.4, 24.1, 23.8, 25.2, 21.9, 24.6, 26.0],
    baseline: 4.0,
  },
  labels: {
    "soil-moisture": "soil moisture",
    "rain-forecast": "rain",
    "zone-3": "Zone 3 irrigation",
  },
  disclosure: `${SIMULATION_DISCLOSURE} The rain forecast is ${APPLICATION_PROVIDED_LABEL.toLowerCase()}.`,
  applicationProvided: { rainForecast: agritechRainForecast },
};

export default agritech;
