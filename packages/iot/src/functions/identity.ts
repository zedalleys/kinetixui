/**
 * Device-category inference.
 *
 * Products name their device types themselves, so this maps a free-text `type` onto the small closed
 * category set by looking for the words people actually use. It is a convenience, not a contract:
 * anything it cannot place is `unknown`, and a product that cares passes the category explicitly.
 */

import type { KinetixDevice } from "../types/device";
import type { KinetixControlAffordance, KinetixDeviceCategory } from "../types/identity";
import { CATEGORY_AFFORDANCES, KINETIX_DEVICE_CATEGORIES } from "../types/identity";

/**
 * Word fragments that identify a category, in resolution order.
 *
 * Order matters where terms overlap: "smart-plug-meter" is a meter first because that is the more
 * specific claim, and "valve" precedes "pump" because irrigation products name the whole assembly
 * after the valve. Each list is matched as a substring against the lower-cased type, so
 * "soil-moisture-sensor" and "sensor.soil" both land on `sensor`.
 */
const CATEGORY_HINTS: ReadonlyArray<readonly [KinetixDeviceCategory, readonly string[]]> = [
  ["thermostat", ["thermostat", "hvac", "climate", "radiator", "heat-pump", "heatpump"]],
  ["camera", ["camera", "cam", "doorbell", "nvr"]],
  ["lock", ["lock", "deadbolt", "latch", "strike"]],
  ["meter", ["meter", "energy", "kwh", "consumption", "submeter"]],
  ["valve", ["valve", "solenoid", "actuator"]],
  ["pump", ["pump", "irrigation", "compressor"]],
  ["fan", ["fan", "ventilat", "extractor", "blower"]],
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
  const names: Record<KinetixDeviceCategory, string> = {
    light: "Light",
    thermostat: "Thermostat",
    sensor: "Sensor",
    camera: "Camera",
    lock: "Lock",
    plug: "Smart plug",
    fan: "Fan",
    pump: "Pump",
    valve: "Valve",
    meter: "Meter",
    gateway: "Gateway",
    unknown: "Device",
  };
  return names[category] ?? "Device";
}
