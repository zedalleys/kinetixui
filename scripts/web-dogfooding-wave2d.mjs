/**
 * Wave 2d browser evidence: the copyable IoT examples on KinetixUI controls.
 * Run against a production build: `KX_AUDIT_BASE=http://127.0.0.1:3000 node scripts/web-dogfooding-wave2d.mjs`.
 *
 *   pairing-flow            (/iot#setup)             NativeSelect, RadioGroup, Input, Button (submit and not)
 *   alert-center            (/iot#alerts)            Checkbox + Label, Button
 *   alert-inbox             (/iot#layout-inbox)      Checkbox + Label, Button
 *   automation-builder      (/iot#automation)        Button
 *   state-honesty           (/iot#control)           Button
 *   device-dashboard        (/iot#layout-dashboard)  Toggle (Details), Button (simulate a state)
 *   operations-environment  (/iot#operations)        Ghost Button rows with aria-current
 *   command-card            (/iot#smart-space)       Button Primary / Outline
 *
 * Direction and theme are applied before hydration (see newView) and asserted on every page. Each example is
 * scrolled into view and waited for until it has mounted. Real keyboard and pointer input; axe on each example.
 *
 * Overflow is judged against main, not against zero: at 390px/200% some controls already overflow on main (the IoT
 * package's AlertList buttons, the "Show acknowledged" labels, the device cards that widen /iot by 168px). With
 * `KX_MAIN_BASE` set to a main build, every view measures each example on both builds — controls that leave the
 * example's box or scroll sideways, and the page's own overflow — and fails on anything main does not have.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = process.env.KX_AUDIT_BASE || "http://127.0.0.1:3000";
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/wave2d-browser.json";
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

/** Scroll a lazily mounted IoT example into view and wait until it has mounted and settled. */
async function mountExample(page, slug) {
  const host = page.locator(`[data-lazy-preview="${slug}"]`);
  await host.scrollIntoViewIfNeeded();
  await page.waitForSelector(`[data-lazy-preview="${slug}"][data-mounted]`);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  return host;
}
/** Arrow keys on a Radix radio choose only while the key is down, as a real key is held: give focus time to move. */
async function holdArrow(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(80);
  await page.keyboard.up(key);
  await page.waitForTimeout(40);
}
const allButtonsTyped = (host) => host.locator("button").evaluateAll((els) => els.filter((b) => !b.getAttribute("type")).map((b) => b.textContent?.trim().slice(0, 40)));

