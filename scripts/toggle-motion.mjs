/**
 * toggle-motion.mjs — MX1b-1a: Toggle and ToggleGroup motion, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/toggle-motion.mjs
 *
 * `check:motion` proves the selected colour really interpolates, over 200ms, and that reduced motion lands on
 * the same colour without moving. This gate proves the rest of what MX1b-1a claims, on the `States` stories:
 *
 *   timing      every variant, off and on: background, text and border colour on `fast` (200ms), the state
 *               layer (box-shadow) on `instant` (100ms), all on the `standard` curve; nothing runs under
 *               prefers-reduced-motion
 *   pointer     hover lays the 8% layer and leaves the background alone, press deepens it to 14%, and the
 *               layer itself moves on 100ms; a disabled toggle does not answer
 *   touch       where the device cannot hover, a tap selects and a second tap releases, with no hover colour
 *               or layer left behind under the finger
 *   rapid       A → B → C in a burst leaves only C chosen, and every colour lands where its state says;
 *               on → off before the colour has finished lands back at rest
 *   forced      under forced colours, where backgrounds and box-shadows are replaced by the system, the chosen
 *               item is on Highlight / HighlightText and the rest are not, and focus is still an outline
 *   direction   in a right-to-left group, items run right to left and ArrowLeft moves to the next one
 *   matrix      at 320, 390, 768 and 1280px, 100% and 200% text, light and dark, LTR and RTL: no horizontal
 *               page overflow, every control on screen, the text grows with the reader's, and on is a
 *               different colour from off
 *
 * Each check is a relation between two renderings in the same run, so fonts and antialiasing do not enter
 * into it. The negative controls live in packages/ui/src/toggle-motion.test.tsx (class contract) and in
 * this file's own assertions, which each name the state that would make them fail.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */

// This gate is what earns Toggle and ToggleGroup their Chromium `interaction` evidence. It navigates to
// their stories and drives the real controls: clicks and pointer hover, with the selected item's state and
// its painted colour read back off the screen, plus a burst of clicks landing on the last one, the
// hover state not sticking on a device that cannot hover, forced colours and RTL order and keys.
//
// Subjects are declared, not inferred: this file imports no component, so there is no coverage fact in its
// source to read. See the note in switch-motion.mjs.
//
// kx-verify: interaction
// kx-verify-only: toggle, toggle-group

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
assertUiDistMatchesSource("toggle-motion");

const motion = JSON.parse(readFileSync(join(root, "tokens/primitives/motion.json"), "utf8"));
const ms = (name) => Number.parseFloat(motion.duration[name].$value.value ?? motion.duration[name].$value);
const FAST_MS = ms("fast");
const INSTANT_MS = ms("instant");
const STANDARD = `cubic-bezier(${motion.easing.standard.$value.join(", ")})`;
const SETTLE = FAST_MS + 150;

const STORY = { toggle: "controls-actions-toggle--states", group: "controls-actions-togglegroup--states" };
const VARIANTS = ["default", "outline", "pill"];
const HOVER = /rgba\([^)]*,\s*0\.08\)/;
const PRESS = /rgba\([^)]*,\s*0\.14\)/;

