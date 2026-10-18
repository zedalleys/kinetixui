/**
 * angular-selection-motion.mjs — MX1b-2: the Angular selection controls on `selection-control`,
 * `selection-state` and `press-feedback`, measured in a real browser.
 *
 *   pnpm build:tokens && node scripts/angular-selection-motion.mjs
 *   node scripts/angular-selection-motion.mjs --only=timing   one pass (timing | travel | pointer | keyboard | forced | rapid | matrix)
 *
 * The subject is the Angular browser harness (packages/ui-angular/browser) mounting `selection-motion`: Vite
 * and the Angular compiler build the package's own fixture AOT, and the page bootstraps it as a live zoneless
 * Angular application with the generated token CSS and the package's styles.css linked byte for byte. Every
 * interaction here goes through the real templates, bindings and change detection — nothing on the page is
 * markup written to resemble a component, and jsdom assertions do not stand in for any of it.
 *
 * What it proves, per theme:
 *
 *   timing      Switch track, halo and thumb on `instant` (100ms, `standard`); Checkbox fill, edge and glyph
 *               colour and Radio edge and dot on `fast` (200ms) with their state layer on `instant`; Toggle
 *               and ToggleGroup colour on `fast` with the press layer on `instant`. Read from the computed
 *               style AND from the transition that actually runs on a click, so a value that is declared but
 *               never used cannot pass. Under reduced motion nothing runs and the control lands on its end
 *               state in the same frame.
 *               The radio dot is also measured where it is drawn, in both page directions: it is placed
 *               absolutely inside its control, and a physical transform would centre it on an LTR page while
 *               pulling it out of the control on an RTL one.
 *   travel      every frame of a thumb's move: starts at the inline start, only moves forward, never passes
 *               either end, settles at the inline end, and `aria-checked` has already changed on the first
 *               frame. In a right-to-left subtree it travels leftward on screen — and the page stays LTR, so
 *               a switch reading an ancestor's direction instead of its own is caught.
 *   pointer     hover lays the 8% `--foreground` layer and press deepens it to 14%, on 100ms, on Checkbox,
 *               Radio and Toggle; a disabled control answers neither the pointer nor a click, its label
 *               carries the wash, and the disabled single-select group item — a `<label>`, which never
 *               matches `:disabled` — lays no layer either.
 *   keyboard    Space toggles Switch, Checkbox and Toggle; the arrow keys move the radio selection and follow
 *               the group's own direction; a focused control paints `--shadow-focus` itself, read from a probe
 *               in the same page rather than taken as "something is drawn" — the browser's own default
 *               outline would satisfy that, and two of these three rest on a transparent shadow.
 *   forced      under forced colours the Switch thumb is drawn in `CanvasText` (and `GrayText` when
 *               disabled) against the resolved system colours, so thumb and track differ; the chosen radio
 *               still shows its dot; focus is still an outline.
 *   rapid       a burst of clicks and a click back mid-travel land on the last input, with the thumb where
 *               `aria-checked` says it is.
 *   matrix      320, 390, 768 and 1280px x light/dark x LTR/RTL x 100/200% text: no horizontal page overflow,
 *               every control on screen, and every thumb inside its track at the end its state names.
 *
 * Each check is a relation between two readings in the same run, so fonts and antialiasing do not enter into
 * it. The negative controls are recorded in docs/roadmaps/MX1B-1C-SELECTION-PARITY.md §4.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs; KX_ANGULAR_HARNESS_DIR
 * reuses a harness already built by packages/ui-angular/browser/build.mjs.
 */
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildAngularSubject, serveStatic, settleAngular, waitForAngular } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const motion = JSON.parse(readFileSync(join(root, "tokens/primitives/motion.json"), "utf8"));
const ms = (name) => Number.parseFloat(motion.duration[name].$value.value ?? motion.duration[name].$value);
const INSTANT = ms("instant");
const FAST = ms("fast");
const STANDARD = `cubic-bezier(${motion.easing.standard.$value.join(", ")})`;
const SETTLE = FAST + 150;
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const runs = (pass) => !ONLY || ONLY === pass;

/* The fixture's own layout: it places the groups on the page and styles no control. */
const LAYOUT = `
  .kx-motion-grid { display: grid; gap: 24px; max-width: 900px; }
  .kx-motion-group { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
  .kx-motion-group[data-kx-group="radio"] { align-items: start; gap: 32px; }
  .kx-motion-row { display: inline-flex; align-items: center; gap: 12px; }
`;

