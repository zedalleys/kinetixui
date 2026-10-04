/**
 * entry-visual.mjs — the text-entry and navigation state contract, measured on rendered pixels in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && pnpm build:tokens && node scripts/entry-visual.mjs
 *   node scripts/entry-visual.mjs --platform=React     one platform only (React | Angular)
 *
 * Visual Slice 3 (TOKENS.md, "Text entry and navigation") makes claims about how Input, Textarea, Select,
 * NativeSelect and Tabs LOOK in each state: that a field's boundary is identifiable at 3:1, that hover
 * answers the pointer without competing with focus or erasing invalid, that focus is the strongest signal
 * and survives the pointer, that read-only is neither editable-looking nor disabled-looking, that a disabled
 * control does not answer, that a placeholder is readable but quieter than a value, and that a selected tab
 * is told apart by more than its text colour, in both themes. None of that is provable from class names, and
 * jsdom has no pixels.
 *
 * Two platforms, one set of assertions:
 *
 *   React     the `EntryStates` stories (Input, Textarea, Select, NativeSelect) and `States` (Tabs)
 *   Angular   the DOM Angular renders for the same states (src/lib/entry-render.spec.ts), painted with the
 *             package's own styles.css and the generated token CSS (visual-harness.mjs). Angular has no
 *             Select (its catalogue entry is NativeSelect), and its tabs are an underlined strip rather than
 *             React's segmented well — the SAME semantic assertions are made of both, through an adapter
 *             that says where each platform draws its selected cue.
 *
 * ── Method ───────────────────────────────────────────────────────────────
 *
 * The instrument check:selection-visual uses: every pixel sample is taken away from text (the field's left
 * edge at mid-height, a strip just outside it, a patch of a tab's padding), every assertion is a RELATION
 * between two renderings in the same run, and absolute thresholds appear only where a standard names one —
 * 3:1 for a boundary (SC 1.4.11) and 4.5:1 for placeholder text (SC 1.4.3). Placeholder colour is read from
 * computed style, because sampling glyph pixels would measure the runner's font, not the contract.
 *
 * ── What it asserts, per platform and theme ──────────────────────────────
 *
 *   boundary   a resting field's edge clears 3:1 against the Card it sits in
 *   placeholder  computed placeholder colour clears 4.5:1 on the field, and is weaker than a value's
 *   hover      the edge changes under the pointer
 *   focus      the ring outside the field clears 3:1, out-draws hover, and with the pointer on top neither
 *              the ring nor the focused edge changes
 *   invalid    the edge is the destructive colour at 3:1, and stays that colour under the pointer and when
 *              focused with the pointer on it
 *   read-only  (input, textarea) an inset fill unlike the editable field's, full-strength text, and no
 *              answer to the pointer
 *   disabled   hovering changes no pixel, and the edge is weaker than an enabled one
 *   tabs       the selected tab carries a non-colour cue in both themes, on the page and in a Card; an
 *              unselected tab answers hover; the keyboard ring clears 3:1 against the strip, beats hover, and
 *              the selected cue survives focus; a disabled tab is inert
 *   motion     hover runs a perceptible transition; under prefers-reduced-motion it runs none (or ≤2ms) and
 *              lands on the same end state
 *
 * What it does not assert: pressed on a field (pressing a text field places the caret and focuses it; pressing
 * a select opens it), or pressed on a tab (Radix and Angular both select a tab on press, so pressed IS selected).
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { buildAngularSubject, contrast, decode, lum, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const COVERS = gate("scripts/entry-visual.mjs").covers;
const only = process.argv.find((a) => a.startsWith("--platform="))?.slice("--platform=".length);
if (only && !COVERS[only]) {
  console.error(`entry-visual: --platform=${only} is not one this gate covers (${Object.keys(COVERS).join(", ")})`);
  process.exit(2);
}
const PLATFORMS = only ? [only] : Object.keys(COVERS);

const DPR = 2;
/** long enough for the 200ms `duration-fast` transitions to finish */
const SETTLE = 350;
/** padding around a control's box in each screenshot: room for the 4px focus glow */
const PAD = 12;

/* ── subjects ─────────────────────────────────────────────────────────── */

