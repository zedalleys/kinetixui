/**
 * checkbox-radio-motion.mjs — MX1b-1b: Checkbox and RadioGroup motion, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/checkbox-radio-motion.mjs
 *
 * `check:motion` proves the fill, border and glyph really interpolate over 200ms and that reduced motion lands
 * on the same end state without moving. This gate proves the rest of what MX1b-1b claims, on the `Motion` and
 * `States` stories, the same way `check:toggle-motion` does for MX1b-1a:
 *
 *   timing      fill, text and border colour on `fast` (200ms), the state layer on `instant` (100ms), the tick and
 *               dot on `fast`, all on `standard`; the tick leaves at once; nothing runs under reduced motion
 *   glyph       what is announced is what is drawn, in every state and on every move between them: the dash
 *               under mixed (including the uncontrolled mixed box that drew a tick), the tick under checked,
 *               nothing under unchecked, and on a move the new glyph is the one on screen from the first frame
 *   pointer     hover lays the 8% halo and press deepens it to 14%, on 100ms; a disabled control does not answer
 *   touch       where the device cannot hover, a tap checks and a second tap clears, with no halo left behind
 *   rapid       a burst of clicks, or A → B → C, lands on the last input, with every colour and glyph where its
 *               state says; a click back before the colour has finished lands back at rest; nothing moves
 *   forced      under forced colours, the checked box draws its glyph and the unchecked one does not, the chosen
 *               radio draws its dot, and focus is still an outline
 *   direction   in a right-to-left row the box sits at the inline start (right), and in a right-to-left radio
 *               group ArrowLeft moves to, and chooses, the next item
 *   matrix      at 320, 390, 768 and 1280px, 100% and 200% text, light and dark, LTR and RTL: no horizontal
 *               page overflow, every control on screen, the box grows with the reader's text, and checked
 *               differs from unchecked
 *
 * Each check is a relation between two renderings in the same run, so fonts and antialiasing do not enter into
 * it. The class-contract negative controls live in packages/ui/src/checkbox-radio-motion.test.tsx.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
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
assertUiDistMatchesSource("checkbox-radio-motion");

const motion = JSON.parse(readFileSync(join(root, "tokens/primitives/motion.json"), "utf8"));
const ms = (name) => Number.parseFloat(motion.duration[name].$value.value ?? motion.duration[name].$value);
const FAST_MS = ms("fast");
const INSTANT_MS = ms("instant");
const STANDARD = `cubic-bezier(${motion.easing.standard.$value.join(", ")})`;
const SETTLE = FAST_MS + 150;

const STORY = {
  box: "form-inputs-checkbox--motion",
  boxStates: "form-inputs-checkbox--states",
  radio: "form-inputs-radiogroup--motion",
  radioStates: "form-inputs-radiogroup--states",
};
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
  await page.waitForSelector("#storybook-root [role=checkbox], #storybook-root [role=radio]", { timeout: 15000 });
  // The theme global lands after first paint, and every colour then moves to the theme's on `fast`.
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
/** `transition-property` / `-duration` / `-timing-function` → { property: [ms, curve] }. */
const tiers = (s) => {
  const props = s.transitionProperty.split(",").map((p) => p.trim());
  const durs = s.transitionDuration.split(",").map((d) => toMs(d.trim()));
  const curves = s.transitionTimingFunction.split(/,\s*(?=cubic|ease|linear|step)/).map((c) => c.trim());
  return Object.fromEntries(props.map((p, i) => [p, [durs[i % durs.length], curves[i % curves.length]]]));
};
const T = ["transitionProperty", "transitionDuration", "transitionTimingFunction"];
const cb = (key) => `[data-kx-case="${key}"]`;
const radio = (group, value) => `[data-kx-case="${group}"] [role=radio][value=${value}]`;

/**
 * What a control announces and what it draws, read in one frame: `aria-checked`, the Indicator's opacity and
 * the glyphs whose `display` is not none. A glyph inside a transparent Indicator is not drawn.
 */
