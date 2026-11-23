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
 *      view, rather than falling to `BODY` — through a completed move, and through a burst of presses
 *      that interrupt one another, where the reader leaves a slide behind on every press.
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
import { SOURCE_DEFECTS } from "../packages/ui/browser/source-defects.mjs";

export { SOURCE_DEFECTS };

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

  /**
   * The owner's instruction for the fallback name is that it must not be forced onto a consumer who has
   * named the region themselves. This restores the behaviour that would break it: the fallback is written
   * over whatever the consumer passed. Without this control the naming rows would pass against a
   * component that ignored a consumer's name entirely, since "the region has A name" is also true then.
   */
  "fallback-overrides-consumer-name": () => {
    const setAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === "aria-label" && this.getAttribute?.("aria-roledescription") === "carousel")
        return setAttr.call(this, name, "Slides");
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
   * Restores "a phrase per position": the announcement's settle window collapsed to nothing, so every
   * `select` in a burst speaks instead of only the landing. Done by shortening the component's own
   * `QUIET_MS` timer — and ONLY that timer, matched by its exact delay, so React's scheduling, the
   * engine's animation and Playwright's own instrumentation are left alone. A control that slowed or
   * broke the whole page would redden rows for reasons that have nothing to do with the behaviour.
   */
  "announce-per-position": () => {
    const native = window.setTimeout;
    Object.defineProperty(window, "setTimeout", {
      configurable: true,
      writable: true,
      value: function (fn, delay, ...rest) {
        return native.call(window, fn, delay === 80 ? 0 : delay, ...rest);
      },
    });
  },

};

const SOURCE_DEFECT = process.env.KX_CAROUSEL_SOURCE_DEFECT;
if (SOURCE_DEFECT && !(SOURCE_DEFECT in SOURCE_DEFECTS)) {
  console.error(`react-carousel-slide-exposure: KX_CAROUSEL_SOURCE_DEFECT=${SOURCE_DEFECT} is not one of ${Object.keys(SOURCE_DEFECTS).join(", ")}`);
  process.exit(2);
}
if (SOURCE_DEFECT) console.log(`CONTROL  the SOURCE defect "${SOURCE_DEFECT}" is compiled into the harness — this run MUST fail.`);
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
        engineSelected: Number(document.documentElement.dataset.kxSelected ?? "-1"),
        // The SLIDE that snap landed on. Equal to the snap only while one slide scrolls at a time.
        engineSelectedSlide: Number(document.documentElement.dataset.kxSelectedSlide ?? "-1"),
        // Every phrase the live region has HELD, in order — what a screen reader would have been handed.
        // Reading the region once cannot tell "announced the landing" from "announced somewhere it passed
        // through and then fell silent": both leave one string in the DOM.
        spoken: [...((window.__kxSpoken ?? []))],
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
  // defect this row exists to catch, and `/Slide \d+ of 5/` passes it happily. The value is taken from the
  // engine's SELECTED index, which is what is announced and the only quantity that is final — the in-view
  // set is still changing a second and a half after the slide has visibly arrived.
  const expected = `Slide ${after.engineSelectedSlide + 1} of 5`;
  if (after.announcement === expected) ok(name, "the reader's move is announced, naming where the track ENDED", JSON.stringify(after.announcement));
  else bad(name, "the reader's move is announced, naming where the track ENDED", `announced ${JSON.stringify(after.announcement)}, the engine has selected ${JSON.stringify(expected)}`);

  // ONE phrase, not a running commentary. A movement changes the in-view set several times — measured
  // `[0] → [] → [1]` for one keypress — so a phrase emitted per change both says the wrong thing and says
  // it repeatedly; a screen reader would read each one out.
  if (after.spoken.length === 1) ok(name, "one move is announced exactly ONCE", JSON.stringify(after.spoken));
  else bad(name, "one move is announced exactly ONCE", `${after.spoken.length} phrases: ${JSON.stringify(after.spoken)}`);

  if (after.engineSelected === 1) ok(name, "control: the move actually advanced one position", `selected ${after.engineSelected}, in view ${after.engineInView}`);
  else bad(name, "control: the move actually advanced one position", `selected ${after.engineSelected} — the phrase above describes a move that did not happen`);

  // ── naming ───────────────────────────────────────────────────────────────
  if (s.slides.every((x, i) => x.label === `${i + 1} of 5`)) ok(name, "every slide is named “N of 5”", s.slides.map((x) => x.label).join(", "));
  else bad(name, "every slide is named “N of 5”", JSON.stringify(s.slides.map((x) => x.label)));

  if (s.regionName && !/carousel/i.test(s.regionName))
    ok(name, "the region is named, and not with the word the roledescription already says", `${JSON.stringify(s.regionName)} + roledescription ${JSON.stringify(s.roleDescription)}`);
  else bad(name, "the region is named, and not with the word the roledescription already says", JSON.stringify(s.regionName));

  await ctx.close();
}


