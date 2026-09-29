/**
 * Device identity.
 *
 * `KinetixDevice.type` is free text on purpose — a product's own vocabulary belongs to the product.
 * But a UI cannot draw free text, so this adds a small closed set of *categories* that exist only to
 * decide which glyph and which shape of summary a device gets.
 *
 * The set is deliberately short and deliberately not a smart-home taxonomy. Each entry earns its
 * place by being a distinct *interaction shape* rather than a distinct product: a light and a plug
 * are both "something you switch", a pump and a valve are both "something you run", a thermostat is
 * "something with a target". Adding a category is a decision about controls, not about branding a
 * new device type — which is the discipline that keeps this from growing to two hundred entries.
 *
 * ## The taxonomy, and why these four were added

{@link KINETIX_DEVICE_TAXONOMY} is the one place a category's domain, label, default affordances and
group key are defined; nothing else switches on a category to find them out. Adding a category is one
entry there plus one union member.

Four categories were added in 0.3, each because it is a distinct *shape*, not a distinct product:
`motor` is something you run at a speed (a drive, a conveyor) and is not a pump or a fan;
`weather-station` and `air-quality` are multi-metric sensors whose value is the *set* of metrics, so
they deserve their own summary shape rather than a single-reading sensor tile; and `soil-sensor` is
kept separate from `sensor` **only** because agriculture is a domain users filter and group by, and
folding it into `sensor` would drop every probe into a generic SENSOR bucket. What soil sensors
*measure* (moisture, temperature) still comes from the metric registry, not from the category. A
"temperature sensor", "flow meter" or "presence detector" stays `sensor`/`meter`, expressed by metric.

A device whose category cannot be determined is `unknown`, and `unknown` renders as a neutral
 * device glyph rather than guessing. A wrong icon is worse than a generic one.
 */

/** The categories this package can draw and control. Short on purpose — see the file note. */
export type KinetixDeviceCategory =
  | "light"
  | "thermostat"
  | "sensor"
  | "camera"
  | "lock"
  | "plug"
  | "fan"
  | "pump"
  | "valve"
  | "meter"
  | "gateway"
  | "motor"
  | "weather-station"
  | "air-quality"
  | "soil-sensor"
  | "unknown";

export const KINETIX_DEVICE_CATEGORIES: readonly KinetixDeviceCategory[] = [
  "light",
  "thermostat",
  "sensor",
  "camera",
  "lock",
  "plug",
  "fan",
  "pump",
  "valve",
  "meter",
  "gateway",
  "motor",
  "weather-station",
  "air-quality",
  "soil-sensor",
  "unknown",
] as const;

/**
 * Which control surfaces a category typically supports.
 *
 * Advisory, not enforcement: a product composes whichever controls its device actually has, and
 * this package never refuses to render a level control on a lock. It exists so a generic list can
 * pick a sensible default control for a device it was handed, and so the docs can say which
 * categories the control layer was designed against.
 */
export type KinetixControlAffordance = "power" | "level" | "setpoint" | "mode";

/**
 * The broad area a device belongs to, for grouping and filtering a fleet ("show me everything
 * irrigation"). Categories describe how a device is *operated*; domains describe what it is *for*.
 * The two are separate on purpose: a valve is one interaction shape that lives in the `water`
 * domain in a building and `irrigation` on a farm, and a product can override a device's domain.
 */
export type KinetixDeviceDomain =
  | "lighting"
  | "climate"
  | "power"
  | "security"
  | "access"
  | "sensor"
  | "camera"
  | "water"
  | "irrigation"
  | "pump"
  | "motor"
  | "environment"
  | "energy"
  | "agriculture"
  | "industrial"
  | "other";

/** Every domain, in the order a grouped fleet view lists them. */
export const KINETIX_DEVICE_DOMAINS: readonly KinetixDeviceDomain[] = [
  "lighting",
  "climate",
  "power",
  "energy",
  "security",
  "access",
  "camera",
  "sensor",
  "environment",
  "water",
  "irrigation",
  "pump",
  "motor",
  "agriculture",
  "industrial",
  "other",
] as const;

