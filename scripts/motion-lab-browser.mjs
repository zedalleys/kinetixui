/**
 * motion-lab-browser.mjs — what /labs/motion's motion is measured to do.
 *
 *   node scripts/motion-lab-browser.mjs --base http://127.0.0.1:3000
 *
 * ── What this gate is for ──────────────────────────────────────────────────
 *
 * Reading a stylesheet proves a transition is declared. It does not prove an indicator travels, that it
 * continues from where it is drawn when a reader changes their mind halfway, that a reduced-motion reader
 * reaches the END state rather than a stranded midpoint, or that the geometry mirrors rather than
 * travelling the wrong way under RTL. Every claim below is a rendered measurement in Chromium.
 *
 * Two rules this file holds itself to, because the repository has been bitten by both:
 *
 *   POPULATION FIRST.  A locator matching nothing resolves `[]`, and `[].every(...)` is `true`, so a
 *                      regression that removes the elements a check reads would turn that check green.
 *                      `countedAll` fails when the population is empty, every time, before any property
 *                      is read.
 *   NAME THE VALUE.    A check asserts the measured number, not that a class or a variable is present.
 *                      `data-kx-lab-travel="spring"` says what was asked for; only sampled positions say
 *                      what happened.
 *
 * Sampling. Positions are read inside `requestAnimationFrame`, from `getBoundingClientRect()` on the
 * indicator, into an array the page keeps — never one read per round trip, which at ~10ms per CDP call
 * would alias a 300ms travel down to thirty points taken at unknown times. The samples carry
 * `performance.now()` so speed is measured rather than assumed from the frame index.
 */
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/$/, "");
const ROUTE = `${base}/labs/motion`;
/** Sub-pixel: a continuity break a reader cannot see is not a continuity break. Chromium reports fractional layout. */
const EPSILON = 1.5;
/** `--duration-base` is 300ms. A travel is given a generous ceiling so a slow machine cannot fail a correct run. */
const TRAVEL_CEILING_MS = 1400;

/**
 * `--only 2,5` runs just those sections. The negative-control runner uses it: a control that mutates the RTL
 * mirror has nothing to say about the slider's bubble, and running all 83 checks per control would make the
 * control suite too slow to run, which is the same as not having one. With no `--only`, every section runs.
 */
const only = new Set((process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "").split(",").map((s) => s.trim()).filter(Boolean));
const wants = (n) => only.size === 0 || only.has(String(n));

const failures = [];
const report = [];
const notes = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(56)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};
const note = (label, detail) => {
  report.push(`  --   ${label.padEnd(56)} ${detail}`);
  notes.push(`${label}: ${detail}`);
};

/** Fails when the population is empty, so a check can never pass over nothing. */
const countedAll = (label, values, predicate, describe) => {
  if (!Array.isArray(values) || values.length === 0) {
    check(false, label, "no elements matched — the check read an empty population");
    return false;
  }
  const bad = values.filter((v) => !predicate(v));
  check(bad.length === 0, label, bad.length === 0 ? describe(values) : `${bad.length}/${values.length} failed: ${JSON.stringify(bad.slice(0, 3))}`);
  return bad.length === 0;
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

/** The page's own sampler, installed once per page. Kept in the page so a travel is sampled every frame. */
const SAMPLER = `
window.__kxLab = {
  samples: [],
  raf: 0,
  start(selector) {
    const el = document.querySelector(selector);
    this.samples = [];
    if (!el) return false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const track = el.closest('[data-kx-lab-measured], [class*="kx-lab-track"]');
      this.samples.push({
        t: performance.now(),
        left: r.left,
        right: r.right,
        width: r.width,
        inlineStart: parseFloat(getComputedStyle(el).getPropertyValue('--kx-lab-start')) || 0,
        opacity: parseFloat(getComputedStyle(el).opacity),
        state: track ? track.getAttribute('data-kx-lab-state') : null,
        chosen: document.querySelectorAll('[data-kx-lab-travel] > [data-state="on"]').length,
      });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    return true;
  },
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; return this.samples; },
};
`;

/** One page per condition: an emulated preference or direction must not leak between checks. */
async function openLab({ reducedMotion = "no-preference", colorScheme = "light", forcedColors = "none", width = 1280, height = 900 } = {}) {
  const context = await browser.newContext({ reducedMotion, colorScheme, forcedColors, viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  const ignored = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // A failed subresource fetch is logged as a console error, and the host this container egresses through
    // rate-limits: a run failed on `403 (rate limit exceeded)` for a resource the lab does not use and does
    // not depend on. Counting that as a page error makes the check report the network rather than the motion.
    // Uncaught exceptions still come through `pageerror`, which is not filtered, and anything filtered here
    // is kept and reported so a silent screen cannot hide a real failure.
    if (/Failed to load resource|net::ERR_|ERR_BLOCKED_BY|status of (4|5)\d\d/.test(m.text())) {
      ignored.push(m.text());
      return;
    }
    errors.push(m.text());
  });
  await page.goto(ROUTE, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: SAMPLER });
  // The engine writes this attribute only once it has measured the track: without it nothing below is meaningful.
  await page.waitForSelector('.kx-lab-seg[data-kx-lab-measured]', { timeout: 15000 });
  return { context, page, errors, ignored };
}

const SEG = ".kx-lab-seg";
const SEG_BAR = `${SEG} .kx-lab-bar`;
const seg = (page, label) => page.locator(`${SEG} [data-state]`, { hasText: new RegExp(`^${label}$`) });

/**
 * Chooses a variant through the lab's own picker, which is itself a shipped SegmentedControl, and waits for
 * the engine to have ADOPTED it rather than for the click to have landed. The label-to-travel map is explicit
 * so that renaming a label in the lab's copy cannot silently point this gate at a different variant.
 */
const VARIANT_BY_LABEL = { Glide: "glide", Phased: "phased", Spring: "spring", Fade: "fade", Instant: "none" };
async function chooseVariant(page, label) {
  const travel = VARIANT_BY_LABEL[label];
  if (!travel) throw new Error(`motion-lab-browser: no variant is called "${label}" — the gate and the lab's labels have diverged.`);
  await page.locator("#lab-travel [data-state]", { hasText: new RegExp(`^${label}$`) }).click();
  await page.waitForFunction((t) => document.querySelector(".kx-lab-seg")?.getAttribute("data-kx-lab-travel") === t, travel, { timeout: 5000 });
}

