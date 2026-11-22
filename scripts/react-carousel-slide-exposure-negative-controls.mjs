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
  "no-inert": { pattern: /Tab never lands in a slide out of view|a slide out of view is inert/, minimum: 8 },
  "no-slide-names": { pattern: /every slide is named/, minimum: 4 },
  "no-region-name": { pattern: /the region is named|a consumer's own region name wins/, minimum: 5 },
  "no-announcement": { pattern: /announced|announces|is announced/, minimum: 6 },
  "vertical-ignores-block-keys": { pattern: /focus|announce/i, minimum: 2 },
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

const rowsOf = (out, failing) =>
  out
    .split("\n")
    .filter((l) => (failing ? /^\s+FAIL /.test(l) : /^\s+ok {2}/.test(l)))
    .map((l) => l.trim().replace(/^(FAIL|ok)\s+/, ""));

const results = [];
const ok = (n, d) => results.push([true, n, d]);
const bad = (n, d) => results.push([false, n, d]);

/* ── positive control: the gate must pass as shipped ──────────────────────── */
const clean = run(null);
if (clean.code === 0 && /all ok/.test(clean.out)) ok("positive: the gate passes on the component as shipped", `${rowsOf(clean.out, false).length} rows ok`);
else bad("positive: the gate passes on the component as shipped", `exit ${clean.code}\n${clean.out.slice(-900)}`);
const cleanPassing = new Set(rowsOf(clean.out, false));

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
  const named = failed.filter((l) => pattern.test(l));
  if (named.length >= minimum) ok(`negative: ${defect} — and it fails BECAUSE of that behaviour`, `${named.length} matching rows (≥ ${minimum}), e.g. ${JSON.stringify(named[0])}`);
  else bad(`negative: ${defect} — and it fails BECAUSE of that behaviour`, `${named.length} of ${failed.length} failing rows match ${pattern} (needed ${minimum}): ${JSON.stringify(failed.slice(0, 6))}`);

  // Specificity: no row that passes clean may fail here unless the pattern claims it.
  const collateral = failed.filter((l) => cleanPassing.has(l) && !pattern.test(l));
  if (!collateral.length) ok(`negative: ${defect} — and it breaks nothing else`, `${failed.length} failing rows, all accounted for`);
  else bad(`negative: ${defect} — and it breaks nothing else`, `unexplained failures: ${JSON.stringify(collateral.slice(0, 6))}`);
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
