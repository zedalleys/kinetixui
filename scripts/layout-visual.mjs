/**
 * layout-visual.mjs — the layout and pointer state contract, measured on rendered pixels.
 *
 *   pnpm build:tokens && node scripts/layout-visual.mjs
 *
 * The Angular layout, pointer and scroll tranche (TOKENS.md, "Layout and pointer") draws four positions — how far a
 * scroll area has scrolled, where a resizable boundary sits, which slide a carousel shows, where a comparison
 * divider is — and the states of the parts a reader moves them with. This gate renders the live Angular
 * application (src/fixtures/layout.ts, painted by the package's own styles.css and the generated token CSS) in
 * Chromium, drives each state with a real keyboard and pointer, and reads it back off the screen:
 *
 *   scroll area   the thumb at rest clears 3:1 against the page; hover and drag draw it stronger; the bars sit
 *                 beside the content (the vertical one at the inline end), never over it; the viewport's
 *                 keyboard focus ring clears 3:1 on all four edges; at 200% text the bar is twice as thick
 *   resizable     the rule at rest is the `border` token; hover and drag draw it in the `action` token, wider,
 *                 clearing 3:1 against the panel; keyboard focus draws a ring beside it that clears 3:1; the grip's
 *                 dots clear 3:1 against the grip; disabled is drawn at the disabled opacity and hover changes
 *                 nothing; at 200% text the grip is twice the size
 *   carousel      Previous and Next are centred on the slides, inside the carousel's box, at its inline start and
 *                 end; their glyphs clear 3:1 and point toward the inline start and end (so they mirror in RTL);
 *                 keyboard focus draws a ring that clears 3:1; at an end the control is drawn at the disabled
 *                 opacity and hover paints no layer on it; a slide that takes focus draws a ring that clears 3:1
 *   comparison    the divider is drawn at the value from the inline start, its edge clearing 3:1 against the
 *                 layers; the handle's grip clears 3:1 against the handle; keyboard focus draws a ring around the
 *                 handle that clears 3:1; the labels are readable (4.5:1) and the before label is at the inline
 *                 start
 *
 * Light and dark, LTR and RTL, at the default text size and at 200%. Thresholds appear only where a standard
 * names one (3:1, SC 1.4.11; 4.5:1, SC 1.4.3); every other assertion is a relation between two renderings in
 * the same run.
 *
 * Angular only: React's layout components are not changed by this tranche and are not measured here
 * (visual-gates.mjs).
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { rmSync } from "node:fs";
import { chromium } from "playwright";
import { buildAngularSubject, waitForAngular, contrast, framer, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const COVERS = new Set(gate("scripts/layout-visual.mjs").covers.Angular);
const DPR = 2;
const PAD = 12;
const frame = framer({ dpr: DPR, pad: PAD });
const VIEWPORT = { width: 1024, height: 800 };

const dir = buildAngularSubject("layout", { name: "layout-visual", layout: "" });
const server = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(theme, { rtl = false, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${server.base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
  await waitForAngular(page);
  if (scale !== 1) await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * scale);
  await page.mouse.move(0, 0);
  await rest(page);
  return { page, close: () => context.close() };
}
const rest = (page) =>
  page.evaluate(() =>
    window.kxHarness
      .settle()
      .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      .then(() => Promise.allSettled(document.getAnimations().map((a) => a.finished))),
  );
async function key(page, k) {
  await page.keyboard.press(k);
  await rest(page);
}
async function keyboardFocus(page, sel) {
  await page.keyboard.press("Shift");
  await page.locator(sel).first().focus();
  await rest(page);
}
async function box(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  return page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().toJSON());
}
const token = (page, name) =>
  page.evaluate((v) => {
    const probe = document.createElement("i");
    probe.style.color = `hsl(var(${v}))`;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    probe.remove();
    return rgb;
  }, name);
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const style = (page, sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);
const pageBg = async (page) => rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
const disabledOpacity = (page) => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--opacity-disabled")) || null);
const r2 = (n) => n.toFixed(2);
/** The strongest contrast against `ref` along a short line, both ends inclusive. */
function strongest(f, ref, [x0, y0], [x1, y1]) {
  let best = 1;
  const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * DPR);
  for (let i = 0; i <= n; i++) best = Math.max(best, contrast(f.at(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n), ref));
  return best;
}
/** The strongest contrast against `ref` anywhere in a box (every device pixel). */
function inkIn(f, ref, b) {
  let best = 1;
  for (let y = b.y + 0.5; y <= b.y + b.height - 0.5; y += 1 / DPR) best = Math.max(best, strongest(f, ref, [b.x + 0.5, y], [b.x + b.width - 0.5, y]));
  return best;
}

