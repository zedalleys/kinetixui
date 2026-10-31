/**
 * tabs-indicator.mjs — the React Tabs travelling indicator, measured where real tab strips break it.
 *
 *   node scripts/tabs-indicator.mjs
 *
 * `check:motion` proves the bar travels and that reduced motion removes the travel; `check:entry-visual`
 * proves a selected tab carries a mark. Neither says the bar is on the RIGHT tab once the strip scrolls,
 * a label changes width, tabs come and go, direction or orientation flips, the text doubles, or the strip
 * was hidden when the selection changed. Those are geometry, so this reads geometry: every case compares
 * the bar's rendered box with the chosen tab's, after the interaction has settled, in the `Indicator`
 * story (a ten-tab strip in a 22rem column, with one button per condition) and the plain `Default` story.
 *
 * What it asserts, per case:
 *
 *   aligned       the bar spans the chosen tab's inline extent (±1px) and sits on its block-end edge
 *                 (inline-end edge when vertical), so it covers only the trigger's reserved 2px border,
 *                 never its padding box, where the inset focus ring is drawn
 *   hidden        with no valid chosen tab the bar is not rendered, rather than left on a stale one
 *   still         a change that is not a change of tab (resize, text size, label, direction, reveal)
 *                 starts no transition: the bar snaps
 *   contained     the page never scrolls horizontally, and keyboard travel through an overflowing strip
 *                 scrolls the strip, not the page
 *   fallback      before the bar has measured, and under forced colours, the chosen trigger draws its
 *                 own edge in exactly the box the bar would occupy, so hydration does not move it
 *   semantics     the bar is aria-hidden and exactly one tab is aria-selected
 *   released      the list's observers let go of a tab once it is removed, and of everything once the strip
 *                 unmounts: no detached tab is still watched, and no observer of the list stays connected
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */

// This gate is what earns Tabs its Chromium `interaction` evidence. It navigates to the Tabs stories and
// drives the real control with clicks and arrow-key presses, measuring the indicator's geometry against
// the selected tab through scrolling, dynamic tabs, a resize, a growing label, the chosen tab disabled or
// removed, flipped direction and orientation, 200% text and reduced motion.
//
// Subjects are declared, not inferred: this file imports no component. See switch-motion.mjs.
//
// kx-verify: interaction
// kx-verify-only: tabs

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { serveStatic } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
assertUiDistMatchesSource("tabs-indicator");
const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
for (const id of ["navigation-tabs--indicator", "navigation-tabs--default"]) {
  if (!index.entries[id]) {
    console.error(`tabs-indicator: story ${id} is missing from the built Storybook.`);
    process.exit(2);
  }
}

const storybook = await serveStatic(staticDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

const failures = [];
const report = [];
const check = (ok, label, detail) => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(58)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};

async function open({ story = "indicator", viewport = { width: 480, height: 720 }, fontPx, ...ctxOpts } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...ctxOpts });
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVERS);
  await page.route((url) => !url.href.startsWith(storybook.base) && !url.href.startsWith("data:"), (route) => route.abort());
  if (fontPx) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: fontPx, fixed: fontPx } });
  }
  await page.goto(`${storybook.base}/iframe.html?id=navigation-tabs--${story}&viewMode=story`, { waitUntil: "load" });
  await page.waitForSelector("[role=tablist] [data-kx-tabs-bar]", { state: "attached" });
  await settle(page);
  return { page, ctx };
}

/**
 * Every Resize/MutationObserver the page creates, with what it watches now. Observers are the indicator's only
 * long-lived state, so a tab they keep watching after it is removed, or an observer still connected after the
 * strip unmounts, is a leak no geometry check can see. `window.__kxObservers()` reports the ones that ever
 * watched a tab list, a tab, or the Tabs root that sets the list's direction.
 */
