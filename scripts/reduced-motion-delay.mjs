/**
 * reduced-motion-delay.mjs — the package-wide reduced-motion floor, measured in a real browser.
 *
 *   node scripts/reduced-motion-delay.mjs
 *
 * ## The defect
 *
 * `packages/ui/tailwind.config.ts` ships the only library-wide reduced-motion guarantee this package
 * can have, because `packages/ui` ships no CSS of its own. It capped `animation-duration` and
 * `transition-duration` at 0.01ms and said nothing about the DELAYS — which inverted the setting:
 * a reader who asked for less motion waited LONGER for the information than one who had not.
 *
 * Measured on `25e0bdff`, under `prefers-reduced-motion: reduce`, on an element with
 * `transition-duration: 300ms; transition-delay: 700ms`:
 *
 *   computed transition-duration: 1e-05s   transition-delay: 0.7s
 *   at 50ms / 200ms / 400ms / 600ms: the old value.  at 900ms: the new one.
 *
 * Nothing interpolated — the duration cap worked — and then the element held the stale state for the
 * full delay and snapped. For an animation with a 700ms delay, `animationend` fired at 719ms and the
 * content was invisible until then.
 *
 * `#441` fixed one symptom of this locally, with `motion-reduce:transition-none` on the Tabs
 * indicator. That is a correct call-site decision and it stays. It is not a package-wide rule, and
 * anything else using a delay — a consumer's `delay-150`, a future component — kept the defect.
 *
 * ## Why this gate compiles the config instead of reading it
 *
 * A grep for `transition-delay` in `tailwind.config.ts` would pass on a floor that Tailwind never
 * emits, or that a later `!important` outranks. So this gate runs the real Tailwind CLI over the real
 * config, loads the emitted stylesheet in Chromium, and measures what the browser does with it. Three
 * properties, each a relation between two renderings in the same run:
 *
 *   normal      the declared timing survives: the delay is still the delay, the duration still the
 *               duration, and a sample taken inside the transition is between the two endpoints —
 *               i.e. it really interpolates, rather than the floor having leaked out of its media query
 *   reduce      duration capped AND delay zeroed, as computed style
 *   reduce      the end state is actually reached at once, sampled in the browser, which is the only
 *               claim a reader of the page would recognise
 *
 * ## Negative controls
 *
 * A gate for a hole must be shown failing in that hole. Each control re-measures against a stylesheet
 * mutated IN MEMORY — the compiled CSS string, never the config on disk — so there is nothing to
 * restore and the suite is safe over a dirty tree:
 *
 *   1. the floor as it shipped before this fix (no delay caps at all) — the measured defect returns
 *   2. the transition delay cap removed, the animation one kept
 *   3. the animation delay cap removed, the transition one kept
 *   4. the whole reduced-motion block removed — proves the normal-mode assertions are not what is
 *      carrying the reduce ones
 *
 * Control 0 is the opposite assertion: the unmutated stylesheet must PASS, or the four failures above
 * are just a gate that fails always.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
/** Inside node_modules so the generated config resolves `tailwindcss`, and so nothing lands in the repo. */
const work = join(root, "node_modules/.cache/kx-reduced-motion-delay");

/** The timings under test. Long enough that a delay is unmistakable in a sampled measurement. */
const DURATION_MS = 300;
const DELAY_MS = 700;

const FROM = "rgb(0, 0, 0)";
const TO = "rgb(255, 0, 0)";

/** Compile the real preset. Returns the emitted stylesheet. */
function compileFloor() {
  mkdirSync(work, { recursive: true });
  writeFileSync(
    join(work, "tailwind.config.cjs"),
    `const preset = require(${JSON.stringify(join(root, "packages/ui/tailwind.config.ts"))});\n` +
      `module.exports = { presets: [preset.default ?? preset], content: [__dirname + "/probe.html"] };\n`,
  );
  // The utilities have to appear in scanned content or Tailwind emits nothing for them. The floor is a
  // base layer and needs no content, but asserting on the utilities keeps the gate honest about what a
  // consumer actually writes.
  writeFileSync(
    join(work, "probe.html"),
    `<div class="transition-colors duration-700 delay-700 animate-in"></div>\n`,
  );
  writeFileSync(join(work, "in.css"), "@tailwind base;\n@tailwind utilities;\n");
  execFileSync(
    join(root, "packages/ui/node_modules/.bin/tailwindcss"),
    ["-c", join(work, "tailwind.config.cjs"), "-i", join(work, "in.css"), "-o", join(work, "out.css")],
    { cwd: join(root, "packages/ui"), stdio: "pipe" },
  );
  const css = readFileSync(join(work, "out.css"), "utf8");
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) {
    console.error(
      "check:reduced-motion-delay — the compiled preset emits no `prefers-reduced-motion` rule at all.\n" +
        "That is a bigger problem than the delays: every animation in every consumer app runs at full\n" +
        "motion. Refusing to report a pass.",
    );
    process.exit(1);
  }
  return css;
}

