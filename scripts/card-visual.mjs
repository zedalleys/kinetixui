/**
 * card-visual.mjs — the Card's visual contract, measured on rendered pixels in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/card-visual.mjs
 *
 * The surface slice (TOKENS.md, "Surface model") made claims about how a Card LOOKS: that its edge is
 * softer than the stroke of the controls inside it, that it is lifted off the page, that it sits above a
 * grouped section in both themes, that a static card does not react to the pointer, and that an
 * interactive one has hover, pressed, selected and focus states a person can tell apart. None of that is
 * provable from class names, and jsdom has no pixels. So this opens the Card stories in Chromium, in
 * light and dark, drives each state with a real mouse and keyboard, screenshots the card, and reads the
 * pixels back.
 *
 * ── Why rendered measurements and not snapshot diffs ──────────────────────
 *
 * A screenshot-diff baseline is only as stable as the machine that recorded it. Text antialiasing and the
 * fallback font differ between a laptop, this container and a CI runner, so a committed PNG fails for
 * reasons that are not regressions, and a gate that fails for those reasons gets its tolerance raised
 * until it stops catching anything. Every sample here is taken away from text — an edge crossing, the
 * band under the card, a patch of empty surface — and every assertion is a RELATION between two
 * renderings in the same run (rest vs hover, card vs page), so the font the runner happens to have does
 * not enter into it. A small committed-snapshot set is the follow-up, recorded on the runner image.
 *
 * ── What it asserts, per theme ────────────────────────────────────────────
 *
 *   edge      the resting card's edge contrasts with the page LESS than the input's border inside it
 *   lift      light: the band under the card is darker than the page (the elevation renders)
 *   grouped   the card's surface is lighter than the grouped section it sits on
 *   static    hovering a static card changes no pixel, and its cursor stays `auto`
 *   hover     an interactive card's edge strengthens under the pointer
 *   pressed   pressing changes the fill, so pressed is not hover
 *   selected  the selected edge is at least twice as thick as the resting edge, and clears 3:1 —
 *             weight, not only hue
 *   focus     the keyboard ring clears 3:1 against the page and out-contrasts hover
 *   motion    hover runs a box-shadow transition with a rendered midpoint over a perceptible duration;
 *             under prefers-reduced-motion it runs none and lands on the same end state
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { contrast, decode, lum, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

// This gate measures React's Card only; visual-gates.mjs records that, and the Angular graduation guard
// reads it. Adding an Angular pass here means adding Angular to its `covers` entry.
if (Object.keys(gate("scripts/card-visual.mjs").covers).join() !== "React") throw new Error("card-visual: visual-gates.mjs disagrees with what this gate runs");

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
assertUiDistMatchesSource("card-visual");

const STORY = {
  default: "data-display-card--default",
  grouped: "data-display-card--grouped",
  interactive: "data-display-card--interactive",
};
const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
for (const id of Object.values(STORY)) {
  if (!index.entries[id]) {
    console.error(`card-visual: story ${id} is not in the built Storybook — gen:stories and build-storybook first.`);
    process.exit(2);
  }
}

const { base, close } = await serveStatic(staticDir);

const DPR = 2;
/** a settle long enough for the 200ms `duration-fast` transition to finish */
const SETTLE = 450;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/**
 * A frame of the region around `rect`, with accessors in page CSS pixels. Clipped because decoding a full
 * viewport at 2x is millions of pixels for a few hundred samples.
 */
async function frame(page, rect, pad = 24) {
  const clip = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.width + 2 * pad, height: rect.height + 2 * pad };
  const img = decode(await page.screenshot({ clip }));
  const dx = (x) => Math.round((x - clip.x) * DPR);
  const dy = (y) => Math.round((y - clip.y) * DPR);
  return {
    img,
    /** a page-coloured pixel: just inside the clip's top-left corner, outside every card */
    corner: () => {
      const i = (2 * img.w + 2) * 4;
      return [img.data[i], img.data[i + 1], img.data[i + 2]];
    },
    at(x, y) {
      const px = dx(x);
      const py = dy(y);
      const i = (py * img.w + px) * 4;
      return [img.data[i], img.data[i + 1], img.data[i + 2]];
    },
    /** device pixels along a vertical line, top to bottom, between two CSS y values */
    column(x, y0, y1) {
      const px = dx(x);
      const out = [];
      for (let py = dy(y0); py <= dy(y1); py++) {
        const i = (py * img.w + px) * 4;
        out.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
      }
      return out;
    },
    /** device pixels along a horizontal line */
    row(y, x0, x1) {
      const py = dy(y);
      const out = [];
      for (let px = dx(x0); px <= dx(x1); px++) {
        const i = (py * img.w + px) * 4;
        out.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
      }
      return out;
    },
  };
}
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * The card's top edge, read along a vertical line through its middle: the strongest contrast any pixel on
 * the crossing reaches against the page, and its THICKNESS — how many device pixels on the crossing stand
 * apart (by `minRatio`) from both the page above and the card's own surface below. The line runs from
 * outside the card into its padding, so it crosses the edge and nothing else.
 */
