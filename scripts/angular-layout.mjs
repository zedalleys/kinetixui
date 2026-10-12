/**
 * angular-layout.mjs — @kinetixui/angular's layout, pointer and scroll components, live in real Chromium.
 *
 *   pnpm build:tokens && node scripts/angular-layout.mjs
 *   node scripts/angular-layout.mjs --only=interaction      one pass (interaction | rtl | largeText | reducedMotion)
 *
 * This tranche is four components whose behaviour is mostly geometry: a scroll area that draws its own
 * scrollbars over native scrolling, a resizable panel group, a carousel and a comparison slider. What goes wrong
 * with them happens between the code and the browser's layout: a thumb that does not follow content that grew, a
 * drag that jumps on the first move or keeps running after a release outside, a handle that ignores its limits, a
 * key or a swipe that runs the wrong way in a right-to-left region, focus dropped to the page when a slide turns
 * inert, an animation that ignores reduced motion. So the subjects (src/fixtures/layout.ts) are driven with a real
 * keyboard, a mouse, a pen and touch (Chrome DevTools Protocol input, so the browser makes the pointer events, with
 * their real `pointerType`), resized while dragging, disabled while dragging and removed while dragging, in the
 * four direction cases, at four widths and 200% text, and with reduced motion.
 *
 * The page is instrumented before Angular starts (`INSTRUMENT` below): every pointermove / pointerup /
 * pointercancel / lostpointercapture listener added anywhere is recorded until it is removed, and every
 * ResizeObserver records what it is watching. That is how "listeners only while a drag runs", "nothing left behind
 * on destroy" and "no observer watching a removed node" are measured rather than assumed. A ResizeObserver loop
 * error anywhere in a run fails it.
 *
 * The conventions are scripts/angular-collections.mjs's and their rules hold: each pass is a marked passage
 * (`kx-verify: <kind>`, read by gen-verification.mjs), the components a passage claims are the KinetixUI symbols
 * named in it, and `assertClaims()` fails the run before a browser opens if a passage names a component it does
 * not measure or measures one it does not name.
 *
 * Nothing here is jsdom: packages/ui-angular/src/lib/layout.spec.ts checks the position rules and the drag
 * lifecycle as logic, and is not evidence about a browser.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs; KX_ANGULAR_HARNESS_DIR
 * reuses a harness already built by packages/ui-angular/browser/build.mjs.
 */
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { coverageForRoot } from "./covered-slugs.mjs";
import { isIntermediate } from "./motion-states.mjs";
import { buildAngularHarness, decode, serveStatic, settleAngular, waitForAngular } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(`${root}/components.manifest.json`, "utf8"));
const { coveredSlugs } = coverageForRoot(root);
const implemented = Object.keys(manifest.components).filter((s) => manifest.components[s].platforms.includes("Angular"));
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const runs = (pass) => !ONLY || ONLY === pass;
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/* ── the claim check (angular-browser.mjs's, against this file) ──────────── */

function passage(kind) {
  const start = self.indexOf(`kx-verify: ${kind}\n`);
  if (start === -1) throw new Error(`angular-layout: no kx-verify: ${kind} passage`);
  const next = self.indexOf("kx-verify:", start + 12);
  return self.slice(start, next === -1 ? undefined : next);
}
const slugOf = (symbol) => {
  const hit = [...coveredSlugs(symbol, "Angular")];
  if (hit.length !== 1) throw new Error(`angular-layout: ${symbol} does not name exactly one component (${hit.join(", ") || "none"})`);
  return hit[0];
};
function assertClaims(kind, subjects) {
  const named = coveredSlugs(passage(kind), "Angular");
  const measured = new Set(subjects.map((s) => slugOf(s.component)));
  const over = [...named].filter((s) => !measured.has(s));
  const under = [...measured].filter((s) => !named.has(s));
  const unimplemented = [...measured].filter((s) => !implemented.includes(s));
  if (over.length || under.length || unimplemented.length) {
    console.error(
      `angular-layout: the ${kind} claim and its subjects disagree\n` +
        (over.length ? `  named but not measured: ${over.join(", ")}\n` : "") +
        (under.length ? `  measured but not named: ${under.join(", ")}\n` : "") +
        (unimplemented.length ? `  measured but not an Angular implementation in the manifest: ${unimplemented.join(", ")}\n` : ""),
    );
    process.exit(1);
  }
}

/* ── the page ────────────────────────────────────────────────────────────── */

/**
 * Runs in the page before anything else. Records the pointer listeners that are live (added and not yet removed),
 * the pointer types the page received, what every ResizeObserver watches, and ResizeObserver loop errors.
 */
function INSTRUMENT() {
  const kx = (window.__kx = { live: [], types: [], observers: new Set(), loops: 0 });
  const WATCH = new Set(["pointermove", "pointerup", "pointercancel", "lostpointercapture"]);
  const capture = (o) => (typeof o === "boolean" ? o : !!(o && o.capture));
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  const same = (r, t, type, fn, c) => r.target === t && r.type === type && r.fn === fn && r.capture === c;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    // Playwright's own hit-target check (installed for a locator action) is the harness's, not the page's
    const harness = WATCH.has(type) && /HitTargetInterceptor/.test(String(new Error().stack));
    if (WATCH.has(type) && fn && !harness && !kx.live.some((r) => same(r, this, type, fn, capture(o)))) {
      kx.live.push({ target: this, type, fn, capture: capture(o), where: this === document ? "document" : this === window ? "window" : "element" });
    }
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    const i = kx.live.findIndex((r) => same(r, this, type, fn, capture(o)));
    if (i >= 0) kx.live.splice(i, 1);
    return remove.call(this, type, fn, o);
  };
  add.call(window, "pointerdown", (e) => kx.types.push(e.pointerType), true);
  add.call(window, "error", (e) => {
    if (/ResizeObserver loop/.test(String(e.message))) kx.loops++;
  });
  const Native = window.ResizeObserver;
  window.ResizeObserver = class extends Native {
    constructor(cb) {
      super(cb);
      this.__targets = new Set();
      kx.observers.add(this);
    }
    observe(t, o) {
      this.__targets.add(t);
      return super.observe(t, o);
    }
    unobserve(t) {
      this.__targets.delete(t);
      return super.unobserve(t);
    }
    disconnect() {
      this.__targets.clear();
      return super.disconnect();
    }
  };
  window.__kxListeners = () => kx.live.map((r) => `${r.where}:${r.type}`);
  window.__kxWatched = () => {
    let connected = 0;
    let detached = 0;
    for (const o of kx.observers) for (const t of o.__targets) t.isConnected ? connected++ : detached++;
    return { connected, detached };
  };
}

const harnessDir = buildAngularHarness("angular-layout");
const server = await serveStatic(harnessDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(96)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  return ok;
};
const pageErrors = [];

async function open(context, { theme = "light", dir = null, region = null } = {}) {
  const page = await context.newPage();
  await page.addInitScript(INSTRUMENT);
  page.on("pageerror", (e) => pageErrors.push(String(e.message).split("\n")[0]));
  page.on("console", (m) => m.type() === "error" && pageErrors.push(m.text().split("\n")[0]));
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  const q = new URLSearchParams({ fixture: "layout", theme, ...(dir ? { dir } : {}), ...(region ? { region } : {}) });
  await page.goto(`${server.base}/index.html?${q}`, { waitUntil: "load" });
  await waitForAngular(page);
  await idle(page);
  return page;
}
/** Let Angular render, then the browser paint (and any ResizeObserver deliver), so the DOM read next is current. */
async function idle(page) {
  await settleAngular(page);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await settleAngular(page);
}
async function press(page, key) {
  await page.keyboard.press(key);
  await idle(page);
}
/** Keyboard modality first, so `:focus-visible` matches as it would after a Tab. */
async function focus(page, selector) {
  await page.keyboard.press("Shift");
  await page.locator(selector).first().focus();
  await idle(page);
}
/** Click through the DOM, not the pointer — for buttons pressed while a pointer drag is held down. */
async function domClick(page, selector) {
  await page.locator(selector).first().evaluate((el) => el.click());
  await idle(page);
}
/** A real mouse click. `force` skips Playwright's own "enabled" wait, which treats aria-disabled as disabled. */
async function click(page, selector, { force = false } = {}) {
  await page.locator(selector).first().click({ force });
  await idle(page);
}
/** Wait for a scroll area's own scrolling (the browser animates keyboard and wheel scrolls) to come to rest. */
async function scrolled(page, selector) {
  await page.locator(`${selector} > .kx-scroll-area__viewport`).evaluate(
    (v) =>
      new Promise((resolve) => {
        let last = `${v.scrollTop},${v.scrollLeft}`;
        let still = 0;
        let frames = 0;
        const tick = () => {
          const now = `${v.scrollTop},${v.scrollLeft}`;
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 6 || ++frames > 180) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  await idle(page);
}
const out = (page, key) => page.locator(`output[data-kx-out="${key}"]`).textContent();
const active = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "body";
    return el.id || el.closest("[id]")?.id || el.tagName.toLowerCase();
  });
const box = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
async function rect(page, selector, { scroll = true } = {}) {
  const loc = page.locator(selector).first();
  if (scroll) await loc.scrollIntoViewIfNeeded();
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
}
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;
const f = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : String(n));
const listeners = (page) => page.evaluate(() => window.__kxListeners());
const watched = (page) => page.evaluate(() => window.__kxWatched());
const types = (page) => page.evaluate(() => [...new Set(window.__kx.types)]);
const loops = (page) => page.evaluate(() => window.__kx.loops);
const pause = (page, ms) => page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);

/**
 * A mouse drag in slow steps: each step waits, so the release is not read as a flick unless the test means one.
 * `during(i)` runs after step i with the button still down.
 */
async function slowDrag(page, from, to, { steps = 8, wait = 40, release = true, during } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    if (wait) await pause(page, wait);
    if (during) await during(i);
  }
  if (release) await page.mouse.up();
  await idle(page);
}
/** A pen drag, made by the browser from DevTools input — `pointerType: "pen"`. */
async function penDrag(page, from, to, steps = 6) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, p, buttons) =>
    cdp.send("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1, pointerType: "pen" });
  await send("mouseMoved", from, 0);
  await send("mousePressed", from, 1);
  for (let i = 1; i <= steps; i++) {
    await send("mouseMoved", { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }, 1);
    await pause(page, 30);
  }
  await send("mouseReleased", to, 0);
  await cdp.detach();
  await idle(page);
}
/** A one-finger touch drag from DevTools input; `end: "cancel"` ends it with touchcancel. */
async function touchDrag(page, from, to, { steps = 6, end = "end", during } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const at = (p) => ({ x: Math.round(p.x), y: Math.round(p.y), id: 1, radiusX: 1, radiusY: 1, force: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from)] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })] });
    await pause(page, 30);
    if (during) await during(i);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: end === "cancel" ? "touchCancel" : "touchEnd", touchPoints: [] });
  await cdp.detach();
  await idle(page);
}

async function axe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
    const r = await window.axe.run(document, opts);
    return r.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => String(n.target)) }));
  });
}

/**
 * Whether an element's focus ring is actually painted along all four of its edges: a screenshot of its box, and
 * the share of each edge's inner 1px band (corners left out) whose pixels are the ring's colour. A ring an
 * ancestor clips, or one drawn outside a box that clips it, fails on the edges it loses.
 */