export type KinetixDeviceTaxonomyEntry = {
  domain: KinetixDeviceDomain;
  /** English fallback label. Not localised — a product with a translation layer passes its own. */
  label: string;
  /** Default capabilities: the control surfaces a device of this category usually has. */
  affordances: readonly KinetixControlAffordance[];
  /** Metric keys (see `KINETIX_METRIC_REGISTRY`) a device of this category usually reports. Advisory. */
  defaultMetrics: readonly string[];
  /** Stable plural key for group/filter UI, e.g. a filter chip id. */
  groupKey: string;
};

/**
 * The one registry. `Record<KinetixDeviceCategory, …>` makes the compiler refuse a category without
 * an entry, so extending the union cannot leave a half-registered category behind.
 */
export const KINETIX_DEVICE_TAXONOMY: Readonly<Record<KinetixDeviceCategory, KinetixDeviceTaxonomyEntry>> = {
  light: { domain: "lighting", label: "Light", affordances: ["power", "level"], defaultMetrics: [], groupKey: "lights" },
  thermostat: { domain: "climate", label: "Thermostat", affordances: ["setpoint", "mode"], defaultMetrics: ["temperature", "humidity"], groupKey: "thermostats" },
  sensor: { domain: "sensor", label: "Sensor", affordances: [], defaultMetrics: [], groupKey: "sensors" },
  camera: { domain: "camera", label: "Camera", affordances: ["power", "mode"], defaultMetrics: [], groupKey: "cameras" },
  lock: { domain: "access", label: "Lock", affordances: ["power"], defaultMetrics: [], groupKey: "locks" },
  plug: { domain: "power", label: "Smart plug", affordances: ["power"], defaultMetrics: ["power"], groupKey: "plugs" },
  fan: { domain: "climate", label: "Fan", affordances: ["power", "level", "mode"], defaultMetrics: [], groupKey: "fans" },
  pump: { domain: "pump", label: "Pump", affordances: ["power", "level"], defaultMetrics: ["flow", "pressure"], groupKey: "pumps" },
  valve: { domain: "water", label: "Valve", affordances: ["power", "level"], defaultMetrics: ["flow"], groupKey: "valves" },
  meter: { domain: "energy", label: "Meter", affordances: [], defaultMetrics: ["power", "energy"], groupKey: "meters" },
  gateway: { domain: "other", label: "Gateway", affordances: [], defaultMetrics: ["signal-strength"], groupKey: "gateways" },
  motor: { domain: "motor", label: "Motor", affordances: ["power", "level"], defaultMetrics: ["power"], groupKey: "motors" },
  "weather-station": { domain: "environment", label: "Weather station", affordances: [], defaultMetrics: ["temperature", "humidity", "pressure"], groupKey: "weather-stations" },
  "air-quality": { domain: "environment", label: "Air quality monitor", affordances: [], defaultMetrics: ["air-quality", "temperature", "humidity"], groupKey: "air-quality" },
  "soil-sensor": { domain: "agriculture", label: "Soil sensor", affordances: [], defaultMetrics: ["soil-moisture", "temperature"], groupKey: "soil-sensors" },
  unknown: { domain: "other", label: "Device", affordances: [], defaultMetrics: [], groupKey: "other" },
};

/** Affordances per category, derived from {@link KINETIX_DEVICE_TAXONOMY} so there is one source. */
export const CATEGORY_AFFORDANCES: Readonly<Record<KinetixDeviceCategory, readonly KinetixControlAffordance[]>> =
  /* @__PURE__ */ deriveAffordances(KINETIX_DEVICE_TAXONOMY);

function deriveAffordances(
  taxonomy: Readonly<Record<KinetixDeviceCategory, KinetixDeviceTaxonomyEntry>>,
): Record<KinetixDeviceCategory, readonly KinetixControlAffordance[]> {
  const out = {} as Record<KinetixDeviceCategory, readonly KinetixControlAffordance[]>;
  for (const category of KINETIX_DEVICE_CATEGORIES) out[category] = taxonomy[category].affordances;
  return out;
}
