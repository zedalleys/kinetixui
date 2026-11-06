/**
 * switch-motion.mjs — MX1b-1c: Switch on `selection-control`, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/switch-motion.mjs
 *
 * Switch is the one selection control that does not use `selection-state` (fast): its thumb is a physical
 * control, so the thumb's travel, the track colour and the halo all run on `instant` (100ms). `check:motion`
 * proves the thumb's travel interpolates and that reduced motion lands without moving; `check:selection-visual`
 * proves the thumb's side, the halo, the focus ring and mixed-direction placement. This gate proves the rest,
 * on the `Motion` and `States` stories, the same way `check:checkbox-radio-motion` does for MX1b-1b:
 *
 *   timing      track colour, halo and thumb on `instant`, `standard`, read from the computed style and from the
 *               transition that actually runs; nothing runs under reduced motion, and the end state is the same
 *   travel      sampled every frame of a move: the thumb starts at the inline start, ends at the inline end,
 *               only moves forward, never passes either end, and `aria-checked` has already changed on the
 *               first frame; the same in a right-to-left row, where it travels leftward
 *   pointer     hover lays the 8% halo and press deepens it to 14%, on 100ms; pressing does not move the thumb;
 *               a disabled switch answers neither the pointer nor a click
 *   touch       where the device cannot hover, a tap turns it on and a second tap off, with no halo left behind
 *   rapid       a burst of clicks, a click back mid-travel, and an owner turning it on and off within one
 *               frame all land on the last input, with the thumb where `aria-checked` says; nothing reflows
 *   form        a required switch says so, and a form reset returns it to off, thumb and all
 *   forced      under forced colours the thumb is still drawn against its track, on differs from off, and
 *               focus is an outline
 *   matrix      at 320, 390, 768 and 1280px, 100% and 200% text, light and dark, LTR and RTL: no horizontal
 *               page overflow, every control on screen, the track grows with the reader's text, and every
 *               thumb sits inside its track at the end its state names
 *
 * Each check is a relation between two readings in the same run, so fonts and antialiasing do not enter into
 * it. The class-contract negative controls live in packages/ui/src/switch-motion.test.tsx.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */

// This gate is what earns Switch its Chromium `interaction` evidence. It navigates to the Switch stories
// and drives the real control: `el.click()` in the page, `aria-checked` read back before the next frame,
// and the thumb's rendered offset sampled every animation frame of the move (starts, only goes forward,
// no overshoot, lands, mirrored in RTL), plus touch, rapid input, mid-travel reversal and form reset.
//
// Subjects are declared rather than inferred: this file imports no component — it drives one over a story
// URL — so the symbol extractor has nothing true to read and falls back to incidental names. It read
// `new FormData(...)` below as coverage of the `form` component, which this gate never touches.
//
// kx-verify: interaction
// kx-verify-only: switch

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
assertUiDistMatchesSource("switch-motion");

const motion = JSON.parse(readFileSync(join(root, "tokens/primitives/motion.json"), "utf8"));
const ms = (name) => Number.parseFloat(motion.duration[name].$value.value ?? motion.duration[name].$value);
const INSTANT_MS = ms("instant");
const STANDARD = `cubic-bezier(${motion.easing.standard.$value.join(", ")})`;
const SETTLE = INSTANT_MS + 150;

const STORY = { motion: "form-inputs-switch--motion", states: "form-inputs-switch--states" };
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
  await page.waitForSelector("#storybook-root [role=switch]", { timeout: 15000 });
  // The theme global lands after first paint, and the track colour then moves to the theme's.
  await page.waitForTimeout(SETTLE + 200);
  return page;
}
const sw = (key) => `[data-kx-case="${key}"]`;
const thumbOf = (key) => `${sw(key)} > span`;
const style = (page, sel, props) =>
  page.locator(sel).first().evaluate((el, ps) => Object.fromEntries(ps.map((p) => [p, getComputedStyle(el)[p]])), props);
const toMs = (s) => (s.endsWith("ms") ? Number.parseFloat(s) : Number.parseFloat(s) * 1000);
const T = ["transitionProperty", "transitionDuration", "transitionTimingFunction"];

