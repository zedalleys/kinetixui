/**
 * cursor-glow-negative-controls.mjs — proof that the site-wide glow's gate can
 * actually fail.
 *
 * `scripts/cursor-glow-browser.mjs` makes three claims that only exist as
 * rendered pixels: the glow follows the viewport, an opaque surface occludes
 * it, and at full strength behind real text it takes no pair under AA. None of
 * those can be read off a stylesheet, and none of the repository's other gates
 * moves a mouse at all, so a glow that fails any of them would ship green. A
 * claim that has never been made to fail is not evidence.
 *
 * Each control reintroduces one failure and runs the REAL gate, not a copy of
 * its reasoning:
 *
 *   tint-too-strong     `--brand` at 0.16 — the alpha costed on the parked
 *                       `c097c48`. Measured at this head, it takes the
 *                       homepage's "Beta — every package is 0.x, MIT" from
 *                       4.84:1 to 4.30:1 and "Example — adds one component."
 *                       from 5.01:1 to 4.44:1, both under AA. The shipped 0.045
 *                       holds them at 4.58 and 4.71.
 *   glow-over-content   the layer lifted above the content wrapper, which is
 *                       the whole reason the tint is affordable: it is what a
 *                       full-screen brightening normally is, and it puts the
 *                       wash between the reader and every opaque surface.
 *   glow-not-fixed      `position: absolute`, so the layer scrolls with the
 *                       page and stops being where the cursor is — the same
 *                       class of defect as the hero-bound spotlight this
 *                       replaced.
 *
 * Nothing is committed, and the stylesheet in the repository is never modified:
 * each control is one style tag in a throwaway browser context, injected
 * through the seam in the gate.
 *
 * Requires the site on --base (default http://127.0.0.1:3000), the same server
 * `check:cursor-glow` itself needs.
 *
 * Usage: pnpm check:cursor-glow-negative-controls
 */
import { spawnSync } from "node:child_process";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null) ?? "http://127.0.0.1:3000";
const GATE = ["scripts/cursor-glow-browser.mjs", "--base", base];

const CONTROLS = [
  ["tint-too-strong", "the tint Codex costed on c097c48, which takes real homepage text under AA", /takes \d+ text pair\(s\) under AA/],
  ["glow-over-content", "the layer lifted above the content wrapper", /tinted an opaque surface|not painted before the content wrapper|sits at z-index/],
  ["glow-not-fixed", "the layer scrolls with the page instead of staying on the viewport", /moved with the page instead of the viewport|the glow is absolute/],
];

let failures = 0;

process.stdout.write("baseline — the gate as it ships\n");
const baseline = spawnSync("node", GATE, { encoding: "utf8", env: process.env });
if (baseline.status === 0) {
  console.log("  ok    the unmutated gate passes\n");
} else {
  console.log("  FAIL  the unmutated gate does not pass — every control below is meaningless");
  console.log(`        exit ${baseline.status}`);
  const why = `${baseline.stdout}${baseline.stderr}`
    .split("\n")
    .filter((l) => /AssertionError|Error:/.test(l))
    .map((l) => l.trim())[0];
  if (why) console.log(`        ${why}`);
  console.log("");
  failures++;
}

console.log("negative controls — each breaks one of the glow's three rendered claims");
for (const [name, what, expected] of CONTROLS) {
  const run = spawnSync("node", GATE, { encoding: "utf8", env: { ...process.env, KX_GLOW_NC: name } });
  const out = `${run.stdout}${run.stderr}`;
  const caught = run.status !== 0 && expected.test(out);
  const line = out
    .split("\n")
    .filter((l) => /AssertionError/.test(l))
    .map((l) => l.trim())[0];
  if (caught) {
    console.log(`  gate fails, as it must   ${name} — ${what}`);
    if (line) console.log(`      ${line.slice(0, 180)}`);
  } else {
    console.log(`  ** NOT CAUGHT **         ${name} — ${what}`);
    console.log(`      exit ${run.status}; the gate did not report this as a failure`);
    failures++;
  }
}

if (failures) {
  console.error(`\n✗ cursor-glow negative controls: ${failures} control(s) did not behave as required`);
  process.exit(1);
}
console.log(
  "\ncursor-glow negative controls ok — the gate fails when the tint is raised to a level that takes real " +
    "text under AA, when the layer is lifted over the content, and when it stops following the viewport.",
);
