/**
 * iot-state-spatial.mjs — state fidelity and control clearance of the /iot demos, measured in a real browser.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000) &
 *   node scripts/iot-state-spatial.mjs [--base http://127.0.0.1:3000]
 *
 * The 2026-10-05 audit (docs/audits/INTERACTIVE-STATE-SPATIAL-AUDIT.md) found three defects that no existing gate
 * could see, because each one is a RELATION between two things on the page rather than a property of one:
 *
 *   clearance   DeviceSetpointControl's ring pinned its ± buttons to the ring's bottom corners with fixed insets,
 *               directly under the arc's two ends: 7–17px INTO the end markers at every width, and at 200% text the
 *               numeral overflowed the ring and the buttons covered it.
 *   fidelity    the lock's drawing took a boolean `on` that no caller set, so "Unlocked" sat beside a thrown bolt.
 *   collision   plan markers are sized in rem on a plan sized in px, and were only thinned out below `sm`: at
 *               1280px/200% text the operations plan had 16 overlapping pairs of 44px targets.
 *
 * So every assertion here is between two rendered things, read back from the DOM after the browser laid it out:
 *
 *   ring        for every DeviceSetpointControl ring on /iot, at 1280 / 390 / 320 and in RTL: neither stepper comes
 *               within CLEARANCE of either end marker of the arc (the circle the marker draws at the range's
 *               limits), the steppers do not touch the numeral, each is a 44px target that hit-tests to itself,
 *               and its 4px focus ring fits inside the card. At 200% text: the same, or — where the ring is too
 *               narrow to hold the numeral — the stacked layout, with the drawing gone and nothing overlapping.
 *   lock        Locked → Unlocked → Locked on the front door, through the real control and the simulated delay.
 *               After each confirmation the word, the checked radio, the drawing's `data-state` and the bolt all
 *               agree; WHILE the request is in flight the drawing still shows the confirmed state, never the
 *               request. The whole-home tile's drawing agrees with the tile's word. Under reduced motion the bolt
 *               has no transition and still lands in the final position.
 *   light       Off → On → Off on the living-room lamp: word, switch and drawing agree after each step, and in
 *               dark mode an unlit shade is not drawn in the lit shade's fill.
 *   plan        on each environment's plan, at 1280/200%, 390, 320 and 390/200%: no two visible markers' 44px
 *               targets intersect.
 *
 * Text size is applied the way a11y-site.mjs applies it (CDP `Page.setFontSizes`) and the root size is asserted.
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/$/, "");
/** Minimum visual gap between a stepper and the arc's end marker. One spacing step: a 2px ring + 2px offset, and air. */
const CLEARANCE = 8;
/** The focus ring the steppers draw: `ring-2 ring-offset-2`. */
const FOCUS = 4;

/** `--only=ring,lock` runs a subset (negative controls); a full run is the gate. */
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const runs = (part) => !ONLY || ONLY.includes(part);
const failures = [];
const fail = (tag, msg) => failures.push(`${tag}: ${msg}`);
let checks = 0;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function openIot({ width, scale = 1, scheme = "light", reducedMotion = "no-preference" }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion });
  const page = await context.newPage();
  if (scale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * scale, fixed: 13 * scale } });
  }
  const response = await page.goto(`${base}/iot`, { waitUntil: "load" });
  if (!response?.ok()) throw new Error(`/iot: HTTP ${response?.status()}`);
  const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  if (Math.abs(rootPx - 16 * scale) > 0.5) throw new Error(`root font-size ${rootPx}px, expected ${16 * scale}px`);
  if (scheme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"));
  return { context, page };
}

/**
 * The environments are behind a closed "Operate an environment" disclosure (Phase 3D). Opening it is what a reader
 * does to reach them, so the gate does the same, by its summary, before measuring anything inside.
 */
async function openEnvironments(page) {
  const disclosure = page.locator("#environments details", { has: page.locator("summary", { hasText: "Operate an environment" }) }).first();
  if (!(await disclosure.evaluate((d) => d.open))) await disclosure.locator("summary").first().click();
}

/** The examples mount lazily as they near the viewport: walk down to them. */
async function mount(page, selector, sectionId = "environments") {
  if (sectionId === "environments") await openEnvironments(page);
  await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  for (let i = 0; i < 40 && !(await page.locator(selector).count()); i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(250);
  }
  await page.waitForSelector(selector, { state: "attached", timeout: 30000 });
  await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(400);
}