/**
 * Where a switch is, in one frame: what it announces, its own direction, and the thumb's offset from the track's
 * inline start (0 = start, 1 = end), from the browser's layout of both boxes.
 */
const reading = (page, key) =>
  page.locator(sw(key)).first().evaluate((el) => {
    const t = el.getBoundingClientRect();
    const h = el.firstElementChild.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const inner = t.width - h.width - 4; // border-2 each side
    const fromStart = rtl ? t.right - 2 - h.right : h.left - (t.left + 2);
    return {
      aria: el.getAttribute("aria-checked"),
      rtl,
      at: Math.round((fromStart / inner) * 1000) / 1000,
      inside: h.left >= t.left - 0.5 && h.right <= t.right + 0.5,
    };
  });
const AT = { true: 1, false: 0 };

/* ── timing ─────────────────────────────────────────────────────────────── */
async function timing(theme) {
  for (const reduce of [false, true]) {
    const ctx = await browser.newContext({ reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await open(ctx, STORY.motion, theme);
    const tag = `${theme}${reduce ? " reduced" : ""}`;
    const track = await style(page, sw("off"), T);
    const thumb = await style(page, thumbOf("off"), T);
    if (!reduce) {
      const trackOk = track.transitionProperty === "background-color, box-shadow" && track.transitionDuration.split(",").every((d) => toMs(d.trim()) === INSTANT_MS) && track.transitionTimingFunction.split(/,\s*(?=cubic)/).every((c) => c.trim() === STANDARD);
      check(trackOk, `${tag} track colour and halo on instant, standard`, `${track.transitionProperty} / ${track.transitionDuration} / ${track.transitionTimingFunction}`);
      const thumbOk = thumb.transitionProperty === "inset-inline-start" && toMs(thumb.transitionDuration) === INSTANT_MS && thumb.transitionTimingFunction === STANDARD;
      check(thumbOk, `${tag} thumb travel on instant, standard`, `${thumb.transitionProperty} / ${thumb.transitionDuration} / ${thumb.transitionTimingFunction}`);
    } else {
      // In the package the preset's floor would shorten these to 0.01ms anyway; `none` is the component's own
      // reduced form, the one a registry install (no preset) relies on.
      check(track.transitionProperty === "none" && thumb.transitionProperty === "none", `${tag} track and thumb carry their own reduced form (transition: none)`, `${track.transitionProperty} / ${thumb.transitionProperty}`);
    }
    // What actually runs when it is clicked: the thumb's offset and the track's colour, and nothing else.
    // React flushes a click's state update in a microtask; reading after one more microtask is still before
    // any frame is painted, so this is "semantics before paint", which is the claim.
    const ran = await page.evaluate(async (s) => {
      const el = document.querySelector(s);
      el.click();
      await new Promise((r) => queueMicrotask(r));
      const anims = [el, el.firstElementChild].flatMap((n) => n.getAnimations());
      return {
        aria: el.getAttribute("aria-checked"),
        runs: anims.map((a) => ({ p: a.transitionProperty, ms: Number(a.effect.getComputedTiming().activeDuration), ease: a.effect.getTiming().easing })),
      };
    }, sw("off"));
    if (!reduce) {
      const thumbRun = ran.runs.find((r) => /^(left|right|inset-inline-start)$/.test(r.p));
      const bgRun = ran.runs.find((r) => r.p === "background-color");
      check(ran.aria === "true", `${tag} aria-checked changes before the next frame`, `aria-checked=${ran.aria}`);
      check(thumbRun && Math.abs(thumbRun.ms - INSTANT_MS) <= 1, `${tag} the running thumb transition lasts ${INSTANT_MS}ms`, thumbRun ? `${thumbRun.p} ${thumbRun.ms}ms` : "none ran");
      check(bgRun && Math.abs(bgRun.ms - INSTANT_MS) <= 1, `${tag} the running track colour transition lasts ${INSTANT_MS}ms`, bgRun ? `${bgRun.ms}ms` : "none ran");
    } else {
      check(ran.aria === "true" && ran.runs.length === 0, `${tag} a click changes state and runs nothing`, `aria-checked=${ran.aria}, ${ran.runs.map((r) => `${r.p} ${r.ms}ms`).join(", ") || "no transitions"}`);
      const r = await reading(page, "off");
      check(r.at === 1 && r.inside, `${tag} the thumb is at the end in the same frame`, `at ${r.at}`);
    }
    await ctx.close();
  }
}

/* ── travel ─────────────────────────────────────────────────────────────── */
/** Click a switch and record, every animation frame for a while, `aria-checked` and the thumb's offset. */
const sampleTravel = (page, key) =>
  page.evaluate(
    ([s, span]) =>
      new Promise((resolve) => {
        const el = document.querySelector(s);
        const t = el.getBoundingClientRect();
        const th = el.firstElementChild;
        const rtl = getComputedStyle(el).direction === "rtl";
        const inner = t.width - th.getBoundingClientRect().width - 4;
        const at = () => {
          const h = th.getBoundingClientRect();
          return ((rtl ? t.right - 2 - h.right : h.left - (t.left + 2)) / inner);
        };
        const frames = [{ aria: el.getAttribute("aria-checked"), at: at() }];
        el.click();
        const start = performance.now();
        const step = () => {
          frames.push({ aria: el.getAttribute("aria-checked"), at: at(), x: th.getBoundingClientRect().left });
          if (performance.now() - start < span) requestAnimationFrame(step);
          else resolve({ frames, rtl });
        };
        requestAnimationFrame(step);
      }),
    [sw(key), INSTANT_MS + 120],
  );

async function travel(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.motion, theme);
  for (const key of ["off", "rtl"]) {
    const { frames, rtl } = await sampleTravel(page, key);
    const [before, ...after] = frames;
    const ats = after.map((f) => f.at);
    const mid = ats.filter((a) => a > 0.02 && a < 0.98);
    const forward = ats.every((a, i) => i === 0 || a >= ats[i - 1] - 0.001);
    const bounded = ats.every((a) => a >= -0.001 && a <= 1.001);
    const label = `${theme} ${rtl ? "rtl" : "ltr"} switch`;
    check(before.aria === "false" && before.at < 0.01, `${label} starts off at the inline start`, `aria-checked=${before.aria}, at ${before.at.toFixed(3)}`);
    check(after.every((f) => f.aria === "true"), `${label} announces on from the first frame of the move`, after.map((f) => f.aria).join(" "));
    check(mid.length >= 1, `${label} the thumb is seen partway: it travels rather than jumps`, `${mid.length} of ${ats.length} frames between the ends`);
    check(forward && bounded, `${label} only moves forward and never passes either end (no overshoot)`, ats.map((a) => a.toFixed(2)).join(" "));
    check(Math.abs(ats.at(-1) - 1) < 0.01, `${label} settles at the inline end`, `at ${ats.at(-1).toFixed(3)}`);
    const xs = after.map((f) => f.x);
    const leftward = xs.at(-1) < xs[0];
    check(leftward === rtl, `${label} travels ${rtl ? "leftward" : "rightward"} on screen`, `x ${xs[0].toFixed(1)} → ${xs.at(-1).toFixed(1)}`);
  }
  await ctx.close();
}

/* ── pointer ────────────────────────────────────────────────────────────── */
async function pointer(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.motion, theme);
  for (const key of ["off", "on"]) {
    const sel = sw(key);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    const rest = await style(page, sel, ["boxShadow"]);
    const before = await reading(page, key);
    await page.hover(sel);
    const layerMs = await page.locator(sel).evaluate((el) => {
      const t = el.getAnimations().find((a) => a.transitionProperty === "box-shadow");
      return t ? Number(t.effect.getComputedTiming().activeDuration) : null;
    });
    await page.waitForTimeout(SETTLE);
    const hover = await style(page, sel, ["boxShadow"]);
    check(!HOVER.test(rest.boxShadow) && HOVER.test(hover.boxShadow), `${theme} switch ${key} hover lays the 8% halo`, hover.boxShadow);
    check(layerMs !== null && Math.abs(layerMs - INSTANT_MS) <= 1, `${theme} switch ${key} the halo moves on instant`, `${layerMs ?? "no"}ms`);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const pressed = await style(page, sel, ["boxShadow"]);
    const held = await reading(page, key);
    check(PRESS.test(pressed.boxShadow), `${theme} switch ${key} press deepens the halo to 14%`, pressed.boxShadow);
    check(held.at === before.at && held.aria === before.aria, `${theme} switch ${key} pressing does not move the thumb or the state`, `at ${before.at} → ${held.at}`);
    await page.mouse.up();
    await page.waitForTimeout(SETTLE);
    const released = await reading(page, key);
    check(released.aria !== before.aria && released.at === AT[released.aria], `${theme} switch ${key} release toggles it and the thumb lands at its end`, `aria-checked=${released.aria}, at ${released.at}`);
  }
  const sel = sw("disabled");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const before = { s: await style(page, sel, ["boxShadow", "backgroundColor"]), r: await reading(page, "disabled") };
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  const during = await style(page, sel, ["boxShadow", "backgroundColor"]);
  await page.mouse.up();
  await page.waitForTimeout(SETTLE);
  const after = await reading(page, "disabled");
  check(JSON.stringify(before.s) === JSON.stringify(during), `${theme} disabled switch does not answer the pointer`, during.boxShadow);
  check(after.aria === before.r.aria && after.at === before.r.at, `${theme} disabled switch is not toggled by a click`, `aria-checked=${after.aria}, at ${after.at}`);
  // Keyboard focus draws the ring around the track, and it does not wait for, or move with, the thumb.
  await page.mouse.move(0, 0);
  await page.locator(sw("on")).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(SETTLE);
  const ring = await style(page, sw("on"), ["boxShadow"]);
  const focused = await page.evaluate((s) => document.activeElement === document.querySelector(s), sw("on"));
  check(focused && /0px 0px 0px 4px/.test(ring.boxShadow), `${theme} Tab reaches the switch and draws the focus ring`, `focused ${focused}, ${ring.boxShadow}`);
  await ctx.close();
}

