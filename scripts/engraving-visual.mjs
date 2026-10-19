/**
 * engraving-visual.mjs — rendered proof for `.kx-paper`, the Arabian Editorial Engraving printed sheet.
 *
 *   pnpm build:web && pnpm --filter @kinetixui/web start &
 *   node scripts/engraving-visual.mjs [--base http://127.0.0.1:3000] [--json]
 *
 * docs/design/ARABIAN-EDITORIAL-ENGRAVING.md states the direction in prose, and §5 states an accessibility
 * contract for every surface that adopts it. Prose cannot prove any of it. `.kx-paper` is the first shared
 * primitive, and the footer is the one surface printing on it, so this opens the real built site in
 * Chromium and reads the pixels back.
 *
 * ── Why relations and not a committed screenshot ──────────────────────────
 *
 * A baseline PNG is only as stable as the machine that recorded it; text antialiasing and the fallback
 * font differ between this container and a CI runner, so a committed image fails for reasons that are not
 * regressions. Every assertion below is either a relation between two renderings in the same run (light
 * vs dark, grain on vs grain off, old markup vs new) or a threshold from a published standard. The one
 * exception is `parity`, which compares two renderings of the same page seconds apart on the same
 * machine, where an exact comparison is the point.
 *
 * ── What it asserts ───────────────────────────────────────────────────────
 *
 *   ships    `.kx-paper` survives Tailwind's content scan into the built stylesheet. A primitive nothing
 *            names is removed from the bundle, so "it is in globals.css" is not evidence that it ships.
 *   paper    dark mode DIMS the sheet and does not invert it: the dark footer is darker than the light
 *            footer, and still lighter than the dark page around it. An inverted engraving would put the
 *            footer below the page, which is the failure this row exists to catch.
 *   grain    the 384px tile actually paints — a patch of plain paper, away from text and away from the
 *            plate, varies pixel to pixel. Its negative control removes `.kx-paper::before` and requires
 *            the same patch to go flat, so a run cannot pass with the grain silently gone.
 *   text     footer headings and the 70% secondary text clear WCAG AA against the paper they sit on, in
 *            both themes, measured against the composited colour rather than the token.
 *   tree     the decorative layers are out of the accessibility tree and hold nothing focusable: the
 *            plate is `aria-hidden`, and the grain is a pseudo-element, which cannot be in the tree at all.
 *   layout   no sideways page scroll at 320/390/768/1280/1440, LTR and RTL, at 100% and 200% text.
 *   motion   the decorative layers are static, with and without `prefers-reduced-motion` — doc §5.7 says
 *            decorative art does not move until a stage brings MOTION.md's full form with it.
 *   parity   the refactor changed nothing a reader sees: the footer rendered through `.kx-paper` is
 *            pixel-identical to the same footer mutated back to its pre-refactor markup.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { contrast, decode } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const asJson = process.argv.includes("--json");
/** The site's analytics runs on the built page; mark the traffic so a gate run never reads as a visit. */
const url = (path) => `${base}${path}?kx_traffic=diagnostic`;

/** WCAG 1.4.3 for text below 18.66px bold / 24px regular, which the footer's links and credits are. */
const CONTRAST_MIN = 4.5;
/**
 * What `site-footer.tsx` declared before `.kx-paper`, as literal CSS: `bg-accent text-foreground
 * dark:brightness-[0.85]` on the footer, and `pointer-events-none absolute inset-0 opacity-[0.22]
 * mix-blend-overlay` plus the tile on a grain <div>. See the comment on `checkParity` for why these are
 * declarations and not the original class names.
 */
const LEGACY_FOOTER_STYLE = (theme) =>
  [
    "position:relative",
    "overflow:hidden",
    "background-color:hsl(var(--accent))",
    "color:hsl(var(--foreground))",
    theme === "dark" ? "filter:brightness(0.85)" : "",
  ]
    .filter(Boolean)
    .join(";");
const LEGACY_GRAIN_STYLE =
  "pointer-events:none;position:absolute;inset:0;opacity:0.22;mix-blend-mode:overlay;background-image:url(/footer/paper-grain.webp);background-size:384px";

const failures = [];
const report = { ships: [], paper: [], grain: [], text: [], tree: [], layout: [], motion: [], parity: [] };
const ok = (row, line) => report[row].push(line);
const bad = (row, line) => {
  report[row].push(`FAIL ${line}`);
  failures.push(`${row}: ${line}`);
};

