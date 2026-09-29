/**
 * Rasterise the generated SVGs, and capture the homepage screenshot the README uses.
 *
 *   node scripts/render-marketing-visuals.mjs                 # SVG -> PNG
 *   node scripts/render-marketing-visuals.mjs --home <url>    # also capture .github/assets/home.png
 *
 * Social feeds want raster, so PNG is produced from the same SVG rather than drawn twice. The homepage
 * screenshot is taken from a real running build — never composed — because a fabricated screenshot of your
 * own product is the one marketing lie that is trivially checkable.
 *
 * Uses the browser already present in the environment via PLAYWRIGHT_CHROMIUM_PATH. It does not install one.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = `${ROOT}/marketing/content/visuals`;
const homeUrl = process.argv.includes("--home") ? process.argv[process.argv.indexOf("--home") + 1] : null;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const report = [];

/* ---- SVG -> PNG, plus a legibility read at phone width ---- */
{
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort()) {
    const svg = readFileSync(`${DIR}/${file}`, "utf8");
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg) ?? [];
    await page.setViewportSize({ width: Number(w), height: Number(h) });
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const png = file.replace(/\.svg$/, ".png");
    await page.locator("svg").screenshot({ path: `${DIR}/${png}` });

    /*
     * The failure this catches: an asset that is fine at 1200px and unreadable in a feed. Social clients
     * scale a 1200px card to roughly 390–500px, so every text size is divided by ~3. Anything whose
     * effective size lands under ~6px is not small — it is absent, and the asset is a decoration.
     */
    const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
    const min = Math.min(...sizes);
    const effective = +(min * (390 / Number(w))).toFixed(1);

    /*
     * Measure the rendered text, not the markup.
     *
     * The first version of this check only compared font sizes and passed an asset whose title ran off the
     * right edge, whose coverage number was touching the word beside it, and whose last column was cut in
     * half by the canvas. A number can be big and still be absent. So every <text> is measured in the
     * browser that just drew it, and asserted to sit inside the canvas with a margin — and no two text runs
     * on the same baseline may overlap.
     */
    const layout = await page.evaluate(() => {
      const SAFE = 24;
      const svgEl = document.querySelector("svg");
      const width = svgEl.viewBox.baseVal.width;
      const nodes = [...svgEl.querySelectorAll("text")].map((t) => {
        const b = t.getBBox();
        return { text: t.textContent.slice(0, 40), x: b.x, y: Math.round(b.y), right: b.x + b.width };
      });
      const overflow = nodes.filter((n) => n.right > width - SAFE || n.x < SAFE / 2);
      const collisions = [];
      const byLine = new Map();
      for (const n of nodes) {
        const line = byLine.get(n.y) ?? [];
        line.push(n);
        byLine.set(n.y, line);
      }
      for (const line of byLine.values()) {
        line.sort((a, b) => a.x - b.x);
        for (let i = 1; i < line.length; i += 1) {
          if (line[i].x < line[i - 1].right + 6) collisions.push(`"${line[i - 1].text}" / "${line[i].text}"`);
        }
      }
      return { overflow: overflow.map((n) => n.text), collisions };
    });

    const ok = effective >= 6 && layout.overflow.length === 0 && layout.collisions.length === 0;
    report.push({
      file: png, w: Number(w), h: Number(h), minFont: min, atPhone: effective, ok,
      overflow: layout.overflow, collisions: layout.collisions,
    });
  }
  await page.close();
}

/* ---- homepage screenshot ---- */
if (homeUrl) {
  const VIEWPORT = { width: 1440, height: 900 };
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  await page.goto(homeUrl, { waitUntil: "networkidle" });
  // The hero animates in; settle before capturing so the shot is not mid-transition.
  await page.waitForTimeout(1200);
  mkdirSync(`${ROOT}/.github/assets`, { recursive: true });
  await page.screenshot({ path: `${ROOT}/.github/assets/home.png` });
  await page.close();
  report.push({ file: ".github/assets/home.png", w: VIEWPORT.width, h: VIEWPORT.height, minFont: "—", atPhone: "—", ok: true });
}

await browser.close();

let bad = 0;
console.log("render — file, size, smallest font, effective size in a 390px feed");
for (const r of report) {
  if (!r.ok) bad += 1;
  console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.file.padEnd(24)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(5)} ${String(r.minFont).padStart(3)}px -> ${r.atPhone}px`);
  for (const o of r.overflow ?? []) console.log(`         overflows: "${o}"`);
  for (const col of r.collisions ?? []) console.log(`         collides:  ${col}`);
}
writeFileSync(`${DIR}/render-report.json`, JSON.stringify(report, null, 2) + "\n");
if (bad > 0) { console.error(`\n${bad} asset(s) unreadable at feed size`); process.exit(1); }
