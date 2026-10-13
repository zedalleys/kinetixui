/**
 * The showcase severity order: one ranking every environment, marker and list uses, so the same condition
 * gets the same weight wherever it appears. Showcase code, not part of `@kinetixui/iot`.
 *
 *   critical   a dangerous or failed condition: always loud (tint, glyph, word)
 *   warning    needs attention: visible at the glance level (glyph, word)
 *   pending    a request in flight: visible, but as a compact line, never a protocol timeline
 *   offline    a connection exception: muted and dashed, never painted like a dangerous condition
 *   confirmed  healthy, confirmed: quiet — no badge, no tint, no word by default
 *
 * Offline sits BELOW pending on purpose: a device that is not reporting is a fact to know, but a request the
 * person just made is what they are watching, and an offline lamp is not a hazard.
 */
import type { ShowcaseState } from "./primitives";

export const SEVERITY_ORDER: readonly ShowcaseState[] = ["critical", "warning", "pending", "offline", "confirmed"];

/** Lower is more severe. `confirmed` (healthy) is last. */
export function severityRank(state: ShowcaseState): number {
  return SEVERITY_ORDER.indexOf(state);
}

/** The more severe of two states. */
export function worseState(a: ShowcaseState, b: ShowcaseState): ShowcaseState {
  return severityRank(b) < severityRank(a) ? b : a;
}

/** Whether a state is an exception that belongs at the glance level (anything but healthy). */
export const isException = (state: ShowcaseState) => state !== "confirmed";
