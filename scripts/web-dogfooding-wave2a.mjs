/**
 * Wave 2a browser evidence: the command menu (library CommandDialog) and the mobile menu (library Sheet).
 * Run against a production build: `KX_AUDIT_BASE=http://127.0.0.1:3000 node scripts/web-dogfooding-wave2a.mjs`.
 *
 * jsdom proves the contract (open, focus in, every way out, focus back); this measures what only a browser can:
 * where the panels land in LTR and RTL, scroll locking, the page behind going inert, reflow at 200% text and
 * phone width, reduced motion, stacked dismissal layers, and axe on the OPEN state, which page sweeps never see.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = process.env.KX_AUDIT_BASE || "http://127.0.0.1:3000";
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/wave2a-browser.json";
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const rows = [];
const failures = [];

async function open(context, path, { dir, theme, textScale }) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  if (textScale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
  }
  await page.goto(`${base}${path}${path.includes("?") ? "&" : "?"}kx_traffic=diagnostic`, { waitUntil: "load" });
  await page.evaluate(
    ({ dir, theme }) => {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    },
    { dir, theme },
  );
  await page.waitForTimeout(300);
  const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  assert(Math.abs(root - 16 * textScale) < 0.5, `${path}: text scale not applied (${root}px)`);
  return page;
}

async function axe(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const r = await window.axe.run(document, { rules: { region: { enabled: false } } });
    return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) }));
  });
  if (result.length) failures.push(`${label}: axe ${JSON.stringify(result)}`);
  return result.length;
}

/**
 * What the page looks like with a modal open. Scroll lock is measured with a real wheel over the backdrop:
 * react-remove-scroll blocks wheel and touch scrolling, not a scripted `scrollBy`. "Hidden" is measured as
 * focusable elements outside the dialog that assistive technology can still reach: Radix's `aria-hidden`
 * walk keeps live regions exposed and so hides around them rather than hiding `<main>` as one block.
 */