const reading = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const ind = el.querySelector(":scope > span");
    const opacity = ind ? Number(getComputedStyle(ind).opacity) : 0;
    const glyphs = ind
      ? [...ind.querySelectorAll("svg")]
          .filter((s) => getComputedStyle(s).display !== "none")
          .map((s) => (s.classList.contains("lucide-minus") ? "dash" : s.classList.contains("lucide-check") ? "tick" : "dot"))
      : [];
    return { aria: el.getAttribute("aria-checked"), opacity, glyphs, drawn: opacity > 0 ? glyphs : [] };
  });
const WANT = { true: ["tick"], mixed: ["dash"], false: [] };

/* ── timing ─────────────────────────────────────────────────────────────── */
async function timing(theme) {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ reducedMotion: reduced ? "reduce" : "no-preference" });
    const box = await open(ctx, STORY.box, theme);
    const rad = await open(ctx, STORY.radio, theme);
    const subjects = [
      [box, cb("off"), "checkbox off", { "background-color": FAST_MS, color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS }],
      [box, cb("on"), "checkbox on", { "background-color": FAST_MS, color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS }],
      [box, cb("mixed-uncontrolled"), "checkbox mixed", { "background-color": FAST_MS, color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS }],
      [box, `${cb("on")} > span`, "tick on", { opacity: FAST_MS }],
      // Leaving is instant: the duration is read on the unchecked Indicator, which is where the browser reads it.
      [box, `${cb("off")} > span`, "tick off", "none"],
      [rad, radio("plan", "free"), "radio chosen", { color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS }],
      [rad, radio("plan", "pro"), "radio unchosen", { color: FAST_MS, "border-color": FAST_MS, "box-shadow": INSTANT_MS }],
      [rad, `${radio("plan", "free")} > span`, "dot chosen", { opacity: FAST_MS }],
      [rad, `${radio("plan", "pro")} > span`, "dot unchosen", { opacity: FAST_MS }],
    ];
    for (const [page, sel, label, want] of subjects) {
      const s = await style(page, sel, T);
      const name = `${theme}${reduced ? " reduced" : ""} ${label} timing`;
      if (reduced) {
        const durs = s.transitionDuration.split(",").map((d) => toMs(d.trim()));
        check(s.transitionProperty === "none" || durs.every((d) => d <= 0.01), name, `${s.transitionProperty} ${s.transitionDuration}`);
        continue;
      }
      if (want === "none") {
        check(s.transitionProperty === "none", name, s.transitionProperty);
        continue;
      }
      const t = tiers(s);
      const ok = Object.keys(t).length === Object.keys(want).length && Object.entries(want).every(([p, d]) => t[p]?.[0] === d && t[p]?.[1] === STANDARD);
      check(ok, name, `${s.transitionProperty} / ${s.transitionDuration} / ${s.transitionTimingFunction}`);
    }
    await ctx.close();
  }
}

