/**
 * navigation-visual.mjs — the navigation and disclosure state contract, measured on rendered pixels.
 *
 *   pnpm build:tokens && node scripts/navigation-visual.mjs
 *
 * Angular Wave B (TOKENS.md, "Navigation and disclosure") gives every destination in @kinetixui/angular — a
 * breadcrumb crumb, a page in a pagination, a table-of-contents entry, a tab-bar destination, an app-bar link,
 * a footer link — and every disclosure trigger one state contract. This gate renders the live Angular
 * application (src/fixtures/navigation.ts, painted by the package's own styles.css and the generated token
 * CSS) in Chromium and reads each state back off the screen:
 *
 *   rest        destination text is readable (4.5:1) and quieter than the current destination's
 *   hover       a pointer that can hover changes the destination (a state layer, or text + underline)
 *   pressed     where there is a layer, pressing deepens it beyond hover
 *   focus       a keyboard ring outside the box that clears 3:1 against the page — drawn by nothing else,
 *               so it out-draws hover in the same strip
 *   current     a SHAPE cue as well as the text: a bar, an outline, a pill or weight — measured as
 *               pixels (or, for weight, computed style), and kept inside the destination's own box
 *   disabled    hovering changes no pixel, and the text is weaker than an enabled destination's
 *   disclosure  the chevron points down collapsed and up expanded (ink, not a transform string); an open
 *               item that cannot close (single, not collapsible) does not answer the pointer; a disabled
 *               trigger is inert and weaker
 *   direction   the table of contents' current bar is on the inline-start edge in an RTL page too
 *   motion      a destination's colour change runs over a perceptible duration, and under reduced motion
 *               runs none and lands on the same colours
 *
 * Light and dark. Thresholds appear only where a standard names one (3:1 for an indicator or focus ring,
 * SC 1.4.11; 4.5:1 for text, SC 1.4.3); every other assertion is a relation between two renderings in the
 * same run. Text colour is read from computed style, because glyph pixels measure the runner's font.
 *
 * Angular only. React's navigation components predate this contract and are not changed by Wave B; parity is
 * not claimed (visual-gates.mjs).
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { rmSync } from "node:fs";
import { chromium } from "playwright";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { buildAngularSubject, waitForAngular, contrast, framer, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const COVERS = gate("scripts/navigation-visual.mjs").covers;

const DPR = 2;
/** long enough for the 200ms `duration-fast` transitions to finish */
const SETTLE = 450;
const PAD = 12;
const frame = framer({ dpr: DPR, pad: PAD });
const S = (subject) => `section[data-kx-subject="${subject}"]`;

/* ── subjects ─────────────────────────────────────────────────────────── */
/**
 * Each destination family: where a resting, a current and (if it has one) a disabled destination are, whether
 * its hover and press draw a state layer (`layer`, sampled at `fill(r)`), and how its current cue is read.
 */
const DESTINATIONS = [
  {
    slug: "breadcrumb",
    rest: "#crumb-home",
    current: `${S("breadcrumb")} [data-kx-case=current]`,
    layer: false,
    cue: "weight",
  },
  {
    slug: "pagination",
    rest: `${S("pagination")} [data-kx-case=rest]`,
    current: `${S("pagination")} [data-kx-case=current]`,
    disabled: "#archive-prev",
    layer: true,
    fill: (r) => [r.x + 4, r.y + 4],
    cue: "outline",
  },
  {
    slug: "table-of-contents",
    rest: `${S("table-of-contents")} a:not([aria-current])`,
    current: `${S("table-of-contents")} a[aria-current]`,
    layer: true,
    fill: (r) => [r.x + r.width - 4, r.y + 3],
    cue: "start-bar",
  },
  {
    slug: "tab-bar",
    rest: `${S("tab-bar")} [data-kx-case=rest]`,
    current: `${S("tab-bar")} [data-kx-case=current]`,
    layer: true,
    // the layer is the pill behind the icon, not the whole item
    part: ".kx-tab-bar__icon",
    fill: (r) => [r.x + 4, r.y + r.height / 2],
    cue: "pill",
  },
  {
    slug: "app-bar",
    rest: `${S("app-bar")} [data-kx-case=rest]`,
    current: `${S("app-bar")} [data-kx-case=current]`,
    layer: true,
    fill: (r) => [r.x + 4, r.y + 4],
    cue: "end-bar",
  },
  {
    slug: "footer",
    rest: "#ft-pricing",
    layer: false,
  },
];
const ACCORDION = {
  collapsed: `${S("accordion")} kx-accordion-trigger[data-kx-case=collapsed] button`,
  expanded: `${S("accordion")} kx-accordion-trigger[data-kx-case=expanded] button`,
  disabled: `${S("accordion")} kx-accordion-trigger[data-kx-case=disabled] button`,
  // #plan is single and not collapsible: its open item reports aria-disabled and cannot close
  locked: "#plan button[aria-expanded=true]",
};

