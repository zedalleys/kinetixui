/**
 * use-cases-browser.mjs — rendered proof for the Use Cases hub (/capabilities) and the published /use-cases pages
 * (BD-W3b2a).
 *
 *   pnpm --filter @kinetixui/web build && pnpm --filter @kinetixui/web start &
 *   node scripts/use-cases-browser.mjs [--base http://127.0.0.1:3000] [--shots <dir>]
 *
 * use-cases-pages.test.tsx proves the rendered markup links only to pages, anchors and filters that exist. This proves
 * the built site in Chromium, where routing, history, scrolling and layout are real:
 *
 *   links         every internal link on the hub and each published use-case page answers 200 and, for a hash,
 *                 carries that id on the destination
 *   anchors       a direct load of a hub anchor (#domain-<id>, #workflow-<id>, a capability id) scrolls it into view,
 *                 and so does a reload
 *   navigation    hub → workflow card → use-case page section → component page, then Back and Forward return to each
 *   keyboard      Tab reaches the on-page navigation within the first stops of the page and every hub link shows a focus indicator; Enter on an
 *                 on-page link moves to its section
 *   a11y          axe-core (every rule on) on the hub and each use-case page, light and dark
 *   layout        390, 768 and 1280 wide × 100% and 200% text × LTR and RTL × light and dark, reduced motion: no
 *                 sideways scroll and no link, card or heading outside the viewport
 *   forced colors a focused hub link is still distinguishable from a resting one
 *   console       no page error, hydration warning or failed same-origin request anywhere above
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
const routes = JSON.parse(readFileSync(new URL("../discovery-routes.json", import.meta.url), "utf8")).routes;
const index = JSON.parse(readFileSync(new URL("../discovery-index.json", import.meta.url), "utf8"));

const failures = [];
const fail = (msg) => failures.push(msg);
const passed = [];
const ok = (msg) => passed.push(msg);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

const consoleErrors = [];
const thirdPartyFailures = new Set();
const ORIGIN = new URL(base).origin;
function watch(page) {
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    // a failed request is reported below with its URL, so a third-party outage is told apart from this site's own
    if (/^Failed to load resource/.test(m.text())) return;
    if (m.type() === "error" || /hydrat/i.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    const url = new URL(r.url());
    // the header's GitHub star count is rate-limited on shared CI runners and falls back to a plain icon
    if (url.origin !== ORIGIN) thirdPartyFailures.add(`${r.status()} ${url.origin}${url.pathname}`);
    else consoleErrors.push(`${page.url()}: ${r.status()} for ${url.pathname}`);
  });
  return page;
}
const ready = async (page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);
};
const setLook = (page, scheme, dir = "ltr") =>
  page.evaluate(
    ({ s, d }) => {
      document.documentElement.classList.toggle("dark", s === "dark");
      document.documentElement.style.colorScheme = s;
      document.documentElement.setAttribute("dir", d);
    },
    { s: scheme, d: dir },
  );
const main = (page) => page.locator("main").first();
/** Whether the element is in view once scrolling settles: the site scrolls to a hash smoothly unless motion is reduced. */
const inView = (page, id) =>
  page
    .waitForFunction(
      (i) => {
        const el = document.getElementById(i);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= -2 && r.top < innerHeight;
      },
      id,
      { timeout: 3000 },
    )
    .then(() => true)
    .catch(() => false);

/* ── links ───────────────────────────────────────────────────────────────────────────────────────── */
{
  const pages = new Map();
  const get = async (path) => {
    if (!pages.has(path)) {
      const r = await fetch(`${base}${path}`);
      pages.set(path, { status: r.status, html: await r.text() });
    }
    return pages.get(path);
  };
  let checked = 0;
  for (const route of routes) {
    const page = await get(route);
    if (page.status !== 200) {
      fail(`${route} answered ${page.status}`);
      continue;
    }
    const context = await browser.newContext();
    const p = watch(await context.newPage());
    await p.goto(`${base}${route}`);
    const hrefs = await main(p).locator("a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
    for (const href of hrefs) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const url = new URL(href, `${base}${route}`);
      const dest = await get(url.pathname);
      if (dest.status !== 200) fail(`${route}: ${href} answered ${dest.status}`);
      const id = url.hash.slice(1);
      if (id && !dest.html.includes(`id="${id}"`)) fail(`${route}: ${href} has no #${id}`);
      checked++;
    }
    await context.close();
  }
  ok(`links: ${checked} internal links on ${routes.length} pages resolve, every hash to an id`);
}