const OBSERVERS = `(() => {
  const all = [];
  for (const name of ["ResizeObserver", "MutationObserver"]) {
    const Native = window[name];
    if (!Native) continue;
    window[name] = class extends Native {
      constructor(cb) {
        super(cb);
        this.__kx = { name, targets: new Set(), tabs: false };
        all.push(this);
      }
      observe(target, opts) {
        this.__kx.targets.add(target);
        if (target.matches?.("[data-kx-tabs-list], [role=tab], [dir][data-orientation]")) this.__kx.tabs = true;
        return super.observe(target, opts);
      }
      unobserve(target) {
        this.__kx.targets.delete(target);
        return super.unobserve(target);
      }
      disconnect() {
        this.__kx.targets.clear();
        return super.disconnect();
      }
    };
  }
  window.__kxObservers = () =>
    all.filter((o) => o.__kx.tabs).map((o) => ({
      name: o.__kx.name,
      watching: o.__kx.targets.size,
      detachedTabs: [...o.__kx.targets].filter((t) => !t.isConnected && t.getAttribute?.("role") === "tab").length,
    }));
})();`;

/** Wait until no animation is running on the page, then two more frames. */
const settle = (page) =>
  page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    for (let i = 0; i < 120; i++) {
      await frame();
      if (document.getAnimations().every((a) => a.playState !== "running")) break;
    }
    await frame();
    await frame();
  });

/** Transitions running on the bar a frame after `run`, i.e. whether that change made it travel. */
const transitionsAfter = (page, run) =>
  page.evaluate(async (body) => {
    // eslint-disable-next-line no-new-func
    await new Function(body)();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const bar = document.querySelector("[role=tablist] [data-kx-tabs-bar]");
    return bar.getAnimations().filter((a) => a.playState === "running").length;
  }, run);

/**
 * One key press, then the 30ms a held key repeats at. Radix moves roving focus in a \`setTimeout\`, so presses
 * dispatched faster than a person can make them land on the tab that still has focus and are lost.
 */
const press = async (page, key) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(30);
};

const act = (key) => `document.querySelector('[data-kx-action="${key}"]').click();`;

/** The bar against the chosen tab, in viewport pixels, plus the semantics around it. */
const measure = (page) =>
  page.evaluate(() => {
    const list = document.querySelector("[role=tablist]");
    const bar = list.querySelector("[data-kx-tabs-bar]");
    const tab = list.querySelector(':scope > [role="tab"][data-state="active"]');
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom };
    };
    const cs = tab ? getComputedStyle(tab) : null;
    const vertical = list.getAttribute("aria-orientation") === "vertical";
    // the trigger's padding box: its border box minus the reserved indicator border
    const pad = tab
      ? (() => {
          const b = box(tab);
          const be = parseFloat(cs.borderBottomWidth);
          const ie = parseFloat(cs.borderInlineEndWidth);
          const rtl = cs.direction === "rtl";
          return vertical ? (rtl ? { ...b, l: b.l + ie } : { ...b, r: b.r - ie }) : { ...b, b: b.b - be };
        })()
      : null;
    return {
      vertical,
      dir: getComputedStyle(list).direction,
      shown: getComputedStyle(bar).display !== "none",
      bar: box(bar),
      tab: tab ? box(tab) : null,
      pad,
      label: tab?.textContent ?? null,
      ariaHidden: bar.getAttribute("aria-hidden"),
      selected: list.querySelectorAll('[role="tab"][aria-selected="true"]').length,
      tabBorder: cs ? (vertical ? cs.borderInlineEndColor : cs.borderBottomColor) : null,
      listOverflows: list.scrollWidth > list.clientWidth + 1,
      listScroll: list.scrollLeft,
      pageOverflow: document.scrollingElement.scrollWidth - window.innerWidth,
      pageScroll: [window.scrollX, window.scrollY],
    };
  });

const near = (a, b) => Math.abs(a - b) <= 1;
const fmt = (m) =>
  m.tab
    ? `bar ${m.bar.l.toFixed(1)}–${m.bar.r.toFixed(1)} × ${m.bar.t.toFixed(1)}–${m.bar.b.toFixed(1)}, "${m.label}" ${m.tab.l.toFixed(1)}–${m.tab.r.toFixed(1)} × ${m.tab.t.toFixed(1)}–${m.tab.b.toFixed(1)}`
    : "no chosen tab";

