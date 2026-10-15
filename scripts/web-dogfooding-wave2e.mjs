/**
 * Wave 2e browser evidence: the IoT device showcase's Last sync and temperature on the library Slider.
 * Run against a production build: `KX_AUDIT_BASE=http://127.0.0.1:3000 KX_MAIN_BASE=http://127.0.0.1:3001
 * node scripts/web-dogfooding-wave2e.mjs`.
 *
 * Page: /iot#monitoring-playground, Monitoring tab, "Imperfect data". Real input on each slider: Tab in (visible
 * ring), the forward arrow key for the reading direction (ArrowRight in LTR, ArrowLeft in RTL, the library's
 * contract), Home/End, PageUp/PageDown; a pointer press on the track and a drag; a press inside the 36px target
 * but off the 16px thumb. The native battery and signal ranges (a documented exception) keep their disabled state.
 * axe on the showcase; with KX_MAIN_BASE, overflow inside the showcase and on the page is compared with main.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = process.env.KX_AUDIT_BASE || "http://127.0.0.1:3000";
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/wave2e-browser.json";
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

async function openShowcase(context, origin, view) {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  if (view.textScale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * view.textScale, fixed: 13 * view.textScale } });
  }
  await page.goto(`${origin}/iot?kx_traffic=diagnostic#monitoring-playground`, { waitUntil: "load" });
  // As the 2c/2d harness does: the init script set them before hydration; set them again once the page is up.
  await page.evaluate(({ dir, theme }) => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, view);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.getByRole("tab", { name: "Monitoring", exact: true }).click();
  await page.locator("#iot-demo-status").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  return page;
}
/** Controls in the showcase that leave its box or scroll sideways, keyed so builds compare; and the page's overflow. */
const survey = (page) =>
  page.evaluate(() => {
    const root = document.getElementById("iot-demo-status").closest(".grid.gap-6");
    const box = root.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const lo = Math.max(0, box.left), hi = Math.min(vw, box.right);
    const bad = [...root.querySelectorAll('input, select, label, [role="slider"], button, [data-orientation]')]
      .filter((e) => e.offsetParent !== null)
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([e, r]) => r.width > 0 && (r.left < lo - 1 || r.right > hi + 1 || e.scrollWidth > e.clientWidth + 1))
      // Keyed by what the control is, not how it is built: this wave swaps <input type=range> for the Slider's spans
      // and gives the labels ids, so a key from tag or id would never match main's.
      .map(([e]) => {
        const control = e.closest('[id^="iot-demo-"]:not(label)');
        if (e.tagName !== "LABEL" && control) return `control|${control.id}`;
        return `${e.tagName === "LABEL" ? "label" : e.tagName}|${(e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}`;
      });
    return { bad: [...new Set(bad)], pageOverflow: document.documentElement.scrollWidth - vw };
  });

let MATRIX = [];
for (const width of [390, 1280]) for (const dir of ["ltr", "rtl"]) for (const theme of ["light", "dark"]) for (const textScale of [1, 2]) MATRIX.push({ width, dir, theme, textScale });
if (process.env.KX_ONLY) MATRIX = MATRIX.filter((v) => `${v.width}:${v.dir}:${v.theme}:${v.textScale}` === process.env.KX_ONLY);

