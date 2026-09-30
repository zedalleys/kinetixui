/** A tiny scenario with round timings, for unit tests only. Not exported from the package index. */
import type { SimScenario } from "./types";

export const TEST_START = "2026-01-01T00:00:00.000Z";
export const at = (ms: number) => new Date(Date.parse(TEST_START) + ms).toISOString();

export const testScenario: SimScenario = {
  id: "test",
  name: "Test",
  description: "Round numbers.",
  startAt: TEST_START,
  seed: 7,
  devices: [
    { id: "lamp", name: "Lamp", type: "light", status: "online", signal: 80, lastSeenAt: at(0) },
    { id: "ghost", name: "Ghost", type: "light", status: "offline", lastSeenAt: at(-3_600_000) },
    { id: "flaky", name: "Flaky valve", type: "valve", status: "online", signal: 60, lastSeenAt: at(0) },
    { id: "probe", name: "Probe", type: "sensor", status: "online", battery: 80, signal: 70, lastSeenAt: at(0) },
    { id: "quiet", name: "Quiet probe", type: "sensor", status: "online", battery: 80, signal: 70, lastSeenAt: at(0) },
  ],
  spaces: [
    { id: "root", name: "Root", kind: "site" },
    { id: "room", name: "Room", kind: "room", parentId: "root", deviceIds: ["lamp", "ghost", "flaky", "probe", "quiet"] },
  ],
  capabilities: {
    lamp: [
      { id: "power", kind: "power", label: "Power" },
      { id: "level", kind: "level", label: "Brightness", min: 0, max: 100, step: 5, unit: "%" },
    ],
    ghost: [{ id: "power", kind: "power", label: "Power" }],
    flaky: [{ id: "power", kind: "power", label: "Power" }],
    probe: [{ id: "temperature", kind: "telemetry", metric: "temperature", readOnly: true }],
  },
  initialValues: { lamp: { power: "off", level: 40 }, ghost: { power: "off" }, flaky: { power: "off" } },
  latency: {
    lamp: { ackMs: 200, confirmMs: 800, timeoutMs: 2000 },
    ghost: { ackMs: 200, confirmMs: 800, timeoutMs: 2000, unreachableAfterMs: 500 },
    flaky: { ackMs: 200, confirmMs: 800, timeoutMs: 2000, failFirst: 1, failReason: "Did not move." },
  },
  defaultLatency: { ackMs: 200, confirmMs: 800 },
  sensors: [
    { deviceId: "probe", metric: "temperature", unit: "°C", base: 25, amplitude: 0.2, periodMs: 60_000, noise: 0.2, thresholds: { warningHigh: 30, criticalHigh: 40 }, sampleMs: 1000, excursions: [{ fromMs: 20_000, toMs: 60_000, delta: 12 }] },
    { deviceId: "quiet", metric: "temperature", unit: "°C", base: 20, amplitude: 0, periodMs: 60_000, noise: 0, sampleMs: 1000, silentSinceMs: 60_000, staleAfterMs: 30_000 },
  ],
  series: [],
  alerts: [],
  automations: [{ id: "auto-1", name: "Evening", kind: "routine", status: "idle", enabled: true }],
  rules: [],
  activity: [],
  scriptedEvents: [{ id: "s1", atMs: 10_000, automationId: "auto-1", deviceId: "lamp", message: "Lamp: Evening would run" }],
  energy: { unit: "kWh", periodLabel: "Today", devices: [{ deviceId: "lamp", todayKwh: 1, watts: 1000 }], week: [1, 1, 1, 1, 1, 1, 1] },
  disclosure: "test",
};
