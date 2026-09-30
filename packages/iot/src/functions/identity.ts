/**
 * Device-category inference.
 *
 * Products name their device types themselves, so this maps a free-text `type` onto the small closed
 * category set by looking for the words people actually use. It is a convenience, not a contract:
 * anything it cannot place is `unknown`, and a product that cares passes the category explicitly.
 */

import type { KinetixDevice } from "../types/device";
import type { KinetixControlAffordance, KinetixDeviceCategory, KinetixDeviceDomain } from "../types/identity";
import { CATEGORY_AFFORDANCES, KINETIX_DEVICE_CATEGORIES, KINETIX_DEVICE_DOMAINS, KINETIX_DEVICE_TAXONOMY } from "../types/identity";

/**
 * Word fragments that identify a category, in resolution order.
 *
 * Order matters where terms overlap: "smart-plug-meter" is a meter first because that is the more
 * specific claim, and "valve" precedes "pump" because irrigation products name the whole assembly
 * after the valve. Each list is matched as a substring against the lower-cased type, so
 * "soil-moisture-sensor" and "sensor.soil" both land on `sensor`.
 */
const CATEGORY_HINTS: ReadonlyArray<readonly [KinetixDeviceCategory, readonly string[]]> = [
  // The specific sensors come first: "soil-moisture-sensor" and "air-quality-monitor" both also
  // contain the generic `sensor`/`monitor` hints, and the more specific claim must win.
  ["soil-sensor", ["soil"]],
  ["weather-station", ["weather", "anemometer", "rain-gauge", "rain gauge", "raingauge", "pyranometer"]],
  ["air-quality", ["air-quality", "air quality", "airquality", "co2", "aqi", "particulate", "pm2.5"]],
  ["thermostat", ["thermostat", "hvac", "climate", "radiator", "heat-pump", "heatpump"]],
  ["camera", ["camera", "cam", "doorbell", "nvr"]],
  ["lock", ["lock", "deadbolt", "latch", "strike"]],
  ["meter", ["meter", "energy", "kwh", "consumption", "submeter"]],
  ["valve", ["valve", "solenoid", "actuator"]],
  ["pump", ["pump", "irrigation", "compressor"]],
  ["fan", ["fan", "ventilat", "extractor", "blower"]],
  // After pump/valve/fan so "pump-motor" and "fan-motor" stay the thing being run.
  ["motor", ["motor", "vfd", "servo", "conveyor"]],
  ["plug", ["plug", "socket", "outlet", "relay", "switch"]],
  ["light", ["light", "lamp", "bulb", "luminaire", "dimmer", "led"]],
  ["gateway", ["gateway", "hub", "bridge", "controller", "coordinator"]],
  ["sensor", ["sensor", "probe", "detector", "monitor", "thermometer", "hygrometer"]],
];

/** True when `value` is one of the categories this package draws. */
export function isKnownDeviceCategory(value: unknown): value is KinetixDeviceCategory {
  return typeof value === "string" && (KINETIX_DEVICE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Infer a category from a device's free-text `type`.
 *
 * An exact category name always wins, so a product that already speaks this vocabulary gets it back
 * unchanged. Everything else is substring matching in the order above. Unrecognised is `unknown`.
 */
export function resolveDeviceCategory(device: Pick<KinetixDevice, "type"> | string | null | undefined): KinetixDeviceCategory {
  const raw = typeof device === "string" ? device : device?.type;
  if (!raw || typeof raw !== "string") return "unknown";
  const type = raw.toLowerCase().trim();
  if (isKnownDeviceCategory(type)) return type;
  for (const [category, hints] of CATEGORY_HINTS) {
    if (hints.some((h) => type.includes(h))) return category;
  }
  return "unknown";
}

/** The control affordances a category is expected to have. Advisory — see the types file. */
export function categoryAffordances(category: KinetixDeviceCategory): readonly KinetixControlAffordance[] {
  return CATEGORY_AFFORDANCES[category] ?? [];
}

/**
 * A short human name for a category, for use where a device has no better label.
 *
 * Not localised — this package carries no translation layer, and a product with one passes its own
 * string. Returning English here rather than the raw enum keeps the fallback readable instead of
 * rendering `heat_pump` at a user.
 */
export function describeDeviceCategory(category: KinetixDeviceCategory): string {
  return KINETIX_DEVICE_TAXONOMY[category]?.label ?? "Device";
}

/** The domain a category belongs to. `other` for anything unregistered. */
export function categoryDomain(category: KinetixDeviceCategory): KinetixDeviceDomain {
  return KINETIX_DEVICE_TAXONOMY[category]?.domain ?? "other";
}

const DOMAIN_LABELS: Readonly<Record<KinetixDeviceDomain, string>> = {
  lighting: "Lighting",
  climate: "Climate",
  power: "Power",
  security: "Security",
  access: "Access",
  sensor: "Sensors",
  camera: "Cameras",
  water: "Water",
  irrigation: "Irrigation",
  pump: "Pumps",
  motor: "Motors",
  environment: "Environment",
  energy: "Energy",
  agriculture: "Agriculture",
  industrial: "Industrial",
  other: "Other",
};

/** A short English name for a domain, for group headings and filter chips. Not localised. */
export function describeDeviceDomain(domain: KinetixDeviceDomain): string {
  return DOMAIN_LABELS[domain] ?? DOMAIN_LABELS.other;
}

export type KinetixDomainGroup<D extends Pick<KinetixDevice, "type">> = {
  domain: KinetixDeviceDomain;
  label: string;
  devices: D[];
};

/** The domain of one device, going through category inference. */
export function resolveDeviceDomain(device: Pick<KinetixDevice, "type"> | string | null | undefined): KinetixDeviceDomain {
  return categoryDomain(resolveDeviceCategory(device));
}

/**
 * Group devices by domain, in the fixed order of `KINETIX_DEVICE_DOMAINS`.
 *
 * Empty domains are omitted — a heading with nothing under it is noise — and devices keep their
 * input order within a group. A non-array input is no groups, since this runs during render.
 */
export function groupDevicesByDomain<D extends Pick<KinetixDevice, "type">>(
  devices: readonly D[] | null | undefined,
): KinetixDomainGroup<D>[] {
  if (!Array.isArray(devices)) return [];
  const buckets = new Map<KinetixDeviceDomain, D[]>();
  for (const device of devices) {
    if (!device) continue;
    const domain = resolveDeviceDomain(device);
    const list = buckets.get(domain);
    if (list) list.push(device);
    else buckets.set(domain, [device]);
  }
  return KINETIX_DEVICE_DOMAINS.filter((domain) => buckets.has(domain)).map((domain) => ({
    domain,
    label: describeDeviceDomain(domain),
    devices: buckets.get(domain) as D[],
  }));
}

/** Keep only the devices in one domain, or any of several. An empty domain list keeps nothing. */
export function filterDevicesByDomain<D extends Pick<KinetixDevice, "type">>(
  devices: readonly D[] | null | undefined,
  domain: KinetixDeviceDomain | readonly KinetixDeviceDomain[],
): D[] {
  if (!Array.isArray(devices)) return [];
  const wanted: readonly KinetixDeviceDomain[] = typeof domain === "string" ? [domain] : domain;
  return devices.filter((device) => !!device && wanted.includes(resolveDeviceDomain(device)));
}
