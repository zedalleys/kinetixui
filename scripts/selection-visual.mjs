/**
 * selection-visual.mjs — the selection-control state contract, measured on rendered pixels in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && pnpm build:tokens && node scripts/selection-visual.mjs
 *   node scripts/selection-visual.mjs --platform=React     one platform only (React | Angular)
 *
 * Visual Slice 2 (TOKENS.md, "Selection controls") made claims about how Checkbox, RadioGroup, Switch and
 * SegmentedControl LOOK in each state: that an unchecked box is visible at 3:1, that hover and press are
 * different things and both differ from rest, that checked is a shape and not only a colour, that the
 * keyboard ring is the strongest state and survives the pointer, that invalid stays invalid under the
 * pointer, that a disabled control does not answer, and that the chosen segment sits ABOVE its track in
 * both themes. None of that is provable from class names, and jsdom has no pixels.
 *
 * It measures two platforms with one set of assertions:
 *
 *   React     the `States` stories in the built Storybook
 *   Angular   the DOM Angular itself renders for the same states (src/lib/selection-render.spec.ts, run
 *             with KX_ANGULAR_RENDER_OUT), painted with the package's own styles.css and the generated
 *             token CSS. The markup is the package's output, not a hand-written imitation of it.
 *
 * ── Method ───────────────────────────────────────────────────────────────
 *
 * The same as check:card-visual, whose instrument it shares (visual-harness.mjs): every sample is taken
 * away from text, and every assertion is a RELATION between two renderings in the same run — rest vs
 * hover, checked vs unchecked, segment vs track — so the runner's fonts and antialiasing do not enter
 * into it, and there are no stored images to drift. Absolute thresholds are used only where a standard
 * names one (3:1, SC 1.4.11).
 *
 * ── What it asserts, per platform and theme ──────────────────────────────
 *
 *   boundary   an unchecked checkbox / radio edge clears 3:1 against the card it sits on
 *   hover      a state layer appears around the control (pixels outside the box change), cursor pointer
 *   pressed    the layer deepens: pressed is not hover
 *   checked    a shape inside the control (glyph, dot or ring) clears 3:1 against its own fill — not colour
 *              alone; a switch's thumb changes side
 *   focus      the keyboard ring clears 3:1, out-contrasts hover, and is still there with the pointer on top
 *   invalid    (React; Angular has no invalid input on these controls) the edge clears 3:1, is a different
 *              colour from valid, and is still that colour under the pointer
 *   disabled   hovering changes no pixel, and the edge is weaker than an enabled one
 *   segment    the chosen segment is lighter than its track and has an edge against it, in both themes,
 *              on the page and inside a Card; the track is below the Card surface it sits in; an unchosen
 *              segment answers hover and press
 *   motion     hover runs a box-shadow transition over a perceptible duration; under prefers-reduced-motion
 *              it runs none and lands on the same end state
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { contrast, decode, lum, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
// The platforms this gate measures are the ones visual-gates.mjs says it covers — the registry the Angular
// graduation guard reads — so the two cannot disagree.
const COVERS = gate("scripts/selection-visual.mjs").covers;
const only = process.argv.find((a) => a.startsWith("--platform="))?.slice("--platform=".length);
if (only && !COVERS[only]) {
  console.error(`selection-visual: --platform=${only} is not one this gate covers (${Object.keys(COVERS).join(", ")})`);
  process.exit(2);
}
const PLATFORMS = only ? [only] : Object.keys(COVERS);

const DPR = 2;
/** long enough for the 200ms `duration-fast` segment transition to finish */
const SETTLE = 350;
/** padding around a control's box in each screenshot: room for the 5px state layer and the focus ring */
const PAD = 12;

/* ── subjects ─────────────────────────────────────────────────────────── */

const STORY = {
  checkbox: "form-inputs-checkbox--states",
  radio: "form-inputs-radiogroup--states",
  switch: "form-inputs-switch--states",
  segment: "controls-actions-segmentedcontrol--states",
};

/**
 * Where each platform keeps each state. `visual` is the element whose box is measured, `target` the one the
 * keyboard focuses (they differ only for Angular's segment, whose radio is visually hidden behind its label).
 */
