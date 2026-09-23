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
 * Beyond axe it also runs four behaviour checks that only make sense in a real browser. They have
 * no baseline — any failure fails the run:
 *   - reduced motion: with prefers-reduced-motion, no story may run a looping animation faster than 3s
 *   - forced colors:  with forced-colors active, every focus stop in every story keeps a visible
 *                     indicator (box-shadow rings are stripped in that mode; an outline survives)
 *   - keyboard drag:  KanbanBoard cards can be picked up, moved and dropped with Space / arrows
 *   - grid selection: a DataGrid with `selectable` selects a rectangle by mouse drag and adds a
 *                     separate range with Ctrl+click, a whole column with Ctrl+click on its
 *                     header, and dragging past the grid's edge scrolls it and keeps extending
 *                     the range (real layout + real pointer events)
 *
 * kx-verify: accessibility
 * kx-verify-covers: packages/ui/src/stories/*.stories.tsx
 * This is the strongest accessibility evidence in the repository, and `verification.json` records it as such:
 * every story, in a real browser, in light and dark, with every axe rule on. The subjects come from the story
 * directory rather than from anything named here, so a component with no story gets no credit from it.
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
const behaviourFailures = [];

async function scan(context, story, theme) {
  const page = await context.newPage();
  try {
    await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.body.classList.contains("sb-show-main") || document.body.classList.contains("sb-show-errordisplay"), null, { timeout: 20000 });
    if (await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay"))) throw new Error("story threw while rendering");
    // Reduced motion: anything still looping faster than 3s after settling ignores the preference.
    await page.waitForTimeout(300);
    const fastLoops = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => {
          const timing = a.effect && a.effect.getComputedTiming();
          return timing && timing.iterations === Infinity && Number(timing.duration) < 3000 && a.playState === "running";
        })
        .map((a) => (a.effect && a.effect.target && a.effect.target.tagName.toLowerCase()) + ":" + (a.animationName || a.transitionProperty || "animation")),
    );
    if (fastLoops.length) behaviourFailures.push(`${story.id}|${theme} reduced-motion: still looping: ${[...new Set(fastLoops)].join(", ")}`);

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
// ── forced colors: every focus stop must keep a visible indicator ────────────────────────────
{
  const forced = await browser.newContext({ viewport: { width: 1024, height: 768 }, forcedColors: "active", reducedMotion: "reduce" });
  let nextStory = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (nextStory < stories.length) {
        const story = stories[nextStory++];
        const page = await forced.newPage();
        try {
          await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story&globals=theme:light`, { waitUntil: "load" });
          await page.waitForFunction(() => document.body.classList.contains("sb-show-main"), null, { timeout: 20000 });
          await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
          await page.waitForTimeout(150);
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press("Tab");
            const stop = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body || !el.closest("#storybook-root")) return null;
              // The real input behind InputOTP is transparent; focus is drawn on its active slot, so check that instead.
              const target = el.hasAttribute("data-input-otp") ? document.querySelector('#storybook-root [class*="z-docked"][class*="ring-ring"]') || el : el;
              const cs = getComputedStyle(target);
              const visible = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
              return { visible, name: el.tagName.toLowerCase() + (el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : "") };
            });
            if (stop && !stop.visible) behaviourFailures.push(`${story.id} forced-colors: no visible focus indicator on ${stop.name}`);
          }
        } catch (err) {
          behaviourFailures.push(`${story.id} forced-colors: ${String(err.message).split("\n")[0]}`);
        } finally {
          await page.close();
        }
      }
    }),
  );
  await forced.close();
}

// ── KanbanBoard: keyboard drag (needs real layout, so it can't live in the jsdom suite) ───────
{
  const kanban = stories.find((s) => /kanban/i.test(s.id) && /default/i.test(s.id));
  if (!kanban) behaviourFailures.push("kanban: no default KanbanBoard story found");
  else {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    try {
      await page.goto(`${base}/iframe.html?id=${kanban.id}&viewMode=story&globals=theme:light`, { waitUntil: "load" });
      await page.waitForFunction(() => document.body.classList.contains("sb-show-main"), null, { timeout: 20000 });
      await page.waitForTimeout(400);
      const columns = () =>
        page.evaluate(() => {
          const cards = [...document.querySelectorAll('#storybook-root [aria-roledescription="sortable"]')];
          const groups = new Map();
          for (const c of cards) {
            const key = c.parentElement;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(c.textContent.trim());
          }
          return [...groups.values()];
        });
      const drag = async (keys) => {
        await page.locator('#storybook-root [aria-roledescription="sortable"]').first().focus();
        await page.keyboard.press("Space"); // pick up
        await page.waitForTimeout(150);
        for (const k of keys) {
          await page.keyboard.press(k);
          await page.waitForTimeout(150);
        }
        await page.keyboard.press("Space"); // drop
        await page.waitForTimeout(250);
      };
      const before = await columns();
      await drag(["ArrowDown"]);
      const reordered = await columns();
      if (JSON.stringify(reordered[0]) === JSON.stringify(before[0]) || reordered[0][0] !== before[0][1])
        behaviourFailures.push(`kanban: Space + ArrowDown + Space did not reorder within a column (${JSON.stringify(before[0])} -> ${JSON.stringify(reordered[0])})`);

      await page.reload({ waitUntil: "load" });
      await page.waitForFunction(() => document.body.classList.contains("sb-show-main"), null, { timeout: 20000 });
      await page.waitForTimeout(400);
      const start = await columns();
      await drag(["ArrowRight"]);
      const moved = await columns();
      if (!moved[1] || moved[1].length !== start[1].length + 1 || moved[0].length !== start[0].length - 1)
        behaviourFailures.push(`kanban: Space + ArrowRight + Space did not move the card to the next column (${JSON.stringify(start.map((c) => c.length))} -> ${JSON.stringify(moved.map((c) => c.length))})`);
    } catch (err) {
      behaviourFailures.push(`kanban: ${String(err.message).split("\n")[0]}`);
    } finally {
      await ctx.close();
    }
  }
}

// ── DataGrid: drag selection and Ctrl+click ranges (real pointer events + virtualized layout) ───
{
  const grid = stories.find((s) => /data-?grid/i.test(s.id) && /default/i.test(s.id));
  if (!grid) behaviourFailures.push("datagrid: no default DataGrid story found");
  else {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    try {
      await page.goto(`${base}/iframe.html?id=${grid.id}&viewMode=story&globals=theme:light`, { waitUntil: "load" });
      await page.waitForFunction(() => document.body.classList.contains("sb-show-main"), null, { timeout: 20000 });
      await page.waitForTimeout(400);
      const cell = (r, col) => page.locator(`#storybook-root [data-cell="${r}:${col}"]`);
      const selected = () => page.locator('#storybook-root [role="gridcell"][aria-selected="true"]').count();
      const a = await cell(1, "name").boundingBox();
      const b = await cell(3, "category").boundingBox();
      if (!a || !b) throw new Error("grid cells not found (is the DataGrid story selectable?)");
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
      await page.mouse.up();
      const dragged = await selected();
      if (dragged !== 3 * 2) behaviourFailures.push(`datagrid: dragging from row 1 Name to row 3 Category selected ${dragged} cells, expected 6`);
      const c = await cell(4, "qty").boundingBox();
      await page.keyboard.down("Control");
      await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
      await page.keyboard.up("Control");
      const both = await selected();
      const kept = await cell(1, "name").getAttribute("aria-selected");
      if (both !== 7 || kept !== "true") behaviourFailures.push(`datagrid: Ctrl+click should add a separate range and keep the first (selected ${both}, expected 7; first range kept: ${kept})`);
      // Ctrl+click on a column header selects the whole column (and must not sort it)
      const head = page.locator('#storybook-root [data-header="name"]');
      await page.keyboard.down("Control");
      await head.click();
      await page.keyboard.up("Control");
      const headSelected = await head.getAttribute("aria-selected");
      const sortAfter = await head.getAttribute("aria-sort");
      const colCells = page.locator('#storybook-root [data-cell$=":name"]');
      const colTotal = await colCells.count();
      const colSelected = await page.locator('#storybook-root [data-cell$=":name"][aria-selected="true"]').count();
      if (headSelected !== "true" || colSelected !== colTotal || sortAfter === "ascending" || sortAfter === "descending") {
        behaviourFailures.push(`datagrid: Ctrl+click on a header should select the whole column without sorting (header selected: ${headSelected}, cells ${colSelected}/${colTotal}, aria-sort: ${sortAfter})`);
      }
      // Dragging past the bottom edge scrolls the grid and keeps extending the range; releasing stops it
      const gridEl = page.locator('#storybook-root [role="grid"]');
      const box = await gridEl.boundingBox();
      const from = await cell(1, "name").boundingBox();
      if (!box || !from) throw new Error("grid geometry not found for the auto-scroll check");
      const topBefore = await gridEl.evaluate((el) => el.scrollTop);
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2, box.y + box.height + 60, { steps: 5 });
      await page.waitForTimeout(700);
      const topDuring = await gridEl.evaluate((el) => el.scrollTop);
      const lastRow = await page.evaluate(() => Math.max(...[...document.querySelectorAll('#storybook-root [role="gridcell"][aria-selected="true"]')].map((c) => Number(c.getAttribute("data-cell").split(":")[0]))));
      await page.mouse.up();
      await page.waitForTimeout(150);
      const topStop = await gridEl.evaluate((el) => el.scrollTop);
      await page.waitForTimeout(300);
      const topLater = await gridEl.evaluate((el) => el.scrollTop);
      if (!(topDuring > topBefore) || !(lastRow > 8)) {
        behaviourFailures.push(`datagrid: dragging past the bottom edge should scroll and extend the selection (scrollTop ${topBefore} -> ${topDuring}, last selected row ${lastRow})`);
      }
      if (topLater !== topStop) behaviourFailures.push("datagrid: auto-scroll kept running after the mouse button was released");
    } catch (err) {
      behaviourFailures.push(`datagrid: ${String(err.message).split("\n")[0]}`);
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
server.close();

if (failedToLoad.length) {
  console.error(`✗ ${failedToLoad.length} story render(s) failed:\n` + failedToLoad.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}

if (behaviourFailures.length) {
  const unique = [...new Set(behaviourFailures)].sort();
  console.error(`✗ ${unique.length} behaviour check failure(s):\n` + unique.map((f) => `  ${f}`).join("\n"));
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