async function ringPainted(page, selector) {
  const loc = page.locator(selector).first();
  const { r, colour } = await loc.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { r: { x: b.left, y: b.top, width: b.width, height: b.height }, colour: getComputedStyle(el).outlineColor };
  });
  const want = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const x = Math.round(r.x), y = Math.round(r.y), w = Math.floor(r.width), h = Math.floor(r.height);
  const shot = decode(await page.screenshot({ clip: { x, y, width: w, height: h }, animations: "disabled", caret: "hide" }));
  const px = (i, j) => {
    const o = (j * shot.w + i) * 4;
    return [shot.data[o], shot.data[o + 1], shot.data[o + 2]];
  };
  const hit = (p) => Math.hypot(p[0] - want[0], p[1] - want[1], p[2] - want[2]) < 60;
  const share = (pts) => pts.filter((p) => hit(px(...p))).length / pts.length;
  const along = (n) => Array.from({ length: Math.max(0, n - 12) }, (_, k) => k + 6);
  return {
    top: share(along(shot.w).map((i) => [i, 1])),
    bottom: share(along(shot.w).map((i) => [i, shot.h - 2])),
    start: share(along(shot.h).map((j) => [1, j])),
    end: share(along(shot.h).map((j) => [shot.w - 2, j])),
  };
}
const ringOk = (s) => Math.min(s.top, s.bottom, s.start, s.end) >= 0.85;
const ringText = (s) => `top ${f(s.top, 2)} bottom ${f(s.bottom, 2)} left ${f(s.start, 2)} right ${f(s.end, 2)}`;

/* ── reading the subjects ───────────────────────────────────────────────── */

/** A scroll area's viewport, scroll position and drawn bars. */
const area = (page, selector) =>
  page.locator(selector).first().evaluate((host) => {
    const v = host.querySelector(":scope > .kx-scroll-area__viewport");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    const bar = (o) => host.querySelector(`:scope > .kx-scroll-area__scrollbar[data-orientation="${o}"]`);
    const y = bar("vertical");
    const x = bar("horizontal");
    return {
      tabindex: v.getAttribute("tabindex"),
      role: v.getAttribute("role"),
      label: v.getAttribute("aria-label"),
      top: v.scrollTop,
      left: v.scrollLeft,
      rangeY: v.scrollHeight - v.clientHeight,
      rangeX: v.scrollWidth - v.clientWidth,
      ratioY: v.clientHeight / v.scrollHeight,
      ratioX: v.clientWidth / v.scrollWidth,
      view: r(v),
      y: y && { bar: r(y), thumb: r(y.firstElementChild) },
      x: x && { bar: r(x), thumb: r(x.firstElementChild) },
      corner: !!host.querySelector(":scope > .kx-scroll-area__corner"),
      dragging: host.hasAttribute("data-dragging"),
    };
  });
const setScroll = (page, selector, { top, left }) =>
  page.locator(`${selector} > .kx-scroll-area__viewport`).evaluate(
    (v, { top, left }) => {
      if (top !== undefined) v.scrollTop = top;
      if (left !== undefined) v.scrollLeft = left;
    },
    { top, left },
  );
/** The thumb's logical progress along its bar, 0–1 (from the inline start, or the top). */
function progress(bar, thumb, axis, rtl = false) {
  const free = axis === "y" ? bar.height - thumb.height : bar.width - thumb.width;
  const at = axis === "y" ? thumb.top - bar.top : rtl ? bar.right - thumb.right : thumb.left - bar.left;
  return free > 0 ? at / free : 0;
}
const expectedThumb = (ratio, track, page16 = 16) => Math.max(ratio * track, 1.25 * page16);

/** A resizable group's handle attributes and its panels' sizes along the axis. */
const group = (page, groupSel, handleSel) =>
  page.evaluate(
    ({ groupSel, handleSel }) => {
      const g = document.querySelector(groupSel);
      const h = document.querySelector(handleSel);
      const vertical = g.getAttribute("data-direction") === "vertical";
      const len = (el) => (vertical ? el.getBoundingClientRect().height : el.getBoundingClientRect().width);
      const panels = [...g.querySelectorAll(":scope > kx-resizable-panel")];
      const sizes = panels.map(len);
      const a = (n) => h.getAttribute(n);
      return {
        role: a("role"),
        tabindex: a("tabindex"),
        orientation: a("aria-orientation"),
        controls: a("aria-controls"),
        now: Number(a("aria-valuenow")),
        min: Number(a("aria-valuemin")),
        max: Number(a("aria-valuemax")),
        label: a("aria-label"),
        disabled: a("aria-disabled"),
        dragging: h.hasAttribute("data-dragging"),
        groupDragging: g.hasAttribute("data-dragging"),
        sizes,
        total: len(g),
        share: sizes.map((s) => (100 * s) / sizes.reduce((x, y) => x + y, 0)),
        rects: panels.map((p) => {
          const r = p.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }),
        focusShadow: getComputedStyle(h).boxShadow,
      };
    },
    { groupSel, handleSel },
  );

/** A carousel's slides, where its track is, what is inert, what it announced and its controls' state. */
const carousel = (page, selector) =>
  page.locator(selector).first().evaluate((c) => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    const own = (el) => el.closest("kx-carousel") === c;
    const viewport = [...c.querySelectorAll(".kx-carousel__viewport")].find(own);
    const track = viewport.querySelector(".kx-carousel__track");
    const slides = [...c.querySelectorAll("kx-carousel-item")].filter(own);
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform === "none" ? undefined : getComputedStyle(track).transform);
    const prev = [...c.querySelectorAll(".kx-carousel__previous")].find(own);
    const next = [...c.querySelectorAll(".kx-carousel__next")].find(own);
    return {
      view: r(viewport),
      slides: slides.map(r),
      inert: slides.map((s) => s.hasAttribute("inert")),
      labels: slides.map((s) => s.getAttribute("aria-label")),
      roles: slides.map((s) => `${s.getAttribute("role")}/${s.getAttribute("aria-roledescription")}`),
      tx: m.m41,
      ty: m.m42,
      live: c.querySelector(':scope > [aria-live="polite"]')?.textContent.trim() ?? null,
      prevDisabled: prev?.getAttribute("aria-disabled") ?? null,
      nextDisabled: next?.getAttribute("aria-disabled") ?? null,
      prevNative: prev?.disabled ?? null,
      dragging: c.hasAttribute("data-dragging"),
      prev: prev && r(prev),
      next: next && r(next),
      glyphDir: next ? getComputedStyle(next.querySelector(".kx-carousel__glyph")).direction : null,
      selection: String(document.getSelection()),
    };
  });
/** The slides whose box covers the viewport's inline-start edge (the slide "at" the current position). */
const startSlide = (s, rtl) => s.slides.findIndex((b, i) => !s.inert[i] && (rtl ? near(b.right, s.view.right) : near(b.left, s.view.left)));

/** The comparison slider: its input, where the divider is drawn, and the after layer's content box. */
const comparison = (page, selector = "#cs-default") =>
  page.locator(selector).first().evaluate((host) => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    const input = host.querySelector("input");
    const divider = host.querySelector(".kx-comparison-slider__divider");
    const handle = host.querySelector(".kx-comparison-slider__handle");
    const d = r(divider);
    return {
      value: Number(input.value),
      host: r(host),
      dividerX: d.left + d.width / 2,
      handle: r(handle),
      after: r(host.querySelector("[kxComparisonAfter]")),
      before: r(host.querySelector("[kxComparisonBefore]")),
      beforeLabel: r(host.querySelector(".kx-comparison-slider__label--before")),
      afterLabel: r(host.querySelector(".kx-comparison-slider__label--after")),
      handleRing: `${getComputedStyle(handle).outlineStyle} ${getComputedStyle(handle).boxShadow}`,
      focusables: [...host.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")].filter((e) => e.tabIndex >= 0).length,
    };
  });
/** Where the divider should be for a value: measured from the inline start. */
const dividerAt = (c, value, rtl) => (rtl ? c.host.right - (c.host.width * value) / 100 : c.host.left + (c.host.width * value) / 100);

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: interaction, accessibility
 *
 * The four components, driven the way a reader drives them, in an LTR page at 1024px:
 *
 * KxScrollArea — a Tab stop (a named region) only while something overflows; arrows, Page Down, Home and End
 *   and the wheel scroll it natively and the drawn thumb follows; a thumb drag moves the content by the same
 *   proportion and survives a release outside; a press on the track jumps the thumb's centre there; content that
 *   grows or shrinks and a box that is resized re-measure the thumb and add or remove the bar and the Tab stop;
 *   a nested area scrolls on its own and is its own Tab stop; focus moving to a link scrolls it into view; and
 *   the viewport's focus ring is painted on all four edges.
 * KxResizablePanelGroup (with KxResizablePanel and KxResizableHandle) — a focusable window splitter announcing
 *   the panel before it, its reachable minimum and maximum; arrows by 5 held inside both panels' limits, Home and
 *   End; F6 and Shift+F6 between a group's handles; a mouse, pen or touch drag with no jump on press, with a
 *   release outside, a group resized mid-drag, a handle disabled mid-drag, a lost capture and a touch cancel, one
 *   `layoutChange` per completed change, and the size where it was let go.
 * KxCarousel (with KxCarouselContent, KxCarouselItem, KxCarouselPrevious and KxCarouselNext) — a named carousel
 *   region of named slides, off-view slides inert, no tab semantics and no autoplay; Previous and Next keep
 *   focus at an end (aria-disabled, never disabled) and do not run past it unless `loop`; arrows on the region but
 *   not in a text field; focus inside a slide leaving the view moves to the slide now in view; a press on a
 *   slide's button is still a click, a drag past the threshold moves the slides and swallows the click; travel or
 *   a flick moves one position and a short slow drag settles back; resistance at the ends; touch and pen swipes;
 *   a cross-axis touch is left to the page; several slides to a view, loop and vertical; a resized viewport keeps
 *   the position aligned; and one polite announcement when a move lands, none during a drag.
 * KxComparisonSlider — one focusable element, a slider named "Comparison position" with min 0, max 100 and the
 *   value; arrows, Page Up, Home and End; a press, a drag and a release outside; touch and pen; a bound value
 *   out of range drawn at the end; the after picture not moving as the divider does; and a narrowed box keeping
 *   the divider at its value.
 *
 * Then teardown: no pointer listener anywhere at rest; removing the last section mid-drag leaves no listener
 * and no ResizeObserver watching a removed node, and adding it back observes again. Then axe, light and dark,
 * and forced colours: the thumbs, handles and divider drawn in CanvasText and focus rings kept.
 * ════════════════════════════════════════════════════════════════════════════ */
const INTERACTION = [
  { component: "KxScrollArea", run: scrollAreaInteraction },
  { component: "KxResizablePanelGroup", run: resizableInteraction },
  { component: "KxCarousel", run: carouselInteraction },
  { component: "KxComparisonSlider", run: comparisonInteraction },
];

