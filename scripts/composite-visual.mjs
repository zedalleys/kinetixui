/**
 * composite-visual.mjs — the composite-field state contract, measured on rendered pixels in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && pnpm build:tokens && node scripts/composite-visual.mjs
 *   node scripts/composite-visual.mjs --platform=React     one platform only (React | Angular)
 *
 * Visual Slice 4 (TOKENS.md, "Composite fields") extends the text-entry contract `check:entry-visual` holds
 * Input, Textarea and the selects to, to the fields that are built from parts: InputGroup (an input with
 * add-ons and a button), NumberInput (an input between two steppers), MultiSelect (chips inside a combobox)
 * and InputOTP (one code across six slots). A composite is ONE field, so every claim is about the wrapper the
 * reader sees as the field — and two claims are new, because only a composite can get them wrong:
 *
 *   one edge     the wrapper draws the field's single boundary; no part adds a second border along it
 *   ownership    focus on a PART (a button inside the field) is drawn by that part and leaves the field's
 *                own focus ring off, so the ring always says which thing the keyboard is on
 *
 * Two platforms, one set of assertions:
 *
 *   React     the `EntryStates` stories for InputGroup, NumberInput, MultiSelect and InputOTP
 *   Angular   the DOM Angular renders for kx-number-input and kx-password-input (its implemented composites;
 *             input-group, input-otp and multi-select are planned there) — src/lib/composite-render.spec.ts,
 *             painted with the package's own styles.css and the generated token CSS (visual-harness.mjs)
 *
 * ── Method ───────────────────────────────────────────────────────────────
 *
 * The instrument the other state gates use: samples are taken away from text (the wrapper's start edge at
 * mid-height, a strip just outside it), every assertion is a RELATION between two renderings in the same
 * run, and absolute thresholds appear only where a standard names one — 3:1 for a boundary or focus
 * indicator (SC 1.4.11), 4.5:1 for placeholder text (SC 1.4.3). Placeholder colour is read from computed
 * style, because sampling glyph pixels would measure the runner's font, not the contract.
 *
 * ── What it asserts, per platform, component and theme ───────────────────
 *
 *   boundary     the resting wrapper's edge clears 3:1 against the Card it sits in
 *   one edge     that edge is one 1px line: no part's own border doubles it
 *   divider      an internal divider (InputGroupButton, NumberInput's steppers) is visible but quieter than
 *                the field's edge — structure, not a second boundary
 *   placeholder  readable (4.5:1) and below a value
 *   hover        the edge changes under the pointer
 *   focus        focusing the input draws a ring outside the wrapper that clears 3:1, out-draws hover, and
 *                stays put with the pointer on it
 *   ownership    a focused part draws its own ring (3:1) and the wrapper's focus ring stays off
 *   invalid      destructive edge at 3:1, kept under the pointer and under focus + pointer
 *   read-only    an inset fill unlike an editable field, no answer to the pointer, and (NumberInput) steppers
 *                that cannot change the value
 *   disabled     hovering changes no pixel, and the edge is weaker than an enabled one
 *   motion       hover runs a perceptible border transition; under reduced motion none, same end state
 *
 * A component that has no such state is skipped for that row, and the report says so: MultiSelect has no
 * read-only or disabled prop; InputOTP has no read-only and its slots are cells, not a divided control;
 * Angular's kx-number-input and kx-password-input have no read-only input, and kx-number-input's steppers are
 * deliberately not keyboard stops (they duplicate the input's own arrow keys), so it has no part to own focus.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { buildAngularSubject, waitForAngular, contrast, framer, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const COVERS = gate("scripts/composite-visual.mjs").covers;
const only = process.argv.find((a) => a.startsWith("--platform="))?.slice("--platform=".length);
if (only && !COVERS[only]) {
  console.error(`composite-visual: --platform=${only} is not one this gate covers (${Object.keys(COVERS).join(", ")})`);
  process.exit(2);
}
const PLATFORMS = only ? [only] : Object.keys(COVERS);

const DPR = 2;
/** long enough for the 100ms `duration-instant` transitions to finish */
const SETTLE = 350;
/** padding around a control's box in each screenshot: room for the 4px focus glow */
const PAD = 12;
const frame = framer({ dpr: DPR, pad: PAD });