/* ── harness ──────────────────────────────────────────────────────────── */

const dir = buildAngularSubject("navigation", { name: "navigation-visual", layout: "" });
const server = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(theme, { rtl = false, reduced = false, dpr = DPR } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1300, height: 1000 },
    deviceScaleFactor: dpr,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${server.base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
  await waitForAngular(page);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  return { page, close: () => context.close() };
}

/* ── pixels ───────────────────────────────────────────────────────────── */

const r2 = (n) => n.toFixed(2);
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const maxContrast = (pixels, against) => Math.max(...pixels.map((p) => contrast(p, against)));

async function box(page, sel) {
  const el = page.locator(sel).first();
  // from the top each time: the app bar is sticky, and once the page has scrolled it would sit at y=0, where
  // a padded screenshot clip runs off the viewport
  await page.evaluate(() => window.scrollTo(0, 0));
  await el.scrollIntoViewIfNeeded();
  return el.boundingBox();
}
/** The text's colour against what is actually behind it (the nearest painted background up the tree). */
const ink = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    let bg = "rgba(0, 0, 0, 0)";
    for (let n = el; n && bg.endsWith(", 0)"); n = n.parentElement) bg = getComputedStyle(n).backgroundColor;
    if (bg.endsWith(", 0)")) bg = getComputedStyle(document.body).backgroundColor;
    return { color: cs.color, bg, opacity: Number(cs.opacity), weight: Number(cs.fontWeight) };
  });
/** Effective text contrast, with the element's own opacity blended in (disabled is `opacity-disabled`). */
function textContrast({ color, bg, opacity }) {
  const [c, b] = [rgb(color), rgb(bg)];
  return contrast(c.map((v, i) => v * opacity + b[i] * (1 - opacity)), b);
}
/** The strip just outside a box at mid-height on the inline-start side — where the focus ring lives. */
const outside = (f, r, page) => maxContrast(f.row(r.y + r.height / 2, r.x - 4, r.x - 0.5), page);
/** Which way a chevron points: the row with the widest ink is its open end; the tip is opposite it. */
function chevron(f, r, bg) {
  const rows = [];
  for (let y = r.y; y <= r.y + r.height; y += 1 / DPR) {
    const xs = [];
    for (let x = r.x; x <= r.x + r.width; x += 1 / DPR) if (contrast(f.at(x, y), bg) > 1.6) xs.push(x);
    if (xs.length) rows.push({ y, span: Math.max(...xs) - Math.min(...xs) });
  }
  if (rows.length < 3) return "unreadable";
  const [first, last] = [rows[0], rows.at(-1)];
  return first.span > last.span ? "down" : "up";
}
async function keyboardFocus(page, sel) {
  await page.keyboard.press("Shift");
  await page.locator(sel).first().focus();
  await page.waitForTimeout(SETTLE);
  return page.evaluate((s) => document.activeElement === document.querySelector(s), sel);
}
const hover = async (page, r) => {
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(SETTLE);
};

/* ── run ──────────────────────────────────────────────────────────────── */

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(64)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};