async function chooseEnvironment(page, name) {
  await openEnvironments(page);
  await page.locator("#environments").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: new RegExp(name) }).first().click();
}

/* ------------------------------------------------------------------ ring clearance */

/** Every ring's geometry, from the DOM: the arc's end markers in page px, the steppers, the numeral, the card. */
function readRings() {
  const ARC = { start: 135, sweep: 270, radius: 84, marker: 9 + 4 / 2 };
  return [...document.querySelectorAll('[data-presentation="ring"]')].map((host) => {
    const svg = host.querySelector("svg");
    const box = svg.getBoundingClientRect();
    const drawn = box.width > 0 && getComputedStyle(svg).display !== "none";
    const s = box.width / 200;
    const mirrored = getComputedStyle(svg).transform !== "none";
    const at = (deg) => {
      const a = (deg * Math.PI) / 180;
      const x = 100 + ARC.radius * Math.cos(a);
      return [box.left + (mirrored ? 200 - x : x) * s, box.top + (100 + ARC.radius * Math.sin(a)) * s];
    };
    const ends = drawn ? [at(ARC.start), at(ARC.start + ARC.sweep)] : [];
    const steppers = [...host.querySelectorAll("button")].map((b) => {
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return {
        label: b.getAttribute("aria-label"),
        r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height },
        hits: document.elementFromPoint(cx, cy)?.closest("button") === b,
        // edge-to-edge distance from this round button to the nearer end marker
        gap: ends.length ? Math.min(...ends.map(([x, y]) => Math.hypot(cx - x, cy - y) - r.width / 2 - ARC.marker * s)) : null,
      };
    });
    const numeral = host.querySelector("[data-confirmed]").parentElement.getBoundingClientRect();
    const card = (host.closest("[data-device]") ?? host.closest("section, article") ?? document.body).getBoundingClientRect();
    const now = [...host.querySelectorAll("span")].find((el) => /^(Now |Current unknown)/.test(el.textContent ?? ""));
    return {
      name: host.closest("[data-device]")?.getAttribute("data-device") ?? steppers[0]?.label,
      drawn,
      steppers,
      numeral: { left: numeral.left, right: numeral.right, top: numeral.top, bottom: numeral.bottom },
      card: { left: card.left, right: card.right },
      nowClipped: now ? now.scrollWidth > now.clientWidth + 1 : false,
    };
  });
}

const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

function assertRings(tag, rings, { expectDrawn }) {
  if (!rings.length) return fail(tag, "no DeviceSetpointControl ring found on /iot");
  for (const ring of rings) {
    const t = `${tag} ring ${ring.name}`;
    checks++;
    if (expectDrawn === true && !ring.drawn) fail(t, "the ring was not drawn at a width where it fits");
    if (ring.steppers.length !== 2) fail(t, `expected 2 steppers, found ${ring.steppers.length}`);
    for (const st of ring.steppers) {
      if (st.r.width < 43.5 || st.r.height < 43.5) fail(t, `${st.label} is ${st.r.width}×${st.r.height}, below the 44px target`);
      if (!st.hits) fail(t, `${st.label} does not hit-test to itself at its centre (something is drawn over it)`);
      if (ring.drawn && st.gap < CLEARANCE) fail(t, `${st.label} is ${st.gap.toFixed(1)}px from the arc's end marker (needs ≥ ${CLEARANCE}px)`);
      if (intersects(st.r, ring.numeral)) fail(t, `${st.label} overlaps the numeral`);
      if (st.r.left - FOCUS < ring.card.left - 0.5 || st.r.right + FOCUS > ring.card.right + 0.5) fail(t, `${st.label}'s focus ring leaves its card`);
    }
    if (ring.steppers.length === 2 && intersects(ring.steppers[0].r, ring.steppers[1].r)) fail(t, "the two steppers overlap");
    if (ring.nowClipped) fail(t, "the current reading is truncated");
  }
}

