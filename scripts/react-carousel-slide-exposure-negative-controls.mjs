/**
 * react-carousel-slide-exposure-negative-controls.mjs — proves `react-carousel-slide-exposure.mjs` can
 * fail, once per defect it exists to catch.
 *
 *   pnpm check:react-carousel-slide-exposure-negative-controls
 *
 * The gate is driven once clean and once per entry in its `DEFECTS` map, each restored by a mutation in
 * the page. For every defect this asserts three things, and the third is the one that matters:
 *
 *   1. the gate EXITS NONZERO — a control that cannot redden the gate proves nothing;
 *   2. the failures NAME the behaviour, matched against a per-defect pattern, so "some row failed" is not
 *      accepted (a mis-built harness, a missing fixture or a stale selector would also fail some row);
 *   3. every OTHER row still passes — so each defect is shown to break the rows it breaks and no others,
 *      which is what tells us the gate's rows are independent rather than one failure cascading.
 *
 * Nothing is committed broken. Each mutation lives in one browser context inside the child process, and
 * the component on disk is never touched — verified at the end by re-running the gate clean.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFECTS, SOURCE_DEFECTS } from "./react-carousel-slide-exposure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = join(root, "scripts/react-carousel-slide-exposure.mjs");

/**
 * What each defect must break. The pattern is matched against the FAILING rows only, and `minimum` is how
 * many rows must fail — a defect that broke one row where it should break eight would otherwise pass.
 */
