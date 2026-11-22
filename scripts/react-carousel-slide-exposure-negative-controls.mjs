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
import { DEFECTS } from "./react-carousel-slide-exposure.mjs";

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
  "no-slide-names": { pattern: /every slide is named/, minimum: 4 },
  "no-region-name": { pattern: /the region is named|a consumer's own region name wins/, minimum: 5 },
  "no-announcement": { pattern: /announced|announces|is announced|speaks once, naming the landing/, minimum: 12 },
  // Named by the MOVEMENT, not by focus or the announcement. Swallowing the block keys stops the carousel
  // moving, and the row that says so is "control: the move actually advanced one position" — which a
  // `/focus|announce/i` pattern does not cover, so that pattern accepted a run in which the row proving
  // the keys work was among the unexplained failures.
  "vertical-ignores-block-keys": {
    // Including the reduced-motion section, which drives the VERTICAL fixture with ArrowDown — so
    // swallowing the block keys stops its move too, and the row saying so is this defect's, not collateral.
    pattern: /the move actually advanced|focus is not dropped when its slide leaves the view|is announced exactly ONCE|naming where the track ENDED|the move is still announced/,
    minimum: 7,
  },
  "announce-per-position": { pattern: /speaks once, naming the landing/, minimum: 2 },
};

function run(defect) {
  const env = { ...process.env };
  if (defect) env.KX_CAROUSEL_DEFECT = defect;
  else delete env.KX_CAROUSEL_DEFECT;
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
for (const defect of Object.keys(DEFECTS)) {
  const { pattern, minimum } = EXPECTED[defect] ?? {};
  if (!pattern) {
    bad(`negative: ${defect}`, "no expectation is recorded for this defect — add one to EXPECTED");
    continue;
  }
  const r = run(defect);

  if (!/^CONTROL {2}the defect/m.test(r.out)) {
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
}

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