async function scrollAreaInteraction(page, t) {
  const V = "#sa-vertical";
  // what overflows decides the bars and the Tab stop
  for (const [sel, want] of [
    [V, { y: true, x: false, label: "Tags" }],
    ["#sa-horizontal", { y: false, x: true, label: "Albums" }],
    ["#sa-both", { y: true, x: true, label: "Matrix" }],
    ["#sa-fits", { y: false, x: false, label: null }],
  ]) {
    await rect(page, sel);
    const a = await area(page, sel);
    const scrolls = want.x || want.y;
    t(!!a.y === want.y && !!a.x === want.x && a.corner === (want.x && want.y), `${sel}: draws a bar for each overflowing axis and nothing else`, `y ${!!a.y}, x ${!!a.x}, corner ${a.corner}`);
    t(a.tabindex === (scrolls ? "0" : null) && a.role === (scrolls ? "region" : null) && a.label === want.label, `${sel}: a named Tab stop only while it scrolls`, `tabindex ${a.tabindex}, role ${a.role}, label ${a.label}`);
  }
  let a = await area(page, V);
  t(near(a.y.thumb.height, expectedThumb(a.ratioY, a.y.bar.height)), `${V}: the thumb's length is the share of the content in view`, `${f(a.y.thumb.height)}px for ${f(a.ratioY, 3)} of ${f(a.y.bar.height)}px`);
  t(a.y.bar.left >= a.view.right - 0.5 && a.y.thumb.top >= a.y.bar.top - 0.5, `${V}: the bar sits beside the content, at the inline end, not over it`, `view ${f(a.view.right)}, bar ${f(a.y.bar.left)}`);

  // keyboard: the browser's own scrolling, the thumb following
  await focus(page, `${V} > .kx-scroll-area__viewport`);
  t((await active(page)) === "sa-vertical", `${V}: Tab focus lands on the viewport`, await active(page));
  const ring = await ringPainted(page, `${V} > .kx-scroll-area__viewport`);
  t(ringOk(ring), `${V}: its focus ring is painted on all four edges (not clipped)`, ringText(ring));
  await press(page, "End");
  await scrolled(page, V);
  a = await area(page, V);
  t(near(a.top, a.rangeY, 1) && near(a.y.thumb.bottom, a.y.bar.bottom), `${V}: End scrolls to the end and the thumb reaches the bar's end`, `top ${f(a.top)} of ${f(a.rangeY)}, thumb ${f(a.y.thumb.bottom)} / bar ${f(a.y.bar.bottom)}`);
  await press(page, "Home");
  await scrolled(page, V);
  a = await area(page, V);
  t(a.top === 0 && near(a.y.thumb.top, a.y.bar.top), `${V}: Home scrolls to the start and the thumb with it`, `top ${a.top}`);
  await press(page, "PageDown");
  await scrolled(page, V);
  a = await area(page, V);
  t(a.top > 0 && near(progress(a.y.bar, a.y.thumb, "y"), a.top / a.rangeY, 0.03), `${V}: Page Down scrolls and the thumb shows how far`, `top ${f(a.top)}, thumb ${f(progress(a.y.bar, a.y.thumb, "y"), 3)} vs ${f(a.top / a.rangeY, 3)}`);

  // the wheel
  await setScroll(page, V, { top: 0 });
  await idle(page);
  const vc = centre(await rect(page, V));
  await page.mouse.move(vc.x, vc.y);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction((s) => document.querySelector(`${s} > .kx-scroll-area__viewport`).scrollTop > 0, V, { timeout: 3000 }).catch(() => {});
  await scrolled(page, V);
  a = await area(page, V);
  t(a.top > 0 && near(progress(a.y.bar, a.y.thumb, "y"), a.top / a.rangeY, 0.03), `${V}: the wheel scrolls natively and the thumb follows`, `top ${f(a.top)}, thumb ${f(progress(a.y.bar, a.y.thumb, "y"), 3)}`);

  // a thumb drag, released outside
  await setScroll(page, V, { top: 0 });
  await idle(page);
  a = await area(page, V);
  const free = a.y.bar.height - a.y.thumb.height;
  const grip = centre(a.y.thumb);
  let mid = null;
  let midListeners = null;
  await slowDrag(page, grip, { x: grip.x, y: grip.y + free / 2 }, {
    steps: 4,
    release: false,
    during: async (i) => {
      if (i === 4) {
        mid = await area(page, V);
        midListeners = (await listeners(page)).length;
      }
    },
  });
  t(near(mid.top, mid.rangeY / 2, mid.rangeY * 0.03) && mid.dragging, `${V}: dragging the thumb half its free length scrolls half way`, `top ${f(mid.top)} of ${f(mid.rangeY)}`);
  t(midListeners > 0, `${V}: pointer listeners exist while the thumb is dragged`, `${midListeners}`);
  await page.mouse.move(2, 790, { steps: 4 });
  await page.mouse.up();
  await idle(page);
  a = await area(page, V);
  const after = await listeners(page);
  t(near(a.top, a.rangeY, 1) && !a.dragging && after.length === 0, `${V}: released outside, past the end: at the end, the drag over, no listener left`, `top ${f(a.top)}, dragging ${a.dragging}, listeners ${after.join(",") || "none"}`);
  await page.mouse.move(grip.x, grip.y, { steps: 3 });
  await idle(page);
  t(near((await area(page, V)).top, a.top, 0.5), `${V}: moving the pointer afterwards does nothing`);

  // a press on the track
  await setScroll(page, V, { top: 0 });
  await idle(page);
  a = await area(page, V);
  const at = a.y.bar.top + a.y.bar.height * 0.75;
  await page.mouse.click(centre(a.y.bar).x, at);
  await idle(page);
  const jumped = await area(page, V);
  const wantTop = (Math.min(Math.max(at - a.y.bar.top - a.y.thumb.height / 2, 0), free) / free) * a.rangeY;
  t(near(jumped.top, wantTop, a.rangeY * 0.02), `${V}: a press on the track jumps the thumb's centre to it`, `top ${f(jumped.top)}, expected ${f(wantTop)}`);
  t(near(centre(jumped.y.thumb).y, at, 1.5) || near(jumped.y.thumb.bottom, jumped.y.bar.bottom), `${V}: the thumb is drawn under the pointer`, `${f(centre(jumped.y.thumb).y)} vs ${f(at)}`);

  // horizontal, LTR (RTL is the rtl pass)
  const H = "#sa-horizontal";
  await rect(page, H);
  a = await area(page, H);
  const hfree = a.x.bar.width - a.x.thumb.width;
  await slowDrag(page, centre(a.x.thumb), { x: centre(a.x.thumb).x + hfree / 2, y: centre(a.x.thumb).y }, { steps: 4 });
  a = await area(page, H);
  t(near(a.left, a.rangeX / 2, a.rangeX * 0.03), `${H}: a horizontal thumb drag scrolls along the row`, `left ${f(a.left)} of ${f(a.rangeX)}`);

  // content that grows and shrinks
  const G = "#sa-grow";
  await rect(page, G);
  a = await area(page, G);
  t(!a.y && a.tabindex === null, `${G}: two rows fit: no bar, no Tab stop`);
  await click(page, "#sa-grow-add");
  a = await area(page, G);
  t(!!a.y && a.tabindex === "0" && near(a.y.thumb.height, expectedThumb(a.ratioY, a.y.bar.height)), `${G}: content grows: the bar appears, sized to it, and the area is a Tab stop`, a.y ? `${f(a.y.thumb.height)}px for ${f(a.ratioY, 3)}` : "no bar");
  await setScroll(page, G, { top: 1e6 });
  await idle(page);
  const before = await area(page, G);
  await click(page, "#sa-grow-add");
  a = await area(page, G);
  t(a.y.thumb.height < before.y.thumb.height - 1 && near(a.y.thumb.height, expectedThumb(a.ratioY, a.y.bar.height)), `${G}: more content: the thumb shrinks to the new share`, `${f(before.y.thumb.height)} -> ${f(a.y.thumb.height)}px`);
  t(near(progress(a.y.bar, a.y.thumb, "y"), a.top / a.rangeY, 0.02) && a.y.thumb.bottom < a.y.bar.bottom - 1, `${G}: and moves back from the end, where the content now continues`, `thumb ${f(progress(a.y.bar, a.y.thumb, "y"), 3)} vs ${f(a.top / a.rangeY, 3)}`);
  // the box resized
  await click(page, "#sa-resize");
  const tall = await area(page, G);
  t(tall.y && near(tall.y.thumb.height, expectedThumb(tall.ratioY, tall.y.bar.height)) && tall.y.thumb.height > a.y.thumb.height, `${G}: the box grows: the thumb re-measures to the new share`, `${f(a.y.thumb.height)} -> ${f(tall.y?.thumb.height)}px`);
  await click(page, "#sa-resize");
  await click(page, "#sa-grow-reset");
  a = await area(page, G);
  t(!a.y && a.tabindex === null, `${G}: back to two rows: the bar and the Tab stop go`);

  // nested
  await rect(page, "#sa-outer");
  await focus(page, "#sa-outer > .kx-scroll-area__viewport");
  await press(page, "Tab");
  t((await active(page)) === "sa-inner", "#sa-inner: a nested area is its own Tab stop, after its outer one", await active(page));
  const inner = centre(await rect(page, "#sa-inner"));
  await page.mouse.move(inner.x, inner.y);
  await page.mouse.wheel(0, 60);
  await page.waitForFunction(() => document.querySelector("#sa-inner > .kx-scroll-area__viewport").scrollTop > 0, null, { timeout: 3000 }).catch(() => {});
  await scrolled(page, "#sa-inner");
  const [ia, oa] = [await area(page, "#sa-inner"), await area(page, "#sa-outer")];
  t(ia.top > 0 && oa.top === 0 && ia.y && progress(ia.y.bar, ia.y.thumb, "y") > 0, "#sa-inner: the wheel scrolls the inner area first, and its own thumb follows", `inner ${f(ia.top)}, outer ${f(oa.top)}`);

  // focus moving to content scrolls it into view
  await focus(page, "#sa-link-1");
  for (let i = 0; i < 11; i++) await press(page, "Tab");
  await scrolled(page, "#sa-links");
  const link = await page.locator("#sa-link-12").evaluate((l) => {
    const v = l.closest(".kx-scroll-area__viewport").getBoundingClientRect();
    const r = l.getBoundingClientRect();
    return { inside: r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5, focused: document.activeElement === l };
  });
  a = await area(page, "#sa-links");
  t(link.focused && link.inside && a.top > 0 && progress(a.y.bar, a.y.thumb, "y") > 0.5, "#sa-links: Tab to the last link scrolls it into view and the thumb follows", JSON.stringify(link));
}

