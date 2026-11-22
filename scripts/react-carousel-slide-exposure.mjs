/**
 * react-carousel-slide-exposure.mjs — what a keyboard reader and a screen reader can reach in a React
 * Carousel, measured in Chromium on BOTH axes.
 *
 *   pnpm check:react-carousel-slide-exposure
 *
 * Four claims, none of which jsdom can decide, because all four depend on slides being laid out:
 *
 *   1. Tab never lands in a slide that is out of view. Every fixture slide holds a LINK, because a slide's
 *      interactive descendants are the only thing a Tab order can walk into; a carousel of inert text
 *      cannot show the defect. Measured on `main` before the fix: the walk read
 *      `slide 1 → 2 → 3 → 4 → 5 → Previous`, so a reader passed through four slides they could not see.
 *   2. A slide out of view is `inert`, and one in view is not.
 *   3. Focus follows the view: focus inside a slide that leaves the view lands on the first slide now in
 *      view, rather than falling to `BODY`.
 *   4. The reader's own move is announced once, politely, and nothing is announced at initialization.
 *
 * On BOTH axes, in LTR and RTL — the vertical axis had no browser coverage at all before this gate,
 * because Storybook renders one generated story per demo and there is no vertical carousel demo.
 *
 * Every reading waits for the harness's `[data-kx-ready]`, which is set only once the engine reports a
 * non-empty `slidesInView`. An assertion over an empty collection passes while proving nothing, and an
 * un-measured carousel reports exactly that empty collection.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveStatic } from "./visual-harness.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The defects this gate exists to catch, each restored by a mutation IN THE PAGE — the component on disk
 * is never touched, and the mutation lives for the length of one browser context.
 *
 * `scripts/react-carousel-slide-exposure-negative-controls.mjs` drives the gate once per entry and
 * requires it to fail the rows that defect breaks AND to pass the rest: a control that only proves "some
 * row failed" would also be satisfied by a mis-built harness, a missing fixture or a bad selector.
 *
 * Reached only through `KX_CAROUSEL_DEFECT`, which prints the banner below. The control asserts the banner
 * is present, so a run that silently ignored the variable could not be mistaken for a reproduction.
 */
export const DEFECTS = {
  /**
   * Before the fix no slide was inert, so Tab walked into every slide that was off screen.
   *
   * Intercepted at `Element.prototype`, not stripped from the DOM. A `MutationObserver` that removes the
   * attribute LOSES THE RACE: React re-renders and writes it straight back, and the gate — reading after
   * that — saw the fixed component and passed. Measured: all four attribute controls reported "the gate
   * PASSED with the defect restored" until they were moved here. Refusing the write runs before React
   * mounts and React cannot win it, which is what makes the page behave like the component that never
   * wrote the attribute at all.
   */
  "no-inert": () => {
    const setAttr = Element.prototype.setAttribute;
    const toggleAttr = Element.prototype.toggleAttribute;
    const slide = (el) => el.getAttribute?.("aria-roledescription") === "slide";
    Element.prototype.setAttribute = function (name, value) {
      if (name === "inert" && slide(this)) return;
      return setAttr.call(this, name, value);
    };
    Element.prototype.toggleAttribute = function (name, force) {
      if (name === "inert" && slide(this)) return false;
      return toggleAttr.call(this, name, force);
    };
    const own = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "inert");
    if (own) Object.defineProperty(HTMLElement.prototype, "inert", { ...own, set(v) { if (!slide(this)) own.set.call(this, v); } });
  },

  /** Before the fix a slide carried no name, so a reader heard "slide" with no position. */
  "no-slide-names": () => {
    const setAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === "aria-label" && this.getAttribute?.("aria-roledescription") === "slide") return;
      return setAttr.call(this, name, value);
    };
  },

  /** Before the fix the region had no accessible name, so it was not exposed as a landmark at all. */
  "no-region-name": () => {
    const setAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === "aria-label" && this.getAttribute?.("aria-roledescription") === "carousel") return;
      return setAttr.call(this, name, value);
    };
  },

  /**
   * Before the fix nothing announced a change: there was no live region to announce from. The region is
   * left in place and kept EMPTY, so the "the live region is polite and atomic" row still passes — the
   * defect being restored is the silence, not the element's absence.
   */
  "no-announcement": () => {
    const proto = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
    Object.defineProperty(Node.prototype, "textContent", {
      ...proto,
      set(v) {
        if (this.parentElement?.hasAttribute?.("aria-live") || this.hasAttribute?.("aria-live")) return proto.set.call(this, "");
        return proto.set.call(this, v);
      },
    });
    const insert = Element.prototype.insertBefore ?? Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (node, ref) {
      const r = insert.call(this, node, ref);
      if (this.hasAttribute?.("aria-live")) proto.set.call(this, "");
      return r;
    };
    const append = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
      const r = append.call(this, node);
      if (this.hasAttribute?.("aria-live")) proto.set.call(this, "");
      return r;
    };
  },

  /**
   * Before the fix a vertical carousel ignored the block keys and answered the inline pair instead. The
   * press is swallowed in the capture phase before the component's bubble handler can see it, which is
   * indistinguishable, from the page's side, from a handler that never mapped the key.
   */
  "vertical-ignores-block-keys": () => {
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") e.stopPropagation();
      },
      true,
    );
  },
};