/* ── ships ──────────────────────────────────────────────────────────────── */
/*
 * Read the built stylesheet rather than the source. Tailwind removes hand-written `@layer components`
 * rules that no file under its content globs names, so a primitive can be present in globals.css, pass
 * review, and reach no visitor. This is the row that noticed it.
 */
function checkShips() {
  const dir = join(root, "apps/web/.next/static/css");
  let css = "";
  try {
    css = readdirSync(dir)
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
  } catch {
    bad("ships", `no built stylesheet under apps/web/.next/static/css — run \`pnpm build:web\` first`);
    return;
  }
  for (const sel of [".kx-paper", ".kx-print-surface"]) {
    if (css.includes(sel)) ok("ships", `${sel} is in the built stylesheet`);
    else bad("ships", `${sel} was purged from the built stylesheet — nothing under the content globs names it`);
  }
}

/* ── browser helpers ────────────────────────────────────────────────────── */
const setTheme = (page, theme) =>
  page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);

/** The footer's own box, scrolled into view and settled, so a screenshot of it is the printed sheet. */
async function footer(page) {
  const el = page.locator("footer").last();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  return el;
}

/** Mean channel value and mean absolute deviation over a decoded screenshot's pixels. */
function stats(png) {
  const { data, w, h } = decode(png);
  const px = [];
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    px.push((data[o] + data[o + 1] + data[o + 2]) / 3);
  }
  const mean = px.reduce((a, b) => a + b, 0) / px.length;
  const dev = px.reduce((a, b) => a + Math.abs(b - mean), 0) / px.length;
  return { mean, dev };
}

/** Two screenshots of the same clip: how many pixels differ by more than `tolerance` on any channel. */
function differingPixels(pngA, pngB, tolerance = 2) {
  const a = decode(pngA);
  const b = decode(pngB);
  if (a.w !== b.w || a.h !== b.h) return { share: 1, differing: -1, total: -1, resized: true };
  let differing = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (
      Math.abs(a.data[i] - b.data[i]) > tolerance ||
      Math.abs(a.data[i + 1] - b.data[i + 1]) > tolerance ||
      Math.abs(a.data[i + 2] - b.data[i + 2]) > tolerance
    )
      differing++;
  }
  const total = a.w * a.h;
  return { share: differing / total, differing, total, resized: false };
}

/**
 * A patch of plain paper: inside the footer's link area, left of the columns, clear of text and well above
 * the plate. Sampling anywhere near a glyph would measure antialiasing rather than grain.
 */
async function paperPatch(page) {
  const box = await (await footer(page)).boundingBox();
  return { x: Math.round(box.x + box.width - 60), y: Math.round(box.y + 24), width: 40, height: 40 };
}