/**
 * Reader intent: what the announcement is FOR. Each row here is a way the live region can speak when the
 * reader did not ask it to, or stay silent when they did — and none of them was visible to a gate that
 * read the region once at the end of a keypress.
 *
 * It runs on `horizontal-engine-threshold.html` as well as the pinned fixture. Pinning `inViewThreshold`
 * is what makes the in-view set stable enough to assert, and it also collapses a movement's in-view
 * changes into fewer notifications — so a gate run only against the pinned fixture cannot see a defect
 * that needs several of them. Measured: `[0] → [] → [1]` pinned, and a set still changing 1500ms in with
 * the engine's own threshold.
 */
async function intent(browser, base, file) {
  const name = `intent (${file.replace(".html", "")})`;
  const { ctx, page } = await open(browser, `${base}/${file}`);
  const next = page.getByRole("button", { name: "Next slide" });
  const spoken = () => page.evaluate(() => [...(window.__kxSpoken ?? [])]);
  const clear = () => page.evaluate(() => void (window.__kxSpoken.length = 0));

  // A burst speaks ONCE, naming where the track came to rest — not once per position it passed through.
  await clear();
  for (let i = 0; i < 6; i++) {
    await next.click({ force: true });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(700);
  let said = await spoken();
  let s = await read(page);
  const landing = `Slide ${s.engineSelectedSlide + 1} of 5`;
  if (said.length === 1 && said[0] === landing) ok(name, "a burst of presses speaks once, naming the landing", JSON.stringify(said));
  else bad(name, "a burst of presses speaks once, naming the landing", `${JSON.stringify(said)}, engine selected ${s.engineSelected}`);
  if (s.engineSelected > 1) ok(name, "control: the burst actually moved several positions", `selected ${s.engineSelected}`);
  else bad(name, "control: the burst actually moved several positions", `selected ${s.engineSelected} — the row above describes a burst that did not happen`);

  // A press on a slide's own link is a CLICK, not a drag. The engine reports `pointerDown` either way, so
  // a region that speaks on the press alone will later attribute someone else's movement to the reader.
  await clear();
  await page.locator("#slide-link-2").click({ force: true }).catch(() => {});
  await page.waitForTimeout(200);
  said = await spoken();
  if (!said.length) ok(name, "a press that is a click, not a drag, announces nothing", "[]");
  else bad(name, "a press that is a click, not a drag, announces nothing", JSON.stringify(said));

  // ...and the intent it recorded must not be left for the next thing that moves the track to spend.
  // Measured before the fix: this resize announced "Slides 2 to 3 of 5".
  const box = page.viewportSize();
  await page.setViewportSize({ width: box.width - 160, height: box.height });
  await page.waitForTimeout(900);
  said = await spoken();
  if (!said.length) ok(name, "a resize after that click announces nothing", "[]");
  else bad(name, "a resize after that click announces nothing", `${JSON.stringify(said)} — a movement the reader never asked for, announced as theirs`);
  await page.setViewportSize(box);
  await page.waitForTimeout(300);

  // An endpoint press on a non-looping carousel moves nothing and emits nothing. If it records intent, the
  // next reInit or autoplay tick is announced as the reader's move.
  await page.evaluate(() => document.querySelector('[role="region"]')?.focus());
  for (let i = 0; i < 8; i++) {
    await next.click({ force: true });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(700);
  s = await read(page);
  await clear();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: box.width - 200, height: box.height });
  await page.waitForTimeout(900);
  said = await spoken();
  if (!said.length) ok(name, "a press against the endpoint, then a resize, announces nothing", "[]");
  else bad(name, "a press against the endpoint, then a resize, announces nothing", JSON.stringify(said));
  if (s.engineSelected === 4) ok(name, "control: the carousel really is at its last slide", `selected ${s.engineSelected} of 0..4`);
  else bad(name, "control: the carousel really is at its last slide", `selected ${s.engineSelected} — the row above was not measured at an endpoint`);

  await ctx.close();

  // A gesture that starts while an earlier one's phrase is still pending must not have its own landing
  // spent by it. Measured before the fix: Next, then a drag beginning 40ms later, announced the control's
  // position and left the drag's landing SILENT — the pending callback found the drag's fresh intent and
  // consumed it. A fresh page, because this needs the carousel at a known start.
  const { ctx: raceCtx, page: race } = await open(browser, `${base}/${file}`);
  const track = await race.locator(".overflow-hidden").boundingBox();
  const midY = track.y + track.height / 2;
  await race.evaluate(() => void (window.__kxSpoken.length = 0));
  await race.getByRole("button", { name: "Next slide" }).click({ force: true, noWaitAfter: true });
  await race.waitForTimeout(40); // inside QUIET_MS, so the control's phrase is still pending
  await race.mouse.move(track.x + track.width * 0.8, midY);
  await race.mouse.down();
  await race.waitForTimeout(120); // ...and past it, so a pending callback would have fired by now
  for (const f of [0.6, 0.4, 0.2]) await race.mouse.move(track.x + track.width * f, midY);
  await race.mouse.up();
  await race.waitForTimeout(1600);
  const r = await read(race);
  const raceLanding = `Slide ${r.engineSelectedSlide + 1} of 5`;
  if (r.spoken.length === 1 && r.spoken[0] === raceLanding)
    ok(name, "a gesture begun mid-phrase is announced, once, at ITS landing", JSON.stringify(r.spoken));
  else bad(name, "a gesture begun mid-phrase is announced, once, at ITS landing", `${JSON.stringify(r.spoken)}, the engine landed on ${JSON.stringify(raceLanding)}`);
  await raceCtx.close();
}

