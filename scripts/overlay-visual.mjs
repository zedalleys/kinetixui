/**
 * overlay-visual.mjs — the overlay surface contract, measured on rendered pixels.
 *
 *   pnpm build:tokens && node scripts/overlay-visual.mjs
 *
 * Angular Wave C1 (TOKENS.md, "Overlays") gives every overlay in @kinetixui/angular one surface contract. This
 * gate renders the live Angular application (src/fixtures/overlays.ts, painted by the package's own styles.css
 * and the generated token CSS) in Chromium, opens each surface, and reads it back off the screen:
 *
 *   scrim       a modal surface sets the page back: every page pixel behind it is darker than the same pixel
 *               with nothing open (in light by at least 1.5:1 — on a dark page there is little left to darken,
 *               and the surface step and edge carry the separation), and the surface itself is not under it
 *   surface     the surface is painted the `popover` token (the tooltip: `action`, the inverse), and its text
 *               is readable on it (4.5:1, computed colour)
 *   edge        the surface's edge is drawn in the full `border` token (a card's resting edge is half of it),
 *               on the side that faces the page or the scrim
 *   elevation   in light, a shadow: the page beside a floating surface is darker than the same pixels with
 *               nothing open, and the strip under a dialog is darker than the scrim further out. In dark a black
 *               shadow on a near-black page has nothing to darken (TOKENS.md, "Elevation contract"), so
 *               elevation is the surface step instead: the surface is lighter than the page it floats over
 *   shape       a dialog's four corners are rounded (`--radius-surface`), a sheet's are square, a drawer's top
 *               corners are rounded and its bottom ones square
 *   focus       the close button's keyboard ring clears 3:1 against the surface on every side — inside a
 *               scrolling surface, so a ring cut off by the surface's own clip fails — and so does the ring of
 *               the last action in the footer, at the surface's inline-end bottom corner
 *   hover       the close button answers a pointer with a state layer, and the colour change is perceptible
 *               motion that reduced motion removes
 *   placement   a popover is painted below its trigger with a page-coloured gap between them; one declared
 *               inside an overflow-clipped, transformed card is painted beyond that card
 *   direction   in an RTL page a `side="end"` sheet is painted against the LEFT edge, and against the right one
 *               in an LTR page
 *   forced      under `forced-colors: active` the tooltip (whose fill the palette flattens to Canvas) still
 *               draws its edge
 *
 * Light and dark. Thresholds appear only where a standard names one (3:1, SC 1.4.11; 4.5:1, SC 1.4.3); every
 * other assertion is a relation between two renderings in the same run.
 *
 * Angular only: React's overlays are not changed by Wave C1 and are not measured here (visual-gates.mjs).
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { rmSync } from "node:fs";
import { chromium } from "playwright";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { buildAngularSubject, waitForAngular, contrast, framer, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const COVERS = new Set(gate("scripts/overlay-visual.mjs").covers.Angular);

const DPR = 2;
const PAD = 16;
const frame = framer({ dpr: DPR, pad: PAD });
const VIEWPORT = { width: 1024, height: 800 };

/* ── subjects ─────────────────────────────────────────────────────────── */

/** The modal surfaces, how each opens, and the corners it is drawn with. */
const MODALS = [
  { slug: "dialog", open: "#dlg-trigger", surface: "#dlg-content", corners: "all", close: "#dlg-content > .kx-dialog__close", last: "#dlg-save", text: "#dlg-content .kx-dialog__description" },
  { slug: "alert-dialog", open: "#ad-trigger", surface: "#ad-content", corners: "all", last: "#ad-action", text: "#ad-content .kx-dialog__description" },
  { slug: "modal", open: "#modal-trigger", surface: "#modal dialog", corners: "all", close: "#modal .kx-modal__close", text: "#modal .kx-dialog__description" },
  { slug: "sheet", open: "#sheet-end-trigger", surface: "#sheet-end dialog", corners: "none", close: "#sheet-end dialog > .kx-dialog__close", last: "#sheet-end-apply", text: "#sheet-end .kx-dialog__description" },
  { slug: "drawer", open: "#drawer-trigger", surface: "#drawer-content", corners: "top", last: "#drawer-send", text: "#drawer-content .kx-dialog__description" },
];
/** The floating surfaces. */
const FLOATING = [
  { slug: "popover", open: (p) => p.locator("#pop-trigger").click(), trigger: "#pop-trigger", surface: "#pop-content", token: "--popover", text: "#pop-content label" },
  { slug: "hover-card", open: (p) => keyboardFocus(p, "#hc-trigger"), trigger: "#hc-trigger", surface: "#hc-content", token: "--popover", text: "#hc-content p:nth-child(2)" },
  { slug: "tooltip", open: (p) => keyboardFocus(p, "#tip-trigger"), trigger: "#tip-trigger", surface: "#tip-content", token: "--action", text: "#tip-content" },
];