const STORY = {
  input: "form-inputs-input--entry-states",
  textarea: "form-inputs-textarea--entry-states",
  select: "form-inputs-select--entry-states",
  "native-select": "form-inputs-nativeselect--entry-states",
  tabs: "navigation-tabs--states",
};
/** registry slug → which cases its story renders */
const FIELDS = {
  input: { readonly: true, placeholder: "placeholder" },
  textarea: { readonly: true, placeholder: "placeholder" },
  select: { readonly: false, placeholder: "trigger" },
  "native-select": { readonly: false, placeholder: "select" },
};

/**
 * Where each platform keeps each state. Both platforms put `data-kx-case` on the control itself; what
 * differs is the tab strip's shape, so `tabCue` says how to read a selected tab on each.
 */
const ADAPTERS = {
  React: {
    field: (kind, c) => `[data-kx-case="${c}"]`,
    tabList: (where) => `[role=tablist][data-kx-case="${where}"]`,
    tab: (where, c) => `[role=tablist][data-kx-case="${where}"] [data-kx-case="${c}"]`,
    // A segmented well: the selected tab is a raised surface on it — lighter than the strip, with an edge.
    tabCue: "surface",
  },
  Angular: {
    field: (kind, c) => `[data-kx-case="${c}"]`,
    tabList: (where) => `kx-tab-list[data-kx-case="${where}"]`,
    tab: (where, c) => `kx-tab-list[data-kx-case="${where}"] [data-kx-case="${c}"]`,
    // An underlined strip: the selected tab carries a 2px indicator along its block-end edge.
    tabCue: "indicator",
  },
};

/* ── pages ────────────────────────────────────────────────────────────── */

let storybook = null;
let angular = null;
function buildAngularPage() {
  return buildAngularSubject("src/lib/entry-render.spec.ts", {
    name: "entry-visual",
    layout: `
    body { margin: 0; padding: 24px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: var(--font-family-sans); }
    .kx-render-grid { display: grid; gap: 24px; grid-template-columns: repeat(3, 22rem); align-items: start; }
    .kx-render-stack { display: grid; gap: 20px; padding-block-start: 24px; }
    .kx-render-field { display: grid; gap: 8px; }
    .kx-render-error { margin: 0; font: var(--text-body-sm); color: hsl(var(--destructive)); }`,
  });
}

