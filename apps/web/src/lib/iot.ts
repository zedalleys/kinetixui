/**
 * What the site is allowed to say about `@kinetixui/iot`, read from the package itself.
 *
 * The version, the entry points and the React requirement are facts the published package already states, so
 * they are read from its manifest rather than restated here — the same reason `siteConfig.version` reads
 * `@kinetixui/ui` and `PACKAGES` reads each package's own name. A number typed into a page is a number that
 * goes stale on the next release without anything failing.
 *
 * `MATURITY` is the one string that is not machine-readable in the manifest: npm has no maturity field, and the
 * package declares it in prose (`description`) and in its changelog. It is a constant here, with
 * `current-truth.test.ts` asserting the package still says the same word — so the two cannot drift apart
 * silently, and the site is not the place the claim originates.
 */
import iotPackage from "../../../../packages/iot/package.json";

/** `0.1.0` — whatever the package is at. Never typed into a page. */
export const IOT_VERSION: string = iotPackage.version;

export const IOT_PACKAGE: string = iotPackage.name;

export const IOT_LICENSE: string = iotPackage.license;

/**
 * The module's maturity, as one lowercase word. Matches the nav badge vocabulary (`maturityBadge` in site.ts
 * produces the same shape for a platform), so IoT reads like the rest of the system rather than like an
 * exception with its own label.
 */
export const IOT_MATURITY = "experimental" as const;

/** `Experimental · 0.1.0` — the one place that pairing is composed. */
export const IOT_MATURITY_LABEL = `Experimental · ${IOT_VERSION}`;

/**
 * The public entry points, in the order a reader meets them, derived from the `exports` map.
 *
 * `./package.json` is deliberately excluded: it is in the exports map because tooling reads it, not because it
 * is a surface anyone imports from. Everything else the map lists is shown.
 */
export const IOT_ENTRY_POINTS: readonly { subpath: string; specifier: string }[] = Object.keys(iotPackage.exports)
  .filter((subpath) => subpath !== "./package.json")
  .sort((a, b) => (a === "." ? -1 : b === "." ? 1 : a.localeCompare(b)))
  .map((subpath) => ({
    subpath,
    specifier: subpath === "." ? iotPackage.name : `${iotPackage.name}${subpath.slice(1)}`,
  }));

/**
 * Whether React is required to use the package at all. It is not: `react` is an optional peer, which is the
 * machine-readable form of "the functions half needs no renderer". Read rather than asserted so that a future
 * change to the peer cannot leave the page claiming something the manifest contradicts.
 */
export const IOT_REACT_OPTIONAL: boolean =
  iotPackage.peerDependenciesMeta?.react?.optional === true;

/** The declared React range, e.g. `>=18`. */
export const IOT_REACT_PEER: string = iotPackage.peerDependencies.react;

/** Zero runtime dependencies is a property of the package, not a claim about it. */
export const IOT_RUNTIME_DEPENDENCY_COUNT: number = Object.keys(
  (iotPackage as { dependencies?: Record<string, string> }).dependencies ?? {},
).length;

/**
 * How many components each React layer exports, for the "What ships" section.
 *
 * These are typed here because a barrel cannot be counted from client-safe code without a file read, and
 * `current-truth.test.ts` derives all three from `packages/iot/src/react/index.ts` and fails when they
 * disagree. So the page states a number, and the barrel is what makes it true — the same arrangement the
 * package README already has with `catalogue.test.ts`.
 */
export const IOT_CATALOGUE = { primitives: 10, controls: 7, patterns: 29 } as const;

/**
 * The three reference environments, in the order the switcher shows them. Each `slug` is an entry in
 * `iot-examples.manifest.json`; `current-truth.test.ts` fails if one is missing, so the page cannot render an
 * empty tab. The hierarchy strings are the vocabularies each environment's own scenario uses.
 */
export const IOT_ENVIRONMENTS = [
  {
    id: "smart-space",
    slug: "smart-space-environment",
    label: "Smart space",
    hierarchy: "Home → Floor → Room",
    summary: "A home end to end: rooms with rolled-up health, light, thermostat, plug and lock controls, air quality, a sample camera frame, energy, alerts and scenes.",
  },
  {
    id: "agritech",
    slug: "agritech-environment",
    label: "Agritech",
    hierarchy: "Farm → Field → Irrigation zone",
    summary: "Greenhouse A: climate and soil readings, a soil-moisture trend against its threshold, valve and pump controls with a flaky valve, zones, alerts and an irrigation rule.",
  },
  {
    id: "operations",
    slug: "operations-environment",
    label: "Operations",
    hierarchy: "Organization → Site → Line → Machine",
    summary: "Site 04: fleet health, a hierarchy with a rollup at every level, equipment health, energy, faults and the command history.",
  },
] as const;

/**
 * Every example slug the /iot page renders, by section. The page reads its slugs from here rather than
 * typing them inline so `current-truth.test.ts` can check each one against the manifest, and can check that
 * a manifest entry is not silently absent from the page.
 */