/* ── subjects ─────────────────────────────────────────────────────────── */

const STORY = {
  "input-group": "form-inputs-inputgroup--entry-states",
  "number-input": "form-inputs-numberinput--entry-states",
  "multi-select": "form-inputs-multiselect--entry-states",
  "input-otp": "form-inputs-inputotp--entry-states",
};

/**
 * Per platform and component: where the wrapper (`shell`) and the focusable input (`input`) for a state are,
 * which part can take focus on its own (`part`), where an internal divider is drawn (`divider`), how the
 * placeholder is rendered, and which states the component has at all.
 */
const ADAPTERS = {
  React: {
    "input-group": {
      shell: (c) => `[data-slot=input-group][data-kx-case="${c}"]`,
      input: (c) => `[data-kx-case="${c}"] [data-slot=input-group-input]`,
      part: { case: "with-button", sel: `[data-kx-case="with-button"] [data-kx-part=button]` },
      // the button's inline-start border
      divider: { case: "with-button", sel: `[data-kx-case="with-button"] [data-kx-part=button]` },
      placeholder: "placeholder",
      readonly: true,
      disabled: true,
    },
    "number-input": {
      // NumberInput puts its props on the <input>; the wrapper is that input's parent
      shell: (c) => `div:has(> input[data-kx-case="${c}"])`,
      input: (c) => `input[data-kx-case="${c}"]`,
      part: { case: "rest", sel: `div:has(> input[data-kx-case="rest"]) > button[aria-label=Increase]` },
      // the input's inline-start border, between it and the decrease stepper
      divider: { case: "rest", sel: `input[data-kx-case="rest"]` },
      steppers: (c) => `div:has(> input[data-kx-case="${c}"]) > button`,
      placeholder: null,
      readonly: true,
      disabled: true,
    },
    "multi-select": {
      shell: (c) => `[role=combobox][data-kx-case="${c}"]`,
      input: (c) => `[role=combobox][data-kx-case="${c}"]`,
      placeholder: "span",
      readonly: false,
      disabled: false,
    },
    "input-otp": {
      // input-otp puts its props on a hidden <input> laid over the slots; the container holds both
      shell: (c) => `[data-input-otp-container]:has(input[data-kx-case="${c}"])`,
      input: (c) => `input[data-kx-case="${c}"]`,
      placeholder: null,
      readonly: false,
      disabled: true,
    },
  },
  Angular: {
    "number-input": {
      shell: (c) => `kx-number-input[data-kx-case="${c}"]`,
      input: (c) => `kx-number-input[data-kx-case="${c}"] input`,
      divider: null,
      steppers: (c) => `kx-number-input[data-kx-case="${c}"] button`,
      placeholder: null,
      readonly: false,
      disabled: true,
    },
    "password-input": {
      shell: (c) => `kx-password-input[data-kx-case="${c}"]`,
      input: (c) => `kx-password-input[data-kx-case="${c}"] input`,
      part: { case: "rest", sel: `kx-password-input[data-kx-case="rest"] button` },
      placeholder: null,
      readonly: false,
      disabled: true,
    },
  },
};

/* ── pages ────────────────────────────────────────────────────────────── */