const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(96)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};
const variant = (theme, rtl, scale) => `${theme} ${rtl ? "rtl" : "ltr"} ${scale * 100}%`;

/* ── scroll area ────────────────────────────────────────────────────────── */

const thickness = {};
async function scrollArea(theme, rtl, scale) {
  const name = `${variant(theme, rtl, scale)} scroll-area`;
  const { page, close } = await open(theme, { rtl, scale });
  const bg = await pageBg(page);
  const host = "#sa-vertical";
  const view = await box(page, `${host} > .kx-scroll-area__viewport`);
  const bar = await box(page, `${host} > .kx-scroll-area__scrollbar[data-orientation="vertical"]`);
  const thumb = await box(page, `${host} .kx-scroll-area__thumb`);
  const all = { x: Math.min(view.x, bar.x), y: view.y, width: Math.max(view.right, bar.right) - Math.min(view.x, bar.x), height: view.height };
  const f = await frame(page, all);
  const tc = [thumb.x + thumb.width / 2, thumb.y + thumb.height / 2];
  const restC = contrast(f.at(...tc), bg);
  check(restC >= 3, `${name}: the thumb at rest clears 3:1 against the page`, `${r2(restC)}:1`);
  check(rtl ? bar.right <= view.x + 0.5 : bar.x >= view.right - 0.5, `${name}: the bar is beside the content, at the inline end`, `view ${view.x.toFixed(0)}–${view.right.toFixed(0)}, bar ${bar.x.toFixed(0)}–${bar.right.toFixed(0)}`);
  // the content's own column next to the bar carries no thumb ink
  const edgeX = rtl ? view.x + 1 : view.right - 1;
  const edgeInk = strongest(f, bg, [edgeX, thumb.y + 2], [edgeX, thumb.bottom - 2]);
  check(edgeInk < 1.5 || contrast(f.at(edgeX, thumb.y + thumb.height / 2), f.at(...tc)) > 1.5, `${name}: the thumb is not drawn over the content`, `${r2(edgeInk)}:1 at the content's edge`);
  thickness[`${theme}${rtl}${scale}`] = bar.width;
  if (scale === 2) {
    const one = thickness[`${theme}${rtl}1`];
    check(one && bar.width >= one * 1.9, `${name}: the bar is twice as thick at 200% text`, `${one?.toFixed(1)} -> ${bar.width.toFixed(1)}px`);
  }
  // hover, then drag: stronger than rest
  await page.mouse.move(...tc);
  await rest(page);
  const hoverC = contrast((await frame(page, all)).at(...tc), bg);
  check(hoverC > restC + 0.5, `${name}: hover draws the thumb stronger`, `${r2(restC)} -> ${r2(hoverC)}:1`);
  await page.mouse.down();
  await page.mouse.move(tc[0], tc[1] + 4);
  await page.mouse.move(rtl ? view.x - 40 : view.right + 40, tc[1] + 4); // off the bar: hover no longer applies
  await rest(page);
  const dragThumb = await box(page, `${host} .kx-scroll-area__thumb`);
  const dc = [dragThumb.x + dragThumb.width / 2, dragThumb.y + dragThumb.height / 2];
  const dragC = contrast((await frame(page, all)).at(...dc), bg);
  check(dragC > restC + 0.5, `${name}: a drag keeps the thumb strong after the pointer leaves the bar`, `${r2(dragC)}:1`);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  // keyboard focus ring inside the viewport's edge
  await keyboardFocus(page, `${host} > .kx-scroll-area__viewport`);
  const ff = await frame(page, view);
  const mid = [view.x + view.width / 2, view.y + view.height / 2];
  const edges = {
    top: strongest(ff, bg, [mid[0], view.y + 0.25], [mid[0], view.y + 2]),
    bottom: strongest(ff, bg, [mid[0], view.bottom - 2], [mid[0], view.bottom - 0.25]),
    start: strongest(ff, bg, [view.x + 0.25, mid[1]], [view.x + 2, mid[1]]),
    end: strongest(ff, bg, [view.right - 2, mid[1]], [view.right - 0.25, mid[1]]),
  };
  const worst = Math.min(...Object.values(edges));
  check(worst >= 3, `${name}: keyboard focus draws a ring inside all four edges that clears 3:1`, Object.entries(edges).map(([k, v]) => `${k} ${r2(v)}`).join(", "));
  await close();
}

