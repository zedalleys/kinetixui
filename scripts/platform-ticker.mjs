/**
 * platform-ticker.mjs — real-browser proof for the homepage's supported-platform ticker.
 *
 *   pnpm build:web && pnpm --filter @kinetixui/web start &
 *   node scripts/platform-ticker.mjs [--base http://127.0.0.1:3000] [--json]
 *
 * The ticker is the one place on the homepage that names every platform KinetixUI ships, and it moves. Both facts
 * need a browser: jsdom has no layout and runs no CSS animation, so a unit test can say which elements exist but
 * not whether the loop jumps, whether a copy leaves a blank gap at a wide viewport, or whether the reduced-motion
 * presentation still fits on a phone. What this asserts, per view:
 *
 *   canonical   the accessibility tree names each platform in `platform-parity.json` exactly once, in order, as
 *               list items, with no "logo" noise; every item carries that platform's mark, decorative and square
 *   seamless    after one animation cycle the second copy sits exactly where the first one started (the loop
 *               boundary is invisible), spacing across the seam equals spacing inside a copy, and the easing is
 *               linear (constant velocity)
 *   no gap      at five phases of the cycle the moving strip covers the whole visible window — the failure a wide
 *               viewport shows when one copy of the list is narrower than the window
 *   pause       a keyboard-operable control stops the movement (WCAG 2.2.2) and starts it again
 *   reduced     under prefers-reduced-motion nothing moves, the duplicate copies are not rendered, and every
 *               platform is fully visible inside the band (it wraps rather than being clipped)
 *   RTL         the same seam and coverage checks with the document in `dir="rtl"`
 *   200% text   the same checks with Chrome's default font size doubled (CDP `Page.setFontSizes`, as a11y-site does)
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const asJson = process.argv.includes("--json");

const parity = JSON.parse(readFileSync(new URL("../platform-parity.json", import.meta.url), "utf8"));
/** The canonical platform truth, in canonical order. Nothing here names a platform. */
const CANONICAL = parity.platforms.map((p) => ({ id: p, label: parity.platformDefinitions[p].label }));

// TICKER_ROOT lets the same assertions measure an older ticker markup (`.kx-marquee`) for a before/after comparison.
const ROOT = process.env.TICKER_ROOT || "[data-platform-ticker]";
const WIDTHS = [320, 390, 1280, 1920];
/** Sub-pixel rounding allowance for geometry comparisons. */
const EPS = 0.75;

const failures = [];
const report = [];
const fail = (view, msg) => failures.push(`${view}: ${msg}`);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Geometry of the ticker at a given phase (0..1) of its animation, or the static layout when nothing animates. */
async function geometry(page, phase) {
  return page.evaluate(
    ({ ROOT, phase }) => {
      const root = document.querySelector(ROOT);
      if (!root) return { error: "ticker root not found" };
      const track = root.querySelector(".kx-marquee-track");
      const anims = track ? track.getAnimations().filter((a) => a.playState !== "idle") : [];
      const anim = anims[0] ?? null;
      let durationMs = 0;
      if (anim && phase !== null) {
        durationMs = Number(anim.effect.getComputedTiming().duration) || 0;
        anim.pause();
        anim.currentTime = durationMs * phase;
      }
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
      };
      const lists = track ? [...track.children] : [];
      const copies = lists.map((list) => ({
        rendered: list.getClientRects().length > 0,
        ariaHidden: list.getAttribute("aria-hidden"),
        inert: list.hasAttribute("inert"),
        items: [...list.children].map((li) => {
          const svg = li.querySelector("svg");
          return {
            text: li.textContent.trim(),
            rect: r(li),
            clipped: li.scrollWidth > li.clientWidth + 1 || li.scrollHeight > li.clientHeight + 1,
            logo: svg
              ? {
                  platform: svg.getAttribute("data-platform-logo"),
                  ariaHidden: svg.getAttribute("aria-hidden"),
                  focusable: svg.getAttribute("focusable"),
                  hasWidthAttr: svg.hasAttribute("width") && svg.hasAttribute("height"),
                  rect: r(svg),
                }
              : null,
          };
        }),
      }));
      return {
        root: r(root),
        band: r(root.parentElement),
        animated: anims.length,
        running: anims.filter((a) => a.playState === "running").length,
        playState: track ? getComputedStyle(track).animationPlayState : null,
        timing: track ? getComputedStyle(track).animationTimingFunction : null,
        durationMs,
        copies,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    },
    { ROOT, phase },
  );
}

/** What assistive technology gets from the ticker: Playwright's aria snapshot of its root. */
const ariaOf = (page) => page.locator(ROOT).ariaSnapshot();

