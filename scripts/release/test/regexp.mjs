/**
 * One complete regular-expression escape, for tests that build a matcher out of real data
 * (a package name, a version) and assert against real output.
 *
 * ## Why this exists
 *
 * Five call sites used to escape inline, and each one was wrong in the same two ways. CodeQL flagged
 * all five as `js/incomplete-sanitization` — "this does not escape backslash characters in the input":
 *
 *     pkg.name.replace(/[/@]/g, "\\$&")   // escapes `/` and `@`, which are not metacharacters at all
 *     version.replace(/\./g, "\\.")       // escapes `.` and nothing else
 *
 * So the escapes did work that was not needed while leaving every other metacharacter — and the
 * backslash above all — to be read as syntax. `0.23.3` happens to survive the second one, which is
 * exactly why an incomplete escape is worth removing before some future version or scoped name does
 * not: a silently mis-built matcher makes a test pass for the wrong reason.
 *
 * The character class below is the full set, backslash included, and matches the escapes already in
 * `apps/web/src/lib/marketing-claims.test.ts` and `analytics-surfaces.ts`. Node 24 has
 * `RegExp.escape`, but CI runs Node 22, so this stays hand-rolled — once, in one place.
 */

/** `s` as a literal, safe to interpolate into a `new RegExp(...)` pattern. */
export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
