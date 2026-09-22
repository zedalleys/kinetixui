/**
 * a11y-site.mjs — real-browser accessibility + layout pass over the docs SITE's own pages.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3100) &
 *   node scripts/a11y-site.mjs [--base http://127.0.0.1:3100]
 *
 * The Storybook pass (a11y-browser.mjs) covers the components; nothing covered the pages built from them, which is
 * how ~60 contrast / naming / heading findings and two phone-width overflows accumulated. This keeps the site at zero:
 * for every page, in light AND dark, at phone / tablet / desktop width, it
 *
 *   - runs axe-core with every rule on (except `region`, which is a page-structure heuristic), and
 *   - fails on horizontal page overflow (`scrollWidth > clientWidth`).
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
  "/colors",
  "/blocks",
  "/charts",
  "/themes",
  "/theme-builder",
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
  "/docs/components/button",
  "/docs/components/data-grid",
];
const WIDTHS = [
  ["phone", 375, 812],
  ["tablet", 768, 1024],
  ["desktop", 1280, 900],
];
const SCHEMES = ["light", "dark"];

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
let views = 0;

for (const scheme of SCHEMES) {
  for (const [widthName, width, height] of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: "reduce" });
    for (const path of PAGES) {
      const page = await context.newPage();
      const tag = `${scheme}/${widthName} ${path}`;
      try {
        const response = await page.goto(base + path, { waitUntil: "load" });
        if (!response || !response.ok()) {
          failures.push(`${tag}: HTTP ${response ? response.status() : "no response"}`);
          continue;
        }
        await page.waitForTimeout(600); // hydration + reveal animations settle
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate(async () => {
          const r = await window.axe.run(document, { rules: { region: { enabled: false } } });
          return {
            violations: r.violations.map((v) => ({ id: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")), count: v.nodes.length })),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        views++;
        for (const v of result.violations) failures.push(`${tag}: ${v.id} ×${v.count} — ${v.help} (${v.nodes.join(" | ")})`);
        if (result.overflow > 0) failures.push(`${tag}: page scrolls sideways by ${result.overflow}px`);
      } catch (err) {
        failures.push(`${tag}: ${String(err.message).split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
}
await browser.close();

if (failures.length) {
  console.error(`✗ ${failures.length} finding(s) across ${views} page views:\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`a11y-site ok — ${PAGES.length} pages × ${SCHEMES.length} themes × ${WIDTHS.length} widths (${views} views): no axe findings, no horizontal overflow.`);
