/**
 * hero-light-browser.mjs — the hero network's travelling light and its focus
 * indicator, measured in a real browser.
 *
 * kx-verify: accessibility
 * kx-verify-covers: apps/web/src/components/hero-polygon.tsx
 *
 * `scripts/rebrand-browser.mjs` owns the hero's structural contract across
 * seven viewport/theme cases. This file owns the claim that needs a measurement
 * rather than an assertion, and is too slow to repeat per case:
 *
 *   1. The lap. `hero-mesh.json` *declares* each route's duration. A declared
 *      duration is not a measured one, so this times a pulse's actual return to
 *      its starting vertex and compares the two. A geometry change that moves a
 *      route's length silently would be caught here, not in the data.
 *
 * Until 2026-11-06 it also measured the hero's focus indicator, differentially:
 * Tab to the illustration, diff the rendered pixels, compare each changed pixel
 * against its nearest unchanged neighbour for SC 1.4.11. The hero is decoration
 * now (owner decision) and has no tab stop, so there is no indicator to measure
 * and that measurement would fail on a correct build. What replaces it is the
 * other half of the same contract: Tab must never reach the illustration, and
 * nothing inside it may be focusable. Section 2 below is that check — kept here
 * rather than deleted, because `check:hero-light` runs in `a11y-site.yml` and
 * this is where a reader of that workflow will look for the claim.
 *
 * Both run with motion stilled, so the measurement does not race the animation.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null) ?? "http://127.0.0.1:3000";
const outDir = "design-assets/identity/v1/verification";
const mesh = JSON.parse(await readFile("apps/web/src/components/hero-mesh.json", "utf8"));
const record = { base, measuredAt: new Date().toISOString(), routes: mesh.routes.length, junctions: mesh.nodes.length };

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Tab across the page and report whether focus ever lands inside the hero. */
async function tabReachesHero(page, presses = 40) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      return !!active && !!active.closest?.(".kx-hero-polygon");
    });
    if (inside) return await page.evaluate(() => document.activeElement.outerHTML.slice(0, 120));
  }
  return null;
}

// ── 1. the lap, timed ────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem("kx-consent", "denied"));
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".kx-hero-polygon")?.dataset.running === "true");

  const read = () =>
    page.locator(".kx-mesh-pulses circle").evaluateAll((n) =>
      n.map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]),
    );

  // Route 0 is the longest-lived reference. Wait until it is close to a known
  // vertex, then time its return to that same vertex.
  const target = mesh.routes[0].v[0];
  const near = (p) => Math.hypot(p[0] - target[0], p[1] - target[1]);
  const settle = async () => {
    for (let i = 0; i < 400; i++) {
      if (near((await read())[0]) < 12) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  assert.ok(await settle(), "pulse 0 never passed its own starting vertex");
  // Leave the start behind before looking for the return, or the first sample wins.
  for (let i = 0; i < 100 && near((await read())[0]) < 40; i++) await page.waitForTimeout(100);
  const left = Date.now();
  assert.ok(await settle(), "pulse 0 never came back — the route does not close");
  const lap = (Date.now() - left) / 1000;

  const declared = mesh.routes[0].duration;
  record.lap = { measuredSeconds: Number(lap.toFixed(1)), declaredSeconds: declared };
  assert.ok(
    Math.abs(lap - declared) / declared < 0.35,
    `route 0 laps in ${lap.toFixed(1)}s but hero-mesh.json declares ${declared}s`,
  );
  await context.close();
}

// ── 2. there is no focus indicator, because there is nothing to focus ───────
//
// The hero is decoration (owner decision, 2026-11-06). Tab must cross the page
// without ever landing in it, and nothing inside it may be focusable — including
// the illustration itself, which is `aria-hidden`, so a tab stop there would put
// a keyboard user on something a screen reader cannot even announce.
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    (t) => {
      localStorage.setItem("kx-consent", "denied");
      localStorage.setItem("theme", t);
    },
    theme,
  );
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(200);

  const focusable = await page.locator(".kx-hero-polygon").evaluate(
    (el) => el.querySelectorAll("[tabindex], a, button, input, select, textarea, [contenteditable]").length,
  );
  assert.equal(focusable, 0, `${theme}: the hero contains ${focusable} focusable element(s) — it is decoration`);

  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  const landed = await tabReachesHero(page);
  assert.equal(landed, null, `${theme}: Tab reached the hero — focus landed on ${landed}`);

  // The wireframe's resting stroke, recorded rather than asserted: it is what
  // the focus indicator used to thicken to 2px, so a future reader comparing
  // this record against the old one can see the indicator is gone rather than
  // merely unmeasured.
  const wireframeStrokeWidth = await page.evaluate(() => {
    const links = document.querySelector(".kx-hero-polygon .kx-mesh-links");
    return links ? getComputedStyle(links).strokeWidth : null;
  });
  record[`heroFocus_${theme}`] = { focusableElements: focusable, tabReachedHero: false, wireframeStrokeWidth };
  await context.close();
}

await browser.close();
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/hero-light-results.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(
  `hero-light ok — lap ${record.lap.measuredSeconds}s against ${record.lap.declaredSeconds}s declared; ` +
    "the hero holds no focusable element and 40 Tab presses never land in it, in light or dark",
);