async function sampleSelection(page, { from, to, interruptTo = null, interruptAfterMs = 120 }) {
  await seg(page, from).click();
  await page.waitForFunction(() => document.querySelector(".kx-lab-seg")?.getAttribute("data-kx-lab-state") === "resting", null, { timeout: TRAVEL_CEILING_MS });
  await page.evaluate((s) => window.__kxLab.start(s), SEG_BAR);
  const mark = await page.evaluate(() => performance.now());
  await seg(page, to).click();
  let interruptAt = null;
  if (interruptTo) {
    await page.waitForTimeout(interruptAfterMs);
    interruptAt = await page.evaluate(() => performance.now());
    await seg(page, interruptTo).click();
  }
  await page.waitForTimeout(TRAVEL_CEILING_MS);
  const samples = await page.evaluate(() => window.__kxLab.stop());
  return { samples: samples.filter((s) => s.t >= mark), interruptAt };
}

const distinct = (xs) => [...new Set(xs.map((x) => Math.round(x * 10) / 10))];
const speedAround = (samples, at, span = 3, before = true) => {
  const sorted = samples.filter((s) => (before ? s.t <= at : s.t > at)).slice(before ? -span - 1 : 0, before ? undefined : span + 1);
  if (sorted.length < 2) return 0;
  const a = sorted[0];
  const b = sorted[sorted.length - 1];
  return Math.abs(b.left - a.left) / Math.max(1, b.t - a.t);
};

// ── 1. Forward and reverse travel actually render intermediate positions ───────────────────────────────
if (wants("1")) {
  const { context, page, errors, ignored } = await openLab();
  await chooseVariant(page, "Glide");
  const forward = await sampleSelection(page, { from: "Day", to: "Quarter" });
  const positions = forward.samples.map((s) => s.left);
  const values = distinct(positions);
  check(values.length >= 5, "glide forward renders intermediate positions", `${values.length} distinct left offsets over ${forward.samples.length} frames`);
  const target = await page.locator(`${SEG} [data-state="on"]`).first().evaluate((el) => el.getBoundingClientRect().left);
  const settled = positions[positions.length - 1];
  check(Math.abs(settled - target) <= EPSILON, "glide forward settles on the chosen segment", `bar ${settled.toFixed(1)} vs segment ${target.toFixed(1)}`);
  const monotonic = positions.every((p, i) => i === 0 || p >= positions[i - 1] - EPSILON);
  check(monotonic, "glide forward never reverses direction", `${positions.length} frames, one direction`);

  const back = await sampleSelection(page, { from: "Quarter", to: "Day" });
  const backValues = distinct(back.samples.map((s) => s.left));
  check(backValues.length >= 5, "glide reverse renders intermediate positions", `${backValues.length} distinct left offsets`);
  const backMonotonic = back.samples.map((s) => s.left).every((p, i, a) => i === 0 || p <= a[i - 1] + EPSILON);
  check(backMonotonic, "glide reverse never reverses direction", `${back.samples.length} frames, one direction`);

  // Exactly one segment chosen at every sampled frame, travel included.
  countedAll("exactly one segment is chosen during travel", forward.samples.map((s) => s.chosen), (n) => n === 1, (xs) => `${xs.length} frames, all with 1 chosen`);
  check(errors.length === 0, "no page errors during travel", errors.length ? errors[0] : "none");
  if (ignored.length) note("subresource errors seen and not counted", `${ignored.length}: ${ignored[0].slice(0, 110)}`);
  await context.close();
}

