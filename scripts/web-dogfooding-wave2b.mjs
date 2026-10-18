/**
 * Wave 2b browser evidence: the selectors and modes moved onto KinetixUI.
 * Run against a production build: `KX_AUDIT_BASE=http://127.0.0.1:3000 node scripts/web-dogfooding-wave2b.mjs`.
 *
 *   device-dashboard group filter  (/iot#layout-dashboard)       ToggleGroup single: was role=tablist with no panels
 *   PillSelector "Chart metric"    (/iot, device detail)         ToggleGroup single pill
 *   preview direction              (/docs/components/button)     SegmentedControl
 *   gallery chips, disclosure,     (/components)                 Toggle, Collapsible, Button, InputGroupButton
 *   clear search, Filters sheet
 *
 * Real keyboard and pointer input in Chromium, LTR and RTL (the document direction, as the site's other RTL checks
 * set it), light and dark, 100% and 200% text, phone and desktop, reduced motion; axe on each control's region;
 * no page overflow. jsdom proves the contracts; this proves them where layout and direction are real.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = process.env.KX_AUDIT_BASE || "http://127.0.0.1:3000";
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/wave2b-browser.json";
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const rows = [];
const failures = [];

async function open(context, path, { dir, theme, textScale }) {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  if (textScale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
  }
  const [p, hash = ""] = path.split("#");
  await page.goto(`${base}${p}${p.includes("?") ? "&" : "?"}kx_traffic=diagnostic${hash ? `#${hash}` : ""}`, { waitUntil: "load" });
  await page.evaluate(
    ({ dir, theme }) => {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    },
    { dir, theme },
  );
  // Hydration and the lazy IoT chunks: acting before they settle measures the server HTML, not the controls.
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  return page;
}

/** Scroll a lazily mounted IoT example into view and wait until it has mounted and settled. */
async function mountExample(page, slug) {
  await page.locator(`[data-lazy-preview="${slug}"]`).scrollIntoViewIfNeeded();
  await page.waitForSelector(`[data-lazy-preview="${slug}"][data-mounted]`);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function axeOn(page, selector, label) {
  await page.addScriptTag({ content: axeSource });
  const v = await page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return [{ id: "missing-region", nodes: [sel] }];
    const r = await window.axe.run(el, { rules: { region: { enabled: false } } });
    return r.violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target.join(" ")).slice(0, 4) }));
  }, selector);
  if (v.length) failures.push(`${label}: axe ${JSON.stringify(v)}`);
  return v.length;
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const focusRing = (locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" || (s.boxShadow && s.boxShadow !== "none");
  });
/** Radix roving focus moves focus on the next tick (`setTimeout`), so read focus only after it has run. */
async function press(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(80);
}
/** The arrow key that points to the next item on screen. */
const forward = (dir) => (dir === "rtl" ? "ArrowLeft" : "ArrowRight");

let MATRIX = [];
for (const width of [390, 1280]) for (const dir of ["ltr", "rtl"]) for (const theme of ["light", "dark"]) for (const textScale of [1, 2]) MATRIX.push({ width, dir, theme, textScale });
// KX_ONLY="390:ltr:light:2" narrows the run while debugging one view.
if (process.env.KX_ONLY) MATRIX = MATRIX.filter((v) => `${v.width}:${v.dir}:${v.theme}:${v.textScale}` === process.env.KX_ONLY);

