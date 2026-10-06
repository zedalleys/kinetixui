import type { KinetixFreshness } from "../types/monitoring";
import { parseTimestamp, resolveNow } from "./time";

/**
 * Data freshness (M3): one small, pure contract shared by every monitoring component.
 *
 * Freshness is a fact about **one piece of data**, measured against a policy **the application
 * supplies**. It is not connectivity: an `online` device can send a reading that is hours old, and an
 * `offline` device's last reading can still be fresh enough for the product. Nothing here reads a
 * device's link, and nothing in connectivity reads this.
 */

export type ResolveFreshnessInput = {
  /** When the data was observed or reported. Undated data has `unknown` freshness. */
  observedAt?: string | Date | number | null;
  /**
   * How old the data may be before it is `stale`, in milliseconds. Omit (or pass a non-positive or
   * non-finite number) and freshness is `unknown`: there is deliberately no default timeout.
   */
  staleAfterMs?: number | null;
  /** Reference instant. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number | null;
  /**
   * An answer the application already has (its backend decided). When given it wins, because the
   * application may know things a timestamp does not; an unrecognised value is ignored.
   */
  freshness?: KinetixFreshness | null;
};

const KNOWN: readonly string[] = ["fresh", "stale", "unknown"];

/**
 * `fresh`, `stale` or `unknown` for one piece of data.
 *
 * - An explicit `freshness` wins.
 * - No usable policy → `unknown`. No usable timestamp → `unknown`. Neither is guessed to be stale or fresh.
 * - Older than `staleAfterMs` → `stale`; otherwise `fresh`. A timestamp slightly in the future (clock
 *   skew between a device and a server) counts as fresh.
 */
export function resolveFreshness(input: ResolveFreshnessInput | null | undefined): KinetixFreshness {
  if (typeof input?.freshness === "string" && KNOWN.includes(input.freshness)) return input.freshness;
  const policy = input?.staleAfterMs;
  if (typeof policy !== "number" || !Number.isFinite(policy) || policy <= 0) return "unknown";
  const observed = parseTimestamp(input?.observedAt ?? null);
  if (!observed) return "unknown";
  return resolveNow(input?.now) - observed.getTime() > policy ? "stale" : "fresh";
}

/**
 * The word for a freshness, or `""` for `fresh` (current data needs no label). `unknown` returns `""`
 * too: it is the absence of a claim, and labelling every undated value "freshness unknown" would bury
 * the readings that are actually stale.
 */
export function describeFreshness(freshness: KinetixFreshness): string {
  return freshness === "stale" ? "Stale" : "";
}