/* ── harness ──────────────────────────────────────────────────────────── */

const dir = buildAngularSubject("overlays", { name: "overlay-visual", layout: "" });
const server = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(theme, { rtl = false, reduced = true, forced = false, dpr = DPR } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: dpr,
    // Motion is measured on its own below; everything else is read at rest, so it runs with no transitions.
    reducedMotion: reduced ? "reduce" : "no-preference",
    forcedColors: forced ? "active" : "none",
  });
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${server.base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
  await waitForAngular(page);
  await page.mouse.move(0, 0);
  return { page, close: () => context.close() };
}
const rest = (page) =>
  page.evaluate(() => window.kxHarness.settle().then(() => Promise.allSettled(document.getAnimations().map((a) => a.finished))));
async function keyboardFocus(page, sel) {
  await page.keyboard.press("Shift");
  await page.locator(sel).first().focus();
  await rest(page);
}
const box = (page, sel) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().toJSON());
/** A token's colour as the page resolves it. */
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
/** Text colour against the surface it sits on, from computed style (glyph pixels measure the runner's font). */
const textOn = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    let bg = "rgba(0, 0, 0, 0)";
    for (let n = el; n && bg.endsWith(", 0)"); n = n.parentElement) bg = getComputedStyle(n).backgroundColor;
    return { color: getComputedStyle(el).color, bg };
  });
const r2 = (n) => n.toFixed(2);
/** A full-viewport frame (the whole screen is the subject when a scrim covers it). */
const screen = (page) => frame(page, { x: PAD, y: PAD, width: VIEWPORT.width - 2 * PAD, height: VIEWPORT.height - 2 * PAD });
/** The strongest contrast against `ref` along a short line, both inclusive. */
function strongest(f, ref, [x0, y0], [x1, y1]) {
  let best = 1;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * DPR;
  for (let i = 0; i <= n; i++) best = Math.max(best, contrast(f.at(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n), ref));
  return best;
}

/* ── run ──────────────────────────────────────────────────────────────── */

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(70)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};

/** Sample points on the page that no surface ever covers in this fixture: they show the page, or the scrim. */
const PROBES = [
  [40, 760],
  [600, 30],
  [980, 760],
];