const DEFECT = process.env.KX_CAROUSEL_DEFECT;
if (DEFECT && !(DEFECT in DEFECTS)) {
  console.error(`react-carousel-slide-exposure: KX_CAROUSEL_DEFECT=${DEFECT} is not one of ${Object.keys(DEFECTS).join(", ")}`);
  process.exit(2);
}
if (DEFECT) console.log(`CONTROL  the defect "${DEFECT}" is restored in the page — this run MUST fail.`);
const rows = [];
const ok = (section, name, detail) => rows.push({ section, pass: true, name, detail });
const bad = (section, name, detail) => rows.push({ section, pass: false, name, detail });

const SLIDE = '[role="group"][aria-roledescription="slide"]';

/** Everything the gate reads, in one evaluate, so no two numbers come from two different layouts. */
const read = (page) =>
  page.evaluate(
    (SLIDE) => {
      const region = document.querySelector('[role="region"][aria-roledescription="carousel"]');
      const slides = [...document.querySelectorAll(SLIDE)];
      const live = region?.querySelector("[aria-live]");
      const vp = region?.querySelector(".overflow-hidden");
      const vbox = vp?.getBoundingClientRect();
      const inView = (el) => {
        if (!vbox) return false;
        const r = el.getBoundingClientRect();
        const x = Math.min(r.right, vbox.right) - Math.max(r.left, vbox.left);
        const y = Math.min(r.bottom, vbox.bottom) - Math.max(r.top, vbox.top);
        return x > 1 && y > 1;
      };
      const engineInView = (document.documentElement.dataset.kxInView ?? "")
        .split(",")
        .filter((x) => x !== "")
        .map(Number);
      return {
        engineInView,
        regionName: region?.getAttribute("aria-label"),
        roleDescription: region?.getAttribute("aria-roledescription"),
        announcement: live?.textContent ?? null,
        liveMode: live?.getAttribute("aria-live") ?? null,
        liveAtomic: live?.getAttribute("aria-atomic") ?? null,
        slides: slides.map((s, i) => ({
          n: i + 1,
          label: s.getAttribute("aria-label"),
          inert: s.hasAttribute("inert"),
          // The engine decides; geometry is reported beside it only so a disagreement is visible.
          inView: engineInView.includes(i),
          inViewByGeometry: inView(s),
        })),
        active: document.activeElement?.id || document.activeElement?.textContent?.trim() || document.activeElement?.tagName,
        activeSlide: slides.findIndex((s) => s.contains(document.activeElement)) + 1,
      };
    },
    SLIDE,
  );

/** Tab from a known anchor before the carousel and collect every stop until the anchor after it. */
async function tabWalk(page) {
  await page.evaluate(() => document.getElementById("before").focus());
  const stops = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
    stops.push(id);
    if (id === "after" || id === "BODY") break;
  }
  return stops;
}

