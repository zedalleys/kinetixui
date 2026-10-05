/**
 * icon-direction.mjs — which way React's component-owned directional icons point, read from rendered pixels.
 *
 *   pnpm build-storybook && node scripts/icon-direction.mjs
 *
 * The icon contract (/docs/icons, docs/audits/ICON-ARCHITECTURE-AUDIT.md) sorts every component-owned icon
 * into one of two direction rules:
 *
 *   mirrors      the icon points along the reading direction — Back, Previous / Next, a breadcrumb separator,
 *                a collapsed disclosure — so in a right-to-left region it must point the other way
 *   fixed        the icon means the same thing in both directions — an expanded disclosure points down, an
 *                accordion chevron points down — so it must NOT turn around
 *
 * The unit test (packages/ui/src/components-icons.test.tsx) proves the class is there; jsdom does no layout,
 * so it cannot prove the glyph turns. This opens each story in Chromium twice — once as authored, once with
 * `dir="rtl"` on the story's own root, never on <html> — and reads which way each icon's ink points.
 *
 * Direction is scoped: the RTL pass sets `dir` on `#storybook-root`, then checks that <html> was left alone,
 * so a pass here also shows the icons follow the nearest direction boundary rather than the document's.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { contrast, framer, serveStatic } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(staticDir)) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(1);
}

const DPR = 4;

/**
 * Each case: a story, a locator for one icon in it, and what it must point at. `along` is a reading-direction
 * term ("inline start" / "inline end"), so the expected screen direction flips with `dir`; `fixed` is a screen
 * direction that must hold in both.
 */
const CASES = [
  { component: "NavigationBar", story: "navigation-navigationbar--default", icon: (p) => p.getByRole("button", { name: "Back" }).locator("svg"), along: "inline start", label: "Back" },
  { component: "Pagination", story: "controls-actions-pagination--default", icon: (p) => p.getByRole("link", { name: "Go to previous page" }).locator("svg"), along: "inline start", label: "Previous" },
  { component: "Pagination", story: "controls-actions-pagination--default", icon: (p) => p.getByRole("link", { name: "Go to next page" }).locator("svg"), along: "inline end", label: "Next" },
  { component: "Breadcrumb", story: "navigation-breadcrumb--default", icon: (p) => p.locator('li[role="presentation"] svg.lucide-chevron-right').first(), along: "inline end", label: "separator" },
  { component: "JsonViewer", story: "data-display-jsonviewer--default", icon: (p) => p.locator('[role="treeitem"][aria-expanded="false"] > div > button svg.lucide-chevron-right').first(), along: "inline end", label: "collapsed disclosure" },
  { component: "JsonViewer", story: "data-display-jsonviewer--default", icon: (p) => p.getByRole("button", { name: "Collapse" }).nth(1).locator("svg"), fixed: "down", label: "expanded disclosure",
    // A nested node, opened here: the root's chevron sits under the copy button in RTL (a layout finding
    // recorded in the audit, not an icon-direction one), so its ink is not the chevron's alone.
    prepare: (p) => p.getByRole("button", { name: "Expand" }).first().click() },
  { component: "TreeView", story: "navigation-treeview--default", icon: (p) => p.locator('[role="treeitem"][aria-expanded="true"] svg.lucide-chevron-right').first(), fixed: "down", label: "expanded disclosure" },
  { component: "Accordion", story: "data-display-accordion--default", icon: (p) => p.locator("button[aria-expanded] svg.lucide-chevron-down").first(), fixed: "down", label: "chevron (not directional)" },
];

/**
 * Which way an icon's ink points. A chevron's tip is the part of its ink furthest along the axis it points
 * on, measured in its middle band; its arms trail behind at the edges of that band. The axis with the larger
 * tip-to-arm offset is the one it points along. Returns "left" | "right" | "up" | "down" | "unreadable".
 */
async function inkPoints(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) return "unreadable";
  const r = { x: box.x, y: box.y, left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: box.width, height: box.height };
  const frame = await framer({ dpr: DPR, pad: 2 })(page, r);
  const bg = frame.at(r.left - 1, r.top - 1);
  const px = [];
  for (let y = r.top; y <= r.bottom; y += 1 / DPR) for (let x = r.left; x <= r.right; x += 1 / DPR) px.push([x, y, contrast(frame.at(x, y), bg)]);
  const peak = Math.max(...px.map((p) => p[2]));
  if (peak < 1.3) return "unreadable";
  const ink = px.filter((p) => p[2] > 1 + (peak - 1) * 0.4);
  if (ink.length < 6) return "unreadable";
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  /** offset of the middle band's centroid from the end bands' centroid, along `a`, banding on `b` */
  const skew = (a, b) => {
    const lo = Math.min(...ink.map((p) => p[b]));
    const hi = Math.max(...ink.map((p) => p[b]));
    const third = (hi - lo) / 3;
    const band = (b0, b1) => ink.filter((p) => p[b] >= b0 && p[b] <= b1).map((p) => p[a]);
    const middle = band(lo + third, hi - third);
    const ends = [...band(lo, lo + third), ...band(hi - third, hi)];
    return middle.length && ends.length ? mean(middle) - mean(ends) : 0;
  };
  const horizontal = skew(0, 1) / r.width;
  const vertical = skew(1, 0) / r.height;
  if (Math.abs(horizontal) < 0.04 && Math.abs(vertical) < 0.04) return "unreadable";
  if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "right" : "left";
  return vertical > 0 ? "down" : "up";
}

const expected = (c, dir) => {
  if (c.fixed) return c.fixed;
  const towardEnd = c.along === "inline end";
  return towardEnd === (dir === "ltr") ? "right" : "left";
};

const { base, close } = await serveStatic(staticDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
let failures = 0;
let checks = 0;

for (const dir of ["ltr", "rtl"]) {
  for (const c of CASES) {
    const page = await browser.newPage({ deviceScaleFactor: DPR, viewport: { width: 900, height: 700 } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${base}/iframe.html?id=${c.story}&viewMode=story`, { waitUntil: "load" });
    await page.locator("#storybook-root > *").first().waitFor();
    if (dir === "rtl") {
      await page.evaluate(() => document.getElementById("storybook-root").setAttribute("dir", "rtl"));
      const htmlDir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
      checks += 1;
      if (htmlDir === "rtl") {
        failures += 1;
        console.log(`  ** FAIL ** ${c.component} — the preview's direction reached <html>`);
      }
    }
    if (c.prepare) await c.prepare(page);
    await page.waitForTimeout(150);
    const seen = await inkPoints(page, c.icon(page));
    const want = expected(c, dir);
    checks += 1;
    const ok = seen === want;
    if (!ok) failures += 1;
    console.log(`  ${ok ? "ok  " : "** FAIL **"} ${dir}  ${c.component.padEnd(14)} ${c.label.padEnd(26)} points ${seen}${ok ? "" : `, expected ${want}`}`);
    await page.close();
  }
}

await browser.close();
close();
console.log(`\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — ${checks} icon-direction checks across LTR and a scoped RTL preview.`);
process.exit(failures === 0 ? 0 : 1);
