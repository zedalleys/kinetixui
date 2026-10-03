/**
 * a11y-site.mjs — real-browser accessibility + layout pass over the docs SITE's own pages.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3100) &
 *   node scripts/a11y-site.mjs [--base http://127.0.0.1:3100]
 *
 * The Storybook pass (a11y-browser.mjs) covers the components; nothing covered the pages built from them, which is
 * how ~60 contrast / naming / heading findings and two phone-width overflows accumulated. This keeps the site at zero:
 * for every page, in light AND dark, at small-phone / phone / tablet / desktop width, AND at the reader's default
 * text size and twice it, it
 *
 *   - runs axe-core with every rule on (except `region`, which is a page-structure heuristic), and
 *   - fails on horizontal page overflow (`scrollWidth > clientWidth`).
 *
 * THE TEXT-SIZE AXIS, AND WHY IT IS SEPARATE FROM WIDTH. Page zoom shrinks the CSS viewport, so zoom is already
 * covered by the width list — 1280 at 200% zoom *is* a 640px viewport, and 1280 at 400% is the 320px entry, which is
 * what WCAG 1.4.10 means by "320 CSS pixels". Raising the reader's font size is a different thing entirely: the
 * viewport does not change, `rem` grows and `px` does not, so it catches the opposite class of bug — a container
 * sized for text that is now bigger than it. This gate had widths but no text size, and consequently every page on
 * the site overflowed sideways at 200% text while the run stayed green. WCAG 1.4.4 is an AA criterion and it was
 * failing on all 21 pages.
 *
 * There is no baseline: a finding fails the run. To add a page, add it to PAGES and make it clean first.
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3100").replace(/\/$/, "");

/** One representative page per kind of layout, plus the pages with the densest custom UI. */
const PAGES = [
  "/",
  "/components",
  "/create",
  "/blocks",
  "/charts",
  "/themes",
  "/docs/colors",
  "/infographic",
  "/docs",
  "/docs/installation",
  "/docs/foundations",
  "/docs/platforms",
  "/docs/tokens",
  "/docs/accessibility",
  "/docs/cli",
  "/docs/changelog",
  "/docs/angular",
  // The IoT module's page, added with the module. `/docs/angular` is the precedent: a module that ships
  // a docs page brings the page into this sweep, or the page is the one part of the site nothing checks.
  "/docs/iot",
  // /iot is the Connected Space showcase: real IoT components driven by a deterministic simulation, with
  // selects, ranges, switches and a command strip — the densest set of custom controls outside /create, and
  // the only page whose components come from a different package. In the sweep for the same reason /create is.
  "/iot",
  "/docs/components/button",
  "/docs/components/data-grid",
];
const WIDTHS = [
  // 320 is the narrowest width the site claims to support, and it is not a rounding of 375: a fixed-width
  // column that fits at 375 can still push the page wider at 320. /infographic did exactly that — its
  // dependency chart overflowed by 5px at 320 only — and this gate did not see it, because it started at
  // 375. Cheap to check, and the only width where that class of bug shows up.
  ["small-phone", 320, 812],
  ["phone", 375, 812],
  ["tablet", 768, 1024],
  ["desktop", 1280, 900],
];
const SCHEMES = ["light", "dark"];
/**
 * The reader's default text size, as a multiple of the browser's own default.
 *
 * Applied through CDP `Page.setFontSizes`, which is the knob Chrome's "Font size" preference actually turns, rather
 * than an inline `font-size` on `<html>`. The two were compared on this site before choosing: both give a 32px root,
 * a 28px nav label and the same 328px overflow, so the faithful one is used and the equivalence is recorded instead
 * of assumed.
 *
 * 2 rather than 1.5 or 3 because 200% is the figure WCAG 1.4.4 names.
 */
const TEXT_SCALES = [1, 2];

/**
 * Pages that do not yet hold at 200% text, with the reason, as a ratchet.
 *
 * Every other page on the site passes both text sizes at all four widths. `/iot` does not, and the cause
 * is NOT the pattern the rest of this pass fixed — it is not a container refusing to yield.
 * `DeviceSetpointControl` draws a fixed-geometry ring with its readout and its min/max labels absolutely
 * positioned over it, so the text doubles while the ring does not: measured at 320px/200%, the label row
 * inside the ring overhangs by 116px. Making that reflow is a design decision about a published
 * component — does the numeral shrink, does the ring grow, does the presentation change below some size
 * — and not something to settle inside an accessibility sweep.
 *
 * This is a ratchet and not an exemption: the entry is asserted to be NEEDED, so the moment /iot is fixed
 * this run fails and tells you to delete the line. It follows `check-rtl.mjs`, which carries its pending
 * files the same way. 1 of 21 pages, at one of the two text sizes.
 */