// ── 2. Interruption and retargeting: continue from the rendered position ───────────────────────────────
if (wants("2")) for (const [label, variant] of [["glide", "Glide"], ["phased", "Phased"], ["spring", "Spring"]]) {
  const { context, page } = await openLab();
  await chooseVariant(page, variant);
  const run = await sampleSelection(page, { from: "Day", to: "Quarter", interruptTo: "Week", interruptAfterMs: 110 });
  const before = run.samples.filter((s) => s.t <= run.interruptAt);
  const after = run.samples.filter((s) => s.t > run.interruptAt);
  if (before.length < 3 || after.length < 3) {
    check(false, `${label}: the interrupt landed inside a travel`, `${before.length} frames before, ${after.length} after — the run was not interrupted`);
    await context.close();
    continue;
  }
  const lastBefore = before[before.length - 1].left;
  const firstAfter = after[0].left;
  const steps = before.slice(1).map((s, i) => Math.abs(s.left - before[i].left));
  const worstNormal = steps.length ? Math.max(...steps) : 0;

  /**
   * THE CONTINUITY CHECK, and it is deliberately not anchored on the click.
   *
   * Three earlier versions of this check were each shown to be measuring the wrong thing, and the third was
   * measuring nothing at all:
   *
   *   1. A flat 4px step allowance failed a CORRECT glide on a 26px frame of ordinary `emphasized` motion.
   *   2. An allowance calibrated from the run's worst frame was wide enough to contain negative control 2's
   *      defect — a spring re-seeded from the stale logical origin.
   *   3. Comparing the frame before `interruptAt` with the frame after it measures nothing, because the
   *      retarget does not take effect at the click. Dumping the trajectory showed the selection change needs
   *      ~58ms — React's commit plus the MutationObserver — so BOTH of those frames are still on the old
   *      curve. That version passed on any engine whatsoever.
   *
   * What the retarget actually looks like, measured on both a correct and a re-seeding build:
   *
   *     correct   …592.2  619.2  641.2  [645.1]  628.5  602.0…     step into the turn:  3.9px
   *     re-seeded …592.2  619.0  641.4  [716.9]  685.8  647.7…     step into the turn: 75.5px
   *
   * So the property is stated where it is visible: an indicator decelerating towards its turning point
   * cannot ACCELERATE into it. That is true of a spring carrying velocity and of a transition restarting
   * from its computed value, and it is false of anything that was repositioned between frames. The
   * comparison is per millisecond so a dropped frame cannot fake it.
   */
  // The peak is searched in the post-click window, but its two preceding frames are taken from the FULL
  // sample array: the trajectory is continuous across that split, and for `glide` the turn comes so soon
  // after the click that the window does not yet contain two frames of its own.
  const all = run.samples;
  const firstAfterIndex = all.findIndex((x) => x.t > run.interruptAt);
  let peakIndex = firstAfterIndex;
  for (let i = firstAfterIndex; i < all.length; i += 1) if (all[i].left > all[peakIndex].left) peakIndex = i;
  const excursion = all[peakIndex].left - lastBefore;
  if (peakIndex >= 2 && excursion > 6) {
    const into = all[peakIndex];
    const beforeInto = all[peakIndex - 1];
    const beforeThat = all[peakIndex - 2];
    const intoSpeed = Math.abs(into.left - beforeInto.left) / Math.max(1, into.t - beforeInto.t);
    const approachSpeed = Math.abs(beforeInto.left - beforeThat.left) / Math.max(1, beforeInto.t - beforeThat.t);
    const allowedSpeed = approachSpeed * 1.2 + 0.3;
    check(
      intoSpeed <= allowedSpeed,
      `${label}: retarget continues from the rendered position`,
      `turning point ${into.left.toFixed(1)} reached at ${intoSpeed.toFixed(3)} px/ms after approaching at ${approachSpeed.toFixed(3)} px/ms (allowed ${allowedSpeed.toFixed(3)}); it was at ${lastBefore.toFixed(1)} when the click was sent, ~4 frames earlier`,
    );
  } else {
    // `phased` holds this edge through a forward move, so there is no forward excursion to judge; say so
    // rather than passing a check that read a stationary edge.
    note(
      `${label}: no forward excursion to judge for continuity`,
      `peak at index ${peakIndex}, ${excursion.toFixed(1)}px past ${lastBefore.toFixed(1)} — this edge is held under this variant, so the turning-point test does not apply`,
    );
  }
  // The first frame after the click is recorded for the report, and is NOT a judgement: the retarget has not
  // taken effect yet at that point.
  note(
    `${label}: the frame after the interrupt was sent`,
    `${lastBefore.toFixed(1)} → ${firstAfter.toFixed(1)} (still on the pre-retarget curve; the retarget lands ~4 frames later)`,
  );
  // And the complementary defect: a reset to the stale logical origin, which a calibrated step alone would
  // miss if it happened over two frames.
  //
  // Judged on the whole BOX, not the leading edge. Under `phased` a forward move holds the start edge for a
  // whole tier while the end edge travels, so the indicator's `left` legitimately sits on the origin's `left`
  // for 300ms while the indicator is stretched most of the way to the destination. The first version of this
  // check read `left` alone and failed `phased` for being correct. A genuine reset puts BOTH edges back.
  const origin = await page.locator(`${SEG} [data-state]`, { hasText: /^Day$/ }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, width: r.width };
  });
  const returned = after.some((s) => Math.abs(s.left - origin.left) <= EPSILON && Math.abs(s.width - origin.width) <= EPSILON);
  check(!returned, `${label}: never resets to the box it started from`, returned ? `the indicator became Day's box again (${origin.left.toFixed(1)}×${origin.width.toFixed(1)}) after the retarget` : `Day's box is ${origin.left.toFixed(1)}×${origin.width.toFixed(1)}; the retargeted run never became it`);
  if (label === "phased") {
    // The positive half of the same fact: the hold is the effect, so it must be measurable as a stretch.
    const widest = Math.max(...before.map((s) => s.width));
    check(widest > origin.width * 1.4, "phased: the indicator stretches across the gap before it follows", `widest ${widest.toFixed(1)} against a resting ${origin.width.toFixed(1)} — the trailing edge is held a whole tier`);
    const heldLeft = before.every((s) => Math.abs(s.left - origin.left) <= EPSILON);
    check(heldLeft, "phased: the held edge really is held", `every one of ${before.length} frames in the hold kept left at ${origin.left.toFixed(1)}`);
  }
  const quarter = await page.locator(`${SEG} [data-state]`, { hasText: /^Quarter$/ }).evaluate((el) => el.getBoundingClientRect().left);
  const overshoot = Math.max(...after.map((s) => s.left));
  check(overshoot < quarter - EPSILON, `${label}: the abandoned destination is never reached`, `furthest ${overshoot.toFixed(1)} vs abandoned Quarter at ${quarter.toFixed(1)}`);
  const week = await page.locator(`${SEG} [data-state="on"]`).first().evaluate((el) => el.getBoundingClientRect().left);
  const settled = after[after.length - 1].left;
  check(Math.abs(settled - week) <= EPSILON, `${label}: settles on the retargeted segment`, `bar ${settled.toFixed(1)} vs Week ${week.toFixed(1)}`);

  /**
   * Velocity around the CLICK, recorded as a note and no longer asserted.
   *
   * This was an assertion — "the spring retains ≥25% of its velocity across the retarget" — and it was
   * measuring something else. The retarget takes effect about four frames after the click (see the
   * turning-point comment above), so both the before and the after window fall on the SAME pre-retarget
   * curve: the number is the variant's own deceleration as it approaches its first destination, not velocity
   * carried through a retarget. The spring read 34–43% and the transitions 0–27%, and that difference is a
   * difference between two time courses, not evidence about continuity. An assertion built on it would have
   * been a measured-looking claim about the wrong quantity.
   *
   * Velocity carry IS asserted, deterministically, where time can be controlled exactly: `spring.test.ts`'s
   * "carries an initial velocity instead of discarding it" integrates the same spring with and without an
   * initial velocity and requires the trajectories to differ in the right direction. That is the honest home
   * for the claim; a browser sampling at 60Hz across a React commit is not.
   */
  const vBefore = speedAround(run.samples, run.interruptAt, 3, true);
  const vAfter = speedAround(run.samples, run.interruptAt, 3, false);
  const retention = vBefore > 0 ? vAfter / vBefore : 0;
  note(
    `${label}: speed either side of the click (NOT a continuity measurement)`,
    `${vBefore.toFixed(3)} → ${vAfter.toFixed(3)} px/ms (${(retention * 100).toFixed(0)}%) — both windows are on the pre-retarget curve, so this is this variant's approach, not velocity carried through the retarget; velocity carry is asserted in spring.test.ts`,
  );
  await context.close();
}