const settle = async (page) => {
  for (let i = 0, last = null; i < 60; i++) {
    const now = await page.evaluate(() => {
      const t = document.querySelector('[role="region"] .flex');
      return t ? getComputedStyle(t).transform : null;
    });
    if (now === last) return now;
    last = now;
    await page.waitForTimeout(50);
  }
  return null;
};

const ready = (page) => page.waitForSelector("[data-kx-ready]", { state: "attached", timeout: 20_000 });

/** Every page the gate opens goes through here, so a control's mutation cannot miss one. */
async function open(browser, url, contextOptions) {
  const ctx = await browser.newContext(contextOptions);
  const page = await ctx.newPage();
  if (DEFECT) await page.addInitScript(DEFECTS[DEFECT]);
  await page.goto(url, { waitUntil: "load" });
  await ready(page);
  await settle(page);
  return { ctx, page };
}

async function axis(browser, base, { file, name, forward }) {
  const { ctx, page } = await open(browser, `${base}/${file}`);
  const s = await read(page);

  // ── controls for the measurement itself ──────────────────────────────────
  if (s.slides.length === 5) ok(name, "control: the harness mounted five slides", `${s.slides.length}`);
  else return void bad(name, "control: the harness mounted five slides", `${s.slides.length} — nothing below is measuring a carousel`);

  const out = s.slides.filter((x) => !x.inView);
  const inv = s.slides.filter((x) => x.inView);
  if (out.length && inv.length)
    ok(name, "control: the engine has measured, and some slides are out of view", `in view ${inv.map((x) => x.n)}, out ${out.map((x) => x.n)}`);
  else
    return void bad(name, "control: the engine has measured, and some slides are out of view", `in view ${inv.length}, out ${out.length} — an un-laid-out carousel would pass every row below over nothing`);

  // ── 1 + 2. exposure ──────────────────────────────────────────────────────
  if (out.every((x) => x.inert)) ok(name, "a slide out of view is inert", `${out.length} inert`);
  else bad(name, "a slide out of view is inert", `not inert: ${out.filter((x) => !x.inert).map((x) => x.n)}`);

  if (inv.every((x) => !x.inert)) ok(name, "a slide in view is NOT inert", `${inv.length} live`);
  else bad(name, "a slide in view is NOT inert", `wrongly inert: ${inv.filter((x) => x.inert).map((x) => x.n)}`);

  // A fresh page for the Tab walk, and another for the focus section below. Focusing an element that is
  // out of view scrolls its scroll container, which moves the carousel — so a walk leaves the track
  // somewhere other than where it started, and a later section sharing the page would be reading a
  // carousel the walk had already moved. Measured: sharing one page made slide 1 inert by the time the
  // focus section tried to focus into it, and `focus()` on an inert subtree is simply refused.
  const { page: walkPage } = await open(browser, `${base}/${file}`);
  const stops = await tabWalk(walkPage);
  const reached = out.filter((x) => stops.includes(`slide-link-${x.n}`));
  if (!reached.length) ok(name, "Tab never lands in a slide out of view", stops.join(" → "));
  else bad(name, "Tab never lands in a slide out of view", `reached ${reached.map((x) => x.n)} — ${stops.join(" → ")}`);

  if (inv.some((x) => stops.includes(`slide-link-${x.n}`)))
    ok(name, "Tab DOES reach the slide in view, so inert did not hide everything", stops.join(" → "));
  else bad(name, "Tab DOES reach the slide in view, so inert did not hide everything", `no in-view slide link among ${stops.join(" → ")}`);

  if (stops.at(-1) === "after") ok(name, "the walk leaves the carousel and reaches the anchor after it", stops.at(-1));
  else bad(name, "the walk leaves the carousel and reaches the anchor after it", `ended at ${stops.at(-1)}`);

  await walkPage.context().close();

  // ── 3. focus follows the view ────────────────────────────────────────────
  const { page: focusPage } = await open(browser, `${base}/${file}`);
  await focusPage.evaluate(() => document.getElementById("slide-link-1")?.focus());
  const before = await read(focusPage);
  await focusPage.keyboard.press(forward);
  await settle(focusPage);
  const after = await read(focusPage);
  if (before.activeSlide === 1) ok(name, "control: focus began inside slide 1", `activeSlide=${before.activeSlide}`);
  else bad(name, "control: focus began inside slide 1", `activeSlide=${before.activeSlide}`);

  if (after.active !== "BODY") ok(name, "focus is not dropped when its slide leaves the view", `activeElement=${after.active}`);
  else bad(name, "focus is not dropped when its slide leaves the view", "focus fell to BODY");

  const landed = after.slides.find((x) => x.n === after.activeSlide);
  if (landed && landed.inView) ok(name, "focus landed on a slide that is in view", `slide ${landed.n}`);
  else bad(name, "focus landed on a slide that is in view", `activeSlide=${after.activeSlide}, active=${after.active}, engineInView=${after.engineInView}`);

  await focusPage.context().close();

  // ── 4. announcement ──────────────────────────────────────────────────────
  if (after.liveMode === "polite" && after.liveAtomic === "true") ok(name, "the live region is polite and atomic", `${after.liveMode}/${after.liveAtomic}`);
  else bad(name, "the live region is polite and atomic", `${after.liveMode}/${after.liveAtomic}`);

  // By VALUE, not by shape: a phrase of the right shape naming the slide the reader just LEFT is the
  // defect this row exists to catch, and `/Slide \d+ of 5/` passes it happily.
  const expected = `Slide ${(after.engineInView[0] ?? -1) + 1} of 5`;
  if (after.announcement === expected) ok(name, "the reader's move is announced, naming where the track ENDED", JSON.stringify(after.announcement));
  else bad(name, "the reader's move is announced, naming where the track ENDED", `announced ${JSON.stringify(after.announcement)}, the engine shows ${JSON.stringify(expected)} in view`);

  if (after.engineInView[0] === 1) ok(name, "control: the move actually advanced one position", `in view ${after.engineInView}`);
  else bad(name, "control: the move actually advanced one position", `in view ${after.engineInView} — the phrase above describes a move that did not happen`);

  // ── naming ───────────────────────────────────────────────────────────────
  if (s.slides.every((x, i) => x.label === `${i + 1} of 5`)) ok(name, "every slide is named “N of 5”", s.slides.map((x) => x.label).join(", "));
  else bad(name, "every slide is named “N of 5”", JSON.stringify(s.slides.map((x) => x.label)));

  if (s.regionName && !/carousel/i.test(s.regionName))
    ok(name, "the region is named, and not with the word the roledescription already says", `${JSON.stringify(s.regionName)} + roledescription ${JSON.stringify(s.roleDescription)}`);
  else bad(name, "the region is named, and not with the word the roledescription already says", JSON.stringify(s.regionName));

  await ctx.close();
}