function aligned(m) {
  if (!m.shown || !m.tab) return false;
  if (m.vertical) {
    const edge = m.dir === "rtl" ? near(m.bar.l, m.tab.l) : near(m.bar.r, m.tab.r);
    return near(m.bar.t, m.tab.t) && near(m.bar.b, m.tab.b) && edge && m.bar.r - m.bar.l <= 2.5;
  }
  return near(m.bar.l, m.tab.l) && near(m.bar.r, m.tab.r) && near(m.bar.b, m.tab.b) && m.bar.b - m.bar.t <= 2.5;
}
/** the bar covers no part of the trigger's padding box, where the inset focus ring is drawn */
function clearOfRing(m) {
  if (m.vertical) return m.dir === "rtl" ? m.bar.r <= m.pad.l + 0.5 : m.bar.l >= m.pad.r - 0.5;
  return m.bar.t >= m.pad.b - 0.5;
}
const expectAligned = (m, label) => check(aligned(m) && clearOfRing(m), label, fmt(m));

/* ── LTR, scrolling ──────────────────────────────────────────────────── */
{
  const { page, ctx } = await open();
  let m = await measure(page);
  check(m.listOverflows, "lab strip overflows its column (the case under test exists)", `scrollLeft ${m.listScroll}`);
  expectAligned(m, "initial chosen tab");
  check(m.ariaHidden === "true" && m.selected === 1, "bar is aria-hidden, one tab is selected", `aria-hidden=${m.ariaHidden}, selected ${m.selected}`);

  const moving = await transitionsAfter(page, act("select-last"));
  await settle(page);
  m = await measure(page);
  expectAligned(m, "programmatic choice of an off-screen tab");
  check(moving > 0, "a change of tab travels", `${moving} transition(s) running`);
  check(m.pageOverflow <= 0 && m.pageScroll.join() === "0,0", "page did not scroll or overflow", `overflow ${m.pageOverflow}px, scroll ${m.pageScroll}`);

  // scroll the strip back by hand, then pick a tab with the pointer
  await page.evaluate(() => (document.querySelector("[role=tablist]").scrollLeft = 0));
  await page.locator("[role=tablist] [role=tab]").nth(2).click();
  await settle(page);
  expectAligned(await measure(page), "pointer choice after scrolling the strip");

  // keyboard through the whole strip: focus scrolls the strip, never the page
  await page.locator('[role=tablist] [role=tab][data-state="active"]').focus();
  // from the third tab, seven presses reach the last (one more would wrap to the first)
  for (let i = 0; i < 7; i++) await press(page, "ArrowRight");
  await settle(page);
  m = await measure(page);
  expectAligned(m, "keyboard travel to the end of an overflowing strip");
  check(
    m.label === "Integrations" && m.listScroll > 0 && m.pageScroll.join() === "0,0",
    "keyboard scrolled the strip, not the page",
    `chosen "${m.label}", strip ${m.listScroll.toFixed(0)}px, page ${m.pageScroll}`,
  );

  // rapid repeated changes land on the last one
  // rapid: each press lands well inside the previous travel (300ms + 100ms)
  await press(page, "Home");
  for (let i = 0; i < 5; i++) await press(page, "ArrowRight");
  await settle(page);
  m = await measure(page);
  expectAligned(m, "five rapid changes settle on the last");
  check(m.label === "Storage", "rapid changes end on the sixth tab", `chosen "${m.label}"`);

  // the viewport narrows: a resize-only reposition
  await page.locator("[role=tab]").nth(1).click();
  await settle(page);
  await page.setViewportSize({ width: 340, height: 720 });
  const still2 = await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.querySelector("[data-kx-tabs-bar]").getAnimations().filter((a) => a.playState === "running").length;
  });
  await settle(page);
  m = await measure(page);
  expectAligned(m, "viewport resized to 340px");
  check(still2 === 0 && m.pageOverflow <= 0, "resize snaps, page does not overflow", `${still2} transition(s), page overflow ${m.pageOverflow}px`);
  await ctx.close();
}

