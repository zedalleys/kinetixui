/**
 * The demo fleet every IoT example on this site renders.
 *
 * **This is fabricated data.** No device is being contacted, no reading was measured, and nothing
 * here travels over a network. `@kinetixui/iot` has no transport — see `/docs/iot` — so a showcase
 * that implied otherwise would be demonstrating a capability the package does not have.
 *
 * Two deliberate choices about what the fleet contains:
 *
 * **It is not all healthy.** Every dashboard reference worth studying shows a confident number in
 * every tile, because a concept mockup has no dropouts. A real fleet does, and the states this module
 * exists to render — stale, unknown, errored, mid-update — only appear if something is in them.
 *
 * **The devices are generic.** A soil probe, a gateway, an energy meter and an air-quality sensor,
 * not lights and thermostats. The smart-home vocabulary is one domain this module serves, and naming
 * the examples after it would quietly turn a connected-device library into a smart-home library.
 *
 * Timestamps are derived from one fixed instant rather than `Date.now()`, so the server render and
 * the client hydration agree and the page does not shift under the reader.
 */
import type { KinetixDevice, KinetixDeviceAlert, KinetixDeviceCommand, KinetixTelemetrySeries } from "@kinetixui/iot/functions";

/** The instant every relative time on these pages is measured from. */
export const DEMO_NOW = "2026-01-01T12:00:00.000Z";

const ago = (ms: number) => new Date(Date.parse(DEMO_NOW) - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEMO_DEVICES: KinetixDevice[] = [
  {
    id: "probe-a",
    name: "Cold store probe",
    type: "temperature-sensor",
    status: "online",
    battery: 78,
    signal: 84,
    firmwareVersion: "2.6.0",
    lastSeenAt: ago(40_000),
    locationName: "Cold store A",
  },
  {
    id: "gateway-1",
    name: "Site gateway",
    type: "gateway",
    status: "online",
    signal: 92,
    firmwareVersion: "4.1.2",
    lastSeenAt: ago(15_000),
    locationName: "Plant room",
  },
  {
    id: "probe-b",
    name: "Loading bay probe",
    type: "temperature-sensor",
    status: "stale",
    battery: 34,
    signal: 21,
    firmwareVersion: "2.4.1",
    lastSeenAt: ago(5 * HOUR),
    locationName: "Bay 2",
  },
  {
    id: "meter-1",
    name: "Energy meter",
    type: "energy-meter",
    status: "updating",
    signal: 67,
    firmwareVersion: "1.9.0",
    lastSeenAt: ago(90_000),
    locationName: "Plant room",
  },
  {
    id: "air-1",
    name: "Air quality sensor",
    type: "air-quality-sensor",
    status: "error",
    battery: 12,
    signal: 8,
    firmwareVersion: "0.9.4",
    lastSeenAt: ago(22 * MINUTE),
    locationName: "Packing hall",
  },
  {
    id: "probe-c",
    name: "Yard probe",
    type: "temperature-sensor",
    status: "offline",
    battery: 2,
    signal: 0,
    lastSeenAt: ago(3 * DAY),
    locationName: "Yard",
  },
];

/** Headline reading per device. `null` means the device does not report one. */
export const DEMO_READINGS: Record<string, { metric: string; value: number | null; unit: string } | undefined> = {
  "probe-a": { metric: "Temperature", value: 3.8, unit: "°C" },
  "gateway-1": undefined,
  "probe-b": { metric: "Temperature", value: 6.4, unit: "°C" },
  "meter-1": { metric: "Load", value: 4.2, unit: "kW" },
  "air-1": { metric: "PM2.5", value: null, unit: "µg/m³" },
  "probe-c": { metric: "Temperature", value: null, unit: "°C" },
};

/**
 * A series, built from a list where `null` means the sensor did not answer at that interval.
 *
 * The gap is carried as `quality: "missing"` rather than omitted from the array, because the reading
 * was *due* and did not arrive — which is a different fact from the series simply having fewer points,
 * and it is the fact `TelemetryTrend` draws as a break in the line.
 */
function series(deviceId: string, metric: string, unit: string, values: (number | null)[], stepMs = 20 * MINUTE): KinetixTelemetrySeries {
  return {
    deviceId,
    metric,
    points: values.map((value, index) => ({
      timestamp: ago((values.length - 1 - index) * stepMs),
      metric,
      unit,
      ...(value === null ? { value: 0, quality: "missing" as const } : { value }),
    })),
  };
}

export const DEMO_SERIES: Record<string, KinetixTelemetrySeries> = {
  temperature: series("probe-a", "Temperature", "°C", [4.4, 4.1, 3.9, 4.2, 4.0, 3.7, 3.9, 4.1, 3.8, 3.8]),
  humidity: series("probe-a", "Humidity", "%", [61, 62, 60, 63, 64, 62, 61, 60, 62, 63]),
  // The sensor in `error` state: it answered, then stopped, and has not come back.
  airQuality: series("air-1", "PM2.5", "µg/m³", [12, 14, 13, 15, null, null, null, null, null, null]),
  load: series("meter-1", "Load", "kW", [3.1, 3.4, 5.2, 4.8, 4.4, 4.1, null, 4.6, 4.3, 4.2]),
};

export const DEMO_ALERTS: KinetixDeviceAlert[] = [
  {
    id: "alert-1",
    deviceId: "air-1",
    severity: "critical",
    message: "Sensor has not reported for 2 hours",
    raisedAt: ago(2 * HOUR),
  },
  {
    id: "alert-2",
    deviceId: "probe-b",
    severity: "warning",
    message: "Temperature above 5 °C for 40 minutes",
    raisedAt: ago(40 * MINUTE),
  },
  {
    id: "alert-3",
    deviceId: "probe-c",
    severity: "warning",
    message: "Battery below 5%",
    raisedAt: ago(26 * HOUR),
    acknowledgedAt: ago(20 * HOUR),
  },
  {
    id: "alert-4",
    deviceId: "meter-1",
    severity: "info",
    message: "Firmware 2.0.0 available",
    raisedAt: ago(8 * HOUR),
  },
];

export const DEMO_COMMANDS: KinetixDeviceCommand[] = [
  { id: "cmd-1", deviceId: "meter-1", name: "install-firmware", status: "acknowledged", createdAt: ago(4 * MINUTE), updatedAt: ago(90_000) },
  { id: "cmd-2", deviceId: "probe-a", name: "set-sample-interval", status: "completed", createdAt: ago(3 * HOUR), updatedAt: ago(3 * HOUR) },
  { id: "cmd-3", deviceId: "air-1", name: "reboot", status: "failed", createdAt: ago(105 * MINUTE), updatedAt: ago(104 * MINUTE), errorMessage: "No response within 60 s" },
  { id: "cmd-4", deviceId: "probe-c", name: "reboot", status: "expired", createdAt: ago(2 * DAY), updatedAt: ago(2 * DAY - HOUR) },
];

export const deviceById = (id: string): KinetixDevice =>
  DEMO_DEVICES.find((device) => device.id === id) ?? DEMO_DEVICES[0]!;