/**
 * Focus through an INTERRUPTED gesture, which is the one thing the sections above do not measure.
 *
 * They measure focus through a COMPLETED move — one key, then settle — and announcements through an
 * interruption. The gap is the combination: a reader arrowing faster than the track settles leaves a
 * slide behind on every press, and each slide they leave goes `inert` under them. The browser blurs an
 * element that becomes inert, so focus is lost unless the transfer runs again for every change of the
 * view. One press cannot show that, because one press needs only one transfer.
 *
 * Keys, not clicks: clicking `Next` would move focus to the button and there would be no focus inside a
 * slide left to lose. 40 ms between presses, which is inside `QUIET_MS` and well inside the scroll, so
 * each press lands while the previous one is still running — the same interval the race arm above uses.
 *
 * `activeElement` is sampled between presses rather than only at the end. A reader whose focus falls to
 * `BODY` mid-burst and is then picked up again by a later transfer has still lost their place, and a
 * single reading at settlement cannot see it. Sampling is a read: `page.evaluate` of `activeElement.id`
 * moves no focus and scrolls nothing.
 */
async function interrupted(browser, base) {
  const name = "interrupted gesture";
  const { ctx, page } = await open(browser, `${base}/horizontal.html`);

  await page.evaluate(() => document.getElementById("slide-link-1")?.focus());
  const before = await read(page);
  if (before.activeSlide === 1) ok(name, "control: focus began inside slide 1", `activeSlide=${before.activeSlide}`);
  else {
    bad(name, "control: focus began inside slide 1", `activeSlide=${before.activeSlide} — nothing below is measuring focus inside a slide`);
    await ctx.close();
    return;
  }

  await page.evaluate(() => void (window.__kxSpoken.length = 0));

  const trace = [];
  const sample = async () =>
    trace.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        const slides = [...document.querySelectorAll('[role="group"][aria-roledescription="slide"]')];
        const n = slides.findIndex((s) => s.contains(active)) + 1;
        const id = active?.id || active?.tagName || "none";
        return `${id}${n ? `(slide ${n})` : ""}@[${document.documentElement.dataset.kxInView ?? ""}]`;
      }),
    );

  await sample();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
    await sample();
  }
  await settle(page);
  await page.waitForTimeout(900); // past QUIET_MS and past the engine's own trailing `scroll` traffic
  await sample();
  const after = await read(page);

  // ── controls for the measurement itself ──────────────────────────────────
  if (after.engineSelected >= 2)
    ok(name, "control: the burst really moved the track several positions", `selected ${after.engineSelected} of 0..4`);
  else
    bad(
      name,
      "control: the burst really moved the track several positions",
      `selected ${after.engineSelected} — the rows below describe a burst that did not happen`,
    );

  const views = new Set(trace.map((t) => t.slice(t.indexOf("@"))));
  if (views.size >= 3) ok(name, "control: the view really changed under the burst", `${views.size} distinct in-view sets: ${trace.join(" → ")}`);
  else
    bad(
      name,
      "control: the view really changed under the burst",
      `${views.size} distinct in-view set(s) across ${trace.length} samples — the presses did not interrupt anything: ${trace.join(" → ")}`,
    );

  // ── focus continuity, sampled THROUGHOUT ─────────────────────────────────
  const dropped = trace.filter((t) => t.startsWith("BODY") || t.startsWith("none"));
  if (!dropped.length) ok(name, "focus is never dropped while one gesture interrupts another", trace.join(" → "));
  else bad(name, "focus is never dropped while one gesture interrupts another", `${dropped.length} sample(s) outside the carousel: ${trace.join(" → ")}`);

  // ── the settled state ────────────────────────────────────────────────────
  const landed = after.slides.find((x) => x.n === after.activeSlide);
  if (landed && landed.inView) ok(name, "when the track settles, focus is inside a slide that is in view", `slide ${landed.n}, in view ${after.engineInView}`);
  else
    bad(
      name,
      "when the track settles, focus is inside a slide that is in view",
      `activeSlide=${after.activeSlide}, active=${after.active}, engineInView=${after.engineInView}`,
    );

  // Not merely "a slide in view" — the slide the engine CAME TO REST ON. With one slide scrolling at a
  // time the first in-view slide and the selected slide are the same, and a transfer that chased the view
  // without keeping up would land on neither.
  if (after.activeSlide - 1 === after.engineSelectedSlide)
    ok(name, "and it is the slide the engine settled on", `slide ${after.activeSlide} = selected ${after.engineSelectedSlide}`);
  else
    bad(
      name,
      "and it is the slide the engine settled on",
      `focus is in slide ${after.activeSlide} (index ${after.activeSlide - 1}), the engine settled on index ${after.engineSelectedSlide}`,
    );

  // The announcement behaviour the sections above establish must survive the burst unchanged: one phrase,
  // naming the landing — not one per press, and not the position of a press that was overtaken.
  const expected = `Slide ${after.engineSelectedSlide + 1} of 5`;
  if (after.spoken.length === 1 && after.spoken[0] === expected)
    ok(name, "the interrupted burst is announced once, at the slide it settled on", JSON.stringify(after.spoken));
  else
    bad(
      name,
      "the interrupted burst is announced once, at the slide it settled on",
      `${JSON.stringify(after.spoken)}, the engine settled on ${JSON.stringify(expected)}`,
    );

  await ctx.close();
}

