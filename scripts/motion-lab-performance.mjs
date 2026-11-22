/**
 * motion-lab-performance.mjs — what the lab's motion costs, measured rather than asserted.
 *
 *   node scripts/motion-lab-performance.mjs --base http://127.0.0.1:3000
 *
 * This is mostly a REPORT, and says so. Frame timing in a headless container on shared CI hardware is not
 * the number a reader on a laptop gets, so turning it into a threshold would buy a flaky gate and no
 * information. What it does assert is the small set of things that are properties of the code rather than of
 * the machine: that an interaction is answered without waiting for an animation, that no single task blocks
 * the main thread for longer than a frame budget can absorb, and that the engine releases its frame callback.
 *
 * The number this file exists for is the LAYOUT COUNT. The lab offers two techniques for the same visual
 * result: logical insets, which are layout properties and correct under RTL by construction, and a transform,
 * which the compositor can run but which cannot mirror and needs equal-width items. Which is better is not a
 * matter of opinion once both have been counted, and `Performance.getMetrics` counts them.
 *
 * ── Two sections, because the first instrument was confounded ──────────────
 *
 * SECTION A drives the lab's scripted `alternate` action and reports frame timing and long tasks. It is the
 * right instrument for "does anything stall" and the WRONG one for comparing techniques, which is how it was
 * first used: over eight runs it reported inset 354 layouts against transform 342, a 3% difference that reads
 * as "the transform buys nothing". Two confounds, both the measurement's fault. The scripted action drives the
 * segmented strip AND the tab list, and the tab list's items are unequal so it runs on `inset` in both arms —
 * half of each arm was therefore identical. And six React state commits inside 1.6s dominate the layout count
 * with work that has nothing to do with the indicator.
 *
 * SECTION B is the controlled version: one track, the equal-width strip where the transform path actually
 * applies, driven directly with a settle between each change and a warm-up excluded, and the EFFECTIVE
 * technique read back off the track rather than assumed from what was asked for. It reports a 20-30x
 * reduction in layout count, which is the real effect the confounded instrument could not see. Section A is
 * kept, labelled, because its frame and long-task numbers are sound and because a confounded instrument is
 * worth leaving visible beside the one that replaced it.
 */
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/$/, "");
const ROUTE = `${base}/labs/motion`;
/** One frame at 60Hz is 16.7ms. A task longer than three of them is a stall a reader feels. */
const BLOCKING_CEILING_MS = 50;

const failures = [];
const rows = [];
const check = (ok, label, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(56)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

async function measure(travel, technique) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(ROUTE, { waitUntil: "networkidle" });
  await page.waitForSelector(".kx-lab-seg[data-kx-lab-measured]");
  await page.locator("#lab-travel [data-state]", { hasText: new RegExp(`^${travel.label}$`) }).click();
  await page.locator("#lab-technique [data-state]", { hasText: new RegExp(`^${technique === "transform" ? "Transform" : "Insets"}$`) }).click();
  await page.waitForTimeout(400);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const read = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  // Frame deltas and long tasks are collected in the page: a per-frame CDP round trip would itself be the load.
  await page.evaluate(() => {
    window.__perf = { frames: [], longTasks: [], raf: 0 };
    const tick = (t) => {
      window.__perf.frames.push(t);
      window.__perf.raf = requestAnimationFrame(tick);
    };
    window.__perf.raf = requestAnimationFrame(tick);
    try {
      window.__perf.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__perf.longTasks.push({ start: entry.startTime, duration: entry.duration });
      });
      window.__perf.observer.observe({ entryTypes: ["longtask"] });
    } catch {
      window.__perf.observer = null;
    }
  });

  const before = await read();
  // Six changes of mind inside two travel durations: the worst case the lab can produce by design.
  await page.locator('[data-kx-lab-action="alternate"]').click();
  await page.waitForTimeout(1600);
  // And the same again, so the measurement is not one scripted burst's accident.
  await page.locator('[data-kx-lab-action="alternate"]').click();
  await page.waitForTimeout(1600);
  const after = await read();

  const collected = await page.evaluate(() => {
    cancelAnimationFrame(window.__perf.raf);
    window.__perf.observer?.disconnect();
    const f = window.__perf.frames;
    const deltas = f.slice(1).map((t, i) => t - f[i]);
    return { deltas, longTasks: window.__perf.longTasks, frames: f.length };
  });

  const deltas = collected.deltas.filter((d) => d > 0);
  const sorted = [...deltas].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const dropped = deltas.filter((d) => d > 20).length;
  const worstTask = collected.longTasks.reduce((m, t) => Math.max(m, t.duration), 0);

  const row = {
    travel: travel.travel,
    technique,
    frames: collected.frames,
    medianFrameMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p95FrameMs: p95,
    droppedFrames: dropped,
    longTasks: collected.longTasks.length,
    worstTaskMs: worstTask,
    layouts: (after.LayoutCount ?? 0) - (before.LayoutCount ?? 0),
    layoutMs: (((after.LayoutDuration ?? 0) - (before.LayoutDuration ?? 0)) * 1000),
    recalcs: (after.RecalcStyleCount ?? 0) - (before.RecalcStyleCount ?? 0),
    recalcMs: (((after.RecalcStyleDuration ?? 0) - (before.RecalcStyleDuration ?? 0)) * 1000),
    scriptMs: (((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000),
  };
  rows.push(row);

  check(worstTask <= BLOCKING_CEILING_MS || collected.longTasks.length === 0, `${travel.travel}/${technique}: no task blocks the main thread`, `${collected.longTasks.length} long task(s), worst ${worstTask.toFixed(1)}ms (ceiling ${BLOCKING_CEILING_MS}ms)`);

  // Interaction latency: the selected state must be set without waiting for any animation.
  const latency = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const items = [...document.querySelectorAll(".kx-lab-seg [data-state]")];
        const target = items.find((el) => el.getAttribute("data-state") === "off" && !el.hasAttribute("disabled"));
        const began = performance.now();
        target?.click();
        const poll = () => {
          if (target?.getAttribute("aria-checked") === "true" || performance.now() - began > 1000) {
            resolve(performance.now() - began);
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      }),
  );
  row.interactionLatencyMs = latency;
  check(latency <= 60, `${travel.travel}/${technique}: the interaction is answered before the animation`, `${latency.toFixed(1)}ms to aria-checked`);

  await cdp.detach();
  await context.close();
}