/* ── anchors, direct load and reload ─────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = watch(await context.newPage());
  const shipping = index.domains.filter((d) => d.counts.existing + d.counts.partial > 0);
  const targets = [`domain-${shipping[0].id}`, `workflow-${index.workflows.at(-1).id}`, "next-steps"];
  for (const id of targets) {
    await page.goto(`${base}/capabilities#${id}`);
    await ready(page);
    if (!(await inView(page, id))) fail(`direct load of /capabilities#${id} does not show it`);
    await page.reload();
    await ready(page);
    if (!(await inView(page, id))) fail(`reload of /capabilities#${id} does not show it`);
  }
  ok(`anchors: ${targets.join(", ")} show on direct load and after reload`);
  await context.close();
}

/* ── navigation: hub → use-case section → component page, Back and Forward ──────────────────────── */
{
  const published = index.workflows.find((w) => index.domains.find((d) => d.id === w.domain)?.page);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = watch(await context.newPage());
  await page.goto(`${base}/capabilities`);
  await ready(page);
  const card = page.locator(`#workflow-${published.id}`);
  await card.getByRole("link", { name: /See every stage/ }).click();
  await page.waitForURL(`**/use-cases/${published.domain}#${published.id}`);
  await ready(page);
  if (!(await inView(page, published.id))) fail(`hub → /use-cases/${published.domain}#${published.id}: section not in view`);
  const component = main(page).locator(`a[href^="/docs/components/"]`).first();
  const componentHref = await component.getAttribute("href");
  await component.click();
  await page.waitForURL(`**${componentHref}`);
  await page.goBack();
  await page.waitForURL(`**/use-cases/${published.domain}*`);
  await page.goBack();
  await page.waitForURL(`**/capabilities`);
  await page.goForward();
  await page.waitForURL(`**/use-cases/${published.domain}*`);
  await page.goForward();
  await page.waitForURL(`**${componentHref}`);
  ok(`navigation: hub → ${published.domain}#${published.id} → ${componentHref}, Back and Forward return to each`);
  await context.close();
}

/* ── keyboard ────────────────────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = watch(await context.newPage());
  await page.goto(`${base}/capabilities`);
  await ready(page);
  const onPage = page.getByRole("navigation", { name: "On this page" });
  // Tab from the top: within the first stops inside <main> (after the intro's one roadmap link) focus reaches the
  // on-page navigation, so a keyboard reader can jump to a section without tabbing through every card
  await page.locator("body").focus();
  const firstLink = (await onPage.getByRole("link").first().textContent()).trim();
  let stopsInMain = 0;
  let reached = false;
  for (let i = 0; i < 80 && !reached && stopsInMain < 4; i++) {
    await page.keyboard.press("Tab");
    const at = await page.evaluate(() => ({ inMain: !!document.activeElement?.closest("main"), inNav: !!document.activeElement?.closest('nav[aria-label="On this page"]'), text: document.activeElement?.textContent.trim() }));
    if (at.inMain) stopsInMain++;
    reached = at.inNav && at.text === firstLink;
  }
  if (!reached) fail(`keyboard: the on-page navigation is not within the first ${stopsInMain} stops in the page`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  if (!(await inView(page, "business-domains"))) fail("keyboard: Enter on the first on-page link does not move to its section");
  // every link on the hub shows a focus indicator distinct from its resting style
  const unindicated = await main(page)
    .locator("a[href]")
    .evaluateAll((as) => {
      const look = (el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth, s.boxShadow, s.textDecorationLine].join("|");
      };
      return as
        .filter((a) => {
          const rest = look(a);
          a.focus({ focusVisible: true });
          const focused = look(a);
          a.blur();
          return rest === focused;
        })
        .map((a) => as.indexOf(a));
    });
  // `focus()` from script does not always count as keyboard focus; check every straggler by tabbing to it
  const stragglers = [];
  const links = main(page).locator("a[href]");
  for (const i of unindicated) {
    const link = links.nth(i);
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const same = await link.evaluate((a) => {
      const s = getComputedStyle(a);
      return document.activeElement === a && s.outlineStyle === "none" && s.boxShadow === "none";
    });
    if (same) stragglers.push(await link.getAttribute("href"));
  }
  if (stragglers.length) fail(`keyboard: no focus indicator on ${stragglers.join(", ")}`);
  ok("keyboard: the on-page navigation is among the first stops in the page, Enter moves to its section, every link shows focus");
  await context.close();
}

/* ── axe ─────────────────────────────────────────────────────────────────────────────────────────── */
for (const route of routes)
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    const page = watch(await context.newPage());
    await page.goto(`${base}${route}`);
    await ready(page);
    await setLook(page, scheme);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
    for (const v of result.violations) fail(`axe ${route} ${scheme}: ${v.id} — ${v.nodes.length} node(s): ${v.nodes[0]?.target}`);
    await context.close();
  }