/* ── a label that was never chosen grows ─────────────────────────────── */
{
  // On a fresh page, so the tab whose count grows has never been the chosen one: the chosen tab after it
  // moves without resizing, and only a size observer on every tab sees that.
  const { page, ctx } = await open();
  await page.evaluate(act("select-last"));
  await settle(page);
  const still = await transitionsAfter(page, act("grow-count"));
  await settle(page);
  const m = await measure(page);
  expectAligned(m, "a label before the chosen tab changes width");
  check(still === 0, "label change snaps, no travel", `${still} transition(s)`);
  await ctx.close();
}

/* ── dynamic tabs ────────────────────────────────────────────────────── */
{
  const { page, ctx } = await open();
  await page.evaluate(act("select-second"));
  await settle(page);
  await page.evaluate(act("add"));
  await settle(page);
  expectAligned(await measure(page), "a tab is added");
  await page.evaluate(act("remove-first-inactive"));
  await settle(page);
  expectAligned(await measure(page), "an inactive tab before the chosen one is removed");
  await page.evaluate(act("disable-selected"));
  await settle(page);
  let m = await measure(page);
  // Radix keeps a disabled tab selected; the bar follows Radix rather than inventing another choice
  expectAligned(m, "the chosen tab is disabled (Radix keeps it selected)");
  await page.evaluate(act("remove-selected"));
  await settle(page);
  m = await measure(page);
  check(!m.shown && m.selected === 0, "the chosen tab is removed: no bar, nothing selected", `bar ${m.shown ? "SHOWN" : "hidden"}, selected ${m.selected}`);
  const fallback = await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].every((t) => getComputedStyle(t).borderBottomColor === "rgba(0, 0, 0, 0)"));
  check(fallback, "and no trigger draws a stale edge", fallback ? "every edge transparent" : "an edge is drawn");
  await ctx.close();
}

/* ── observer lifecycle ──────────────────────────────────────────────── */
{
  const { page, ctx } = await open();
  const detached = async () => (await page.evaluate(() => window.__kxObservers())).reduce((n, o) => n + o.detachedTabs, 0);
  await page.evaluate(act("select-second"));
  await settle(page);
  for (const key of ["remove-first-inactive", "remove-first-inactive", "remove-selected"]) {
    await page.evaluate(act(key));
    await settle(page);
  }
  const held = await detached();
  check(held === 0, "removed tabs are no longer observed", `${held} detached tab(s) still watched`);
  await page.evaluate(act("unmount"));
  await settle(page);
  const live = (await page.evaluate(() => window.__kxObservers())).filter((o) => o.watching > 0);
  check(live.length === 0, "unmounting the strip disconnects its observers", live.length ? live.map((o) => `${o.name} watching ${o.watching}`).join(", ") : "none left connected");
  await page.evaluate(act("unmount"));
  await page.waitForSelector("[role=tablist] [data-kx-tabs-bar]", { state: "attached" });
  await page.evaluate(act("select-second"));
  await settle(page);
  expectAligned(await measure(page), "remounted after unmounting");
  await ctx.close();
}

/* ── direction, orientation, hidden ──────────────────────────────────── */
{
  const { page, ctx } = await open();
  await page.evaluate(act("select-second"));
  await settle(page);
  const still = await transitionsAfter(page, act("direction"));
  await settle(page);
  let m = await measure(page);
  expectAligned(m, "direction flipped to rtl");
  check(m.dir === "rtl" && still === 0, "direction flip snaps, no travel", `dir ${m.dir}, ${still} transition(s)`);
  await page.evaluate(act("select-last"));
  await settle(page);
  m = await measure(page);
  expectAligned(m, "rtl: programmatic choice of an off-screen tab");
  check(m.pageOverflow <= 0, "rtl: page does not overflow", `${m.pageOverflow}px`);
  await page.locator('[role=tablist] [role=tab][data-state="active"]').focus();
  for (let i = 0; i < 4; i++) await press(page, "ArrowRight"); // toward the inline start in rtl
  await settle(page);
  m = await measure(page);
  expectAligned(m, "rtl: keyboard travel back along the strip");
  check(m.pageScroll.join() === "0,0", "rtl: keyboard did not scroll the page", `page ${m.pageScroll}`);

  await page.evaluate(act("orientation"));
  await settle(page);
  expectAligned(await measure(page), "vertical, rtl: bar on the chosen tab's inline-end rail");
  await page.evaluate(act("direction"));
  await settle(page);
  expectAligned(await measure(page), "vertical, ltr: bar on the chosen tab's inline-end rail");
  await page.locator('[role=tablist] [role=tab][data-state="active"]').focus();
  await press(page, "ArrowDown");
  await settle(page);
  expectAligned(await measure(page), "vertical: keyboard choice of the next tab");
  await page.evaluate(act("orientation"));
  await settle(page);

  // hidden while the choice changes, then shown
  await page.evaluate(act("hidden"));
  await page.evaluate(act("select-second"));
  await settle(page);
  const shown = await transitionsAfter(page, act("hidden"));
  await settle(page);
  m = await measure(page);
  expectAligned(m, "choice changed while hidden, then shown");
  check(shown === 0, "revealing the strip snaps, no travel from a stale place", `${shown} transition(s)`);
  await ctx.close();
}