/* ── glyph ──────────────────────────────────────────────────────────────── */
async function glyph(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.box, theme);
  for (const key of ["off", "on", "mixed-uncontrolled", "owned"]) {
    const r = await reading(page, cb(key));
    check(JSON.stringify(r.drawn) === JSON.stringify(WANT[r.aria]), `${theme} ${key}: draws what it announces`, `aria-checked=${r.aria}, drawn ${r.drawn.join("+") || "nothing"}`);
  }
  // Every move the brief names, driven by the owner. The reading is taken one frame after the input, while the
  // colour is still moving: the glyph on screen must already be the new one, or nothing at all.
  const moves = [
    ["checked", "true"],
    ["unchecked", "false"],
    ["indeterminate", "mixed"],
    ["checked", "true"],
    ["indeterminate", "mixed"],
    ["unchecked", "false"],
  ];
  let from = "false";
  for (const [action, aria] of moves) {
    await page.click(`[data-kx-action="${action}"]`);
    const first = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    void first;
    const early = await reading(page, cb("owned"));
    const wrong = early.drawn.filter((g) => !WANT[aria].includes(g));
    check(early.aria === aria && wrong.length === 0, `${theme} owned ${from} → ${aria}: the first frame draws no wrong glyph`, `aria-checked=${early.aria}, drawn ${early.drawn.join("+") || "nothing"} at opacity ${early.opacity.toFixed(2)}`);
    await page.waitForTimeout(SETTLE);
    const late = await reading(page, cb("owned"));
    check(late.aria === aria && JSON.stringify(late.drawn) === JSON.stringify(WANT[aria]) && (aria === "false" ? late.opacity === 0 : late.opacity === 1), `${theme} owned ${from} → ${aria}: lands on its glyph`, `drawn ${late.drawn.join("+") || "nothing"} at opacity ${late.opacity}`);
    from = aria;
  }
  // The uncontrolled mixed box, clicked: mixed → checked → unchecked, as Radix cycles it.
  for (const aria of ["true", "false"]) {
    await page.click(cb("mixed-uncontrolled"));
    await page.waitForTimeout(SETTLE);
    const r = await reading(page, cb("mixed-uncontrolled"));
    check(r.aria === aria && JSON.stringify(r.drawn) === JSON.stringify(WANT[aria]), `${theme} uncontrolled mixed, clicked: ${aria}`, `drawn ${r.drawn.join("+") || "nothing"}`);
  }
  // Radio: the dot is drawn on the chosen item and nowhere else.
  const rad = await open(ctx, STORY.radio, theme);
  for (const v of ["pro", "team", "free"]) {
    await rad.click(radio("plan", v));
    await rad.waitForTimeout(SETTLE);
    const rs = await Promise.all(["free", "pro", "team"].map((x) => reading(rad, radio("plan", x))));
    const ok = rs.every((r, i) => (r.aria === "true") === (["free", "pro", "team"][i] === v) && (r.aria === "true" ? r.opacity === 1 : r.opacity === 0));
    check(ok, `${theme} radio: choosing ${v} draws only its dot`, rs.map((r) => `${r.aria}/${r.opacity}`).join(" "));
  }
  await ctx.close();
}

/* ── pointer ────────────────────────────────────────────────────────────── */
async function pointer(theme) {
  const ctx = await browser.newContext();
  const box = await open(ctx, STORY.box, theme);
  const rad = await open(ctx, STORY.radio, theme);
  for (const [page, sel, name] of [
    [box, cb("off"), "checkbox off"],
    [box, cb("on"), "checkbox on"],
    [rad, radio("plan", "pro"), "radio unchosen"],
  ]) {
    // Two pages share the context; `:active` and focus only follow a press in the page in front.
    await page.bringToFront();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    const rest = await style(page, sel, ["boxShadow"]);
    await page.hover(sel);
    const layerMs = await running(page, sel, "box-shadow");
    await page.waitForTimeout(SETTLE);
    const hover = await style(page, sel, ["boxShadow"]);
    check(!HOVER.test(rest.boxShadow) && HOVER.test(hover.boxShadow), `${theme} ${name} hover lays the 8% halo`, hover.boxShadow);
    check(layerMs !== null && Math.abs(layerMs - INSTANT_MS) <= 1, `${theme} ${name} the halo moves on instant`, `${layerMs ?? "no"}ms`);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    check(PRESS.test((await style(page, sel, ["boxShadow"])).boxShadow), `${theme} ${name} press deepens the halo to 14%`);
    await page.mouse.up();
  }
  for (const [story, sel, name] of [
    [STORY.boxStates, cb("disabled"), "checkbox disabled"],
    [STORY.radioStates, cb("disabled"), "radio disabled"],
  ]) {
    const page = await open(ctx, story, theme);
    const before = await style(page, sel, ["boxShadow", "backgroundColor", "borderColor"]);
    const b = await page.locator(sel).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const after = await style(page, sel, ["boxShadow", "backgroundColor", "borderColor"]);
    await page.mouse.up();
    check(JSON.stringify(before) === JSON.stringify(after), `${theme} ${name} does not answer the pointer`, after.boxShadow);
  }
  await ctx.close();
}

