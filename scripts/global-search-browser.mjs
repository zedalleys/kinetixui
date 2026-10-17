/**
 * global-search-browser.mjs — rendered proof for the command menu's Blocks and Use cases results (BD-W3b1).
 *
 *   pnpm --filter @kinetixui/web build && pnpm --filter @kinetixui/web start &
 *   node scripts/global-search-browser.mjs [--base http://127.0.0.1:3000] [--shots <dir>]
 *
 * command-menu.test.tsx proves ranking, grouping and the keyboard contract against a mocked router. This proves them in
 * Chromium against the built site, where the router, history, scrolling and layout are real:
 *
 *   destinations  every entry of /search-index.json is a page that answers 200 and, for an anchor, carries that id
 *   keyboard      Ctrl+K, ⌘K and / open it with focus in the search box; / typed in a field stays in the field; arrows
 *                 move the selection and the list scrolls to keep it visible; Enter goes to a block's anchor, a use
 *                 case and a component page; Escape closes and returns focus; it reopens after a navigation; Back,
 *                 Forward and reload keep the destination
 *   a11y          axe-core (every rule on) on the open dialog with results; group names; empty-state text
 *   layout        390, 768 and 1280 wide × 100% and 200% text × LTR and RTL × light and dark, reduced motion: no sideways
 *                 page or list scroll, the dialog inside the viewport, every result line inside the list
 *   forced colors the selected result is still distinguishable
 *   console       no page error or hydration warning anywhere above
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const shots = arg("--shots", null);
if (shots) mkdirSync(shots, { recursive: true });
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const failures = [];
const fail = (msg) => failures.push(msg);
const passed = [];
const ok = (msg) => passed.push(msg);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

const consoleErrors = [];
function watch(page) {
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydrat/i.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`);
  });
  return page;
}

const dialog = (page) => page.getByRole("dialog", { name: "Search the docs" });
const input = (page) => dialog(page).getByRole("combobox");
const selected = (page) => dialog(page).locator('[cmdk-item][data-selected="true"]');
const firstTitle = async (page) => (await selected(page).locator(":scope > span > span").first().textContent().catch(() => null)) ?? (await selected(page).textContent());
async function openMenu(page, how = "Control+k") {
  await page.keyboard.press(how);
  await dialog(page).waitFor();
  // the projection arrives on first open; wait for its groups so results are complete
  await dialog(page).getByRole("group", { name: "Blocks" }).waitFor({ timeout: 10_000 });
}
async function type(page, q) {
  await input(page).fill("");
  await input(page).pressSequentially(q, { delay: 10 });
  await page.waitForTimeout(150);
}
const ready = async (page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);
};

/* ── destinations ────────────────────────────────────────────────────────────────────────────────── */
const projection = await (await fetch(`${base}/search-index.json`)).json();
{
  const entries = [...projection.blocks, ...projection.useCases];
  const pages = new Map();
  for (const e of entries) {
    const url = new URL(e.href, base);
    if (!pages.has(url.pathname)) {
      const r = await fetch(`${base}${url.pathname}`);
      pages.set(url.pathname, { status: r.status, html: await r.text() });
    }
    const p = pages.get(url.pathname);
    if (p.status !== 200) fail(`destination ${e.id}: ${url.pathname} answered ${p.status}`);
    const id = url.hash.slice(1);
    if (id && !p.html.includes(`id="${id}"`)) fail(`destination ${e.id}: no #${id} on ${url.pathname}`);
  }
  for (const href of Object.keys(projection.componentKeywords)) {
    if (!pages.has(href)) {
      const r = await fetch(`${base}${href}`);
      if (r.status !== 200) fail(`component ${href} answered ${r.status}`);
      pages.set(href, { status: r.status, html: "" });
    }
  }
  const ids = entries.map((e) => e.id);
  if (new Set(ids).size !== ids.length) fail("duplicate ids in /search-index.json");
  ok(`destinations: ${entries.length} block/use-case entries and ${Object.keys(projection.componentKeywords).length} component pages resolve`);
}