// ── 3. Reduced motion: no interpolation, and the END state ─────────────────────────────────────────────
if (wants("3")) for (const [how, open, override] of [
  ["system preference", { reducedMotion: "reduce" }, false],
  ["lab override", {}, true],
]) {
  const { context, page } = await openLab(open);
  await chooseVariant(page, "Glide");
  if (override) await page.locator("#lab-reduce").click();
  const run = await sampleSelection(page, { from: "Day", to: "Quarter" });
  const values = distinct(run.samples.map((s) => s.left));
  check(values.length <= 2, `reduced motion (${how}): no interpolated positions`, `${values.length} distinct offsets: ${JSON.stringify(values.slice(0, 4))}`);
  const target = await page.locator(`${SEG} [data-state="on"]`).first().evaluate((el) => el.getBoundingClientRect().left);
  const settled = run.samples[run.samples.length - 1].left;
  check(Math.abs(settled - target) <= EPSILON, `reduced motion (${how}): reaches the end state, not a midpoint`, `bar ${settled.toFixed(1)} vs segment ${target.toFixed(1)}`);
  // The spring is invisible to CSS, so its reduced form has to be enforced in the engine. Measured, not assumed.
  await chooseVariant(page, "Spring");
  const springRun = await sampleSelection(page, { from: "Day", to: "Month" });
  const springValues = distinct(springRun.samples.map((s) => s.left));
  check(springValues.length <= 2, `reduced motion (${how}): the spring does not run`, `${springValues.length} distinct offsets`);
  await context.close();
}