/* ── resizable ──────────────────────────────────────────────────────────── */

const grips = {};
async function resizable(theme, rtl, scale) {
  const name = `${variant(theme, rtl, scale)} resizable`;
  const { page, close } = await open(theme, { rtl, scale });
  const bg = await pageBg(page);
  const border = await token(page, "--border");
  const action = await token(page, "--action");
  const H = "#rz-h-handle";
  const h = await box(page, H);
  const grip = await box(page, `${H} .kx-resizable__grip`);
  const area = { x: h.x - 20, y: h.y, width: h.width + 40, height: h.height };
  const x = h.x + h.width / 2;
  const y = h.y + Math.min(12, (grip.y - h.y) / 2); // on the rule, clear of the grip
  let f = await frame(page, area);
  check(contrast(f.at(x, y), border) < 1.15, `${name}: the rule at rest is the border token`, `${f.at(x, y)} vs ${border}`);
  // the grip's dots
  const gripFill = f.at(grip.x + 1.5, grip.y + grip.height / 2);
  const dots = inkIn(f, gripFill, { x: grip.x + 2, y: grip.y + 2, width: grip.width - 4, height: grip.height - 4 });
  check(dots >= 3, `${name}: the grip's dots clear 3:1 against the grip`, `${r2(dots)}:1`);
  grips[`${theme}${rtl}${scale}`] = grip.height;
  if (scale === 2) check(grip.height >= grips[`${theme}${rtl}1`] * 1.8, `${name}: the grip grows with the text`, `${grips[`${theme}${rtl}1`].toFixed(1)} -> ${grip.height.toFixed(1)}px`);
  // hover
  await page.mouse.move(x, y);
  await rest(page);
  f = await frame(page, area);
  const hoverInk = [x - 1, x, x + 1].map((px) => contrast(f.at(px, y), action));
  const hoverC = contrast(f.at(x, y), bg);
  check(hoverInk.every((c) => c < 1.15) && hoverC >= 3, `${name}: hover draws the rule in the action token, 3px wide, clearing 3:1`, `${r2(hoverC)}:1`);
  // drag (pointer off the handle)
  await page.mouse.down();
  await page.mouse.move(x + 2, y);
  await page.mouse.move(x + 2, y + 200);
  await rest(page);
  const h2 = await box(page, H);
  const x2 = h2.x + h2.width / 2;
  f = await frame(page, { x: h2.x - 20, y: h2.y, width: h2.width + 40, height: h2.height });
  check(contrast(f.at(x2, y), action) < 1.15, `${name}: dragging keeps the action rule with the pointer elsewhere`, `${f.at(x2, y)}`);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  // keyboard focus: a ring beside the rule
  await keyboardFocus(page, H);
  const h3 = await box(page, H);
  const x3 = h3.x + h3.width / 2;
  f = await frame(page, { x: h3.x - 20, y: h3.y, width: h3.width + 40, height: h3.height });
  const ring = strongest(f, bg, [x3 + 1, y], [x3 + 3, y]);
  check(ring >= 3, `${name}: keyboard focus draws a ring beside the rule that clears 3:1`, `${r2(ring)}:1`);
  await page.locator(H).evaluate((el) => el.blur());
  // disabled
  await page.locator("#rz-disable").click();
  await rest(page);
  const want = await disabledOpacity(page);
  const opacity = Number(await style(page, H, "opacity"));
  check(want !== null && Math.abs(opacity - want) < 0.01, `${name}: disabled is drawn at the disabled opacity`, `${opacity} (token ${want})`);
  const h4 = await box(page, H);
  const x4 = h4.x + h4.width / 2;
  const before = (await frame(page, area)).at(x4, y);
  await page.mouse.move(x4, y);
  await rest(page);
  check(contrast((await frame(page, area)).at(x4, y), before) < 1.05, `${name}: disabled: hover changes nothing`);
  await close();
}

/* ── carousel ───────────────────────────────────────────────────────────── */

/**
 * Which way a chevron glyph points: the column where its ink reaches furthest on its middle row, compared with
 * where it reaches on the rows above and below. A ‹ reaches furthest left in the middle.
 */