/* ── touch ──────────────────────────────────────────────────────────────── */
async function touch(theme) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await open(ctx, STORY.motion, theme);
  const canHover = await page.evaluate(() => matchMedia("(hover: hover)").matches);
  check(!canHover, `${theme} touch harness reports a device that cannot hover`, `(hover: hover) = ${canHover}`);
  const sel = sw("off");
  const rest = await style(page, sel, ["backgroundColor"]);
  for (const want of ["true", "false"]) {
    await page.tap(sel);
    await page.waitForTimeout(SETTLE);
    const r = await reading(page, "off");
    const s = await style(page, sel, ["boxShadow", "backgroundColor"]);
    const clear = !HOVER.test(s.boxShadow) && !PRESS.test(s.boxShadow);
    const back = want === "false" ? s.backgroundColor === rest.backgroundColor : s.backgroundColor !== rest.backgroundColor;
    check(r.aria === want && r.at === AT[want] && clear && back, `${theme} tap turns it ${want === "true" ? "on" : "off"} and leaves no halo`, `aria-checked=${r.aria}, at ${r.at}, ${s.boxShadow}`);
  }
  await ctx.close();
}

/* ── rapid ──────────────────────────────────────────────────────────────── */
async function rapid(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.motion, theme);
  const onColour = (await style(page, sw("on"), ["backgroundColor"])).backgroundColor;
  const offColour = (await style(page, sw("off"), ["backgroundColor"])).backgroundColor;
  const geometry = async () => JSON.stringify(await page.locator(sw("off")).locator("xpath=..").boundingBox());
  const g0 = await geometry();
  for (let i = 0; i < 5; i++) await page.click(sw("off"));
  const g1 = await geometry();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const r5 = await reading(page, "off");
  const c5 = (await style(page, sw("off"), ["backgroundColor"])).backgroundColor;
  check(r5.aria === "true" && r5.at === 1 && c5 === onColour, `${theme} five clicks land on, with the thumb at the end and the on track`, `aria-checked=${r5.aria}, at ${r5.at}, ${c5}`);
  check(g0 === g1, `${theme} nothing around the switch reflows while it moves`, `${g0} → ${g1}`);
  // Back mid-travel: the second click lands while the thumb is between the ends.
  const partway = await page.evaluate(
    (s) =>
      new Promise((resolve) => {
        const el = document.querySelector(s);
        el.click();
        setTimeout(() => {
          const t = el.getBoundingClientRect();
          const h = el.firstElementChild.getBoundingClientRect();
          const at = (h.left - (t.left + 2)) / (t.width - h.width - 4);
          el.click();
          resolve(at);
        }, 40);
      }),
    sw("off"),
  );
  await page.waitForTimeout(SETTLE);
  const back = await reading(page, "off");
  const cb = (await style(page, sw("off"), ["backgroundColor"])).backgroundColor;
  check(partway > 0.02 && partway < 0.98, `${theme} the thumb was reversed partway`, `at ${partway.toFixed(3)}`);
  check(back.aria === "true" && back.at === 1 && cb === onColour, `${theme} a click back mid-travel lands where the last click said`, `aria-checked=${back.aria}, at ${back.at}, ${cb}`);
  // An owner turning it on and off from outside, within one frame, and then on again mid-travel.
  await page.evaluate(() => {
    const [on, off] = ["checked", "unchecked"].map((a) => document.querySelector(`[data-kx-action="${a}"]`));
    on.click();
    off.click();
  });
  await page.waitForTimeout(SETTLE);
  const owned1 = await reading(page, "owned");
  await page.click('[data-kx-action="checked"]');
  await page.waitForTimeout(30);
  await page.click('[data-kx-action="unchecked"]');
  await page.click('[data-kx-action="checked"]');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const owned2 = await reading(page, "owned");
  const oc = (await style(page, sw("owned"), ["backgroundColor"])).backgroundColor;
  check(owned1.aria === "false" && owned1.at === 0, `${theme} owner on-then-off in one frame lands off`, `aria-checked=${owned1.aria}, at ${owned1.at}`);
  check(owned2.aria === "true" && owned2.at === 1 && oc === onColour && oc !== offColour, `${theme} owner changes during the move land on the last one`, `aria-checked=${owned2.aria}, at ${owned2.at}, ${oc}`);
  await ctx.close();
}