const dir = buildAngularSubject("selection-motion", { name: "angular-selection-motion", layout: LAYOUT });
const { base, close } = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const report = [];
const failures = [];
const check = (ok, name, detail = "") => {
  report.push(`  ${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

/** The harness page for a theme, once Angular has bootstrapped it and the theme's colours have settled. */
async function open(context, theme = "light") {
  const page = await context.newPage();
  await page.goto(`${base}/${theme}.html`, { waitUntil: "load" });
  await waitForAngular(page);
  await page.waitForTimeout(SETTLE);
  return page;
}

/* The selectors, in the package's own vocabulary: a case key addresses the component, and each component's
   own host element is what the stylesheet paints. */
const SEL = {
  switch: (c) => `kx-switch[data-kx-case="${c}"] button`,
  thumb: (c) => `kx-switch[data-kx-case="${c}"] .kx-switch__thumb`,
  checkbox: (c) => `kx-checkbox[data-kx-case="${c}"] button`,
  glyph: (c) => `kx-checkbox[data-kx-case="${c}"] .kx-checkbox__glyph`,
  radio: (c) => `kx-radio[data-kx-case="${c}"] input`,
  dot: (c) => `kx-radio[data-kx-case="${c}"] .kx-radio__dot`,
  toggle: (c) => `button[data-kx-case="${c}"]`,
  groupItem: (c) => `kx-toggle-group-item[data-kx-case="${c}"] .kx-toggle`,
  groupInput: (c) => `kx-toggle-group-item[data-kx-case="${c}"] input`,
};
const T = ["transitionProperty", "transitionDuration", "transitionTimingFunction"];
const style = (page, sel, props = T) =>
  page.locator(sel).first().evaluate((el, ps) => Object.fromEntries(ps.map((p) => [p, getComputedStyle(el)[p]])), props);
const toMs = (s) => (s.endsWith("ms") ? Number.parseFloat(s) : Number.parseFloat(s) * 1000);
const HOVER = /rgba\([^)]*,\s*0\.08\)/;
const PRESS = /rgba\([^)]*,\s*0\.14\)/;
/* A `box-shadow` entry that is actually painted. Both the Checkbox and the Toggle rest on a shadow that is
   present but transparent (`0 0 #0000`, and the inset press layer), so "not none" says nothing about whether
   anything is visible: this matches an rgb() or an rgba() whose alpha is not zero. */
const VISIBLE_SHADOW = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?!0\s*\))[\d.]+\s*)?\)/;

/** Per-property tiers from one computed style: `{ "background-color": 200, "box-shadow": 100 }`. */
const tiers = (declared) => {
  const props = declared.transitionProperty.split(",").map((p) => p.trim());
  const durations = declared.transitionDuration.split(",").map((d) => toMs(d.trim()));
  return Object.fromEntries(props.map((p, i) => [p, durations[i % durations.length]]));
};
const easings = (declared) => declared.transitionTimingFunction.split(/,\s*(?=cubic|linear|ease|step)/).map((c) => c.trim());

/** Where a switch's thumb is, in one frame: 0 at the inline start of its track, 1 at the inline end. */
const reading = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const t = el.getBoundingClientRect();
    const h = el.firstElementChild.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const rtl = cs.direction === "rtl";
    const pad = Number.parseFloat(cs.paddingInlineStart) + Number.parseFloat(cs.borderInlineStartWidth);
    const inner = t.width - h.width - 2 * pad;
    const fromStart = rtl ? t.right - pad - h.right : h.left - (t.left + pad);
    return {
      aria: el.getAttribute("aria-checked"),
      rtl,
      at: Math.round((fromStart / inner) * 1000) / 1000,
      inside: h.left >= t.left - 0.5 && h.right <= t.right + 0.5,
      x: h.left,
    };
  });

/**
 * Click an element and report what the browser actually started: Angular's change detection runs first
 * (`settle()`), so the attribute a reader is told is read before any frame is painted, and the transitions
 * are the ones running on the element and its first child.
 */
const clickAndRun = (page, sel, attr) =>
  page.evaluate(
    async ([s, a]) => {
      const el = document.querySelector(s);
      el.click();
      await window.kxHarness.settle();
      const nodes = [el, ...el.children];
      return {
        attr: el.getAttribute(a),
        runs: nodes
          .flatMap((n) => n.getAnimations())
          .map((an) => ({ p: an.transitionProperty, ms: Number(an.effect.getComputedTiming().activeDuration), ease: an.effect.getTiming().easing })),
      };
    },
    [sel, attr],
  );

/* ── timing ─────────────────────────────────────────────────────────────── */
/**
 * The contract, per component, as the stylesheet declares it and as the browser runs it. A property named in
 * `expect` must carry that duration; `standard` is checked on every entry, so an easing swap cannot hide.
 */