const TRAVELS = [
  { travel: "glide", label: "Glide" },
  { travel: "phased", label: "Phased" },
  { travel: "spring", label: "Spring" },
  { travel: "none", label: "Instant" },
];

console.log(`motion-lab-performance — ${ROUTE}`);
console.log(`\n── Section A: frame timing and long tasks under the scripted burst ──`);
for (const travel of TRAVELS) {
  for (const technique of ["inset", "transform"]) {
    await measure(travel, technique);
  }
}
await browser.close();

const pad = (v, n) => String(v).padStart(n);
const fixed = (v, n = 1) => (typeof v === "number" ? v.toFixed(n) : String(v));
console.log("\n  variant  technique    frames  med   p95  dropped  layouts  layoutMs  recalcs  recalcMs  scriptMs  latency");
for (const r of rows) {
  console.log(
    `  ${r.travel.padEnd(8)} ${r.technique.padEnd(11)} ${pad(r.frames, 6)} ${pad(fixed(r.medianFrameMs), 5)} ${pad(fixed(r.p95FrameMs), 5)} ${pad(r.droppedFrames, 8)} ${pad(r.layouts, 8)} ${pad(fixed(r.layoutMs), 9)} ${pad(r.recalcs, 8)} ${pad(fixed(r.recalcMs), 9)} ${pad(fixed(r.scriptMs), 9)} ${pad(fixed(r.interactionLatencyMs), 8)}`,
  );
}

const insetLayouts = rows.filter((r) => r.technique === "inset").reduce((a, r) => a + r.layouts, 0);
const transformLayouts = rows.filter((r) => r.technique === "transform").reduce((a, r) => a + r.layouts, 0);
console.log(`\n  CONFOUNDED  layout count over these eight runs: inset ${insetLayouts}, transform ${transformLayouts}. Do NOT read a technique`);
console.log(`              comparison off this: the scripted action also drives the tab list, which runs on 'inset' in both arms,`);
console.log(`              and six React commits in 1.6s dominate the count. Section B is the controlled comparison.`);
console.log(`  NOTE        frame timing here is headless Chromium in a container. Treat the ordering as evidence and the absolute milliseconds as indicative.`);
console.log(`  NOTE        interaction latency is polled on requestAnimationFrame, so it is quantised to ~16.7ms. A 4ms reading and a`);
console.log(`              15ms reading are one frame apart and are not a difference between the techniques.`);

