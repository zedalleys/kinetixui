/**
 * Signature footer — real-browser gate.
 *
 * What this exists for. The footer renders on every one of the site's routes, so a layout failure in it is a
 * layout failure everywhere at once, and the one this gate was written for is invisible to every jsdom test in
 * the repo: at 320px with the reader's text at 200%, a two-column register gave each column 144px, and
 * "Changelog" set at a 32px root is exactly 144px of unbreakable word, so the column — and the document —
 * ran 8px past the viewport. `scripts/large-text.mjs` is the 200%-text gate but it drives Storybook, which
 * has no site footer in it; `scripts/a11y-site.mjs` sweeps the site but at the default text size. Nothing
 * covered the intersection. This does.
 *
 * It asserts measured values, not the presence of a mechanism: an `overflow` of 0 rather than "a `minmax`
 * exists", `display: none` rather than "a forced-colors block exists", a `scaleX` that actually changed
 * rather than "a transition is declared".
 *
 * The text scale is applied as an inline root font size, the same technique `scripts/large-text.mjs` uses.
 * That scales every `rem` length in the document but NOT `rem` in a media query, whose unit stays the
 * initial font size. A reader who raises the browser's default size scales both, which moves the register
 * into its stacked form earlier. So the wide cases here are measured under the stricter of the two models,
 * and the narrow cases under the same one.
 *
 *   node scripts/footer-browser.mjs [--base http://127.0.0.1:3000] [--out <dir>]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", process.env.FOOTER_BASE ?? "http://127.0.0.1:3000");
const OUT = arg("out", null);

/** The widths the brief names, plus 1920 for ultrawide. Every one is a real viewport, not a media query guess. */
const WIDTHS = [320, 375, 390, 768, 1024, 1440, 1920];
/** 200% is the resize target WCAG 1.4.4 names, and the size at which an unbreakable word is unmistakably wrong. */
const SCALES = [1, 2];
const DIRECTIONS = ["ltr", "rtl"];
/**
 * The footer is on every route, so one route cannot clear it: a page with its own wide content can mask or
 * invent overflow. `/` carries the platform marquee, which is itself wider than a 320px viewport inside a
 * clipping parent, so a route without it is the control for attributing overflow to the footer at all.
 */
const ROUTES = ["/", "/blocks", "/docs/rtl"];
/** WCAG 2.5.8 target size (minimum). Inline links in a text block are exempt; a standalone control is not. */
const MIN_TARGET = 24;

const problems = [];
const rows = [];
const cases = [];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});

/** Open a route in a context, set the direction and the root size, and scroll the footer into view. */
async function openFooter({ width, theme = "light", dir = "ltr", scale = 1, forced = false, reduce = false, route = "/" }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: reduce ? "reduce" : "no-preference",
    forcedColors: forced ? "active" : "none",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(
    ([d, t, s]) => {
      document.documentElement.setAttribute("dir", d);
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.classList.toggle("light", t !== "dark");
      if (s !== 1) document.documentElement.style.fontSize = `${16 * s}px`;
    },
    [dir, theme, scale],
  );
  await page.locator("footer.kx-footer").scrollIntoViewIfNeeded();
  // Let layout settle before reading geometry back.
  await page.waitForTimeout(250);
  return { ctx, page };
}