// ── 4. The lab's switch can add reduction and can never remove it ──────────────────────────────────────
if (wants("4")) {
  const { context, page } = await openLab({ reducedMotion: "reduce" });
  const sw = page.locator("#lab-reduce");
  const state = await sw.evaluate((el) => ({ checked: el.getAttribute("aria-checked") ?? el.getAttribute("data-state"), disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" }));
  check(state.disabled === true, "under a system preference the lab switch is inert", JSON.stringify(state));
  // Clicking an inert switch must change nothing: the measurement, not the attribute, is the claim.
  await sw.click({ force: true }).catch(() => {});
  await chooseVariant(page, "Glide");
  const run = await sampleSelection(page, { from: "Day", to: "Quarter" });
  const values = distinct(run.samples.map((s) => s.left));
  check(values.length <= 2, "a system preference cannot be overridden from the page", `${values.length} distinct offsets after clicking the switch`);
  await context.close();
}

// ── 5. RTL: the indicator mirrors rather than travelling the wrong way ─────────────────────────────────
if (wants("5")) {
  const { context, page } = await openLab();
  await chooseVariant(page, "Glide");
  await seg(page, "Day").click();
  await page.locator("#lab-rtl").click();
  await page.waitForFunction(() => document.querySelector('[data-kx-lab-stage]')?.getAttribute("dir") === "rtl");
  await page.waitForTimeout(200);
  const dayLeft = await page.locator(SEG_BAR).evaluate((el) => el.getBoundingClientRect().left);
  const run = await sampleSelection(page, { from: "Day", to: "Quarter" });
  const settled = run.samples[run.samples.length - 1].left;
  const target = await page.locator(`${SEG} [data-state="on"]`).first().evaluate((el) => el.getBoundingClientRect().left);
  // Under RTL a LATER segment sits further to the physical left. A physical `translate-x` that nobody
  // mirrored would send the indicator the other way, which is exactly what this measures.
  check(settled < dayLeft - EPSILON, "RTL: a later segment is reached by moving physically leftwards", `Day at ${dayLeft.toFixed(1)}, Quarter at ${settled.toFixed(1)}`);
  check(Math.abs(settled - target) <= EPSILON, "RTL: settles on the chosen segment", `bar ${settled.toFixed(1)} vs segment ${target.toFixed(1)}`);
  const values = distinct(run.samples.map((s) => s.left));
  check(values.length >= 5, "RTL: the travel is still interpolated", `${values.length} distinct offsets`);
  await context.close();
}

// ── 6. Semantics do not depend on motion, and are set on the interaction ───────────────────────────────
if (wants("6")) {
  const { context, page } = await openLab();
  for (const variant of ["Glide", "Phased", "Spring", "Fade", "Instant"]) {
    await chooseVariant(page, variant);
    await seg(page, "Day").click();
    await page.waitForTimeout(TRAVEL_CEILING_MS / 2);
    // "On the interaction, not on animation end" is a claim about TIME. React commits state asynchronously,
    // so a same-task read finds `aria-checked="false"` on a perfectly correct component — the first version of
    // this check failed all five variants for that reason. What matters is that the announcement lands within
    // a frame or two of the click and far inside the travel, so the measurement is the millisecond gap.
    const immediate = await page.evaluate(
      async (ceiling) =>
        new Promise((resolve) => {
          const items = [...document.querySelectorAll(".kx-lab-seg [data-state]")];
          const month = items.find((el) => el.textContent?.trim() === "Month");
          const began = performance.now();
          const read = () => month?.getAttribute("aria-checked") ?? month?.getAttribute("data-state");
          month?.click();
          const poll = () => {
            const checked = read();
            const elapsed = performance.now() - began;
            if (checked === "true" || checked === "on" || elapsed > ceiling) {
              resolve({
                checked,
                afterMs: elapsed,
                state: document.querySelector(".kx-lab-seg")?.getAttribute("data-kx-lab-state"),
                chosen: document.querySelectorAll('.kx-lab-seg [data-state="on"]').length,
              });
              return;
            }
            requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        }),
      TRAVEL_CEILING_MS,
    );
    const announced = immediate.checked === "true" || immediate.checked === "on";
    check(announced && immediate.afterMs <= 60, `${variant}: selection is announced on the interaction`, `aria-checked = ${immediate.checked} after ${immediate.afterMs.toFixed(1)}ms, well inside the travel (track was ${immediate.state})`);
    check(immediate.chosen === 1, `${variant}: exactly one segment chosen at the moment of change`, `${immediate.chosen} chosen`);
    await page.waitForTimeout(TRAVEL_CEILING_MS);
  }
  // Tab stops must be identical across variants: the roving index is Radix's, and no variant may add one.
  const stops = {};
  for (const variant of ["Glide", "Spring", "Instant"]) {
    await chooseVariant(page, variant);
    stops[variant] = await page.locator(`${SEG} [data-state][tabindex="0"]`).count();
  }
  const counts = [...new Set(Object.values(stops))];
  check(counts.length === 1 && counts[0] === 1, "every variant has the same single tab stop in the strip", JSON.stringify(stops));
  await context.close();
}

// ── 7. Keyboard, focus continuity and the disabled segment ─────────────────────────────────────────────
if (wants("7")) {
  const { context, page } = await openLab();
  await chooseVariant(page, "Glide");
  await seg(page, "Day").click();
  await page.locator(`${SEG} [data-state="on"]`).first().focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(TRAVEL_CEILING_MS);
  const afterArrow = await page.evaluate(() => {
    const active = document.activeElement;
    const style = active ? getComputedStyle(active) : null;
    return {
      label: active?.textContent?.trim() ?? null,
      chosen: active?.getAttribute("aria-checked") ?? active?.getAttribute("data-state"),
      ring: style ? `${style.boxShadow} | ${style.outlineStyle} ${style.outlineWidth}` : "",
      visible: active?.matches(":focus-visible") ?? false,
    };
  });
  check(afterArrow.label === "Week", "ArrowRight moves focus one segment along the strip", `focus is on ${afterArrow.label}`);
  check(afterArrow.visible === true, "focus remains focus-visible after the travel", `:focus-visible = ${afterArrow.visible}`);
  // Measured, and NOT asserted. The shipped SegmentedControl is a Radix ToggleGroup, which renders
  // role="radiogroup" with role="radio" items and moves focus on the arrow keys WITHOUT checking the focused
  // radio — so Space or Enter is required to choose. ARIA APG's radio-group pattern says an arrow key should
  // move focus and check. That gap is in `packages/ui/src/components/segmented-control.tsx`, not in the lab
  // layer: it reproduces identically with every lab variant and with the lab layer absent. It is recorded in
  // M5.25-OWNER-DECISION-REGISTER.md rather than fixed here, because that file is inside the frozen
  // #645-#650 boundary. Asserting the correct behaviour would redden this gate on inherited debt; asserting
  // the current behaviour would freeze the defect into a contract. So it is a note with a number.
  note("keyboard activation on the shipped strip", `ArrowRight left aria-checked = ${afterArrow.chosen} on the focused radio — selection needs Space/Enter. Pre-existing in @kinetixui/ui, see the decision register.`);
  const spaceActivates = await page.evaluate(async () => {
    const active = document.activeElement;
    active?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    return active?.getAttribute("aria-checked");
  });
  note("the documented alternative works", `Space left aria-checked = ${spaceActivates} on the focused radio`);
  check(afterArrow.ring.includes("rgb") || afterArrow.ring.includes("solid"), "a focus ring is painted after the travel", afterArrow.ring.slice(0, 80));

  // End lands on the LAST enabled segment: the fifth is disabled, so roving must skip it.
  await page.keyboard.press("End");
  await page.waitForTimeout(400);
  const end = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null);
  check(end === "Quarter", "roving focus skips the disabled segment", `End reached ${end}`);
  const disabled = page.locator(`${SEG} [data-state]`, { hasText: /^Year$/ });
  await disabled.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const yearState = await disabled.evaluate((el) => el.getAttribute("data-state"));
  check(yearState !== "on", "a disabled segment cannot be chosen by pointer", `data-state = ${yearState}`);
  await context.close();
}

// ── 8. Forced colours: the indicator goes, the selection cue stays ─────────────────────────────────────
if (wants("8")) {
  const { context, page } = await openLab({ forcedColors: "active" });
  await seg(page, "Month").click();
  await page.waitForTimeout(400);
  const forced = await page.evaluate(() => {
    const bar = document.querySelector(".kx-lab-seg .kx-lab-bar");
    const chosen = document.querySelector('.kx-lab-seg [data-state="on"]');
    const cs = chosen ? getComputedStyle(chosen) : null;
    return {
      barDisplay: bar ? getComputedStyle(bar).display : "missing",
      background: cs?.backgroundColor ?? "missing",
      colour: cs?.color ?? "missing",
    };
  });
  check(forced.barDisplay === "none", "forced colours: the lab indicator is hidden", `display = ${forced.barDisplay}`);
  const transparent = /rgba\(0, 0, 0, 0\)|transparent/.test(forced.background);
  check(!transparent, "forced colours: the chosen segment keeps its own fill", `background = ${forced.background}, colour = ${forced.colour}`);
  await context.close();
}

// ── 9. The transform technique is taken where it is valid and declines where it is not ─────────────────
if (wants("9")) {
  const { context, page } = await openLab();
  await page.locator("#lab-technique [data-state]", { hasText: /^Transform$/ }).click();
  await page.waitForTimeout(300);
  const techniques = await page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      return el ? { effective: el.getAttribute("data-kx-lab-technique"), requested: el.getAttribute("data-kx-lab-technique-requested") } : null;
    };
    return { seg: read(".kx-lab-seg"), tabs: read(".kx-lab-tabs") };
  });
  check(techniques.seg?.effective === "transform", "equal-width segments take the transform path", JSON.stringify(techniques.seg));
  check(techniques.tabs?.effective === "inset" && techniques.tabs?.requested === "transform", "unequal tabs decline it, and say so", JSON.stringify(techniques.tabs));
  // The declined path must still travel correctly, which is the thing a silent fallback would hide.
  await chooseVariant(page, "Glide");
  const run = await sampleSelection(page, { from: "Day", to: "Quarter" });
  const values = distinct(run.samples.map((s) => s.left));
  check(values.length >= 5, "the transform path renders intermediate positions too", `${values.length} distinct offsets`);
  await context.close();
}

