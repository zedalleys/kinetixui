/**
 * react-carousel-focus.mjs — the React Carousel's endpoint contract, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/react-carousel-focus.mjs
 *
 * ── The defect this exists for ─────────────────────────────────────────────
 *
 * `CarouselPrevious` / `CarouselNext` carried a native `disabled` attribute at a non-looping end. The
 * press that exhausts the track therefore disabled the very button that was pressed, and a natively
 * disabled element cannot hold focus: Chromium moved focus to `BODY`. The next Tab then started from
 * the document's position rather than the reader's, so a keyboard reader who stepped to the last slide
 * lost their place in the page. `packages/ui-angular/src/lib/carousel.ts` had already decided the other
 * way — `[attr.aria-disabled]`, with activation refused in `next()` / `previous()` — and says so in its
 * docstring. React contradicted a contract this library had already written down.
 *
 * ── Why this has to be a browser gate ──────────────────────────────────────
 *
 * jsdom does NOT reproduce it. Measured, both forms are indistinguishable there: focus stays on the
 * button through every activation whether the attribute is `disabled` or `aria-disabled`. A vitest
 * assertion of focus retention would therefore have passed against the defect — a control that cannot
 * fail. `scripts/react-carousel-focus-negative-controls.mjs` is what keeps that from being a claim: it
 * restores the native `disabled` in the page and requires this gate to fail, naming `BODY`.
 *
 * Nor is it enough to set the property and read `document.activeElement`: `el.focus(); el.disabled = true`
 * leaves `activeElement` on the button. The drop is not synchronous with the attribute — it happens as
 * part of the activation cycle. The journey below therefore drives the real activation, with the
 * browser's own Enter key, and never mutates the component.
 *
 * ── What one journey asserts ───────────────────────────────────────────────
 *
 *   exhausts      Enter is pressed on the control until the end of the track is reported, and the run
 *                 is only evidence if that actually happened within the track's length
 *   focus kept    after EVERY activation, including the one that exhausts the track, the browser's own
 *                 `document.activeElement` is still that control — never `BODY`
 *   semantics     at the end the control is `aria-disabled`, is NOT natively `disabled`, and its
 *                 accessibility node still carries role `button`, its name, and `disabled: true`, so a
 *                 screen reader still finds it and still hears that it is unavailable
 *   blocked       two further activations past the end move the track not at all — the guard refuses the
 *                 navigation that the removed `disabled` attribute used to refuse
 *   tab order     Tab from the retained focus reaches the sentinel after the carousel, so the reader
 *                 continues from where they were
 *
 * Both endpoints are driven (forward to the last slide, then backward to the first), in three conditions:
 * an LTR document, an RTL document, and `prefers-reduced-motion: reduce` — reduced motion must still
 * land on the end state. "RTL document" is meant literally and no more than that: `openStory` says what
 * it does and does not cover, and why the engine's own direction is a separate matter.
 *
 * The sentinel link is injected by this gate, not shipped by the component: the story is the carousel
 * alone, and "Tab continues past the carousel" needs something after it to continue to. It is the only
 * thing this gate adds to the page.
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
/**
 * The carousel eases to its snap, so a fixed wait reads a position that is still moving: the first run of
 * this gate reported "two further activations moved the track by 18px" when nothing had navigated at all,
 * only finished easing. Every reading is therefore taken once the transform has stopped changing.
 */
async function settle(page, { quiet = 150, limit = 4000 } = {}) {
  const read = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-kx-probe="track"]')).transform);
  const deadline = Date.now() + limit;
  let last = await read();
  while (Date.now() < deadline) {
    await page.waitForTimeout(quiet);
    const now = await read();
    if (now === last) return;
    last = now;
  }
  throw new Error("react-carousel-focus: the track never stopped moving — the readings below would be mid-scroll.");
}
/** A track cannot need more than this many presses to exhaust; past it the journey is wrong, not slow. */
const MAX_PRESSES = 12;

export const CONTROLS = {
  next: { name: "Next slide", label: "Next" },
  prev: { name: "Previous slide", label: "Previous" },
};