const SURVEY = [
  ["setup", "pairing-flow"],
  ["alerts", "alert-center"],
  ["layout-inbox", "alert-inbox"],
  ["automation", "automation-builder"],
  ["control", "state-honesty"],
  ["layout-dashboard", "device-dashboard"],
  ["operations", "operations-environment"],
  ["smart-space", "smart-space-environment"],
];
/** For one build: per example, the controls that leave its box or scroll sideways, keyed so builds compare. */
async function overflowSurvey(context, origin, view) {
  const result = {};
  for (const [hash, slug] of SURVEY) {
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    if (view.textScale !== 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Page.enable");
      await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * view.textScale, fixed: 13 * view.textScale } });
    }
    await page.goto(`${origin}/iot?kx_traffic=diagnostic#${hash}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    if (slug === "state-honesty") await page.getByText("See a reliable, a flaky and an unreachable device side by side").click();
    const host = await mountExample(page, slug);
    if (slug === "pairing-flow") {
      await host.getByRole("button", { name: "Start setup" }).click();
      await host.getByRole("button", { name: "Finish this step" }).click();
      await page.waitForTimeout(300);
    }
    result[slug] = await page.evaluate((slug) => {
      const root = document.querySelector(`[data-lazy-preview="${slug}"]`);
      const box = root.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const lo = Math.max(0, box.left), hi = Math.min(vw, box.right);
      const bad = [...root.querySelectorAll('button, input, select, label, [role="radio"], [role="checkbox"], [role="radiogroup"], ul')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => [e, e.getBoundingClientRect()])
        .filter(([e, r]) => r.width > 0 && (r.left < lo - 1 || r.right > hi + 1 || e.scrollWidth > e.clientWidth + 1))
        .map(([e, r]) => {
          const name = (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
          return { key: `${e.tagName}|${e.getAttribute("role") ?? ""}|${name}`, text: `${e.tagName} "${name}" ${Math.round(r.left)}..${Math.round(r.right)}` };
        });
      return { pageOverflow: document.documentElement.scrollWidth - vw, bad };
    }, slug);
    await page.close();
  }
  return result;
}

let MATRIX = [];
for (const width of [390, 1280]) for (const dir of ["ltr", "rtl"]) for (const theme of ["light", "dark"]) for (const textScale of [1, 2]) MATRIX.push({ width, dir, theme, textScale });
if (process.env.KX_ONLY) MATRIX = MATRIX.filter((v) => `${v.width}:${v.dir}:${v.theme}:${v.textScale}` === process.env.KX_ONLY);
const only = (s) => !process.env.KX_SURFACE || process.env.KX_SURFACE === s;

try {
  for (const view of MATRIX) {
    const { width, dir, theme, textScale } = view;
    const tag = `${width}px ${dir} ${theme} ${textScale * 100}%`;
    const context = await newView(view);
    const row = { ...view };

    /* ── pairing flow: the whole journey by keyboard and pointer, with reduced motion (each wait is a button) ── */
    if (only("pairing"))
      await check("pairing", tag, row, async () => {
        const page = await open(context, "/iot#setup", view);
        const host = await mountExample(page, "pairing-flow");
        const flow = host.locator('section[aria-label="Pairing flow"]');
        const heading = () => flow.locator("h4").first().textContent();
        const scenario = flow.getByRole("combobox", { name: "Simulate a failure" });
        assert.equal(await scenario.getAttribute("data-slot"), "native-select");
        const start = flow.getByRole("button", { name: "Start setup" });
        assert.equal(await start.getAttribute("type"), "button");
        await start.click();
        assert.match(await heading(), /Step 2 of 9/);
        assert(await flow.locator("h4").first().evaluate((el) => el === document.activeElement), "focus did not move to the step heading");
        await flow.getByRole("button", { name: "Finish this step" }).click();
        const group = flow.getByRole("radiogroup", { name: /sample devices? found/ });
        await group.waitFor();
        assert.equal(await group.getAttribute("dir"), dir, "the device radiogroup does not follow the page direction");
        const radios = group.getByRole("radio");
        assert.equal(await radios.nth(0).getAttribute("aria-checked"), "true");
        await radios.nth(0).focus();
        await holdArrow(page, "ArrowDown");
        assert(await radios.nth(1).evaluate((el) => el === document.activeElement), "ArrowDown did not move to the next device");
        assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true", "ArrowDown did not choose the next device");
        assert(await focusRing(radios.nth(1)), "no visible focus indicator on a device radio");
        await holdArrow(page, "ArrowUp");
        assert.equal(await radios.nth(0).getAttribute("aria-checked"), "true");
        let axe = await axeOn(page, '[data-lazy-preview="pairing-flow"] section[aria-label="Pairing flow"]', `pairing devices ${tag}`);
        await flow.getByRole("button", { name: /^Continue with/ }).click();
        await flow.getByRole("button", { name: "Finish this step" }).click();
        await flow.getByRole("button", { name: "Yes, that is my device" }).click();
        assert.match(await heading(), /Step 5 of 9/);
        const code = flow.getByLabel("Setup code");
        assert.equal(await code.getAttribute("data-slot"), "input");
        const verify = flow.getByRole("button", { name: "Verify code" });
        assert.equal(await verify.getAttribute("type"), "submit");
        assert(await verify.isDisabled(), "Verify code is enabled with no code");
        const demo = (await flow.locator("#pairing-code-hint .font-mono").textContent()).trim();
        await code.fill(demo);
        await code.press("Enter");
        await code.waitFor({ state: "detached" });
        // Enter submitted once: the verification wait is showing, and it finishes onto the next step, not two.
        await flow.getByRole("button", { name: "Finish this step" }).click();
        assert.match(await heading(), /Step 6 of 9: Configure/);
        axe += await axeOn(page, '[data-lazy-preview="pairing-flow"] section[aria-label="Pairing flow"]', `pairing configure ${tag}`);
        // Cancel by keyboard, with a visible ring, then start again.
        const back = flow.locator("xpath=..").getByRole("button", { name: "Back" });
        const cancel = page.locator('[data-lazy-preview="pairing-flow"]').getByRole("button", { name: "Cancel setup" });
        assert.equal(await cancel.getAttribute("type"), "button");
        await tabTo(page, back, cancel, 2);
        assert(await focusRing(cancel), "no visible focus indicator on Cancel setup");
        await press(page, "Enter");
        assert.equal(await heading(), "Setup cancelled");
        await flow.getByRole("button", { name: "Start again" }).click();
        assert.match(await heading(), /Step 1 of 9/);
        assert(await scenario.isEnabled(), "the failure selector stayed locked after starting again");
        const untyped = await allButtonsTyped(host);
        assert.deepEqual(untyped, [], `buttons without a type: ${untyped}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── alert centre ── */
    if (only("alert-center"))
      await check("alertCenter", tag, row, async () => {
        const page = await open(context, "/iot#alerts", view);
        const host = await mountExample(page, "alert-center");
        const box = host.getByRole("checkbox", { name: "Show acknowledged" });
        const start = await box.getAttribute("aria-checked");
        await host.getByText("Show acknowledged", { exact: true }).click();
        assert.notEqual(await box.getAttribute("aria-checked"), start, "the label did not toggle the checkbox");
        await box.focus();
        await press(page, "Space");
        assert.equal(await box.getAttribute("aria-checked"), start);
        const silence = host.getByRole("button", { name: /S-101 stop answering/ });
        assert.equal(await silence.getAttribute("type"), "button");
        await tabTo(page, box, silence, 1);
        assert(await focusRing(silence), "no visible focus indicator on the S-101 button");
        await press(page, "Enter");
        const again = host.getByRole("button", { name: /S-101 answers again/ });
        await again.waitFor();
        const axe = await axeOn(page, '[data-lazy-preview="alert-center"]', `alert centre ${tag}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── alert inbox ── */
    if (only("alert-inbox"))
      await check("alertInbox", tag, row, async () => {
        const page = await open(context, "/iot#layout-inbox", view);
        const host = await mountExample(page, "alert-inbox");
        const box = host.getByRole("checkbox", { name: "Show acknowledged" });
        const count = () => host.locator("header p").first().textContent();
        const before = await count();
        const ack = host.getByRole("button", { name: /Acknowledge/ }).first();
        assert.equal(await ack.getAttribute("type"), "button");
        await ack.click();
        assert.notEqual(await count(), before, "acknowledging did not change the inbox");
        await box.focus();
        assert(await focusRing(box), "no visible focus indicator on the checkbox");
        await press(page, "Space");
        assert.equal(await box.getAttribute("aria-checked"), "true");
        const axe = await axeOn(page, '[data-lazy-preview="alert-inbox"]', `alert inbox ${tag}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── automation builder ── */
    if (only("automation"))
      await check("automation", tag, row, async () => {
        const page = await open(context, "/iot#automation", view);
        const host = await mountExample(page, "automation-builder");
        const blank = host.getByRole("button", { name: "Start from a blank rule" });
        const reset = host.getByRole("button", { name: "Reset to the Zone 3 rule" });
        for (const b of [blank, reset]) assert.equal(await b.getAttribute("type"), "button");
        await blank.click();
        await tabTo(page, blank, reset, 1);
        assert(await focusRing(reset), "no visible focus indicator on Reset");
        await press(page, "Space");
        const axe = await axeOn(page, '[data-lazy-preview="automation-builder"]', `automation ${tag}`);
        const untyped = await allButtonsTyped(host);
        assert.deepEqual(untyped, [], `buttons without a type: ${untyped}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── state honesty ── */
    if (only("state-honesty"))
      await check("stateHonesty", tag, row, async () => {
        const page = await open(context, "/iot#control", view);
        // It sits in a closed "more examples" disclosure under the control category.
        await page.getByText("See a reliable, a flaky and an unreachable device side by side").click();
        const host = await mountExample(page, "state-honesty");
        const lose = host.getByRole("button", { name: "Request a change, then lose the pump" });
        const back = host.getByRole("button", { name: "Pump answers again" });
        assert(await back.isDisabled());
        await lose.click();
        assert(await lose.isDisabled(), "the request button stayed enabled");
        assert(await back.isEnabled());
        await back.focus();
        await press(page, "Enter");
        const axe = await axeOn(page, '[data-lazy-preview="state-honesty"]', `state honesty ${tag}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── device dashboard ── */
    if (only("dashboard"))
      await check("dashboard", tag, row, async () => {
        const page = await open(context, "/iot#layout-dashboard", view);
        const host = await mountExample(page, "device-dashboard");
        const details = host.getByRole("button", { name: /^Show details for/ });
        const second = details.nth(1);
        assert.equal(await second.getAttribute("aria-pressed"), "false");
        await second.click();
        assert.equal(await second.getAttribute("aria-pressed"), "true");
        await second.focus();
        assert(await focusRing(second), "no visible focus indicator on Details");
        await press(page, "Space");
        assert.equal(await second.getAttribute("aria-pressed"), "true", "a second press un-chose the device");
        const offline = host.getByRole("button", { name: "Offline", exact: true });
        assert.equal(await offline.getAttribute("type"), "button");
        await offline.click();
        const axe = await axeOn(page, '[data-lazy-preview="device-dashboard"]', `dashboard ${tag}`);
        // Recorded, not asserted: on main the dashboard already scrolls /iot sideways at 390px/200% (Wave 2b note).
        const exampleOverflow = await host.evaluate((el) => el.scrollWidth - el.clientWidth);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, exampleOverflow, pageOverflow };
      });

    /* ── operations environment ── */
    if (only("operations"))
      await check("operations", tag, row, async () => {
        const page = await open(context, "/iot#operations", view);
        const host = await mountExample(page, "operations-environment");
        const list = host.getByRole("list", { name: /^Equipment on/ });
        if (!(await list.isVisible())) await host.getByText("Equipment", { exact: true }).first().click();
        const rows = list.getByRole("button");
        const n = await rows.count();
        assert(n > 1, `only ${n} equipment rows`);
        const target = list.locator("button:not([aria-current])").first();
        const name = await target.textContent();
        await target.click();
        const current = list.locator('button[aria-current="true"]');
        assert.equal(await current.count(), 1);
        assert.equal(await current.textContent(), name);
        assert.equal(await current.getAttribute("type"), "button");
        // The row reads from the start edge in either direction.
        const align = await current.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const c = el.firstElementChild.getBoundingClientRect();
          return { gapStart: getComputedStyle(document.documentElement).direction === "rtl" ? r.right - c.right : c.left - r.left };
        });
        assert(align.gapStart < 24, `the row content is not at the start edge ${JSON.stringify(align)}`);
        await current.focus();
        assert(await focusRing(current), "no visible focus indicator on an equipment row");
        const axe = await axeOn(page, '[data-lazy-preview="operations-environment"] ul[aria-label^="Equipment on"]', `operations ${tag}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { rows: n, axe, pageOverflow };
      });

    /* ── command card (shared by the environments) ── */
    if (only("command-card"))
      await check("commandCard", tag, row, async () => {
        const page = await open(context, "/iot#smart-space", view);
        const host = await mountExample(page, "smart-space-environment");
        const unlock = host.getByRole("button", { name: "Unlock Front door lock" });
        assert.equal(await unlock.getAttribute("type"), "button");
        assert.equal(await unlock.getAttribute("data-lock-action"), "unlocked");
        await unlock.focus();
        assert(await focusRing(unlock), "no visible focus indicator on Unlock");
        await press(page, "Enter");
        // The request line can be truncated off-screen on a phone at 200%; it is enough that it is there.
        await host.getByText(/Changing to/).first().waitFor({ state: "attached" });
        assert.equal(await host.locator('[data-device="lock-front"] [data-lock-state]').getAttribute("data-lock-state"), "locked", "the lock moved before the device confirmed");
        const axe = await axeOn(page, '[data-lazy-preview="smart-space-environment"] [data-device="lock-front"]', `command card ${tag}`);
        const pageOverflow = await overflow(page);
        await page.close();
        return { axe, pageOverflow };
      });

    /* ── overflow, against main ── */
    if (only("overflow") && process.env.KX_MAIN_BASE) {
      const ours = await overflowSurvey(context, base, view);
      const theirs = await overflowSurvey(context, process.env.KX_MAIN_BASE, view);
      row.overflow = {};
      for (const [slug, o] of Object.entries(ours)) {
        const m = theirs[slug];
        const known = new Set(m.bad.map((x) => x.key));
        const added = o.bad.filter((x) => !known.has(x.key)).map((x) => x.text);
        const pageDelta = o.pageOverflow - m.pageOverflow;
        row.overflow[slug] = { pageOverflow: o.pageOverflow, mainPageOverflow: m.pageOverflow, baseline: m.bad.length, added };
        if (added.length) failures.push(`overflow ${slug} ${tag}: new vs main ${JSON.stringify(added)}`);
        if (pageDelta > 2) failures.push(`overflow ${slug} ${tag}: page overflow ${o.pageOverflow}px vs ${m.pageOverflow}px on main`);
      }
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
console.log(`Wave 2d browser checks passed: ${rows.length} views × 8 examples (LTR/RTL, light/dark, 100/200% text, 390/1280px).`);
