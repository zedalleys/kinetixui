/**
 * a11y-browser.mjs — real-browser accessibility pass over every Storybook story.
 *
 *   pnpm build-storybook && node scripts/a11y-browser.mjs
 *   node scripts/a11y-browser.mjs --update     rewrite the baseline (see below)
 *
 * The jsdom axe test in packages/ui can't see layout or stylesheets, so it skips
 * colour contrast and can't judge visibility, focus order or portals. This runs
 * the built Storybook (apps/docs/storybook-static) in headless Chromium, opens
 * each story in light AND dark, and runs axe-core with every rule on.
 *
 * a11y-baseline.json lists violations that already existed, keyed
 * `story-id|theme|rule`. A new violation fails the run; a baselined one that no
 * longer occurs also fails (stale entry) so the baseline only shrinks. Use
 * --update to regenerate it deliberately, e.g. right after fixing things.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary (local
 * runs where Playwright's own download isn't installed). CI uses
 * `playwright install chromium`.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
const baselinePath = join(root, "a11y-baseline.json");
const UPDATE = process.argv.includes("--update");
const THEMES = ["light", "dark"];
const CONCURRENCY = 4;

if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(staticDir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
const stories = Object.values(index.entries).filter((e) => e.type === "story");

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const found = new Map(); // key -> sample message
const failedToLoad = [];

async function scan(context, story, theme) {
  const page = await context.newPage();
  try {
    await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.body.classList.contains("sb-show-main") || document.body.classList.contains("sb-show-errordisplay"), null, { timeout: 20000 });
    if (await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay"))) throw new Error("story threw while rendering");
    // Colour transitions (components use transition-colors) would otherwise be measured
    // mid-flight after the theme class flips, giving flaky contrast results.
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    // The Storybook a11y addon loads (and auto-runs) its own axe in the page. Reuse
    // it if present, otherwise inject ours, and retry while it is mid-run.
    if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
      for (let attempt = 0; ; attempt++) {
        try {
          const r = await window.axe.run("#storybook-root", opts);
          return r.violations.map((v) => ({ id: v.id, count: v.nodes.length, help: v.help }));
        } catch (e) {
          if (attempt >= 20 || !String(e).includes("already running")) throw e;
          await new Promise((res) => setTimeout(res, 250));
        }
      }
    });
    for (const v of violations) found.set(`${story.id}|${theme}|${v.id}`, `${v.count}× ${v.help}`);
  } catch (err) {
    failedToLoad.push(`${story.id}|${theme}: ${String(err.message).split("\n")[0]}`);
  } finally {
    await page.close();
  }
}

const jobs = stories.flatMap((s) => THEMES.map((t) => [s, t]));
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const [s, t] = jobs[next++];
      await scan(context, s, t);
    }
  }),
);
await browser.close();
server.close();

if (failedToLoad.length) {
  console.error(`✗ ${failedToLoad.length} story render(s) failed:\n` + failedToLoad.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}

const keys = [...found.keys()].sort();
if (UPDATE) {
  writeFileSync(baselinePath, JSON.stringify(keys, null, 2) + "\n");
  console.log(`baseline written: ${keys.length} known violations across ${stories.length} stories × ${THEMES.length} themes`);
  process.exit(0);
}

const known = new Set(existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : []);
const fresh = keys.filter((k) => !known.has(k));
const stale = [...known].filter((k) => !found.has(k));
if (fresh.length) console.error(`✗ ${fresh.length} new violation(s) (story|theme|rule):\n` + fresh.map((k) => `  ${k} — ${found.get(k)}`).join("\n"));
if (stale.length) console.error(`✗ ${stale.length} baselined violation(s) no longer occur — run with --update:\n` + stale.map((k) => `  ${k}`).join("\n"));
if (fresh.length || stale.length) process.exit(1);
console.log(`a11y-browser ok — ${stories.length} stories × ${THEMES.length} themes, ${known.size} known violations, none new.`);