const page = (css) => `<!doctype html><meta charset="utf-8"><style>
#probe { width: 40px; height: 40px; background: ${FROM};
  transition-property: background-color;
  transition-duration: ${DURATION_MS}ms;
  transition-delay: ${DELAY_MS}ms; }
#probe.on { background: ${TO}; }
@keyframes kx-probe-fade { from { opacity: 0 } to { opacity: 1 } }
.kx-probe-anim { opacity: 0; animation: kx-probe-fade ${DURATION_MS}ms both; animation-delay: ${DELAY_MS}ms; }
${css}
</style><div id="probe"></div>`;

/**
 * One rendering: computed timing, sampled colour over time, and when `animationend` landed.
 *
 * Two things here are deliberate and were both learned from a wrong reading.
 *
 * The first sample waits for two animation frames before its timer, not just a timer. A sampled
 * `setTimeout(30)` on a page that is still doing its first style resolution over a ~40KB stylesheet
 * can fire inside that same long task, before any recalculation — which reported the pre-transition
 * colour and looked exactly like the defect this gate is for. The frames make the sample mean "after
 * the browser has had a chance to apply it", which is the question being asked.
 *
 * The animated element is created INSIDE the page, after the `animationend` listener is attached. With
 * the delay capped and the duration at 0.01ms the animation finishes in well under a millisecond, so an
 * element present in the markup has already ended before `evaluate` runs and the listener records
 * `never` — a missing event that is really a missing observer.
 */
async function measure(browser, css, reducedMotion) {
  const context = await browser.newContext({ reducedMotion });
  try {
    const p = await context.newPage();
    await p.setContent(page(css));
    // Let first paint and the initial style resolution finish before anything is timed.
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return await p.evaluate(
      async ({ delay, duration }) => {
        const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const probe = document.getElementById("probe");
        const cs = getComputedStyle(probe);
        const computed = { duration: cs.transitionDuration, delay: cs.transitionDelay };

        // The animation is measured on a fresh element so the listener exists before it can finish.
        const anim = document.createElement("div");
        anim.textContent = "x";
        let animationEndMs = null;
        const t0 = performance.now();
        anim.addEventListener("animationend", () => (animationEndMs = performance.now() - t0));
        document.body.append(anim);
        anim.className = "kx-probe-anim";
        const animCs = getComputedStyle(anim);
        const computedAnim = { duration: animCs.animationDuration, delay: animCs.animationDelay };

        probe.classList.add("on");
        const samples = [];
        // Sampled rather than event-driven: the question is what a reader SEES at a wall-clock moment,
        // and `transitionend` cannot answer that for the interval before the transition starts.
        await frames();
        samples.push({ at: "2 frames", colour: getComputedStyle(probe).backgroundColor });

        const marks = [30, Math.round(delay + duration / 2), delay + duration + 150];
        let elapsed = 0;
        for (const at of marks) {
          await new Promise((r) => setTimeout(r, Math.max(0, at - elapsed)));
          elapsed = at;
          samples.push({ at, colour: getComputedStyle(probe).backgroundColor });
        }
        await new Promise((r) => setTimeout(r, 200));
        return { computed, computedAnim, samples, animationEndMs, finalOpacity: getComputedStyle(anim).opacity };
      },
      { delay: DELAY_MS, duration: DURATION_MS },
    );
  } finally {
    await context.close();
  }
}

const ms = (v) => Math.round(Number.parseFloat(v) * 1000);
const between = (c) => c !== FROM && c !== TO;

