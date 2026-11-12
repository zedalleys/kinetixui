/**
 * react-carousel-direction.mjs — the React Carousel's direction contract, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/react-carousel-direction.mjs
 *
 * ── The defect this exists for ─────────────────────────────────────────────
 *
 * `@kinetixui/ui`'s Carousel passed its engine only `axis`, never `direction`. In a right-to-left
 * document the track therefore still travelled left: measured, the transforms in RTL were identical to
 * LTR, `-336px` through `-1344px`, so the first slide sat on the left and "Next" moved away from the
 * reading direction. `packages/ui-angular/src/lib/carousel.ts:63` had already written the contract down —
 * *"Horizontal slides run in the reading direction, so in a right-to-left context the first slide is on
 * the right, 'Next' is toward the left, ArrowLeft is Next"* — and React did none of it.
 *
 * Passing the engine's own `direction` flips the track (`+336` … `+1344`). That is the whole remedy for
 * the layout half; the keyboard half is `inlineKey`, shared rule for rule with Angular.
 *
 * ── Why a browser ──────────────────────────────────────────────────────────
 *
 * Both halves are claims about layout. The transform the engine computes comes from measuring real boxes
 * in a real writing mode; jsdom performs no layout, so a jsdom test can confirm that an option is passed
 * and nothing about which way the slides then travel. The arrow mapping could be unit-tested, but the
 * thing worth guarding is the pair agreeing: ArrowLeft must advance the track in the direction the track
 * actually runs, and only a browser knows that.
 *
 * ── What is asserted, per direction ────────────────────────────────────────
 *
 *   travel        LTR: activating Next moves the track toward negative x, monotonically.
 *                 RTL: toward POSITIVE x. This is the assertion the defect failed.
 *   first slide   the slide at position 0 is on the left in LTR and on the RIGHT in RTL, read from its
 *                 own box against the viewport — the reader-visible consequence, not an inferred one
 *   arrow keys    ArrowLeft advances in RTL and goes back in LTR, and ArrowRight the reverse; each read
 *                 as a real movement of the track, not as a handler call
 *   agreement     the arrow that advances moves the track the SAME way Next does. A mapping flipped
 *                 without the layout, or a layout flipped without the mapping, fails here
 *   runtime flip  `dir` switched on an ancestor AFTER mount re-lays the track out, which is what a
 *                 language switcher does. A resize does not happen, so nothing else would tell the engine
 *   endpoints     the end of the track is still reached in RTL, and the control that reached it still
 *                 keeps focus — the contract `scripts/react-carousel-focus.mjs` owns, re-read here in
 *                 the direction that gate could not meaningfully cover before this change
 *
 * ── The negative control, and why it is not a script ───────────────────────
 *
 * The defect is an option never passed to the engine, which the engine reads once at init. Nothing a
 * page can do afterwards puts it back, so unlike `scripts/react-carousel-focus-negative-controls.mjs`
 * there is no honest runtime way to restore it. The control is therefore a source revert, run by hand:
 *
 *   git checkout <the commit before this one> -- packages/ui/src/components/carousel.tsx
 *   pnpm build:ui && pnpm build-storybook && node scripts/react-carousel-direction.mjs   # must exit 1
 *   git checkout HEAD -- packages/ui/src/components/carousel.tsx && pnpm build:ui && pnpm build-storybook
 *
 * Measured against the unfixed component, it fails on exactly three rows and no others:
 *
 *   FAIL rtl: Next moves the track positive        0 → -336 (negative)
 *   FAIL rtl: ArrowLeft agrees with Next           key positive, button negative
 *   FAIL flip: Next reverses with the document     before negative, after negative
 *
 * Two of the passing rows are worth reading, because they are why the failing three are worded as they
 * are. `rtl: the slides run right to left` passes unfixed: the LAYOUT was always correct, it was the
 * engine that disagreed with it, so a gate that only looked at the slide boxes would have called the
 * defect clean. And `rtl: ArrowLeft advances` passes unfixed BY COINCIDENCE — the old mapping sent
 * ArrowLeft to `scrollPrev`, which from -336 moves the track to 0, a positive move that satisfies the
 * letter of "advances" while actually going backwards. Only the agreement row, which compares the key
 * against the button, can tell those two apart. A direction gate without it would pass on the defect.
 *
 * No `kx-verify` marker: this gate exists for one defect and claims no component verification credit.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { storyId } from "./story-id.mjs";
import { serveStatic } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");

export const STORY = storyId("carousel", "Default");

/** The track eases to its snap, so every reading waits for the transform to stop changing. */
async function settle(page, { quiet = 150, limit = 4000 } = {}) {
  const read = () => page.evaluate(() => getComputedStyle(document.querySelector("[role=region][aria-roledescription=carousel] .overflow-hidden > div")).transform);
  const deadline = Date.now() + limit;
  let last = await read();
  while (Date.now() < deadline) {
    await page.waitForTimeout(quiet);
    const now = await read();
    if (now === last) return;
    last = now;
  }
  throw new Error("react-carousel-direction: the track never stopped moving — the readings would be mid-scroll.");
}

