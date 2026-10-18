/**
 * evidence-levels.mjs — the verification ladder (schema version 2), and the rules that place evidence on it.
 *
 * One module, so gen-verification.mjs decides every component and block level with the same function, and the
 * guardrail tests hold that function rather than a copy of it. Nothing here reads the repository.
 */

/**
 * The evidence ladder, weakest first, shared by components and blocks (schema version 2):
 *
 *   not-implemented   the manifest declares no implementation on this platform.
 *   source            the implementation exists; no CI build records it.
 *   build             a required CI step compiles it.
 *   headless          build, plus interaction AND accessibility asserted by tests CI executes, at least one of
 *                     the two only in a headless environment.
 *   runtime           build, plus interaction AND accessibility both OBSERVED: in a real browser for web, on a
 *                     simulator, emulator or device for native.
 *
 * A level is never borrowed: not from another platform, not from the components a block composes, not from a
 * skipped test or a suite CI does not run. `not-verified` is a reader-side rung for a declared part with no record.
 */
export const EVIDENCE_LEVELS = ["not-implemented", "source", "build", "headless", "runtime"];
/** Environments that observe the running part the way a person would. Nothing else earns Runtime verified. */
export const RUNTIME_ENVIRONMENTS = ["chromium"];
/** Environments that execute the assertions without rendering for a person. They earn Headless verified at most. */
export const HEADLESS_ENVIRONMENTS = ["jsdom", "xctest", "robolectric", "flutter_test"];
/** The two kinds a part must hold, both, to rise above Build verified. */
export const TIER_KINDS = ["interaction", "accessibility"];

/**
 * The level that evidence earns. Pure and exported, so the guardrail tests hold the generator to the rule rather
 * than to a copy of it. `interaction` and `accessibility` are the environments that backed each kind.
 *
 * @param {{ implemented: boolean, source?: boolean, build: boolean, interaction?: string[], accessibility?: string[] }} evidence
 * @returns {"not-implemented" | "source" | "build" | "headless" | "runtime"}
 */
export function levelFrom({ implemented, source = true, build, interaction = [], accessibility = [] }) {
  if (!implemented) return "not-implemented";
  if (!source || !build) return "source";
  const envs = { interaction, accessibility };
  if (!TIER_KINDS.every((k) => envs[k].length)) return "build";
  return TIER_KINDS.every((k) => envs[k].some((e) => RUNTIME_ENVIRONMENTS.includes(e))) ? "runtime" : "headless";
}

/**
 * Does a passage skip a test? A skipped test proves nothing, so the whole passage loses its credit. Per language,
 * the framework's own skip forms; `skip: true` alone is Dart's, so a browser suite returning `{ skip: true }` is
 * not read as one.
 */
const SKIPS = [
  { files: /\.(?:tsx?|mjs)$/, re: /\b(?:it|test|describe|suite)\.(?:skip|todo|fixme|skipIf|runIf)\b|\bx(?:it|describe|test)\s*\(/ },
  { files: /\.swift$/, re: /\bXCTSkip\w*|\.disabled\s*\(|\bfunc\s+DISABLED_/ },
  { files: /\.kt$/, re: /@Ignore\b|@Disabled\b|\bassume(?:True|False|That)\s*\(|\bAssume\./ },
  { files: /\.dart$/, re: /\bskip\s*:\s*(?:true|['"])/ },
];
/**
 * @param {string} file
 * @param {string} body
 * @returns {string | null}
 */
export function skipIn(file, body) {
  for (const { files, re } of SKIPS) {
    if (!files.test(file)) continue;
    const m = body.match(re);
    if (m) return m[0];
  }
  return null;
}