/* ── touch ──────────────────────────────────────────────────────────────── */
async function touch(theme) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await open(ctx, STORY.box, theme);
  const canHover = await page.evaluate(() => matchMedia("(hover: hover)").matches);
  check(!canHover, `${theme} touch harness reports a device that cannot hover`, `(hover: hover) = ${canHover}`);
  const sel = cb("off");
  const rest = await style(page, sel, ["backgroundColor", "borderColor"]);
  await page.tap(sel);
  await page.waitForTimeout(SETTLE);
  const on = await reading(page, sel);
  const s = await style(page, sel, ["boxShadow"]);
  check(on.aria === "true" && on.drawn.join() === "tick" && !HOVER.test(s.boxShadow) && !PRESS.test(s.boxShadow), `${theme} checkbox tap checks and leaves no halo`, `aria-checked=${on.aria}, ${s.boxShadow}`);
  await page.tap(sel);
  await page.waitForTimeout(SETTLE);
  const back = await style(page, sel, ["backgroundColor", "borderColor", "boxShadow"]);
  check(back.backgroundColor === rest.backgroundColor && back.borderColor === rest.borderColor && !HOVER.test(back.boxShadow), `${theme} checkbox tap again clears it with nothing stuck`, `${rest.borderColor} → ${back.borderColor}, ${back.boxShadow}`);
  const rad = await open(ctx, STORY.radio, theme);
  await rad.tap(radio("plan", "pro"));
  await rad.waitForTimeout(SETTLE);
  const r = await reading(rad, radio("plan", "pro"));
  const rs = await style(rad, radio("plan", "pro"), ["boxShadow"]);
  check(r.aria === "true" && r.opacity === 1 && !HOVER.test(rs.boxShadow), `${theme} radio tap chooses and leaves no halo`, `aria-checked=${r.aria}, ${rs.boxShadow}`);
  await ctx.close();
}

/* ── rapid ──────────────────────────────────────────────────────────────── */
async function rapid(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.box, theme);
  const sel = cb("off");
  const rest = await style(page, sel, ["backgroundColor", "borderColor"]);
  const checked = await style(page, cb("on"), ["backgroundColor", "borderColor"]);
  const geometry = async () => JSON.stringify(await page.locator(sel).boundingBox());
  const g0 = await geometry();
  // Five clicks with no waits: each lands while the last colour is still moving.
  for (let i = 0; i < 5; i++) await page.click(sel);
  const g1 = await geometry();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const end = await reading(page, sel);
  const endStyle = await style(page, sel, ["backgroundColor", "borderColor"]);
  check(end.aria === "true" && end.drawn.join() === "tick" && endStyle.backgroundColor === checked.backgroundColor, `${theme} checkbox: five clicks land checked, with its fill and tick`, `aria-checked=${end.aria}, ${endStyle.backgroundColor}`);
  check(g0 === g1, `${theme} checkbox: nothing moves the box while it changes`, `${g0} → ${g1}`);
  // Back before the colour has finished.
  await page.click(sel);
  await page.waitForTimeout(FAST_MS / 4);
  const partway = (await style(page, sel, ["backgroundColor"])).backgroundColor;
  await page.click(sel);
  await page.click(sel);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const back = await reading(page, sel);
  const backStyle = await style(page, sel, ["backgroundColor", "borderColor"]);
  check(partway !== checked.backgroundColor && partway !== rest.backgroundColor, `${theme} checkbox: the fill was interrupted partway`, partway);
  check(back.aria === "false" && back.opacity === 0 && backStyle.backgroundColor === rest.backgroundColor, `${theme} checkbox: a click back mid-fill lands at rest`, `aria-checked=${back.aria}, opacity ${back.opacity}, ${backStyle.backgroundColor}`);

  const rad = await open(ctx, STORY.radio, theme);
  const chosen = (await style(rad, radio("plan", "free"), ["borderColor"])).borderColor;
  const unchosen = (await style(rad, radio("plan", "pro"), ["borderColor"])).borderColor;
  await rad.click(radio("plan", "pro"));
  const midway = await rad.locator(radio("plan", "pro")).getAttribute("aria-checked");
  await rad.click(radio("plan", "team"));
  await rad.mouse.move(0, 0);
  await rad.waitForTimeout(SETTLE);
  const rs = await Promise.all(["free", "pro", "team"].map((v) => reading(rad, radio("plan", v))));
  const borders = await Promise.all(["free", "pro", "team"].map(async (v) => (await style(rad, radio("plan", v), ["borderColor"])).borderColor));
  check(midway === "true", `${theme} radio: B is chosen the moment it is clicked`, `aria-checked=${midway}`);
  check(rs.map((r) => `${r.aria}/${r.opacity}`).join(" ") === "false/0 false/0 true/1", `${theme} radio: A → B → C leaves only C chosen, with only C's dot`, rs.map((r) => `${r.aria}/${r.opacity}`).join(" "));
  check(borders[0] === unchosen && borders[1] === unchosen && borders[2] === chosen, `${theme} radio: every border lands where its state says`, borders.join(" | "));
  await ctx.close();
}

