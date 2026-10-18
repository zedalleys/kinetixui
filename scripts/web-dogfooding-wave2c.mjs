/**
 * Wave 2c browser evidence: site actions and fields moved onto KinetixUI.
 * Run against a production build: `KX_AUDIT_BASE=http://127.0.0.1:3000 node scripts/web-dogfooding-wave2c.mjs`.
 *
 *   changelog filters, search, clear   (/docs/changelog)                 ToggleGroup pill, Input, Button
 *   docs filter                        (/docs/colors, desktop only)       InputGroup + InputGroupButton
 *   create modes, disclosure, hex      (/create)                         SegmentedControl, Collapsible, Input
 *   chart series legend                (/charts)                         Toggle
 *   colors format, copy, swatch cards  (/docs/colors)                    SegmentedControl, Button, Card asChild
 *   zone toggle, camera cards, clear   (/demos/building-operations)      Toggle, Card asChild, Button
 *   hero pause                         (/)                               Toggle
 *   IoT checkboxes                     (/iot, /iot#monitoring-playground) Checkbox + Label
 *   registry icon actions              (/docs/components/navigation-bar, app-bar)  Button Ghost icon
 *
 * Real keyboard and pointer input in Chromium, LTR and RTL (the document direction), light and dark, 100% and 200%
 * text, phone and desktop, reduced motion (except the hero pause, which reduced motion hides by design); axe on
 * each control's region; no page overflow. The pending-command Retry/Cancel need a failed device request to appear
 * and are proven in jsdom (`website-wave2c.test.tsx`, `pending-command.test.tsx`).
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = process.env.KX_AUDIT_BASE || "http://127.0.0.1:3000";
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/wave2c-browser.json";
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const rows = [];
const failures = [];

/**
 * A browser context for one view. Direction and theme are applied by an init script, before any page script runs,
 * so hydration starts from them — as in an application that renders `<html dir="rtl">` — rather than racing it: set
 * after load, next-themes could drop the `dark` class and a Radix root could be read before it re-rendered.
 */
async function newView(view, reducedMotion = "reduce") {
  const context = await browser.newContext({ viewport: { width: view.width, height: 900 }, reducedMotion, colorScheme: view.theme });
  await context.addInitScript(({ dir, theme }) => {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
    document.documentElement.setAttribute("dir", dir);
  }, view);
  return context;
}

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
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  const applied = await page.evaluate(() => [document.documentElement.getAttribute("dir"), document.documentElement.classList.contains("dark")]);
  assert.deepEqual(applied, [dir, theme === "dark"], `the view did not hold: ${JSON.stringify(applied)}`);
  return page;
}

async function axeOn(page, selector, label) {
  await page.addScriptTag({ content: axeSource });
  const v = await page.evaluate(async (sel) => {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) return [{ id: "missing-region", nodes: [sel] }];
    const all = [];
    for (const el of els) {
      const r = await window.axe.run(el, { rules: { region: { enabled: false } } });
      all.push(...r.violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target.join(" ")).slice(0, 4) })));
    }
    return all;
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
const isFocused = (locator) => locator.evaluate((el) => el === document.activeElement);
/** The element fits inside the viewport and does not scroll sideways itself. */
const fits = (locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1 && el.scrollWidth <= el.clientWidth + 1;
  });
/** Radix roving focus moves focus on the next tick (`setTimeout`), so read focus only after it has run. */
async function press(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(80);
}
const forward = (dir) => (dir === "rtl" ? "ArrowLeft" : "ArrowRight");
/** Reach a control by keyboard (so :focus-visible applies): focus the element before it, then Tab. */
async function tabTo(page, before, target, max = 6) {
  await before.focus();
  for (let i = 0; i < max; i++) {
    await press(page, "Tab");
    if (await isFocused(target)) return;
  }
  throw new Error("Tab did not reach the control");
}

async function check(name, tag, row, fn) {
  try {
    row[name] = await fn();
  } catch (e) {
    failures.push(`${name} ${tag}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}`);
  }
}