/** Initialization must be silent, and a consumer's own name must win. */
async function statics(browser, base) {
  const name = "at rest";
  const { ctx, page } = await open(browser, `${base}/horizontal.html`);
  const s = await read(page);
  if (s.announcement === "") ok(name, "nothing is announced at initialization", '""');
  else bad(name, "nothing is announced at initialization", JSON.stringify(s.announcement));

  const { page: namedPage } = await open(browser, `${base}/named.html`);
  const named = await read(namedPage);
  if (named.regionName === "Featured work") ok(name, "a consumer's own region name wins over the default", named.regionName);
  else bad(name, "a consumer's own region name wins over the default", JSON.stringify(named.regionName));
  await namedPage.context().close();
  await ctx.close();
}

/** Under reduced motion the engine jumps instead of easing; every claim above must still hold. */
async function reducedMotion(browser, base) {
  const name = "reduced motion";
  const { ctx, page } = await open(browser, `${base}/vertical.html`, { reducedMotion: "reduce" });
  await page.evaluate(() => document.getElementById("slide-link-1")?.focus());
  await page.keyboard.press("ArrowDown");
  await settle(page);
  const s = await read(page);
  const out = s.slides.filter((x) => !x.inView);
  if (out.length && out.every((x) => x.inert)) ok(name, "slides out of view are still inert", `${out.length} inert`);
  else bad(name, "slides out of view are still inert", `out=${out.length}, inert=${out.filter((x) => x.inert).length}`);
  if (s.active !== "BODY") ok(name, "focus is still not dropped", `activeElement=${s.active}`);
  else bad(name, "focus is still not dropped", "focus fell to BODY");
  if (/of 5$/.test(s.announcement ?? "")) ok(name, "the move is still announced", JSON.stringify(s.announcement));
  else bad(name, "the move is still announced", JSON.stringify(s.announcement));
  await ctx.close();
}