/** Open the story and prepare the page: probes on the two controls and the track, plus the Tab sentinel. */
export async function openStory(browser, base, { reducedMotion = "no-preference", dir = "ltr" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(`${base}/iframe.html?id=${STORY}&viewMode=story`, { waitUntil: "load" });
  await page.waitForSelector("[role=region][aria-roledescription=carousel]");
  // Direction is set AFTER load, by evaluating against the live document, and the result is then read
  // back from the computed style rather than trusted. `page.addInitScript` was the obvious way to get it
  // in before the story's own scripts, and it was measured to be a no-op here: Storybook's preview
  // navigates its own iframe, so nothing the init script wrote to `documentElement` survived to the
  // document the story actually renders into, and `dir` read back as null. A condition named `rtl` that
  // was laid out left-to-right would have been worse than no condition at all, so the set is verified.
  // `scripts/large-text.mjs` sets direction the same way for the same reason.
  //
  // What this condition therefore is: an RTL DOCUMENT — the page's computed direction, the mirrored box
  // layout, the reversed physical meaning of the two controls on screen. What it is NOT is an RTL
  // CAROUSEL ENGINE: the component passes its engine only `axis`, so the track still travels the
  // left-to-right way in an RTL document. That is a separate defect of its own, outside this slice, and
  // it does not touch anything this gate asserts — losing focus to BODY when a native `disabled` lands
  // on the focused element is a property of the element, not of which way the track moved to get there.
  await page.evaluate((d) => {
    document.documentElement.setAttribute("dir", d);
  }, dir);
  const computed = await page.evaluate(() => getComputedStyle(document.body).direction);
  if (computed !== dir) {
    throw new Error(`react-carousel-focus: asked for dir=${dir}, the document computes ${computed}. The harness is wrong, not the component.`);
  }
  await page.evaluate(() => {
    const region = document.querySelector("[role=region][aria-roledescription=carousel]");
    const track = region.querySelector(".overflow-hidden > div");
    track.setAttribute("data-kx-probe", "track");
    for (const b of region.querySelectorAll("button")) {
      const name = b.textContent.trim();
      b.setAttribute("data-kx-probe", name === "Next slide" ? "next" : name === "Previous slide" ? "prev" : "other");
    }
    const after = document.createElement("a");
    after.id = "kx-tab-sentinel";
    after.href = "#kx-tab-sentinel";
    after.textContent = "after the carousel";
    document.body.append(after);
  });
  await settle(page);
  return { ctx, page };
}

/** Everything the assertions below read, taken in one pass so focus and position are the same moment. */
export const readState = (page) =>
  page.evaluate(() => {
    const at = (k) => document.querySelector(`[data-kx-probe="${k}"]`);
    const a = document.activeElement;
    const probe = a?.getAttribute?.("data-kx-probe");
    const track = at("track");
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    const one = (k) => {
      const el = at(k);
      return { ariaDisabled: el.getAttribute("aria-disabled"), nativelyDisabled: el.disabled === true };
    };
    return {
      focus: probe ?? (a === document.body || a === null ? "BODY" : (a.id ? `#${a.id}` : a.tagName)),
      offset: Math.round(m.m41),
      next: one("next"),
      prev: one("prev"),
    };
  });

/**
 * Drive one endpoint and return every reading taken along the way. Pure measurement — it asserts nothing,
 * so the negative control can run the identical journey against a deliberately broken page.
 */
export async function journey(page, which) {
  const { name } = CONTROLS[which];
  const control = page.getByRole("button", { name, includeHidden: true }).first();
  await control.focus();
  await settle(page);

  const start = await readState(page);
  const steps = [];
  let presses = 0;
  while (presses < MAX_PRESSES) {
    const before = await readState(page);
    if (before[which].ariaDisabled === "true" || before[which].nativelyDisabled) break;
    await page.keyboard.press("Enter");
    await settle(page);
    presses += 1;
    steps.push(await readState(page));
  }

  const atEnd = await readState(page);
  // Two further activations past the end: the guard must refuse them. Pressing the key is safe even if
  // focus was lost — that is exactly the condition being measured, and the reading says where it went.
  await page.keyboard.press("Enter");
  await settle(page);
  await page.keyboard.press("Enter");
  await settle(page);
  const afterRepeat = await readState(page);

  // The browser's own ARIA tree for the control, not the DOM attributes read above: this is what a
  // screen reader is handed. Playwright reports `aria-disabled="true"` as `[disabled]` here, which is
  // the point — the node is still present, still a named button, and announced as unavailable.
  const ax = await control.ariaSnapshot();

  let tabbedTo = null;
  if (which === "next") {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    tabbedTo = (await readState(page)).focus;
  }

  return { start, steps, presses, atEnd, afterRepeat, ax, tabbedTo };
}

/** The contract, applied to one journey's readings. Returns a list of failures; empty means it holds. */
export function verdict(which, j) {
  const { label, name } = CONTROLS[which];
  const out = [];
  const add = (ok, label_, detail) => out.push({ ok, label: label_, detail });

  add(j.presses >= 1 && j.presses < MAX_PRESSES, `${label}: the track actually exhausts`, `${j.presses} activations`);
  const lost = j.steps.findIndex((s) => s.focus !== which);
  add(lost === -1, `${label}: focus kept on the control through every activation`, lost === -1 ? `${j.steps.length} activations, focus never left` : `activation ${lost + 1} of ${j.steps.length} moved focus to ${j.steps[lost].focus}`);
  add(j.atEnd[which].ariaDisabled === "true", `${label}: reports aria-disabled at the end`, `aria-disabled=${j.atEnd[which].ariaDisabled}`);
  add(j.atEnd[which].nativelyDisabled === false, `${label}: is not natively disabled at the end`, `disabled=${j.atEnd[which].nativelyDisabled}`);
  const axOk = new RegExp(`^- button "${name}"[^\\n]*\\[disabled\\]`).test(String(j.ax).trim());
  add(axOk, `${label}: still announced as an unavailable button`, JSON.stringify(String(j.ax).trim().split("\n")[0]));
  add(j.afterRepeat.offset === j.atEnd.offset, `${label}: two further activations move the track not at all`, `${j.atEnd.offset} → ${j.afterRepeat.offset}`);
  add(j.afterRepeat.focus === which, `${label}: focus still on the control after the refused activations`, `focus=${j.afterRepeat.focus}`);
  if (which === "next") add(j.tabbedTo === "#kx-tab-sentinel", `${label}: Tab continues past the carousel`, `Tab reached ${j.tabbedTo}`);
  return out;
}

/**
 * A carousel inside a form. `Button` renders a native button, which defaults to `type="submit"`, so a
 * navigation control in a form would submit it — and at the endpoints the native `disabled` used to be
 * what stopped that, which this PR removes. Found by Codex on this PR; verified here rather than taken
 * on trust, and gated so it cannot come back.
 *
 * The plain `<button>` added alongside is a POSITIVE CONTROL FOR THE HARNESS, and the reason this check
 * is worth anything: "no submit was observed" would also be the reading if the listener were never
 * wired, if the form never existed, or if the press never landed. The sentinel is identical except for
 * the missing `type`, so it must submit. One row proving the detector works, one proving the controls do
 * not trip it.
 */
async function formSubmitCheck(browser, base) {
  const { ctx, page } = await openStory(browser, base, {});
  const out = [];
  try {
    await page.evaluate(() => {
      const region = document.querySelector("[role=region][aria-roledescription=carousel]");
      const form = document.createElement("form");
      form.id = "kx-form";
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        window.__kxSubmits = (window.__kxSubmits ?? 0) + 1;
      });
      region.parentNode.insertBefore(form, region);
      form.append(region);
      const sentinel = document.createElement("button");
      sentinel.id = "kx-submit-sentinel";
      sentinel.textContent = "a plain button, no type";
      form.append(sentinel);
      window.__kxSubmits = 0;
    });

    // The detector first: a plain button with no `type` is a submit button, so this must count.
    await page.click("#kx-submit-sentinel");
    await page.waitForTimeout(80);
    const sentinelSubmits = await page.evaluate(() => window.__kxSubmits);
    out.push({
      ok: sentinelSubmits === 1,
      label: "form: the submit detector works (plain button with no type submits)",
      detail: `${sentinelSubmits} submit(s)`,
    });

    // Then both controls, driven to their endpoint and two presses past it — the refused activations are
    // where the removed `disabled` used to be the only thing standing between a press and a submit.
    await page.evaluate(() => { window.__kxSubmits = 0; });
    for (const which of ["next", "prev"]) {
      const control = page.getByRole("button", { name: CONTROLS[which].name, includeHidden: true }).first();
      await control.focus();
      for (let i = 0; i < MAX_PRESSES + 2; i += 1) {
        await page.keyboard.press("Enter");
        await settle(page);
      }
    }
    const submits = await page.evaluate(() => window.__kxSubmits);
    out.push({
      ok: submits === 0,
      label: "form: neither control submits the surrounding form",
      detail: `${submits} submit(s) over both endpoints and the refused presses past them`,
    });
  } finally {
    await ctx.close();
  }
  return out;
}

