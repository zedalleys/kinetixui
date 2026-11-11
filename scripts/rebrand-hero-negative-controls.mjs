/**
 * rebrand-hero-negative-controls.mjs — proof that the hero's motion lifecycle
 * assertions can actually fail.
 *
 * Codex found, on 2026-11-05 at `0e85529`, that `data-running=false` did not
 * stop the hero's motion. `running` gated the rAF pulse loop only; the breath
 * (`kx-mesh-breathe`) and the per-facet shimmer (`kx-mesh-shimmer`) were
 * unconditional `infinite` CSS animations that no stylesheet gated, so the
 * artwork kept moving after the component reported it had stopped, and kept
 * moving offscreen. Measured in Chromium at that head, with the announced pause
 * engaged: the body transform went 1.00073 -> 1.00474 -> 1.00978 and a facet's
 * opacity 0.1777 -> 0.2123 -> 0.2277 across ~5s.
 *
 * `check:rebrand-hero` was green throughout, because its only suspension
 * evidence was `pulseAt()` — the pulses do stop, being the JavaScript half. A
 * gate blind to the defect it is supposed to cover is the thing worth guarding
 * against here, so the repair is only trustworthy if the new assertions fail
 * when the defect returns. Each control below reintroduces it and runs the REAL
 * gate, not a copy of its reasoning.
 *
 *   ignores-data-running  nothing gates the CSS layers — the exact pre-repair
 *                         behaviour, restored in one declaration
 *   body-escapes          only the breath escapes the lifecycle
 *   facets-escapes        only the per-facet shimmer escapes it
 *
 * The hero became decoration on 2026-11-06 (owner decision): the drag rotation,
 * the arrow keys, Home and the tab stop are gone, and the gate now asserts they
 * are. An absence is the easiest claim in the world to assert wrongly, because
 * a check pointed at the wrong element passes exactly as a correct one does, so
 * three more controls put each removed control back:
 *
 *   tab-stop-returns      the illustration takes focus again
 *   drag-returns          a drag on a facet turns the network again
 *   keys-return           the arrow keys turn it again
 *   pause-returns         Space and Escape stop the hero again
 *
 * `pause-returns` was added on 2026-11-07, when the first-view fix made the
 * polygon short enough that Space's page-scroll could carry it out of the
 * viewport. `data-running` is the visibility switch as well as the motion one,
 * so the pause assertion had been reading whichever of the two the scroll
 * happened to leave behind — it failed about one run in two with no defect
 * present. The gate now returns to the top before reading it, and this control
 * is what shows the assertion still catches a pause that is really there.
 *
 * `body-escapes` and `facets-escapes` are not redundant. The gate compares the
 * body transform and a facet's opacity as one object, so a single blanket control would pass even if
 * the gate observed only one of the two layers. Running each layer on its own
 * proves both are genuinely measured.
 *
 * Each control is one style tag — or, for the three that put a listener or an
 * attribute back, one injected script — in a throwaway browser context, through
 * the seam in `rebrand-browser.mjs`. Nothing is committed, and neither the
 * stylesheet nor the component in the repository is ever modified.
 *
 * Requires the production site on REBRAND_BASE (default http://127.0.0.1:3104),
 * the same server `check:rebrand-hero` itself needs.
 *
 * Usage: pnpm check:rebrand-hero-negative-controls
 */
import { spawnSync } from "node:child_process";

const GATE = ["scripts/rebrand-browser.mjs"];

const CONTROLS = [
  [
    "ignores-data-running",
    "no stylesheet gates the CSS layers (the pre-repair defect)",
    /kept animating offscreen|kept animating after the preference changed/,
  ],
  ["body-escapes", "only the mesh breath escapes the lifecycle", /kept animating offscreen|kept animating after the preference changed/],
  [
    "facets-escapes",
    "only the per-facet shimmer escapes the lifecycle",
    /kept animating offscreen|kept animating after the preference changed/,
  ],
  // Reduced motion. Each of these keeps one layer animating for a reader who asked for none.
  // Run these only in the `narrow` case (320px, reduced motion). Earlier desktop
  // interactions and live preference checks can fail before the intended assertion.
  // The unmutated baseline still runs the full matrix.
  ["reduced-body-animates", "the mesh breath survives prefers-reduced-motion", /the breath survived reduced motion/, { KX_HERO_CASES: "narrow" }],
  ["reduced-facets-animate", "the facet shimmer survives prefers-reduced-motion", /a facet animation survived reduced motion/, { KX_HERO_CASES: "narrow" }],
  ["reduced-links-animate", "the wireframe draw-on survives prefers-reduced-motion", /the intro draw-on survived reduced motion/, { KX_HERO_CASES: "narrow" }],
  // The hero became decoration on 2026-11-06. What the gate asserts now is
  // ABSENCE — no tab stop, no drag, no keys — and an absence assertion passes
  // just as happily when it is looking in the wrong place as when the feature
  // is really gone. Each of these puts one removed control back.
  ["tab-stop-returns", "the illustration takes focus again", /Tab reached the hero|holds a focus stop/],
  ["drag-returns", "a drag on a facet turns the network again", /a 180px drag moved the artwork/],
  ["keys-return", "the arrow keys turn the network again", /the arrow keys moved the artwork/],
  ["pause-returns", "Space and Escape stop the hero again", /the pause control was supposed to be gone/],
];

let failures = 0;

// The gate must pass untouched first: a control that fails everything proves nothing.
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

console.log("negative controls — the motion lifecycle, then each removed control put back");
for (const [name, what, expected, extraEnv = {}] of CONTROLS) {
  const run = spawnSync("node", GATE, { encoding: "utf8", env: { ...process.env, KX_HERO_NC: name, ...extraEnv } });
  const out = `${run.stdout}${run.stderr}`;
  const caught = run.status !== 0 && expected.test(out);
  const line = out
    .split("\n")
    .filter((l) => /kept animating|kept travelling|survived reduced motion|moved the artwork|Tab reached the hero|holds a focus stop/.test(l))
    .map((l) => l.trim())[0];
  if (caught) {
    console.log(`  gate fails, as it must   ${name} — ${what}`);
    if (line) console.log(`      ${line}`);
  } else {
    console.log(`  ** NOT CAUGHT **         ${name} — ${what}`);
    console.log(`      exit ${run.status}; the gate did not report this as a failure`);
    const diagnostic = out.split("\n").find(line => /AssertionError|TimeoutError|Error:/.test(line));
    if (diagnostic) console.log(`      ${diagnostic.trim()}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n✗ rebrand-hero negative controls: ${failures} control(s) did not behave as required`);
  process.exit(1);
}
console.log(
  "\nrebrand-hero negative controls ok — the lifecycle assertions fail when the CSS layers are let " +
    "loose from data-running, whether both escape or only the breath or only the facet shimmer " +
    "(the pulse-only check the gate used to rely on would have passed all three), and the " +
    "decoration assertions fail when the tab stop, the drag rotation or the arrow keys come back.",
);
