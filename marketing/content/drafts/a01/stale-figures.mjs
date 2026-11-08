/**
 * a01 — the stale current-state figure sweep, extracted so it can be tested.
 *
 * `verify-package.mjs` re-derives every current figure from the repository and then sweeps the
 * channel files for figures that USED to be current, so correcting one sentence cannot leave a
 * second one carrying last month's number. Historical before/after sentences are stripped first:
 * they are the evidence the piece rests on, each pinned to a commit in `verify-evidence.mjs`, and
 * must survive the sweep intact.
 *
 * Why this is a module and not six lines inside the script: the sweep used
 * `body.includes(<figure>)`, a bare substring test, and a bare substring test cannot tell a figure
 * from the tail of a longer number. "19 documented exceptions" — today's correct figure, which the
 * same file asserts is present — ends with the characters of the stale "9 documented exceptions",
 * so the script asserted the paragraph both correct and stale on one run. A gate that contradicts
 * itself on correct input teaches the reader to ignore it.
 *
 * The fix is to make each figure match only where it is a whole number, never where a digit runs
 * into it on either side. That makes the matcher STRICTER, not looser: every figure below still
 * fires when it genuinely appears, and no new text is excused.
 *
 * A `\b` guard would fix the reported case too — there is no word boundary between "1" and "9", so
 * `\b9 documented` does not match inside "19 documented" either. The digit guard is used because it
 * says the requirement outright, that a figure must not be part of a longer number, instead of
 * reaching that outcome through what `\b` happens to do at each figure's particular edges.
 */

/**
 * Historical before/after sentences, removed before the sweep. Owned by `verify-evidence.mjs`,
 * which pins each to a git ref; never re-derived here.
 */
export const HISTORICAL = [
  /SwiftUI 91 → 90/g,
  /Compose\s*\n?90 → 89/g,
  /Flutter 91 → 90/g,
  /full coverage 90 → 89/g,
  /platforms:\s*\n?90 → 89/g,
  /On all four catalogue-complete platforms: 90 → 89/g,
  /91\/90\/91 → 90\/89\/90/g,
  /91 · 90 · 91/g,
  /Coverage after: SwiftUI \*\*90\*\*, Compose \*\*89\*\*, Flutter \*\*90\*\*, all-four \*\*89\*\*/g,
  /Coverage before the correction[^\n]*/gi,
  /took it 90 → 89/g,
  /90 → 89/g,
];

/** Figures that were current once and must not appear as current state anywhere in the package. */
export const STALE = ["Angular 11", "Compose 89", "89 of 98", "89/98", "9 documented exceptions", "Three of a hundred"];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A figure matches only where no digit abuts it. Anchoring both ends matters for different reasons:
 * the leading guard is what stops "19 documented exceptions" matching "9 documented exceptions",
 * and the trailing guard stops "Angular 11" matching "Angular 110" — a coverage count this project
 * can genuinely reach.
 */
export const staleMatcher = (figure) => new RegExp(`(?<![0-9])${escape(figure)}(?![0-9])`);

/** Strip the historical sentences, which are evidence rather than current state. */
export const withoutHistorical = (body) => HISTORICAL.reduce((acc, h) => acc.replace(h, ""), body);

/**
 * The stale figures a body carries as current state, in `STALE` order. Empty means clean.
 * Takes the raw file text; strips the historical sentences itself, so no caller can forget to.
 */
export function findStaleFigures(body) {
  const current = withoutHistorical(body);
  return STALE.filter((figure) => staleMatcher(figure).test(current));
}