for (const [width, scale, dir] of !runs("ring") ? [] : [
  [1280, 1, "ltr"],
  [390, 1, "ltr"],
  [320, 1, "ltr"],
  [390, 1, "rtl"],
  [1280, 2, "ltr"],
  [390, 2, "ltr"],
]) {
  const tag = `ring ${width}px/text${scale * 100}%/${dir}`;
  const { context, page } = await openIot({ width, scale });
  try {
    await mount(page, '[data-device="thermostat-hall"] [data-presentation="ring"]');
    await mount(page, '#explore-control [data-presentation="ring"]', "explore");
    if (dir === "rtl") await page.evaluate(() => document.querySelectorAll('[data-presentation="ring"]').forEach((r) => r.closest("[data-device], section")?.setAttribute("dir", "rtl")));
    await page.waitForTimeout(300);
    const rings = [];
    for (const handle of await page.locator('[data-presentation="ring"]').all()) {
      await handle.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.waitForTimeout(300);
      const index = rings.length;
      rings.push((await page.evaluate(readRings))[index]);
    }
    assertRings(tag, rings, { expectDrawn: scale === 1 ? true : undefined });
  } catch (error) {
    fail(tag, error.message);
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ lock and light fidelity */

const lockState = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-device="lock-front"]');
    const svg = el.querySelector('svg[data-illustration="lock"]');
    return {
      word: el.querySelector(".text-headline-lg")?.textContent?.trim(),
      checked: el.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute("data-mode-id"),
      drawn: svg?.getAttribute("data-state"),
      bolt: svg?.querySelector("[data-bolt]")?.getAttribute("data-bolt"),
      boltTransition: svg?.querySelector("[data-bolt]") ? getComputedStyle(svg.querySelector("[data-bolt]")).transitionDuration : null,
      boltTransform: svg?.querySelector("[data-bolt]") ? getComputedStyle(svg.querySelector("[data-bolt]")).transform : null,
    };
  });

function assertLock(tag, s, expected) {
  checks++;
  const want = { word: expected === "locked" ? "Locked" : "Unlocked", bolt: expected === "locked" ? "thrown" : "withdrawn" };
  if (s.word !== want.word) fail(tag, `word is "${s.word}", expected "${want.word}"`);
  if (s.checked !== expected) fail(tag, `checked radio is "${s.checked}", expected "${expected}"`);
  if (s.drawn !== expected) fail(tag, `drawing says "${s.drawn}" beside the word "${s.word}"`);
  if (s.bolt !== want.bolt) fail(tag, `bolt is "${s.bolt}" for a ${expected} lock`);
}

for (const reducedMotion of runs("lock") ? ["no-preference", "reduce"] : []) {
  const tag = `lock (${reducedMotion} motion)`;
  const { context, page } = await openIot({ width: 1280, reducedMotion });
  try {
    await mount(page, '[data-device="lock-front"]');
    const lock = page.locator('[data-device="lock-front"]');
    assertLock(`${tag} initial`, await lockState(page), "locked");
    for (const [to, from] of [
      ["unlocked", "locked"],
      ["locked", "unlocked"],
    ]) {
      await lock.locator(`[role="radio"][data-mode-id="${to}"]`).click();
      await page.waitForTimeout(150);
      const inFlight = await lockState(page);
      // A request is not a state: until the device confirms, the drawing keeps the confirmed state too.
      if (inFlight.checked === from) assertLock(`${tag} requesting ${to}`, inFlight, from);
      await page.waitForFunction((id) => document.querySelector(`[data-device="lock-front"] [role="radio"][aria-checked="true"]`)?.getAttribute("data-mode-id") === id, to, { timeout: 20000 });
      await page.waitForTimeout(reducedMotion === "reduce" ? 50 : 400);
      const settled = await lockState(page);
      assertLock(`${tag} confirmed ${to}`, settled, to);
      // the site's reduced-motion reset leaves a 0.01ms duration rather than none; anything under 1ms is no motion
      if (reducedMotion === "reduce" && parseFloat(settled.boltTransition) >= 0.001) fail(tag, `bolt still transitions (${settled.boltTransition}) under reduced motion`);
      const atRest = settled.boltTransform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(settled.boltTransform);
      if ((to === "locked") !== atRest) fail(tag, `bolt transform "${settled.boltTransform}" does not match a ${to} lock`);
    }
    // The whole-home tile draws the same lock from the same confirmed value.
    await lock.locator('[role="radio"][data-mode-id="unlocked"]').click();
    await page.waitForFunction(() => document.querySelector('[data-device="lock-front"] [role="radio"][aria-checked="true"]')?.getAttribute("data-mode-id") === "unlocked", null, { timeout: 20000 });
    await page.getByRole("button", { name: "Show the whole home" }).click();
    await page.waitForFunction(() => !document.querySelector('[data-device="lock-front"]') && document.querySelector('svg[data-illustration="lock"]'));
    checks++;
    const tile = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-illustration="lock"]');
      // the tile is the nearest ancestor that also holds the big value
      let card = svg.parentElement;
      while (card && !card.querySelector(".text-headline-sm")) card = card.parentElement;
      const word = card?.querySelector(".text-headline-sm")?.textContent?.trim();
      return { drawn: svg.getAttribute("data-state"), says: word === "Unlocked" ? "unlocked" : word === "Locked" ? "locked" : `? (${word})` };
    });
    if (tile.drawn !== tile.says) fail(`${tag} whole-home tile`, `tile says "${tile.says}" and draws "${tile.drawn}"`);
  } catch (error) {
    fail(tag, error.message);
  } finally {
    await context.close();
  }
}