// ── 10. Nothing keeps running after a travel settles ───────────────────────────────────────────────────
if (wants("10")) {
  const { context, page } = await openLab();
  await chooseVariant(page, "Spring");
  await sampleSelection(page, { from: "Day", to: "Quarter" });
  // Two instruments were tried here and BOTH were shown to be blind by negative control 7, which deletes the
  // engine's release of its frame loop so the loop runs for the rest of the session:
  //
  //   1. DISTINCT POSITIONS over the idle frames. A loop that is never released rewrites the SAME value, so
  //      the distinct count stays at 1 — and `settle()` has already set `resting`, so that check passed too.
  //   2. STYLE WRITES, counted with a MutationObserver on the indicator's `style` attribute. Chromium does
  //      not emit an attribute mutation record for a `setProperty` that does not change the value, so an
  //      idle loop writing the same pixels is invisible to it as well.
  //
  // What is left is the loop itself. `requestAnimationFrame` is patched to count its calls, and the sampler
  // — which calls it exactly once per frame — is the yardstick: with the engine released the two counts
  // match, and a live engine loop re-arms once per frame on top of that, so the count roughly doubles. A
  // ratio against the sampler's own frames is robust to however many frames the host actually delivered.
  await page.evaluate(() => {
    window.__kxRafCalls = 0;
    const real = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__kxRafCalls += 1;
      return real(cb);
    };
  });
  await page.evaluate((s) => window.__kxLab.start(s), SEG_BAR);
  await page.waitForTimeout(500);
  const idle = await page.evaluate(() => window.__kxLab.stop());
  const rafCalls = await page.evaluate(() => window.__kxRafCalls);
  const values = distinct(idle.map((s) => s.left));
  countedAll("the idle window really was sampled", [idle.length], (n) => n > 20, (xs) => `${xs[0]} idle frames over 500ms`);
  // The sampler re-arms once per sample, plus its initial call. Anything much past that is another loop.
  const perFrame = rafCalls / Math.max(1, idle.length);
  check(perFrame < 1.4, "no frame loop is still running once the spring is at rest", `${rafCalls} requestAnimationFrame call(s) over ${idle.length} sampled frames = ${perFrame.toFixed(2)} per frame; the sampler alone accounts for 1.0, so a live engine loop reads ~2.0`);
  check(values.length === 1, "and the rendered position does not change", `${values.length} distinct offsets`);
  countedAll("the track reports itself at rest", idle.map((s) => s.state), (s) => s === "resting", (xs) => `${xs.length} idle frames, all resting`);
  await context.close();
}

// ── 11. The slider's layers, and the bubble's position under both directions ───────────────────────────
if (wants("11")) for (const dir of ["ltr", "rtl"]) {
  const { context, page } = await openLab();
  if (dir === "rtl") {
    await page.locator("#lab-rtl").click();
    await page.waitForTimeout(250);
  }
  await page.locator('[aria-label="Slider motion layers"] [data-state]', { hasText: /^Ticks$/ }).click();
  await page.waitForTimeout(250);
  const thumb = page.locator('.kx-lab-slider [role="slider"]');
  await thumb.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  const geometry = await page.evaluate(() => {
    const host = document.querySelector(".kx-lab-slider");
    const handle = host?.querySelector('[role="slider"]');
    const bubble = host?.querySelector(".kx-lab-bubble");
    const halo = host?.querySelector(".kx-lab-halo");
    const ticks = [...(host?.querySelectorAll(".kx-lab-tick") ?? [])];
    const centre = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    return {
      value: handle?.getAttribute("aria-valuenow"),
      text: bubble?.textContent?.trim() ?? null,
      // Hidden by itself OR by an ancestor: the bubble sits inside an aria-hidden anchor, and "is it in the
      // accessibility tree" is the claim, not "which element carries the attribute".
      bubbleHidden: bubble ? Boolean(bubble.closest('[aria-hidden="true"]')) : null,
      haloHidden: halo ? Boolean(halo.closest('[aria-hidden="true"]')) : null,
      bubbleOffset: bubble && handle ? centre(bubble) - centre(handle) : null,
      haloOffset: halo && handle ? centre(halo) - centre(handle) : null,
      bubbleOpacity: bubble ? parseFloat(getComputedStyle(bubble).opacity) : null,
      ticks: ticks.length,
      current: ticks.filter((t) => t.getAttribute("data-current") === "true").length,
      liveRegions: host?.querySelectorAll("[aria-live]").length ?? 0,
    };
  });
  check(geometry.bubbleHidden === true && geometry.haloHidden === true, `slider (${dir}): the bubble and halo are out of the accessibility tree`, `bubble hidden = ${geometry.bubbleHidden}, halo hidden = ${geometry.haloHidden}`);
  check(geometry.liveRegions === 0, `slider (${dir}): no second live source for the value`, `${geometry.liveRegions} aria-live regions`);
  check(geometry.text === `${geometry.value}%`, `slider (${dir}): the bubble shows the announced value`, `bubble "${geometry.text}" vs aria-valuenow ${geometry.value}`);
  check(Math.abs(geometry.bubbleOffset ?? 999) <= 2, `slider (${dir}): the bubble is centred on the thumb`, `${(geometry.bubbleOffset ?? NaN).toFixed(2)}px from the thumb's centre`);
  check(Math.abs(geometry.haloOffset ?? 999) <= 2, `slider (${dir}): the halo is centred on the thumb`, `${(geometry.haloOffset ?? NaN).toFixed(2)}px from the thumb's centre`);
  check((geometry.bubbleOpacity ?? 0) > 0.9, `slider (${dir}): the bubble is shown for a keyboard reader`, `opacity ${geometry.bubbleOpacity}`);
  check(geometry.ticks === 11 && geometry.current === 1, `slider (${dir}): one tick per step, one marked current`, `${geometry.ticks} ticks, ${geometry.current} current`);
  await context.close();
}

