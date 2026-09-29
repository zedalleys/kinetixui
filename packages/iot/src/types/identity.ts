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
 * A device whose category cannot be determined is `unknown`, and `unknown` renders as a neutral
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

export const CATEGORY_AFFORDANCES: Readonly<Record<KinetixDeviceCategory, readonly KinetixControlAffordance[]>> = {
  light: ["power", "level"],
  thermostat: ["setpoint", "mode"],
  sensor: [],
  camera: ["power", "mode"],
  lock: ["power"],
  plug: ["power"],
  fan: ["power", "level", "mode"],
  pump: ["power", "level"],
  valve: ["power", "level"],
  meter: [],
  gateway: [],
  unknown: [],
};