/* ── paper, grain, text ─────────────────────────────────────────────────── */
async function checkSheet(page) {
  await page.goto(url("/"), { waitUntil: "networkidle" });

  const sample = {};
  for (const theme of ["light", "dark"]) {
    await setTheme(page, theme);
    const f = await footer(page);
    const patch = await paperPatch(page);

    const withGrain = await page.screenshot({ clip: patch });
    sample[theme] = {
      paper: stats(withGrain).mean,
      page: stats(await page.screenshot({ clip: { x: patch.x, y: 8, width: 40, height: 40 } })).mean,
    };

    /*
     * The grain is one 384px tile at 0.22, blended `overlay` on a near-white sheet, so its amplitude is
     * well under one 8-bit step on most pixels — an absolute "is this patch textured" threshold either
     * sits below the quantisation floor or catches nothing in dark mode, where the 0.85 dim compresses
     * it further. So ask the question directly instead: suppress `.kx-paper::before` and count how many
     * pixels of the same patch move. That comparison is its own negative control.
     */
    const suppressed = await page.addStyleTag({ content: ".kx-paper::before{display:none!important}" });
    await page.waitForTimeout(80);
    const withoutGrain = await page.screenshot({ clip: patch });
    // `addStyleTag` takes no id, so the handle is the only way back to the tag. Removing it by a guessed
    // id silently removes nothing, and the next theme then measures a page that still has the grain off.
    await suppressed.evaluate((node) => node.remove());
    sample[theme].grainPixels = differingPixels(withGrain, withoutGrain, 0);

    /*
     * Text, composited. Two things make the naive reading wrong here, and both were found by this gate
     * disagreeing with the footer's own recorded ratios:
     *
     *   - `.kx-print-surface` pins the footer's tokens to their light aliases, so `getComputedStyle`
     *     returns the SAME colours in dark mode. The dimming is a `filter: brightness()` on the footer,
     *     which the cascade never folds into a computed colour. Measuring computed colours alone would
     *     report the light-mode ratio for dark mode and never see a dark-mode regression at all.
     *   - the secondary text is `foreground/70`, an alpha. Dropping the alpha measures a colour that is
     *     never painted.
     *
     * So: composite the text's alpha over the opaque colour behind it, then scale both through the
     * footer's own brightness filter, which is linear in sRGB and so applies to each channel.
     */
    const pairs = await f.evaluate((el) => {
      const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const opaqueBehind = (node) => {
        for (let n = node; n; n = n.parentElement) {
          const m = parse(getComputedStyle(n).backgroundColor);
          if (m.length >= 3 && (m.length < 4 || m[3] === 1)) return [m[0], m[1], m[2]];
        }
        return [255, 255, 255];
      };
      const over = (fg, bg) => {
        const a = fg.length > 3 ? fg[3] : 1;
        return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
      };
      const brightness = Number(getComputedStyle(el).filter.match(/brightness\(([\d.]+)\)/)?.[1] ?? 1);
      const dim = (c) => c.map((v) => Math.min(255, v * brightness));
      const sample = (what, node) => {
        const bg = opaqueBehind(node);
        return [what, dim(over(parse(getComputedStyle(node).color), bg)), dim(bg), brightness];
      };
      return [
        sample("column heading", el.querySelector("p.font-semibold")),
        sample("link", el.querySelector("ul a")),
        sample("bottom bar", el.querySelector("p.font-mono")),
      ];
    });
    for (const [what, fg, bg, brightness] of pairs) {
      const ratio = contrast(fg, bg);
      const line = `${theme}: ${what} ${ratio.toFixed(2)}:1 against the paper (sheet at ${brightness})`;
      if (ratio >= CONTRAST_MIN) ok("text", line);
      else bad("text", `${line} (needs ${CONTRAST_MIN})`);
    }
  }

  // dims, does not invert
  if (sample.dark.paper < sample.light.paper) ok("paper", `dark dims the sheet (${sample.dark.paper.toFixed(1)} < ${sample.light.paper.toFixed(1)})`);
  else bad("paper", `dark did not dim the sheet (${sample.dark.paper.toFixed(1)} vs light ${sample.light.paper.toFixed(1)})`);

  if (sample.dark.paper > sample.dark.page) ok("paper", `the dark sheet stays lighter than the page behind it (${sample.dark.paper.toFixed(1)} > ${sample.dark.page.toFixed(1)})`);
  else bad("paper", `the dark sheet inverted — it is no lighter than the page (${sample.dark.paper.toFixed(1)} vs ${sample.dark.page.toFixed(1)})`);

  // grain, against its own negative control
  for (const theme of ["light", "dark"]) {
    const { share, differing, total } = sample[theme].grainPixels;
    const line = `${theme}: removing .kx-paper::before changes ${differing}/${total} pixels of plain paper (${(share * 100).toFixed(1)}%)`;
    if (share > 0.05) ok("grain", line);
    else bad("grain", `${line} — the tile is not painting on this sheet`);
  }
}

/* ── tree ───────────────────────────────────────────────────────────────── */
async function checkTree(page) {
  await page.goto(url("/"), { waitUntil: "networkidle" });
  const f = await footer(page);

  const plate = await f.evaluate((el) => {
    const img = el.querySelector("img");
    if (!img) return null;
    const box = img.closest("[aria-hidden]");
    return { alt: img.getAttribute("alt"), hidden: !!box, focusable: box ? box.querySelectorAll("a,button,input,[tabindex]").length : -1 };
  });
  if (!plate) bad("tree", "no plate image in the footer");
  else {
    if (plate.hidden && plate.alt === "") ok("tree", "the plate is an aria-hidden <img alt=\"\">");
    else bad("tree", `the plate is in the accessibility tree (aria-hidden ${plate.hidden}, alt ${JSON.stringify(plate.alt)})`);
    if (plate.focusable === 0) ok("tree", "nothing focusable inside the decorative box");
    else bad("tree", `${plate.focusable} focusable node(s) inside the decorative box`);
  }

  const grainIsPseudo = await f.evaluate((el) => getComputedStyle(el, "::before").backgroundImage.includes("paper-grain"));
  if (grainIsPseudo) ok("tree", "the grain is a pseudo-element, so it cannot enter the accessibility tree");
  else bad("tree", "the grain is not painted by .kx-paper::before");
}