/* ── forced colours ─────────────────────────────────────────────────────── */
async function forced(theme) {
  const ctx = await browser.newContext({ forcedColors: "active" });
  const page = await open(ctx, STORY.box, theme);
  for (const key of ["off", "on", "mixed-uncontrolled"]) {
    const r = await reading(page, cb(key));
    const s = await style(page, cb(key), ["borderTopStyle", "borderTopColor"]);
    const edge = s.borderTopStyle !== "none" && !/rgba\([^)]*,\s*0\)/.test(s.borderTopColor);
    check(edge && JSON.stringify(r.drawn) === JSON.stringify(WANT[r.aria]), `${theme} forced colours: ${key} keeps its edge and draws what it announces`, `${s.borderTopColor}, drawn ${r.drawn.join("+") || "nothing"}`);
  }
  await page.locator(cb("on")).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const f = await style(page, cb("on"), ["outlineStyle", "outlineColor"]);
  check(f.outlineStyle !== "none" && !/rgba\([^)]*,\s*0\)/.test(f.outlineColor), `${theme} forced colours: a focused checkbox shows an outline`, `${f.outlineStyle} ${f.outlineColor}`);
  const rad = await open(ctx, STORY.radio, theme);
  const rs = await Promise.all(["free", "pro"].map((v) => reading(rad, radio("plan", v))));
  check(rs[0].aria === "true" && rs[0].opacity === 1 && rs[0].glyphs.length === 1 && rs[1].opacity === 0, `${theme} forced colours: only the chosen radio draws its dot`, rs.map((r) => `${r.aria}/${r.opacity}`).join(" "));
  await ctx.close();
}