/* ── keyboard and navigation ─────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = watch(await context.newPage());
  await page.goto(`${base}/`);
  await ready(page);

  await openMenu(page, "Control+k");
  if (!(await input(page).evaluate((el) => el === document.activeElement))) fail("Ctrl+K: focus is not in the search box");
  else ok("Ctrl+K opens with focus in the search box");
  await page.keyboard.press("Escape");
  await dialog(page).waitFor({ state: "detached" });
  const trigger = page.getByRole("button", { name: /^Search…/ });
  if (!(await trigger.evaluate((el) => el === document.activeElement))) fail("Escape: focus did not return to the trigger");
  else ok("Escape closes and returns focus to the trigger");

  await openMenu(page, "Meta+k");
  ok("⌘K opens");
  await page.keyboard.press("Escape");
  await dialog(page).waitFor({ state: "detached" });
  await page.locator("body").press("/");
  await dialog(page).waitFor();
  ok("/ opens");

  // the empty state, announced as text in the list
  await type(page, "zzzz-no-such-thing");
  const empty = await dialog(page).locator("[cmdk-empty]").textContent();
  if (empty?.trim() !== "No results found.") fail(`empty state: got ${JSON.stringify(empty)}`);
  else ok("empty state says No results found.");

  // arrows move the selection, and the list keeps the selected result in view
  await type(page, "a");
  const list = dialog(page).locator("[cmdk-list]");
  for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowDown");
  const [lb, sb] = [await list.boundingBox(), await selected(page).boundingBox()];
  if (!lb || !sb || sb.y < lb.y - 1 || sb.y + sb.height > lb.y + lb.height + 1) fail("ArrowDown: the selected result scrolled out of view");
  else ok("arrow keys move the selection and the list scrolls with it");

  // block → its anchor
  await type(page, "order summary");
  if ((await firstTitle(page)) !== "Order summary") fail(`"order summary": first result ${await firstTitle(page)}`);
  await page.keyboard.press("Enter");
  await page.waitForURL(`${base}/blocks#order-summary`);
  await dialog(page).waitFor({ state: "detached" });
  await ready(page);
  const inView = await page.evaluate(() => {
    const r = document.getElementById("order-summary")?.getBoundingClientRect();
    return !!r && r.top < innerHeight && r.bottom > 0;
  });
  if (!inView) fail("Enter on a block: #order-summary is not in view");
  else ok("Enter on a block goes to /blocks#order-summary, closes, and scrolls to it");

  // reopen after navigating; a use case
  await openMenu(page);
  await type(page, "commerce");
  if ((await firstTitle(page)) !== "Commerce") fail(`"commerce": first result ${await firstTitle(page)}`);
  await page.keyboard.press("Enter");
  await page.waitForURL(`${base}/use-cases/commerce`);
  await ready(page);
  if ((await page.locator("h1").textContent()) !== "Commerce") fail("use case: wrong page");
  else ok("reopens after a navigation; Enter on a use case goes to /use-cases/commerce");

  // a component, by pointer
  await openMenu(page);
  await type(page, "slider");
  await selected(page).click();
  await page.waitForURL(`${base}/docs/components/slider`);
  ok("pointer selection of a component goes to /docs/components/slider");

  // Back / Forward / reload
  await page.goBack();
  await page.waitForURL(`${base}/use-cases/commerce`);
  await page.goBack();
  await page.waitForURL(`${base}/blocks#order-summary`);
  await page.goForward();
  await page.waitForURL(`${base}/use-cases/commerce`);
  await page.reload();
  await ready(page);
  if ((await page.locator("h1").textContent()) !== "Commerce") fail("reload lost the use-case page");
  else ok("Back, Forward and reload keep each destination");
  await page.goto(`${base}/blocks#receipt`);
  await ready(page);
  if (!(await page.locator("#receipt").count())) fail("deep link /blocks#receipt has no #receipt");
  else ok("deep link to a block anchor resolves after a fresh load");

  // "/" typed into a field stays in the field
  await page.goto(`${base}/blocks`);
  await ready(page);
  const box = page.getByRole("searchbox").first();
  if (await box.count()) {
    await box.click();
    await page.keyboard.type("/");
    if (await dialog(page).count()) fail("/ typed in the blocks search box opened the menu");
    else ok("/ typed into a field does not open the menu");
  }
  await context.close();
}

/* ── axe on the open dialog ──────────────────────────────────────────────────────────────────────── */
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  const page = watch(await context.newPage());
  await page.goto(`${base}/`);
  await ready(page);
  await page.evaluate((s) => {
    document.documentElement.classList.toggle("dark", s === "dark");
    document.documentElement.style.colorScheme = s;
  }, scheme);
  await openMenu(page);
  await type(page, "checkout");
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () =>
    // the dialog only: the page behind it is inert and has its own gate (check:a11y-site)
    window.axe.run('[role="dialog"]', { resultTypes: ["violations"], rules: { region: { enabled: false } } }),
  );
  for (const v of result.violations) fail(`axe ${scheme}: ${v.id} — ${v.nodes.length} node(s): ${v.nodes[0]?.target}`);
  if (!result.violations.length) ok(`axe (${scheme}): no violations in the open dialog with results`);
  const groups = await dialog(page).getByRole("group").evaluateAll((gs) => gs.map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby"))?.textContent));
  if (!groups.includes("Blocks") || !groups.includes("Use cases")) fail(`group names: ${JSON.stringify(groups)}`);
  await context.close();
}
ok("result groups are named by their headings");