function edge(f, rect, page, minRatio = 1.05) {
  const x = rect.x + rect.width / 2;
  const inside = f.at(x, rect.y + 10);
  const px = f.column(x, rect.y - 6, rect.y + 6);
  const ratios = px.map((p) => contrast(p, page));
  const thick = px.filter((p) => contrast(p, page) >= minRatio && contrast(p, inside) >= minRatio).length;
  return { max: Math.max(...ratios), thick };
}
/** the input's left border, read along a horizontal line through its middle */
function inputEdge(f, rect, page) {
  const px = f.row(rect.y + rect.height / 2, rect.x - 3, rect.x + 3);
  return Math.max(...px.map((p) => contrast(p, page)));
}
/** mean luminance of the band 1–3px under the card's bottom edge, where its contact shadow falls */
function band(f, rect) {
  const xs = [0.3, 0.5, 0.7].map((t) => rect.x + rect.width * t);
  const ys = [1, 2, 3].map((d) => rect.y + rect.height + d);
  const ls = xs.flatMap((x) => ys.map((y) => lum(f.at(x, y))));
  return ls.reduce((a, b) => a + b, 0) / ls.length;
}
/** a patch of the card's own surface: inside the padding, below the top-left corner radius, no text */
const surface = (f, rect) => f.at(rect.x + 10, rect.y + rect.height - 10);

/* ── run ────────────────────────────────────────────────────────────────── */
const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(44)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};
const r2 = (n) => n.toFixed(2);