const CONDITIONS = [
  { id: "ltr", opts: {} },
  { id: "rtl", opts: { dir: "rtl" } },
  { id: "reduced-motion", opts: { reducedMotion: "reduce" } },
];

async function main() {
  if (!existsSync(join(staticDir, "index.json"))) {
    console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
    process.exit(2);
  }
  assertUiDistMatchesSource("react-carousel-focus");
  const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
  if (!index.entries[STORY]) {
    console.error(`react-carousel-focus: story ${STORY} is missing from the built Storybook.`);
    process.exit(2);
  }

  const storybook = await serveStatic(staticDir);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  const failures = [];

  for (const cond of CONDITIONS) {
    console.log(`\n${cond.id}`);
    const { ctx, page } = await openStory(browser, storybook.base, cond.opts);
    // Forward to the last slide, then backward to the first: both endpoints, in that order, on one page —
    // the backward journey starts from the state the forward one left, which is the reader's real path.
    for (const which of ["next", "prev"]) {
      const rows = verdict(which, await journey(page, which));
      for (const r of rows) {
        console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.label.padEnd(64)} ${r.detail}`);
        if (!r.ok) failures.push(`${cond.id} — ${r.label}: ${r.detail}`);
      }
    }
    await ctx.close();
  }

  console.log("\nin a form");
  for (const r of await formSubmitCheck(browser, storybook.base)) {
    console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.label.padEnd(64)} ${r.detail}`);
    if (!r.ok) failures.push(`form — ${r.label}: ${r.detail}`);
  }

  await browser.close();
  storybook.close();

  if (failures.length) {
    console.error(`\nreact-carousel-focus: ${failures.length} failure(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log("\nreact-carousel-focus: the endpoint contract holds in every condition.");
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