// ── 11b. A wrapped strip: the indicator belongs to the chosen item's ROW, not to the whole track ───────────
if (wants("11b")) {
  // 320px with a 200% default text size is the one condition under which the shipped strip wraps. An
  // indicator pinned to the track's block box then covers every row, which in dark mode puts a near-white
  // surface behind the labels on the other rows: three axe colour-contrast failures, and a visual defect
  // before that. Measured here so it cannot come back quietly.
  const context = await browser.newContext({ viewport: { width: 320, height: 812 }, colorScheme: "dark" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Page.enable");
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
  await page.goto(ROUTE, { waitUntil: "networkidle" });
  await page.waitForSelector(".kx-lab-seg[data-kx-lab-measured]", { timeout: 15000 });
  await page.waitForTimeout(500);
  const wrapped = await page.evaluate(() => {
    const track = document.querySelector(".kx-lab-seg");
    const bar = track.querySelector(".kx-lab-bar");
    const items = [...track.querySelectorAll("[data-state]")];
    const chosen = items.find((el) => el.getAttribute("data-state") === "on");
    const rows = new Set(items.map((el) => Math.round(el.getBoundingClientRect().top)));
    const b = bar.getBoundingClientRect();
    const c = chosen.getBoundingClientRect();
    const t = track.getBoundingClientRect();
    return { rows: rows.size, barHeight: b.height, chosenHeight: c.height, trackHeight: t.height, barTop: b.top, chosenTop: c.top };
  });
  check(wrapped.rows > 1, "at 320px with 200% text the strip really does wrap", `${wrapped.rows} rows, track ${wrapped.trackHeight.toFixed(0)}px tall against a ${wrapped.chosenHeight.toFixed(0)}px segment`);
  check(Math.abs(wrapped.barHeight - wrapped.chosenHeight) <= 2, "the indicator is the height of its own segment, not of the track", `bar ${wrapped.barHeight.toFixed(1)}px, segment ${wrapped.chosenHeight.toFixed(1)}px, track ${wrapped.trackHeight.toFixed(1)}px`);
  check(Math.abs(wrapped.barTop - wrapped.chosenTop) <= 2, "the indicator sits on its own row", `bar top ${wrapped.barTop.toFixed(1)}, segment top ${wrapped.chosenTop.toFixed(1)}`);
  await cdp.detach();
  await context.close();
}

// ── 12. The tab list's indicator, and its pill shape ───────────────────────────────────────────────────
if (wants("12")) {
  const { context, page } = await openLab();
  await chooseVariant(page, "Glide");
  const tab = (label) => page.locator('.kx-lab-tabs [role="tab"]', { hasText: new RegExp(`^${label}$`) });
  await tab("Overview").click();
  await page.waitForTimeout(400);
  const shipped = await page.evaluate(() => {
    const own = document.querySelector(".kx-lab-tabs [data-kx-tabs-bar]");
    return own ? getComputedStyle(own).display : "missing";
  });
  check(shipped === "none", "the shipped tabs bar is hidden so there is one indicator", `display = ${shipped}`);
  await page.evaluate(() => window.__kxLab.start(".kx-lab-tabs .kx-lab-bar"));
  await tab("Audit").click();
  await page.waitForTimeout(TRAVEL_CEILING_MS);
  const samples = await page.evaluate(() => window.__kxLab.stop());
  const values = distinct(samples.map((s) => s.left));
  check(values.length >= 5, "the tab indicator travels", `${values.length} distinct offsets`);
  const widths = distinct(samples.map((s) => s.width));
  check(widths.length >= 3, "the tab indicator resizes to the chosen label", `${widths.length} distinct widths — tabs are unequal, so the indicator must change width`);
  const chosen = await page.locator('.kx-lab-tabs [role="tab"][data-state="active"]').evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, width: r.width }; });
  const final = samples[samples.length - 1];
  check(Math.abs(final.left - chosen.left) <= EPSILON && Math.abs(final.width - chosen.width) <= EPSILON, "the tab indicator settles on the chosen tab's box", `bar ${final.left.toFixed(1)}×${final.width.toFixed(1)} vs tab ${chosen.left.toFixed(1)}×${chosen.width.toFixed(1)}`);
  await page.locator('#lab-shape [data-state]', { hasText: /^Pill$/ }).click();
  await page.waitForTimeout(300);
  const pill = await page.evaluate(() => {
    const bar = document.querySelector(".kx-lab-tabs .kx-lab-bar");
    const cs = bar ? getComputedStyle(bar) : null;
    return cs ? { height: parseFloat(cs.height), radius: cs.borderTopLeftRadius } : null;
  });
  check((pill?.height ?? 0) > 16, "the pill shape is a surface, not a rail", `${pill?.height}px tall, radius ${pill?.radius}`);
  await context.close();
}