function checkCanonical(view, g, aria) {
  const visible = g.copies.filter((c) => c.ariaHidden !== "true");
  if (visible.length !== 1) fail(view, `expected exactly one copy exposed to assistive technology, found ${visible.length}`);
  for (const c of g.copies.slice(1)) {
    if (c.ariaHidden !== "true" || !c.inert) fail(view, "a duplicate loop copy is not aria-hidden + inert");
  }
  const first = g.copies[0];
  if (!first) return fail(view, "no platform list rendered");
  const texts = first.items.map((i) => i.text);
  const want = CANONICAL.map((p) => p.label);
  if (JSON.stringify(texts) !== JSON.stringify(want)) fail(view, `platforms ${JSON.stringify(texts)} ≠ canonical ${JSON.stringify(want)}`);
  first.items.forEach((item, i) => {
    const p = CANONICAL[i];
    if (!p) return;
    if (!item.logo) return fail(view, `${p.label} has no logo`);
    if (item.logo.platform !== p.id) fail(view, `${p.label} carries the ${item.logo.platform} logo`);
    if (item.logo.ariaHidden !== "true") fail(view, `${p.label} logo is not aria-hidden (would be announced next to its own name)`);
    if (!item.logo.hasWidthAttr) fail(view, `${p.label} logo has no intrinsic width/height (layout can shift before CSS applies)`);
    if (Math.abs(item.logo.rect.width - item.logo.rect.height) > EPS || item.logo.rect.width < 12)
      fail(view, `${p.label} logo box is ${item.logo.rect.width}×${item.logo.rect.height} — distorted or too small`);
  });
  // Assistive technology: one named list, each label once, nothing about logos.
  if (!/- list "[^"]+"/.test(aria)) fail(view, "the platforms are not exposed as a named list");
  for (const p of CANONICAL) {
    const n = aria.split("\n").filter((l) => l.includes(`listitem: ${p.label}`) || l.trim() === `- listitem: ${p.label}`).length;
    if (n !== 1) fail(view, `assistive technology hears "${p.label}" ${n} times, expected once`);
  }
  if (/logo|img/i.test(aria)) fail(view, `the accessibility tree mentions a logo/image: ${aria}`);
}

/** The flattened item sequence across rendered copies, in visual order along the track. */
const sequence = (g) => g.copies.filter((c) => c.rendered).flatMap((c) => c.items.map((i) => i.rect));

function checkMotion(view, page, gAt) {
  return (async () => {
    const g0 = await gAt(0);
    if (g0.animated === 0) return fail(view, "the ticker does not animate under normal motion");
    if (g0.timing !== "linear") fail(view, `easing is ${g0.timing}, not linear — velocity is not constant`);
    const copies = g0.copies.filter((c) => c.rendered);
    if (copies.length < 2) return fail(view, "fewer than two rendered copies — the loop cannot be seamless");
    // Seam: one full cycle moves copy[1] onto copy[0]'s starting position.
    // The strip is two identical halves of `copies.length / 2` lists each, so after one cycle the first list of
    // the second half sits exactly where the first list started.
    if (copies.length % 2) fail(view, `${copies.length} rendered copies — the strip is not two identical halves`);
    const half = Math.max(1, Math.floor(copies.length / 2));
    const end = await gAt(1 - 1e-6);
    const startX = copies[0].items[0].rect.left;
    const landedX = end.copies.filter((c) => c.rendered)[half].items[0].rect.left;
    const seamError = Math.abs(landedX - startX);
    if (seamError > EPS) fail(view, `loop boundary jumps by ${seamError.toFixed(2)}px`);
    // Spacing: every adjacent pair, including across copies, has the same gap.
    const seq = sequence(g0);
    const gaps = seq.slice(1).map((b, i) => (seq[i].left < b.left ? b.left - seq[i].right : seq[i].left - b.right));
    const spread = Math.max(...gaps) - Math.min(...gaps);
    if (spread > EPS) fail(view, `item spacing varies by ${spread.toFixed(2)}px across the loop (seam anomaly)`);
    // Coverage: the strip fills the window at every sampled phase.
    let worstGap = 0;
    for (const phase of [0, 0.25, 0.5, 0.75, 0.999]) {
      const g = await gAt(phase);
      const rects = sequence(g);
      const left = Math.min(...rects.map((x) => x.left));
      const right = Math.max(...rects.map((x) => x.right));
      worstGap = Math.max(worstGap, left - g.root.left, g.root.right - right);
    }
    if (worstGap > EPS) fail(view, `blank gap of ${worstGap.toFixed(1)}px inside the ticker window at some phase`);
    const travel = Math.abs(end.copies[0].items[0].rect.left - copies[0].items[0].rect.left);
    return { seamError, spacingSpread: spread, worstGap, velocityPxPerS: g0.durationMs ? (travel / g0.durationMs) * 1000 : null, durationMs: g0.durationMs };
  })();
}