/* ── 200% text, reduced motion, forced colours, hydration fallback ───── */
{
  const { page, ctx } = await open({ fontPx: 32, viewport: { width: 390, height: 800 } });
  let m = await measure(page);
  expectAligned(m, "200% text: initial");
  await page.evaluate(act("select-last"));
  await settle(page);
  m = await measure(page);
  expectAligned(m, "200% text: off-screen choice");
  check(m.pageOverflow <= 0, "200% text: page does not overflow at 390px", `${m.pageOverflow}px`);
  await ctx.close();
}
{
  const { page, ctx } = await open({ reducedMotion: "reduce" });
  const moving = await transitionsAfter(page, act("select-last"));
  const m = await measure(page);
  expectAligned(m, "reduced motion: lands on the chosen tab at once");
  check(moving === 0, "reduced motion: no travel", `${moving} transition(s)`);
  await ctx.close();
}
{
  const { page, ctx } = await open({ forcedColors: "active" });
  const m = await measure(page);
  const drawn = m.tabBorder !== "rgba(0, 0, 0, 0)";
  check(!m.shown && drawn, "forced colours: bar hidden, chosen trigger draws its own edge", `bar ${m.shown ? "SHOWN" : "hidden"}, edge ${m.tabBorder}`);
  await ctx.close();
}
{
  // Before the bar measures itself (server render, before hydration) the trigger's own edge is the mark.
  // It must be the same box the bar then occupies, or hydration would visibly move the selection.
  const { page, ctx } = await open({ story: "default" });
  const bar = await measure(page);
  const edge = await page.evaluate(() => {
    const list = document.querySelector("[role=tablist]");
    list.removeAttribute("data-kx-tabs-indicator");
    const tab = list.querySelector('[role="tab"][data-state="active"]');
    // the trigger's edge colour transitions with \`transition-colors\`; read where it lands
    for (const x of tab.getAnimations()) x.finish();
    const r = tab.getBoundingClientRect();
    const cs = getComputedStyle(tab);
    const w = parseFloat(cs.borderBottomWidth);
    const bar = list.querySelector("[data-kx-tabs-bar]");
    return { l: r.left, r: r.right, t: r.bottom - w, b: r.bottom, color: cs.borderBottomColor, barShown: getComputedStyle(bar).display !== "none" };
  });
  const same = near(edge.l, bar.bar.l) && near(edge.r, bar.bar.r) && near(edge.t, bar.bar.t) && near(edge.b, bar.bar.b);
  check(
    same && edge.color !== "rgba(0, 0, 0, 0)" && !edge.barShown,
    "pre-hydration edge is the box the bar takes over",
    `edge ${edge.l.toFixed(1)}–${edge.r.toFixed(1)} × ${edge.t.toFixed(1)}–${edge.b.toFixed(1)} (${edge.color}), ${fmt(bar)}`,
  );
  await ctx.close();
}

await browser.close();
storybook.close();
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ tabs-indicator: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\ntabs-indicator ok — the bar stays on the chosen tab through scrolling, resizing, dynamic tabs, direction, orientation, 200% text and reveal.`);
