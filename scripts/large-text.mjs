/**
 * large-text.mjs — the selection controls still work when the reader's text is twice the size.
 *
 *   node scripts/large-text.mjs        (needs apps/docs/storybook-static)
 *
 * ── Why this is a browser script and not a unit test ────────────────────────
 *
 * `largeText` was 0 for every React component in verification.json, and it is the one evidence kind that
 * cannot be earned in jsdom: jsdom has no layout, so a test there can assert that a class says `rem` but
 * never that the control actually grew. A claim of "works at 200% text" backed by a string comparison is
 * the kind of evidence this repository exists not to produce.
 *
 * So this measures. Each subject is rendered in Chromium at the default root size and again with the root
 * font size doubled — which is what a reader does when they raise their browser's default font size, and
 * what distinguishes a control sized in `rem` from one sized in `px`.
 *
 * ── The failure it was written for ──────────────────────────────────────────
 *
 * Checkbox and RadioGroupItem were `size-[18px]`. At a 200% default font size their labels doubled and the
 * boxes did not:
 *
 *     checkbox     18x18 -> 18x18   ratio 1.00
 *     radio        18x18 -> 18x18   ratio 1.00
 *     switch       48x24 -> 96x48   ratio 2.00
 *
 * The control halved in size relative to its own text, and its touch target went with it. Switch, Toggle
 * and ToggleGroup were already rem-based and scaled correctly, which is what made the other two visible as
 * defects rather than as a house style.
 *
 * ── What it claims ─────────────────────────────────────────────────────────
 *
 * Subjects are the selection-control family, named beside `SUBJECTS` below — a marked passage runs from
 * its marker to the end of the file, so the names that decide the claim have to live after it, not here.
 * The claim and the measurement are therefore two lists that could drift apart, and
 * `assertClaimMatchesSubjects()` reads this file back and fails if they ever do.
 *
 * kx-verify: largeText
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");

if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(1);
}

/**
 * The selection-control family: <Checkbox>, <RadioGroup>, <Switch>, <Toggle> and <ToggleGroup>.
 *
 * `gen-verification.mjs` reads those names out of this passage to decide what the `largeText` claim covers.
 * Each subject below names the story to render and the element carrying the control's own box — the thing
 * whose size is the hit target, not the label beside it.
 */
const SUBJECTS = [
  { component: "Checkbox", story: "form-inputs-checkbox--default", control: "[role=checkbox]" },
  { component: "RadioGroup", story: "form-inputs-radiogroup--default", control: "[role=radio]" },
  { component: "Switch", story: "form-inputs-switch--default", control: "[role=switch]" },
  { component: "Toggle", story: "controls-actions-toggle--default", control: "button[data-state]" },
  { component: "ToggleGroup", story: "controls-actions-togglegroup--default", control: "button[data-state]" },
];

/** 200% is the resize target WCAG 1.4.4 names, and the size at which a px control is unmistakably wrong. */
const SCALE = 2;
/** Allow for sub-pixel rounding and borders; a control that scales lands far above this, a px one at 1.00. */
const MIN_RATIO = 1.8;
/** WCAG 2.5.8 target size (minimum). A control that stops meeting it when text grows has regressed. */
const MIN_TARGET = 24;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(staticDir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

/**
 * The verification claim is derived from prose; the measurements are derived from `SUBJECTS`. Nothing
 * otherwise keeps the two in step, and a claim that outruns its measurement is the exact failure this
 * whole evidence model exists to prevent — so it is checked rather than trusted.
 */
function assertClaimMatchesSubjects() {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  // The same region gen-verification.mjs reads: a passage runs from its marker to the end of the file.
  const passage = self.slice(self.indexOf("kx-verify: largeText"));
  const named = new Set([...passage.matchAll(/<([A-Z][A-Za-z0-9]*)>/g)].map((m) => m[1]));
  const measured = new Set(SUBJECTS.map((s) => s.component));
  const missing = [...measured].filter((c) => !named.has(c));
  const extra = [...named].filter((c) => !measured.has(c));
  if (missing.length || extra.length) {
    console.error(
      "large-text: the verification claim and the measured subjects disagree.\n" +
        (missing.length ? `  measured but not claimed: ${missing.join(", ")}\n` : "") +
        (extra.length ? `  claimed but not measured: ${extra.join(", ")}\n` : ""),
    );
    process.exit(1);
  }
}
assertClaimMatchesSubjects();

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const problems = [];
const rows = [];

for (const subject of SUBJECTS) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto(`${base}/iframe.html?id=${subject.story}&viewMode=story`, { waitUntil: "networkidle" });
  await page.waitForSelector(subject.control, { timeout: 15_000 });

  const measure = () =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      return {
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        // Horizontal scrolling caused by a control growing is its own failure, separate from the size.
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Clipped content: an ancestor that cannot grow crops the control rather than resizing with it.
        clipped: (() => {
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.overflow !== "visible" && n.scrollHeight > n.clientHeight + 1) return true;
          }
          return false;
        })(),
      };
    }, subject.control);

  const before = await measure();
  await page.evaluate((s) => {
    document.documentElement.style.fontSize = `${16 * s}px`;
  }, SCALE);
  // Let layout settle before reading geometry back.
  await page.waitForTimeout(200);
  const after = await measure();
  await page.close();

  const ratio = before.h > 0 ? after.h / before.h : 0;
  const where = `${subject.component} (${subject.story})`;
  if (ratio < MIN_RATIO) {
    problems.push(`${where}: control did not grow with the text — ${before.w}x${before.h} -> ${after.w}x${after.h} (ratio ${ratio.toFixed(2)}, expected >= ${MIN_RATIO}). A px size does this; use rem.`);
  }
  if (after.overflowX !== 0) problems.push(`${where}: ${after.overflowX}px of horizontal overflow at ${SCALE}x text.`);
  if (after.clipped) problems.push(`${where}: an ancestor clips the control at ${SCALE}x text.`);
  if (Math.min(after.w, after.h) < MIN_TARGET) {
    problems.push(`${where}: target shrank below ${MIN_TARGET}px at ${SCALE}x text (${after.w}x${after.h}).`);
  }
  rows.push(`  ${subject.component.padEnd(12)} ${before.w}x${before.h} -> ${after.w}x${after.h}  ratio ${ratio.toFixed(2)}`);
}

await browser.close();
server.close();

console.log(`large-text — ${SUBJECTS.length} selection controls at ${SCALE}x the default font size:`);
for (const r of rows) console.log(r);

if (problems.length) {
  console.error(`\nlarge-text FAILED:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`large-text ok — every control scaled with the text, no overflow, no clipping, target >= ${MIN_TARGET}px.`);
