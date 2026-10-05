import type { KinetixCapabilityRole, KinetixCapabilitySupport, KinetixDeviceCapability } from "../types/device-state";

/**
 * Capability lookup.
 *
 * A device is described by what it can do, not by what it is called: a lamp is `power` + `level`
 * (role `brightness`) + `color`, a speaker is `power` + `mode` (role `media-playback`) + `level`
 * (role `volume`). These helpers answer "can this device do X" without a per-product class.
 */

/**
 * Whether a device offers the capability with this id.
 *
 * `unsupported` is a first-class answer. It is different from a control being `unavailable` (the
 * capability exists but cannot be used right now) and a UI should present it differently: an
 * unsupported control is not drawn as a disabled one that might come back.
 */
export function resolveCapabilitySupport(
  capabilities: readonly KinetixDeviceCapability[] | null | undefined,
  id: string,
): KinetixCapabilitySupport {
  const found = (Array.isArray(capabilities) ? capabilities : []).find((capability) => capability?.id === id);
  if (!found) return "unsupported";
  return found.readOnly ? "read-only" : "supported";
}

/** The capabilities with a given role, in input order. A device may offer several (two zones' setpoints). */
export function findCapabilitiesByRole(
  capabilities: readonly KinetixDeviceCapability[] | null | undefined,
  role: KinetixCapabilityRole,
): KinetixDeviceCapability[] {
  return (Array.isArray(capabilities) ? capabilities : []).filter((capability) => capability?.role === role);
}