function checkFits(view, g) {
  if (g.pageOverflow) fail(view, "page overflows horizontally");
  for (const item of g.copies[0]?.items ?? []) {
    if (item.clipped) fail(view, `"${item.text}" is clipped inside its item`);
    if (item.rect.top < g.root.top - EPS || item.rect.bottom > g.root.bottom + EPS)
      fail(view, `"${item.text}" is cut off vertically by the ticker band`);
  }
}

async function run(view, { width, textScale = 1, rtl = false, reduced = false }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await context.newPage();
  if (textScale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
  }
  await page.goto(base + "/", { waitUntil: "networkidle" });
  if (rtl) await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  await page.waitForTimeout(100);
  const row = { view };
  const gStatic = await geometry(page, null);
  if (gStatic.error) {
    fail(view, gStatic.error);
    await context.close();
    return;
  }
  if (textScale !== 1 && gStatic.rootFont !== 16 * textScale) fail(view, `root font-size is ${gStatic.rootFont}px — text scale not applied`);
  checkCanonical(view, gStatic, await ariaOf(page));
  checkFits(view, gStatic);
  if (reduced) {
    if (gStatic.running > 0) fail(view, `${gStatic.running} animation(s) still running under reduced motion`);
    for (const c of gStatic.copies.slice(1)) if (c.rendered) fail(view, "a duplicate copy is still rendered under reduced motion");
    for (const item of gStatic.copies[0]?.items ?? []) {
      if (item.rect.left < gStatic.root.left - EPS || item.rect.right > gStatic.root.right + EPS)
        fail(view, `"${item.text}" is outside the visible band under reduced motion`);
    }
    const pause = page.locator(`${ROOT} ~ button, [data-platform-ticker-pause]`);
    if ((await pause.count()) && (await pause.first().isVisible())) fail(view, "pause control shown although nothing moves");
    row.bandHeightPx = gStatic.root.height;
    row.itemTops = new Set(gStatic.copies[0].items.map((i) => Math.round(i.rect.top))).size;
  } else {
    Object.assign(row, await checkMotion(view, page, (phase) => geometry(page, phase)));
    // Pause: keyboard-operable, toggles the play state both ways. Reload so the probe's own pause is gone.
    await page.reload({ waitUntil: "networkidle" });
    if (rtl) await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    const button = page.locator("[data-platform-ticker-pause]");
    if ((await button.count()) !== 1) fail(view, "no pause control for the moving ticker (WCAG 2.2.2)");
    else {
      await button.focus();
      await page.keyboard.press("Enter");
      const paused = await geometry(page, null);
      if (paused.playState !== "paused" || (await button.getAttribute("aria-pressed")) !== "true")
        fail(view, `pause control did not pause (play state ${paused.playState})`);
      await page.keyboard.press("Space");
      const resumed = await geometry(page, null);
      if (resumed.playState !== "running" || (await button.getAttribute("aria-pressed")) !== "false")
        fail(view, `pause control did not resume (play state ${resumed.playState})`);
    }
  }
  report.push(row);
  await context.close();
}

for (const width of WIDTHS) {
  await run(`${width}px`, { width });
  await run(`${width}px reduced`, { width, reduced: true });
}
await run("390px 200% text", { width: 390, textScale: 2 });
await run("1920px 200% text", { width: 1920, textScale: 2 });
await run("390px 200% text reduced", { width: 390, textScale: 2, reduced: true });
await run("1280px rtl", { width: 1280, rtl: true });
await run("1920px rtl", { width: 1920, rtl: true });
await run("390px rtl reduced", { width: 390, rtl: true, reduced: true });

await browser.close();

if (asJson) console.log(JSON.stringify({ canonical: CANONICAL, report, failures }, null, 2));
else for (const r of report) console.log(`  ${r.view.padEnd(26)} ${JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== "view").map(([k, v]) => [k, typeof v === "number" ? +v.toFixed(2) : v])))}`);
if (failures.length) {
  console.error(`platform-ticker: ${failures.length} failure(s)\n` + failures.map((f) => "  ✗ " + f).join("\n"));
  process.exit(1);
}
console.log(`platform-ticker: ${CANONICAL.length} canonical platforms, ${report.length} views — seamless, gap-free, pausable, static under reduced motion`);
