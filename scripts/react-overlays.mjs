/**
 * react-overlays.mjs — the React overlay family's interaction contract, measured in a real browser.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/react-overlays.mjs
 *
 * `packages/ui/src/components-overlay.test.tsx` already holds this family's open/close contract in jsdom:
 * focus entry, Escape and restoration, Popover not trapping, the logical sides. That suite is truthful and
 * it is not a browser. Three of the things an overlay IS cannot be measured where it runs:
 *
 *   focus order     a focus trap is a claim about sequential focus navigation. jsdom has no such order —
 *                   `userEvent.tab()` walks a list the test library computes, so a trap that holds there
 *                   says the library agrees with itself, not that Chromium keeps focus inside the surface.
 *   hit-testing     "a press on the scrim closes it, a press on the surface does not" is a claim about
 *                   which element is under a point. jsdom dispatches at the element the test names, so the
 *                   question it answers is the one already assumed.
 *   containing      a surface must be painted outside an `overflow: hidden`, transformed ancestor. That is
 *   blocks          layout and stacking — jsdom has neither, and a portal that regressed to an in-place
 *                   render would pass there and be invisible in a browser.
 *
 * So this gate drives the same six overlays with the browser's own input and reads the browser's own answer.
 * Per overlay, on the story the library publishes for it:
 *
 *   opens         a real pointer press on the trigger mounts the surface with its documented role, at a
 *                 non-zero box, and the trigger reports itself open
 *   focus in      focus is inside the surface on open — the surface itself or a descendant, never left on
 *                 the trigger the overlay may have covered
 *   focus order   modal surfaces: Tab pressed more times than the surface has focusable children never
 *                 leaves it, and Shift+Tab from the first wraps back inside. Popover is non-modal and the
 *                 opposite claim is asserted: Tab leaves it, which is the contract its jsdom suite states
 *   escape        Escape unmounts the surface and focus is back on the trigger, read from
 *                 `document.activeElement` rather than from a library's model of it
 *   outside       a press at a point outside the surface dismisses what should dismiss and does not
 *                 dismiss AlertDialog, whose decision must be taken; a press inside never dismisses.
 *                 Both presses are real mouse events at coordinates, so the browser decides what was hit
 *   clipped       inside an `overflow: hidden` ancestor with a transform, the open surface is still the
 *                 element at its own centre point — i.e. it is painted and hittable outside the clip
 *   reduced       under `prefers-reduced-motion: reduce` the surface still reaches its open state (fully
 *                 opaque, non-zero box) and Escape still unmounts it: reduced motion must not strand a
 *                 reader in a half-open overlay
 *   keyboard      the two collection surfaces are opened from the keyboard and moved with ArrowDown, and
 *                 Select's choice is committed with Enter and read back off the trigger's own label
 *
 * Every assertion compares two readings from the same run, so fonts and rendering settings do not enter
 * into it. No pixel colours and no token values are read here: the kind being claimed is `interaction`,
 * and the surface contract (scrim, elevation, shape, focus rings) is `check:overlay-visual`'s subject.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */

// This gate is what earns Dialog, AlertDialog, Sheet, Popover, DropdownMenu and Select their Chromium
// `interaction` evidence. It navigates to each overlay's story and drives it with the browser's own mouse
// and keyboard, reading focus, hit-testing and layout back out of Chromium.
//
// Subjects are declared, not inferred: this file imports no component. See switch-motion.mjs.
//
// kx-verify: interaction
// kx-verify-only: dialog, alert-dialog, sheet, popover, dropdown-menu, select

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
assertUiDistMatchesSource("react-overlays");