const TEXT_SCALE_PENDING = new Map([["/iot", "DeviceSetpointControl's ring has fixed geometry under text that scales — needs a design decision, see PR"]]);

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const pendingSeen = new Set();
let views = 0;

for (const scheme of SCHEMES) {
  for (const [widthName, width, height] of WIDTHS) {
    for (const scale of TEXT_SCALES) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: "reduce" });
      for (const path of PAGES) {
        // A pending page is still SWEPT. Review caught that skipping it before navigation also skipped
        // the root-size assertion, axe and the overflow check at every width and theme, so its known
        // overflow would have masked a new axe violation, or extra overflow at another width. Only the
        // overflow finding itself is excused below, and only on a page named in the ratchet.
        const overflowPending = scale !== 1 && TEXT_SCALE_PENDING.has(path);
        const page = await context.newPage();
        const tag = `${scheme}/${widthName}/text${scale * 100}% ${path}`;
        try {
          if (scale !== 1) {
            // Per page, and before navigating: the setting belongs to the renderer, and a page that has already
            // laid out at the default size would have to be reloaded for it to take effect.
            const cdp = await context.newCDPSession(page);
            await cdp.send("Page.enable");
            await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * scale, fixed: 13 * scale } });
          }
          const response = await page.goto(base + path, { waitUntil: "load" });
          if (!response || !response.ok()) {
            failures.push(`${tag}: HTTP ${response ? response.status() : "no response"}`);
            continue;
          }
          await page.waitForTimeout(600); // hydration + reveal animations settle
          // The root size is asserted rather than trusted: if `setFontSizes` ever stopped taking effect, every
          // text200% view would quietly pass by measuring the default size again, which is the exact shape of
          // false green this axis exists to remove.
          const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
          if (Math.abs(rootPx - 16 * scale) > 0.5) {
            failures.push(`${tag}: root font-size is ${rootPx}px, expected ${16 * scale}px — the text-size axis is not being applied`);
            continue;
          }
          await page.addScriptTag({ content: axeSource });
          const result = await page.evaluate(async () => {
            const r = await window.axe.run(document, { rules: { region: { enabled: false } } });
            return {
              violations: r.violations.map((v) => ({
                id: v.id,
                help: v.help,
                nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
                count: v.nodes.length,
              })),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          views++;
          for (const v of result.violations) {
            failures.push(`${tag}: ${v.id} ×${v.count} — ${v.help} (${v.nodes.join(" | ")})`);
          }
          if (result.overflow > 0) {
            if (overflowPending) pendingSeen.add(path);
            else failures.push(`${tag}: page scrolls sideways by ${result.overflow}px`);
          }
        } catch (err) {
          failures.push(`${tag}: ${String(err.message).split("\n")[0]}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  }
}
// Every pending entry must still be earned. A page fixed and left on the list would otherwise keep its
// exemption for ever, which is how a ratchet quietly becomes an exemption.
//
// `pendingSeen` is now populated by the sweep itself — the page is visited at every width and theme like
// any other, and the entry is marked only when real overflow was actually observed. That is strictly
// stronger than the earlier separate re-check at one width in one theme, and it means a pending page's
// axe results and its other widths are no longer skipped.
for (const [path, why] of TEXT_SCALE_PENDING) {
  if (!PAGES.includes(path)) {
    failures.push(`${path}: listed in TEXT_SCALE_PENDING but not in PAGES — remove the entry or the page`);
  } else if (!pendingSeen.has(path)) {
    failures.push(`${path}: no longer overflows at 200% text in any swept view — delete it from TEXT_SCALE_PENDING (was: ${why})`);
  }
}

await browser.close();

if (failures.length) {
  console.error(`✗ ${failures.length} finding(s) across ${views} page views:\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `a11y-site ok — ${PAGES.length} pages × ${SCHEMES.length} themes × ${WIDTHS.length} widths × ${TEXT_SCALES.length} text sizes ` +
    `(${views} views): no axe findings, no horizontal overflow.` +
    (TEXT_SCALE_PENDING.size
      ? `\n  ${TEXT_SCALE_PENDING.size} page(s) pending at 200% text, each verified to still need it: ` +
        [...TEXT_SCALE_PENDING.keys()].join(", ")
      : ""),
);