/* ---------------------------------------------------------------------------------------------------
   1. Geometry: nothing in the footer leaves the viewport, at any width, direction or text size.
--------------------------------------------------------------------------------------------------- */
for (const route of ROUTES) {
  for (const width of WIDTHS) {
    for (const dir of DIRECTIONS) {
      for (const scale of SCALES) {
        const { ctx, page } = await openFooter({ width, dir, scale, route });
        const m = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const f = document.querySelector("footer.kx-footer");
          if (!f) return { missing: true };
          const escaping = [...f.querySelectorAll("*")]
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5))
            .map(({ el, r }) => `${el.tagName.toLowerCase()}"${(el.textContent || "").trim().slice(0, 24)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
          return {
            viewport: vw,
            footerOverflowPx: f.scrollWidth - f.clientWidth,
            escaping,
            height: Math.round(f.getBoundingClientRect().height),
          };
        });
        await ctx.close();
        const where = `${route} ${width}px ${dir} ${scale}x`;
        if (m.missing) {
          problems.push(`${where}: no footer.kx-footer on the page at all.`);
          continue;
        }
        if (m.footerOverflowPx > 0) problems.push(`${where}: the footer is ${m.footerOverflowPx}px wider than its own box.`);
        if (m.escaping.length) problems.push(`${where}: ${m.escaping.length} element(s) outside the viewport — ${m.escaping.slice(0, 3).join("; ")}`);
        cases.push({ route, width, dir, scale, ...m });
        rows.push(`  ${where.padEnd(28)} h=${m.height} overflow=${m.footerOverflowPx}`);
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------------------
   2. Decoration: drawn, not downloaded, out of the accessibility tree, and gone under forced colours.
--------------------------------------------------------------------------------------------------- */
{
  const { ctx, page } = await openFooter({ width: 1440 });
  const d = await page.evaluate(() => {
    const f = document.querySelector("footer.kx-footer");
    const layer = (c) => {
      const el = f.querySelector(`.${c}`);
      return el ? { present: true, ariaHidden: el.getAttribute("aria-hidden") !== null, display: getComputedStyle(el).display } : { present: false };
    };
    return {
      imgs: f.querySelectorAll("img").length,
      backgroundImages: [...f.querySelectorAll("*")].filter((el) => /url\(/.test(getComputedStyle(el).backgroundImage)).length,
      seam: layer("kx-footer-seam"),
      weave: layer("kx-footer-weave"),
    };
  });
  await ctx.close();
  if (d.imgs !== 0) problems.push(`decoration: the footer requests ${d.imgs} image(s); the Kinetic Weave footer draws its decoration in CSS.`);
  if (d.backgroundImages !== 0) problems.push(`decoration: ${d.backgroundImages} element(s) carry a url() background; the retired engraving plates and paper grain are exactly that shape.`);
  for (const [name, layer] of [["seam", d.seam], ["weave", d.weave]]) {
    if (!layer.present) problems.push(`decoration: .kx-footer-${name} is missing.`);
    else if (!layer.ariaHidden) problems.push(`decoration: .kx-footer-${name} is in the accessibility tree; a decorative layer must not be.`);
  }
  rows.push(`  decoration                   imgs=${d.imgs} url-backgrounds=${d.backgroundImages}`);

  const forced = await openFooter({ width: 1440, forced: true });
  const fc = await forced.page.evaluate(() => {
    const f = document.querySelector("footer.kx-footer");
    return {
      weaveDisplay: getComputedStyle(f.querySelector(".kx-footer-weave")).display,
      seamBackground: getComputedStyle(f.querySelector(".kx-footer-seam")).backgroundColor,
    };
  });
  await forced.ctx.close();
  // Forced colours hands the reader a palette they chose. Hairline texture is noise in it, and a `background`
  // in a token colour would not survive anyway, so the weave has to be gone rather than invisible.
  if (fc.weaveDisplay !== "none") problems.push(`forced colours: the weave is '${fc.weaveDisplay}', expected 'none'.`);
  rows.push(`  forced-colors                weave=${fc.weaveDisplay} seam=${fc.seamBackground}`);
}

/* ---------------------------------------------------------------------------------------------------
   3. Interaction: the underline is the state, and it survives having no pointer and no motion.
--------------------------------------------------------------------------------------------------- */
async function underline({ reduce }) {
  const { ctx, page } = await openFooter({ width: 1440, reduce });
  const link = page.locator("footer.kx-footer a.kx-footer-link").first();
  const read = () =>
    page.evaluate(() => {
      const a = document.querySelector("footer.kx-footer a.kx-footer-link");
      const cs = getComputedStyle(a, "::after");
      return { transform: cs.transform, transition: cs.transitionDuration, display: cs.display };
    });
  const rest = await read();
  await link.focus();
  await page.waitForTimeout(300);
  const focused = await read();
  await ctx.close();
  return { rest, focused };
}
{
  const motion = await underline({ reduce: false });
  const reduced = await underline({ reduce: true });
  // scaleX(0) serialises as a matrix with a zero x-scale; scaleX(1) as `none` or an identity matrix.
  const collapsed = (t) => t === "matrix(0, 0, 0, 1, 0, 0)";
  if (!collapsed(motion.rest.transform)) problems.push(`underline: at rest the line is already drawn (${motion.rest.transform}); it is meant to grow from the reading start.`);
  if (collapsed(motion.focused.transform)) problems.push("underline: focus-visible did not draw the line — the footer has to work without a pointer.");
  if (collapsed(reduced.focused.transform)) problems.push("underline: under reduced motion focus-visible left no line. The underline is the state, not the animation.");
  // The repo's reduced-motion contract is `transition-duration: 0.01ms !important` from the @kinetixui/ui
  // preset's base layer, not `0s`, so the assertion is "instant", measured, rather than an exact string.
  // 0.01ms serialises as 1e-05s; anything a reader could perceive as travel is far above this.
  const INSTANT_S = 0.001;
  const reducedSeconds = Number.parseFloat(reduced.focused.transition);
  if (!(reducedSeconds <= INSTANT_S)) {
    problems.push(`underline: under reduced motion the line still travels — transition-duration ${reduced.focused.transition}, expected at most ${INSTANT_S}s.`);
  }
  rows.push(`  underline                    rest=${motion.rest.transform} focus=${motion.focused.transform} reduced-transition=${reduced.focused.transition}`);
}

/* ---------------------------------------------------------------------------------------------------
   4. Back to top: an ordinary anchor at a target that exists, and a real control-sized target.
--------------------------------------------------------------------------------------------------- */
{
  const { ctx, page } = await openFooter({ width: 390 });
  const t = await page.evaluate(() => {
    const a = [...document.querySelectorAll("footer.kx-footer a")].find((x) => (x.textContent || "").trim() === "Back to top");
    if (!a) return { missing: true };
    const r = a.getBoundingClientRect();
    const id = (a.getAttribute("href") || "").replace(/^#/, "");
    return { href: a.getAttribute("href"), targetExists: !!document.getElementById(id), w: Math.round(r.width), h: Math.round(r.height), scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior };
  });
  await ctx.close();
  if (t.missing) problems.push("back to top: no link named 'Back to top'.");
  else {
    if (!t.targetExists) problems.push(`back to top: ${t.href} names no element on the page.`);
    if (t.h < MIN_TARGET) problems.push(`back to top: ${t.w}x${t.h} is under the ${MIN_TARGET}px minimum target size.`);
    rows.push(`  back-to-top                  ${t.href} target=${t.targetExists} ${t.w}x${t.h} scroll=${t.scrollBehavior}`);
  }

  const reduced = await openFooter({ width: 390, reduce: true });
  const sb = await reduced.page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  await reduced.ctx.close();
  // An in-page jump for a reader who asked for less motion must be instant, which is `globals.css`'s rule,
  // not this footer's — but the footer is what relies on it, so this is where it gets asserted.
  if (sb !== "auto") problems.push(`back to top: under reduced motion html scroll-behavior is '${sb}', expected 'auto' (an instant jump).`);
  rows.push(`  back-to-top reduced motion   scroll-behavior=${sb}`);
}

/* ---------------------------------------------------------------------------------------------------
   5. Naming: the landmark and every group list carry a name a screen reader can read out.
--------------------------------------------------------------------------------------------------- */
{
  const { ctx, page } = await openFooter({ width: 1440 });
  const n = await page.evaluate(() => {
    const f = document.querySelector("footer.kx-footer");
    const navs = [...f.querySelectorAll("nav")].map((x) => x.getAttribute("aria-label"));
    const lists = [...f.querySelectorAll("ul")].map((u) => {
      const id = u.getAttribute("aria-labelledby");
      return { id, name: id ? document.getElementById(id)?.textContent?.trim() ?? null : null };
    });
    const unnamed = [...f.querySelectorAll("a")].filter((a) => !(a.textContent || "").trim() && !a.getAttribute("aria-label"));
    return { navs, lists, unnamedLinks: unnamed.length, headings: [...f.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.tagName) };
  });
  await ctx.close();
  if (!n.navs.length || n.navs.some((l) => !l)) problems.push(`naming: a footer nav has no aria-label (${JSON.stringify(n.navs)}).`);
  const unnamedLists = n.lists.filter((l) => !l.name);
  if (unnamedLists.length) problems.push(`naming: ${unnamedLists.length} group list(s) have no accessible name.`);
  if (n.unnamedLinks) problems.push(`naming: ${n.unnamedLinks} link(s) in the footer have no accessible name.`);
  // Deliberate: the register's group titles are named paragraphs, not headings. A heading would either put
  // four sections into the outline of all 740 views (`h2`) or skip a level on any page whose deepest heading
  // is `h1` (`h3`), which is an axe `heading-order` violation. The absence is the contract, so it is asserted.
  if (n.headings.length) problems.push(`naming: the footer contributes ${n.headings.join(", ")} to every page's outline; its group titles are named lists on purpose.`);
  rows.push(`  naming                       navs=${JSON.stringify(n.navs)} named-lists=${n.lists.length - unnamedLists.length}/${n.lists.length} headings=${n.headings.length}`);
}

await browser.close();

const result = { base: BASE, checkedAt: new Date().toISOString(), engine: "chromium", widths: WIDTHS, scales: SCALES, routes: ROUTES, cases, problems };
if (OUT) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "footer-gate-results.json"), `${JSON.stringify(result, null, 2)}\n`);
}

console.log(rows.join("\n"));
if (problems.length) {
  console.error(`\nFooter gate: ${problems.length} problem(s).`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `\nFooter gate ok — ${cases.length} geometry cases (${WIDTHS.length} widths x ${DIRECTIONS.length} directions x ${SCALES.length} text scales x ${ROUTES.length} routes), no overflow; decoration drawn not downloaded; underline, back-to-top and naming measured.`,
);