/**
 * `slidesToScroll: 2`. A scroll SNAP is not a slide under it, and the two diverge further with every move:
 * one press of Next leaves the engine on snap 1, which is slide index 2. Everything else the reader is
 * told — each slide's own name, and the total — counts individual slides, so an announcement that reported
 * the snap contradicted all of it.
 */
async function grouped(browser, base) {
  const name = "grouped (slidesToScroll: 2)";
  const { ctx, page } = await open(browser, `${base}/horizontal-grouped.html`);
  await page.evaluate(() => void (window.__kxSpoken.length = 0));
  await page.getByRole("button", { name: "Next slide" }).click();
  await page.waitForTimeout(700);
  const s = await read(page);

  if (s.engineSelected !== s.engineSelectedSlide)
    ok(name, "control: the snap and the slide really have diverged", `snap ${s.engineSelected}, slide ${s.engineSelectedSlide}`);
  else bad(name, "control: the snap and the slide really have diverged", `both ${s.engineSelected} — this fixture is not exercising grouped scrolling, so the rows below prove nothing`);

  const expected = `Slide ${s.engineSelectedSlide + 1} of 5`;
  if (s.spoken.length === 1 && s.spoken[0] === expected) ok(name, "the announcement names the SLIDE, not the snap", JSON.stringify(s.spoken));
  else bad(name, "the announcement names the SLIDE, not the snap", `${JSON.stringify(s.spoken)}, the engine is on slide ${s.engineSelectedSlide} (snap ${s.engineSelected})`);

  // The announcement and the slide's own name must agree, since a reader hears both.
  const label = s.slides[s.engineSelectedSlide]?.label;
  if (label === `${s.engineSelectedSlide + 1} of 5`) ok(name, "and it agrees with that slide's own name", `${JSON.stringify(s.spoken[0])} vs ${JSON.stringify(label)}`);
  else bad(name, "and it agrees with that slide's own name", `announced ${JSON.stringify(s.spoken[0])} but that slide is named ${JSON.stringify(label)}`);

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

/**
 * WHICH arrow keys a vertical carousel answers, recorded as the behaviour it is rather than the behaviour
 * it should be. React answers the INLINE pair on both axes; `@kinetixui/angular` answers the block pair on
 * a vertical track (`packages/ui-angular/src/lib/carousel.ts:68,352`), so the two platforms disagree.
 * Aligning them changes a published consumer behaviour, so it is a separate follow-up — and these rows are
 * what that follow-up flips. Before this gate existed nothing could mount a vertical React carousel at
 * all, so this disagreement was invisible on every branch.
 */
async function verticalKeys(browser, base) {
  const name = "vertical keys";
  const { ctx, page } = await open(browser, `${base}/vertical.html`);
  const start = await read(page);
  if (start.engineSelected === 0) ok(name, "control: the vertical fixture starts at the first slide", `selected ${start.engineSelected}`);
  else return void bad(name, "control: the vertical fixture starts at the first slide", `selected ${start.engineSelected} — nothing below measures a move`);

  await page.evaluate(() => document.getElementById("slide-link-1")?.focus());
  await page.keyboard.press("ArrowDown");
  await settle(page);
  const afterBlock = await read(page);
  if (afterBlock.engineSelected === 0)
    ok(name, "TODAY: the block pair moves nothing — the follow-up is what changes this", `ArrowDown left it at ${afterBlock.engineSelected}`);
  else bad(name, "TODAY: the block pair moves nothing — the follow-up is what changes this", `ArrowDown moved it to ${afterBlock.engineSelected}`);

  if (afterBlock.spoken.length === 0) ok(name, "and a key that moves nothing announces nothing", "[]");
  else bad(name, "and a key that moves nothing announces nothing", JSON.stringify(afterBlock.spoken));

  await page.keyboard.press("ArrowRight");
  await settle(page);
  const afterInline = await read(page);
  if (afterInline.engineSelected === 1) ok(name, "the inline pair moves a vertical carousel", `ArrowRight → selected ${afterInline.engineSelected}`);
  else bad(name, "the inline pair moves a vertical carousel", `ArrowRight → selected ${afterInline.engineSelected}`);

  await ctx.close();
}

/**
 * How a browser NAMES these regions, and how a reader tells two of them apart. Four carousels on one
 * page: unnamed, `aria-label`, `aria-labelledby`, and a second unnamed one. The names are read from
 * Chromium's own accessibility tree rather than from the attributes, because `aria-labelledby` names a
 * region from another element's text and an attribute read cannot see that at all.
 *
 * The fourth carousel is here to measure a limitation rather than a contract: two carousels the consumer
 * has not named are both "Slides", so a reader cannot tell them apart by name. That is asserted as the
 * fact it is, so it cannot change — in either direction — without a row moving.
 */
async function naming(browser, base) {
  const name = "naming";
  const { ctx, page } = await open(browser, `${base}/naming.html`);

  const dom = await page.evaluate(() => {
    const regions = [...document.querySelectorAll('[role="region"]')];
    return regions.map((r) => ({
      kase: r.getAttribute("data-kx-case"),
      label: r.getAttribute("aria-label"),
      labelledby: r.getAttribute("aria-labelledby"),
      rd: r.getAttribute("aria-roledescription"),
    }));
  });

  if (dom.length === 4) ok(name, "control: the page really holds four carousels", dom.map((d) => d.kase).join(", "));
  else return void bad(name, "control: the page really holds four carousels", `${dom.length} region(s) — nothing below is measuring four carousels`);

  // Chromium's own computed names, in document order.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const tree = await cdp.send("Accessibility.getFullAXTree");
  const axNames = tree.nodes.filter((n) => n.role && n.role.value === "region").map((n) => (n.name ? n.name.value : null));

  if (axNames.length === 4) ok(name, "control: a browser exposes all four as named landmarks", JSON.stringify(axNames));
  else return void bad(name, "control: a browser exposes all four as named landmarks", `${axNames.length} region(s) in the accessibility tree: ${JSON.stringify(axNames)}`);

  const [unnamed, labelled, labelledBy, twin] = axNames;
  const d = Object.fromEntries(dom.map((x) => [x.kase, x]));

  if (unnamed && !/carousel/i.test(unnamed))
    ok(name, "an unnamed carousel falls back to a name that is not the roledescription's word", `${JSON.stringify(unnamed)} + roledescription ${JSON.stringify(d.unnamed.rd)}`);
  else bad(name, "an unnamed carousel falls back to a name that is not the roledescription's word", JSON.stringify(unnamed));

  if (labelled === "Featured work" && d.label.label === "Featured work")
    ok(name, "a consumer's own name is kept EXACTLY, not replaced by the fallback", JSON.stringify(labelled));
  else bad(name, "a consumer's own name is kept EXACTLY, not replaced by the fallback", `accessible name ${JSON.stringify(labelled)}, attribute ${JSON.stringify(d.label.label)}`);

  // `aria-labelledby` must SUPPRESS the fallback rather than compete with it: were both present the
  // fallback would be the one a browser ignores, so the attribute would say one thing and the reader
  // hear another.
  if (labelledBy === "Spring collection" && d.labelledby.label === null)
    ok(name, "`aria-labelledby` names the region from its heading, with no `aria-label` competing", `${JSON.stringify(labelledBy)}, aria-label ${JSON.stringify(d.labelledby.label)}`);
  else bad(name, "`aria-labelledby` names the region from its heading, with no `aria-label` competing", `accessible name ${JSON.stringify(labelledBy)}, aria-label ${JSON.stringify(d.labelledby.label)}`);

  if (labelled !== unnamed) ok(name, "a named carousel is distinguishable from an unnamed one beside it", `${JSON.stringify(unnamed)} vs ${JSON.stringify(labelled)}`);
  else bad(name, "a named carousel is distinguishable from an unnamed one beside it", `both ${JSON.stringify(unnamed)}`);

  // A LIMITATION, asserted so it cannot change silently: the fallback is the same word every time, so
  // two carousels a consumer has not named are not distinguishable by name. Naming them is the
  // consumer's call; this row records which way it currently is.
  if (unnamed === twin)
    ok(name, "LIMITATION: two UNNAMED carousels share one name, so only a consumer can tell them apart", `both ${JSON.stringify(unnamed)}`);
  else bad(name, "LIMITATION: two UNNAMED carousels share one name, so only a consumer can tell them apart", `${JSON.stringify(unnamed)} vs ${JSON.stringify(twin)} — the fallback now varies, which this row did not expect`);

  await ctx.close();
}

/** Under reduced motion the engine jumps instead of easing; every claim above must still hold. */
async function reducedMotion(browser, base) {
  const name = "reduced motion";
  const { ctx, page } = await open(browser, `${base}/vertical.html`, { reducedMotion: "reduce" });
  await page.evaluate(() => document.getElementById("slide-link-1")?.focus());
  await page.keyboard.press("ArrowRight");
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
  if (s.announcement === `Slide ${s.engineSelectedSlide + 1} of 5`) ok(name, "a drag announces where it landed", JSON.stringify(s.announcement));
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
  // A source defect gets its OWN output directory and is ALWAYS rebuilt. Sharing `dist` would leave a
  // mutated bundle behind for the next clean run to measure, which is the contamination the whole
  // in-memory approach exists to avoid.
  const dist = join(root, SOURCE_DEFECT ? `packages/ui/browser/dist-defect-${SOURCE_DEFECT}` : "packages/ui/browser/dist");
  if (SOURCE_DEFECT || !existsSync(join(dist, "vertical.html")) || process.env.KX_REACT_HARNESS_REBUILD) {
    execFileSync("node", [join(root, "packages/ui/browser/build.mjs"), dist], {
      cwd: root,
      stdio: ["ignore", SOURCE_DEFECT ? "inherit" : "ignore", "inherit"],
    });
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
    await axis(browser, server.base, { file: "vertical.html", name: "vertical", forward: "ArrowRight" });
    await axis(browser, server.base, { file: "vertical-rtl.html", name: "vertical rtl", forward: "ArrowLeft" });
    await intent(browser, server.base, "horizontal.html");
    await intent(browser, server.base, "horizontal-engine-threshold.html");
    await interrupted(browser, server.base);
    await grouped(browser, server.base);
    await statics(browser, server.base);
    await naming(browser, server.base);
    await verticalKeys(browser, server.base);
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