try {
  for (const view of MATRIX) {
    const { width, dir, theme, textScale } = view;
    const tag = `${width}px ${dir} ${theme} ${textScale * 100}%`;
    const context = await newView(view);
    const row = { ...view };
    await check("sliders", tag, row, async () => {
      const page = await openShowcase(context, base, view);
      const applied = await page.evaluate(() => [document.documentElement.getAttribute("dir"), document.documentElement.classList.contains("dark")]);
      assert.deepEqual(applied, [dir, theme === "dark"], `the view did not hold: ${JSON.stringify(applied)}`);
      const fwd = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const last = page.getByRole("slider", { name: /^Last sync — / });
      const temp = page.getByRole("slider", { name: /^Temperature — / });
      const name = (l) => l.evaluate((el) => document.getElementById(el.getAttribute("aria-labelledby")).textContent.trim());
      const now = async (l) => Number(await l.getAttribute("aria-valuenow"));
      // names, bounds, direction
      assert.equal(await name(last), "Last sync — 5m");
      assert.deepEqual([await last.getAttribute("aria-valuemin"), await last.getAttribute("aria-valuemax")], ["0", "5"]);
      assert.deepEqual([await temp.getAttribute("aria-valuemin"), await temp.getAttribute("aria-valuemax"), await temp.getAttribute("aria-valuenow")], ["-10", "45", "23.4"]);
      assert.equal(await page.locator("#iot-demo-temperature").getAttribute("dir"), dir, "the slider does not follow the page direction");
      // keyboard: Tab in from the signal checkbox, with a visible ring
      await tabTo(page, page.getByRole("checkbox", { name: "Device reports no signal" }), last, 2);
      assert(await focusRing(last), "no visible focus indicator on the Last sync thumb");
      await press(page, fwd);
      assert.equal(await now(last), 2, `${fwd} did not move Last sync forward`);
      assert.equal(await name(last), "Last sync — 90m");
      await press(page, "End");
      assert.equal(await name(last), "Last sync — never");
      await press(page, "Home");
      assert.equal(await name(last), "Last sync — now");
      await temp.focus();
      await press(page, fwd);
      assert.equal(await now(temp), 23.5);
      await press(page, "PageUp");
      assert(await now(temp) > 23.5, "PageUp did not move temperature");
      await press(page, "End");
      assert.equal(await name(temp), "Temperature — 45.0 °C");
      // pointer: a press near the end of the track, then a drag back toward the start
      const track = await page.locator("#iot-demo-temperature").boundingBox();
      assert(track.height >= 36, `the slider target is ${track.height}px tall`);
      const at = (f) => (dir === "rtl" ? track.x + track.width * (1 - f) : track.x + track.width * f);
      const midY = track.y + track.height / 2;
      await page.mouse.click(at(0.1), midY);
      const low = await now(temp);
      assert(low < 0, `a press near the start set ${low}`);
      await page.mouse.move(at(0.1), midY);
      await page.mouse.down();
      await page.mouse.move(at(0.5), midY, { steps: 6 });
      await page.mouse.up();
      const mid = await now(temp);
      assert(mid > 10 && mid < 25, `a drag to the middle set ${mid}`);
      // inside the 36px target but well off the 16px thumb's row
      await page.mouse.click(at(0.9), track.y + 3);
      assert(await now(temp) > 35, "a press at the top edge of the target did nothing");
      // the native ranges keep their disabled state
      await page.getByRole("checkbox", { name: "Device reports no battery" }).click();
      assert(await page.locator("#iot-demo-battery").isDisabled(), "battery range not disabled");
      const axe = await axeOn(page, '[aria-labelledby="iot-demo-temperature-label"], [aria-labelledby="iot-demo-last-seen-label"], #iot-demo-battery, #iot-demo-signal', `sliders ${tag}`);
      await page.close();
      return { axe, targetHeight: Math.round(track.height) };
    });

    if (process.env.KX_MAIN_BASE)
      await check("overflow", tag, row, async () => {
        const ours = await openShowcase(context, base, view);
        const a = await survey(ours);
        await ours.close();
        const theirs = await openShowcase(context, process.env.KX_MAIN_BASE, view);
        const b = await survey(theirs);
        await theirs.close();
        const added = a.bad.filter((k) => !b.bad.includes(k));
        assert.deepEqual(added, [], `new overflow vs main: ${JSON.stringify(added)}`);
        assert(a.pageOverflow - b.pageOverflow <= 2, `page overflow ${a.pageOverflow}px vs ${b.pageOverflow}px on main`);
        return { pageOverflow: a.pageOverflow, mainPageOverflow: b.pageOverflow, baseline: b.bad.length };
      });

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
console.log(`Wave 2e browser checks passed: ${rows.length} views (LTR/RTL, light/dark, 100/200% text, 390/1280px).`);