/* ── form ───────────────────────────────────────────────────────────────── */
async function form(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.motion, theme);
  const req = await page.locator(sw("required")).getAttribute("aria-required");
  const native = await page.evaluate(() => document.querySelector('form[aria-label="Consent"] input[type=checkbox]')?.required ?? null);
  check(req === "true" && native === true, `${theme} a required switch says so, and its form input is required`, `aria-required=${req}, input.required=${native}`);
  await page.click(sw("required"));
  await page.waitForTimeout(SETTLE);
  const on = await reading(page, "required");
  const value = await page.evaluate(() => new FormData(document.querySelector('form[aria-label="Consent"]')).get("terms"));
  await page.click('[data-kx-action="reset"]');
  await page.waitForTimeout(SETTLE);
  const reset = await reading(page, "required");
  check(on.aria === "true" && value === "on", `${theme} a switched-on switch submits its value`, `aria-checked=${on.aria}, terms=${value}`);
  check(reset.aria === "false" && reset.at === 0, `${theme} a form reset returns it to off, thumb and all`, `aria-checked=${reset.aria}, at ${reset.at}`);
  await ctx.close();
}

/* ── forced colours ─────────────────────────────────────────────────────── */
async function forced(theme) {
  const ctx = await browser.newContext({ forcedColors: "active" });
  const page = await open(ctx, STORY.states, theme);
  // What the system resolves CanvasText and GrayText to in this run, read from a probe that opts out of the repaint.
  const sys = await page.evaluate(() => {
    const read = (c) => {
      const el = document.createElement("div");
      el.style.cssText = `forced-color-adjust:none;background-color:${c}`;
      document.body.append(el);
      const v = getComputedStyle(el).backgroundColor;
      el.remove();
      return v;
    };
    return { enabled: read("CanvasText"), disabled: read("GrayText") };
  });
  for (const key of ["off", "on", "disabled", "disabled-on"]) {
    const tr = await style(page, sw(key), ["backgroundColor", "borderTopColor", "borderTopStyle"]);
    const th = await style(page, thumbOf(key), ["backgroundColor"]);
    const r = await reading(page, key);
    const drawn = th.backgroundColor !== tr.backgroundColor;
    const edge = tr.borderTopStyle !== "none" && !/rgba\([^)]*,\s*0\)/.test(tr.borderTopColor);
    check(drawn && edge && r.at === AT[r.aria], `${theme} forced colours: ${key} draws its thumb against the track, at its end`, `thumb ${th.backgroundColor} on track ${tr.backgroundColor}, edge ${tr.borderTopColor}, at ${r.at}`);
    // A disabled thumb is GrayText, not the enabled CanvasText, so disabled reads as disabled.
    const want = key.startsWith("disabled") ? "disabled" : "enabled";
    check(sys.enabled !== sys.disabled && th.backgroundColor === sys[want], `${theme} forced colours: ${key} thumb is ${want === "disabled" ? "GrayText" : "CanvasText"}`, `thumb ${th.backgroundColor}, CanvasText ${sys.enabled}, GrayText ${sys.disabled}`);
  }
  // On and off must not look the same: the pixels where the thumb sits differ.
  const shot = async (key) => (await page.locator(sw(key)).screenshot()).toString("base64");
  check((await shot("on")) !== (await shot("off")), `${theme} forced colours: on and off are told apart`);
  await page.locator(sw("on")).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const f = await style(page, sw("on"), ["outlineStyle", "outlineWidth", "outlineColor"]);
  check(f.outlineStyle !== "none" && Number.parseFloat(f.outlineWidth) >= 2 && !/rgba\([^)]*,\s*0\)/.test(f.outlineColor), `${theme} forced colours: a focused switch shows an outline`, `${f.outlineStyle} ${f.outlineWidth} ${f.outlineColor}`);
  await ctx.close();
}