async function resizableInteraction(page, t) {
  const G = "#rz-h";
  const H = "#rz-h-handle";
  let g = await group(page, G, H);
  t(g.role === "separator" && g.tabindex === "0" && g.orientation === "vertical" && g.controls === "rz-h-a" && g.label === "Resize", `${H}: a focusable separator, vertical between side-by-side panels, controlling the panel before it`, `${g.role} ${g.tabindex} ${g.orientation} ${g.controls} "${g.label}"`);
  t(g.now === 50 && g.min === 20 && g.max === 75, `${H}: value 50, min 20 (its own min), max 75 (100 minus the next panel's min 25)`, `${g.now} ${g.min}–${g.max}`);
  t(near(g.share[0], 50, 0.3), `${G}: the panels are laid out at their defaults`, g.share.map((s) => f(s)).join(" / "));
  const v = await group(page, "#rz-v", "#rz-v-handle-1");
  t(v.orientation === "horizontal" && v.now === 25 && v.min === 10 && v.max === 65 && v.controls === "rz-v-a", "#rz-v-handle-1: horizontal between stacked panels; 25 in 10–65", `${v.orientation} ${v.now} ${v.min}–${v.max}`);

  const count = async () => Number(await out(page, "rz-h-count"));
  // keyboard
  await rect(page, G);
  await focus(page, H);
  let n0 = await count();
  const seen = [];
  for (const key of ["ArrowRight", "ArrowLeft", "End", "ArrowRight", "Home", "ArrowLeft", "ArrowDown"]) {
    await press(page, key);
    g = await group(page, G, H);
    seen.push(`${key}:${g.now}`);
  }
  t(seen.join(" ") === "ArrowRight:55 ArrowLeft:50 End:75 ArrowRight:75 Home:20 ArrowLeft:20 ArrowDown:20", `${H}: arrows by 5, End and Home to the reachable limits, never past them`, seen.join(" "));
  t(near(g.share[0], g.now, 0.3), `${G}: the panels follow the value`, `${f(g.share[0])}% for ${g.now}`);
  t((await count()) - n0 === 4, `${G}: one layoutChange per change that moved something`, `${(await count()) - n0} (expected 4)`);
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");
  t((await group(page, G, H)).now === 50, `${H}: back to 50`);

  // vertical keys and F6
  await focus(page, "#rz-v-handle-1");
  const vk = [];
  for (const key of ["ArrowDown", "ArrowUp", "ArrowRight"]) {
    await press(page, key);
    vk.push(`${key}:${(await group(page, "#rz-v", "#rz-v-handle-1")).now}`);
  }
  t(vk.join(" ") === "ArrowDown:30 ArrowUp:25 ArrowRight:25", "#rz-v-handle-1: ArrowDown and ArrowUp move a horizontal boundary; ArrowRight does not", vk.join(" "));
  const f6 = [];
  for (const key of ["F6", "F6", "Shift+F6"]) {
    await press(page, key);
    f6.push(await active(page));
  }
  t(f6.join(" ") === "rz-v-handle-2 rz-v-handle-1 rz-v-handle-2", "#rz-v: F6 and Shift+F6 cycle the group's handles", f6.join(" "));

  // a mouse drag: no jump on press, follows the pointer, stays where released
  await rect(page, G);
  g = await group(page, G, H);
  const hr = await rect(page, H);
  const from = { x: centre(hr).x + 3, y: hr.top + 20 }; // off the line, inside the hit area
  n0 = await count();
  let firstMove = null;
  let mid = null;
  let midListeners = [];
  await slowDrag(page, from, { x: from.x + 40, y: from.y }, {
    steps: 40,
    wait: 0,
    release: false,
    during: async (i) => {
      if (i === 1) firstMove = await group(page, G, H);
      if (i === 40) {
        mid = await group(page, G, H);
        midListeners = await listeners(page);
      }
    },
  });
  t(near(firstMove.sizes[0], g.sizes[0] + 1, 1), `${H}: the first 1px of a press moves the boundary 1px (no jump to the pointer)`, `${f(g.sizes[0])} -> ${f(firstMove.sizes[0])}px`);
  t(near(mid.sizes[0], g.sizes[0] + 40, 1.5) && mid.dragging && mid.groupDragging, `${H}: a 40px drag moves the boundary 40px`, `${f(g.sizes[0])} -> ${f(mid.sizes[0])}px`);
  t((await active(page)) === "rz-h-handle", `${H}: a press focuses the handle`, await active(page));
  t(midListeners.length > 0 && midListeners.every((l) => l.startsWith("element:")), `${H}: while dragging, its listeners are on the captured element only`, midListeners.join(","));
  await page.mouse.up();
  await idle(page);
  await pause(page, 100);
  const released = await group(page, G, H);
  t(near(released.sizes[0], mid.sizes[0], 0.5) && !released.dragging && !released.groupDragging, `${H}: released, the size stays exactly where it was let go`, `${f(mid.sizes[0])} -> ${f(released.sizes[0])}px`);
  t((await count()) - n0 === 1 && (await listeners(page)).length === 0, `${H}: one layoutChange for the drag, and no listener left`, `${(await count()) - n0} change(s)`);
  t((await page.evaluate(() => String(document.getSelection()))) === "", `${H}: dragging selects no text`);

  // release outside, past the limits
  const hr2 = await rect(page, H);
  await slowDrag(page, centre(hr2), { x: 1000, y: centre(hr2).y }, { steps: 6, wait: 0, release: false });
  t((await group(page, G, H)).now === 75, `${H}: dragged far past the end, it stops at its limit (75)`, `${(await group(page, G, H)).now}`);
  await page.mouse.move(1000, 795);
  await page.mouse.up();
  await idle(page);
  g = await group(page, G, H);
  t(g.now === 75 && !g.dragging && (await listeners(page)).length === 0, `${H}: released outside the group and window edge: the drag ends there`, `${g.now}, dragging ${g.dragging}`);
  await page.mouse.move(centre(hr2).x, centre(hr2).y, { steps: 4 });
  await idle(page);
  t((await group(page, G, H)).now === 75, `${H}: moving the pointer afterwards does nothing`);
  const hr3 = await rect(page, H);
  await slowDrag(page, centre(hr3), { x: 2, y: centre(hr3).y }, { steps: 6, wait: 0 });
  t((await group(page, G, H)).now === 20, `${H}: dragged far the other way, it stops at its other limit (20)`, `${(await group(page, G, H)).now}`);
  await focus(page, H);
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");

  // the group resized mid-drag
  const hr4 = await rect(page, H);
  const s4 = centre(hr4);
  await slowDrag(page, s4, { x: s4.x + 20, y: s4.y }, { steps: 4, wait: 0, release: false });
  await domClick(page, "#rz-narrow");
  const narrow = await rect(page, G, { scroll: false });
  await page.mouse.move(s4.x + 40, s4.y, { steps: 4 });
  await idle(page);
  g = await group(page, G, H);
  const expected = 50 + (40 / narrow.width) * 100;
  t(near(g.share[0], expected, 1.5) && near(g.sizes[0] + g.sizes[1] + 1, g.total, 1.5), `${H}: the group narrowed mid-drag: the drag continues against the new width, the panels still fill it`, `${f(g.share[0])}% (expected ${f(expected)}), ${f(g.sizes[0] + g.sizes[1] + 1)} of ${f(g.total)}px`);
  await page.mouse.up();
  await idle(page);
  await domClick(page, "#rz-narrow");
  await focus(page, H);
  await press(page, "Home");
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");

  // disabled mid-drag
  const hr5 = await rect(page, H);
  const s5 = centre(hr5);
  await slowDrag(page, s5, { x: s5.x + 20, y: s5.y }, { steps: 4, wait: 0, release: false });
  await domClick(page, "#rz-disable");
  const atDisable = await group(page, G, H);
  await page.mouse.move(s5.x + 80, s5.y, { steps: 4 });
  await idle(page);
  g = await group(page, G, H);
  t(near(g.sizes[0], atDisable.sizes[0], 0.5) && !g.dragging && (await listeners(page)).length === 0, `${H}: disabled mid-drag: the drag stops where it was and its listeners go`, `${f(atDisable.sizes[0])} -> ${f(g.sizes[0])}px, dragging ${g.dragging}`);
  await page.mouse.up();
  await idle(page);
  t(g.disabled === "true" && g.tabindex === "-1", `${H}: disabled: aria-disabled and out of the Tab order`, `${g.disabled} ${g.tabindex}`);
  await page.locator(H).focus();
  await press(page, "ArrowRight");
  await slowDrag(page, s5, { x: s5.x + 40, y: s5.y }, { steps: 4, wait: 0 });
  t(near((await group(page, G, H)).sizes[0], g.sizes[0], 0.5), `${H}: disabled: neither a key nor a drag moves it`);
  await domClick(page, "#rz-disable");
  await focus(page, H);
  await press(page, "Home");
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");

  // a lost capture ends the drag
  const s6 = centre(await rect(page, H));
  await slowDrag(page, s6, { x: s6.x + 10, y: s6.y }, { steps: 2, wait: 0, release: false });
  await page.locator(H).evaluate((h) => {
    for (let id = 0; id < 4; id++) if (h.hasPointerCapture(id)) h.releasePointerCapture(id);
  });
  await idle(page);
  // lostpointercapture is delivered before the next pointer event, so that move is the drag's last chance
  const lost = await group(page, G, H);
  await page.mouse.move(s6.x + 60, s6.y, { steps: 3 });
  await idle(page);
  g = await group(page, G, H);
  t(!g.dragging && near(g.sizes[0], lost.sizes[0], 0.5) && (await listeners(page)).length === 0, `${H}: capture lost mid-drag: the drag ends, and the pointer moving on moves nothing`, `${f(lost.sizes[0])} -> ${f(g.sizes[0])}px, dragging ${g.dragging}`);
  await page.mouse.up();
  await focus(page, H);
  await press(page, "Home");
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");

  // pen and touch
  const before = await group(page, G, H);
  const s7 = centre(await rect(page, H));
  await penDrag(page, s7, { x: s7.x + 30, y: s7.y });
  const pen = await group(page, G, H);
  t(near(pen.sizes[0], before.sizes[0] + 30, 1.5) && !pen.dragging, `${H}: a pen drag moves it`, `${f(before.sizes[0])} -> ${f(pen.sizes[0])}px`);
  const s8 = centre(await rect(page, H));
  await touchDrag(page, s8, { x: s8.x - 30, y: s8.y });
  const touch = await group(page, G, H);
  t(near(touch.sizes[0], pen.sizes[0] - 30, 1.5) && !touch.dragging, `${H}: a touch drag moves it`, `${f(pen.sizes[0])} -> ${f(touch.sizes[0])}px`);
  const s9 = centre(await rect(page, H));
  let cancelMid = null;
  await touchDrag(page, s9, { x: s9.x + 30, y: s9.y }, { end: "cancel", during: async (i) => i === 6 && (cancelMid = await group(page, G, H)) });
  g = await group(page, G, H);
  t(cancelMid?.dragging && !g.dragging && (await listeners(page)).length === 0, `${H}: a touch cancelled by the browser ends the drag`, `mid ${cancelMid?.dragging}, after ${g.dragging}`);
  const ptypes = await types(page);
  t(["mouse", "pen", "touch"].every((p) => ptypes.includes(p)), `${H}: mouse, pen and touch pointers all arrived as such`, ptypes.join(","));
  await focus(page, H);
  await press(page, "Home");
  for (let i = 0; i < 6; i++) await press(page, "ArrowRight");

  // vertical drag
  const vbefore = await group(page, "#rz-v", "#rz-v-handle-1");
  const vh = centre(await rect(page, "#rz-v-handle-1"));
  await slowDrag(page, { x: vh.x + 40, y: vh.y }, { x: vh.x + 40, y: vh.y + 30 }, { steps: 6, wait: 0 });
  const vafter = await group(page, "#rz-v", "#rz-v-handle-1");
  t(near(vafter.sizes[0], vbefore.sizes[0] + 30, 1.5) && near(vafter.sizes[2], vbefore.sizes[2], 0.5), "#rz-v-handle-1: a vertical drag resizes the pair it sits between and nothing else", `${vbefore.sizes.map((s) => f(s)).join("/")} -> ${vafter.sizes.map((s) => f(s)).join("/")}`);
}

