import type {
  KinetixActivityEvent,
  KinetixAutomation,
  KinetixAutomationRule,
  KinetixCommandLifecycle,
  KinetixDevice,
  KinetixDeviceCommand,
  KinetixDeviceAlert,
  KinetixDeviceCapability,
  KinetixDeviceFault,
  KinetixMetricThresholds,
  KinetixReadingEvaluation,
  KinetixSpaceNode,
  KinetixTelemetryPoint,
  KinetixTelemetrySeries,
} from "@kinetixui/iot/functions";

/** A clock value passed in by the caller. The simulation never reads a clock of its own. */
export type SimTime = string | number | Date;

/** How a device behaves when it is commanded. All times are in simulated milliseconds. */
export type SimLatency = {
  /** Time from send to the device acknowledging. */
  ackMs: number;
  /** Time from send to the device confirming (or failing). Must be >= ackMs. */
  confirmMs: number;
  /** In-flight time after which a request is declared timed out. Defaults to 8000. */
  timeoutMs?: number;
  /** After a timeout on an unreachable device, how long before it is called unreachable. Defaults to 1500. */
  unreachableAfterMs?: number;
  /** A flaky device: how many commands fail (once each) before it starts succeeding. */
  failFirst?: number;
  failReason?: string;
};

/** A sensor that drifts deterministically. Values are a pure function of (seed, sensor, elapsed time). */
export type SimSensor = {
  deviceId: string;
  metric: string;
  unit?: string;
  decimals?: number;
  /** The value at `startAt`, exactly. Drift is measured away from it. */
  base: number;
  /** Peak of the ambient sinusoid. */
  amplitude: number;
  periodMs: number;
  /** Peak-to-peak-ish jitter added on top, from the seeded generator. */
  noise: number;
  min?: number;
  max?: number;
  /** Product thresholds, merged over the registry defaults by `evaluateReading`. */
  thresholds?: KinetixMetricThresholds;
  /** Time between samples. Defaults to 5000. */
  sampleMs?: number;
  /** A reading older than this is stale. Defaults to 6 samples. */
  staleAfterMs?: number;
  /**
   * Scripted excursions, in ms after `startAt`: the value moves by `delta` and back, peaking at the
   * middle of the window. This is how a demo crosses a threshold on purpose.
   */
  excursions?: readonly { fromMs: number; toMs: number; delta: number }[];
  /** The sensor last reported this long before `startAt` and has not reported since (a stale sensor). */
  silentSinceMs?: number;
  /** Alert wording and kind when this sensor breaches. */
  alertKind?: string;
  alertLabel?: string;
};

/** A demo event a scenario schedules. It changes nothing on its own except an optional confirmed effect. */
export type SimScriptedEvent = {
  id: string;
  /** Milliseconds after `startAt`. */
  atMs: number;
  message: string;
  deviceId?: string;
  automationId?: string;
  /** Free text, e.g. "Automation: Morning irrigation". */
  source?: string;
  /** The device reporting a new confirmed value as a result. */
  effect?: { deviceId: string; capabilityId: string; value: unknown };
};

export type SimEnergyDevice = {
  deviceId: string;
  label?: string;
  /** kWh already consumed today at `startAt`. */
  todayKwh: number;
  /** Draw while the device's confirmed `power` capability is `on`. 0 means it never accrues. */
  watts?: number;
};

export type SimEnergy = {
  unit: string;
  devices: readonly SimEnergyDevice[];
  /** Seven daily totals, oldest first, ending yesterday. */
  week: readonly (number | null)[];
  baseline?: number;
  limit?: number;
  /** Headline label for the breakdown. */
  periodLabel: string;
};

/** Everything the simulation needs. Plain data: no JSX, no functions. */
export type SimScenario = {
  id: string;
  name: string;
  description: string;
  /** The fixed instant the scenario begins at. Never derived from a clock. */
  startAt: string;
  /** Default seed for drift and for generated history. */
  seed: number;
  devices: readonly KinetixDevice[];
  spaces: readonly KinetixSpaceNode[];
  capabilities: Readonly<Record<string, readonly KinetixDeviceCapability[]>>;
  /** Confirmed value per capability at `startAt`. */
  initialValues: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  latency: Readonly<Record<string, SimLatency>>;
  /** Used for devices with no entry in `latency`. */
  defaultLatency: SimLatency;
  sensors: readonly SimSensor[];
  /** Historical series ending at `startAt`. */
  series: readonly KinetixTelemetrySeries[];
  alerts: readonly KinetixDeviceAlert[];
  faults?: Readonly<Record<string, readonly KinetixDeviceFault[]>>;
  automations: readonly KinetixAutomation[];
  rules: readonly KinetixAutomationRule[];
  activity: readonly KinetixActivityEvent[];
  /** Past commands, for a history list. The simulation's own commands are separate and start empty. */
  commandHistory?: readonly KinetixDeviceCommand[];
  scriptedEvents: readonly SimScriptedEvent[];
  energy?: SimEnergy;
  /** Names for rule summaries: subject / scope / target id → readable name. */
  labels?: Readonly<Record<string, string>>;
  /** Fabricated-data statement the page should show with this scenario. */
  disclosure: string;
  /** Data the application supplies, that KinetixUI itself would never fetch. */
  applicationProvided?: Readonly<Record<string, unknown>>;
};

export type SimOptions = {
  /** Overrides the scenario seed. */
  seed?: number;
  /** Overrides the scenario start. Must be an ISO string, never a clock read. */
  startAt?: string;
};

/** One command the simulation is tracking, kept for its whole life so history and retries work. */
export type SimCommand = {
  id: string;
  deviceId: string;
  capabilityId: string;
  /** The product verb, e.g. "set-power". */
  name: string;
  lifecycle: KinetixCommandLifecycle;
  createdAt: string;
  updatedAt: string;
};

export type SimReading = {
  deviceId: string;
  metric: string;
  value: number;
  unit?: string;
  timestamp: string;
  /** Sample index the value was computed for. Lets a tick skip work it already did. */
  sampleIndex: number;
};

export type SimDeviceRuntime = {
  device: KinetixDevice;
  /** Whether the scripted device answers at all. */
  reachable: boolean;
  /** Set when a command has been declared unreachable; cleared when the device is reachable again. */
  unreachable: boolean;
  statusBeforeOffline?: KinetixDevice["status"];
  confirmedValues: Record<string, unknown>;
  requestedValues: Record<string, unknown>;
};

export type Simulation = {
  scenario: SimScenario;
  seed: number;
  startAt: string;
  /** ISO time the simulation has been advanced to. */
  now: string;
  devices: Record<string, SimDeviceRuntime>;
  commands: SimCommand[];
  readings: Record<string, SimReading>;
  /** Points produced by drift since `startAt`, capped per sensor. */
  live: Record<string, KinetixTelemetryPoint[]>;
  alerts: KinetixDeviceAlert[];
  activity: KinetixActivityEvent[];
  automations: KinetixAutomation[];
  /** kWh accrued since `startAt`, per device id. */
  energyAccrued: Record<string, number>;
  /** How many scripted failures each device has already served. */
  failuresServed: Record<string, number>;
  firedScripts: string[];
  counters: { command: number; activity: number; alert: number };
  /** Id of the command created by the most recent `dispatchCommand`, if it was accepted. */
  lastCommandId: string | null;
};

export type SimReadingView = SimReading & { evaluation: KinetixReadingEvaluation };