const { base, close } = await serveStatic(staticDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const report = [];
const failures = [];
const check = (ok, name, detail = "") => {
  report.push(`  ${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

async function open(context, story, theme = "light") {
  const page = await context.newPage();
  await page.goto(`${base}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`, { waitUntil: "load" });
  await page.waitForSelector("#storybook-root [data-kx-case]", { timeout: 15000 });
  // The theme global lands after first paint, and every toggle's colour then moves to the theme's on
  // `fast` like any other colour change. Read nothing until that has finished.
  await page.waitForTimeout(SETTLE);
  return page;
}
const style = (page, sel, props) =>
  page.locator(sel).first().evaluate((el, ps) => Object.fromEntries(ps.map((p) => [p, getComputedStyle(el)[p]])), props);
/** The duration of the running transition of `prop` on `sel`, or null if none is running. */
const running = (page, sel, prop) =>
  page.locator(sel).first().evaluate((el, p) => {
    const t = el.getAnimations().find((a) => a.transitionProperty === p);
    return t ? Number(t.effect.getComputedTiming().activeDuration) : null;
  }, prop);
const toMs = (s) => (s.endsWith("ms") ? Number.parseFloat(s) : Number.parseFloat(s) * 1000);
const tc = (variant, state) => `[data-kx-case="${variant}-${state}"]`;

/* ── timing ─────────────────────────────────────────────────────────────── */
async function timing(theme) {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await open(ctx, STORY.toggle, theme);
    for (const variant of VARIANTS) {
      for (const state of ["off", "on"]) {
        const s = await style(page, tc(variant, state), ["transitionProperty", "transitionDuration", "transitionTimingFunction"]);
        const name = `${theme}${reduced ? " reduced" : ""} ${variant}-${state} timing`;
        if (reduced) {
          const durs = s.transitionDuration.split(",").map((d) => toMs(d.trim()));
          check(s.transitionProperty === "none" || durs.every((d) => d <= 0.01), name, `${s.transitionProperty} ${s.transitionDuration}`);
          continue;
        }
        const props = s.transitionProperty.split(",").map((p) => p.trim());
        const durs = s.transitionDuration.split(",").map((d) => toMs(d.trim()));
        const at = Object.fromEntries(props.map((p, i) => [p, durs[i % durs.length]]));
        const want = { "background-color": FAST_MS, color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS };
        const ok = Object.entries(want).every(([p, d]) => at[p] === d) && props.length === 4;
        const curves = s.transitionTimingFunction.split(/,\s*(?=cubic|ease|linear|step)/);
        check(ok && curves.every((c) => c.trim() === STANDARD), name, `${s.transitionProperty} / ${s.transitionDuration} / ${s.transitionTimingFunction}`);
      }
    }
    await ctx.close();
  }
}

/* ── pointer ────────────────────────────────────────────────────────────── */
async function pointer(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.toggle, theme);
  for (const variant of VARIANTS) {
    for (const state of ["off", "on"]) {
      const sel = tc(variant, state);
      const name = `${theme} ${variant}-${state}`;
      await page.mouse.move(0, 0);
      await page.waitForTimeout(SETTLE);
      const rest = await style(page, sel, ["boxShadow", "backgroundColor"]);
      await page.hover(sel);
      const layerMs = await running(page, sel, "box-shadow");
      await page.waitForTimeout(SETTLE);
      const hover = await style(page, sel, ["boxShadow", "backgroundColor"]);
      check(!HOVER.test(rest.boxShadow) && HOVER.test(hover.boxShadow), `${name} hover lays the 8% layer`, hover.boxShadow);
      check(hover.backgroundColor === rest.backgroundColor, `${name} hover leaves the selection colour alone`, `${rest.backgroundColor} → ${hover.backgroundColor}`);
      check(layerMs !== null && Math.abs(layerMs - INSTANT_MS) <= 1, `${name} the layer moves on instant`, `${layerMs ?? "no"}ms`);
      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      const press = await style(page, sel, ["boxShadow"]);
      check(PRESS.test(press.boxShadow), `${name} press deepens the layer to 14%`, press.boxShadow);
      await page.mouse.up();
      // undo the click so the next state starts where the story put it
      await page.locator(sel).click();
    }
    const dis = tc(variant, "disabled");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    const before = await style(page, dis, ["boxShadow", "backgroundColor"]);
    const box = await page.locator(dis).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(SETTLE);
    const after = await style(page, dis, ["boxShadow", "backgroundColor"]);
    check(JSON.stringify(before) === JSON.stringify(after), `${theme} ${variant}-disabled does not answer the pointer`, after.boxShadow);
  }
  await ctx.close();
}

/* ── touch ──────────────────────────────────────────────────────────────── */
async function touch(theme) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await open(ctx, STORY.toggle, theme);
  const canHover = await page.evaluate(() => matchMedia("(hover: hover)").matches);
  check(!canHover, `${theme} touch harness reports a device that cannot hover`, `(hover: hover) = ${canHover}`);
  for (const variant of VARIANTS) {
    const sel = tc(variant, "off");
    const rest = (await style(page, sel, ["backgroundColor"])).backgroundColor;
    await page.tap(sel);
    await page.waitForTimeout(SETTLE);
    const s = await style(page, sel, ["boxShadow"]);
    const pressed = await page.locator(sel).getAttribute("aria-pressed");
    check(pressed === "true" && !HOVER.test(s.boxShadow) && !PRESS.test(s.boxShadow), `${theme} ${variant} tap selects and leaves no layer`, `aria-pressed=${pressed}, ${s.boxShadow}`);
    // A second tap releases it. The finger has left, so the toggle must look exactly as it did before the
    // first tap: a hover that is not behind (hover:hover) stays "on" here, under the last touch point.
    await page.tap(sel);
    await page.waitForTimeout(SETTLE);
    const back = await style(page, sel, ["backgroundColor", "boxShadow"]);
    check(back.backgroundColor === rest && !HOVER.test(back.boxShadow), `${theme} ${variant} tap again releases it with nothing stuck`, `${rest} → ${back.backgroundColor}, ${back.boxShadow}`);
  }
  await ctx.close();
}

/* ── rapid ──────────────────────────────────────────────────────────────── */
async function rapid(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.group, theme);
  const item = (n) => `[data-kx-case="single"] > button:nth-child(${n})`;
  const chosen = (await style(page, item(1), ["backgroundColor"])).backgroundColor;
  const rest = (await style(page, item(2), ["backgroundColor"])).backgroundColor;
  // Real input, no waits between: the second click lands while B's colour is still on its way.
  await page.click(item(2));
  const midway = await page.locator(item(2)).getAttribute("aria-checked");
  await page.click(item(3));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const states = await Promise.all([1, 2, 3].map((n) => page.locator(item(n)).getAttribute("aria-checked")));
  const colours = await Promise.all([1, 2, 3].map(async (n) => (await style(page, item(n), ["backgroundColor"])).backgroundColor));
  check(midway === "true", `${theme} group: B is chosen the moment it is clicked`, `aria-checked=${midway}`);
  check(JSON.stringify(states) === JSON.stringify(["false", "false", "true"]), `${theme} group: A → B → C leaves only C chosen`, states.join(" "));
  check(colours[0] === rest && colours[1] === rest && colours[2] === chosen, `${theme} group: every colour lands where its state says`, `${colours.join(" | ")} (rest ${rest}, chosen ${chosen})`);

  const t = await open(ctx, STORY.toggle, theme);
  const sel = tc("pill", "off");
  const restT = (await style(t, sel, ["backgroundColor"])).backgroundColor;
  await t.click(sel);
  await t.waitForTimeout(FAST_MS / 4);
  const partway = (await style(t, sel, ["backgroundColor"])).backgroundColor;
  await t.click(sel);
  await t.mouse.move(0, 0);
  await t.waitForTimeout(SETTLE);
  const end = (await style(t, sel, ["backgroundColor"])).backgroundColor;
  const pressed = await t.locator(sel).getAttribute("aria-pressed");
  check(partway !== restT, `${theme} toggle: the colour was interrupted partway`, `${restT} → ${partway}`);
  check(end === restT && pressed === "false", `${theme} toggle: on → off mid-transition lands back at rest`, `${end}, aria-pressed=${pressed}`);
  await ctx.close();
}

/* ── forced colours ─────────────────────────────────────────────────────── */
// The system replaces backgrounds and drops box-shadows, so the selected colour and the on-state ring are
// both gone. What must survive is a difference a reader can see: the chosen item on the system's selection
// pair (Highlight / HighlightText), every other item on the page's own colours.
const opaque = (c) => !/rgba\([^)]*,\s*0(?:\.0+)?\)/.test(c) && c !== "transparent";
async function forced(theme) {
  const ctx = await browser.newContext({ forcedColors: "active" });
  const page = await open(ctx, STORY.toggle, theme);
  await page.mouse.move(0, 0);
  const pair = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "forced-color-adjust:none;background:Highlight;color:HighlightText";
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const out = { bg: s.backgroundColor, fg: s.color };
    probe.remove();
    return out;
  });
  const differs = (name, on, off) =>
    check(
      on.backgroundColor === pair.bg && on.color === pair.fg && (off.backgroundColor !== on.backgroundColor || !opaque(off.backgroundColor)) && off.color !== on.color,
      `${theme} forced colours: ${name} chosen is Highlight / HighlightText, unchosen is not`,
      `on ${on.backgroundColor} / ${on.color}, off ${off.backgroundColor} / ${off.color}`,
    );
  for (const variant of VARIANTS) {
    differs(variant, await style(page, tc(variant, "on"), ["backgroundColor", "color"]), await style(page, tc(variant, "off"), ["backgroundColor", "color"]));
  }
  const g = await open(ctx, STORY.group, theme);
  for (const where of ["single", "multiple", "rtl"]) {
    differs(
      `${where} group`,
      await style(g, `[data-kx-case="${where}"] > button[data-state=on]`, ["backgroundColor", "color"]),
      await style(g, `[data-kx-case="${where}"] > button[data-state=off]:not([disabled])`, ["backgroundColor", "color"]),
    );
  }
  // Focus is still an outline, so it is not taken by the selected state: a focused chosen item shows both.
  await g.locator(`[data-kx-case="single"] > button[data-state=on]`).focus();
  await g.keyboard.press("Shift+Tab");
  await g.keyboard.press("Tab");
  const f = await style(g, `[data-kx-case="single"] > button[data-state=on]`, ["outlineStyle", "outlineColor", "backgroundColor"]);
  check(f.outlineStyle !== "none" && f.backgroundColor === pair.bg, `${theme} forced colours: a focused chosen item keeps its outline and its Highlight`, `${f.outlineStyle} ${f.outlineColor}, ${f.backgroundColor}`);
  await ctx.close();
}

/* ── direction ──────────────────────────────────────────────────────────── */
async function direction(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.group, theme);
  const item = (n) => `[data-kx-case="rtl"] > button:nth-child(${n})`;
  const [a, b] = await Promise.all([page.locator(item(1)).boundingBox(), page.locator(item(2)).boundingBox()]);
  check(a.x > b.x, `${theme} rtl group: the first item is on the right`, `first x=${Math.round(a.x)}, second x=${Math.round(b.x)}`);
  await page.locator(item(1)).focus();
  await page.keyboard.press("ArrowLeft");
  // Radix's roving focus moves focus in a timeout after the key, so wait for it rather than read at once.
  const second = await page.locator(item(2)).textContent();
  await page.waitForFunction((t) => document.activeElement?.textContent === t, second, { timeout: 1000 }).catch(() => {});
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  check(focused === second, `${theme} rtl group: ArrowLeft moves to the next item`, `focused "${focused}"`);
  await page.keyboard.press(" ");
  check((await page.locator(item(2)).getAttribute("aria-checked")) === "true", `${theme} rtl group: Space chooses it`);
  await ctx.close();
}

/* ── matrix ─────────────────────────────────────────────────────────────── */
async function matrix() {
  let cells = 0;
  for (const width of [320, 390, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    for (const theme of ["light", "dark"]) {
      for (const dir of ["ltr", "rtl"]) {
        for (const scale of [1, 2]) {
          for (const story of [STORY.toggle, STORY.group]) {
            const page = await open(ctx, story, theme);
            await page.evaluate(([d, s]) => {
              document.documentElement.dir = d;
              document.documentElement.style.fontSize = `${16 * s}px`;
            }, [dir, scale]);
            await page.waitForTimeout(50);
            const m = await page.evaluate(() => {
              const els = [...document.querySelectorAll("#storybook-root button")];
              const vw = document.documentElement.clientWidth;
              return {
                overflow: document.scrollingElement.scrollWidth - vw,
                offscreen: els.filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.left < -0.5 || r.right > vw + 0.5;
                }).length,
                font: Number.parseFloat(getComputedStyle(els[0]).fontSize),
                on: els.filter((e) => e.dataset.state === "on" && !e.disabled).map((e) => getComputedStyle(e).backgroundColor),
                off: els.filter((e) => e.dataset.state === "off" && !e.disabled).map((e) => getComputedStyle(e).backgroundColor),
              };
            });
            const where = `${width}px ${theme} ${dir} ${scale * 100}% ${story.includes("group") ? "group" : "toggle"}`;
            const same = m.on.filter((c) => m.off.includes(c));
            const ok = m.overflow <= 0 && m.offscreen === 0 && Math.abs(m.font - 14 * scale) < 0.5 && same.length === 0;
            if (!ok) check(false, `matrix ${where}`, `overflow ${m.overflow}px, ${m.offscreen} off screen, text ${m.font}px, on≡off ${same.length}`);
            cells++;
            await page.close();
          }
        }
      }
    }
    await ctx.close();
  }
  check(true, `matrix: ${cells} cells (4 widths × 2 themes × 2 directions × 2 text sizes × 2 stories) held`);
}

for (const theme of ["light", "dark"]) {
  report.push(`\n${theme}`);
  await timing(theme);
  await pointer(theme);
  await touch(theme);
  await rapid(theme);
  await forced(theme);
  await direction(theme);
}
report.push("\nmatrix");
await matrix();

await browser.close();
close();
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ toggle-motion: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\ntoggle-motion ok — Toggle and ToggleGroup hold MX1b-1a's motion contract in a real browser.`);
