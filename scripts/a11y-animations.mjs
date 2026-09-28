/**
 * a11y-animations.mjs — which animations the reduced-motion check owns.
 *
 * `scripts/a11y-browser.mjs` asserts that with `prefers-reduced-motion` set, no story leaves a fast
 * looping animation running. It collected that evidence with `document.getAnimations()`, which
 * returns every animation on the page — including the ones belonging to Storybook itself.
 *
 * Storybook's preview shell (`iframe.html`) ships its own keyframes and displays a spinner *over* the
 * rendering story while it prepares:
 *
 *   .sb-loader { animation: sb-rotate360 0.7s linear infinite; }
 *
 * 0.7s, infinite, running — the rule's exact shape. The check waits for `sb-show-main` and then a
 * fixed 300ms, so any story where that spinner outlives the wait failed the run, naming
 * `div:sb-rotate360`. Which story lost that race varied, so it read as a random flake on pull
 * requests that could not have animated anything (#235 changed three version fields), while main
 * stayed green.
 *
 * The fix is a scope correction, not a tolerance: the harness's own motion was never the subject.
 * KinetixUI's motion still is, and `caret-blink` (1.25s) and `typing-dot` (1.2s) are real infinite
 * loops in `packages/ui/tailwind.config.ts` that this check exists to police.
 *
 * The rule lives here rather than inside the `page.evaluate` callback so that it is testable without
 * a browser — the callback now only reports what it sees, and the judgement happens in Node.
 * `apps/web/src/lib/a11y-animations.test.ts` covers it, including that no KinetixUI animation name
 * is ignorable by this filter.
 */

/** Storybook prefixes every keyframe in its preview shell: `sb-rotate360`, `sb-glow`. */
export const HARNESS_ANIMATION_PREFIX = "sb-";

/** Faster than this, looping forever, is the thing reduced motion is supposed to stop. */
export const LOOPING_MOTION_LIMIT_MS = 3000;

/**
 * True only for animations Storybook owns.
 *
 * `animationName` is one name per `CSSAnimation` in every browser we run, but a comma-separated
 * value is cheap to be safe about: it is ignorable only if *every* name in it is the harness's, so a
 * component animation sharing a declaration with a harness one is still reported. Anything not a
 * non-empty string — a JS-driven `Animation` with no `animationName`, a transition, `"none"` — is
 * not ignorable, because the point is to narrow the scope to what we can prove is Storybook's.
 */
export function isHarnessAnimationName(name) {
  if (typeof name !== "string") return false;
  const names = name
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (names.length === 0) return false;
  return names.every((part) => part.startsWith(HARNESS_ANIMATION_PREFIX));
}

/**
 * The records that violate reduced motion, out of every animation found on the page.
 *
 * A record is `{ name, target, durationMs, loops, playState }` as collected in the browser. The
 * duration comparison is deliberately `Number(...) <` rather than a finite check: `getComputedTiming`
 * can report `"auto"`, which becomes `NaN` and compares false, exactly as it did before this moved
 * out of the page.
 */
export function reducedMotionViolations(records) {
  return records.filter(
    (record) =>
      record.loops === true &&
      record.playState === "running" &&
      Number(record.durationMs) < LOOPING_MOTION_LIMIT_MS &&
      !isHarnessAnimationName(record.name),
  );
}

/** The animations that were left out because Storybook owns them — for the run's summary line. */
export function harnessAnimations(records) {
  return records.filter((record) => isHarnessAnimationName(record.name));
}

/** One violation, readable enough to act on without opening the story. */
export function describeAnimation(record) {
  const duration = Number(record.durationMs);
  const ms = Number.isFinite(duration) ? `${Math.round(duration)}ms` : String(record.durationMs);
  return `${record.target || "?"}:${record.name || "animation"} (${ms}, ${record.playState})`;
}