const CONTRACT = [
  { label: "Switch track", sel: () => SEL.switch("off"), expect: { "background-color": INSTANT, "box-shadow": INSTANT } },
  { label: "Switch thumb", sel: () => SEL.thumb("off"), expect: { "inset-inline-start": INSTANT } },
  { label: "Checkbox box", sel: () => SEL.checkbox("unchecked"), expect: { "background-color": FAST, "border-color": FAST, color: FAST, "box-shadow": INSTANT } },
  { label: "Checkbox glyph", sel: () => SEL.glyph("checked"), expect: { opacity: FAST } },
  { label: "Radio ring", sel: () => SEL.radio("unchecked"), expect: { "border-color": FAST, "box-shadow": INSTANT } },
  { label: "Radio dot", sel: () => SEL.dot("checked"), expect: { opacity: FAST } },
  { label: "Toggle", sel: () => SEL.toggle("off"), expect: { "background-color": FAST, color: FAST, "box-shadow": INSTANT } },
  { label: "ToggleGroup item", sel: () => SEL.groupItem("multi-off"), expect: { "background-color": FAST, color: FAST, "box-shadow": INSTANT } },
];

async function timing(theme) {
  for (const reduce of [false, true]) {
    const ctx = await browser.newContext({ reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await open(ctx, theme);
    const tag = `${theme}${reduce ? " reduced" : ""}`;
    for (const { label, sel, expect } of CONTRACT) {
      const declared = await style(page, sel());
      if (reduce) {
        check(declared.transitionProperty === "none", `${tag} ${label} carries its own reduced form (transition: none)`, declared.transitionProperty);
        continue;
      }
      const got = tiers(declared);
      const wrong = Object.entries(expect).filter(([p, want]) => Math.abs((got[p] ?? -1) - want) > 1);
      check(wrong.length === 0, `${tag} ${label}: ${Object.entries(expect).map(([p, v]) => `${p} ${v}ms`).join(", ")}`, `${declared.transitionProperty} / ${declared.transitionDuration}`);
      check(easings(declared).every((e) => e === STANDARD), `${tag} ${label} on standard easing`, declared.transitionTimingFunction);
    }

    /* What runs on a real activation, per component and per role. */
    const sw = await clickAndRun(page, SEL.switch("off"), "aria-checked");
    const cb = await clickAndRun(page, SEL.checkbox("unchecked"), "aria-checked");
    const tg = await clickAndRun(page, SEL.toggle("off"), "aria-pressed");
    if (!reduce) {
      check(sw.attr === "true", `${tag} Switch aria-checked changes before the next frame`, `aria-checked=${sw.attr}`);
      const thumbRun = sw.runs.find((r) => /^(left|right|inset-inline-start)$/.test(r.p));
      const trackRun = sw.runs.find((r) => r.p === "background-color");
      check(thumbRun && Math.abs(thumbRun.ms - INSTANT) <= 1, `${tag} the running Switch thumb transition lasts ${INSTANT}ms`, thumbRun ? `${thumbRun.p} ${thumbRun.ms}ms` : "none ran");
      check(trackRun && Math.abs(trackRun.ms - INSTANT) <= 1, `${tag} the running Switch track transition lasts ${INSTANT}ms`, trackRun ? `${trackRun.ms}ms` : "none ran");
      check(cb.attr === "true", `${tag} Checkbox aria-checked changes before the next frame`, `aria-checked=${cb.attr}`);
      const cbColour = cb.runs.find((r) => r.p === "background-color");
      const cbGlyph = cb.runs.find((r) => r.p === "opacity");
      check(cbColour && Math.abs(cbColour.ms - FAST) <= 1, `${tag} the running Checkbox fill transition lasts ${FAST}ms`, cbColour ? `${cbColour.ms}ms` : "none ran");
      check(cbGlyph && Math.abs(cbGlyph.ms - FAST) <= 1, `${tag} the Checkbox glyph fades in over ${FAST}ms`, cbGlyph ? `${cbGlyph.ms}ms` : "none ran");
      check(tg.attr === "true", `${tag} Toggle aria-pressed changes before the next frame`, `aria-pressed=${tg.attr}`);
      const tgColour = tg.runs.find((r) => r.p === "background-color");
      check(tgColour && Math.abs(tgColour.ms - FAST) <= 1, `${tag} the running Toggle colour transition lasts ${FAST}ms`, tgColour ? `${tgColour.ms}ms` : "none ran");
    } else {
      const quiet = [...sw.runs, ...cb.runs, ...tg.runs];
      check(sw.attr === "true" && cb.attr === "true" && tg.attr === "true", `${tag} activation still changes state`, `switch ${sw.attr}, checkbox ${cb.attr}, toggle ${tg.attr}`);
      check(quiet.length === 0, `${tag} activation runs no transition`, quiet.map((r) => `${r.p} ${r.ms}ms`).join(", ") || "none");
      const r = await reading(page, SEL.switch("off"));
      check(r.at > 0.99 && r.inside, `${tag} the thumb is at the end in the same frame`, `at ${r.at}`);
      const glyph = await style(page, SEL.glyph("unchecked"), ["opacity"]);
      check(glyph.opacity === "1", `${tag} the Checkbox glyph is fully shown at once`, `opacity ${glyph.opacity}`);
    }

    /* The mixed checkbox: its own glyph, and no tick left behind on the way out. */
    if (!reduce) {
      const mixed = await page.evaluate(
        async ([box, tick, dash]) => {
          const el = document.querySelector(box);
          const vis = (s) => getComputedStyle(document.querySelector(s)).display !== "none";
          const before = { aria: el.getAttribute("aria-checked"), tick: vis(tick), dash: vis(dash) };
          el.click();
          await window.kxHarness.settle();
          return { before, after: { aria: el.getAttribute("aria-checked"), tick: vis(tick), dash: vis(dash) } };
        },
        [SEL.checkbox("mixed"), SEL.glyph("mixed") + " .kx-checkbox__tick", SEL.glyph("mixed") + " .kx-checkbox__dash"],
      );
      check(
        mixed.before.aria === "mixed" && mixed.before.dash && !mixed.before.tick,
        `${tag} a mixed Checkbox shows the dash and not the tick`,
        `aria-checked=${mixed.before.aria}, dash ${mixed.before.dash}, tick ${mixed.before.tick}`,
      );
      check(
        mixed.after.aria === "true" && mixed.after.tick && !mixed.after.dash,
        `${tag} activating it resolves to checked and swaps the glyph in the same frame`,
        `aria-checked=${mixed.after.aria}, tick ${mixed.after.tick}, dash ${mixed.after.dash}`,
      );
    }
    await ctx.close();
  }
}

/* ── travel ─────────────────────────────────────────────────────────────── */
/** Click a switch and record `aria-checked` and the thumb's offset every animation frame for a while. */
const sampleTravel = (page, sel) =>
  page.evaluate(
    ([s, span]) =>
      new Promise((resolve) => {
        const el = document.querySelector(s);
        const t = el.getBoundingClientRect();
        const th = el.firstElementChild;
        const cs = getComputedStyle(el);
        const rtl = cs.direction === "rtl";
        const pad = Number.parseFloat(cs.paddingInlineStart) + Number.parseFloat(cs.borderInlineStartWidth);
        const inner = t.width - th.getBoundingClientRect().width - 2 * pad;
        const at = () => {
          const h = th.getBoundingClientRect();
          return (rtl ? t.right - pad - h.right : h.left - (t.left + pad)) / inner;
        };
        const frames = [{ aria: el.getAttribute("aria-checked"), at: at(), x: th.getBoundingClientRect().left }];
        el.click();
        const start = performance.now();
        const step = () => {
          frames.push({ aria: el.getAttribute("aria-checked"), at: at(), x: th.getBoundingClientRect().left });
          if (performance.now() - start < span) requestAnimationFrame(step);
          else resolve({ frames, rtl });
        };
        requestAnimationFrame(step);
      }),
    [sel, INSTANT + 120],
  );

async function travel(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, theme);
  // The page itself stays left-to-right: `ltr-off` and `rtl-off` are switches in subtrees that override it,
  // so a switch that read an ancestor's direction rather than its own would be caught here.
  for (const key of ["inherit-off", "ltr-off", "rtl-off"]) {
    const { frames, rtl } = await sampleTravel(page, SEL.switch(key));
    const [before, ...after] = frames;
    const ats = after.map((f) => f.at);
    const mid = ats.filter((a) => a > 0.02 && a < 0.98);
    const forward = ats.every((a, i) => i === 0 || a >= ats[i - 1] - 0.001);
    const bounded = ats.every((a) => a >= -0.001 && a <= 1.001);
    const label = `${theme} ${key} (${rtl ? "rtl" : "ltr"})`;
    check(before.aria === "false" && before.at < 0.01, `${label} starts off at the inline start`, `aria-checked=${before.aria}, at ${before.at.toFixed(3)}`);
    check(after.every((f) => f.aria === "true"), `${label} announces on from the first frame of the move`, after.map((f) => f.aria).join(" "));
    check(mid.length >= 1, `${label} is seen partway: the thumb travels rather than jumps`, `${mid.length} of ${ats.length} frames between the ends`);
    check(forward && bounded, `${label} only moves forward and never passes either end`, ats.map((a) => a.toFixed(2)).join(" "));
    check(Math.abs(ats.at(-1) - 1) < 0.02, `${label} settles at the inline end`, `at ${ats.at(-1).toFixed(3)}`);
    const xs = after.map((f) => f.x);
    check(xs.at(-1) < xs[0] === rtl, `${label} travels ${rtl ? "leftward" : "rightward"} on screen`, `x ${xs[0].toFixed(1)} → ${xs.at(-1).toFixed(1)}`);
  }
  await ctx.close();

  /* The radio dot stays centred over its control whichever way the page runs. It is placed absolutely inside
     the control, so a 50% logical inset paired with a physical `translate` would centre it on an LTR page and
     pull it out of the control on an RTL one — which no colour or timing check would notice. */
  for (const rtl of [false, true]) {
    const dirCtx = await browser.newContext();
    const dirPage = await dirCtx.newPage();
    await dirPage.goto(`${base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
    await waitForAngular(dirPage);
    await dirPage.waitForTimeout(SETTLE);
    const geometry = await dirPage.evaluate(
      ([inputSel, dotSel]) => {
        const i = document.querySelector(inputSel).getBoundingClientRect();
        const d = document.querySelector(dotSel).getBoundingClientRect();
        return {
          dx: d.left + d.width / 2 - (i.left + i.width / 2),
          dy: d.top + d.height / 2 - (i.top + i.height / 2),
          inside: d.left >= i.left - 0.5 && d.right <= i.right + 0.5 && d.top >= i.top - 0.5 && d.bottom <= i.bottom + 0.5,
          dir: getComputedStyle(document.querySelector(dotSel)).direction,
        };
      },
      [SEL.radio("checked"), SEL.dot("checked")],
    );
    const where = `${theme} ${rtl ? "rtl" : "ltr"} (${geometry.dir})`;
    check(Math.abs(geometry.dx) <= 1 && Math.abs(geometry.dy) <= 1, `${where}: the radio dot is centred on its control`, `off by ${geometry.dx.toFixed(1)}, ${geometry.dy.toFixed(1)}px`);
    check(geometry.inside, `${where}: the radio dot is drawn inside its control`, `inside=${geometry.inside}`);
    await dirCtx.close();
  }
}

/* ── pointer ────────────────────────────────────────────────────────────── */
async function pointer(theme) {
  const ctx = await browser.newContext({ hasTouch: false });
  const page = await open(ctx, theme);
  const LAYERED = [
    { label: "Checkbox", sel: SEL.checkbox("unchecked") },
    { label: "Radio", sel: SEL.radio("unchecked") },
    { label: "Toggle", sel: SEL.toggle("off") },
    { label: "Switch", sel: SEL.switch("off") },
  ];
  for (const { label, sel } of LAYERED) {
    const rest = await style(page, sel, ["boxShadow"]);
    await page.locator(sel).first().hover();
    await page.waitForTimeout(SETTLE);
    const hover = await style(page, sel, ["boxShadow"]);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const press = await style(page, sel, ["boxShadow"]);
    await page.mouse.up();
    check(HOVER.test(hover.boxShadow), `${theme} ${label} lays the 8% state layer on hover`, hover.boxShadow);
    check(PRESS.test(press.boxShadow), `${theme} ${label} deepens it to 14% while pressed`, press.boxShadow);
    check(hover.boxShadow !== rest.boxShadow, `${theme} ${label} has no layer at rest`, rest.boxShadow);
    const tier = tiers(await style(page, sel))["box-shadow"];
    check(Math.abs(tier - INSTANT) <= 1, `${theme} ${label} answers the pointer on ${INSTANT}ms`, `box-shadow ${tier}ms`);
  }
  /* Disabled: no layer, and activation changes nothing. */
  for (const [label, sel, attr] of [
    ["Switch", SEL.switch("disabled"), "aria-checked"],
    ["Checkbox", SEL.checkbox("disabled"), "aria-checked"],
    ["Toggle", SEL.toggle("disabled"), "aria-pressed"],
  ]) {
    await page.locator(sel).first().hover({ force: true });
    await page.waitForTimeout(SETTLE);
    const hover = await style(page, sel, ["boxShadow"]);
    const before = await page.locator(sel).first().getAttribute(attr);
    // A real pointer click, not a dispatched event: the control is a native `disabled` button, so the
    // browser delivers no click at all — which is the behaviour a reader actually has. A dispatched event
    // would bypass that gate and measure something no user can do.
    const native = await page.locator(sel).first().evaluate((el) => el.disabled);
    await page.locator(sel).first().click({ force: true, timeout: 2000 }).catch(() => {});
    await settleAngular(page);
    const after = await page.locator(sel).first().getAttribute(attr);
    check(!HOVER.test(hover.boxShadow) && !PRESS.test(hover.boxShadow), `${theme} a disabled ${label} lays no state layer`, hover.boxShadow);
    check(native === true, `${theme} a disabled ${label} is disabled in the DOM, so the browser blocks activation`, `disabled=${native}`);
    check(before === after, `${theme} a disabled ${label} does not answer a click`, `${attr} ${before} → ${after}`);
  }
  /* The disabled radio's label carries the wash too. The input sits inside a wrapper now, so the rule that
     paints it is keyed on that wrapper: a label left at full opacity would say nothing about being disabled,
     and no timing or colour check above touches it. */
  {
    const label = await style(page, `kx-radio[data-kx-case="disabled-checked"] .kx-radio__label`, ["opacity", "cursor"]);
    const enabled = await style(page, `kx-radio[data-kx-case="checked"] .kx-radio__label`, ["opacity", "cursor"]);
    check(
      Number.parseFloat(label.opacity) < Number.parseFloat(enabled.opacity) && label.cursor === "not-allowed",
      `${theme} a disabled radio's label is washed out and not a pointer target`,
      `opacity ${label.opacity} vs ${enabled.opacity}, cursor ${label.cursor}`,
    );
  }
  /* The disabled single-select ToggleGroup item is its own case: there `.kx-toggle` is a `<label>`, and a
     label never matches `:disabled`, so the `:not(:disabled)` the button branch relies on does not gate it. */
  {
    const label = SEL.groupItem("single-disabled");
    const input = SEL.groupInput("single-disabled");
    const rest = await style(page, label, ["boxShadow"]);
    await page.locator(label).first().hover({ force: true });
    await page.waitForTimeout(SETTLE);
    const hover = await style(page, label, ["boxShadow"]);
    await page.mouse.down();
    await page.waitForTimeout(SETTLE);
    const press = await style(page, label, ["boxShadow"]);
    await page.mouse.up();
    await page.locator(label).first().click({ force: true, timeout: 2000 }).catch(() => {});
    await settleAngular(page);
    const chosen = await page.locator(input).first().evaluate((el) => el.checked);
    check(
      !HOVER.test(hover.boxShadow) && !PRESS.test(press.boxShadow) && hover.boxShadow === rest.boxShadow,
      `${theme} a disabled single-select group item lays no state layer`,
      `rest ${rest.boxShadow} → hover ${hover.boxShadow} → press ${press.boxShadow}`,
    );
    check(chosen === false, `${theme} a disabled single-select group item does not take the selection`, `checked=${chosen}`);
  }
  await ctx.close();
}

/* ── keyboard ───────────────────────────────────────────────────────────── */
async function keyboard(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, theme);
  /* One Tab before the loop, to put the page in keyboard modality. `:focus-visible` is the ring a keyboard
     reader gets, and Chromium does not match it for an element focused from script while the last input was
     a pointer — without this the first control measured reads as having no ring, which is the browser's
     answer to the wrong question. */
  await page.keyboard.press("Tab");
  /* What `--shadow-focus` actually resolves to in this run, read from a probe. Comparing the focused control
     against it rather than against "something is painted": with the rule deleted the browser falls back to
     its own default outline, which is visible and would let a check for visibility pass. */
  const token = await page.evaluate(() => {
    const el = document.createElement("div");
    el.style.cssText = "box-shadow: var(--shadow-focus)";
    document.body.append(el);
    const v = getComputedStyle(el).boxShadow;
    el.remove();
    return v;
  });
  check(VISIBLE_SHADOW.test(token), `${theme} --shadow-focus is a ring a reader can see`, token);
  for (const [label, sel, attr] of [
    ["Switch", SEL.switch("off"), "aria-checked"],
    ["Checkbox", SEL.checkbox("unchecked"), "aria-checked"],
    ["Toggle", SEL.toggle("off"), "aria-pressed"],
  ]) {
    const el = page.locator(sel).first();
    // Read the resting painting first: the Checkbox and the Toggle both rest on a transparent shadow, so a
    // check for "not none" would stay green with the `:focus-visible` rule deleted.
    const rest = await style(page, sel, ["boxShadow", "outlineWidth"]);
    await el.focus();
    // The ring arrives on a transition, so it has to be read once it has landed: read in the same frame as
    // the focus, the Checkbox reports the transition's first frame — two transparent entries — and a check
    // for a visible ring fails on motion rather than on painting.
    await page.waitForTimeout(SETTLE);
    const ring = await style(page, sel, ["boxShadow", "outlineWidth"]);
    check(
      ring.boxShadow !== rest.boxShadow || ring.outlineWidth !== rest.outlineWidth,
      `${theme} focus changes what ${label} paints`,
      `rest ${rest.boxShadow} / outline ${rest.outlineWidth} → ${ring.boxShadow} / outline ${ring.outlineWidth}`,
    );
    check(
      ring.boxShadow === token,
      `${theme} ${label} draws the package's own focus ring`,
      `${ring.boxShadow} / outline ${ring.outlineWidth} — --shadow-focus is ${token}`,
    );
    await page.keyboard.press("Space");
    await settleAngular(page);
    check((await el.getAttribute(attr)) === "true", `${theme} Space activates ${label}`, `${attr}=${await el.getAttribute(attr)}`);
  }
  /* The radio group: the browser's own arrow-key selection. These are native radios, so the behaviour is
     the platform's — what is measured here is that the package has not taken it away, and that the group's
     model follows the keyboard (the dot is painted from `checked`, which Angular writes back). */
  const chosen = () =>
    page.evaluate(
      (sels) => Object.entries(sels).find(([, s]) => document.querySelector(s)?.checked)?.[0] ?? null,
      { unchecked: SEL.radio("unchecked"), checked: SEL.radio("checked"), third: SEL.radio("third") },
    );
  const press = async (key) => {
    await page.keyboard.press(key);
    await settleAngular(page);
    return chosen();
  };
  await page.locator(SEL.radio("checked")).first().focus();
  await settleAngular(page);
  check((await chosen()) === "checked", `${theme} the radio group starts on its bound value`, `${await chosen()}`);
  check((await press("ArrowDown")) === "third", `${theme} ArrowDown moves the radio selection to the next item`, `${await chosen()}`);
  check((await press("ArrowUp")) === "checked", `${theme} ArrowUp moves it back`, `${await chosen()}`);
  const dotTier = tiers(await style(page, SEL.dot("checked")))["opacity"];
  check(Math.abs(dotTier - FAST) <= 1, `${theme} the radio dot still fades on ${FAST}ms after a keyboard move`, `opacity ${dotTier}ms`);
  await ctx.close();

  /* The inline arrows follow the group's own direction: ArrowRight takes the NEXT item in a left-to-right
     page and the PREVIOUS one in a right-to-left page. A group that hard-coded left and right would be
     caught here, where the only thing that changed is the page's `dir`. */
  for (const rtl of [false, true]) {
    const dirCtx = await browser.newContext();
    const dirPage = await dirCtx.newPage();
    await dirPage.goto(`${base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
    await waitForAngular(dirPage);
    await dirPage.waitForTimeout(SETTLE);
    await dirPage.locator(SEL.radio("checked")).first().focus();
    await settleAngular(dirPage);
    await dirPage.keyboard.press("ArrowRight");
    await settleAngular(dirPage);
    const landed = await dirPage.evaluate(
      (sels) => Object.entries(sels).find(([, s]) => document.querySelector(s)?.checked)?.[0] ?? null,
      { unchecked: SEL.radio("unchecked"), checked: SEL.radio("checked"), third: SEL.radio("third") },
    );
    const want = rtl ? "unchecked" : "third";
    check(landed === want, `${theme} ${rtl ? "rtl" : "ltr"}: ArrowRight takes the ${rtl ? "previous" : "next"} radio`, `landed on ${landed}`);
    await dirCtx.close();
  }
}

/* ── forced colours ─────────────────────────────────────────────────────── */
async function forced(theme) {
  const ctx = await browser.newContext({ forcedColors: "active" });
  const page = await open(ctx, theme);
  // What the system resolves CanvasText and GrayText to in this run, read from a probe that opts out of the
  // repaint — the comparison is against the system's own values, not a hard-coded pair.
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
  check(sys.enabled !== sys.disabled, `${theme} forced colours: the system's CanvasText and GrayText differ`, `${sys.enabled} vs ${sys.disabled}`);
  for (const key of ["off", "on", "disabled", "disabled-on"]) {
    const track = await style(page, SEL.switch(key), ["backgroundColor"]);
    const thumb = await style(page, SEL.thumb(key), ["backgroundColor"]);
    const want = key.startsWith("disabled") ? "disabled" : "enabled";
    check(
      thumb.backgroundColor === sys[want],
      `${theme} forced colours: the ${key} thumb is ${want === "disabled" ? "GrayText" : "CanvasText"}`,
      `thumb ${thumb.backgroundColor}, CanvasText ${sys.enabled}, GrayText ${sys.disabled}`,
    );
    check(thumb.backgroundColor !== track.backgroundColor, `${theme} forced colours: the ${key} thumb is drawn against its track`, `thumb ${thumb.backgroundColor}, track ${track.backgroundColor}`);
  }
  const dot = await style(page, SEL.dot("checked"), ["backgroundColor", "opacity"]);
  check(dot.backgroundColor === sys.enabled && dot.opacity === "1", `${theme} forced colours: a chosen radio still shows its dot`, `${dot.backgroundColor} at opacity ${dot.opacity}`);
  const ringRest = await style(page, SEL.switch("off"), ["outlineWidth", "outlineStyle", "boxShadow"]);
  await page.locator(SEL.switch("off")).first().focus();
  const ring = await style(page, SEL.switch("off"), ["outlineWidth", "outlineStyle", "boxShadow"]);
  check(
    ring.outlineStyle !== ringRest.outlineStyle || ring.outlineWidth !== ringRest.outlineWidth || ring.boxShadow !== ringRest.boxShadow,
    `${theme} forced colours: focus is still drawn`,
    `rest outline ${ringRest.outlineWidth} ${ringRest.outlineStyle} → ${ring.outlineWidth} ${ring.outlineStyle}, shadow ${ring.boxShadow}`,
  );
  await ctx.close();
}

/* ── rapid input ────────────────────────────────────────────────────────── */
async function rapid(theme) {
  const ctx = await browser.newContext();
  const page = await open(ctx, theme);
  const burst = await page.evaluate(
    async (s) => {
      const el = document.querySelector(s);
      for (let i = 0; i < 7; i++) el.click();
      await window.kxHarness.settle();
      return el.getAttribute("aria-checked");
    },
    SEL.switch("off"),
  );
  await page.waitForTimeout(SETTLE);
  const landed = await reading(page, SEL.switch("off"));
  check(burst === "true" && landed.at > 0.99, `${theme} seven clicks land on the last input`, `aria-checked=${burst}, at ${landed.at}`);

  /* A click back while the thumb is still moving: it must reverse and settle at the end its state names. */
  const reversal = await page.evaluate(
    async ([s, half]) => {
      const el = document.querySelector(s);
      el.click();
      await new Promise((r) => setTimeout(r, half));
      const mid = el.getAttribute("aria-checked");
      el.click();
      await window.kxHarness.settle();
      return { mid, after: el.getAttribute("aria-checked") };
    },
    [SEL.switch("on"), INSTANT / 2],
  );
  await page.waitForTimeout(SETTLE);
  const back = await reading(page, SEL.switch("on"));
  check(reversal.after === "true" && back.at > 0.99 && back.inside, `${theme} a reversal mid-travel settles where aria-checked says`, `mid ${reversal.mid} → ${reversal.after}, at ${back.at}`);
  await ctx.close();
}

/* ── matrix ─────────────────────────────────────────────────────────────── */
const WIDTHS = [320, 390, 768, 1280];
async function matrix() {
  let cells = 0;
  for (const theme of ["light", "dark"]) {
    for (const rtl of [false, true]) {
      for (const text of [100, 200]) {
        const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
        const page = await ctx.newPage();
        if (text === 200) {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send("Page.enable");
          await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
        }
        await page.goto(`${base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
        await waitForAngular(page);
        await page.waitForTimeout(SETTLE);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await page.waitForTimeout(120);
          const cell = `${width}px ${theme} ${rtl ? "rtl" : "ltr"} ${text}%`;
          const state = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            offscreen: [...document.querySelectorAll("kx-switch, kx-checkbox, kx-radio, button[kxToggle], kx-toggle-group-item")]
              .map((el) => el.getBoundingClientRect())
              .filter((r) => r.left < -0.5 || r.right > document.documentElement.clientWidth + 0.5).length,
            thumbs: [...document.querySelectorAll("kx-switch")].map((host) => {
              const el = host.querySelector("button");
              const th = host.querySelector(".kx-switch__thumb");
              const t = el.getBoundingClientRect();
              const h = th.getBoundingClientRect();
              const cs = getComputedStyle(el);
              const pad = Number.parseFloat(cs.paddingInlineStart) + Number.parseFloat(cs.borderInlineStartWidth);
              const inner = t.width - h.width - 2 * pad;
              const at = (cs.direction === "rtl" ? t.right - pad - h.right : h.left - (t.left + pad)) / inner;
              return { on: el.getAttribute("aria-checked") === "true", at, inside: h.left >= t.left - 0.5 && h.right <= t.right + 0.5 };
            }),
          }));
          const placed = state.thumbs.every((t) => t.inside && Math.abs(t.at - (t.on ? 1 : 0)) < 0.08);
          check(state.overflow <= 1 && state.offscreen === 0 && placed, `matrix ${cell}`, `overflow ${state.overflow}px, ${state.offscreen} off screen, thumbs ${state.thumbs.map((t) => `${t.on ? "on" : "off"}@${t.at.toFixed(2)}${t.inside ? "" : " OUTSIDE"}`).join(" ")}`);
          cells++;
        }
        await ctx.close();
      }
    }
  }
  check(cells === 32, `matrix: ${cells} cells (4 widths × 2 themes × 2 directions × 2 text sizes) held`, `${cells} cells`);
}

/* ── run ────────────────────────────────────────────────────────────────── */
try {
  for (const theme of ["light", "dark"]) {
    if (runs("timing")) await timing(theme);
    if (runs("travel")) await travel(theme);
    if (runs("pointer")) await pointer(theme);
    if (runs("keyboard")) await keyboard(theme);
    if (runs("forced")) await forced(theme);
    if (runs("rapid")) await rapid(theme);
  }
  if (runs("matrix")) await matrix();
} finally {
  await browser.close();
  close();
  rmSync(dir, { recursive: true, force: true });
}

console.log(report.join("\n"));
if (failures.length) {
  console.error(`\nangular-selection-motion: ${failures.length} of ${report.length} checks failed\n${failures.map((f) => `  ✗ ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nangular-selection-motion ok — ${report.length} checks: the Angular selection controls hold the motion contract in a real browser.`);
