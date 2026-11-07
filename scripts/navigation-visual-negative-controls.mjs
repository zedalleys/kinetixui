/**
 * navigation-visual-negative-controls.mjs — proof that the repaired focus-ring
 * assertion in `scripts/navigation-visual.mjs` can still fail.
 *
 * That assertion is
 *
 *     focused && ring >= 3 && hoverOutside < 1.5
 *
 * and on 2026-11-02 it failed on the dark app bar with `ring 9.76:1, hover
 * alone 1.56:1`. Both numbers were measured against the page background, which
 * reports whatever happens to sit in the 4px gutter beside the element rather
 * than what the state painted there. The app bar is the only destination that
 * does not sit directly on the page: its gutter catches one pixel of the
 * neighbouring link, so hover read 1.13:1 in light and 1.56:1 in dark while
 * drawing nothing at all — the rest and hover strips were pixel-identical.
 * Dark crossed a 1.5 bar it was never measuring.
 *
 * Both readings are now differential: the strip while the state is set, against
 * the same strip at rest. A correction like that is only trustworthy if the
 * corrected assertion still fails on a real defect, so each control below
 * reintroduces one and runs the REAL gate — not a copy of its arithmetic.
 *
 *   hover-outside             hover paints into the ring's gutter
 *   no-ring                   the focus ring is removed
 *   no-ring-bright-neighbour  the ring is removed AND a bright neighbour is put
 *                             in the gutter. This is the one that matters: the
 *                             old formula read that neighbour as a ring and
 *                             PASSED with no ring drawn. The differential one
 *                             fails. The repair is strictly stronger, not just
 *                             differently placed.
 *
 * Each control runs in one throwaway browser context as a single style tag.
 * Nothing is committed to the fixture.
 *
 * Usage: pnpm check:navigation-visual-negative-controls
 */
import { spawnSync } from "node:child_process";

const CONTROLS = [
  ["hover-outside", "hover paints into the ring's gutter", /focus ring clears 3:1 and out-draws hover/],
  ["no-ring", "the focus ring is removed", /focus ring clears 3:1 and out-draws hover/],
  [
    "no-ring-bright-neighbour",
    "the ring is removed and a bright neighbour sits in the gutter",
    /focus ring clears 3:1 and out-draws hover/,
  ],
];

let failures = 0;

// The gate must pass untouched first: a control that fails everything proves nothing.
process.stdout.write("baseline — the gate as it ships\n");
const baseline = spawnSync("node", ["scripts/navigation-visual.mjs"], { encoding: "utf8", env: process.env });
if (baseline.status === 0) {
  console.log("  ok    the unmutated gate passes\n");
} else {
  console.log("  FAIL  the unmutated gate does not pass — every control below is meaningless\n");
  failures++;
}

console.log("negative controls — each reintroduces a defect the gate must catch");
for (const [name, what, expected] of CONTROLS) {
  const run = spawnSync("node", ["scripts/navigation-visual.mjs"], {
    encoding: "utf8",
    env: { ...process.env, KX_NC: name },
  });
  const out = `${run.stdout}${run.stderr}`;
  const caught = run.status !== 0 && expected.test(out);
  const line = out
    .split("\n")
    .filter((l) => l.includes("app-bar focus ring") && l.includes("FAIL"))
    .map((l) => l.trim())[0];
  const legacy = out
    .split("\n")
    .filter((l) => l.includes("[nc]") && l.includes("dark"))
    .map((l) => l.trim())[0];
  if (caught) {
    console.log(`  gate fails, as it must   ${name} — ${what}`);
    if (line) console.log(`      ${line}`);
    if (legacy) console.log(`      ${legacy}`);
  } else {
    console.log(`  ** NOT CAUGHT **         ${name} — ${what}`);
    console.log(`      exit ${run.status}; the gate did not report this as a failure`);
    failures++;
  }
}

if (failures) {
  console.error(`\n✗ navigation-visual negative controls: ${failures} control(s) did not behave as required`);
  process.exit(1);
}
console.log(
  "\nnavigation-visual negative controls ok — the repaired assertion still fails on a hover that paints " +
    "outside the box, on a missing ring, and on the bright neighbour the old page-referenced formula accepted.",
);