const ADAPTERS = {
  React: {
    control: (kind, c) => ({ visual: `[data-kx-case="${c}"]` }),
    segment: (where, which) => {
      const sel = { on: "button[data-state=on]", off: "button[data-state=off]:not([disabled])", disabled: "button[disabled]" }[which];
      return { visual: `[data-kx-case="${where}"] ${sel}` };
    },
    track: (where) => `[data-kx-case="${where}"]`,
    card: ".bg-card",
    hasInvalid: true,
  },
  Angular: {
    control: (kind, c) => ({ visual: `kx-${kind}[data-kx-case="${c}"] ${kind === "radio" ? "input" : "button"}` }),
    segment: (where, which) => {
      const input = { on: "input:checked", off: "input:not(:checked):not([disabled])", disabled: "input[disabled]" }[which];
      return { visual: `[data-kx-case="${where}"] kx-segment:has(${input}) label`, target: `[data-kx-case="${where}"] kx-segment:has(${input}) input` };
    },
    track: (where) => `[data-kx-case="${where}"]`,
    card: "kx-card",
    hasInvalid: false,
  },
};

/* ── pages ────────────────────────────────────────────────────────────── */

let storybook = null;
function reactUrl(kind, theme) {
  return `${storybook.base}/iframe.html?id=${STORY[kind]}&viewMode=story&globals=theme:${theme}`;
}

let angular = null;
/**
 * Render the Angular subject: run the spec that mounts the states with KX_ANGULAR_RENDER_OUT set, then wrap
 * the DOM it wrote in a page that loads exactly what a consumer loads — the token CSS and the package's
 * styles.css. The only local CSS lays the four groups out on the page; it styles no control.
 */