async function carouselInteraction(page, t) {
  const B = "#cr-basic";
  await rect(page, B);
  let c = await carousel(page, B);
  const region = await page.locator(B).evaluate((el) => ({ role: el.getAttribute("role"), rd: el.getAttribute("aria-roledescription"), label: el.getAttribute("aria-label") }));
  t(region.role === "region" && region.rd === "carousel" && region.label === "Featured", `${B}: a region, described as a carousel, with its name`, JSON.stringify(region));
  t(c.roles.every((r) => r === "group/slide") && c.labels.join("|") === "1 of 5|2 of 5|3 of 5|4 of 5|5 of 5", `${B}: slides are groups described as slides, named "N of M"`, c.labels.join("|"));
  t(c.inert.join() === "false,true,true,true,true", `${B}: slides out of view are inert`, c.inert.join());
  const tabs = await page.locator("kx-carousel").evaluateAll((cs) => cs.flatMap((el) => [...el.querySelectorAll('[role="tab"],[role="tablist"],[role="tabpanel"]')]).length);
  t(tabs === 0, "carousels: no tab, tablist or tabpanel semantics", `${tabs}`);
  const names = [];
  for (const name of ["Previous slide", "Next slide"]) names.push(await page.locator(B).getByRole("button", { name, exact: true }).count());
  t(names.join() === "1,1", `${B}: the controls' accessible names are Previous slide and Next slide (the glyphs hidden)`, names.join());
  t(c.prevDisabled === "true" && c.prevNative === false && c.nextDisabled === null && c.live === "", `${B}: at the start Previous is aria-disabled (not disabled), and nothing has been announced`, `prev ${c.prevDisabled}, native ${c.prevNative}, live "${c.live}"`);

  // the buttons
  await click(page, "#cr-basic-next", { force: true });
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "1" && near(c.slides[1].left, c.view.left, 1) && c.inert.join() === "true,false,true,true,true", `${B}: Next shows slide 2 at the start of the view; slide 1 turns inert`, `index ${await out(page, "cr-basic")}, slide 2 at ${f(c.slides[1].left - c.view.left)}`);
  t(c.live === "Slide 2 of 5" && (await active(page)) === "cr-basic-next", `${B}: announces "Slide 2 of 5"; focus stays on Next`, `"${c.live}", focus ${await active(page)}`);
  for (let i = 0; i < 4; i++) await click(page, "#cr-basic-next", { force: true });
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "4" && c.nextDisabled === "true" && (await active(page)) === "cr-basic-next", `${B}: Next stops at the last slide, turns aria-disabled and keeps focus`, `index ${await out(page, "cr-basic")}, next ${c.nextDisabled}, focus ${await active(page)}`);
  t(c.live === "Slide 5 of 5", `${B}: and announced the last slide once`, `"${c.live}"`);

  // keys on the region
  const keys = [];
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowUp"]) {
    await press(page, key);
    keys.push(`${key}:${await out(page, "cr-basic")}`);
  }
  t(keys.join(" ") === "ArrowLeft:3 ArrowLeft:2 ArrowRight:3 ArrowUp:3", `${B}: ArrowLeft and ArrowRight move it; ArrowUp does not`, keys.join(" "));
  for (let i = 0; i < 3; i++) await press(page, "ArrowLeft");
  t((await out(page, "cr-basic")) === "0", `${B}: back at the start`);

  // focus inside a slide that leaves the view
  const I = "#cr-interactive";
  await rect(page, I);
  await focus(page, "#cr-int-btn-1");
  await press(page, "ArrowRight");
  c = await carousel(page, I);
  const holder = await active(page);
  t(c.inert.join() === "true,false,true" && holder.startsWith("cr-int-2"), `${I}: an arrow from a button in slide 1 moves on, and focus follows into slide 2 (not the page)`, `focus ${holder}, inert ${c.inert.join()}`);
  // a text field keeps its arrows
  await focus(page, "#cr-int-input-2");
  await press(page, "ArrowRight");
  await press(page, "ArrowLeft");
  c = await carousel(page, I);
  t(c.inert.join() === "true,false,true" && (await active(page)) === "cr-int-input-2", `${I}: arrows in a text field move its caret, not the carousel`, c.inert.join());
  // a press on a slide's button is a click
  const clicks0 = Number(await out(page, "cr-clicks"));
  await click(page, "#cr-int-btn-2");
  t(Number(await out(page, "cr-clicks")) === clicks0 + 1, `${I}: a press on a button in a slide is a click`, `${clicks0} -> ${await out(page, "cr-clicks")}`);
  // a drag that starts on that button moves the slides and swallows its click
  const br = await rect(page, "#cr-int-btn-2");
  c = await carousel(page, I);
  await slowDrag(page, centre(br), { x: centre(br).x - c.view.width * 0.4, y: centre(br).y }, { steps: 8 });
  c = await carousel(page, I);
  t(c.inert.join() === "true,true,false" && Number(await out(page, "cr-clicks")) === clicks0 + 1, `${I}: a drag from a slide's button moves on and is not also a click`, `inert ${c.inert.join()}, clicks ${await out(page, "cr-clicks")}`);

  // drags on the basic carousel
  await rect(page, B);
  c = await carousel(page, B);
  const sc = centre(c.view);
  let mid = null;
  let midListeners = [];
  const live0 = c.live;
  await slowDrag(page, sc, { x: sc.x - c.view.width * 0.4, y: sc.y }, {
    steps: 8,
    release: false,
    during: async (i) => {
      if (i === 2) {
        mid = await carousel(page, B);
        midListeners = await listeners(page);
      }
    },
  });
  const travelled = -c.view.width * 0.1;
  t(mid.dragging && near(mid.tx, c.tx + travelled, 1.5), `${B}: while dragging, the slides follow the pointer`, `tx ${f(c.tx)} -> ${f(mid.tx)} (pointer ${f(travelled)})`);
  t(mid.live === live0, `${B}: nothing is announced during a drag`, `"${live0}" -> "${mid.live}"`);
  t(midListeners.length > 0 && midListeners.every((l) => l.startsWith("document:")), `${B}: during a drag its listeners are on the document (not captured, so slides keep their clicks)`, midListeners.join(","));
  await page.mouse.up();
  await idle(page);
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "1" && near(c.slides[1].left, c.view.left, 1) && !c.dragging && (await listeners(page)).length === 0, `${B}: released after 40% of the view: one position on, the drag's listeners gone`, `index ${await out(page, "cr-basic")}`);
  t(c.live === "Slide 2 of 5" && c.selection === "", `${B}: announced once when it landed, and selected no text`, `"${c.live}"`);
  // a short slow drag settles back
  await slowDrag(page, sc, { x: sc.x - c.view.width * 0.08, y: sc.y }, { steps: 6, wait: 60 });
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "1" && near(c.slides[1].left, c.view.left, 1), `${B}: a short, slow drag settles back`, `index ${await out(page, "cr-basic")}`);
  // a quick flick moves on
  await slowDrag(page, sc, { x: sc.x - c.view.width * 0.1, y: sc.y }, { steps: 3, wait: 0 });
  t((await out(page, "cr-basic")) === "2", `${B}: a quick short flick moves one position`, `index ${await out(page, "cr-basic")}`);
  // resistance at the start
  await focus(page, "#cr-basic-prev");
  await press(page, "ArrowLeft");
  await press(page, "ArrowLeft");
  c = await carousel(page, B);
  let band = null;
  await slowDrag(page, sc, { x: sc.x + 100, y: sc.y }, { steps: 5, during: async (i) => i === 5 && (band = await carousel(page, B)) });
  t(band && near(band.tx, c.tx + 30, 2), `${B}: dragged past the start, it moves a third as far as the pointer`, `pointer 100px, slides ${f(band?.tx - c.tx)}px`);
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "0" && near(c.tx, 0, 0.5), `${B}: and springs back to the start`, `tx ${f(c.tx)}`);
  // touch and pen
  await touchDrag(page, sc, { x: sc.x - c.view.width * 0.5, y: sc.y });
  t((await out(page, "cr-basic")) === "1", `${B}: a touch swipe moves on`, `index ${await out(page, "cr-basic")}`);
  await touchDrag(page, sc, { x: sc.x + 4, y: sc.y + 120 });
  c = await carousel(page, B);
  t((await out(page, "cr-basic")) === "1" && !c.dragging && (await listeners(page)).length === 0 && near(c.slides[1].left, c.view.left, 1), `${B}: a vertical touch is the page's (pan-y); the carousel stays put`, `index ${await out(page, "cr-basic")}`);
  await rect(page, B);
  c = await carousel(page, B);
  const sc2 = centre(c.view);
  await penDrag(page, sc2, { x: sc2.x - c.view.width * 0.5, y: sc2.y });
  t((await out(page, "cr-basic")) === "2", `${B}: a pen drag moves on`, `index ${await out(page, "cr-basic")}`);

  // several to a view
  const M = "#cr-multi";
  await rect(page, M);
  c = await carousel(page, M);
  t((await out(page, "cr-multi-count")) === "3" && c.inert.join() === "false,false,false,true,true", `${M}: three to a view over five slides: three positions, the first three reachable`, `${await out(page, "cr-multi-count")} positions, inert ${c.inert.join()}`);
  await click(page, "#cr-multi-next", { force: true });
  await click(page, "#cr-multi-next", { force: true });
  c = await carousel(page, M);
  t((await out(page, "cr-multi")) === "2" && c.nextDisabled === "true" && near(c.slides[4].right, c.view.right, 1) && c.inert.join() === "true,true,false,false,false", `${M}: the last position shows the last three, flush with the end`, `at ${await out(page, "cr-multi")}, last slide ends ${f(c.slides[4].right - c.view.right)} from the edge`);
  t(c.live === "Slides 3 to 5 of 5", `${M}: announces the range in view`, `"${c.live}"`);

  // loop
  const L = "#cr-loop";
  await rect(page, L);
  c = await carousel(page, L);
  t(c.prevDisabled === null && c.nextDisabled === null, `${L}: neither control is ever disabled`);
  const loopSeq = [];
  for (const b of ["#cr-loop-prev", "#cr-loop-next", "#cr-loop-next", "#cr-loop-next", "#cr-loop-next"]) {
    await click(page, b, { force: true });
    loopSeq.push(await out(page, "cr-loop"));
  }
  t(loopSeq.join() === "2,0,1,2,0", `${L}: Previous at the start goes to the end, Next at the end to the start`, loopSeq.join());

  // vertical
  const VC = "#cr-vertical";
  await rect(page, VC);
  await focus(page, "#cr-vertical-next");
  const vseq = [];
  for (const key of ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    await press(page, key);
    vseq.push(`${key}:${await out(page, "cr-vertical")}`);
  }
  c = await carousel(page, VC);
  t(vseq.join(" ") === "ArrowDown:1 ArrowRight:1 ArrowUp:0 ArrowDown:1" && near(c.slides[1].top, c.view.top, 1) && near(c.tx, 0, 0.1), `${VC}: ArrowDown and ArrowUp move it, ArrowRight does not; it moves on the block axis`, vseq.join(" "));
  const vv = centre(c.view);
  await slowDrag(page, vv, { x: vv.x, y: vv.y - c.view.height * 0.4 }, { steps: 8 });
  t((await out(page, "cr-vertical")) === "2", `${VC}: an upward drag moves on`, `index ${await out(page, "cr-vertical")}`);

  // a resized viewport keeps the position aligned
  await rect(page, B);
  await click(page, "#cr-basic-next", { force: true });
  const atIndex = await out(page, "cr-basic");
  await page.setViewportSize({ width: 600, height: 800 });
  await pause(page, 100);
  await idle(page);
  c = await carousel(page, B);
  const i3 = Number(atIndex);
  t((await out(page, "cr-basic")) === atIndex && near(c.slides[i3].left, c.view.left, 1) && near(c.slides[i3].width, c.view.width, 1), `${B}: the viewport narrows: the same slide stays aligned, slides resized with it`, `slide ${i3 + 1} at ${f(c.slides[i3].left - c.view.left)}, ${f(c.slides[i3].width)} of ${f(c.view.width)}px`);
  await page.setViewportSize({ width: 1024, height: 800 });
  await pause(page, 100);
  await idle(page);
  c = await carousel(page, B);
  t(near(c.slides[i3].left, c.view.left, 1), `${B}: and when it widens again`);

  // no autoplay
  const still = await page.locator("kx-carousel").evaluateAll((cs) => cs.map((x) => getComputedStyle(x.querySelector(".kx-carousel__track")).transform));
  await pause(page, 2500);
  const later = await page.locator("kx-carousel").evaluateAll((cs) => cs.map((x) => getComputedStyle(x.querySelector(".kx-carousel__track")).transform));
  t(still.join() === later.join(), "carousels: nothing moves on its own (no autoplay)");
}