let storybook = null;
let angular = null;
function buildAngularPage() {
  return buildAngularSubject("composite", {
    name: "composite-visual",
    layout: `
    body { margin: 0; padding: 24px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: var(--font-family-sans); }
    .kx-render-grid { display: grid; gap: 24px; grid-template-columns: repeat(2, 22rem); align-items: start; }
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
  else await waitForAngular(page);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  return page;
}

/* ── pixels ───────────────────────────────────────────────────────────── */

const maxContrast = (pixels, against) => Math.max(...pixels.map((p) => contrast(p, against)));
const strongest = (pixels, against) => pixels.reduce((a, b) => (contrast(b, against) > contrast(a, against) ? b : a));
const r2 = (n) => n.toFixed(2);
/** red clearly dominant — the destructive role, as distinct from the neutral and blue edges */
const reddish = ([r, g, b]) => r - Math.max(g, b) >= 40;
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

/** The wrapper's start edge at mid-height, and the Card surface beside it. */
function edgeOf(f, r) {
  const cy = r.y + r.height / 2;
  const surface = f.at(r.x - 9, cy);
  const px = strongest(f.row(cy, r.x - 0.5, r.x + 1.5), surface);
  return { px, contrast: contrast(px, surface), surface, cy };
}
/** What is drawn in the strip just outside the wrapper — where the focus ring lives and hover draws nothing. */
const outside = (f, r, surface) => maxContrast(f.row(r.y + r.height / 2, r.x - 4, r.x - 1), surface);
/**
 * How many device pixels, walking in from just outside the wrapper, stand out from BOTH the Card outside and
 * the field's own fill inside — the width of the drawn boundary. One CSS pixel at DPR 2 is 2.
 */
function edgeWidth(f, r) {
  const cy = r.y + r.height / 2;
  const surface = f.at(r.x - 9, cy);
  const fill = f.at(r.x + 6, cy);
  return f.row(cy, r.x - 2, r.x + 4).filter((p) => contrast(p, surface) >= 1.5 && contrast(p, fill) >= 1.5).length;
}

/* ── run ──────────────────────────────────────────────────────────────── */

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(60)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};
const skip = (label, why) => report.push(`  n/a  ${label.padEnd(60)} ${why}`);

if (PLATFORMS.includes("React")) {
  const staticDir = join(root, "apps/docs/storybook-static");
  if (!existsSync(join(staticDir, "index.json"))) {
    console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
    process.exit(2);
  }
  assertUiDistMatchesSource("composite-visual");
  const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
  for (const id of Object.values(STORY)) {
    if (!index.entries[id]) {
      console.error(`composite-visual: story ${id} is not in the built Storybook — gen:stories and build-storybook first.`);
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
const hoverCentre = async (page, r) => {
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(SETTLE);
};

async function composite(context, platform, kind, theme) {
  const A = ADAPTERS[platform][kind];
  const name = `${platform} ${theme} ${kind}`;
  const page = await open(context, platform, kind, theme);
  const box = (sel) => page.locator(sel).first().boundingBox();

  // Rest: the boundary, drawn once.
  const rr = await box(A.shell("rest"));
  const rest = await frame(page, rr);
  const e0 = edgeOf(rest, rr);
  check(e0.contrast >= 3, `${name} resting boundary clears 3:1`, `${r2(e0.contrast)}:1 against the card`);
  const width = edgeWidth(rest, rr);
  check(width >= 1 && width <= DPR, `${name} draws one edge`, `${width} device px of boundary at the start edge (1px = ${DPR})`);

  // Internal divider: present, and quieter than the field's own edge.
  if (A.divider) {
    const d = await box(A.divider.sel);
    const s = await box(A.shell(A.divider.case));
    const f = await frame(page, s);
    const cy = d.y + d.height / 2;
    const before = f.at(d.x - 3, cy);
    const line = strongest(f.row(cy, d.x - 0.5, d.x + 1.5), before);
    const dc = contrast(line, before);
    check(dc >= 1.1 && dc < e0.contrast, `${name} internal divider is quieter than the edge`, `divider ${r2(dc)}:1 against the field, edge ${r2(e0.contrast)}:1`);
  } else skip(`${name} internal divider`, "no internal divider");

  // Hover.
  await hoverCentre(page, rr);
  const hover = await frame(page, rr);
  const e1 = edgeOf(hover, rr);
  const delta = contrast(e1.px, e0.px);
  check(delta >= 1.2, `${name} hover changes the edge`, `${r2(delta)}:1 against rest (rgb(${e0.px}) → rgb(${e1.px}))`);
  const hoverOutside = outside(hover, rr, e0.surface);
  await page.mouse.move(0, 0);

  // Placeholder: readable, and quieter than a value.
  if (A.placeholder) {
    const ink = await page.evaluate(
      ({ rest, filled, how }) => {
        const shell = document.querySelector(rest.shell);
        const bg = getComputedStyle(shell).backgroundColor;
        if (how === "placeholder") {
          const value = document.querySelector(filled.input);
          return { bg, placeholder: getComputedStyle(document.querySelector(rest.input), "::placeholder").color, value: getComputedStyle(value).color, valueBg: bg };
        }
        // MultiSelect: the placeholder is a span inside the combobox; a value is a chip (Tag) in the same place,
        // read on the chip's own fill, which is what its text sits on
        const chip = document.querySelector(filled.shell).querySelector(":scope > span");
        return { bg, placeholder: getComputedStyle(shell.querySelector(":scope > span")).color, value: getComputedStyle(chip).color, valueBg: getComputedStyle(chip).backgroundColor };
      },
      { rest: { shell: A.shell("rest"), input: A.input("rest") }, filled: { shell: A.shell("filled"), input: A.input("filled") }, how: A.placeholder },
    );
    const pc = contrast(rgb(ink.placeholder), rgb(ink.bg));
    const vc = contrast(rgb(ink.value), rgb(ink.valueBg));
    check(pc >= 4.5 && pc < vc, `${name} placeholder readable and subordinate`, `placeholder ${r2(pc)}:1, value ${r2(vc)}:1 on the field`);
  } else skip(`${name} placeholder`, "no placeholder: the field always shows a value or empty cells");
  await page.close();

  // Focus on the input: the field's ring, the strongest state, and the pointer cannot take it over.
  {
    const p = await open(context, platform, kind, theme);
    const focused = await keyboardFocus(p, A.input("rest"));
    const f = await frame(p, rr);
    const ring = outside(f, rr, e0.surface);
    const fe = edgeOf(f, rr);
    await hoverCentre(p, rr);
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

  // Ownership: a focused part draws its own ring; the field's ring stays off.
  if (A.part) {
    const p = await open(context, platform, kind, theme);
    const s = await p.locator(A.shell(A.part.case)).first().boundingBox();
    const b = await p.locator(A.part.sel).first().boundingBox();
    const r0 = await frame(p, s);
    const surface = r0.at(s.x - 9, s.y + s.height / 2);
    const inside0 = r0.at(b.x + b.width / 2, b.y + 3);
    const focused = await keyboardFocus(p, A.part.sel);
    const f = await frame(p, s);
    // the part's ring: the strongest pixel along its block-start inner edge (the first two CSS pixels, so a
    // 1px inset ring counts as much as a 2px one), against its own fill at rest
    const partRing = Math.max(...[0.5, 1, 1.5].map((dy) => maxContrast(f.row(b.y + dy, b.x + 4, b.x + b.width - 4), inside0)));
    const fieldRing = outside(f, s, surface);
    check(
      focused && partRing >= 3 && fieldRing < 1.5,
      `${name} a focused part owns the ring`,
      `${focused ? "" : "NOT FOCUSED, "}part ring ${r2(partRing)}:1 inside the part, field ring ${r2(fieldRing)}:1 outside the field`,
    );
    await p.close();
  } else skip(`${name} focus ownership`, "no part that takes keyboard focus of its own");

  // Invalid: perceivable, destructive, and kept under the pointer and under focus + pointer.
  {
    const p = await open(context, platform, kind, theme);
    const ir = await p.locator(A.shell("invalid")).first().boundingBox();
    const at = async () => edgeOf(await frame(p, ir), ir);
    const i0 = await at();
    await hoverCentre(p, ir);
    const i1 = await at();
    await keyboardFocus(p, A.input("invalid"));
    const i2 = await at();
    check(
      i0.contrast >= 3 && reddish(i0.px) && reddish(i1.px) && reddish(i2.px),
      `${name} invalid survives hover and focus`,
      `edge ${r2(i0.contrast)}:1, rgb(${i0.px}) at rest, rgb(${i1.px}) hovered, rgb(${i2.px}) focused + hovered`,
    );
    await p.close();
  }

  // Read-only: an inset fill, no hover, and nothing inside it can change the value.
  if (A.readonly) {
    const p = await open(context, platform, kind, theme);
    const ro = await p.locator(A.shell("readonly")).first().boundingBox();
    const fr = await frame(p, ro);
    const fill = fr.at(ro.x + 3, ro.y + 3);
    const editable = rest.at(rr.x + 3, rr.y + 3);
    const fillStep = contrast(fill, editable);
    await hoverCentre(p, ro);
    const moved = (await frame(p, ro)).changed(fr);
    const steppersOff = A.steppers ? await p.locator(A.steppers("readonly")).evaluateAll((els) => els.every((e) => e.disabled)) : true;
    check(
      fillStep >= 1.03 && moved === 0 && steppersOff,
      `${name} read-only is distinct and cannot change`,
      `fill ${r2(fillStep)}:1 against an editable field, ${moved} pixel(s) changed on hover${A.steppers ? `, steppers ${steppersOff ? "disabled" : "STILL ENABLED"}` : ""}`,
    );
    await p.close();
  } else skip(`${name} read-only`, "no read-only state on this component");

  // Disabled: inert, and visibly weaker.
  if (A.disabled) {
    const p = await open(context, platform, kind, theme);
    const d = await p.locator(A.shell("disabled")).first().boundingBox();
    const dr = await frame(p, d);
    const de = edgeOf(dr, d);
    await hoverCentre(p, d);
    const moved = (await frame(p, d)).changed(dr);
    check(moved === 0 && de.contrast < e0.contrast, `${name} disabled is inert and weaker`, `${moved} pixel(s) changed on hover, edge ${r2(de.contrast)}:1 vs enabled ${r2(e0.contrast)}:1`);
    await p.close();
  } else skip(`${name} disabled`, "no disabled state on this component");
}

/** Motion: the hover edge transition is perceptible normally, gone under reduced motion, same end state. */
async function motion(platform, theme, kind) {
  const A = ADAPTERS[platform][kind];
  let normalEnd = null;
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 1600 }, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await open(ctx, platform, kind, theme);
    const shell = page.locator(A.shell("rest")).first();
    const box = await shell.boundingBox();
    // InputOTP draws its edge on the slots, not on the container the pointer is over
    const el = kind === "input-otp" ? shell.locator(":scope > div:first-child > div:first-child") : shell;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const m = await el.evaluate((node) => {
      const t = node.getAnimations().find((a) => a.transitionProperty === "border-left-color");
      if (!t) return { none: true };
      const duration = t.effect.getComputedTiming().duration;
      t.finish();
      return { none: false, duration };
    });
    await page.waitForTimeout(SETTLE);
    const end = await el.evaluate((node) => getComputedStyle(node).borderLeftColor);
    const name = `${platform} ${theme} ${kind}`;
    if (!reduced) {
      check(!m.none && m.duration >= PERCEPTIBLE_MS, `${name} hover border-color animates`, m.none ? "no border-color transition ran" : `${Math.round(m.duration)}ms border-color transition`);
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
  for (const theme of ["light", "dark"]) {
    report.push(`\n${platform} · ${theme}`);
    const context = await browser.newContext({ viewport: { width: 1300, height: 1600 }, deviceScaleFactor: DPR });
    for (const kind of COVERS[platform]) await composite(context, platform, kind, theme);
    await context.close();
    for (const kind of COVERS[platform]) await motion(platform, theme, kind);
  }
}

await browser.close();
storybook?.close();
angular?.close();
if (angularDir) rmSync(angularDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ composite-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\ncomposite-visual ok — the composite-field state contract holds for ${PLATFORMS.join(" and ")}, in light and dark, on rendered pixels.`);