/* ── layout matrix ───────────────────────────────────────────────────────────────────────────────── */
let views = 0;
for (const width of [390, 768, 1280])
  for (const textScale of [1, 2])
    for (const dir of ["ltr", "rtl"])
      for (const scheme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce", colorScheme: scheme });
        const page = watch(await context.newPage());
        const cdp = await context.newCDPSession(page);
        await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
        await page.goto(`${base}/`);
        await ready(page);
        await page.evaluate(
          ({ s, d }) => {
            document.documentElement.classList.toggle("dark", s === "dark");
            document.documentElement.style.colorScheme = s;
            document.documentElement.setAttribute("dir", d);
          },
          { s: scheme, d: dir },
        );
        await openMenu(page);
        await type(page, "checkout");
        const m = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]');
          const list = d?.querySelector("[cmdk-list]");
          const r = d?.getBoundingClientRect();
          const lr = list?.getBoundingClientRect();
          const outside = [...(list?.querySelectorAll("[cmdk-item] span") ?? [])].filter((s) => {
            const b = s.getBoundingClientRect();
            return b.width > 0 && (b.left < lr.left - 1 || b.right > lr.right + 1);
          }).length;
          return {
            page: document.documentElement.scrollWidth - innerWidth,
            list: list ? list.scrollWidth - list.clientWidth : -1,
            inViewport: !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1,
            outside,
            items: list?.querySelectorAll("[cmdk-item]").length ?? 0,
          };
        });
        const tag = `${width}/${textScale * 100}%/${dir}/${scheme}`;
        if (m.page > 0) fail(`layout ${tag}: page scrolls sideways by ${m.page}px`);
        if (m.list > 0) fail(`layout ${tag}: results list scrolls sideways by ${m.list}px`);
        if (!m.inViewport) fail(`layout ${tag}: dialog leaves the viewport`);
        if (m.outside) fail(`layout ${tag}: ${m.outside} result line(s) outside the list`);
        if (!m.items) fail(`layout ${tag}: no results for "checkout"`);
        if (shots && (width === 390 || width === 1280) && scheme === "light")
          await page.screenshot({ path: `${shots}/search-${width}-${textScale * 100}-${dir}.png` });
        if (shots && width === 1280 && textScale === 1 && dir === "ltr" && scheme === "dark") await page.screenshot({ path: `${shots}/search-1280-100-ltr-dark.png` });
        views++;
        await context.close();
      }
ok(`layout: ${views} views (390/768/1280 × 100/200% × LTR/RTL × light/dark, reduced motion)`);

/* ── forced colors ───────────────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: "active" });
  const page = watch(await context.newPage());
  await page.goto(`${base}/`);
  await ready(page);
  await openMenu(page);
  await type(page, "order");
  const look = (el) => {
    const s = getComputedStyle(el);
    return [s.backgroundColor, s.color, s.outlineStyle, s.outlineColor, s.borderColor].join("|");
  };
  const a = await selected(page).evaluate(look);
  const b = await dialog(page).locator('[cmdk-item][data-selected="false"]').first().evaluate(look);
  if (a === b) fail(`forced colors: the selected result looks the same as the others (${a})`);
  else ok("forced colors: the selected result is distinguishable");
  if (shots) await page.screenshot({ path: `${shots}/search-forced-colors.png` });
  await context.close();
}

if (consoleErrors.length) for (const e of [...new Set(consoleErrors)]) fail(`console: ${e}`);
else ok("no page errors, console errors or hydration warnings");

await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`check:global-search — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`check:global-search ok — ${passed.length} checks`);