/* ── layout ─────────────────────────────────────────────────────────────── */
async function checkLayout(browser) {
  for (const width of [320, 390, 768, 1280, 1440]) {
    for (const dir of ["ltr", "rtl"]) {
      for (const textScale of [1, 2]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(url("/"), { waitUntil: "networkidle" });
        await page.evaluate(
          ([d, s]) => {
            document.documentElement.setAttribute("dir", d);
            document.documentElement.style.fontSize = `${16 * s}px`;
          },
          [dir, textScale],
        );
        await page.waitForTimeout(200);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const label = `${width} ${dir} ${textScale * 100}% text`;
        if (over <= 1) ok("layout", `${label}: no sideways scroll`);
        else bad("layout", `${label}: ${over}px of sideways scroll`);
        await ctx.close();
      }
    }
  }
}

/* ── motion ─────────────────────────────────────────────────────────────── */
async function checkMotion(browser) {
  for (const motion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: motion === "reduce" ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await page.goto(url("/"), { waitUntil: "networkidle" });
    const f = await footer(page);
    const moving = await f.evaluate((el) => {
      const names = [];
      for (const n of [el, ...el.querySelectorAll("*")]) {
        const s = getComputedStyle(n);
        const pseudo = getComputedStyle(n, "::before");
        if (s.animationName !== "none") names.push(`${n.tagName.toLowerCase()} ${s.animationName}`);
        if (pseudo.animationName !== "none") names.push(`${n.tagName.toLowerCase()}::before ${pseudo.animationName}`);
      }
      return names;
    });
    if (moving.length === 0) ok("motion", `${motion}: the printed sheet is static`);
    else bad("motion", `${motion}: ${moving.join(", ")}`);
    await ctx.close();
  }
}

/* ── parity ─────────────────────────────────────────────────────────────── */
/*
 * The refactor replaced three inline values and a grain <div> with one class. That is only safe if the
 * rendering is unchanged, so render the footer both ways in the same page and compare the bytes. The
 * grain layer is absolutely positioned in both forms, so nothing about the comparison depends on layout
 * staying put — if it moved, this row would be the thing that said so.
 *
 * The pre-refactor form is rebuilt from inline declarations, not from its old Tailwind class names. Those
 * classes (`bg-accent`, `dark:brightness-[0.85]`, `opacity-[0.22]`, `mix-blend-overlay`) had exactly one
 * call site between them, so Tailwind dropped every one of them from the bundle when this refactor removed
 * it. Reinstating the class strings on a live page reinstates nothing. What this row therefore asserts is
 * the honest form of the claim: `.kx-paper` paints what those literal declarations painted.
 */
async function checkParity(page) {
  for (const theme of ["light", "dark"]) {
    await page.goto(url("/"), { waitUntil: "networkidle" });
    await setTheme(page, theme);
    const f = await footer(page);
    const now = await f.screenshot();

    await f.evaluate(
      (el, [footerStyle, grainStyle]) => {
        el.classList.remove("kx-paper");
        el.setAttribute("style", footerStyle);
        const grain = document.createElement("div");
        grain.setAttribute("aria-hidden", "");
        grain.setAttribute("style", grainStyle);
        el.prepend(grain);
      },
      [LEGACY_FOOTER_STYLE(theme), LEGACY_GRAIN_STYLE],
    );
    await page.waitForTimeout(200);
    const before = await f.screenshot();

    const { share, resized } = differingPixels(now, before);
    if (resized) bad("parity", `${theme}: the footer changed size between the two forms`);
    else if (share < 0.001) ok("parity", `${theme}: .kx-paper paints what the inline declarations painted (${(share * 100).toFixed(3)}% of pixels differ)`);
    else bad("parity", `${theme}: the refactor changed the rendering (${(share * 100).toFixed(2)}% of pixels differ)`);
  }
}

/* ── run ────────────────────────────────────────────────────────────────── */
checkShips();

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await checkSheet(page);
  await checkTree(page);
  await checkParity(page);
  await ctx.close();
  await checkLayout(browser);
  await checkMotion(browser);
} finally {
  await browser.close();
}

if (asJson) {
  console.log(JSON.stringify({ base, report, failures }, null, 2));
} else {
  for (const [row, lines] of Object.entries(report)) {
    console.log(`\n── ${row} ──`);
    for (const line of lines) console.log(`   ${line}`);
  }
  console.log("");
}
if (failures.length) {
  console.error(`engraving-visual: ${failures.length} failure(s)\n${failures.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("engraving-visual: the printed sheet holds its contract.");