async function comparisonInteraction(page, t) {
  const S = "#cs-default";
  await rect(page, S);
  let c = await comparison(page);
  t(c.focusables === 1, `${S}: one focusable element`, `${c.focusables}`);
  const sliders = page.locator(S).getByRole("slider", { name: "Comparison position" });
  t((await sliders.count()) === 1, `${S}: one slider, named "Comparison position"`, `${await sliders.count()}`);
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const ax = nodes.find((n) => n.role?.value === "slider" && n.name?.value === "Comparison position");
  const prop = (k) => ax?.properties?.find((p) => p.name === k)?.value?.value;
  const axValue = ax?.value?.value ?? prop("valuetext");
  t(ax && Number(prop("valuemin")) === 0 && Number(prop("valuemax")) === 100 && Number(axValue) === 50, `${S}: its accessibility node is a slider, min 0, max 100, now 50`, ax ? `min ${prop("valuemin")}, max ${prop("valuemax")}, value ${axValue}` : "no node");
  const hidden = await page.locator(S).evaluate((h) => ["__divider", "__handle"].every((s) => h.querySelector(`.kx-comparison-slider${s}`).getAttribute("aria-hidden") === "true"));
  t(hidden, `${S}: the drawn divider and handle are hidden from the accessibility tree`);
  t(near(c.dividerX, dividerAt(c, 50, false), 1), `${S}: the divider is drawn at the value`, `${f(c.dividerX - c.host.left)} of ${f(c.host.width)}px`);

  // keyboard
  await focus(page, `${S} input`);
  c = await comparison(page);
  t(!c.handleRing.startsWith("none none"), `${S}: keyboard focus draws a ring on the handle`, c.handleRing);
  const ks = [];
  for (const key of ["ArrowRight", "PageUp", "Home", "End", "ArrowLeft"]) {
    await press(page, key);
    c = await comparison(page);
    ks.push(`${key}:${f(c.value, 0)}/${await out(page, "cs")}`);
  }
  t(ks.join(" ") === "ArrowRight:51/51 PageUp:61/61 Home:0/0 End:100/100 ArrowLeft:99/99", `${S}: arrows by 1, Page Up by 10, Home and End to the ends; the bound value follows`, ks.join(" "));
  t(near(c.dividerX, dividerAt(c, 99, false), 1), `${S}: the divider follows the keyboard`, `${f(c.dividerX - c.host.left)}px`);

  // pointer
  c = await comparison(page);
  const y = c.host.top + c.host.height / 2;
  await page.mouse.click(c.host.left + c.host.width * 0.25, y);
  await idle(page);
  c = await comparison(page);
  t(near(c.value, 25, 1) && near(c.dividerX, c.host.left + c.host.width * 0.25, 1.5), `${S}: a press puts the divider where it lands`, `${f(c.value)}`);
  await slowDrag(page, { x: c.host.left + c.host.width * 0.25, y }, { x: c.host.left + c.host.width * 0.75, y }, { steps: 6, wait: 0 });
  c = await comparison(page);
  t(near(c.value, 75, 1) && Number(await out(page, "cs")) === c.value, `${S}: a drag moves it with the pointer`, `${f(c.value)}`);
  await slowDrag(page, { x: c.host.left + c.host.width * 0.75, y }, { x: c.host.right + 200, y: c.host.bottom + 120 }, { steps: 6, wait: 0 });
  c = await comparison(page);
  t(c.value === 100, `${S}: dragged out past the end and released outside: held at 100`, `${f(c.value)}`);
  await page.mouse.move(c.host.left + 10, y, { steps: 3 });
  await idle(page);
  t((await comparison(page)).value === 100, `${S}: moving the pointer afterwards does nothing`);

  // touch and pen
  await touchDrag(page, { x: c.host.left + c.host.width * 0.75, y }, { x: c.host.left + c.host.width * 0.3, y });
  c = await comparison(page);
  t(near(c.value, 30, 1.5), `${S}: a touch drag moves it`, `${f(c.value)}`);
  await penDrag(page, { x: c.host.left + c.host.width * 0.3, y }, { x: c.host.left + c.host.width * 0.6, y });
  c = await comparison(page);
  t(near(c.value, 60, 1.5), `${S}: a pen drag moves it`, `${f(c.value)}`);

  // values bound from outside
  const bounds = [];
  for (const [b, want, edge] of [["#cs-set-150", 100, "end"], ["#cs-set-minus", 0, "start"], ["#cs-set-30", 30, null]]) {
    await click(page, b);
    c = await comparison(page);
    bounds.push(`${b.slice(8)}:${c.value}@${f(c.dividerX - c.host.left, 0)}`);
    t(c.value === want && near(c.dividerX, dividerAt(c, want, false), 1), `${S}: bound to ${b.slice(8)}: drawn and offered at ${want}${edge ? ` (the ${edge})` : ""}`, bounds.at(-1));
  }
  // the after picture holds still
  const a30 = (await comparison(page)).after;
  await focus(page, `${S} input`);
  for (let i = 0; i < 4; i++) await press(page, "PageUp");
  c = await comparison(page);
  t(c.value === 70 && near(c.after.left, a30.left, 0.5) && near(c.after.width, c.host.width, 0.5), `${S}: the after picture does not move as the divider does`, `left ${f(a30.left)} -> ${f(c.after.left)}, width ${f(c.after.width)} of ${f(c.host.width)}`);
  // a narrower box
  await click(page, "#cs-narrow");
  c = await comparison(page);
  t(near(c.dividerX, dividerAt(c, 70, false), 1) && near(c.after.width, c.host.width, 0.5), `${S}: the box narrows: the divider stays at the value, the after picture fills the new box`, `${f(c.dividerX - c.host.left)} of ${f(c.host.width)}px`);
  await click(page, "#cs-narrow");
}

async function teardown(page, t) {
  t((await listeners(page)).length === 0, "at rest: no pointer listener anywhere", (await listeners(page)).join(",") || "none");
  let w = await watched(page);
  t(w.detached === 0, "at rest: no ResizeObserver watches a removed node", JSON.stringify(w));
  const before = w.connected;
  // remove the last section while a handle is being dragged
  const h = centre(await rect(page, "#lc-handle"));
  await slowDrag(page, h, { x: h.x + 10, y: h.y }, { steps: 2, wait: 0, release: false });
  const during = (await listeners(page)).length;
  await domClick(page, "#lc-toggle");
  await page.mouse.move(h.x + 40, h.y);
  await page.mouse.up();
  await idle(page);
  w = await watched(page);
  t(during > 0 && (await listeners(page)).length === 0, "removed mid-drag (resizable): its pointer listeners go with it", `${during} during, ${(await listeners(page)).length} after`);
  t(w.detached === 0 && w.connected < before, "removed: its ResizeObservers watch nothing it left behind", `${before} -> ${w.connected} watched, ${w.detached} detached`);
  await domClick(page, "#lc-toggle");
  await rect(page, "#lc-carousel");
  w = await watched(page);
  t(w.connected === before, "added back: the scroll area and carousel observe again", `${w.connected} watched`);
  // and a carousel mid-drag (document listeners)
  const cc = centre(await rect(page, "#lc-carousel-content"));
  await slowDrag(page, cc, { x: cc.x - 30, y: cc.y }, { steps: 3, wait: 0, release: false });
  const docDuring = (await listeners(page)).filter((l) => l.startsWith("document:")).length;
  await domClick(page, "#lc-toggle");
  await page.mouse.up();
  await idle(page);
  t(docDuring > 0 && (await listeners(page)).length === 0, "removed mid-drag (carousel): its document listeners go with it", `${docDuring} during, ${(await listeners(page)).length} after`);
  await domClick(page, "#lc-toggle");
  t((await loops(page)) === 0, "no ResizeObserver loop error in the run", `${await loops(page)}`);
}