async function modalState(page, backdrop) {
  const y0 = await page.evaluate(() => window.scrollY);
  await page.mouse.move(backdrop.x, backdrop.y);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(150);
  const y1 = await page.evaluate(() => window.scrollY);
  const rest = await page.evaluate(() => {
    const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])";
    const exposed = [...document.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.closest("[role=dialog]") && !el.closest("[aria-hidden='true'], [inert]") && el.getClientRects().length > 0,
    );
    return {
      locked: document.body.hasAttribute("data-scroll-locked"),
      exposedOutside: exposed.map((el) => el.outerHTML.slice(0, 80)),
      dialogs: document.querySelectorAll("[role=dialog]").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  return { ...rest, scrolled: y1 !== y0, pageHidden: rest.exposedOutside.length === 0 };
}

const focusedName = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.getAttribute("role") ?? el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim()}` : "";
  });

const insideDialog = (page) => page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")));

try {
  /* ── command menu ───────────────────────────────────────────────────────────────────────── */
  for (const width of [390, 1280])
    for (const dir of ["ltr", "rtl"])
      for (const theme of ["light", "dark"])
        for (const textScale of [1, 2]) {
          const label = `command ${width}px ${dir} ${theme} ${textScale * 100}%`;
          const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
          const page = await open(context, "/docs/installation", { dir, theme, textScale });
          try {
            const trigger = page.getByRole("button", { name: /^Search…/ });
            const name = await trigger.evaluate((el) => el.textContent.replace(/\s+/g, " ").trim());
            const accName = await page.evaluate(() => {
              const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Search…"));
              return b ? b.innerText.replace(/\s+/g, " ").trim() : "";
            });
            await trigger.click();
            const dialog = page.getByRole("dialog", { name: "Search the docs" });
            await dialog.waitFor();
            assert.equal(await dialog.getAttribute("aria-describedby"), null, `${label}: aria-describedby`);
            const input = dialog.getByRole("combobox", { name: "Command menu" });
            await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "combobox");
            const state = await modalState(page, { x: 5, y: 830 });
            assert(state.locked && !state.scrolled, `${label}: scroll not locked ${JSON.stringify(state)}`);
            assert(state.pageHidden, `${label}: page behind the dialog is exposed ${JSON.stringify(state.exposedOutside)}`);
            assert.equal(state.dialogs, 1, `${label}: dialogs`);
            assert(state.overflow <= 0, `${label}: page overflows by ${state.overflow}px`);
            const box = await dialog.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, width: r.width, vw: innerWidth, vh: innerHeight, sw: el.scrollWidth, cw: el.clientWidth };
            });
            assert(box.left >= -1 && box.right <= box.vw + 1, `${label}: dialog outside viewport ${JSON.stringify(box)}`);
            assert(Math.abs(box.top - box.vh * 0.2) < 2, `${label}: dialog not anchored at 20vh ${JSON.stringify(box)}`);
            assert(box.sw <= box.cw + 1, `${label}: dialog scrolls sideways`);
            const axeCount = await axe(page, `${label} open`);

            // Filter, move, run: the input must not move while the list changes height.
            const top0 = await input.evaluate((el) => el.getBoundingClientRect().top);
            await input.fill("instal");
            const top1 = await input.evaluate((el) => el.getBoundingClientRect().top);
            assert(Math.abs(top0 - top1) < 1, `${label}: field moved while filtering (${top0} → ${top1})`);
            await input.fill("");
            await page.keyboard.press("ArrowDown");
            const selected = await dialog.locator("[role=option][aria-selected=true]").innerText();
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "detached" });
            const afterEsc = await focusedName(page);
            assert(afterEsc.includes("Search…"), `${label}: focus after Escape on ${afterEsc}`);

            // The shortcut, then a route: it closes, the page changes, and focus is back on the trigger.
            await page.locator("body").click({ position: { x: 5, y: 300 } });
            await page.keyboard.press("Control+k");
            await dialog.waitFor();
            await input.fill("Accessibility");
            await page.keyboard.press("Enter");
            await page.waitForURL(/\/docs\/accessibility/);
            await dialog.waitFor({ state: "detached" });
            const afterRoute = await focusedName(page);
            assert(afterRoute.includes("Search…"), `${label}: focus after route on ${afterRoute}`);
            rows.push({ surface: "command-menu", width, dir, theme, textScale, triggerText: name, triggerInnerText: accName, dialog: box, modal: state, selectedAfterArrowDown: selected, focusAfterEscape: afterEsc, focusAfterRoute: afterRoute, axeViolations: axeCount });
          } catch (e) {
            failures.push(`${label}: ${e.message}`);
          }
          await context.close();
        }

  /* ── mobile menu ────────────────────────────────────────────────────────────────────────── */
  for (const width of [390, 900])
    for (const dir of ["ltr", "rtl"])
      for (const theme of ["light", "dark"])
        for (const textScale of [1, 2]) {
          const label = `mobile-nav ${width}px ${dir} ${theme} ${textScale * 100}%`;
          // 900px is the docs-only band (md..lg) where the docs sidebar has not taken over yet.
          const path = "/docs/installation";
          const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
          const page = await open(context, path, { dir, theme, textScale });
          try {
            const trigger = page.getByRole("button", { name: "Menu", exact: true });
            await trigger.click();
            const sheet = page.getByRole("dialog", { name: "Menu" });
            await sheet.waitFor();
            await page.waitForTimeout(50);
            assert(await insideDialog(page), `${label}: focus did not enter the sheet`);
            assert.equal(await sheet.getAttribute("aria-describedby"), null, `${label}: aria-describedby`);
            const state = await modalState(page, { x: dir === "ltr" ? width - 5 : 5, y: 600 });
            assert(state.locked && !state.scrolled, `${label}: scroll not locked ${JSON.stringify(state)}`);
            assert(state.pageHidden, `${label}: page behind the sheet is exposed ${JSON.stringify(state.exposedOutside)}`);
            assert(state.overflow <= 0, `${label}: page overflows by ${state.overflow}px`);
            const box = await sheet.evaluate((el) => {
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              return { left: r.left, right: r.right, width: r.width, vw: innerWidth, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, overflowY: s.overflowY, animation: s.animationDuration };
            });
            // The logical side: the inline start is the left edge in LTR and the right edge in RTL.
            if (dir === "ltr") assert(Math.abs(box.left) < 1, `${label}: not at the left edge ${JSON.stringify(box)}`);
            else assert(Math.abs(box.right - box.vw) < 1, `${label}: not at the right edge ${JSON.stringify(box)}`);
            assert(box.width < box.vw, `${label}: panel covers the whole width`);
            assert(box.sw <= box.cw + 1, `${label}: panel scrolls sideways ${JSON.stringify(box)}`);
            assert.equal(box.overflowY, "auto", `${label}: panel cannot scroll`);
            assert(parseFloat(box.animation) <= 0.001, `${label}: reduced motion not honoured (${box.animation})`);
            const axeCount = await axe(page, `${label} open`);

            // Focus trap: Tab more times than there are stops and never leave the sheet.
            const stops = await sheet.locator("a[href], button").count();
            for (let i = 0; i < stops + 2; i++) {
              await page.keyboard.press("Tab");
              assert(await insideDialog(page), `${label}: Tab ${i + 1} left the sheet`);
            }

            await page.keyboard.press("Escape");
            await sheet.waitFor({ state: "detached" });
            assert.equal(await focusedName(page), "button:Menu", `${label}: focus after Escape`);

            await trigger.click();
            await sheet.waitFor();
            await sheet.getByRole("button", { name: "Close menu" }).click();
            await sheet.waitFor({ state: "detached" });
            assert.equal(await focusedName(page), "button:Menu", `${label}: focus after close button`);

            // A press on the scrim, at the inline END, which is outside the panel in either direction.
            await trigger.click();
            await sheet.waitFor();
            await page.mouse.click(dir === "ltr" ? width - 10 : 10, 400);
            await sheet.waitFor({ state: "detached" });

            // Stacked layers: ⌘K over the open sheet must not stack the command menu on it (it did on main, and
            // closing the palette then sent focus to its trigger behind the sheet). Escape closes the sheet.
            await trigger.click();
            await sheet.waitFor();
            await page.waitForTimeout(50);
            await page.keyboard.press("Control+k");
            await page.waitForTimeout(200);
            assert.equal(await page.getByRole("dialog", { name: "Search the docs" }).count(), 0, `${label}: command menu stacked on the sheet`);
            assert(await insideDialog(page), `${label}: focus left the sheet after ⌘K`);
            await page.keyboard.press("Escape");
            await sheet.waitFor({ state: "detached" });

            // A route: the sheet closes, the page changes, focus is back on the trigger.
            await trigger.click();
            await sheet.waitFor();
            await sheet.getByRole("link", { name: "Accessibility" }).first().click();
            await page.waitForURL(/\/docs\/accessibility/);
            await sheet.waitFor({ state: "detached" });
            const afterRoute = await focusedName(page);
            assert.equal(afterRoute, "button:Menu", `${label}: focus after route`);
            rows.push({ surface: "mobile-nav", width, dir, theme, textScale, panel: box, modal: state, tabStops: stops, focusAfterRoute: afterRoute, axeViolations: axeCount });
          } catch (e) {
            failures.push(`${label}: ${e.message}`);
          }
          await context.close();
        }

  /* ── forced colors: the triggers keep a visible focus indicator ─────────────────────────── */
  try {
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, forcedColors: "active", reducedMotion: "reduce" });
    const page = await open(context, "/docs/installation", { dir: "ltr", theme: "light", textScale: 1 });
    const result = {};
    for (const [key, locator] of [
      ["search", page.getByRole("button", { name: /^Search…/ })],
      ["menu", page.getByRole("button", { name: "Menu", exact: true })],
    ]) {
      await page.keyboard.press("Tab");
      await locator.focus();
      result[key] = await locator.evaluate((el) => {
        const s = getComputedStyle(el);
        return { outline: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
      });
      const r = result[key];
      if (r.outline === "none" && r.boxShadow === "none") failures.push(`forced colors: ${key} trigger has no focus indicator`);
    }
    rows.push({ forcedColors: result });
    await context.close();
  }
  } catch (e) {
    failures.push(`forced colors: ${e.message}`);
  }
} finally {
  await browser.close();
}

fs.writeFileSync(out, JSON.stringify({ base, rows, failures }, null, 2) + "\n");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Wave 2a browser checks passed: ${rows.length} views (command menu and mobile menu, LTR/RTL, light/dark, 100/200% text).`);