// ── Section B: the controlled technique comparison ────────────────────────────────────────────────────────
console.log(`\n── Section B: layout cost per technique, one track, driven directly ──`);
const controlled = [];
const CONTROL_BROWSER = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
for (const technique of ["inset", "transform"]) {
  for (const [label, travel] of [["Glide", "glide"], ["Spring", "spring"], ["Instant", "none"]]) {
    const context = await CONTROL_BROWSER.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(ROUTE, { waitUntil: "networkidle" });
    await page.waitForSelector(".kx-lab-seg[data-kx-lab-measured]");
    await page.locator("#lab-travel [data-state]", { hasText: new RegExp(`^${label}$`) }).click();
    await page.locator("#lab-technique [data-state]", { hasText: new RegExp(`^${technique === "transform" ? "Transform" : "Insets"}$`) }).click();
    await page.waitForTimeout(500);
    // Read back what the engine SETTLED on. Asking for `transform` and measuring a declined fallback as
    // though it were the transform path is the single easiest way to produce a meaningless comparison.
    const effective = await page.locator(".kx-lab-seg").getAttribute("data-kx-lab-technique");
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const read = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const items = page.locator(".kx-lab-seg [data-state]");
    await items.nth(1).click();
    await page.waitForTimeout(900); // warm-up, excluded: first-paint and first-measure work is not the steady state
    const before = await read();
    for (const index of [3, 0, 2, 1, 3, 0]) {
      await items.nth(index).click();
      await page.waitForTimeout(700); // each run settles fully, so nothing overlaps the next
    }
    const after = await read();
    controlled.push({
      requested: technique,
      effective,
      travel,
      layouts: (after.LayoutCount ?? 0) - (before.LayoutCount ?? 0),
      layoutMs: ((after.LayoutDuration ?? 0) - (before.LayoutDuration ?? 0)) * 1000,
      recalcs: (after.RecalcStyleCount ?? 0) - (before.RecalcStyleCount ?? 0),
      recalcMs: ((after.RecalcStyleDuration ?? 0) - (before.RecalcStyleDuration ?? 0)) * 1000,
      scriptMs: ((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000,
    });
    await cdp.detach();
    await context.close();
  }
}
await CONTROL_BROWSER.close();

console.log("  requested  effective  variant   layouts  layoutMs  recalcs  recalcMs  scriptMs");
for (const r of controlled) {
  console.log(`  ${r.requested.padEnd(10)} ${String(r.effective).padEnd(10)} ${r.travel.padEnd(9)} ${pad(r.layouts, 7)} ${pad(fixed(r.layoutMs), 9)} ${pad(r.recalcs, 8)} ${pad(fixed(r.recalcMs), 9)} ${pad(fixed(r.scriptMs), 9)}`);
}
for (const r of controlled) {
  check(r.effective === r.requested, `section B: the strip took the ${r.requested} path for ${r.travel}`, `effective = ${r.effective}`);
}
const byKey = (requested, travel) => controlled.find((r) => r.requested === requested && r.travel === travel);
for (const travel of ["glide", "spring"]) {
  const a = byKey("inset", travel);
  const b = byKey("transform", travel);
  if (!a || !b) continue;
  const ratio = b.layouts > 0 ? a.layouts / b.layouts : Infinity;
  console.log(`\n  ${travel}: inset ${a.layouts} layouts (${fixed(a.layoutMs)}ms) vs transform ${b.layouts} (${fixed(b.layoutMs)}ms) — ${ratio === Infinity ? "transform triggered none" : `${ratio.toFixed(1)}x fewer`}`);
  console.log(`  ${travel}: style recalculation is NOT saved — inset ${a.recalcs} (${fixed(a.recalcMs)}ms) vs transform ${b.recalcs} (${fixed(b.recalcMs)}ms); the engine writes a custom property per frame either way.`);
  // The claim the report makes, held to a measurement. A regression that quietly animated layout under the
  // transform path would land here rather than in a reviewer's reading.
  check(b.layouts < a.layouts / 3, `section B: the transform path really avoids layout (${travel})`, `${b.layouts} against ${a.layouts}`);
}
console.log(`\n  CAVEAT  the transform path applies only where every item is the same width. The tab list is not, so it`);
console.log(`          declines and runs on 'inset'. The saving above is real and it is available to a minority of`);
console.log(`          selection tracks, which is the whole content of the integration recommendation.`);

if (failures.length) {
  console.error(`\nmotion-lab-performance: ${failures.length} failure(s)\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log(`\nmotion-lab-performance ok`);