/** Every assertion, as `{ ok, label, detail }`, over one normal and one reduce rendering. */
function assertions(normal, reduce) {
  const byFrames = reduce.samples[0];
  const at30 = normal.samples[1];
  const mid = normal.samples[2];
  return [
    {
      ok: ms(normal.computed.delay) === DELAY_MS && ms(normal.computed.duration) === DURATION_MS,
      label: "normal mode keeps the declared timing",
      detail: `delay ${normal.computed.delay}, duration ${normal.computed.duration} (want ${DELAY_MS}ms / ${DURATION_MS}ms)`,
    },
    {
      ok: normal.samples[0].colour === FROM && at30.colour === FROM,
      label: "normal mode still honours the delay (nothing has moved after 2 frames or at 30ms)",
      detail: `2 frames: ${normal.samples[0].colour}, 30ms: ${at30.colour}`,
    },
    {
      ok: between(mid.colour),
      label: "normal mode really interpolates (a sample mid-transition is between the endpoints)",
      detail: `at ${mid.at}ms: ${mid.colour}`,
    },
    {
      ok: ms(reduce.computed.duration) <= 1,
      label: "reduced motion caps the transition duration",
      detail: `transition-duration ${reduce.computed.duration}`,
    },
    {
      ok: ms(reduce.computed.delay) === 0,
      label: "reduced motion zeroes the transition delay",
      detail: `transition-delay ${reduce.computed.delay}`,
    },
    {
      ok: ms(reduce.computedAnim.delay) === 0,
      label: "reduced motion zeroes the animation delay",
      detail: `animation-delay ${reduce.computedAnim.delay}`,
    },
    {
      // "At once" has to be measured as a frame count, not a millisecond count: two frames is ~33ms,
      // two orders of magnitude inside the 700ms a reader would otherwise have waited.
      ok: byFrames.colour === TO,
      label: "reduced motion reaches the end state at once, as rendered (within 2 frames)",
      detail: `after ${byFrames.at}: ${byFrames.colour} (want ${TO}; the delay it skips is ${DELAY_MS}ms)`,
    },
    {
      // The property the floor's own comment protects: an overlay Radix unmounts on `animationend`
      // must still get that event. Zeroing the delay makes it sooner, never absent.
      ok: reduce.animationEndMs !== null && reduce.animationEndMs < DELAY_MS && reduce.finalOpacity === "1",
      label: "reduced motion still fires animationend, and lands on the end state",
      detail: `animationend at ${reduce.animationEndMs === null ? "never" : Math.round(reduce.animationEndMs) + "ms"}, final opacity ${reduce.finalOpacity}`,
    },
  ];
}

const css = compileFloor();

/** The floor exactly as it shipped before the delay caps — control 1's stylesheet. */
const stripTransitionDelay = (s) => s.replace(/\n\s*transition-delay: 0ms !important;/, "");
const stripAnimationDelay = (s) => s.replace(/\n\s*animation-delay: 0ms !important;/, "");
const stripWholeBlock = (s) => s.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n/, "");

const mutations = [
  { name: "the floor as it shipped before this fix (neither delay capped)", mutate: (s) => stripAnimationDelay(stripTransitionDelay(s)) },
  { name: "the transition-delay cap removed", mutate: stripTransitionDelay },
  { name: "the animation-delay cap removed", mutate: stripAnimationDelay },
  { name: "the whole reduced-motion block removed", mutate: stripWholeBlock },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] });
let failed = false;
try {
  const normal = await measure(browser, css, null);
  const reduce = await measure(browser, css, "reduce");
  const results = assertions(normal, reduce);
  for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.label} — ${r.detail}`);
  if (results.some((r) => !r.ok)) failed = true;

  console.log("\n  negative controls:");
  for (const { name, mutate } of mutations) {
    const mutated = mutate(css);
    if (mutated === css) {
      console.error(`    ✗ ${name} — the mutation changed nothing, so this control is testing the unmutated gate`);
      failed = true;
      continue;
    }
    const mReduce = await measure(browser, mutated, "reduce");
    const mNormal = await measure(browser, mutated, null);
    const broke = assertions(mNormal, mReduce).filter((r) => !r.ok);
    if (broke.length === 0) {
      console.error(`    ✗ ${name} — the gate still passed. It is not load-bearing for this.`);
      failed = true;
    } else {
      console.log(`    ✓ ${name} — caught: ${broke.map((b) => b.label).join("; ")}`);
    }
  }
} finally {
  await browser.close();
}

if (failed) {
  console.error("\ncheck:reduced-motion-delay — FAILED.");
  process.exit(1);
}
console.log(
  "\ncheck:reduced-motion-delay — the compiled preset caps both durations and both delays under " +
    "prefers-reduced-motion, the end state is reached at once as rendered, animationend still fires, and " +
    "normal mode keeps its declared timing and really interpolates. All 4 controls fire.",
);
