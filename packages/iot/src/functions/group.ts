import { KINETIX_DEVICE_STATUSES, type KinetixDevice, type KinetixDeviceStatus } from "../types/device";
import { needsAttention, normalizeDeviceStatus } from "./status";

/**
 * Device groups.
 *
 * A group is any set of devices a product wants to talk about at once — a site, a line, a vehicle, a
 * customer, a room. This module deliberately has no opinion about which of those it is: it takes an
 * array and answers two questions that every device product asks about one.
 *
 * The answers are counts and an ordering, not a verdict. "Is this group healthy?" is a product
 * judgement — a fleet of weather stations where two are offline overnight is fine, a fleet of two
 * infusion pumps where two are offline is not — so nothing here collapses a group into a single
 * green or red.
 */

/**
 * What a group of devices currently looks like.
 *
 * `byStatus` carries **every** status, including the zeroes. A UI that iterates it gets a stable set
 * of rows whose numbers change, rather than rows that appear and disappear as a fleet moves — and a
 * count of zero offline devices is a fact worth being able to render.
 */
export type KinetixDeviceSummary = {
  /** How many devices were counted. */
  total: number;
  /** Count per status, every status present. */
  byStatus: Record<KinetixDeviceStatus, number>;
  /** How many are in a status `needsAttention` is true for. */
  needsAttention: number;
};

/** A zeroed count for every status, in the canonical order. */
function emptyCounts(): Record<KinetixDeviceStatus, number> {
  const counts = {} as Record<KinetixDeviceStatus, number>;
  for (const status of KINETIX_DEVICE_STATUSES) counts[status] = 0;
  return counts;
}

/**
 * Count a group of devices by status.
 *
 * Each device's status goes through `normalizeDeviceStatus`, so a group assembled from more than one
 * backend still counts as one group. That also means an unrecognised status counts as `offline`,
 * which is the same conservative choice normalisation makes everywhere else: the total always equals
 * the number of devices handed in, and nothing is silently dropped for being unreadable.
 *
 * A non-array input is an empty group rather than a throw. This is called during render.
 */
export function summarizeDevices(devices: readonly KinetixDevice[] | null | undefined): KinetixDeviceSummary {
  const byStatus = emptyCounts();
  if (!Array.isArray(devices)) return { total: 0, byStatus, needsAttention: 0 };

  let attention = 0;
  for (const device of devices) {
    const status = normalizeDeviceStatus(device?.status);
    byStatus[status] += 1;
    if (needsAttention(status)) attention += 1;
  }
  return { total: devices.length, byStatus, needsAttention: attention };
}

/** Position in `KINETIX_DEVICE_STATUSES`; an unknown status sorts as whatever it normalises to. */
function attentionRank(status: unknown): number {
  return KINETIX_DEVICE_STATUSES.indexOf(normalizeDeviceStatus(status));
}

/**
 * Comparator ordering devices by how much attention their status needs, worst first.
 *
 * The order is `KINETIX_DEVICE_STATUSES` — defined once, on the type, so sorting a list and
 * rendering a legend cannot disagree about which state is worse.
 *
 * Devices sharing a status keep their input order: `Array.prototype.sort` has been stable since
 * ES2019, and a comparator that returned a tiebreak here would reorder a list the product had
 * already ordered on purpose (by name, by install date, by whatever it knows and this does not).
 *
 * ```ts
 * const worstFirst = [...devices].sort(compareDeviceAttention);
 * ```
 */
export function compareDeviceAttention(a: KinetixDevice | null | undefined, b: KinetixDevice | null | undefined): number {
  return attentionRank(a?.status) - attentionRank(b?.status);
}