// ── 13. Properties that are easy to lose and invisible without a check ──────────────────────────────
if (wants("13")) {
  const { context, page } = await openLab();
  await chooseVariant(page, "Glide");
  await seg(page, "Month").click();
  await page.waitForFunction(() => document.querySelector(".kx-lab-seg")?.getAttribute("data-kx-lab-state") === "resting", null, { timeout: TRAVEL_CEILING_MS });

  // (a) A change that is not a change of SELECTION must not animate. A resize is the honest way to ask: the
  // chosen item is the same item at a new offset, so the indicator has to arrive there without interpolating
  // — an indicator that eases its way across during a window drag reads as the selection moving on its own.
  //
  // This check used to re-click the chosen segment instead, and that proved nothing: `SegmentedControl` holds
  // its own value and refuses to be emptied by its own items, so a second activation never reaches React, the
  // engine is never re-entered, and the check stayed green with the guard it was written for deleted. The
  // re-click is kept below as what it actually is — a check on the shipped component's refusal, not on motion.
  await page.evaluate((s) => window.__kxLab.start(s), SEG_BAR);
  await seg(page, "Month").click();
  await page.waitForTimeout(400);
  const reclick = await page.evaluate(() => window.__kxLab.stop());
  countedAll("re-clicking the chosen segment is sampled", [reclick.length], (n) => n > 10, (xs) => `${xs[0]} frames`);
  check(distinct(reclick.map((x) => x.left)).length === 1, "re-choosing the chosen segment does not move the indicator", `${distinct(reclick.map((x) => x.left)).length} distinct offsets — the shipped control refuses the second activation`);

  // 1280 -> 900, not a smaller step, and the reason is worth recording: the page's content column is capped,
  // so between 1280 and 1180 the whole track SLIDES with the centred layout while its width never changes.
  // The chosen item's insets are then identical, the engine's "nothing moved" return fires, and the check
  // would have read a no-op as a clean snap — green with the guard it tests deleted. At 900 the track really
  // narrows (918px -> 810px here), so the engine is re-entered with new geometry and has to snap to it. The
  // measured width change below is what proves that happened.
  const widthBefore = await page.locator(SEG_BAR).evaluate((el) => el.getBoundingClientRect().width);
  await page.evaluate((s) => window.__kxLab.start(s), SEG_BAR);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(700);
  const resized = await page.evaluate(() => window.__kxLab.stop());
  countedAll("the resize is sampled", [resized.length], (n) => n > 10, (xs) => `${xs[0]} frames`);
  const afterResize = await page.evaluate(() => {
    const track = document.querySelector(".kx-lab-seg");
    const bar = track.querySelector(".kx-lab-bar").getBoundingClientRect();
    const box = track.querySelector('[data-state="on"]').getBoundingClientRect();
    return { barLeft: bar.left, barWidth: bar.width, left: box.left, width: box.width, state: track.getAttribute("data-kx-lab-state") };
  });
  check(Math.abs(afterResize.barWidth - widthBefore) > 4, "the resize really re-measured the track", `indicator ${widthBefore.toFixed(1)}px -> ${afterResize.barWidth.toFixed(1)}px`);
  const resizedWidths = distinct(resized.map((x) => x.width));
  check(resizedWidths.length <= 3, "a resize moves the indicator without interpolating it", `${resizedWidths.length} distinct widths over ${resized.length} frames (a travel renders ~19)`);
  check(Math.abs(afterResize.barLeft - afterResize.left) <= EPSILON && Math.abs(afterResize.barWidth - afterResize.width) <= EPSILON, "and lands on the chosen segment's new box", `bar ${afterResize.barLeft.toFixed(1)}x${afterResize.barWidth.toFixed(1)} vs segment ${afterResize.left.toFixed(1)}x${afterResize.width.toFixed(1)}`);
  check(afterResize.state === "resting", "and reports itself at rest afterwards", `data-kx-lab-state = ${afterResize.state}`);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);

  // (b) The lab's decorations are decoration. None of them may take focus, and the engine's own indicator must
  // not become a tab stop when a variant adds an element to it.
  const focusable = await page.evaluate(() => {
    const decorations = [...document.querySelectorAll(".kx-lab-bar, .kx-lab-halo, .kx-lab-bubble-anchor, .kx-lab-ticks")];
    const offenders = [];
    for (const root of decorations) {
      for (const node of [root, ...root.querySelectorAll("*")]) {
        const tabindex = node.getAttribute("tabindex");
        const natively = /^(a|button|input|select|textarea|summary|details)$/i.test(node.tagName) && !node.hasAttribute("disabled");
        if ((tabindex !== null && Number(tabindex) >= 0) || natively) offenders.push(`${node.tagName}.${(node.className || "").toString().slice(0, 30)}`);
      }
    }
    return { decorations: decorations.length, offenders };
  });
  countedAll("the lab's decorations exist to be checked", [focusable.decorations], (n) => n > 0, (xs) => `${xs[0]} decorative elements found`);
  check(focusable.offenders.length === 0, "no decoration is keyboard reachable", focusable.offenders.length ? focusable.offenders.join(", ") : `${focusable.decorations} decorative elements, none focusable`);

  // (c) Rapid alternation must leave the indicator on the segment that was chosen LAST. An engine that
  // declines to re-place while a travel is running reaches a stale segment and then stays there.
  //
  // The final selection is made BY THIS CHECK, ~40ms after the lab's own alternation ends, and that is the
  // whole point. Negative control 10 — an engine that drops any placement arriving mid-travel — passed
  // against the alternation alone, because the scripted run happens to end 350ms in, just after a 300ms
  // travel settles, so its last step was honoured by luck. A check that depends on that coincidence is not
  // measuring the property. One extra selection timed to land INSIDE the travel removes the luck: a dropping
  // engine must end on `quarter` and a correct one must end on `week`.
  await page.locator('[data-kx-lab-action="alternate"]').click();
  await page.waitForTimeout(390);
  const midTravel = await page.locator(SEG).getAttribute("data-kx-lab-state");
  await seg(page, "Week").click();
  check(midTravel === "travelling", "the final selection really arrived mid-travel", `track was ${midTravel} when it was made`);
  await page.waitForTimeout(2500);
  const settled = await page.evaluate(() => {
    const track = document.querySelector(".kx-lab-seg");
    const bar = track.querySelector(".kx-lab-bar").getBoundingClientRect();
    const chosen = track.querySelector('[data-state="on"]');
    const box = chosen.getBoundingClientRect();
    return { label: chosen.textContent.trim(), barLeft: bar.left, barWidth: bar.width, left: box.left, width: box.width, state: track.getAttribute("data-kx-lab-state") };
  });
  check(Math.abs(settled.barLeft - settled.left) <= EPSILON && Math.abs(settled.barWidth - settled.width) <= EPSILON, "after rapid alternation the indicator is on the segment chosen last", `${settled.label}: bar ${settled.barLeft.toFixed(1)}x${settled.barWidth.toFixed(1)} vs segment ${settled.left.toFixed(1)}x${settled.width.toFixed(1)}`);
  check(settled.state === "resting", "after rapid alternation the track reports itself at rest", `data-kx-lab-state = ${settled.state}`);
  await context.close();
}

await browser.close();

console.log(`motion-lab-browser — ${ROUTE}`);
console.log(report.join("\n"));
if (notes.length) console.log(`\n  ${notes.length} measured note(s), not assertions.`);
if (failures.length) {
  console.error(`\nmotion-lab-browser: ${failures.length} failure(s)\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
const passed = report.filter((r) => r.startsWith("  ok")).length;
// A run that asserted nothing must not read as a pass. `--only 99` is a typo, not a clean bill of health, and a
// control runner that accepted it would report every mutation as undetected while never running a check.
if (passed === 0) {
  console.error(`\nmotion-lab-browser: no checks ran${only.size ? ` — --only ${[...only].join(",")} matched no section` : ""}`);
  process.exit(1);
}
console.log(`\nmotion-lab-browser ok — ${passed} checks${only.size ? ` (sections ${[...only].join(",")} only)` : ""}`);