async function modal(theme, M) {
  const name = `${theme} ${M.slug}`;
  const { page, close } = await open(theme);
  const fill = await token(page, "--popover");
  const before = await screen(page);
  await page.locator(M.open).click();
  await rest(page);
  await page.mouse.move(0, 0);
  const r = await box(page, M.surface);
  const after = await screen(page);

  // scrim: the page behind is set back, and the surface is not under it
  const probes = PROBES.filter(([x, y]) => x < r.left - 8 || x > r.right + 8 || y < r.top - 8 || y > r.bottom + 8);
  const dims = probes.map(([x, y]) => [contrast(before.at(x, y), after.at(x, y)), before.at(x, y), after.at(x, y)]);
  const sum = (p) => p.reduce((t, v) => t + v, 0);
  const darker = dims.every(([, b, a]) => sum(a) < sum(b));
  const enough = theme === "dark" || Math.min(...dims.map((d) => d[0])) >= 1.5;
  check(probes.length > 0 && darker && enough, `${name} the scrim sets the page back`, dims.map((d) => `${r2(d[0])}:1`).join(", "));
  const inner = after.at(r.left + r.width / 2, r.bottom - 6);
  check(contrast(inner, fill) < 1.05, `${name} the surface is painted the popover token, not under the scrim`, `${inner} vs ${fill}`);

  // edge: the full border token on the side facing the scrim (an end sheet's inline start, a drawer's top)
  const border = await token(page, "--border");
  const at =
    M.slug === "sheet" ? [r.left + 0.5, r.top + r.height / 2] : M.slug === "drawer" ? [r.left + r.width / 2, r.top + 0.5] : [r.left + 0.5, r.top + r.height / 2];
  // the scrim over the page's own margin, where nothing else is painted
  const scrimAt = M.slug === "drawer" ? after.at(PAD + 2, r.top - 40) : after.at(PAD + 2, r.top + r.height / 2);
  check(contrast(after.at(...at), border) < 1.1, `${name} its edge is drawn in the full border token`, `${after.at(...at)} vs ${border}; against the scrim ${r2(contrast(after.at(...at), scrimAt))}:1`);
  if (theme === "dark") {
    const step = contrast(fill, scrimAt);
    check(sum(fill) > sum(scrimAt), `${name} dark: the surface is lighter than the scrim around it`, `${r2(step)}:1`);
  }

  // elevation: the strip just outside is darker than the scrim further out (light; see the header for dark)
  if (theme === "light" && M.slug !== "sheet" && M.slug !== "drawer") {
    const near = after.at(r.left + r.width / 2, r.bottom + 4);
    const far = after.at(r.left + r.width / 2, r.bottom + 60);
    check(sum(near) < sum(far), `${name} a shadow under the surface`, `${near} below, ${far} further out`);
  }

  // shape
  const corner = (x, y) => contrast(after.at(x, y), fill) > 1.05;
  const inset = 1.5;
  const tl = corner(r.left + inset, r.top + inset);
  const tr = corner(r.right - inset, r.top + inset);
  const bl = corner(r.left + inset, r.bottom - inset);
  const br = corner(r.right - inset, r.bottom - inset);
  const want = { all: [true, true, true, true], none: [false, false, false, false], top: [true, true, false, false] }[M.corners];
  // A sheet sits flush against the viewport edges, where three of its corners are; only the inline-start
  // ones are against the scrim. Its edges carry a border that a corner sample can catch: read inside it.
  const seen = M.slug === "sheet" ? [corner(r.left + 3, r.top + 3), false, corner(r.left + 3, r.bottom - 3), false] : M.slug === "drawer" ? [tl, tr, corner(r.left + 3, r.bottom - 3), corner(r.right - 3, r.bottom - 3)] : [tl, tr, bl, br];
  check(seen.every((v, i) => v === want[i]), `${name} corners: ${M.corners === "all" ? "all rounded" : M.corners === "none" ? "square" : "top rounded, bottom square"}`, `rounded tl ${seen[0]} tr ${seen[1]} bl ${seen[2]} br ${seen[3]}`);

  // text
  const t = await textOn(page, M.text);
  const tc = contrast(rgb(t.color), rgb(t.bg));
  check(tc >= 4.5, `${name} its description text is readable on it (4.5:1)`, `${r2(tc)}:1`);

  // focus rings that the surface's own clip must not cut
  for (const sel of [M.close, M.last].filter(Boolean)) {
    await keyboardFocus(page, sel);
    const b = await box(page, sel);
    const f = await frame(page, b);
    const ring = (from, to) => strongest(f, fill, from, to);
    const sides = {
      top: ring([b.x + b.width / 2, b.y - 3.5], [b.x + b.width / 2, b.y - 0.5]),
      bottom: ring([b.x + b.width / 2, b.y + b.height + 0.5], [b.x + b.width / 2, b.y + b.height + 3.5]),
      start: ring([b.x - 3.5, b.y + b.height / 2], [b.x - 0.5, b.y + b.height / 2]),
      end: ring([b.x + b.width + 0.5, b.y + b.height / 2], [b.x + b.width + 3.5, b.y + b.height / 2]),
    };
    const weakest = Math.min(...Object.values(sides));
    check(weakest >= 3, `${name} ${sel === M.close ? "close button" : "last action"}: the focus ring clears 3:1 on every side`, Object.entries(sides).map(([k, v]) => `${k} ${r2(v)}`).join(", "));
  }

  // the close button answers a pointer
  if (M.close) {
    await page.evaluate(() => document.activeElement?.blur());
    const b = await box(page, M.close);
    const restF = await frame(page, b);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await rest(page);
    const hoverF = await frame(page, b);
    const layer = contrast(restF.at(b.x + 3, b.y + 3), hoverF.at(b.x + 3, b.y + 3));
    check(layer > 1.03, `${name} close button: hover draws a state layer`, `${r2(layer)}:1`);
  }
  await close();
}