async function open(context, id, theme) {
  const page = await context.newPage();
  // Hermetic: the stories are local, and anything remote (a web-font request) only makes the screenshot
  // wait on the network. The surface samples are taken away from text, so the font does not matter.
  await page.route((url) => !url.href.startsWith(base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`, { waitUntil: "load" });
  await page.waitForSelector("#storybook-root > *");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  return page;
}
const rectOf = (page, sel) => page.locator(sel).first().boundingBox();

for (const theme of ["light", "dark"]) {
  report.push(`\n${theme}`);
  const context = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: DPR });

  // ── default: edge, lift, static ──
  {
    const page = await open(context, STORY.default, theme);
    const card = await rectOf(page, "#storybook-root .bg-card");
    const input = await rectOf(page, "#storybook-root input");
    const rest = await frame(page, card);
    const pageColour = rest.corner();

    const e = edge(rest, card, pageColour);
    const ie = inputEdge(rest, input, pageColour);
    check(e.max < ie, `${theme} edge softer than the controls' stroke`, `card ${r2(e.max)}:1 vs input ${r2(ie)}:1`);

    if (theme === "light") {
      const under = band(rest, card);
      const lift = (lum(pageColour) + 0.05) / (under + 0.05);
      check(lift >= 1.05, `${theme} lifted off the page`, `band under the card ${r2(lift)}:1 against the page (needs 1.05)`);
    } else {
      // A black shadow on a near-black page has almost nothing to darken; the dark theme's lift is the
      // surface step, and it is asserted here instead of pretending the shadow carries it.
      const step = contrast(surface(rest, card), pageColour);
      check(step >= 1.05, `${theme} surface lifted off the page`, `card surface ${r2(step)}:1 against the page (needs 1.05)`);
    }

    await page.mouse.move(card.x + card.width / 2, card.y + 12);
    await page.waitForTimeout(SETTLE);
    const hovered = await frame(page, card);
    let changed = 0;
    for (let y = card.y - 8; y <= card.y + card.height + 8; y += 2) {
      for (let x = card.x - 8; x <= card.x + card.width + 8; x += 2) if (!same(rest.at(x, y), hovered.at(x, y))) changed++;
    }
    const cursor = await page.locator("#storybook-root .bg-card").first().evaluate((el) => getComputedStyle(el).cursor);
    check(changed === 0 && cursor === "auto", `${theme} static card ignores the pointer`, `${changed} sampled pixel(s) changed, cursor ${cursor}`);
    await page.close();
  }

  // ── grouped: the card sits above the section ──
  {
    const page = await open(context, STORY.grouped, theme);
    const section = await rectOf(page, "#storybook-root section");
    const card = await rectOf(page, "#storybook-root section .bg-card");
    const f = await frame(page, section);
    const group = f.at(section.x + 6, section.y + section.height - 6);
    const cardSurface = surface(f, card);
    check(lum(cardSurface) > lum(group), `${theme} card above its grouped section`, `card L ${lum(cardSurface).toFixed(4)} vs group L ${lum(group).toFixed(4)}`);
    await page.close();
  }

  // ── interactive: hover, pressed, selected, focus ──
  {
    const page = await open(context, STORY.interactive, theme);
    const link = 'a[href="#reports-q3"]';
    const current = 'a[aria-current="page"]';
    const pressedOn = 'button[aria-pressed="true"]';
    const card = await rectOf(page, link);
    const grid = await rectOf(page, "#storybook-root > div");
    const shot = () => frame(page, grid);
    const rest = await shot();
    const pageColour = rest.corner();
    const restEdge = edge(rest, card, pageColour);

    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await page.waitForTimeout(SETTLE);
    const hover = await shot();
    const hoverEdge = edge(hover, card, pageColour);
    check(hoverEdge.max > restEdge.max * 1.1, `${theme} hover strengthens the edge`, `${r2(restEdge.max)}:1 → ${r2(hoverEdge.max)}:1`);
    const cursor = await page.locator(link).evaluate((el) => getComputedStyle(el).cursor);
    check(cursor === "pointer", `${theme} interactive card has a pointer cursor`, cursor);

    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const pressed = await shot();
    const fillShift = contrast(surface(pressed, card), surface(hover, card));
    check(fillShift >= 1.02, `${theme} pressed differs from hover`, `fill ${r2(fillShift)}:1 against hover's`);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);

    const settled = await shot();
    for (const sel of [current, pressedOn]) {
      const r = await rectOf(page, sel);
      // Weight, not only hue: the selected edge is 2 CSS px where the resting one is 1, and it clears 3:1.
      const selected = edge(settled, r, pageColour);
      const resting = edge(settled, card, pageColour);
      check(
        selected.max >= 3 && selected.thick >= 2 * DPR && selected.thick >= 2 * Math.max(1, resting.thick) - 1,
        `${theme} selected ${sel.startsWith("a") ? "link (aria-current)" : "toggle (aria-pressed)"}`,
        `edge ${r2(selected.max)}:1, ${selected.thick} device px thick vs resting ${resting.thick}`,
      );
    }

    await page.close();

    // A fresh page, so the press above has not already moved focus: the first Tab lands on the first card.
    const kb = await open(context, STORY.interactive, theme);
    await kb.keyboard.press("Tab");
    await kb.waitForTimeout(SETTLE);
    const focused = await kb.evaluate((s) => document.activeElement === document.querySelector(s), link);
    const ring = edge(await frame(kb, grid), card, pageColour);
    check(focused && ring.max >= 3 && ring.max > hoverEdge.max, `${theme} focus ring out-contrasts hover`, `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring.max)}:1 vs hover ${r2(hoverEdge.max)}:1`);
    await kb.close();
  }

  // ── motion: a rendered midpoint, and none under reduced motion ──
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await open(ctx, STORY.interactive, theme);
    const sel = 'a[href="#reports-q3"]';
    const box = await rectOf(page, sel);
    const before = await page.locator(sel).evaluate((el) => getComputedStyle(el).boxShadow);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const m = await page.locator(sel).evaluate((el) => {
      const t = el.getAnimations().find((a) => a.transitionProperty === "box-shadow");
      if (!t) return { none: true, end: null };
      const duration = t.effect.getComputedTiming().duration;
      t.pause();
      t.currentTime = duration / 2;
      const mid = getComputedStyle(el).boxShadow;
      t.finish();
      return { none: false, duration, mid, end: getComputedStyle(el).boxShadow };
    });
    await page.waitForTimeout(SETTLE);
    const end = await page.locator(sel).evaluate((el) => getComputedStyle(el).boxShadow);
    if (!reduced) {
      check(
        !m.none && m.duration >= PERCEPTIBLE_MS && m.mid !== before && m.mid !== end,
        `${theme} hover elevation animates`,
        m.none ? "no box-shadow transition ran" : `${Math.round(m.duration)}ms, midpoint ${m.mid === before || m.mid === end ? "equals an end state" : "between the two"}`,
      );
      report.normalEnd = end;
    } else {
      check(
        (m.none || m.duration <= SUPPRESSED_MS) && end === report.normalEnd,
        `${theme} reduced motion lands without animating`,
        `${m.none ? "no transition" : `${m.duration}ms transition`}, end state ${end === report.normalEnd ? "matches" : "DIFFERS from"} normal motion`,
      );
    }
    await ctx.close();
  }
  await context.close();
}

await browser.close();
close();
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ card-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log("\ncard-visual ok — Card's surface and state contract holds in light and dark, on rendered pixels.");
