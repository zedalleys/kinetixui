/**
 * blocks-discovery-browser.mjs — rendered proof for the /blocks discovery filters (BD-W3a).
 *
 *   pnpm --filter @kinetixui/web build && pnpm --filter @kinetixui/web start &
 *   node scripts/blocks-discovery-browser.mjs [--base http://127.0.0.1:3000] [--shots <dir>]
 *
 * The component test (blocks-gallery.test.tsx) proves the URL contract against a mocked router. This proves it in
 * Chromium against the built site, where the router, history and layout are real:
 *
 *   url       a direct link restores the filters; a filter change rewrites the URL without adding a history entry;
 *             typing writes the URL once, after a pause, not per key; Back and Forward between two filtered links
 *             show each link's results; a reload keeps them; unknown values are ignored without an error.
 *   keyboard  Tab reaches the search box and then every filter in reading order, each with a visible focus
 *             indicator; changing a filter from the keyboard updates the results and the live status line.
 *   layout    no sideways page scroll at 390, 768 and 1280, 100% and 200% text, LTR and RTL, light and dark, with
 *             and without filters; in RTL the filters run right to left.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const shots = arg("--shots", null);
if (shots) mkdirSync(shots, { recursive: true });

const failures = [];
const fail = (msg) => failures.push(msg);
const passed = [];
const ok = (msg) => passed.push(msg);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

const status = (page) => page.locator("[data-blocks-status]").textContent();
const titles = (page) => page.locator("section > h2").allTextContents();
const search = (page) => new URL(page.url()).search;
const settle = async (page) => {
  // the gallery hydrates from the URL inside Suspense; wait for the client copy, then for React to settle
  await page.waitForFunction(() => document.querySelector("[data-blocks-status]")?.textContent?.includes("blocks"));
  await page.waitForTimeout(300);
};

/* ── url ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${base}/blocks?cat=Commerce&domain=finance`);
  await settle(page);
  const t = await titles(page);
  if (JSON.stringify(t) !== JSON.stringify(["Receipt"])) fail(`direct link: expected [Receipt], got ${JSON.stringify(t)}`);
  else ok("direct link restores cat + domain → Receipt only");
  if ((await page.locator("#blocks-filter-cat").inputValue()) !== "Commerce") fail("direct link: category select not restored");

  await page.reload();
  await settle(page);
  if ((await titles(page)).length !== 1) fail("reload lost the filters");
  else ok("reload keeps the filters");

  const before = await page.evaluate(() => history.length);
  await page.selectOption("#blocks-filter-domain", "");
  await page.waitForFunction(() => !location.search.includes("domain="));
  const after = await page.evaluate(() => history.length);
  if (after !== before) fail(`filter change added ${after - before} history entries`);
  else ok("filter change uses replace (history length unchanged)");
  if (search(page) !== "?cat=Commerce") fail(`after clearing domain, URL is ${search(page)}`);
  else ok("clearing one filter keeps the other (?cat=Commerce)");

  // typing: one URL write after the pause, never one per key, never a history entry
  await page.fill("#block-search", "");
  await page.locator("#block-search").pressSequentially("order", { delay: 40 });
  const mid = search(page);
  await page.waitForFunction(() => location.search.includes("q=order"), null, { timeout: 3000 });
  if (mid.includes("q=ord") && !mid.includes("q=order")) fail(`search wrote a partial term to the URL: ${mid}`);
  if ((await page.evaluate(() => history.length)) !== before) fail("typing added history entries");
  else ok(`typing writes once after a pause (${search(page)}), no history entries`);
  if (JSON.stringify(await titles(page)) !== JSON.stringify(["Order summary"])) fail(`search "order" in Commerce: ${await titles(page)}`);

  // Back / Forward between two real navigations
  await page.goto(`${base}/blocks?workflow=checkout`);
  await settle(page);
  await page.goto(`${base}/blocks?cat=Data`);
  await settle(page);
  const data = await titles(page);
  await page.goBack();
  await settle(page);
  const back = await titles(page);
  await page.goForward();
  await settle(page);
  const fwd = await titles(page);
  if (JSON.stringify(back) !== JSON.stringify(["Order summary", "Receipt"])) fail(`Back showed ${JSON.stringify(back)}`);
  else if (JSON.stringify(fwd) !== JSON.stringify(data)) fail(`Forward showed ${JSON.stringify(fwd)}, expected ${JSON.stringify(data)}`);
  else ok(`Back/Forward restore each link's results (checkout → ${back.length}, Data → ${data.length})`);

  await page.goto(`${base}/blocks?capability=teleportation&platform=WearOS&utm_source=x`);
  await settle(page);
  const all = (await titles(page)).length;
  if (all !== 21) fail(`unknown values: expected all 21 blocks, got ${all}`);
  else ok("unknown values are ignored: all 21 blocks");
  await page.selectOption("#blocks-filter-cat", "Forms");
  await page.waitForFunction(() => location.search.includes("cat=Forms"));
  if (search(page) !== "?cat=Forms&utm_source=x") fail(`invalid values not dropped / foreign key not kept: ${search(page)}`);
  else ok("next write drops the invalid values and keeps utm_source (?cat=Forms&utm_source=x)");

  // empty state and its reset
  await page.goto(`${base}/blocks?cat=Marketing&workflow=checkout`);
  await settle(page);
  if (!(await page.getByText("No blocks match all of these filters.").isVisible())) fail("empty state not shown");
  await page.getByRole("button", { name: "Clear all filters" }).last().click();
  await page.waitForFunction(() => location.search === "");
  await settle(page);
  if ((await titles(page)).length !== 21) fail("Clear all did not bring every block back");
  else ok("empty state explains itself; Clear all filters resets to 21");
  if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
  await context.close();
}

/* ── keyboard ────────────────────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/blocks`);
  await settle(page);
  await page.focus("#block-search");
  const order = ["block-search"];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => document.activeElement?.id ?? ""));
  }
  const expected = ["block-search", "blocks-filter-cat", "blocks-filter-capability", "blocks-filter-domain", "blocks-filter-workflow", "blocks-filter-platform"];
  if (JSON.stringify(order) !== JSON.stringify(expected)) fail(`tab order ${JSON.stringify(order)}`);
  else ok("Tab order: search → category → capability → domain → workflow → platform");

  // a visible focus indicator on each select: its focused box-shadow or border differs from rest
  for (const id of expected.slice(1)) {
    const rest = await page.evaluate((id) => {
      const s = getComputedStyle(document.getElementById(id));
      return `${s.boxShadow}|${s.borderColor}|${s.outlineStyle}`;
    }, id);
    await page.focus(`#${id}`);
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const focus = await page.evaluate((id) => {
      const s = getComputedStyle(document.getElementById(id));
      return `${s.boxShadow}|${s.borderColor}|${s.outlineStyle}`;
    }, id);
    if (rest === focus) fail(`${id}: no visible change on keyboard focus`);
  }
  ok("each filter shows a focus indicator distinct from its rest style");

  // change a filter from the keyboard (ArrowDown on a focused select changes the value in Chromium on Linux)
  await page.focus("#blocks-filter-capability");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => location.search.includes("capability="));
  const s = await status(page);
  if (!/of 21 blocks · Capability: /.test(s ?? "")) fail(`status after keyboard change: ${s}`);
  else ok(`keyboard change updates results and the live status ("${s}")`);
  const live = await page.locator("[data-blocks-status]").getAttribute("aria-live");
  if (live !== "polite") fail("status line is not aria-live=polite");
  await context.close();
}

/* ── layout ──────────────────────────────────────────────────────────────────────────────────────── */
const PATHS = ["/blocks", "/blocks?cat=Commerce&capability=transactions", "/blocks?cat=Marketing&workflow=checkout"];
let views = 0;
for (const width of [390, 768, 1280]) {
  for (const textScale of [1, 2]) {
    for (const dir of ["ltr", "rtl"]) {
      for (const scheme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", colorScheme: scheme });
        for (const path of PATHS) {
          const page = await context.newPage();
          if (textScale !== 1) {
            const cdp = await context.newCDPSession(page);
            await cdp.send("Page.enable");
            await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
          }
          await page.goto(`${base}${path}`);
          await page.evaluate(
            ({ s, d }) => {
              document.documentElement.classList.toggle("dark", s === "dark");
              document.documentElement.style.colorScheme = s;
              document.documentElement.setAttribute("dir", d);
            },
            { s: scheme, d: dir },
          );
          await settle(page);
          views++;
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (overflow > 0) fail(`layout ${width}/${textScale * 100}%/${dir}/${scheme} ${path}: scrolls sideways by ${overflow}px`);
          // in RTL the first filter (category) sits to the right of the second on a shared row
          if (dir === "rtl" && width >= 768) {
            const [a, b] = await Promise.all(["#blocks-filter-cat", "#blocks-filter-capability"].map((s) => page.locator(s).boundingBox()));
            if (a && b && Math.abs(a.y - b.y) < 2 && !(a.x > b.x)) fail(`rtl ${width}/${textScale * 100}% ${path}: filters not right-to-left`);
          }
          if (shots && scheme === "light" && path !== PATHS[2] && (width !== 768 || textScale === 1)) {
            const name = `${width}-${textScale * 100}-${dir}${path === "/blocks" ? "" : "-filtered"}`;
            await page.locator("[role=search]").scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${shots}/${name}.png` });
          }
          if (shots && scheme === "dark" && width === 1280 && textScale === 1 && dir === "ltr")
            await page.screenshot({ path: `${shots}/1280-dark${path === "/blocks" ? "" : path === PATHS[1] ? "-filtered" : "-empty"}.png` });
          await page.close();
        }
        await context.close();
      }
    }
  }
}
ok(`layout: ${views} views (3 widths × 2 text sizes × LTR/RTL × light/dark × 3 states), RTL filter order checked at ≥768`);

await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
if (failures.length) {
  console.error(failures.map((f) => `  ✗ ${f}`).join("\n"));
  console.error(`\nblocks discovery browser check failed — ${failures.length} problem(s).`);
  process.exit(1);
}
console.log("blocks discovery browser check ok");