async function destination(theme, D) {
  const name = `${theme} ${D.slug}`;
  const { page, close } = await open(theme);
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const target = (sel) => (D.part ? `${sel} ${D.part}` : sel);

  // rest: readable, and quieter than current
  const restInk = await ink(page, D.rest);
  const rc = textContrast(restInk);
  if (D.current) {
    const cc = textContrast(await ink(page, D.current));
    check(rc >= 4.5 && cc > rc, `${name} rest text readable, current stronger`, `rest ${r2(rc)}:1, current ${r2(cc)}:1`);
  } else check(rc >= 4.5, `${name} rest text readable`, `${r2(rc)}:1`);

  // hover changes it; press deepens a layer
  const rr = await box(page, D.rest);
  const rest = await frame(page, rr);
  await hover(page, rr);
  const hovered = await frame(page, rr);
  const changed = hovered.changed(rest);
  const hoverOutside = outside(hovered, rr, pageBg);
  if (D.layer) {
    const lr = await box(page, target(D.rest));
    const at = D.fill(lr);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    const base = (await frame(page, lr)).at(...at);
    await hover(page, rr);
    const h = (await frame(page, lr)).at(...at);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const p = (await frame(page, lr)).at(...at);
    // leave before releasing, so the press never becomes a click that changes the page under the gate
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.waitForTimeout(SETTLE);
    const [hs, ps] = [contrast(h, base), contrast(p, base)];
    check(hs >= 1.05 && ps > hs, `${name} hover draws a layer, press deepens it`, `hover ${r2(hs)}:1, pressed ${r2(ps)}:1 against rest`);
  } else {
    const after = await ink(page, D.rest);
    const step = contrast(rgb(after.color), rgb(restInk.color));
    check(changed > 0 && step >= 1.2, `${name} hover changes the destination`, `${changed} pixel(s) changed, text ${r2(step)}:1 against rest`);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
  }

  // focus: a ring outside the box, 3:1, which hover does not draw
  const focused = await keyboardFocus(page, D.rest);
  const ring = outside(await frame(page, rr), rr, pageBg);
  check(focused && ring >= 3 && hoverOutside < 1.5, `${name} focus ring clears 3:1 and out-draws hover`, `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1, hover alone ${r2(hoverOutside)}:1 in the same strip`);
  await page.evaluate(() => document.activeElement?.blur());

  // current: a shape cue, inside its own box
  if (D.current) {
    const cr = await box(page, target(D.current));
    const cur = await frame(page, cr);
    const restPart = await box(page, target(D.rest));
    const rst = await frame(page, restPart);
    if (D.cue === "weight") {
      const [cw, rw] = [(await ink(page, D.current)).weight, restInk.weight];
      check(cw > rw, `${name} current is set apart by weight, not hue alone`, `weight ${cw} vs rest ${rw}`);
    } else if (D.cue === "outline") {
      const mid = (r) => r.y + r.height / 2;
      const edge = maxContrast(cur.row(mid(cr), cr.x - 0.5, cr.x + 1.5), pageBg);
      const restEdge = maxContrast(rst.row(mid(restPart), restPart.x - 0.5, restPart.x + 1.5), pageBg);
      check(edge >= 3 && restEdge < 1.2, `${name} current is an outlined surface, edge 3:1`, `edge ${r2(edge)}:1 (rest ${r2(restEdge)}:1)`);
    } else if (D.cue === "start-bar") {
      const [x, y] = [cr.x + 1, cr.y + cr.height / 2];
      const bar = contrast(cur.at(x, y), pageBg);
      const restBar = contrast(rst.at(restPart.x + 1, restPart.y + restPart.height / 2), pageBg);
      check(bar >= 3 && bar > restBar * 1.5, `${name} current bar on the inline-start edge, 3:1`, `bar ${r2(bar)}:1, rest's edge ${r2(restBar)}:1, inside the entry's box at x+1`);
    } else if (D.cue === "pill") {
      const at = D.fill(cr);
      const pill = contrast(cur.at(...at), pageBg);
      const restPill = contrast(rst.at(...D.fill(restPart)), pageBg);
      check(pill >= 1.1 && restPill < 1.02, `${name} current carries a pill behind its icon`, `pill ${r2(pill)}:1 against the bar, rest ${r2(restPill)}:1`);
    } else if (D.cue === "end-bar") {
      const fill = cur.at(cr.x + 4, cr.y + cr.height - 5);
      const bar = contrast(cur.at(cr.x + cr.width / 2, cr.y + cr.height - 0.5), fill);
      check(bar >= 3, `${name} current bar on the block-end edge, 3:1`, `bar ${r2(bar)}:1 against the link's own fill, inside its box`);
    }
  }

  // disabled: inert and weaker
  if (D.disabled) {
    const dr = await box(page, D.disabled);
    const d0 = await frame(page, dr);
    await hover(page, dr);
    const moved = (await frame(page, dr)).changed(d0);
    const dc = textContrast(await ink(page, D.disabled));
    check(moved === 0 && dc < rc, `${name} disabled is inert and weaker`, `${moved} pixel(s) changed on hover, text ${r2(dc)}:1 vs enabled ${r2(rc)}:1`);
    await page.mouse.move(0, 0);
  }
  await close();
}