export const readState = (page) =>
  page.evaluate(() => {
    const region = document.querySelector("[role=region][aria-roledescription=carousel]");
    const track = region.querySelector(".overflow-hidden > div");
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    const slides = [...region.querySelectorAll("[role=group][aria-roledescription=slide]")];
    const btn = (name) => [...region.querySelectorAll("button")].find((b) => b.textContent.trim() === name);
    const next = btn("Next slide");
    const a = document.activeElement;
    return {
      offset: Math.round(m.m41),
      // Where slide 2 lies RELATIVE TO slide 1 — not where slide 1 sits on the screen. The first version
      // of this reading compared slide 1's centre with the carousel's own centre, which is meaningless:
      // at offset 0 the current slide fills the viewport and its centre coincides with the carousel's in
      // BOTH directions. That reading failed the honest RTL case and PASSED the runtime-flip case purely
      // because the track happened to be scrolled there — a reading that agreed with the expected answer
      // for a reason unconnected to it. Slide order is the thing "the first slide is on the right"
      // actually means, and it is independent of scroll position.
      slideOrder: slides.length < 2 ? "unknown" : slides[1].getBoundingClientRect().left > slides[0].getBoundingClientRect().left ? "ltr" : "rtl",
      focus: a === next ? "next" : a === document.body || !a ? "BODY" : (a.textContent?.trim() || a.tagName),
      nextAria: next.getAttribute("aria-disabled"),
    };
  });

/**
 * Open the story and put the document in `dir`.
 *
 * Direction is set AFTER load, by `page.evaluate`, which is the convention `scripts/large-text.mjs`
 * already uses — and here it is the only thing that works. Measured: a `dir` set by
 * `page.addInitScript` never reaches the story's document at all. The attribute is absent when the
 * carousel mounts, `window` carries none of the init script's own state, and the page computes `ltr`. So an
 * "rtl" case written that way is not right-to-left and quietly measures the same thing twice; this gate
 * read a wrong answer that way before the cause was found, and `scripts/react-carousel-focus.mjs` had the
 * same hole in its own `rtl` condition.
 *
 * The consequence for what this gate can claim is stated honestly rather than papered over: it measures
 * the direction the carousel RESOLVES after mount, not the direction a server-rendered RTL page hands it
 * at first paint. The component takes the same path for both — one `isRtl` reading feeding the engine's
 * `direction` — and the first-paint path was measured separately, in an isolated harness with no Storybook
 * to reset the attribute, where passing `direction: "rtl"` at initialisation moved the track to `+336`
 * through `+1344` while the shipped component stayed at `-336` through `-1344`.
 */