for (const scheme of runs("light") ? ["light", "dark"] : []) {
  const tag = `light (${scheme})`;
  const { context, page } = await openIot({ width: 1280, scheme });
  try {
    await mount(page, '[data-device="thermostat-hall"]');
    await page.getByRole("button", { name: /^Living room/ }).first().click();
    await page.waitForSelector('[data-device="lamp-living"]');
    const read = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-device="lamp-living"]');
        const svg = el.querySelector('svg[data-illustration="light"]');
        return {
          word: el.querySelector(".text-headline-lg")?.textContent?.trim(),
          switchOn: el.querySelector('[role="switch"]')?.getAttribute("aria-checked") === "true",
          drawn: svg?.getAttribute("data-state"),
          shade: svg?.querySelector('[data-part="shade"]') ? getComputedStyle(svg.querySelector('[data-part="shade"]')).fill : null,
        };
      });
    const shades = {};
    for (const want of ["on", "off", "on"]) {
      const before = await read();
      if ((before.switchOn ? "on" : "off") !== want) {
        await page.locator('[data-device="lamp-living"] [role="switch"]').first().click();
        await page.waitForFunction((on) => document.querySelector('[data-device="lamp-living"] [role="switch"]')?.getAttribute("aria-checked") === String(on), want === "on", { timeout: 20000 });
        await page.waitForTimeout(300);
      }
      const s = await read();
      checks++;
      if (s.drawn !== want) fail(tag, `switch is ${want} and the drawing says "${s.drawn}"`);
      if ((want === "off") !== (s.word === "Off")) fail(tag, `switch is ${want} and the word is "${s.word}"`);
      shades[want] = s.shade;
    }
    if (scheme === "dark" && shades.on === shades.off) fail(tag, `an unlit shade is drawn in the lit shade's fill (${shades.off})`);
  } catch (error) {
    fail(tag, error.message);
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ plan markers */

for (const env of runs("plan") ? ["Smart space", "Agritech", "Operations"] : []) {
  for (const [width, scale] of [
    [1280, 2],
    [390, 1],
    [320, 1],
    [390, 2],
  ]) {
    const tag = `plan ${env} ${width}px/text${scale * 100}%`;
    const { context, page } = await openIot({ width, scale });
    try {
      await chooseEnvironment(page, env);
      await mount(page, "[role=tabpanel]:not([hidden]) [data-hotspot]");
      await page.waitForTimeout(600);
      checks++;
      const overlaps = await page.evaluate(() => {
        const shown = [...document.querySelectorAll("[role=tabpanel]:not([hidden]) [data-hotspot]")].filter((b) => b.getBoundingClientRect().width > 0);
        const out = [];
        for (let i = 0; i < shown.length; i++)
          for (let j = i + 1; j < shown.length; j++) {
            const a = shown[i].getBoundingClientRect();
            const b = shown[j].getBoundingClientRect();
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x > 0.5 && y > 0.5) out.push(`${shown[i].dataset.hotspot} × ${shown[j].dataset.hotspot} (${Math.round(x)}×${Math.round(y)}px)`);
          }
        return { count: shown.length, out };
      });
      if (!overlaps.count) fail(tag, "no marker is drawn on the plan");
      for (const o of overlaps.out) fail(tag, `marker targets overlap: ${o}`);
    } catch (error) {
      fail(tag, error.message);
    } finally {
      await context.close();
    }
  }
}

await browser.close();

if (failures.length) {
  console.error(`✗ iot-state-spatial: ${failures.length} finding(s) over ${checks} checks:\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
if (!checks) {
  console.error("✗ iot-state-spatial: nothing was checked");
  process.exit(1);
}
console.log(`iot-state-spatial ok — ${checks} checks${ONLY ? ` (only ${ONLY.join(", ")})` : ": ring clearance (6 views), lock fidelity (2 motion modes), light fidelity (2 themes), plan markers (3 environments × 4 views)"}.`);