/* ── direction ──────────────────────────────────────────────────────────── */
async function direction(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, STORY.box, theme);
  const [boxR, labelR] = await Promise.all([page.locator(cb("rtl")).boundingBox(), page.locator(`label[for="cbm-rtl"]`).boundingBox()]);
  check(boxR.x > labelR.x, `${theme} rtl checkbox: the box sits at the inline start (right of its label)`, `box x=${Math.round(boxR.x)}, label x=${Math.round(labelR.x)}`);
  await page.click(cb("rtl"));
  await page.waitForTimeout(SETTLE);
  const rb = await page.locator(cb("rtl")).boundingBox();
  const tick = await page.locator(`${cb("rtl")} svg.lucide-check`).boundingBox();
  const centred = Math.abs(rb.x + rb.width / 2 - (tick.x + tick.width / 2)) < 1;
  check(centred, `${theme} rtl checkbox: the tick is centred in its box`, `box centre ${(rb.x + rb.width / 2).toFixed(1)}, tick centre ${(tick.x + tick.width / 2).toFixed(1)}`);

  const rad = await open(ctx, STORY.radio, theme);
  const [a, b] = await Promise.all([rad.locator(radio("rtl", "free")).boundingBox(), rad.locator(radio("rtl", "pro")).boundingBox()]);
  check(a.x > b.x, `${theme} rtl radio: the first item is on the right`, `first x=${Math.round(a.x)}, second x=${Math.round(b.x)}`);
  await rad.locator(radio("rtl", "free")).focus();
  // Held as a key is held. Radix chooses the radio that receives focus while an arrow is down, and its roving
  // focus moves in a timeout; a press released in the same task would move focus without choosing.
  await rad.keyboard.down("ArrowLeft");
  await rad.waitForTimeout(50);
  await rad.keyboard.up("ArrowLeft");
  // Radix's roving focus moves focus in a timeout after the key, so wait for it rather than read at once.
  await rad.waitForFunction((s) => document.activeElement === document.querySelector(s), radio("rtl", "pro"), { timeout: 1000 }).catch(() => {});
  const focused = await rad.evaluate((s) => document.activeElement === document.querySelector(s), radio("rtl", "pro"));
  await rad.waitForTimeout(SETTLE);
  const r = await reading(rad, radio("rtl", "pro"));
  check(focused && r.aria === "true" && r.opacity === 1, `${theme} rtl radio: ArrowLeft moves to the next item and chooses it`, `focused ${focused}, aria-checked=${r.aria}, dot ${r.opacity}`);
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
          for (const story of [STORY.box, STORY.radio]) {
            const page = await open(ctx, story, theme);
            await page.evaluate(([d, s]) => {
              document.documentElement.dir = d;
              document.documentElement.style.fontSize = `${16 * s}px`;
            }, [dir, scale]);
            await page.waitForTimeout(SETTLE);
            const m = await page.evaluate(() => {
              const els = [...document.querySelectorAll("#storybook-root [role=checkbox], #storybook-root [role=radio], #storybook-root label, #storybook-root button")];
              const controls = els.filter((e) => /^(checkbox|radio)$/.test(e.getAttribute("role") ?? ""));
              const vw = document.documentElement.clientWidth;
              const paint = (e) => (e.getAttribute("role") === "checkbox" ? getComputedStyle(e).backgroundColor : getComputedStyle(e).borderColor);
              return {
                overflow: document.scrollingElement.scrollWidth - vw,
                offscreen: els.filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.left < -0.5 || r.right > vw + 0.5;
                }).length,
                size: controls[0].getBoundingClientRect().width,
                on: controls.filter((e) => e.getAttribute("aria-checked") === "true").map(paint),
                off: controls.filter((e) => e.getAttribute("aria-checked") === "false").map(paint),
              };
            });
            const where = `${width}px ${theme} ${dir} ${scale * 100}% ${story.includes("radio") ? "radio" : "checkbox"}`;
            const same = m.on.filter((c) => m.off.includes(c));
            const ok = m.overflow <= 0 && m.offscreen === 0 && Math.abs(m.size - 18 * scale) < 0.5 && same.length === 0;
            if (!ok) check(false, `matrix ${where}`, `overflow ${m.overflow}px, ${m.offscreen} off screen, box ${m.size}px, checked≡unchecked ${same.length}`);
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
  await glyph(theme);
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
  console.error(`\n✗ checkbox-radio-motion: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\ncheckbox-radio-motion ok — Checkbox and RadioGroup hold MX1b-1b's motion contract in a real browser.`);