let MATRIX = [];
for (const width of [390, 1280]) for (const dir of ["ltr", "rtl"]) for (const theme of ["light", "dark"]) for (const textScale of [1, 2]) MATRIX.push({ width, dir, theme, textScale });
// KX_ONLY="390:ltr:light:2" narrows the run while debugging one view; KX_SURFACE="colors" to one surface.
if (process.env.KX_ONLY) MATRIX = MATRIX.filter((v) => `${v.width}:${v.dir}:${v.theme}:${v.textScale}` === process.env.KX_ONLY);
const only = (s) => !process.env.KX_SURFACE || process.env.KX_SURFACE === s;

try {
  for (const view of MATRIX) {
    const { width, dir, theme, textScale } = view;
    const tag = `${width}px ${dir} ${theme} ${textScale * 100}%`;
    const context = await newView(view);
    const row = { ...view };

    /* ── changelog ── */
    if (only("changelog"))
      await check("changelog", tag, row, async () => {
        const page = await open(context, "/docs/changelog", view);
        const group = page.getByRole("radiogroup", { name: "Filter releases" });
        const radios = group.getByRole("radio");
        assert.equal(await group.getAttribute("dir"), dir, "the filter group does not follow the page direction");
        assert.equal(await radios.nth(0).getAttribute("aria-checked"), "true");
        const search = page.locator("#changelog-search");
        assert.equal(await search.getAttribute("data-slot"), "input", "the search is not the library Input");
        await tabTo(page, search, radios.nth(0));
        assert(await focusRing(radios.nth(0)), "no visible focus indicator on a filter");
        await press(page, forward(dir));
        assert(await isFocused(radios.nth(1)), "arrow did not move to the next filter");
        await press(page, "Space");
        await page.waitForURL(/filter=/);
        assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true");
        await radios.nth(1).click();
        assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true", "a click un-chose the filter");
        assert(await fits(group), "the filter row overflows");
        const filters = await radios.count();
        const column = Math.round(await page.locator("article").first().evaluate((el) => el.getBoundingClientRect().width));
        await radios.nth(0).click();
        await page.waitForURL((u) => !u.search.includes("filter="));
        // search, then the empty state's clear button
        await search.fill("zzzz-no-release");
        await search.press("Enter");
        await page.waitForURL(/q=zzzz/);
        const clear = page.getByRole("button", { name: "Clear search and filters" });
        assert.equal(await clear.getAttribute("type"), "button");
        assert(await fits(clear), "the clear button overflows");
        await clear.click();
        await page.waitForURL((u) => !u.search.includes("q="));
        assert.equal(await search.inputValue(), "");
        const axe = await axeOn(page, '[role="radiogroup"][aria-label="Filter releases"], #changelog-search', `changelog ${tag}`);
        const ov = await overflow(page);
        assert(ov <= 0, `page overflows by ${ov}px`);
        await page.close();
        return { filters, articleWidth: column, axe };
      });

    /* ── docs sidebar filter (the sidebar is shown from lg) ── */
    if (only("docs-filter") && width >= 1024)
      await check("docsFilter", tag, row, async () => {
        const page = await open(context, "/docs/colors", view);
        const input = page.getByRole("textbox", { name: "Filter documentation" });
        const shell = page.locator('[data-slot="input-group"]').filter({ has: input });
        await input.fill("col");
        const clear = page.getByRole("button", { name: "Clear filter" });
        await tabTo(page, input, clear, 1);
        assert(await focusRing(clear), "no visible focus indicator on Clear filter");
        await clear.click();
        assert.equal(await input.inputValue(), "");
        assert(await isFocused(input), "focus did not return to the field");
        await input.fill("zz");
        await press(page, "Escape");
        assert.equal(await input.inputValue(), "");
        // the search icon sits at the start edge in either direction
        const pos = await shell.evaluate((el) => {
          const icon = el.querySelector("svg").getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return { iconCenter: icon.left + icon.width / 2, mid: box.left + box.width / 2 };
        });
        assert(dir === "rtl" ? pos.iconCenter > pos.mid : pos.iconCenter < pos.mid, `search icon not at the start edge ${JSON.stringify(pos)}`);
        assert(await fits(shell), "the filter field overflows");
        const axe = await axeOn(page, 'aside [data-slot="input-group"]', `docs filter ${tag}`);
        await page.close();
        return { iconAtStart: true, axe };
      });

    /* ── create ── */
    if (only("create"))
      await check("create", tag, row, async () => {
        const page = await open(context, "/create", view);
        let scope = page.getByRole("complementary", { name: "Configuration" });
        // the sidebar is a sheet below the rem-based `lg-rem` breakpoint: on a phone, and at 1280px with 200% text
        const inSheet = !(await scope.isVisible());
        if (inSheet) {
          await page.getByRole("button", { name: "Customize" }).click();
          scope = page.getByRole("dialog");
          await scope.waitFor();
          await page.waitForTimeout(300);
        }
        const appearance = scope.getByRole("radiogroup", { name: "Preview appearance" });
        const light = appearance.getByRole("radio", { name: "Light" });
        const dark = appearance.getByRole("radio", { name: "Dark" });
        assert.equal(await appearance.getAttribute("dir"), dir);
        await light.click();
        await press(page, forward(dir));
        assert(await isFocused(dark), "arrow did not move to Dark");
        assert(await focusRing(dark), "no visible focus indicator on a mode");
        await press(page, "Space");
        assert.equal(await dark.getAttribute("aria-checked"), "true");
        assert.match((await page.locator("[data-create-preview-root]").getAttribute("class")) ?? "", /\bdark\b/);
        assert(await fits(appearance), "the appearance control overflows");
        const toggle = scope.getByRole("button", { name: /all pairs$/ });
        await toggle.scrollIntoViewIfNeeded();
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
        const region = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
        await region.waitFor();
        assert(await region.getByText("Pass").first().isVisible(), "the pairs did not open");
        await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        const hex = scope.getByLabel("Hex", { exact: true });
        await hex.scrollIntoViewIfNeeded();
        assert.equal(await hex.getAttribute("data-slot"), "input");
        await hex.fill("#zz");
        assert.equal(await hex.getAttribute("aria-invalid"), "true");
        await hex.fill("#1d4ed8");
        let axe = await axeOn(page, '[role="radiogroup"][aria-label="Preview appearance"]', `create appearance ${tag}`);
        // close the sheet before reaching the scene control on a phone
        if (inSheet) {
          await press(page, "Escape");
          await page.getByRole("dialog").waitFor({ state: "detached" });
        }
        const scene = page.getByRole("radiogroup", { name: "Preview scene" });
        await scene.getByRole("radio", { name: "Form" }).click();
        assert.equal(await scene.getByRole("radio", { name: "Form" }).getAttribute("aria-checked"), "true");
        assert(await fits(scene), "the scene control overflows");
        axe += await axeOn(page, '[role="radiogroup"][aria-label="Preview scene"]', `create scene ${tag}`);
        const ov = await overflow(page);
        assert(ov <= 0, `page overflows by ${ov}px`);
        await page.close();
        return { sidebarInSheet: inSheet, axe };
      });

    /* ── charts legend ── */
    if (only("charts"))
      await check("charts", tag, row, async () => {
        const page = await open(context, "/charts", view);
        const group = page.getByRole("group", { name: "Toggle series" });
        await group.scrollIntoViewIfNeeded();
        const toggles = group.getByRole("button");
        assert.equal(await toggles.count(), 2);
        assert.equal(await toggles.nth(0).getAttribute("aria-pressed"), "true");
        await toggles.nth(0).click();
        assert.equal(await toggles.nth(0).getAttribute("aria-pressed"), "false");
        assert.match(await toggles.nth(0).evaluate((el) => getComputedStyle(el).textDecorationLine), /line-through/);
        await tabTo(page, toggles.nth(0), toggles.nth(1), 1);
        assert(await focusRing(toggles.nth(1)), "no visible focus indicator on a series toggle");
        await press(page, "Space");
        assert.equal(await toggles.nth(1).getAttribute("aria-pressed"), "false");
        await press(page, "Enter");
        assert.equal(await toggles.nth(1).getAttribute("aria-pressed"), "true");
        await toggles.nth(0).click();
        assert(await fits(group), "the legend overflows");
        const axe = await axeOn(page, '[role="group"][aria-label="Toggle series"]', `charts ${tag}`);
        const ov = await overflow(page);
        assert(ov <= 0, `page overflows by ${ov}px`);
        await page.close();
        return { axe };
      });

    /* ── colors ── */
    if (only("colors"))
      await check("colors", tag, row, async () => {
        const page = await open(context, "/docs/colors", view);
        const format = page.getByRole("radiogroup", { name: "Value format" });
        assert.equal(await format.getAttribute("dir"), dir);
        const hex = format.getByRole("radio", { name: "hex" });
        await hex.click();
        await press(page, forward(dir));
        const hsl = format.getByRole("radio", { name: "hsl" });
        assert(await isFocused(hsl), "arrow did not move to hsl");
        await press(page, "Space");
        assert.equal(await hsl.getAttribute("aria-checked"), "true");
        const firstRamp = page.locator("section#azure");
        await firstRamp.scrollIntoViewIfNeeded();
        const copyRamp = firstRamp.getByRole("button", { name: "Copy ramp as CSS" });
        assert.equal(await copyRamp.getAttribute("type"), "button");
        assert(await fits(copyRamp), "Copy ramp overflows");
        const swatch = firstRamp.locator("button").nth(1);
        assert.match(await swatch.textContent(), /^Copy azure /);
        assert.match(await swatch.textContent(), /hsl\(/);
        // hover first, with nothing focused (focus replaces the elevation with the ring)
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement?.blur());
        const rest = await swatch.evaluate((el) => getComputedStyle(el).boxShadow);
        await swatch.hover();
        await page.waitForTimeout(250);
        const hovered = await swatch.evaluate((el) => getComputedStyle(el).boxShadow);
        assert.notEqual(rest, hovered, "hovering a swatch card does not lift it");
        await page.mouse.move(0, 0);
        await tabTo(page, copyRamp, swatch, 1);
        assert(await focusRing(swatch), "no visible focus indicator on a swatch card");
        await hex.click();
        const axe = await axeOn(page, '[role="radiogroup"][aria-label="Value format"], section#azure', `colors ${tag}`);
        const ov = await overflow(page);
        assert(ov <= 0, `page overflows by ${ov}px`);
        await page.close();
        return { hoverChangesShadow: rest !== hovered, axe };
      });

    /* ── building operations ── */
    if (only("building-ops"))
      await check("buildingOps", tag, row, async () => {
        const page = await open(context, "/demos/building-operations", view);
        const zone = page.locator("[data-zone-row] th button").first();
        await zone.scrollIntoViewIfNeeded();
        assert.equal(await zone.getAttribute("aria-pressed"), "false");
        await zone.click();
        assert.equal(await zone.getAttribute("aria-pressed"), "true");
        const clear = page.getByRole("button", { name: /clear zone filter/i });
        await clear.scrollIntoViewIfNeeded();
        assert.equal(await clear.getAttribute("type"), "button");
        await clear.click();
        assert.equal(await zone.getAttribute("aria-pressed"), "false");
        await zone.focus();
        await press(page, "Space");
        assert.equal(await zone.getAttribute("aria-pressed"), "true");
        await press(page, "Space");
        assert.equal(await zone.getAttribute("aria-pressed"), "false");
        const rows = page.locator("[data-camera-row]");
        const other = page.locator('[data-camera-row][aria-pressed="false"]').first();
        await other.scrollIntoViewIfNeeded();
        const id = await other.getAttribute("data-camera-row");
        await other.click();
        const chosen = page.locator(`[data-camera-row="${id}"]`);
        assert.equal(await chosen.getAttribute("aria-pressed"), "true");
        assert.equal(await page.locator('[data-camera-row][aria-pressed="true"]').count(), 1);
        const edge = await chosen.evaluate((el) => getComputedStyle(el).borderTopColor);
        const plain = await page.locator('[data-camera-row][aria-pressed="false"]').first().evaluate((el) => getComputedStyle(el).borderTopColor);
        assert.notEqual(edge, plain, "the selected camera card has no distinct edge");
        // Keyboard modality: Tab from the card before the chosen one (or after it, if it is first) lands on a card.
        const ids = await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-camera-row")));
        const at = ids.indexOf(id);
        const [from, to] = at > 0 ? [rows.nth(at - 1), chosen] : [chosen, rows.nth(at + 1)];
        await tabTo(page, from, to, 1);
        assert(await focusRing(to), "no visible focus indicator on a camera card");
        assert(await fits(rows.first()), "a camera card overflows");
        const axe = await axeOn(page, '[aria-labelledby="bo-camera-list-title"]', `building ops ${tag}`);
        const ov = await overflow(page);
        assert(ov <= 0, `page overflows by ${ov}px`);
        const cameras = await rows.count();
        await page.close();
        return { cameras, axe };
      });

    /* ── IoT checkboxes ── */
    if (only("iot"))
      await check("iotCheckboxes", tag, row, async () => {
        let page = await open(context, "/iot", view);
        const silent = page.getByRole("checkbox", { name: /^Make the device stop answering/ });
        await silent.scrollIntoViewIfNeeded();
        assert.equal(await silent.getAttribute("aria-checked"), "false");
        // a press on the label (here its description line) toggles the box, as a native label does
        await page.locator("label").filter({ has: silent }).getByText(/^Takes effect/).click();
        assert.equal(await silent.getAttribute("aria-checked"), "true", "the label did not toggle the checkbox");
        await silent.focus();
        await press(page, "Space");
        assert.equal(await silent.getAttribute("aria-checked"), "false");
        let axe = await axeOn(page, "[data-command-status-region] ~ label", `iot hero checkbox ${tag}`);
        await page.close();

        page = await open(context, "/iot#monitoring-playground", view);
        // the hash opens the "Imperfect data" disclosure; its category tab still has to be chosen
        await page.getByRole("tab", { name: "Monitoring", exact: true }).click();
        const battery = page.getByRole("checkbox", { name: "Device reports no battery" });
        await battery.scrollIntoViewIfNeeded();
        await battery.click();
        assert.equal(await battery.getAttribute("aria-checked"), "true");
        assert(await page.locator("#iot-demo-battery").isDisabled(), "the battery range did not disable");
        const signal = page.getByRole("checkbox", { name: "Device reports no signal" });
        await tabTo(page, page.locator("#iot-demo-signal"), signal, 1);
        assert(await focusRing(signal), "no visible focus indicator on a checkbox");
        await press(page, "Space");
        assert.equal(await signal.getAttribute("aria-checked"), "true");
        axe += await axeOn(page, '[role="checkbox"]', `iot showcase checkboxes ${tag}`);
        await page.close();
        return { axe };
      });

    /* ── registry demos ── */
    if (only("registry"))
      await check("registry", tag, row, async () => {
        const seen = [];
        for (const [slug, name] of [["navigation-bar", "Search"], ["app-bar", "Notifications"]]) {
          const page = await open(context, `/docs/components/${slug}`, view);
          const button = page.getByRole("button", { name, exact: true }).first();
          await button.scrollIntoViewIfNeeded();
          assert.equal(await button.getAttribute("type"), "button");
          const box = await button.boundingBox();
          assert(box.width >= 36 && box.height >= 36, `${name} is ${box.width}x${box.height}`);
          seen.push({ slug, size: Math.round(box.width) });
          await page.close();
        }
        return seen;
      });

    rows.push(row);
    await context.close();

    /* ── hero pause: reduced motion hides the control by design, so it is checked with motion allowed ── */
    if (only("hero")) {
      const motion = await newView(view, "no-preference");
      await check("heroPause", tag, row, async () => {
        const page = await open(motion, "/", view);
        const pause = page.locator("[data-hero-command-pause]");
        assert.equal(await pause.getAttribute("aria-label"), "Pause typing animation");
        assert.equal(await pause.getAttribute("type"), "button");
        assert.equal(await pause.getAttribute("aria-pressed"), "false");
        await pause.click();
        assert.equal(await pause.getAttribute("aria-pressed"), "true");
        await page.mouse.move(0, 0);
        await press(page, "Shift+Tab");
        await press(page, "Tab");
        assert(await isFocused(pause), "Tab did not return to the pause control");
        assert(await focusRing(pause), "no visible focus indicator on the pause control");
        await press(page, "Space");
        assert.equal(await pause.getAttribute("aria-pressed"), "false");
        const axe = await axeOn(page, "[data-hero-command-pause]", `hero pause ${tag}`);
        await page.close();
        return { axe };
      });
      await motion.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(out, JSON.stringify({ base, rows, failures }, null, 2) + "\n");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Wave 2c browser checks passed: ${rows.length} views (LTR/RTL, light/dark, 100/200% text, 390/1280px).`);