ok(`axe: no violations on ${routes.join(", ")} in light and dark`);

/* ── layout matrix ───────────────────────────────────────────────────────────────────────────────── */
let views = 0;
for (const route of routes)
  for (const width of [390, 768, 1280])
    for (const textScale of [1, 2])
      for (const dir of ["ltr", "rtl"])
        for (const scheme of ["light", "dark"]) {
          const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce", colorScheme: scheme });
          const page = watch(await context.newPage());
          const cdp = await context.newCDPSession(page);
          await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
          await page.goto(`${base}${route}`);
          await ready(page);
          await setLook(page, scheme, dir);
          await page.waitForTimeout(100);
          const m = await page.evaluate(() => {
            const main = document.querySelector("main") ?? document.body;
            const outside = [...main.querySelectorAll("a, h1, h2, h3, li, p")].filter((el) => {
              const b = el.getBoundingClientRect();
              return b.width > 0 && (b.left < -1 || b.right > innerWidth + 1);
            });
            return {
              scroll: document.documentElement.scrollWidth - innerWidth,
              outside: outside.length,
              sample: outside.slice(0, 2).map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`),
            };
          });
          const tag = `${route} ${width}/${textScale * 100}%/${dir}/${scheme}`;
          if (m.scroll > 0) fail(`layout ${tag}: page scrolls sideways by ${m.scroll}px`);
          if (m.outside) fail(`layout ${tag}: ${m.outside} element(s) outside the viewport, e.g. ${m.sample.join(", ")}`);
          if (shots && scheme === "light" && dir === "ltr" && (width === 390 || width === 1280))
            await page.screenshot({ path: `${shots}${route.replaceAll("/", "_")}-${width}-${textScale * 100}.png`, fullPage: true });
          if (shots && route === "/capabilities" && width === 1280 && textScale === 1 && dir === "rtl" && scheme === "dark")
            await page.screenshot({ path: `${shots}_capabilities-1280-100-rtl-dark.png` });
          views++;
          await context.close();
        }
ok(`layout: ${views} views (${routes.length} pages × 390/768/1280 × 100/200% × LTR/RTL × light/dark, reduced motion)`);

/* ── forced colors ───────────────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: "active" });
  const page = watch(await context.newPage());
  await page.goto(`${base}/capabilities`);
  await ready(page);
  const link = page.locator('section[aria-labelledby="next-steps"]').getByRole("link").first();
  const look = (el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineColor, s.boxShadow, s.color, s.textDecorationLine].join("|");
  };
  const rest = await link.evaluate(look);
  await link.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const focused = await link.evaluate(look);
  if (rest === focused) fail(`forced colors: a focused next-step link looks the same as a resting one (${rest})`);
  else ok("forced colors: a focused hub link is distinguishable");
  await context.close();
}

if (consoleErrors.length) for (const e of [...new Set(consoleErrors)]) fail(`console: ${e}`);
else ok("no page errors, console errors, hydration warnings or failed same-origin requests");
if (thirdPartyFailures.size) passed.push(`(not this site's) third-party requests failed: ${[...thirdPartyFailures].join(", ")}`);

await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`check:use-cases — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`check:use-cases ok — ${passed.length} checks`);