async function floating(theme, F) {
  const name = `${theme} ${F.slug}`;
  const { page, close } = await open(theme);
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const fill = await token(page, F.token);
  await F.open(page);
  await rest(page);
  const r = await box(page, F.surface);
  const f = await frame(page, r);
  const inner = f.at(r.left + r.width / 2, r.top + Math.min(6, r.height / 3));
  check(contrast(inner, fill) < 1.05, `${name} the surface is painted the ${F.token.slice(2)} token`, `${inner} vs ${fill}`);
  const t = await textOn(page, F.text);
  const tc = contrast(rgb(t.color), rgb(t.bg));
  check(tc >= 4.5, `${name} its text is readable on it (4.5:1)`, `${r2(tc)}:1`);
  // edge: the full border token, on the side away from the trigger (the tooltip, an inverse fill, has none)
  const placement = await page.locator(F.surface).getAttribute("data-placement");
  const sum = (p) => p.reduce((t, v) => t + v, 0);
  if (F.slug !== "tooltip") {
    const border = await token(page, "--border");
    const at = placement === "top" ? [r.left + r.width / 2, r.top + 0.5] : [r.left + r.width / 2, r.bottom - 0.5];
    check(contrast(f.at(...at), border) < 1.1, `${name} its edge is drawn in the full border token`, `${f.at(...at)} vs ${border}; against the page ${r2(contrast(f.at(...at), pageBg))}:1`);
    if (theme === "light") {
      // the same pixels just under the surface, beside its trigger, with and without it open
      const x = r.left + r.width * 0.1;
      const y = r.bottom + 2;
      await page.keyboard.press("Escape");
      await page.evaluate(() => document.activeElement?.blur());
      await rest(page);
      await page.mouse.move(0, 0);
      const without = (await frame(page, r)).at(x, y);
      await F.open(page);
      await rest(page);
      const withIt = (await frame(page, r)).at(x, y);
      check(sum(withIt) < sum(without), `${name} a shadow under the surface`, `${withIt} open, ${without} closed`);
    } else {
      check(sum(fill) > sum(pageBg), `${name} dark: the surface is lighter than the page (the surface step)`, `${r2(contrast(fill, pageBg))}:1`);
    }
  } else {
    const edge = strongest(f, pageBg, [r.left + r.width / 2, r.bottom - 2], [r.left + r.width / 2, r.bottom + 1]);
    check(edge >= 3, `${name} the inverse fill stands out from the page (3:1, SC 1.4.11)`, `${r2(edge)}:1`);
  }
  if (F.slug === "popover") {
    // painted below its trigger, with the page showing in the gap between them
    const tb = await box(page, F.trigger);
    const gap = (r.top + tb.bottom) / 2;
    const g = await frame(page, { x: tb.x, y: tb.bottom - 2, width: tb.width, height: r.top - tb.bottom + 4 });
    check(r.top >= tb.bottom + 2 && contrast(g.at(tb.x + tb.width / 2, gap), pageBg) < 1.05, `${name} painted below its trigger, the page in the gap`, `trigger bottom ${tb.bottom.toFixed(1)}, surface top ${r.top.toFixed(1)}`);
  }
  await close();
}