async function accordion(theme) {
  const name = `${theme} accordion`;
  const { page, close } = await open(theme);
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const chev = async (sel) => {
    const r = await box(page, `${sel} .kx-accordion__chevron`);
    return chevron(await frame(page, r), r, pageBg);
  };
  const [closed, open_] = [await chev(ACCORDION.collapsed), await chev(ACCORDION.expanded)];
  check(closed === "down" && open_ === "up", `${name} chevron points down collapsed, up expanded`, `collapsed ${closed}, expanded ${open_}`);

  const cr = await box(page, ACCORDION.collapsed);
  const at = [cr.x + 3, cr.y + 3];
  const base = (await frame(page, cr)).at(...at);
  await hover(page, cr);
  const h = (await frame(page, cr)).at(...at);
  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  const p = (await frame(page, cr)).at(...at);
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.waitForTimeout(SETTLE);
  check(contrast(h, base) >= 1.05 && contrast(p, base) > contrast(h, base), `${name} trigger hover layer, press deeper`, `hover ${r2(contrast(h, base))}:1, pressed ${r2(contrast(p, base))}:1`);

  const focused = await keyboardFocus(page, ACCORDION.collapsed);
  const ring = maxContrast((await frame(page, cr)).row(cr.y + cr.height / 2, cr.x - 4, cr.x - 1), pageBg);
  check(focused && ring >= 3, `${name} trigger focus ring clears 3:1`, `ring ${r2(ring)}:1`);
  await page.evaluate(() => document.activeElement?.blur());

  for (const [which, label] of [
    ["locked", "an open item that cannot close does not answer the pointer"],
    ["disabled", "a disabled trigger is inert and weaker"],
  ]) {
    const r = await box(page, ACCORDION[which]);
    const f0 = await frame(page, r);
    await hover(page, r);
    const moved = (await frame(page, r)).changed(f0);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    if (which === "disabled") {
      const [dc, ec] = [textContrast(await ink(page, ACCORDION.disabled)), textContrast(await ink(page, ACCORDION.collapsed))];
      check(moved === 0 && dc < ec, `${name} ${label}`, `${moved} pixel(s) changed on hover, text ${r2(dc)}:1 vs enabled ${r2(ec)}:1`);
    } else check(moved === 0, `${name} ${label}`, `${moved} pixel(s) changed on hover`);
  }
  await close();
}

async function direction(theme) {
  const { page, close } = await open(theme, { rtl: true });
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const cr = await box(page, `${S("table-of-contents")} a[aria-current]`);
  const f = await frame(page, cr);
  const y = cr.y + cr.height / 2;
  const [start, end] = [contrast(f.at(cr.x + cr.width - 1, y), pageBg), contrast(f.at(cr.x + 1, y), pageBg)];
  check(start >= 3 && end < 1.5, `${theme} rtl table-of-contents bar on the inline-start (right) edge`, `right edge ${r2(start)}:1, left edge ${r2(end)}:1`);
  await close();
}

async function motion(theme) {
  let normal = null;
  for (const reduced of [false, true]) {
    const { page, close } = await open(theme, { reduced, dpr: 1 });
    const sel = `${S("pagination")} [data-kx-case=rest]`;
    const r = await box(page, sel);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    const m = await page.locator(sel).evaluate((node) => {
      const t = node.getAnimations().find((a) => a.transitionProperty === "background-color");
      if (!t) return { none: true };
      const duration = t.effect.getComputedTiming().duration;
      t.finish();
      return { none: false, duration };
    });
    await page.waitForTimeout(SETTLE);
    const end = await page.locator(sel).evaluate((n) => getComputedStyle(n).backgroundColor);
    const name = `${theme} pagination`;
    if (!reduced) {
      check(!m.none && m.duration >= PERCEPTIBLE_MS, `${name} hover colour change is perceptible motion`, m.none ? "no background transition ran" : `${Math.round(m.duration)}ms`);
      normal = end;
    } else {
      check((m.none || m.duration <= SUPPRESSED_MS) && end === normal, `${name} reduced motion lands without animating`, `${m.none ? "no transition" : `${m.duration}ms`}, end ${end === normal ? "matches" : "DIFFERS from"} normal`);
    }
    await close();
  }
}

const slugs = new Set(COVERS.Angular);
for (const theme of ["light", "dark"]) {
  report.push(`\nAngular · ${theme}`);
  for (const D of DESTINATIONS) if (slugs.has(D.slug)) await destination(theme, D);
  if (slugs.has("accordion")) await accordion(theme);
  await direction(theme);
  await motion(theme);
}

await browser.close();
server.close();
rmSync(dir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ navigation-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nnavigation-visual ok — the navigation and disclosure state contract holds for Angular, in light and dark, on rendered pixels.");