async function openStory(browser, base, dir, { settleFirst = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/iframe.html?id=${STORY}&viewMode=story`, { waitUntil: "load" });
  await page.waitForSelector("[role=region][aria-roledescription=carousel]");
  await settle(page);
  if (settleFirst) await setDirection(page, dir);
  return { ctx, page };
}

/**
 * Put the document in `dir` and wait for the carousel to answer, then prove the document really reads that
 * way before anything is asserted about the component. The COMPUTED direction is what is checked, not the
 * attribute: `ltr` with no attribute at all is the honest default state.
 */
async function setDirection(page, dir) {
  await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await settle(page);
  const actual = await page.evaluate(() => getComputedStyle(document.body).direction);
  if (actual !== dir) {
    throw new Error(`react-carousel-direction: asked for dir=${dir}, the page computes ${actual}. The harness, not the component, is wrong.`);
  }
}

/**
 * Activate a control or press a key, and report how far the track moved and which way.
 *
 * The control is activated from the keyboard rather than with a mouse. Not a convenience: the story is
 * laid out `padded` and the controls are positioned outside the carousel's own box (`-left-12` /
 * `-right-12`), so one of them falls outside the viewport and a real click never lands — a first run of
 * this gate timed out on exactly that. Direction is not a claim about hit-testing, so Enter on the focused
 * control is the honest instrument here; `scripts/react-carousel-focus.mjs` drives the same controls the
 * same way for the same reason.
 */
async function move(page, how) {
  const before = await readState(page);
  if (how.button) {
    await page.getByRole("button", { name: how.button, includeHidden: true }).first().focus();
    await page.keyboard.press("Enter");
  } else {
    await page.locator("[role=region][aria-roledescription=carousel]").focus();
    await page.keyboard.press(how.key);
  }
  await settle(page);
  const after = await readState(page);
  const delta = after.offset - before.offset;
  return { before, after, delta, way: delta === 0 ? "none" : delta < 0 ? "negative" : "positive" };
}

const CASES = [
  { dir: "ltr", travel: "negative", order: "ltr", advances: "ArrowRight", retreats: "ArrowLeft" },
  { dir: "rtl", travel: "positive", order: "rtl", advances: "ArrowLeft", retreats: "ArrowRight" },
];

async function main() {
  if (!existsSync(join(staticDir, "index.json"))) {
    console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
    process.exit(2);
  }
  assertUiDistMatchesSource("react-carousel-direction");
  const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
  if (!index.entries[STORY]) {
    console.error(`react-carousel-direction: story ${STORY} is missing from the built Storybook.`);
    process.exit(2);
  }

  const storybook = await serveStatic(staticDir);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  const failures = [];
  const check = (ok, label, detail) => {
    console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(62)} ${detail}`);
    if (!ok) failures.push(`${label}: ${detail}`);
  };

  for (const c of CASES) {
    console.log(`\n${c.dir}`);
    const { ctx, page } = await openStory(browser, storybook.base, c.dir);

    const start = await readState(page);
    check(start.slideOrder === c.order, `${c.dir}: the slides run ${c.order === "ltr" ? "left to right" : "right to left"}`, `slide 2 is ${c.order === start.slideOrder ? "on the expected side of" : "on the WRONG side of"} slide 1 (order=${start.slideOrder})`);

    const byButton = await move(page, { button: "Next slide" });
    check(byButton.way === c.travel, `${c.dir}: Next moves the track ${c.travel}`, `${byButton.before.offset} → ${byButton.after.offset} (${byButton.way})`);

    const forward = await move(page, { key: c.advances });
    check(forward.way === c.travel, `${c.dir}: ${c.advances} advances`, `${forward.before.offset} → ${forward.after.offset} (${forward.way})`);
    check(forward.way === byButton.way, `${c.dir}: ${c.advances} agrees with Next`, `key ${forward.way}, button ${byButton.way}`);

    const back = await move(page, { key: c.retreats });
    const opposite = c.travel === "negative" ? "positive" : "negative";
    check(back.way === opposite, `${c.dir}: ${c.retreats} goes back`, `${back.before.offset} → ${back.after.offset} (${back.way})`);

    // The endpoint contract, re-read in this direction: the track still ends, and the control that
    // reached the end still holds focus.
    await page.getByRole("button", { name: "Next slide", includeHidden: true }).first().focus();
    let presses = 0;
    while (presses < 12 && (await readState(page)).nextAria !== "true") {
      await page.keyboard.press("Enter");
      await settle(page);
      presses += 1;
    }
    const end = await readState(page);
    check(presses >= 1 && presses < 12, `${c.dir}: the track still reaches its end`, `${presses} activations`);
    check(end.nextAria === "true", `${c.dir}: Next reports aria-disabled at the end`, `aria-disabled=${end.nextAria}`);
    check(end.focus === "next", `${c.dir}: the control that reached the end keeps focus`, `focus=${end.focus}`);

    await ctx.close();
  }

  // A language switcher flips `dir` on an ancestor after mount. No resize happens, so unless the carousel
  // watches for it the track stays laid out the way it started.
  console.log("\nruntime flip (dir changed after mount)");
  {
    const { ctx, page } = await openStory(browser, storybook.base, "ltr");
    const before = await move(page, { button: "Next slide" });
    await setDirection(page, "rtl");
    const flipped = await readState(page);
    check(flipped.slideOrder === "rtl", "flip: the slides re-order right to left", `order=${flipped.slideOrder}`);
    const after = await move(page, { button: "Next slide" });
    check(before.way === "negative" && after.way === "positive", "flip: Next reverses with the document", `before ${before.way}, after ${after.way}`);
    await ctx.close();
  }

  await browser.close();
  storybook.close();

  if (failures.length) {
    console.error(`\nreact-carousel-direction: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log("\nreact-carousel-direction: the direction contract holds in both directions and across a runtime flip.");
}

await main();