async function clipped(theme) {
  const { page, close } = await open(theme);
  const fill = await token(page, "--popover");
  await page.locator("#pop-clipped-trigger").click();
  await rest(page);
  const [clip, r] = [await box(page, "#clip"), await box(page, "#pop-clipped-content")];
  const f = await frame(page, r);
  const y = clip.bottom + (r.bottom - clip.bottom) / 2;
  const x = Math.max(r.left + 12, clip.right + 12) < r.right - 12 ? Math.max(r.left + 12, clip.right + 12) : r.left + 12;
  const beyond = f.at(x, Math.max(y, clip.bottom + 4));
  check(r.bottom > clip.bottom + 8 && contrast(beyond, fill) < 1.05, `${theme} popover: painted beyond an overflow-clipped, transformed card`, `card bottom ${clip.bottom.toFixed(0)}, surface bottom ${r.bottom.toFixed(0)}`);
  await close();
}

async function direction(theme) {
  for (const rtl of [false, true]) {
    const { page, close } = await open(theme, { rtl });
    const fill = await token(page, "--popover");
    await page.locator("#sheet-end-trigger").click();
    await rest(page);
    await page.mouse.move(VIEWPORT.width / 2, 2);
    const s = await screen(page);
    const y = VIEWPORT.height / 2;
    const [left, right] = [s.at(PAD + 4, y), s.at(VIEWPORT.width - PAD - 4, y)];
    const onLeft = contrast(left, fill) < 1.05;
    const onRight = contrast(right, fill) < 1.05;
    const ok = rtl ? onLeft && !onRight : onRight && !onLeft;
    check(ok, `${theme} ${rtl ? "rtl" : "ltr"} sheet side="end" is painted against the ${rtl ? "left" : "right"} edge`, `left ${onLeft ? "surface" : "scrim"}, right ${onRight ? "surface" : "scrim"}`);
    await close();
  }
}

async function motion(theme) {
  let normal = null;
  for (const reduced of [false, true]) {
    const { page, close } = await open(theme, { reduced, dpr: 1 });
    await page.locator("#dlg-trigger").click();
    await rest(page);
    const sel = "#dlg-content > .kx-dialog__close";
    const b = await box(page, sel);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    const m = await page.locator(sel).evaluate((node) => {
      const t = node.getAnimations().find((a) => a.transitionProperty === "background-color");
      if (!t) return { none: true };
      const duration = t.effect.getComputedTiming().duration;
      t.finish();
      return { none: false, duration };
    });
    await rest(page);
    const end = await page.locator(sel).evaluate((n) => getComputedStyle(n).backgroundColor);
    const name = `${theme} dialog close button`;
    if (!reduced) {
      check(!m.none && m.duration >= PERCEPTIBLE_MS, `${name}: the hover colour change is perceptible motion`, m.none ? "no background transition ran" : `${Math.round(m.duration)}ms`);
      normal = end;
    } else {
      check((m.none || m.duration <= SUPPRESSED_MS) && end === normal, `${name}: reduced motion lands without animating`, `${m.none ? "no transition" : `${m.duration}ms`}, end ${end === normal ? "matches" : "DIFFERS from"} normal`);
    }
    await close();
  }
}

async function forced(theme) {
  const { page, close } = await open(theme, { forced: true });
  const canvas = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  await keyboardFocus(page, "#tip-trigger");
  const r = await box(page, "#tip-content");
  const f = await frame(page, r);
  const edge = strongest(f, canvas, [r.left + r.width / 2, r.top - 1], [r.left + r.width / 2, r.top + 2]);
  check(edge >= 3, `${theme} forced colours: the tooltip still draws its edge`, `${r2(edge)}:1`);
  await close();
}

for (const theme of ["light", "dark"]) {
  report.push(`\nAngular · ${theme}`);
  for (const M of MODALS) if (COVERS.has(M.slug)) await modal(theme, M);
  for (const F of FLOATING) if (COVERS.has(F.slug)) await floating(theme, F);
  if (COVERS.has("popover")) await clipped(theme);
  if (COVERS.has("sheet")) await direction(theme);
  if (COVERS.has("dialog")) await motion(theme);
  if (COVERS.has("tooltip")) await forced(theme);
}

await browser.close();
server.close();
rmSync(dir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ overlay-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log("\noverlay-visual ok — the overlay surface contract holds for Angular, in light and dark, on rendered pixels.");