/* ── matrix ─────────────────────────────────────────────────────────────── */
async function matrix() {
  let cells = 0;
  for (const width of [320, 390, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    for (const theme of ["light", "dark"]) {
      for (const dir of ["ltr", "rtl"]) {
        for (const scale of [1, 2]) {
          const page = await open(ctx, STORY.motion, theme);
          await page.evaluate(([d, s]) => {
            document.documentElement.dir = d;
            document.documentElement.style.fontSize = `${16 * s}px`;
          }, [dir, scale]);
          await page.waitForTimeout(SETTLE);
          const m = await page.evaluate(() => {
            const els = [...document.querySelectorAll("#storybook-root [role=switch], #storybook-root label, #storybook-root button")];
            const switches = els.filter((e) => e.getAttribute("role") === "switch");
            const vw = document.documentElement.clientWidth;
            const placed = switches.map((el) => {
              const t = el.getBoundingClientRect();
              const h = el.firstElementChild.getBoundingClientRect();
              const rtl = getComputedStyle(el).direction === "rtl";
              const mid = (h.left + h.right) / 2 - (t.left + t.right) / 2;
              const atEnd = rtl ? mid < 0 : mid > 0;
              const inside = h.left >= t.left - 0.5 && h.right <= t.right + 0.5;
              return inside && atEnd === (el.getAttribute("aria-checked") === "true");
            });
            return {
              overflow: document.scrollingElement.scrollWidth - vw,
              offscreen: els.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.left < -0.5 || r.right > vw + 0.5;
              }).length,
              width: switches[0].getBoundingClientRect().width,
              misplaced: placed.filter((ok) => !ok).length,
            };
          });
          const where = `${width}px ${theme} ${dir} ${scale * 100}%`;
          const ok = m.overflow <= 0 && m.offscreen === 0 && Math.abs(m.width - 48 * scale) < 0.5 && m.misplaced === 0;
          if (!ok) check(false, `matrix ${where}`, `overflow ${m.overflow}px, ${m.offscreen} off screen, track ${m.width}px, ${m.misplaced} thumb(s) misplaced`);
          cells++;
          await page.close();
        }
      }
    }
    await ctx.close();
  }
  check(true, `matrix: ${cells} cells (4 widths × 2 themes × 2 directions × 2 text sizes) held`);
}

for (const theme of ["light", "dark"]) {
  report.push(`\n${theme}`);
  await timing(theme);
  await travel(theme);
  await pointer(theme);
  await touch(theme);
  await rapid(theme);
  await form(theme);
  await forced(theme);
}
report.push("\nmatrix");
await matrix();

await browser.close();
close();
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ switch-motion: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nswitch-motion ok — Switch holds the selection-control motion contract in a real browser.`);