function pointing(f, ref, b) {
  const rows = [];
  for (let y = b.y + 1; y <= b.bottom - 1; y += 0.5) {
    const xs = [];
    for (let x = b.x + 1; x <= b.right - 1; x += 0.5) if (contrast(f.at(x, y), ref) >= 2) xs.push(x);
    if (xs.length) rows.push({ y, min: Math.min(...xs), max: Math.max(...xs) });
  }
  if (rows.length < 3) return null;
  const mid = rows[Math.floor(rows.length / 2)];
  const ends = [rows[0], rows.at(-1)];
  if (ends.every((e) => mid.min < e.min - 0.5)) return "left";
  if (ends.every((e) => mid.max > e.max + 0.5)) return "right";
  return null;
}
async function carouselVisual(theme, rtl, scale) {
  const name = `${variant(theme, rtl, scale)} carousel`;
  const { page, close } = await open(theme, { rtl, scale });
  const bg = await pageBg(page);
  const host = await box(page, "#cr-basic");
  const view = await box(page, "#cr-basic-content");
  const prev = await box(page, "#cr-basic-prev");
  const next = await box(page, "#cr-basic-next");
  const vc = view.y + view.height / 2;
  const centred = [prev, next].every((b) => Math.abs(b.y + b.height / 2 - vc) <= 1);
  const inside = [prev, next].every((b) => b.x >= host.x - 0.5 && b.right <= host.right + 0.5);
  const order = rtl ? prev.x > view.right - 0.5 && next.right < view.x + 0.5 : prev.right < view.x + 0.5 && next.x > view.right - 0.5;
  check(centred && inside && order, `${name}: Previous and Next are centred on the slides, inside the box, at its inline start and end`, `prev ${prev.x.toFixed(0)}, view ${view.x.toFixed(0)}–${view.right.toFixed(0)}, next ${next.x.toFixed(0)}`);
  check(Math.min(prev.width, prev.height, next.width, next.height) >= 24, `${name}: the controls are at least 24px`, `${prev.width.toFixed(0)}×${prev.height.toFixed(0)}`);
  // Next at rest (enabled): glyph ink and direction
  const glyph = await box(page, "#cr-basic-next .kx-carousel__glyph");
  let f = await frame(page, next);
  const ink = inkIn(f, bg, glyph);
  check(ink >= 3, `${name}: the Next glyph clears 3:1`, `${r2(ink)}:1`);
  const way = pointing(f, bg, glyph);
  check(way === (rtl ? "left" : "right"), `${name}: Next points toward the inline end`, `${way}`);
  // Previous at the start: disabled opacity, and hover paints no layer
  const want = await disabledOpacity(page);
  const opacity = Number(await style(page, "#cr-basic-prev", "opacity"));
  check(want !== null && Math.abs(opacity - want) < 0.01, `${name}: Previous at the start is drawn at the disabled opacity`, `${opacity} (token ${want})`);
  const pf = await frame(page, prev);
  const pin = [prev.x + prev.width / 2, prev.y + 3];
  const prevRest = pf.at(...pin);
  await page.mouse.move(prev.x + prev.width / 2, prev.y + prev.height / 2);
  await rest(page);
  check(contrast((await frame(page, prev)).at(...pin), prevRest) < 1.05, `${name}: hover paints no layer on a control at its end`);
  await page.mouse.move(0, 0);
  const pglyph = await box(page, "#cr-basic-prev .kx-carousel__glyph");
  check(pointing(await frame(page, prev), bg, pglyph) === (rtl ? "right" : "left"), `${name}: Previous points toward the inline start`);
  // keyboard focus on Next
  await keyboardFocus(page, "#cr-basic-next");
  f = await frame(page, next);
  const ring = strongest(f, bg, [next.x + next.width / 2, next.y - 3.5], [next.x + next.width / 2, next.y - 0.5]);
  check(ring >= 3, `${name}: keyboard focus on a control draws a ring that clears 3:1`, `${r2(ring)}:1`);
  // a slide taking focus (an arrow from a button inside slide 1 moves focus into slide 2)
  await keyboardFocus(page, "#cr-int-btn-1");
  await key(page, rtl ? "ArrowLeft" : "ArrowRight");
  const focused = await page.evaluate(() => document.activeElement?.id);
  const slide = await box(page, "#cr-int-2");
  f = await frame(page, slide);
  const inner = f.at(slide.x + slide.width / 2, slide.y + 8);
  const sring = strongest(f, inner, [slide.x + slide.width / 2, slide.y + 0.25], [slide.x + slide.width / 2, slide.y + 2]);
  check(focused === "cr-int-2" && sring >= 3, `${name}: a slide that takes focus draws a ring that clears 3:1`, `${focused}, ${r2(sring)}:1`);
  await close();
}