export const IOT_PAGE_EXAMPLES = {
  stateHonesty: "state-honesty",
  telemetry: "telemetry-history",
  alerts: "alert-center",
  automation: "automation-builder",
  pairing: "pairing-flow",
  deviceDetail: "device-detail",
  /** Earlier layouts, shown one at a time under "More layouts". */
  layouts: [
    { id: "layout-fleet", label: "Fleet overview", slug: "device-fleet" },
    { id: "layout-dashboard", label: "Dashboard", slug: "device-dashboard" },
    { id: "layout-space", label: "Connected space", slug: "connected-space" },
    { id: "layout-telemetry", label: "Telemetry board", slug: "telemetry-board" },
    { id: "layout-inbox", label: "Alert inbox", slug: "alert-inbox" },
    { id: "layout-troubleshooting", label: "Connection troubleshooting", slug: "connection-troubleshooting" },
  ],
} as const;

/**
 * The /iot "Explore by task" categories, derived from what the React barrel actually exports.
 *
 * Every component in `@kinetixui/iot/react` belongs to exactly one category, and `iot-page.test.tsx` holds that
 * against the barrel, so a category cannot advertise a part that does not ship and a shipped part cannot be left
 * out of the tour. The groups follow the task a product team is doing, not the package's internal layers:
 * environment telemetry and monitoring were one group because every telemetry part is also a monitoring part,
 * and fleets and places were one group because the place hierarchy only exists to roll devices up.
 *
 * `aliases` are the section anchors this content used to live under (`#telemetry`, `#pairing`, a layout tab
 * id), so an old link still lands on the right category.
 */
export type IotCategoryId = "control" | "monitoring" | "alerts" | "automation" | "setup" | "fleet";

export const IOT_CATEGORIES: readonly {
  id: IotCategoryId;
  label: string;
  /** The tab's own word. Short on purpose: at 390px and 200% text one tab has about 320px. */
  tab: string;
  parts: readonly string[];
  docs: string;
  aliases: readonly string[];
}[] = [
  {
    id: "control",
    label: "Control",
    tab: "Control",
    parts: [
      "DevicePowerControl",
      "DeviceLevelControl",
      "DeviceSetpointControl",
      "DeviceModeControl",
      "DeviceColorControl",
      "DeviceLockControl",
      "DeviceMediaControl",
      "DeviceControlCard",
      "CommandLifecycle",
      "CommandStatus",
      "CommandFeedback",
    ],
    docs: "/docs/iot#controls",
    aliases: ["state-honesty"],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    tab: "Monitoring",
    parts: [
      "DeviceConnection",
      "DeviceBattery",
      "BatteryIndicator",
      "SignalStrength",
      "LastSync",
      "SensorReading",
      "MetricStatus",
      "TelemetryMetric",
      "TelemetryTrend",
      "TelemetryCard",
      "TelemetryGrid",
      "ConnectionHealth",
      "EnergySummary",
      "FirmwareStatus",
    ],
    docs: "/docs/iot#monitoring-truth-model",
    aliases: ["telemetry", "missing-data", "layout-telemetry"],
  },
  {
    id: "alerts",
    label: "Alerts and activity",
    tab: "Alerts",
    parts: ["AlertList", "AlertCard", "ActivityTimeline", "DeviceActivity"],
    docs: "/docs/iot#alerts-and-activity",
    aliases: ["layout-inbox"],
  },
  {
    id: "automation",
    label: "Automation",
    tab: "Automation",
    parts: ["AutomationBuilder", "AutomationRuleView", "RoutineCard"],
    docs: "/docs/iot#automation",
    aliases: [],
  },
  {
    id: "setup",
    label: "Setup",
    tab: "Setup",
    parts: ["PairingMethodPicker", "PairingStepper", "PairingFailure"],
    docs: "/docs/iot#pairing-is-ui-state-not-a-transport",
    aliases: ["pairing"],
  },
  {
    id: "fleet",
    label: "Fleets and places",
    tab: "Fleets",
    parts: [
      "DeviceStatusBadge",
      "DeviceIcon",
      "DeviceIdentity",
      "DeviceCard",
      "DeviceListItem",
      "DeviceGroupCard",
      "DeviceHealthSummary",
      "DeviceStateSummary",
      "SpaceRollup",
      "SpaceBreadcrumb",
      "CameraDeviceCard",
    ],
    docs: "/docs/iot#grouping-and-hierarchy",
    aliases: ["layouts", "layout-fleet", "layout-dashboard", "layout-space", "layout-troubleshooting"],
  },
];

/** Which layer of the React barrel a part comes from, for the "Parts" list. Held against the barrel in tests. */
export const IOT_PART_LAYER: Record<string, "primitive" | "control" | "pattern"> = Object.fromEntries([
  ...[
    "BatteryIndicator",
    "DeviceBattery",
    "DeviceConnection",
    "DeviceIcon",
    "DeviceIdentity",
    "DeviceStatusBadge",
    "LastSync",
    "MetricStatus",
    "SensorReading",
    "SignalStrength",
  ].map((name) => [name, "primitive"] as const),
  ...[
    "DeviceColorControl",
    "DeviceLevelControl",
    "DeviceLockControl",
    "DeviceMediaControl",
    "DeviceModeControl",
    "DevicePowerControl",
    "DeviceSetpointControl",
  ].map((name) => [name, "control"] as const),
]);