const EXPECTED = {
  // Every section that asserts inertness, not only the per-axis ones: the reduced-motion and touch
  // sections assert it too, and a pattern that did not name them left them as unexplained failures.
  "no-inert": {
    pattern: /Tab never lands in a slide out of view|a slide out of view is inert|slides out of view are still inert|the slides left behind are inert/,
    minimum: 10,
  },
  // Also the grouped section's cross-check, which reads a slide's own name to compare it with the phrase.
  "no-slide-names": { pattern: /every slide is named|agrees with that slide's own name/, minimum: 5 },
  "no-region-name": {
    pattern: /the region is named|a consumer's own region name wins|falls back to a name that is not|exposes all four as named landmarks|kept EXACTLY|names the region from its heading|distinguishable from an unnamed one|two UNNAMED carousels share one name/,
    // 8 is the MEASURED count, not a floor below it: with no region name at all the four naming rows
    // redden along with the three per-axis ones and the "a consumer's own name wins" row. A minimum
    // comfortably under the measurement would accept a mutation that broke fewer rows than it should.
    minimum: 8,
  },
  // The owner's rule is that the fallback must not displace a consumer's own name, so the control that
  // matters is the one that makes it displace it. It reddens the naming rows that compare the two, and
  // NOT "an unnamed carousel falls back to a name" — that row is true either way, which is precisely why
  // it cannot be the only naming assertion.
  "fallback-overrides-consumer-name": {
    pattern: /kept EXACTLY|a consumer's own region name wins|distinguishable from an unnamed one/,
    minimum: 3,
  },
  "no-announcement": {
    pattern: /announced|announces|is announced|speaks once, naming the landing|names the SLIDE, not the snap/,
    minimum: 15,
  },
  // Named by the MOVEMENT, not by focus or the announcement. Swallowing the block keys stops the carousel
  // moving on a vertical track, and the row that says so is "control: the move actually advanced one
  // position" — which a `/focus|announce/i` pattern does not cover, so that pattern accepted a run in
  // which the row proving the keys work sat among the unexplained failures. The reduced-motion section
  // drives the VERTICAL fixture too, so its rows belong to this defect rather than being collateral.
  "vertical-ignores-block-keys": {
    pattern: /the move actually advanced|focus is not dropped when its slide leaves the view|is announced exactly ONCE|naming where the track ENDED|the move is still announced|the block pair moves a vertical carousel/,
    minimum: 8,
  },
  // Collapsing the settle window also makes a gesture begun mid-phrase speak twice, so that row is this
  // defect's too rather than collateral. The `interrupted gesture` section's announcement row joined it
  // for the same reason and was reported as an unexplained failure until it was claimed here: the
  // specificity check is what found it, which is the behaviour that check exists for. 5 is the measured
  // count at 106 rows.
  "announce-per-position": {
    pattern: /speaks once, naming the landing|begun mid-phrase|the interrupted burst is announced once/,
    minimum: 5,
  },
};

/**
 * The SOURCE defects, driven through `KX_CAROUSEL_SOURCE_DEFECT` instead. Same three assertions; the only
 * difference is where the mutation lives.
 *
 * This one is the owner's rapid-input requirement, and it is exactly 2 rows wide — the mid-phrase row in
 * each of the two intent sections, and nothing else. That narrowness is the point: `announce-per-position`
 * reddens that row too, among three others, so the two controls are distinguishable by WHICH rows they
 * break, and the race cannot be mistaken for a timer-length defect. Measured output of the failing rows,
 * which is the original defect in one line:
 *
 *   ["Slide 2 of 5"], the engine landed on "Slide 3 of 5"
 *
 * — the control's position announced, the drag's own landing silent.
 */
const EXPECTED_SOURCE = {
  "stale-intent-wins": { pattern: /begun mid-phrase/, minimum: 2 },

  /**
   * `focus-follows-once` makes the transfer fire once and then stand down. Its pattern is anchored to the
   * three rows of the `interrupted gesture` section by their full identity rather than by a word, because
   * the section's own announcement row ends "...at the slide it settled on" and a pattern of
   * `/settled on/` would have claimed a row that still PASSES — which would have let a future mutation
   * breaking that row be counted as expected.
   *
   * MEASURED, not a floor: 3 of 106 rows fail, and the reader's place is gone in the detail —
   *
   *   1 sample(s) outside the carousel: … → DIV(slide 2)@[1] → DIV(slide 2)@[1] → BODY@[4]
   *
   * The deliberate narrowness is the point. One transfer still happens, so `focus is not dropped when its
   * slide leaves the view` stays green in all four axis sections and in `reduced motion`: this control
   * therefore proves the INTERRUPTION case specifically, not focus-following in general.
   */
  "focus-follows-once": {
    pattern: /^interrupted gesture ▸ (focus is never dropped|when the track settles|and it is the slide the engine settled on)/,
    minimum: 3,
  },
};

function run(defect, source) {
  const env = { ...process.env };
  delete env.KX_CAROUSEL_DEFECT;
  delete env.KX_CAROUSEL_SOURCE_DEFECT;
  if (source) env.KX_CAROUSEL_SOURCE_DEFECT = defect;
  else if (defect) env.KX_CAROUSEL_DEFECT = defect;
  try {
    return { code: 0, out: execFileSync("node", [GATE], { cwd: root, env, encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * Every row of a gate run, as a stable IDENTITY and its detail, kept apart.
 *
 * The identity is the section heading plus the assertion's name — the things that do not change when the
 * assertion's outcome does. The detail is everything after it, and the detail is exactly what differs
 * between a row passing and the same row failing: "in view 1" becomes "in view 0". Comparing whole lines
 * therefore finds almost no collateral failure, because a collaterally-failing row never looks like its
 * own passing line. That is how this file's specificity check came to assert nothing, and the fix is to
 * compare what identifies a row rather than what reports it.
 *
 * The split is exact rather than heuristic: the gate pads each name to a common width and then prints two
 * spaces and the detail, so the first run of two or more spaces ends the name. A row that does not parse
 * is returned with a null name and made to fail loudly below rather than silently dropped.
 */
function rowsOf(out, failing) {
  const want = failing ? "FAIL" : "ok";
  const rows = [];
  let section = "?";
  for (const line of out.split("\n")) {
    if (/^\S/.test(line) && line.trim() && !/^(CONTROL|react-carousel)/.test(line)) {
      section = line.trim();
      continue;
    }
    // `FAIL` is followed by ONE space and `ok` by three — the gate pads the status token, not the gap. A
    // parser that demanded two matched the passing rows and none of the failing ones, so every "it fails
    // BECAUSE of that behaviour" check compared against an empty list and the row that caught it was the
    // one asking whether the other assertions had still RUN.
    const m = /^\s+(FAIL|ok)\s+(.*)$/.exec(line);
    if (!m || m[1] !== want) continue;
    const [name, ...rest] = m[2].split(/ {2,}/);
    rows.push({ id: `${section} \u25b8 ${name.trim()}`, name: name.trim() || null, detail: rest.join("  ").trim() });
  }
  return rows;
}

const results = [];
const ok = (n, d) => results.push([true, n, d]);
const bad = (n, d) => results.push([false, n, d]);

/* ── positive control: the gate must pass as shipped ──────────────────────── */
const clean = run(null);
if (clean.code === 0 && /all ok/.test(clean.out)) ok("positive: the gate passes on the component as shipped", `${rowsOf(clean.out, false).length} rows ok`);
else bad("positive: the gate passes on the component as shipped", `exit ${clean.code}\n${clean.out.slice(-900)}`);

const cleanRows = rowsOf(clean.out, false);
const cleanPassing = new Set(cleanRows.map((r) => r.id));
// Every row must parse, or the two checks below are comparing nothing. Fail closed.
const unparsed = cleanRows.filter((r) => !r.name);
if (!unparsed.length) ok("every row of a clean run parses into a stable identity", `${cleanPassing.size} identities`);
else bad("every row of a clean run parses into a stable identity", `${unparsed.length} rows did not parse: ${JSON.stringify(unparsed.slice(0, 3))}`);

/* ── one negative control per defect ──────────────────────────────────────── */
/**
 * @param defects   the defect names to drive
 * @param expected  the per-defect pattern and measured minimum
 * @param source    true to drive them as SOURCE defects (`KX_CAROUSEL_SOURCE_DEFECT`)
 */
function drive(defects, expected, source) {
for (const defect of defects) {
  const { pattern, minimum } = expected[defect] ?? {};
  if (!pattern) {
    bad(`negative: ${defect}`, "no expectation is recorded for this defect — add one to EXPECTED");
    continue;
  }
  const r = run(defect, source);

  // The banner is the only proof the mutation was carried at all. For a source defect the harness ALSO
  // prints the line naming what it compiled in, and both are required: the gate's banner says the run
  // knew it was a control, the harness's says the rewrite reached the bundle. A control whose mutation
  // silently did nothing would otherwise report a clean pass as evidence.
  const banner = source ? /^CONTROL {2}the SOURCE defect/m : /^CONTROL {2}the defect/m;
  if (!banner.test(r.out) || (source && !new RegExp(`SOURCE DEFECT "${defect}" is compiled`).test(r.out))) {
    bad(`negative: ${defect} — the mutation was applied`, "the gate printed no CONTROL banner, so the run may not have carried the defect at all");
    continue;
  }
  if (r.code !== 0) ok(`negative: ${defect} — the gate fails`, `exit ${r.code}`);
  else {
    bad(`negative: ${defect} — the gate fails`, "the gate PASSED with the defect restored");
    continue;
  }

  const failed = rowsOf(r.out, true);
  const passed = rowsOf(r.out, false);
  const named = failed.filter((row) => pattern.test(row.id));
  if (named.length >= minimum) ok(`negative: ${defect} — and it fails BECAUSE of that behaviour`, `${named.length} matching rows (≥ ${minimum}), e.g. ${JSON.stringify(named[0].id)}`);
  else bad(`negative: ${defect} — and it fails BECAUSE of that behaviour`, `${named.length} of ${failed.length} failing rows match ${pattern} (needed ${minimum}): ${JSON.stringify(failed.slice(0, 6).map((x) => x.id))}`);

  // Specificity, by IDENTITY: no row that passes clean may fail here unless the pattern claims it.
  const collateral = failed.filter((row) => cleanPassing.has(row.id) && !pattern.test(row.id));
  if (!collateral.length) ok(`negative: ${defect} — and it breaks nothing else`, `${failed.length} failing rows, all accounted for`);
  else bad(`negative: ${defect} — and it breaks nothing else`, `unexplained failures: ${JSON.stringify(collateral.slice(0, 6).map((x) => x.id))}`);

  // ...and no row may simply VANISH. A mutation that makes a section throw part way through removes the
  // assertions after it, and an assertion that did not run is not an assertion that passed — the gate
  // would report fewer rows and still be counted as having covered them.
  const ran = new Set([...failed, ...passed].map((row) => row.id));
  const vanished = [...cleanPassing].filter((id) => !ran.has(id));
  if (!vanished.length) ok(`negative: ${defect} — and every other assertion still RAN`, `${ran.size} of ${cleanPassing.size} identities present`);
  else bad(`negative: ${defect} — and every other assertion still RAN`, `${vanished.length} assertions disappeared: ${JSON.stringify(vanished.slice(0, 6))}`);

  // A SOURCE defect rewrites the component, so this is asserted PER RUN rather than only once at the end:
  // the mutation is supposed to live in memory, and the way to show it did is that the tracked file has
  // not changed by the time the control finishes. `git status --porcelain` on that one path is the
  // cheapest statement of it that a gitignored build output cannot hide.
  if (source) {
    const file = SOURCE_DEFECTS[defect].file;
    const dirty = execFileSync("git", ["status", "--porcelain", "--", file], { cwd: root, encoding: "utf8" }).trim();
    if (!dirty) ok(`negative: ${defect} — and the file it rewrites is UNTOUCHED on disk`, `${file} clean`);
    else bad(`negative: ${defect} — and the file it rewrites is UNTOUCHED on disk`, `the control contaminated the working tree: ${JSON.stringify(dirty)}`);
  }
}
}

drive(Object.keys(DEFECTS), EXPECTED, false);
drive(Object.keys(SOURCE_DEFECTS), EXPECTED_SOURCE, true);

/* ── the component on disk is untouched ───────────────────────────────────── */
const after = run(null);
if (after.code === 0 && /all ok/.test(after.out)) ok("the component is unchanged: the gate still passes clean afterwards", "exit 0");
else bad("the component is unchanged: the gate still passes clean afterwards", `exit ${after.code}\n${after.out.slice(-600)}`);

const w = Math.max(...results.map(([, n]) => n.length));
for (const [pass, n, d] of results) console.log(`CTRL ${pass ? "ok  " : "FAIL"} ${n.padEnd(w)}  ${d}`);
const failed = results.filter(([p]) => !p).length;
console.log(
  failed
    ? `\nreact-carousel-slide-exposure-negative-controls: ${failed} of ${results.length} controls failed.`
    : `\nreact-carousel-slide-exposure-negative-controls: ${results.length} controls — the gate passes what it should and fails what it should.`,
);
process.exit(failed ? 1 : 0);