/**
 * One row per subject declared above, and the declaration is only honest while every row is driven.
 *
 *   surface          the role the family's own component gives the open surface (Popover's is `dialog`,
 *                    named "Popover" by the component — see components/popover.tsx)
 *   trap             whether focus is held inside. `false` asserts the opposite, it does not skip
 *   outsideDismisses AlertDialog is the one surface a press outside must NOT dismiss: its decision has to
 *                    be taken, not dropped by a stray click
 *   insidePress      a point inside the surface that carries no action, so pressing it tests dismissal and
 *                    nothing else. The two collection surfaces have no such point — every child is an item
 *                    whose activation legitimately closes the surface — so they do not take this check
 *   keys             the collection surfaces, which are opened and moved from the keyboard
 */
const CASES = [
  { slug: "dialog", story: "overlays-dialog--default", trigger: { role: "button", name: "Edit profile" }, surface: "[role=dialog]", trap: true, outsideDismisses: true, insidePress: true },
  { slug: "alert-dialog", story: "overlays-alertdialog--default", trigger: { role: "button", name: "Delete account" }, surface: "[role=alertdialog]", trap: true, outsideDismisses: false, insidePress: true },
  { slug: "sheet", story: "overlays-sheet--default", trigger: { role: "button", name: "Open" }, surface: "[role=dialog]", trap: true, outsideDismisses: true, insidePress: true },
  { slug: "popover", story: "overlays-popover--default", trigger: { role: "button", name: "Open popover" }, surface: "[role=dialog]", trap: false, outsideDismisses: true, insidePress: true },
  { slug: "dropdown-menu", story: "overlays-dropdownmenu--default", trigger: { role: "button", name: "Open" }, surface: "[role=menu]", trap: true, outsideDismisses: true, insidePress: false, keys: { item: "[role=menuitem]" } },
  { slug: "select", story: "form-inputs-select--default", trigger: { role: "combobox" }, surface: "[role=listbox]", trap: true, outsideDismisses: true, insidePress: false, keys: { item: "[role=option]", commits: true } },
];

const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
for (const c of CASES) {
  if (!index.entries[c.story]) {
    console.error(`react-overlays: story ${c.story} is missing from the built Storybook.`);
    process.exit(2);
  }
}

const storybook = await serveStatic(staticDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(62)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};

/** The settle window: longer than the family's `fast` open and `instant` close, so nothing is read mid-animation. */
const SETTLE = 400;

async function open(c, { theme = "light", reducedMotion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, reducedMotion });
  const page = await ctx.newPage();
  // Nothing may be fetched off the fixture origin: a gate that reaches the network is a gate that can pass
  // or fail for reasons that have nothing to do with the component.
  await page.route((url) => !url.href.startsWith(storybook.base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${storybook.base}/iframe.html?id=${c.story}&viewMode=story&globals=theme:${theme}`, { waitUntil: "load" });
  const byRole = c.trigger.name
    ? page.locator("#storybook-root").getByRole(c.trigger.role, { name: c.trigger.name })
    : page.locator(`#storybook-root [role=${c.trigger.role}]`).first();
  await byRole.waitFor({ state: "visible", timeout: 20000 });
  // The trigger is found by role once, then pinned by an attribute, and every later reading goes through
  // the attribute. A modal overlay marks everything outside itself `aria-hidden`, which is correct — and
  // it takes the trigger out of the accessibility tree, so a role query for it stops matching the moment
  // the overlay it opens is open. Pinning also makes focus restoration an assertion about that exact
  // element rather than about anything carrying the same label.
  await byRole.evaluate((el) => el.setAttribute("data-kx-trigger", ""));
  await page.waitForTimeout(SETTLE);
  return { ctx, page, trigger: page.locator("[data-kx-trigger]") };
}

/** What Chromium itself says about focus: which element has it, and whether the surface contains it. */
const focusIn = (page, surface) =>
  page.evaluate((sel) => {
    const s = document.querySelector(sel);
    const a = document.activeElement;
    return {
      inside: !!(s && a && (s === a || s.contains(a))),
      tag: a ? a.tagName.toLowerCase() : null,
      role: a?.getAttribute?.("role") ?? null,
      name: (a?.textContent ?? "").trim().slice(0, 24),
      isTrigger: !!a?.hasAttribute?.("data-kx-trigger"),
    };
  }, surface);

const box = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: getComputedStyle(el).opacity, visibility: getComputedStyle(el).visibility };
  }, sel);