function buildAngularPage() {
  const dir = mkdtempSync(join(tmpdir(), "kx-selection-ng-"));
  const out = join(dir, "subject.html");
  execFileSync("pnpm", ["--filter", "@kinetixui/angular", "exec", "vitest", "run", "src/lib/selection-render.spec.ts"], {
    cwd: root,
    env: { ...process.env, KX_ANGULAR_RENDER_OUT: out },
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (!existsSync(out)) throw new Error("selection-visual: the Angular render spec did not write its subject");
  const css = {
    "globals.css": "packages/tokens/dist/web/globals.css",
    "globals.dark.css": "packages/tokens/dist/web/globals.dark.css",
    "extras.css": "packages/tokens/dist/web/extras.css",
    "extras.dark.css": "packages/tokens/dist/web/extras.dark.css",
    "styles.css": "packages/ui-angular/src/styles.css",
  };
  for (const [name, from] of Object.entries(css)) {
    if (!existsSync(join(root, from))) throw new Error(`selection-visual: ${from} missing — run pnpm build:tokens first`);
    copyFileSync(join(root, from), join(dir, name));
  }
  const links = Object.keys(css).map((n) => `<link rel="stylesheet" href="${n}">`).join("");
  const layout = `<style>
    body { margin: 0; padding: 24px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: var(--font-family-sans); }
    .kx-render-grid { display: grid; gap: 24px; inline-size: 22rem; }
    .kx-render-stack { display: grid; gap: 16px; padding-block-start: 24px; }
    .kx-render-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  </style>`;
  for (const theme of ["light", "dark"]) {
    writeFileSync(join(dir, `${theme}.html`), `<!doctype html><html lang="en" class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8">${links}${layout}</head><body>${readFileSync(out, "utf8")}</body></html>`);
  }
  return dir;
}

async function open(context, platform, kind, theme) {
  const page = await context.newPage();
  const base = platform === "React" ? storybook.base : angular.base;
  // Hermetic: anything remote (a web font) only makes a screenshot wait. Samples are taken away from text.
  await page.route((url) => !url.href.startsWith(base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(platform === "React" ? reactUrl(kind, theme) : `${angular.base}/${theme}.html`, { waitUntil: "load" });
  if (platform === "React") await page.waitForSelector("#storybook-root > *");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  return page;
}

/* ── pixels ───────────────────────────────────────────────────────────── */

/** A frame of the region around `rect`, with accessors in page CSS pixels. */
async function frame(page, rect) {
  const clip = { x: rect.x - PAD, y: rect.y - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD };
  const img = decode(await page.screenshot({ clip }));
  const idx = (x, y) => (Math.round((y - clip.y) * DPR) * img.w + Math.round((x - clip.x) * DPR)) * 4;
  return {
    at(x, y) {
      const i = idx(x, y);
      return [img.data[i], img.data[i + 1], img.data[i + 2]];
    },
    /** device pixels along a horizontal line between two CSS x values */
    row(y, x0, x1) {
      const out = [];
      for (let x = x0; x <= x1; x += 1 / DPR) out.push(this.at(x, y));
      return out;
    },
    /** how many sampled pixels in the whole frame differ from `other` by more than `min`:1 */
    changed(other, min = 1.03) {
      let n = 0;
      for (let i = 0; i < img.data.length; i += 4 * 3) {
        const a = [img.data[i], img.data[i + 1], img.data[i + 2]];
        const b = [other.img.data[i], other.img.data[i + 1], other.img.data[i + 2]];
        if (contrast(a, b) > min) n++;
      }
      return n;
    },
    img,
  };
}
const maxContrast = (pixels, against) => Math.max(...pixels.map((p) => contrast(p, against)));
const r2 = (n) => n.toFixed(2);
/** red clearly dominant — the destructive role, as distinct from the neutral and blue edges */
const reddish = ([r, g, b]) => r - Math.max(g, b) >= 40;

/* ── run ──────────────────────────────────────────────────────────────── */

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(52)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};

if (PLATFORMS.includes("React")) {
  const staticDir = join(root, "apps/docs/storybook-static");
  if (!existsSync(join(staticDir, "index.json"))) {
    console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
    process.exit(2);
  }
  assertUiDistMatchesSource("selection-visual");
  const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
  for (const id of Object.values(STORY)) {
    if (!index.entries[id]) {
      console.error(`selection-visual: story ${id} is not in the built Storybook — gen:stories and build-storybook first.`);
      process.exit(2);
    }
  }
  storybook = await serveStatic(staticDir);
}
let angularDir = null;
if (PLATFORMS.includes("Angular")) {
  angularDir = buildAngularPage();
  angular = await serveStatic(angularDir);
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Put keyboard modality on the page, then focus — so `:focus-visible` matches the way a Tab would. */
async function keyboardFocus(page, selector) {
  await page.keyboard.press("Shift");
  await page.locator(selector).first().focus();
  await page.waitForTimeout(SETTLE);
  return page.evaluate((s) => document.activeElement === document.querySelector(s), selector);
}

/** Checkbox and radio: boundary, layer, press, shape, focus, invalid, disabled. */
async function boxControl(context, platform, kind, theme) {
  const A = ADAPTERS[platform];
  const name = `${platform} ${theme} ${kind}`;
  const page = await open(context, platform, kind, theme);
  const sel = (c) => A.control(kind, c).visual;
  const box = async (c) => page.locator(sel(c)).first().boundingBox();

  const un = await box("unchecked");
  const cy = un.y + un.height / 2;
  const rest = await frame(page, un);
  const surface = rest.at(un.x - 9, cy);
  const restEdge = maxContrast(rest.row(cy, un.x - 1, un.x + 3), surface);
  check(restEdge >= 3, `${name} unchecked boundary clears 3:1`, `${r2(restEdge)}:1 against the card`);

  // A point in the state layer, just outside the box, where nothing is drawn at rest.
  const layerAt = (f) => f.at(un.x - 3, cy);
  await page.mouse.move(un.x + un.width / 2, cy);
  await page.waitForTimeout(SETTLE);
  const hover = await frame(page, un);
  const layer = contrast(layerAt(hover), layerAt(rest));
  // what hover alone draws outside the box — the ring has to beat it
  const hoverOutside = maxContrast(hover.row(cy, un.x - 6, un.x - 0.5), surface);
  check(layer >= 1.05, `${name} hover draws a state layer`, `${r2(layer)}:1 outside the box against rest`);
  const cursor = await page.locator(sel("unchecked")).first().evaluate((el) => getComputedStyle(el).cursor);
  check(cursor === "pointer", `${name} hover cursor`, cursor);

  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  const pressed = await frame(page, un);
  const deeper = contrast(layerAt(pressed), layerAt(hover));
  check(deeper >= 1.05, `${name} pressed differs from hover`, `layer ${r2(deeper)}:1 against hover's`);
  // Release away from the control so the press does not toggle it and shift every later sample.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.close();

  // Checked: a shape inside the control, not only a different fill.
  {
    const p = await open(context, platform, kind, theme);
    const ck = await p.locator(sel("checked")).first().boundingBox();
    const f = await frame(p, ck);
    const cx = ck.x + ck.width / 2;
    const ccy = ck.y + ck.height / 2;
    let shape;
    if (kind === "radio") {
      // a dot (React) or a ring around a hole (Angular): the centre and a point 70% out differ
      shape = contrast(f.at(cx, ccy), f.at(cx + (ck.width / 2) * 0.7, ccy));
    } else {
      // the glyph against the fill: the strongest contrast between any two interior pixels
      const inner = [];
      for (let y = ck.y + 3; y <= ck.y + ck.height - 3; y += 0.5) inner.push(...f.row(y, ck.x + 3, ck.x + ck.width - 3));
      const fill = f.at(ck.x + 3, ck.y + 3);
      shape = maxContrast(inner, fill);
    }
    check(shape >= 3, `${name} checked carries a shape`, `${r2(shape)}:1 inside the control`);
    await p.close();
  }

  // Focus: clears 3:1, beats hover, and survives the pointer.
  {
    const p = await open(context, platform, kind, theme);
    const focused = await keyboardFocus(p, sel("unchecked"));
    const f = await frame(p, un);
    const ring = maxContrast(f.row(cy, un.x - 6, un.x - 0.5), surface);
    await p.mouse.move(un.x + un.width / 2, cy);
    await p.waitForTimeout(SETTLE);
    const fh = await frame(p, un);
    const ringHovered = maxContrast(fh.row(cy, un.x - 6, un.x - 0.5), surface);
    check(
      focused && ring >= 3 && ring > hoverOutside && ringHovered >= 3,
      `${name} focus ring is the strongest state`,
      `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1, with the pointer on it ${r2(ringHovered)}:1, hover alone ${r2(hoverOutside)}:1`,
    );
    await p.close();
  }

  // Disabled: inert, and visibly weaker.
  {
    const p = await open(context, platform, kind, theme);
    const d = await p.locator(sel("disabled")).first().boundingBox();
    const dy = d.y + d.height / 2;
    const dr = await frame(p, d);
    const dSurface = dr.at(d.x - 9, dy);
    const dEdge = maxContrast(dr.row(dy, d.x - 1, d.x + 3), dSurface);
    await p.mouse.move(d.x + d.width / 2, dy);
    await p.waitForTimeout(SETTLE);
    const dh = await frame(p, d);
    const moved = dh.changed(dr);
    check(moved === 0 && dEdge < restEdge, `${name} disabled is inert and weaker`, `${moved} pixel(s) changed on hover, edge ${r2(dEdge)}:1 vs enabled ${r2(restEdge)}:1`);
    await p.close();
  }

  // Invalid: perceivable, a different colour from valid, and still that colour under the pointer.
  if (A.hasInvalid) {
    const p = await open(context, platform, kind, theme);
    const iv = await p.locator(sel("invalid")).first().boundingBox();
    const iy = iv.y + iv.height / 2;
    const ir = await frame(p, iv);
    const iSurface = ir.at(iv.x - 9, iy);
    const edgePx = (f) => f.row(iy, iv.x - 1, iv.x + 3).reduce((a, b) => (contrast(b, iSurface) > contrast(a, iSurface) ? b : a));
    const restPx = edgePx(ir);
    await p.mouse.move(iv.x + iv.width / 2, iy);
    await p.waitForTimeout(SETTLE);
    const hoverPx = edgePx(await frame(p, iv));
    const iEdge = contrast(restPx, iSurface);
    check(
      iEdge >= 3 && reddish(restPx) && reddish(hoverPx),
      `${name} invalid is perceivable and survives hover`,
      `edge ${r2(iEdge)}:1, rgb(${restPx}) at rest, rgb(${hoverPx}) under the pointer`,
    );
    await p.close();
  }
}

async function switchControl(context, platform, theme) {
  const A = ADAPTERS[platform];
  const name = `${platform} ${theme} switch`;
  const page = await open(context, platform, "switch", theme);
  const sel = (c) => A.control("switch", c).visual;
  const off = await page.locator(sel("off")).first().boundingBox();
  const on = await page.locator(sel("on")).first().boundingBox();
  const fOff = await frame(page, off);
  const fOn = await frame(page, on);
  const quarter = (f, r, t) => f.at(r.x + r.width * t, r.y + r.height / 2);
  // The thumb is the shape: it sits at the start when off and at the end when on.
  const thumbOff = quarter(fOff, off, 0.27);
  const thumbOn = quarter(fOn, on, 0.73);
  const travelled = contrast(thumbOff, quarter(fOff, off, 0.73)) >= 1.3 && contrast(thumbOn, quarter(fOn, on, 0.27)) >= 1.3;
  check(travelled, `${name} on/off is a thumb position`, `thumb ${r2(contrast(thumbOff, quarter(fOff, off, 0.73)))}:1 against the off track, ${r2(contrast(thumbOn, quarter(fOn, on, 0.27)))}:1 against the on track`);

  const cy = off.y + off.height / 2;
  const layerAt = (f) => f.at(off.x - 3, cy);
  await page.mouse.move(off.x + off.width * 0.75, cy);
  await page.waitForTimeout(SETTLE);
  const hover = await frame(page, off);
  const layer = contrast(layerAt(hover), layerAt(fOff));
  check(layer >= 1.05, `${name} hover draws a state layer`, `${r2(layer)}:1 outside the track against rest`);
  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  const pressed = await frame(page, off);
  const deeper = contrast(layerAt(pressed), layerAt(hover));
  check(deeper >= 1.05, `${name} pressed differs from hover`, `layer ${r2(deeper)}:1 against hover's`);
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.close();

  const p = await open(context, platform, "switch", theme);
  const focused = await keyboardFocus(p, sel("off"));
  const surface = fOff.at(off.x - 9, cy);
  const ring = maxContrast((await frame(p, off)).row(cy, off.x - 6, off.x - 0.5), surface);
  await p.mouse.move(off.x + off.width * 0.75, cy);
  await p.waitForTimeout(SETTLE);
  const ringHovered = maxContrast((await frame(p, off)).row(cy, off.x - 6, off.x - 0.5), surface);
  check(focused && ring >= 3 && ringHovered >= 3, `${name} focus ring is the strongest state`, `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1, with the pointer on it ${r2(ringHovered)}:1`);
  const d = await p.locator(sel("disabled")).first().boundingBox();
  await p.mouse.move(0, 0);
  await p.locator(sel("disabled")).first().evaluate((el) => el.ownerDocument.activeElement?.blur?.());
  await p.waitForTimeout(SETTLE);
  const dr = await frame(p, d);
  await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
  await p.waitForTimeout(SETTLE);
  const moved = (await frame(p, d)).changed(dr);
  check(moved === 0, `${name} disabled is inert`, `${moved} pixel(s) changed on hover`);
  await p.close();
}

async function segmentControl(context, platform, theme) {
  const A = ADAPTERS[platform];
  const name = `${platform} ${theme} segment`;
  for (const where of ["page", "card"]) {
    const page = await open(context, platform, "segment", theme);
    const track = await page.locator(A.track(where)).first().boundingBox();
    const on = await page.locator(A.segment(where, "on").visual).first().boundingBox();
    const f = await frame(page, track);
    const cy = on.y + on.height / 2;
    const trackPx = f.at(track.x + 2, cy);
    const segPx = f.at(on.x + 5, cy);
    const edge = maxContrast(f.row(cy, on.x - 0.5, on.x + 1.5), trackPx);
    check(
      lum(segPx) > lum(trackPx) && edge >= 1.2,
      `${name} chosen segment sits above its track (${where})`,
      `segment L ${lum(segPx).toFixed(4)} vs track L ${lum(trackPx).toFixed(4)}, edge ${r2(edge)}:1`,
    );
    if (where === "card") {
      const cardBox = await page.locator(A.track(where)).first().evaluate((el, cardSel) => {
        const c = el.closest(cardSel).getBoundingClientRect();
        return { x: c.x, y: c.y, width: c.width, height: c.height };
      }, A.card);
      const cf = await frame(page, cardBox);
      const cardPx = cf.at(cardBox.x + 8, cardBox.y + cardBox.height - 4);
      check(lum(trackPx) < lum(cardPx), `${name} track is an inset well in the Card`, `track L ${lum(trackPx).toFixed(4)} vs card L ${lum(cardPx).toFixed(4)}`);
    }
    await page.close();
  }

  const page = await open(context, platform, "segment", theme);
  const off = await page.locator(A.segment("page", "off").visual).first().boundingBox();
  const cy = off.y + off.height / 2;
  const fillAt = (f) => f.at(off.x + 5, cy);
  const rest = await frame(page, off);
  await page.mouse.move(off.x + off.width / 2, cy);
  await page.waitForTimeout(SETTLE);
  const hover = await frame(page, off);
  const hv = contrast(fillAt(hover), fillAt(rest));
  check(hv >= 1.05, `${name} unchosen segment answers hover`, `fill ${r2(hv)}:1 against rest`);
  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  const pressed = await frame(page, off);
  const pv = contrast(fillAt(pressed), fillAt(hover));
  check(pv >= 1.05, `${name} pressed differs from hover`, `fill ${r2(pv)}:1 against hover's`);
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.close();

  const p = await open(context, platform, "segment", theme);
  const seg = A.segment("page", "on");
  const onBox = await p.locator(seg.visual).first().boundingBox();
  const track = await p.locator(A.track("page")).first().boundingBox();
  const t0 = await frame(p, track);
  const trackPx = t0.at(track.x + 2, onBox.y + onBox.height / 2);
  const focused = await keyboardFocus(p, seg.target ?? seg.visual);
  const fy = onBox.y + onBox.height / 2;
  const ring = maxContrast((await frame(p, track)).row(fy, onBox.x - 3, onBox.x + 1), trackPx);
  check(focused && ring >= 3, `${name} focus ring clears 3:1`, `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1 against the track`);
  await p.close();

  const q = await open(context, platform, "segment", theme);
  const d = await q.locator(A.segment("page", "disabled").visual).first().boundingBox();
  const dr = await frame(q, d);
  await q.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
  await q.waitForTimeout(SETTLE);
  const moved = (await frame(q, d)).changed(dr);
  check(moved === 0, `${name} disabled segment is inert`, `${moved} pixel(s) changed on hover`);
  await q.close();
}

/** Motion on the state layer: perceptible normally, gone under reduced motion, same end state. */
async function motion(platform, theme) {
  const A = ADAPTERS[platform];
  const sel = A.control("checkbox", "unchecked").visual;
  let normalEnd = null;
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await open(ctx, platform, "checkbox", theme);
    const box = await page.locator(sel).first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const m = await page.locator(sel).first().evaluate((el) => {
      const t = el.getAnimations().find((a) => a.transitionProperty === "box-shadow");
      if (!t) return { none: true };
      const duration = t.effect.getComputedTiming().duration;
      t.finish();
      return { none: false, duration };
    });
    await page.waitForTimeout(SETTLE);
    const end = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).boxShadow);
    const name = `${platform} ${theme} checkbox`;
    if (!reduced) {
      check(!m.none && m.duration >= PERCEPTIBLE_MS, `${name} state layer animates`, m.none ? "no box-shadow transition ran" : `${Math.round(m.duration)}ms box-shadow transition`);
      normalEnd = end;
    } else {
      check((m.none || m.duration <= SUPPRESSED_MS) && end === normalEnd, `${name} reduced motion lands without animating`, `${m.none ? "no transition" : `${m.duration}ms transition`}, end state ${end === normalEnd ? "matches" : "DIFFERS from"} normal motion`);
    }
    await ctx.close();
  }
}

for (const platform of PLATFORMS) {
  for (const theme of ["light", "dark"]) {
    report.push(`\n${platform} · ${theme}`);
    const context = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: DPR });
    await boxControl(context, platform, "checkbox", theme);
    await boxControl(context, platform, "radio", theme);
    await switchControl(context, platform, theme);
    await segmentControl(context, platform, theme);
    await context.close();
    await motion(platform, theme);
  }
}

await browser.close();
storybook?.close();
angular?.close();
if (angularDir) rmSync(angularDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ selection-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nselection-visual ok — the selection-control state contract holds for ${PLATFORMS.join(" and ")}, in light and dark, on rendered pixels.`);