/* ── comparison slider ──────────────────────────────────────────────────── */

async function comparisonVisual(theme, rtl, scale) {
  const name = `${variant(theme, rtl, scale)} comparison-slider`;
  const { page, close } = await open(theme, { rtl, scale });
  await page.locator("#cs-set-30").click();
  await page.mouse.move(0, 0);
  await rest(page);
  const host = await box(page, "#cs-default");
  const handle = await box(page, "#cs-default .kx-comparison-slider__handle");
  const f = await frame(page, host);
  const want = rtl ? host.right - host.width * 0.3 : host.x + host.width * 0.3;
  const y = host.y + 8 > handle.y - 4 ? host.bottom - 6 : host.y + (handle.y - host.y) / 2;
  // the divider: its edge against the layers either side
  const before = f.at(rtl ? want + 8 : want - 8, y);
  const after = f.at(rtl ? want - 8 : want + 8, y);
  const edgeBefore = strongest(f, before, [want - 2.5, y], [want + 2.5, y]);
  const edgeAfter = strongest(f, after, [want - 2.5, y], [want + 2.5, y]);
  check(edgeBefore >= 3 && edgeAfter >= 3, `${name}: the divider at 30% from the inline start, its edge clearing 3:1 against both layers`, `${r2(edgeBefore)}:1 / ${r2(edgeAfter)}:1 at ${(want - host.x).toFixed(0)}px`);
  // the handle's grip
  const hc = [handle.x + handle.width / 2, handle.y + handle.height / 2];
  const fill = f.at(handle.x + 5, hc[1]);
  const grip = inkIn(f, fill, { x: hc[0] - handle.width / 4, y: hc[1] - handle.height / 4, width: handle.width / 2, height: handle.height / 2 });
  check(grip >= 3, `${name}: the handle's grip clears 3:1 against the handle`, `${r2(grip)}:1`);
  // labels
  for (const which of ["before", "after"]) {
    const sel = `#cs-default .kx-comparison-slider__label--${which}`;
    const l = await box(page, sel);
    const text = rgb(await style(page, sel, "color"));
    const chip = f.at(l.x + 1.5, l.y + 1.5);
    check(contrast(text, chip) >= 4.5, `${name}: the ${which} label is readable (4.5:1)`, `${r2(contrast(text, chip))}:1`);
  }
  const bl = await box(page, "#cs-default .kx-comparison-slider__label--before");
  check(rtl ? bl.right >= host.right - 16 * scale : bl.x <= host.x + 16 * scale, `${name}: the before label is at the inline start`);
  // keyboard focus: a ring around the handle
  await keyboardFocus(page, "#cs-default input");
  const h2 = await box(page, "#cs-default .kx-comparison-slider__handle");
  const ff = await frame(page, host);
  const behind = ff.at(h2.x + h2.width / 2, h2.y - 10);
  const ring = strongest(ff, behind, [h2.x + h2.width / 2, h2.y - 3.5], [h2.x + h2.width / 2, h2.y - 0.25]);
  check(ring >= 3, `${name}: keyboard focus draws a ring around the handle that clears 3:1`, `${r2(ring)}:1`);
  await close();
}

for (const theme of ["light", "dark"]) {
  report.push(`\nAngular · ${theme}`);
  for (const rtl of [false, true]) {
    for (const scale of [1, 2]) {
      if (COVERS.has("scroll-area")) await scrollArea(theme, rtl, scale);
      if (COVERS.has("resizable")) await resizable(theme, rtl, scale);
      if (COVERS.has("carousel")) await carouselVisual(theme, rtl, scale);
      if (COVERS.has("comparison-slider")) await comparisonVisual(theme, rtl, scale);
    }
  }
}

await browser.close();
server.close();
rmSync(dir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ layout-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nlayout-visual ok — the layout and pointer state contract holds for Angular, in light and dark, LTR and RTL, at normal and 200% text, on rendered pixels.");