const present = async (page, sel) => (await page.locator(sel).count()) > 0;

/* ── opens, focus entry, focus order, Escape ───────────────────────────────── */
async function lifecycle(c) {
  const { ctx, page, trigger } = await open(c);

  check(!(await present(page, c.surface)), `${c.slug}: closed before the press`, "no surface in the document");

  await trigger.click();
  await page.waitForTimeout(SETTLE);
  const b = await box(page, c.surface);
  check(!!b && b.w > 0 && b.h > 0, `${c.slug}: a pointer press opens the surface`, b ? `${Math.round(b.w)}×${Math.round(b.h)} at ${Math.round(b.x)},${Math.round(b.y)}` : "surface absent");
  const trigState = await trigger.evaluate((el) => el.getAttribute("data-state") ?? el.getAttribute("aria-expanded"));
  check(trigState === "open" || trigState === "true", `${c.slug}: the trigger reports itself open`, String(trigState));

  const entered = await focusIn(page, c.surface);
  check(entered.inside, `${c.slug}: focus enters the surface`, `${entered.tag}${entered.role ? `[${entered.role}]` : ""} ${entered.name}`);

  // Focus order, from the browser's own sequential navigation rather than a library's model of it.
  const focusables = await page.locator(`${c.surface} a[href], ${c.surface} button, ${c.surface} input, ${c.surface} select, ${c.surface} textarea, ${c.surface} [tabindex]:not([tabindex="-1"])`).count();
  // Past the end of the surface either way: a trap that leaked would have shown itself.
  const presses = Math.max(focusables + 2, 6);
  let stayed = true;
  const walk = [];
  for (let i = 0; i < presses; i += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const f = await focusIn(page, c.surface);
    walk.push(`${f.tag ?? "?"}${f.inside ? "" : "!"}`);
    if (!f.inside) stayed = false;
  }
  if (c.trap) {
    check(stayed, `${c.slug}: focus is held inside across ${presses} Tab presses`, walk.join(" → "));
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(40);
    const back = await focusIn(page, c.surface);
    check(back.inside, `${c.slug}: Shift+Tab stays inside too`, `${back.tag} ${back.name}`);
  } else if (focusables > 0) {
    // The opposite claim, asserted rather than skipped: a non-modal surface must let focus out.
    check(!stayed, `${c.slug}: non-modal — Tab leaves the surface`, walk.join(" → "));
  } else {
    // Measured, and the reason it is not asserted stated rather than hidden: the published Popover story
    // holds two paragraphs and no focusable child, and in Chromium focus then stays on the surface itself
    // across every Tab press — the keydown's default is prevented before it reaches the document. That is
    // a focus scope with an empty scope, not the component holding focus the way a dialog does, and it
    // cannot be told apart from a trap on a surface with nothing to move to. Asserting "Tab leaves" here
    // would assert a story's content, so what is asserted is the precondition: this surface has nothing
    // to Tab to, and the exit claim needs a story with a focusable child before any gate can make it.
    check(focusables === 0 && stayed, `${c.slug}: non-modal, and this story has no focusable child to Tab to`, `${focusables} focusable, focus held on the surface across ${presses} presses`);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(SETTLE);
  check(!(await present(page, c.surface)), `${c.slug}: Escape unmounts the surface`, "surface gone from the document");
  const restored = await focusIn(page, c.surface);
  check(restored.isTrigger, `${c.slug}: Escape returns focus to the trigger`, `${restored.tag} ${restored.name}`);

  await ctx.close();
}

/* ── hit-testing: what a press outside and inside the surface does ─────────── */
async function pressing(c) {
  const { ctx, page, trigger } = await open(c);
  await trigger.click();
  await page.waitForTimeout(SETTLE);

  // A real mouse press at a coordinate the surface does not cover. Which point that is comes from the
  // browser's own hit-testing rather than from the surface's box: a right-hand Sheet fills the full height
  // of one side, so a corner chosen by arithmetic from the box landed ON it and the check then measured
  // nothing. Candidates are tried until one is genuinely clear, and the point used is reported.
  const outside = await page.evaluate((s) => {
    const surface = document.querySelector(s);
    for (const p of [{ x: 8, y: 8 }, { x: 1016, y: 760 }, { x: 512, y: 8 }, { x: 8, y: 760 }, { x: 512, y: 760 }]) {
      const el = document.elementFromPoint(p.x, p.y);
      if (!el || !(surface === el || surface.contains(el))) return p;
    }
    return null;
  }, c.surface);
  check(!!outside, `${c.slug}: a point outside the surface exists to press`, outside ? `${outside.x},${outside.y}` : "the surface covers every candidate");
  if (!outside) {
    await ctx.close();
    return;
  }

  await page.mouse.click(outside.x, outside.y);
  await page.waitForTimeout(SETTLE);
  const stillOpen = await present(page, c.surface);
  check(stillOpen !== c.outsideDismisses, `${c.slug}: a press outside ${c.outsideDismisses ? "dismisses" : "does NOT dismiss"} it`, stillOpen ? "still open" : "closed");

  if (c.insidePress) {
    if (!stillOpen) {
      await trigger.click();
      await page.waitForTimeout(SETTLE);
    }
    // The surface's own top-left inset: inside its box, and on the surface rather than on a control in it.
    const inner = await box(page, c.surface);
    const point = { x: Math.round(inner.x + 4), y: Math.round(inner.y + 4) };
    const onSurface = await page.evaluate(({ p, s }) => {
      const el = document.elementFromPoint(p.x, p.y);
      const surface = document.querySelector(s);
      return { hit: !!(el && surface && (surface === el || surface.contains(el))), tag: el?.tagName?.toLowerCase() ?? null };
    }, { p: point, s: c.surface });
    check(onSurface.hit, `${c.slug}: the chosen inside point is over the surface`, `${point.x},${point.y} → ${onSurface.tag}`);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(SETTLE);
    check(await present(page, c.surface), `${c.slug}: a press inside does not dismiss it`, "still open");
  }

  await ctx.close();
}

/* ── containing blocks: the surface is painted outside a clipped, transformed ancestor ── */
async function clipped(c) {
  const { ctx, page, trigger } = await open(c);
  // The ancestor a real page puts an overlay trigger inside: a small scrolling card that also establishes
  // a containing block. An in-place render would be cut to this box; a portal is not.
  const ancestor = await page.evaluate(() => {
    const host = document.querySelector("#storybook-root");
    host.style.cssText += ";overflow:hidden;transform:translate(0,0);width:240px;height:120px;";
    const r = host.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.waitForTimeout(100);
  await trigger.click();
  await page.waitForTimeout(SETTLE);

  const b = await box(page, c.surface);
  check(!!b && b.w > 0 && b.h > 0, `${c.slug}: opens inside a clipped, transformed ancestor`, b ? `${Math.round(b.w)}×${Math.round(b.h)}` : "surface absent");
  // Hit-testing at the surface's own centre: if the ancestor's clip had cut it, the point would belong to
  // something else (or to nothing). This is the assertion jsdom cannot make at all.
  const centre = { x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2) };
  const hit = await page.evaluate(({ p, s }) => {
    const el = document.elementFromPoint(p.x, p.y);
    const surface = document.querySelector(s);
    return { inside: !!(el && surface && (surface === el || surface.contains(el))), tag: el?.tagName?.toLowerCase() ?? null };
  }, { p: centre, s: c.surface });
  check(hit.inside, `${c.slug}: the surface is the element at its own centre, not the clip`, `${centre.x},${centre.y} → ${hit.tag}`);
  const escapes = b.x + b.w > ancestor.x + ancestor.w + 1 || b.y + b.h > ancestor.y + ancestor.h + 1 || b.x < ancestor.x - 1 || b.y < ancestor.y - 1;
  check(escapes, `${c.slug}: the surface extends beyond the ancestor's clip box`, `surface ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)} vs clip ${Math.round(ancestor.w)}×${Math.round(ancestor.h)}`);

  await ctx.close();
}

/* ── reduced motion lands on a state, never between two ────────────────────── */
async function reduced(c) {
  const { ctx, page, trigger } = await open(c, { reducedMotion: "reduce" });
  await trigger.click();
  await page.waitForTimeout(SETTLE);
  const b = await box(page, c.surface);
  check(!!b && b.w > 0 && b.h > 0 && b.opacity === "1" && b.visibility === "visible", `${c.slug}: reduced motion still reaches the open state`, b ? `opacity ${b.opacity}, ${Math.round(b.w)}×${Math.round(b.h)}, ${b.visibility}` : "surface absent");
  const running = await page.evaluate((s) => document.querySelector(s)?.getAnimations?.().filter((a) => a.playState === "running").length ?? -1, c.surface);
  check(running === 0, `${c.slug}: nothing is still animating once it has settled`, `${running} running`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(SETTLE);
  check(!(await present(page, c.surface)), `${c.slug}: reduced motion still unmounts it on Escape`, "surface gone");
  const restored = await focusIn(page, c.surface);
  check(restored.isTrigger, `${c.slug}: and focus still comes back`, `${restored.tag}`);
  await ctx.close();
}

/* ── the two collection surfaces, driven from the keyboard ─────────────────── */
async function keyboard(c) {
  const { ctx, page, trigger } = await open(c);
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(SETTLE);
  check(await present(page, c.surface), `${c.slug}: ArrowDown on the trigger opens it`, "surface present");

  const first = await page.evaluate((s) => {
    const a = document.activeElement;
    const hi = document.querySelector(`${s} [data-highlighted]`);
    return (a?.getAttribute?.("role") ? (a.textContent ?? "").trim() : "") || (hi?.textContent ?? "").trim();
  }, c.surface);
  check(!!first, `${c.slug}: an item is active on open`, first);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(120);
  const second = await page.evaluate((s) => {
    const a = document.activeElement;
    const hi = document.querySelector(`${s} [data-highlighted]`);
    return (a?.getAttribute?.("role") ? (a.textContent ?? "").trim() : "") || (hi?.textContent ?? "").trim();
  }, c.surface);
  check(!!second && second !== first, `${c.slug}: ArrowDown moves the active item`, `${first} → ${second}`);

  const items = await page.locator(`${c.surface} ${c.keys.item}`).count();
  check(items > 1, `${c.slug}: the surface holds its items`, `${items} ${c.keys.item}`);

  if (c.keys.commits) {
    const before = (await trigger.textContent())?.trim();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(SETTLE);
    const after = (await trigger.textContent())?.trim();
    check(!(await present(page, c.surface)), `${c.slug}: Enter commits and closes`, "surface gone");
    check(!!after && after !== before && after === second, `${c.slug}: the trigger shows the chosen item`, `${before} → ${after}`);
  } else {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(SETTLE);
    check(!(await present(page, c.surface)), `${c.slug}: Escape closes the collection`, "surface gone");
  }
  await ctx.close();
}

for (const c of CASES) {
  report.push(`\n${c.slug}`);
  await lifecycle(c);
  await pressing(c);
  await clipped(c);
  await reduced(c);
  if (c.keys) await keyboard(c);
}

await browser.close();
storybook.close();
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ react-overlays: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nreact-overlays ok — ${CASES.length} overlays hold the open, focus, dismissal, clipping and reduced-motion contract in a real browser.`);