/** A touch drag is the reader moving the track, so it announces too — once, when it lands. */
async function touch(browser, base) {
  const name = "touch";
  const { ctx, page } = await open(browser, `${base}/horizontal.html`, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });
  const box = await page.locator(".overflow-hidden").boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  for (const f of [0.6, 0.4, 0.2]) await page.mouse.move(box.x + box.width * f, y);
  await page.mouse.up();
  await settle(page);
  const s = await read(page);
  if (/^Slides? \d+( to \d+)? of 5$/.test(s.announcement ?? "")) ok(name, "a drag announces where it landed", JSON.stringify(s.announcement));
  else bad(name, "a drag announces where it landed", JSON.stringify(s.announcement));
  const out = s.slides.filter((x) => !x.inView);
  if (out.length && out.every((x) => x.inert)) ok(name, "the slides left behind are inert", `${out.length} inert`);
  else bad(name, "the slides left behind are inert", `out=${out.length}, inert=${out.filter((x) => x.inert).length}`);
  await ctx.close();
}

/**
 * Everything below runs only when this file IS the process's entry point. `DEFECTS` is imported by
 * `react-carousel-slide-exposure-negative-controls.mjs`, and without this guard that import ran the whole
 * gate and then called `process.exit(0)`, so the control script was killed before it tested anything and
 * reported success — measured: it printed the gate's own rows and exited 0 having run no control at all.
 * Exactly the failure mode `an-assertion-over-nothing-passes` is about, in the control rather than the gate.
 */
async function main() {
  const dist = join(root, "packages/ui/browser/dist");
  if (!existsSync(join(dist, "vertical.html")) || process.env.KX_REACT_HARNESS_REBUILD) {
    execFileSync("node", [join(root, "packages/ui/browser/build.mjs")], { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  }
  if (!existsSync(join(dist, "vertical.html"))) {
    console.error("react-carousel-slide-exposure: the harness did not build.");
    process.exit(2);
  }

  const server = await serveStatic(dist);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  try {
    await axis(browser, server.base, { file: "horizontal.html", name: "horizontal", forward: "ArrowRight" });
    await axis(browser, server.base, { file: "horizontal-rtl.html", name: "horizontal rtl", forward: "ArrowLeft" });
    await axis(browser, server.base, { file: "vertical.html", name: "vertical", forward: "ArrowDown" });
    await axis(browser, server.base, { file: "vertical-rtl.html", name: "vertical rtl", forward: "ArrowDown" });
    await statics(browser, server.base);
    await reducedMotion(browser, server.base);
    await touch(browser, server.base);
  } finally {
    await browser.close();
    await server.close();
  }

  const w = Math.max(...rows.map((r) => r.name.length));
  let section = null;
  for (const r of rows) {
    if (r.section !== section) console.log(`\n${(section = r.section)}`);
    console.log(`  ${r.pass ? "ok  " : "FAIL"} ${r.name.padEnd(w)}  ${r.detail}`);
  }
  const failed = rows.filter((r) => !r.pass);
  console.log(
    failed.length
      ? `\nreact-carousel-slide-exposure: ${failed.length} of ${rows.length} assertions failed.`
      : `\nreact-carousel-slide-exposure: ${rows.length} assertions, all ok — a reader reaches only the slides they can see.`,
  );
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