async function open(context, platform, kind, theme) {
  const page = await context.newPage();
  const base = platform === "React" ? storybook.base : angular.base;
  // Hermetic: anything remote (a web font) only makes a screenshot wait. Samples are taken away from text.
  await page.route((url) => !url.href.startsWith(base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(
    platform === "React" ? `${storybook.base}/iframe.html?id=${STORY[kind]}&viewMode=story&globals=theme:${theme}` : `${angular.base}/${theme}.html`,
    { waitUntil: "load" },
  );
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
    /** device pixels along a vertical line between two CSS y values */
    column(x, y0, y1) {
      const out = [];
      for (let y = y0; y <= y1; y += 1 / DPR) out.push(this.at(x, y));
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
/** the pixel in `pixels` that stands furthest from `against` */
const strongest = (pixels, against) => pixels.reduce((a, b) => (contrast(b, against) > contrast(a, against) ? b : a));
const r2 = (n) => n.toFixed(2);
/** red clearly dominant — the destructive role, as distinct from the neutral and blue edges */
const reddish = ([r, g, b]) => r - Math.max(g, b) >= 40;
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

/* ── run ──────────────────────────────────────────────────────────────── */

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(56)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};

if (PLATFORMS.includes("React")) {
  const staticDir = join(root, "apps/docs/storybook-static");
  if (!existsSync(join(staticDir, "index.json"))) {
    console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
    process.exit(2);
  }
  assertUiDistMatchesSource("entry-visual");
  const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
  for (const id of Object.values(STORY)) {
    if (!index.entries[id]) {
      console.error(`entry-visual: story ${id} is not in the built Storybook — gen:stories and build-storybook first.`);
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

/** The field's left edge at mid-height, and the Card surface beside it. */
function edgeOf(f, r) {
  const cy = r.y + r.height / 2;
  const surface = f.at(r.x - 9, cy);
  const px = strongest(f.row(cy, r.x - 0.5, r.x + 1.5), surface);
  return { px, contrast: contrast(px, surface), surface, cy };
}
/** What is drawn in the strip just outside the field — where the focus ring lives and hover draws nothing. */
const outside = (f, r, surface) => maxContrast(f.row(r.y + r.height / 2, r.x - 4, r.x - 1), surface);

/** Input, Textarea, Select, NativeSelect: one field contract. */
async function field(context, platform, kind, theme) {
  const A = ADAPTERS[platform];
  const name = `${platform} ${theme} ${kind}`;
  const sel = (c) => A.field(kind, c);
  const scope = (c) => (platform === "Angular" ? `[data-kx-kind="${kind}"] ${sel(c)}` : sel(c));
  const page = await open(context, platform, kind, theme);
  const box = (c) => page.locator(scope(c)).first().boundingBox();

  // Rest and hover, on the empty field.
  const rr = await box("rest");
  const rest = await frame(page, rr);
  const e0 = edgeOf(rest, rr);
  check(e0.contrast >= 3, `${name} resting boundary clears 3:1`, `${r2(e0.contrast)}:1 against the card`);
  await page.mouse.move(rr.x + rr.width / 2, rr.y + rr.height / 2);
  await page.waitForTimeout(SETTLE);
  const hover = await frame(page, rr);
  const e1 = edgeOf(hover, rr);
  const delta = contrast(e1.px, e0.px);
  check(delta >= 1.2, `${name} hover changes the edge`, `${r2(delta)}:1 against rest (rgb(${e0.px}) → rgb(${e1.px}))`);
  const hoverOutside = outside(hover, rr, e0.surface);
  await page.mouse.move(0, 0);

  // Placeholder: readable, and quieter than a value.
  const ink = await page.evaluate(
    ({ rest, filled, how }) => {
      const restEl = document.querySelector(rest);
      const filledEl = document.querySelector(filled);
      const bg = getComputedStyle(restEl).backgroundColor;
      const placeholder =
        how === "placeholder" ? getComputedStyle(restEl, "::placeholder").color : getComputedStyle(restEl).color;
      return { bg, placeholder, value: getComputedStyle(filledEl).color };
    },
    { rest: scope("rest"), filled: scope("filled"), how: FIELDS[kind].placeholder },
  );
  const pc = contrast(rgb(ink.placeholder), rgb(ink.bg));
  const vc = contrast(rgb(ink.value), rgb(ink.bg));
  check(pc >= 4.5 && pc < vc, `${name} placeholder readable and subordinate`, `placeholder ${r2(pc)}:1, value ${r2(vc)}:1 on the field`);
  await page.close();

  // Focus: the strongest state, and the pointer cannot take it over.
  {
    const p = await open(context, platform, kind, theme);
    const focused = await keyboardFocus(p, scope("rest"));
    const f = await frame(p, rr);
    const ring = outside(f, rr, e0.surface);
    const fe = edgeOf(f, rr);
    await p.mouse.move(rr.x + rr.width / 2, rr.y + rr.height / 2);
    await p.waitForTimeout(SETTLE);
    const fh = await frame(p, rr);
    const ringHovered = outside(fh, rr, e0.surface);
    const kept = contrast(edgeOf(fh, rr).px, fe.px);
    check(
      focused && ring >= 3 && ring > hoverOutside && ringHovered >= 3 && kept < 1.1,
      `${name} focus is the strongest state`,
      `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1 (hover alone ${r2(hoverOutside)}:1), with the pointer on it ${r2(ringHovered)}:1, focused edge moved ${r2(kept)}:1 under the pointer`,
    );
    await p.close();
  }

  // Invalid: perceivable, destructive, and kept under the pointer and under focus + pointer.
  {
    const p = await open(context, platform, kind, theme);
    const ir = await p.locator(scope("invalid")).first().boundingBox();
    const at = async () => edgeOf(await frame(p, ir), ir);
    const i0 = await at();
    await p.mouse.move(ir.x + ir.width / 2, ir.y + ir.height / 2);
    await p.waitForTimeout(SETTLE);
    const i1 = await at();
    await keyboardFocus(p, scope("invalid"));
    const i2 = await at();
    check(
      i0.contrast >= 3 && reddish(i0.px) && reddish(i1.px) && reddish(i2.px),
      `${name} invalid survives hover and focus`,
      `edge ${r2(i0.contrast)}:1, rgb(${i0.px}) at rest, rgb(${i1.px}) hovered, rgb(${i2.px}) focused + hovered`,
    );
    await p.close();
  }

  // Read-only: an inset fill, full-strength text, no hover.
  if (FIELDS[kind].readonly) {
    const p = await open(context, platform, kind, theme);
    const ro = await p.locator(scope("readonly")).first().boundingBox();
    const fr = await frame(p, ro);
    const fill = fr.at(ro.x + 4, ro.y + 4);
    const editable = rest.at(rr.x + 4, rr.y + 4);
    const fillStep = contrast(fill, editable);
    const style = await p.locator(scope("readonly")).first().evaluate((el) => ({ opacity: getComputedStyle(el).opacity, color: getComputedStyle(el).color }));
    await p.mouse.move(ro.x + ro.width / 2, ro.y + ro.height / 2);
    await p.waitForTimeout(SETTLE);
    const moved = (await frame(p, ro)).changed(fr);
    check(
      fillStep >= 1.03 && style.opacity === "1" && style.color === ink.value && moved === 0,
      `${name} read-only is distinct from editable and disabled`,
      `fill ${r2(fillStep)}:1 against an editable field, opacity ${style.opacity}, text ${style.color === ink.value ? "= value colour" : `${style.color} ≠ value colour`}, ${moved} pixel(s) changed on hover`,
    );
    await p.close();
  }

  // Disabled: inert, and visibly weaker.
  {
    const p = await open(context, platform, kind, theme);
    const d = await p.locator(scope("disabled")).first().boundingBox();
    const dr = await frame(p, d);
    const de = edgeOf(dr, d);
    await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
    await p.waitForTimeout(SETTLE);
    const moved = (await frame(p, d)).changed(dr);
    check(moved === 0 && de.contrast < e0.contrast, `${name} disabled is inert and weaker`, `${moved} pixel(s) changed on hover, edge ${r2(de.contrast)}:1 vs enabled ${r2(e0.contrast)}:1`);
    await p.close();
  }
}

/** Tabs: one navigation group with a selected tab that is more than a text colour. */
async function tabs(context, platform, theme) {
  const A = ADAPTERS[platform];
  const name = `${platform} ${theme} tabs`;
  for (const where of ["page", "card"]) {
    const page = await open(context, platform, "tabs", theme);
    const list = await page.locator(A.tabList(where)).first().boundingBox();
    const on = await page.locator(A.tab(where, "selected")).first().boundingBox();
    const off = await page.locator(A.tab(where, "unselected")).first().boundingBox();
    const f = await frame(page, list);
    const cy = on.y + on.height / 2;
    if (A.tabCue === "surface") {
      const strip = f.at(list.x + 2, cy);
      const seg = f.at(on.x + 5, cy);
      const edge = maxContrast(f.row(cy, on.x - 0.5, on.x + 1.5), strip);
      check(
        lum(seg) > lum(strip) && edge >= 1.2,
        `${name} selected tab is a raised surface (${where})`,
        `tab L ${lum(seg).toFixed(4)} vs strip L ${lum(strip).toFixed(4)}, edge ${r2(edge)}:1`,
      );
    } else {
      // The indicator: the strongest pixel in the bottom 3px of the selected tab, against the same band
      // under an unselected one.
      const band = (r) => f.row(r.y + r.height - 1, r.x + 6, r.x + r.width - 6);
      const surface = f.at(off.x + 4, off.y + 4);
      const ind = maxContrast(band(on), surface);
      const none = maxContrast(band(off), surface);
      check(ind >= 3 && ind > none * 1.5, `${name} selected tab carries an indicator (${where})`, `indicator ${r2(ind)}:1, unselected ${r2(none)}:1 against the strip`);
    }
    await page.close();
  }

  // Hover on an unselected tab.
  const page = await open(context, platform, "tabs", theme);
  const off = await page.locator(A.tab("page", "unselected")).first().boundingBox();
  const fillAt = (f) => f.at(off.x + 5, off.y + off.height / 2);
  const rest = await frame(page, off);
  await page.mouse.move(off.x + off.width / 2, off.y + off.height / 2);
  await page.waitForTimeout(SETTLE);
  const hover = await frame(page, off);
  const hv = contrast(fillAt(hover), fillAt(rest));
  check(hv >= 1.05, `${name} unselected tab answers hover`, `fill ${r2(hv)}:1 against rest`);
  await page.close();

  // Focus on the selected tab: the ring clears 3:1 against what it sits on, beats hover, and the selected
  // cue survives it.
  {
    const p = await open(context, platform, "tabs", theme);
    const on = await p.locator(A.tab("page", "selected")).first().boundingBox();
    const list = await p.locator(A.tabList("page")).first().boundingBox();
    const cy = on.y + on.height / 2;
    const r0 = await frame(p, list);
    // what the ring is drawn on: the strip's well for a segmented strip, the page for an underlined one
    const behind = A.tabCue === "surface" ? r0.at(list.x + 2, cy) : r0.at(on.x - 6, cy);
    const focused = await keyboardFocus(p, A.tab("page", "selected"));
    const f = await frame(p, list);
    const ring = maxContrast(f.row(cy, on.x - 2.5, on.x + 0.5), behind);
    const cue =
      A.tabCue === "surface"
        ? lum(f.at(on.x + 5, cy)) > lum(behind)
        : maxContrast(f.row(on.y + on.height - 1, on.x + 6, on.x + on.width - 6), f.at(on.x + 4, on.y + 4)) >= 3;
    check(focused && ring >= 3 && ring > hv && cue, `${name} focus is strongest and keeps the selected cue`, `${focused ? "" : "NOT FOCUSED, "}ring ${r2(ring)}:1 (hover ${r2(hv)}:1), selected cue ${cue ? "kept" : "LOST"}`);
    await p.close();
  }

  // Disabled tab: inert.
  {
    const q = await open(context, platform, "tabs", theme);
    const d = await q.locator(A.tab("page", "disabled")).first().boundingBox();
    const dr = await frame(q, d);
    await q.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
    await q.waitForTimeout(SETTLE);
    const moved = (await frame(q, d)).changed(dr);
    check(moved === 0, `${name} disabled tab is inert`, `${moved} pixel(s) changed on hover`);
    await q.close();
  }
}

/** Motion: hover transitions are perceptible normally, gone under reduced motion, same end state. */
async function motion(platform, theme, kind, selector, property) {
  let normalEnd = null;
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 1600 }, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await open(ctx, platform, kind, theme);
    const el = page.locator(selector).first();
    const box = await el.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const m = await el.evaluate((node, prop) => {
      // A shorthand transitions per longhand: border-color runs as four border-*-color transitions.
      const t = node.getAnimations().find((a) => a.transitionProperty === (prop === "border-color" ? "border-left-color" : prop));
      if (!t) return { none: true };
      const duration = t.effect.getComputedTiming().duration;
      t.finish();
      return { none: false, duration };
    }, property);
    await page.waitForTimeout(SETTLE);
    const end = await el.evaluate((node, prop) => getComputedStyle(node)[prop === "border-color" ? "borderLeftColor" : "backgroundColor"], property);
    const name = `${platform} ${theme} ${kind}`;
    if (!reduced) {
      check(!m.none && m.duration >= PERCEPTIBLE_MS, `${name} hover ${property} animates`, m.none ? `no ${property} transition ran` : `${Math.round(m.duration)}ms ${property} transition`);
      normalEnd = end;
    } else {
      check(
        (m.none || m.duration <= SUPPRESSED_MS) && end === normalEnd,
        `${name} reduced motion lands without animating`,
        `${m.none ? "no transition" : `${m.duration}ms transition`}, end state ${end === normalEnd ? "matches" : "DIFFERS from"} normal motion`,
      );
    }
    await ctx.close();
  }
}

for (const platform of PLATFORMS) {
  const A = ADAPTERS[platform];
  const kinds = COVERS[platform];
  for (const theme of ["light", "dark"]) {
    report.push(`\n${platform} · ${theme}`);
    const context = await browser.newContext({ viewport: { width: 1300, height: 1600 }, deviceScaleFactor: DPR });
    for (const kind of Object.keys(FIELDS).filter((k) => kinds.includes(k))) await field(context, platform, kind, theme);
    if (kinds.includes("tabs")) await tabs(context, platform, theme);
    await context.close();
    const inputSel = platform === "Angular" ? `[data-kx-kind="input"] ${A.field("input", "rest")}` : A.field("input", "rest");
    await motion(platform, theme, "input", inputSel, "border-color");
    await motion(platform, theme, "tabs", A.tab("page", "unselected"), "background-color");
  }
}

await browser.close();
storybook?.close();
angular?.close();
if (angularDir) rmSync(angularDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ entry-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nentry-visual ok — the text-entry and navigation state contract holds for ${PLATFORMS.join(" and ")}, in light and dark, on rendered pixels.`);