try {
  for (const view of MATRIX) {
    const { width, dir, theme, textScale } = view;
    const tag = `${width}px ${dir} ${theme} ${textScale * 100}%`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const row = { ...view };

    /* ── device-dashboard group filter ── */
    try {
      const page = await open(context, "/iot#layout-dashboard", view);
      await mountExample(page, "device-dashboard");
      const group = page.getByRole("radiogroup", { name: "Device group" });
      await group.waitFor();
      await group.scrollIntoViewIfNeeded();
      const dash = page.locator('[data-lazy-preview="device-dashboard"]');
      assert.equal(await dash.locator('[role="tablist"], [role="tab"]').count(), 0, "orphaned tab roles remain");
      const radios = group.getByRole("radio");
      assert.equal(await radios.count(), 4);
      assert.equal(await group.getAttribute("dir"), dir, `group carries dir=${await group.getAttribute("dir")}`);
      const shown = () => dash.getByRole("button", { name: /^Show details for/ }).count();
      const all = await shown();
      await radios.nth(0).focus();
      assert(await focusRing(radios.nth(0)), "no visible focus indicator");
      await press(page, forward(dir));
      assert(await radios.nth(1).evaluate((el) => el === document.activeElement), "arrow did not move to the next group");
      assert.equal(await shown(), all, "moving focus filtered the list");
      await press(page, forward(dir));
      await press(page, "Space");
      assert.equal(await radios.nth(2).getAttribute("aria-checked"), "true");
      const plant = await shown();
      assert(plant > 0 && plant < all, `Plant room shows ${plant} of ${all}`);
      await radios.nth(2).click();
      assert.equal(await radios.nth(2).getAttribute("aria-checked"), "true", "a click un-chose the group");
      await radios.nth(0).click();
      assert.equal(await shown(), all);
      // The filter row itself must fit: it wraps instead of overflowing.
      const fit = await group.evaluate((el) => ({ right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left, vw: document.documentElement.clientWidth, sw: el.scrollWidth, cw: el.clientWidth }));
      assert(fit.left >= -1 && fit.right <= fit.vw + 1 && fit.sw <= fit.cw + 1, `the filter row overflows ${JSON.stringify(fit)}`);
      // The page as a whole is recorded, not asserted: at 390px/200% the dashboard example already scrolls the page
      // sideways by 168px on main (bfddb67), from content this wave does not touch (Wave 2d).
      const pageOverflow = await overflow(page);
      row.dashboard = { groups: 4, all, plantRoom: plant, filterRowFits: true, pageOverflow, axe: await axeOn(page, '[data-lazy-preview="device-dashboard"] [role="radiogroup"]', `dashboard ${tag}`) };
      await page.close();
    } catch (e) {
      failures.push(`dashboard ${tag}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}`);
    }

    /* ── PillSelector in device detail ── */
    try {
      const page = await open(context, "/iot", view);
      await mountExample(page, "device-detail");
      const group = page.getByRole("radiogroup", { name: "Chart metric" });
      await group.waitFor();
      await group.scrollIntoViewIfNeeded();
      const radios = group.getByRole("radio");
      const n = await radios.count();
      assert(n >= 2, `only ${n} metrics`);
      const checked = await group.locator('[aria-checked="true"]').count();
      assert.equal(checked, 1);
      assert.equal(await group.locator('[aria-checked="true"] svg').count(), 1, "the chosen pill has no check");
      await radios.nth(0).click();
      await press(page, forward(dir));
      assert(await radios.nth(1).evaluate((el) => el === document.activeElement), "arrow did not move to the next metric");
      await press(page, "Enter");
      assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true");
      assert(await focusRing(radios.nth(1)), "no visible focus indicator");
      const ov = await overflow(page);
      assert(ov <= 0, `page overflows by ${ov}px`);
      row.pillSelector = { metrics: n, axe: await axeOn(page, '[data-lazy-preview="device-detail"] [role="radiogroup"]', `pill ${tag}`) };
      await page.close();
    } catch (e) {
      failures.push(`pill selector ${tag}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}`);
    }

    /* ── preview direction ── */
    try {
      const page = await open(context, "/docs/components/button", view);
      const group = page.getByRole("radiogroup", { name: "Preview direction" }).first();
      await group.scrollIntoViewIfNeeded();
      const ltr = group.getByRole("radio", { name: /left to right/ });
      const rtl = group.getByRole("radio", { name: /right to left/ });
      assert.equal(await (dir === "rtl" ? rtl : ltr).getAttribute("aria-checked"), "true", "does not start in the page's direction");
      const stage = () => page.locator("[data-preview-stage]").first().getAttribute("dir");
      const other = dir === "rtl" ? ltr : rtl;
      await other.click();
      assert.equal(await other.getAttribute("aria-checked"), "true");
      assert.equal(await stage(), dir === "rtl" ? "ltr" : "rtl");
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute("dir")), dir, "the page direction changed");
      // Keyboard back to the page's direction. In LTR the start segment ("ltr") is to the left; in RTL the segments
      // run right to left and the start segment ("rtl") is again to the left. Either way ArrowLeft, then Space.
      await other.focus();
      await press(page, "ArrowLeft");
      await press(page, "Space");
      const back = (await ltr.getAttribute("aria-checked")) === "true" ? "ltr" : "rtl";
      assert.equal(back, dir, "the arrow key did not follow the reading direction");
      assert.equal(await stage(), dir);
      row.previewDirection = { start: dir, afterKeyboard: back, axe: await axeOn(page, '[role="radiogroup"][aria-label="Preview direction"]', `preview ${tag}`) };
      const ov = await overflow(page);
      assert(ov <= 0, `page overflows by ${ov}px`);
      await page.close();
    } catch (e) {
      failures.push(`preview direction ${tag}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}`);
    }

    /* ── gallery ── */
    try {
      const page = await open(context, "/components", view);
      const search = page.locator("#component-search");
      await search.fill("but");
      const clear = page.getByRole("button", { name: "Clear search" });
      await clear.click();
      assert.equal(await search.inputValue(), "");
      assert(await search.evaluate((el) => el === document.activeElement), "focus did not return to the search field");
      if (width < 768) {
        await page.getByRole("button", { name: /^Filters/ }).click();
        const sheet = page.getByRole("dialog", { name: "Filters" });
        await sheet.waitFor();
        const chip = sheet.getByRole("group", { name: "Filter by business domain" }).getByRole("button", { name: /^Commerce/ });
        await chip.click();
        await page.waitForURL(/domain=commerce/);
        assert.equal(await chip.getAttribute("aria-pressed"), "true");
        row.galleryAxe = await axeOn(page, '[role="dialog"]', `gallery sheet ${tag}`);
        await sheet.getByRole("button", { name: /^Show \d+ component/ }).click();
        await sheet.waitFor({ state: "detached" });
      } else {
        const disclosure = page.getByRole("button", { name: /^Business filters/ });
        assert.equal(await disclosure.getAttribute("aria-expanded"), "false");
        await disclosure.click();
        assert.equal(await disclosure.getAttribute("aria-expanded"), "true");
        const region = page.locator(`#${await disclosure.getAttribute("aria-controls")}`);
        // Keyboard into the groups: Tab from the disclosure reaches the first business chip, with a visible ring.
        await press(page, "Tab");
        const first = page.locator(":focus");
        assert(region.locator(":focus").count !== undefined && (await region.locator(":focus").count()) === 1, "Tab did not enter the business groups");
        assert(await focusRing(first), "no visible focus indicator on a chip");
        await press(page, "Space");
        await page.waitForURL(/capability=/);
        assert.equal(await first.getAttribute("aria-pressed"), "true");
        await press(page, "Space");
        await page.waitForURL((u) => !u.search.includes("capability="));
        const chip = region.getByRole("group", { name: "Filter by business domain" }).getByRole("button", { name: /^Commerce/ });
        await chip.click();
        await page.waitForURL(/domain=commerce/);
        assert.equal(await chip.getAttribute("aria-pressed"), "true");
        row.galleryAxe = await axeOn(page, "#component-search", `gallery search ${tag}`);
        row.galleryAxe += await axeOn(page, `#${await disclosure.getAttribute("aria-controls")}`, `gallery business ${tag}`);
      }
      const remove = page.getByRole("button", { name: /^Remove filter Business domain: Commerce/ });
      await remove.click();
      await page.waitForURL((u) => !u.search.includes("domain=commerce"));
      assert.equal(await remove.count(), 0);
      const ov = await overflow(page);
      assert(ov <= 0, `page overflows by ${ov}px`);
      row.gallery = "clear search, business chip on/off, active-filter removal";
      await page.close();
    } catch (e) {
      failures.push(`gallery ${tag}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}`);
    }

    rows.push(row);
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(out, JSON.stringify({ base, rows, failures }, null, 2) + "\n");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Wave 2b browser checks passed: ${rows.length} views × 4 surfaces (LTR/RTL, light/dark, 100/200% text, 390/1280px).`);