if (runs("interaction")) {
  assertClaims("interaction, accessibility", INTERACTION);
  report.push(`\ninteraction — ${INTERACTION.length} components, keyboard, mouse, pen and touch, LTR at 1024px`);
  const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce", hasTouch: true });
  const page = await open(context);
  for (const s of [...INTERACTION, { component: "teardown", run: teardown }]) {
    try {
      await s.run(page, (ok, what, detail) => check(ok, `${s.component}: ${what}`, detail));
    } catch (err) {
      check(false, `${s.component}: ran to completion`, String(err.message).split("\n")[0]);
      await page.mouse.up().catch(() => {});
    }
  }
  await context.close();

  report.push(`\naccessibility — axe (light and dark), forced colours`);
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
    const p = await open(ctx, { theme });
    try {
      // a state with something focused, scrolled and moved, so axe sees more than the first frame
      await p.locator("#cr-basic-next").click();
      await p.locator("#cr-multi-next").click();
      await idle(p);
      const violations = (await axe(p)).flatMap((v) => v.targets.map((target) => `${v.id} ${target}`));
      check(violations.length === 0, `axe ${theme}: the four components, no violations`, violations.join("; "));
    } catch (err) {
      check(false, `axe ${theme}: ran to completion`, String(err.message).split("\n")[0]);
    }
    await ctx.close();
  }
  const fc = await browser.newContext({ viewport: { width: 1024, height: 800 }, forcedColors: "active", reducedMotion: "reduce" });
  const p = await open(fc);
  try {
    const drawn = await p.evaluate(() => {
      const bg = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
      const page = getComputedStyle(document.body).backgroundColor;
      return {
        page,
        thumb: bg("#sa-vertical .kx-scroll-area__thumb"),
        handle: bg("#rz-h-handle"),
        divider: bg("#cs-default .kx-comparison-slider__divider"),
      };
    });
    for (const k of ["thumb", "handle", "divider"]) check(drawn[k] !== drawn.page && !/rgba\(0, 0, 0, 0\)/.test(drawn[k]), `forced colours: the ${k} is drawn against the page`, `${drawn[k]} on ${drawn.page}`);
    for (const [sel, what] of [
      ["#sa-vertical > .kx-scroll-area__viewport", "scroll area viewport"],
      ["#rz-h-handle", "resizable handle"],
      ["#cr-basic-next", "carousel control"],
      ["#cs-default input", "comparison slider"],
    ]) {
      await focus(p, sel);
      const ring = await p.evaluate(
        (sel) => {
          const el = document.querySelector(sel);
          const target = el.matches("input") ? el.closest("kx-comparison-slider").querySelector(".kx-comparison-slider__handle") : el;
          const s = getComputedStyle(target);
          return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
        },
        sel,
      );
      check(ring.style !== "none" && ring.width >= 1, `forced colours: the ${what} keeps a visible focus outline`, `${ring.style} ${ring.width}px`);
    }
  } catch (err) {
    check(false, "forced colours: ran to completion", String(err.message).split("\n")[0]);
  }
  await fc.close();
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: rtl
 *
 * The four direction cases — an LTR page, an RTL page, an LTR region in an RTL page and an RTL region in an LTR
 * page (the direction set on a wrapping region before the first render, so each component resolves its own
 * nearest direction and not the root's):
 *
 * KxScrollArea — the vertical bar at the inline end; a horizontal area starts at the inline start with its
 *   thumb there; the arrow toward the inline end scrolls toward it and the thumb follows logically; a thumb drag
 *   toward the inline end scrolls half way for half its free length; a press on the track at a quarter from the
 *   inline start jumps there.
 * KxResizablePanelGroup — the first panel at the inline start; the arrow toward the inline end grows it, the one
 *   toward the start shrinks it; a drag toward the inline end grows it by the distance dragged; a vertical group's
 *   arrows are the same in both directions.
 * KxCarousel — the first slide at the inline start, the next one toward the inline end; Previous at the inline
 *   start and its glyph resolved in the same direction; the arrow toward the inline end is Next; a drag toward the
 *   inline start moves on; a vertical carousel's arrows are the same in both directions.
 * KxComparisonSlider — the divider drawn from the inline start; the arrow toward the inline end increases the
 *   value; a press a quarter of the way from the inline start sets 25; the before label at the inline start.
 * ════════════════════════════════════════════════════════════════════════════ */
const RTL = [
  {
    component: "KxScrollArea",
    async run(page, rtl, t) {
      const end = rtl ? "ArrowLeft" : "ArrowRight";
      await rect(page, "#sa-vertical");
      let a = await area(page, "#sa-vertical");
      t(rtl ? a.y.bar.right <= a.view.left + 0.5 : a.y.bar.left >= a.view.right - 0.5, "the vertical bar is at the inline end", `bar ${f(a.y.bar.left)}–${f(a.y.bar.right)}, view ${f(a.view.left)}–${f(a.view.right)}`);
      const H = "#sa-horizontal";
      await rect(page, H);
      a = await area(page, H);
      t(a.left === 0 && (rtl ? near(a.x.thumb.right, a.x.bar.right) : near(a.x.thumb.left, a.x.bar.left)), "a horizontal area starts at the inline start, its thumb there", `scrollLeft ${a.left}, thumb ${f(a.x.thumb.left)}–${f(a.x.thumb.right)} in ${f(a.x.bar.left)}–${f(a.x.bar.right)}`);
      await focus(page, `${H} > .kx-scroll-area__viewport`);
      for (let i = 0; i < 3; i++) await press(page, end);
      await scrolled(page, H);
      a = await area(page, H);
      const along = rtl ? -a.left : a.left;
      t(along > 0 && near(progress(a.x.bar, a.x.thumb, "x", rtl), along / a.rangeX, 0.03), `${end} scrolls toward the inline end and the thumb follows that way`, `scrolled ${f(along)}, thumb ${f(progress(a.x.bar, a.x.thumb, "x", rtl), 3)} vs ${f(along / a.rangeX, 3)}`);
      await setScroll(page, H, { left: 0 });
      await idle(page);
      a = await area(page, H);
      const free = a.x.bar.width - a.x.thumb.width;
      const g = centre(a.x.thumb);
      await slowDrag(page, g, { x: g.x + (rtl ? -1 : 1) * (free / 2), y: g.y }, { steps: 4, wait: 0 });
      a = await area(page, H);
      t(near(rtl ? -a.left : a.left, a.rangeX / 2, a.rangeX * 0.03), "a thumb drag toward the inline end scrolls half way for half its free length", `scrollLeft ${f(a.left)} of ${f(a.rangeX)}`);
      await setScroll(page, H, { left: 0 });
      await idle(page);
      a = await area(page, H);
      const x = rtl ? a.x.bar.right - a.x.bar.width * 0.25 : a.x.bar.left + a.x.bar.width * 0.25;
      await page.mouse.click(x, centre(a.x.bar).y);
      await idle(page);
      const j = await area(page, H);
      const want = (Math.min(Math.max(a.x.bar.width * 0.25 - a.x.thumb.width / 2, 0), free) / free) * a.rangeX;
      t(near(rtl ? -j.left : j.left, want, a.rangeX * 0.02), "a press a quarter along the track, from the inline start, jumps there", `scrolled ${f(rtl ? -j.left : j.left)}, expected ${f(want)}`);
    },
  },
  {
    component: "KxResizablePanelGroup",
    async run(page, rtl, t) {
      const G = "#rz-h";
      const H = "#rz-h-handle";
      await rect(page, G);
      let g = await group(page, G, H);
      t(rtl ? g.rects[0].left > g.rects[1].left : g.rects[0].left < g.rects[1].left, "the first panel is at the inline start", `first at ${f(g.rects[0].left)}, second at ${f(g.rects[1].left)}`);
      await focus(page, H);
      const seq = [];
      for (const key of rtl ? ["ArrowLeft", "ArrowRight", "ArrowRight"] : ["ArrowRight", "ArrowLeft", "ArrowLeft"]) {
        await press(page, key);
        seq.push(`${key}:${(await group(page, G, H)).now}`);
      }
      t(seq.map((s) => s.split(":")[1]).join() === "55,50,45", "the arrow toward the inline end grows the first panel, toward the start shrinks it", seq.join(" "));
      await press(page, rtl ? "ArrowLeft" : "ArrowRight");
      g = await group(page, G, H);
      const s = centre(await rect(page, H));
      await slowDrag(page, s, { x: s.x + (rtl ? -32 : 32), y: s.y }, { steps: 8, wait: 0 });
      const d = await group(page, G, H);
      t(near(d.sizes[0], g.sizes[0] + 32, 1.5), "a drag toward the inline end grows the first panel by the distance", `${f(g.sizes[0])} -> ${f(d.sizes[0])}px`);
      await focus(page, "#rz-v-handle-1");
      await press(page, "ArrowDown");
      t((await group(page, "#rz-v", "#rz-v-handle-1")).now === 30, "a vertical group's ArrowDown is the same in either direction", `${(await group(page, "#rz-v", "#rz-v-handle-1")).now}`);
    },
  },
  {
    component: "KxCarousel",
    async run(page, rtl, t) {
      const B = "#cr-basic";
      await rect(page, B);
      let c = await carousel(page, B);
      t(startSlide(c, rtl) === 0 && (rtl ? c.slides[1].right <= c.slides[0].left + 0.5 : c.slides[1].left >= c.slides[0].right - 0.5), "the first slide is at the inline start, the next one toward the inline end", `slide 1 ${f(c.slides[0].left)}–${f(c.slides[0].right)}, slide 2 ${f(c.slides[1].left)}–${f(c.slides[1].right)}`);
      t(rtl ? c.prev.left > c.next.left : c.prev.left < c.next.left, "Previous is at the inline start, Next at the end", `prev ${f(c.prev.left)}, next ${f(c.next.left)}`);
      t(c.glyphDir === (rtl ? "rtl" : "ltr"), "the controls' glyphs resolve in the carousel's direction (so ‹ › mirror)", c.glyphDir);
      await focus(page, "#cr-basic-next");
      const fwd = rtl ? "ArrowLeft" : "ArrowRight";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      const seq = [];
      for (const key of [fwd, fwd, back]) {
        await press(page, key);
        seq.push(`${key}:${await out(page, "cr-basic")}`);
      }
      c = await carousel(page, B);
      t(seq.map((s) => s.split(":")[1]).join() === "1,2,1" && startSlide(c, rtl) === 1, "the arrow toward the inline end is Next, the other Previous", seq.join(" "));
      const v = centre(c.view);
      await slowDrag(page, v, { x: v.x + (rtl ? 1 : -1) * c.view.width * 0.4, y: v.y }, { steps: 8 });
      c = await carousel(page, B);
      t((await out(page, "cr-basic")) === "2" && startSlide(c, rtl) === 2, "a drag toward the inline start moves on", `index ${await out(page, "cr-basic")}`);
      await rect(page, "#cr-vertical");
      await focus(page, "#cr-vertical-next");
      await press(page, "ArrowDown");
      t((await out(page, "cr-vertical")) === "1", "a vertical carousel's ArrowDown is the same in either direction", `${await out(page, "cr-vertical")}`);
    },
  },
  {
    component: "KxComparisonSlider",
    async run(page, rtl, t) {
      const S = "#cs-default";
      await rect(page, S);
      await click(page, "#cs-set-30");
      let c = await comparison(page);
      t(near(c.dividerX, dividerAt(c, 30, rtl), 1), "30 is drawn 30% from the inline start", `${f(c.dividerX - c.host.left)} of ${f(c.host.width)}px from the left`);
      t(rtl ? c.beforeLabel.left > c.afterLabel.left : c.beforeLabel.left < c.afterLabel.left, "the before label is at the inline start", `before ${f(c.beforeLabel.left)}, after ${f(c.afterLabel.left)}`);
      await focus(page, `${S} input`);
      await press(page, rtl ? "ArrowLeft" : "ArrowRight");
      c = await comparison(page);
      t(c.value === 31 && near(c.dividerX, dividerAt(c, 31, rtl), 1), "the arrow toward the inline end increases it, and the divider moves that way", `${c.value}`);
      await page.mouse.click(rtl ? c.host.right - c.host.width * 0.25 : c.host.left + c.host.width * 0.25, c.host.top + c.host.height / 2);
      await idle(page);
      c = await comparison(page);
      t(near(c.value, 25, 1) && near(c.dividerX, dividerAt(c, 25, rtl), 1.5), "a press a quarter of the way from the inline start sets 25 and draws it there", `${f(c.value)}`);
    },
  },
];
const DIRECTION_CASES = [
  { page: "ltr", region: null },
  { page: "rtl", region: null },
  { page: "rtl", region: "ltr" },
  { page: "ltr", region: "rtl" },
];
if (runs("rtl")) {
  assertClaims("rtl", RTL);
  report.push(`\nrtl — ${RTL.length} components in ${DIRECTION_CASES.length} direction cases`);
  for (const c of DIRECTION_CASES) {
    const want = c.region ?? c.page;
    const label = c.region ? `${c.region} region in an ${c.page} page` : `${c.page} page`;
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
    const page = await open(context, { dir: c.page, region: c.region });
    const resolved = await page.locator("#region").evaluate((el) => getComputedStyle(el).direction);
    check(resolved === want, `(${label}): the region resolves to ${want}`, resolved);
    for (const subject of RTL) {
      const name = `${subject.component} (${label})`;
      try {
        await subject.run(page, want === "rtl", (ok, what, detail) => check(ok, `${name}: ${what}`, detail));
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
        await page.mouse.up().catch(() => {});
      }
    }
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: largeText
 *
 * 320, 390, 768 and 1280px wide, at the root font size and at 200%: each component fits the width (nothing of
 * it past the viewport's edge), its text grows with the reader's, and it still works at that size.
 *
 * KxScrollArea — its bars grow with the text; End scrolls to the end with the thumb there; its focus ring is
 *   painted on all four edges.
 * KxResizablePanelGroup — an arrow still moves the boundary by 5 and the panels follow.
 * KxCarousel — Previous and Next are at least 24px, inside the carousel's box and not over the slides, and Next
 *   still moves on with the slide aligned.
 * KxComparisonSlider — the two labels do not overlap; the arrow still moves the value and the divider.
 * ════════════════════════════════════════════════════════════════════════════ */
const LARGE = [
  {
    component: "KxScrollArea",
    host: "#sa-vertical",
    text: "#sa-vertical .tag",
    async run(page, t) {
      const V = "#sa-vertical";
      await rect(page, V);
      const a0 = await area(page, V);
      t(a0.y && a0.y.bar.width >= 0.625 * (await rootPx(page)) - 0.5, "its bar grows with the text", `${f(a0.y?.bar.width)}px`);
      await focus(page, `${V} > .kx-scroll-area__viewport`);
      const ring = await ringPainted(page, `${V} > .kx-scroll-area__viewport`);
      t(ringOk(ring), "its focus ring is painted on all four edges", ringText(ring));
      await press(page, "End");
      await scrolled(page, V);
      const a = await area(page, V);
      t(near(a.top, a.rangeY, 1) && near(a.y.thumb.bottom, a.y.bar.bottom), "End scrolls to the end, the thumb there", `top ${f(a.top)} of ${f(a.rangeY)}`);
    },
  },
  {
    component: "KxResizablePanelGroup",
    host: "#rz-h",
    text: "#rz-h .pane",
    async run(page, t) {
      await rect(page, "#rz-h");
      await focus(page, "#rz-h-handle");
      const before = await group(page, "#rz-h", "#rz-h-handle");
      await press(page, "ArrowRight");
      const g = await group(page, "#rz-h", "#rz-h-handle");
      t(g.now === before.now + 5 && near(g.share[0], g.now, 0.5), "an arrow still moves the boundary by 5, the panels following", `${before.now} -> ${g.now}`);
    },
  },
  {
    component: "KxCarousel",
    host: "#cr-basic",
    text: "#cr-basic .slide",
    async run(page, t) {
      await rect(page, "#cr-basic");
      let c = await carousel(page, "#cr-basic");
      const host = await rect(page, "#cr-basic");
      const ok = [c.prev, c.next].every((b) => b.width >= 24 && b.height >= 24 && b.left >= host.left - 0.5 && b.right <= host.right + 0.5);
      const clear = c.prev.right <= c.view.left + 0.5 && c.next.left >= c.view.right - 0.5;
      t(ok && clear, "Previous and Next are at least 24px, inside the carousel and beside the slides", `prev ${f(c.prev.width)}×${f(c.prev.height)} at ${f(c.prev.left)}, next to ${f(c.next.right)}, box ${f(host.left)}–${f(host.right)}`);
      const i0 = Number(await out(page, "cr-basic"));
      await click(page, "#cr-basic-next", { force: true });
      c = await carousel(page, "#cr-basic");
      const i1 = Number(await out(page, "cr-basic"));
      t(i1 === i0 + 1 && near(c.slides[i1].left, c.view.left, 1), "Next still moves on, the slide aligned", `index ${i0} -> ${i1}`);
    },
  },
  {
    component: "KxComparisonSlider",
    host: "#cs-default",
    text: "#cs-default .kx-comparison-slider__label",
    async run(page, t) {
      await rect(page, "#cs-default");
      let c = await comparison(page);
      t(c.beforeLabel.right <= c.afterLabel.left + 0.5 || c.beforeLabel.bottom <= c.afterLabel.top + 0.5, "the before and after labels do not overlap", `before ends ${f(c.beforeLabel.right)}, after starts ${f(c.afterLabel.left)}`);
      await focus(page, "#cs-default input");
      const v0 = c.value;
      await press(page, "ArrowRight");
      c = await comparison(page);
      t(c.value === Math.min(100, v0 + 1) && near(c.dividerX, dividerAt(c, c.value, false), 1), "the arrow still moves the value and the divider", `${v0} -> ${c.value}`);
    },
  },
];
const rootPx = (page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
if (runs("largeText")) {
  assertClaims("largeText", LARGE);
  report.push(`\nlargeText — ${LARGE.length} components at 320, 390, 768 and 1280px, normal and 200% text`);
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await open(context);
    const base = {};
    for (const scale of [1, 2]) {
      await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * scale);
      await pause(page, 50);
      await idle(page);
      for (const s of LARGE) {
        const name = `${s.component} (${width}px, ${scale * 100}% text)`;
        try {
          await rect(page, s.host);
          const fit = await page.evaluate(
            ({ host, text }) => {
              const h = document.querySelector(host);
              const vw = document.documentElement.clientWidth;
              const parts = [h, ...h.querySelectorAll("*")].filter((e) => !e.closest(".kx-scroll-area__content, .kx-carousel__track"));
              const outside = parts.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && (r.left < -0.5 || r.right > vw + 0.5);
              });
              return { outside: outside.map((e) => e.className || e.tagName).slice(0, 3), font: parseFloat(getComputedStyle(document.querySelector(text)).fontSize) };
            },
            { host: s.host, text: s.text },
          );
          if (scale === 1) base[s.component] = fit.font;
          check(fit.outside.length === 0, `${name}: fits the width`, fit.outside.join(", "));
          if (scale === 2) check(fit.font >= base[s.component] * 1.8, `${name}: its text grows with the reader's`, `${base[s.component]}px -> ${fit.font}px`);
          await s.run(page, (ok, what, detail) => check(ok, `${name}: ${what}`, detail));
        } catch (err) {
          check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
        }
      }
    }
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(scroll <= 1, `the page (${width}px, 200% text): no sideways scroll`, `${scroll}px`);
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: reducedMotion
 *
 * KxCarousel is the one component here that animates: moving between positions slides the track (a transform
 * transition, --duration-base). With motion allowed, a Next travels through a rendered midpoint for at least the
 * perceptible floor; under prefers-reduced-motion it lands with no perceptible motion at the same final
 * position. Horizontal LTR and RTL and vertical; and while a drag runs nothing transitions, motion allowed or not.
 * ════════════════════════════════════════════════════════════════════════════ */
const MOTION = [
  { component: "KxCarousel", carousel: "#cr-basic", next: "#cr-basic-next" },
  { component: "KxCarousel", carousel: "#cr-vertical", next: "#cr-vertical-next" },
];
function sampleTravel(page, { carousel: sel, next }) {
  return page.evaluate(
    ({ sel, next }) =>
      new Promise((resolve) => {
        const track = document.querySelector(`${sel} .kx-carousel__track`);
        const read = () => getComputedStyle(track).transform;
        const a = read();
        document.querySelector(next).click();
        let frames = 0;
        let longest = 0;
        const tick = () => {
          frames++;
          const running = track.getAnimations().filter((x) => x.playState === "running" && Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
          longest = Math.max(longest, ...running.map((x) => Number(x.effect.getComputedTiming().activeDuration)));
          if (running.length) {
            running.forEach((x) => x.pause());
            running.forEach((x) => (x.currentTime = 0));
            const start = read();
            running.forEach((x) => (x.currentTime = Number(x.effect.getComputedTiming().activeDuration) / 2));
            const mid = read();
            running.forEach((x) => x.finish());
            requestAnimationFrame(() => resolve({ a: start, mid, b: read(), durationMs: longest }));
          } else if (frames > 6 && read() !== a) resolve({ a, mid: null, b: read(), durationMs: longest });
          else if (frames > 60) resolve({ a, mid: null, b: read(), durationMs: longest, timeout: true });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { sel, next },
  );
}
if (runs("reducedMotion")) {
  assertClaims("reducedMotion", MOTION);
  const { PERCEPTIBLE_MS, SUPPRESSED_MS } = await import("./motion-states.mjs");
  report.push(`\nreducedMotion — ${MOTION.length} carousels, Next, LTR and RTL, normal and reduced`);
  for (const s of MOTION) {
    for (const dir of ["ltr", "rtl"]) {
      let normalEnd = null;
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, { dir });
        const name = `${s.component} ${s.carousel} Next (${dir}, ${reduced ? "reduced" : "normal"} motion)`;
        try {
          await rect(page, s.carousel);
          const m = await sampleTravel(page, s);
          await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
          await idle(page);
          if (!reduced) {
            normalEnd = m.b;
            check(m.durationMs >= PERCEPTIBLE_MS && m.mid !== null && isIntermediate(m.a, m.mid, m.b), `${name}: travels through a rendered midpoint`, `${m.a} → ${m.mid} → ${m.b} over ${m.durationMs}ms`);
          } else {
            check(m.durationMs <= SUPPRESSED_MS, `${name}: no perceptible motion`, `${m.durationMs}ms`);
            check(m.b === normalEnd, `${name}: lands on the same position`, `${m.b} (normal: ${normalEnd})`);
          }
          // a drag: nothing transitions while it runs
          const c = await carousel(page, s.carousel);
          const v = centre(c.view);
          const vertical = s.carousel === "#cr-vertical";
          let animating = null;
          await slowDrag(page, v, vertical ? { x: v.x, y: v.y - 30 } : { x: v.x - 30, y: v.y }, {
            steps: 3,
            during: async (i) => {
              if (i === 3) animating = await page.locator(`${s.carousel} .kx-carousel__track`).evaluate((tr) => tr.getAnimations().filter((x) => x.playState === "running").length);
            },
          });
          check(animating === 0, `${name}: nothing transitions while dragging`, `${animating} running`);
        } catch (err) {
          check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
        }
        await context.close();
      }
    }
  }
}

/* ── verdict ─────────────────────────────────────────────────────────────── */

check(pageErrors.length === 0, "no page error or console error in any run", [...new Set(pageErrors)].slice(0, 5).join(" | "));
await browser.close();
server.close();
rmSync(harnessDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ angular-layout: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nangular-layout ok — @kinetixui/angular scroll area, resizable, carousel and comparison slider, live in Chromium.`);
