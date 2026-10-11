/**
 * angular-collections.mjs — @kinetixui/angular's menus, live in real Chromium.
 *
 *   pnpm build:tokens && node scripts/angular-collections.mjs
 *   node scripts/angular-collections.mjs --only=interaction      one pass (interaction | rtl | largeText | reducedMotion)
 *
 * Angular Wave C2a adds the menus — dropdown menu, context menu, menubar — on two shared layers: the collection
 * core (packages/ui-angular/src/lib/collection.ts: ordered items, roving focus, arrows that wrap or stop,
 * typeahead, direction) and one set of menu parts every root uses (src/lib/menu.ts), floating on the C1 overlay
 * layer. Most of what goes wrong with a menu happens between those layers and the browser: a key that wraps
 * where it must stop, a submenu that opens toward the wrong side in RTL, Escape closing the whole tree, focus
 * left nowhere after an item runs, a pointer crossing a neighbour on its way to a submenu. So the subjects are
 * driven with a real keyboard and a real pointer, nested, in the four direction cases, at 200% text, and with
 * reduced motion (src/fixtures/collections.ts; the menu-in-a-dialog case is also in check:angular-overlays).
 *
 * The conventions are scripts/angular-browser.mjs's and angular-overlays.mjs's, and their rules hold: each pass
 * is a marked passage (`kx-verify: <kind>`, read by gen-verification.mjs), the components a passage claims are
 * the KinetixUI symbols named in it, and `assertClaims()` fails the run before a browser opens if a passage
 * names a component it does not measure or measures one it does not name. The shared parts (`KxMenu…`) belong
 * to no catalogue entry, so naming them claims nothing.
 *
 * Nothing here is jsdom: packages/ui-angular/src/lib/menu.spec.ts checks the same rules as logic, and is not
 * evidence about a browser.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs; KX_ANGULAR_HARNESS_DIR
 * reuses a harness already built by packages/ui-angular/browser/build.mjs.
 */
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { coverageForRoot } from "./covered-slugs.mjs";
import { buildAngularHarness, serveStatic, settleAngular, waitForAngular } from "./visual-harness.mjs";

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
  if (start === -1) throw new Error(`angular-collections: no kx-verify: ${kind} passage`);
  const next = self.indexOf("kx-verify:", start + 12);
  return self.slice(start, next === -1 ? undefined : next);
}
const slugOf = (symbol) => {
  const hit = [...coveredSlugs(symbol, "Angular")];
  if (hit.length !== 1) throw new Error(`angular-collections: ${symbol} does not name exactly one component (${hit.join(", ") || "none"})`);
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
      `angular-collections: the ${kind} claim and its subjects disagree\n` +
        (over.length ? `  named but not measured: ${over.join(", ")}\n` : "") +
        (under.length ? `  measured but not named: ${under.join(", ")}\n` : "") +
        (unimplemented.length ? `  measured but not an Angular implementation in the manifest: ${unimplemented.join(", ")}\n` : ""),
    );
    process.exit(1);
  }
}

/* ── the page ────────────────────────────────────────────────────────────── */

const harnessDir = buildAngularHarness("angular-collections");
const server = await serveStatic(harnessDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(84)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  return ok;
};

async function open(context, fixture = "collections", { theme = "light", dir = null, region = null, demo = null } = {}) {
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  const q = new URLSearchParams({ fixture, theme, ...(dir ? { dir } : {}), ...(region ? { region } : {}), ...(demo ? { demo } : {}) });
  await page.goto(`${server.base}/index.html?${q}`, { waitUntil: "load" });
  await waitForAngular(page);
  return page;
}
/** Let Angular render, then the browser paint, so the DOM read next is what the reader would see. */
async function idle(page) {
  await settleAngular(page);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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
async function click(page, selector, options = {}) {
  await page.locator(selector).first().click(options);
  await idle(page);
}
const out = (page, key) => page.locator(`output[data-kx-out="${key}"]`).textContent();
/** The focused element's id, or the nearest id above it; `body` when nothing has focus. */
const active = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "body";
    return el.id || el.closest("[id]")?.id || el.tagName.toLowerCase();
  });
const showing = (page, selector) => page.locator(selector).first().evaluate((el) => el.matches(":popover-open"));
const rectOf = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
/** Press keys one after another, collecting where focus is after each. */
async function walk(page, key, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await press(page, key);
    seen.push(await active(page));
  }
  return seen;
}
/** The items a menu owns that hold `tabindex="0"` — a roving collection has exactly one. */
const stops = (page, menu) =>
  page.locator(menu).evaluate((m) => [...m.querySelectorAll('[tabindex="0"]')].filter((e) => e.closest('[role="menu"]') === m).map((e) => e.id));
/** The last `contextmenu` event's fate: whether the browser's own menu was held back. */
const watchContextmenu = (page) =>
  page.evaluate(() => {
    window.__kxCtx = [];
    window.addEventListener("contextmenu", (e) => window.__kxCtx.push(e.defaultPrevented));
  });
const contextmenuLeaks = (page) => page.evaluate(() => window.__kxCtx.filter((prevented) => !prevented).length);

async function axe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
    const r = await window.axe.run(document, opts);
    return r.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => String(n.target)) }));
  });
}
const settled = (page) => page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: interaction, accessibility
 *
 * Every menu driven with a real keyboard and pointer, read back from the semantics it renders (role, name,
 * state, focus) and from the application model it is bound to.
 *
 *   KxDropdownMenu  the trigger says it opens a menu and whether it is open; the menu is named by the trigger's
 *                   text. Enter, Space and ArrowDown open it on the first item, ArrowUp on the last; a pointer
 *                   press opens it with focus on the menu, and a second press closes it. ArrowDown / ArrowUp
 *                   stop at the ends (no wrap); Home / End jump; the disabled item is skipped by arrows and
 *                   typeahead and a press on it does nothing; typeahead matches a prefix, cycles on repeats and
 *                   resets after a pause; exactly one item is a Tab stop. Activating an item runs it, closes
 *                   the tree and returns focus to the trigger; a checkbox and a radio item flip `aria-checked`.
 *                   Escape closes and returns focus; Tab closes and moves on; a press outside closes it and
 *                   leaves focus where the reader put it. Submenus (the KxMenuSub parts): nested in the
 *                   parent's DOM, two levels deep; ArrowRight, Enter and Space open them on their first item,
 *                   ArrowLeft closes one level; Escape closes ONE level, focus back on that level's trigger,
 *                   the levels below it stay open; activating an item two levels down closes all three;
 *                   resting the pointer on a sub trigger opens it without taking focus; a diagonal pointer
 *                   path toward the open submenu crosses the items in between without closing it (the grace
 *                   area), and a path straight down onto the next item does close it
 *   KxContextMenu   a secondary click opens it AT the pointer and the browser's menu never appears (nor inside
 *                   the open menu); a second secondary click moves it; the ContextMenu key and Shift+F10 open it
 *                   from the focused element, on its first item, placed against that element, and Escape gives
 *                   focus back to it; arrows, the disabled item, submenus and activation as above; a press
 *                   elsewhere in the region, or outside it, closes it
 *   KxMenubar       `role="menubar"` named by its label, its triggers `menuitem`s with `aria-haspopup="menu"`
 *                   and `aria-expanded`, one Tab stop; ArrowLeft / ArrowRight move between triggers and wrap;
 *                   Home / End; typeahead on the triggers; Enter, Space and ArrowDown open a menu on its first
 *                   item, ArrowUp on its last; with a menu open the inline arrows open the neighbouring menu
 *                   (wrapping), and from inside a submenu the inline-end arrow moves on to the next menu while
 *                   the inline-start arrow closes only the submenu; hovering another trigger while a menu is open
 *                   switches to it; Escape closes and leaves focus on the trigger; a checkbox and radio item
 *                   inside a menubar menu work as anywhere else
 *
 * Then axe, light and dark, with each menu open, with a submenu open, in a menu inside a dialog, on a data
 * row's action menu, and on the three usage examples opened; disabled items carry `aria-disabled` and no
 * native `disabled`; and visible focus: a keyboard-highlighted item draws a focus ring a pointer highlight does
 * not, and under forced colours every highlighted item, menubar trigger and the context region keep an outline.
 * ════════════════════════════════════════════════════════════════════════════ */
const BEHAVIOUR = [
  {
    component: "KxDropdownMenu",
    async run(page, t) {
      const trigger = page.locator("#dd-trigger");
      t((await trigger.getAttribute("aria-haspopup")) === "menu" && (await trigger.getAttribute("aria-expanded")) === "false", "the trigger says it opens a menu, and that it is closed");
      t((await trigger.getAttribute("aria-controls")) === "dd-content", "the trigger controls the menu", await trigger.getAttribute("aria-controls"));
      t((await page.getByRole("menu").count()) === 0, "closed, no menu is exposed");

      // ── opening from the keyboard ──
      await focus(page, "#dd-trigger");
      await press(page, "Enter");
      t((await showing(page, "#dd-content")) && (await active(page)) === "dd-rename", "Enter opens it on the first item", await active(page));
      t((await page.getByRole("menu", { name: "Options" }).count()) === 1, "the menu is named by its trigger");
      t((await trigger.getAttribute("aria-expanded")) === "true" && (await out(page, "dd")) === "true", "the trigger and the model say it is open");
      t((await page.locator("#dd-rename").getAttribute("data-highlighted")) === "keyboard", "the first item is highlighted as a keyboard highlight");
      const archive = page.locator("#dd-archive");
      t((await archive.getAttribute("aria-disabled")) === "true" && !(await archive.evaluate((el) => el.disabled)), "the disabled item is aria-disabled, not natively disabled");

      // ── arrows stop at the ends, skip the disabled item ──
      const down = await walk(page, "ArrowDown", 9);
      const expected = ["dd-duplicate", "dd-download", "dd-sub-trigger", "dd-ruler", "dd-compact", "dd-comfortable", "dd-delete", "dd-delete", "dd-delete"];
      t(down.join(",") === expected.join(","), "ArrowDown walks the items, skips the disabled one and stops at the end (no wrap)", down.join(" > "));
      t((await stops(page, "#dd-content")).join(",") === "dd-delete", "exactly one item is a Tab stop: the current one", (await stops(page, "#dd-content")).join(","));
      await press(page, "Home");
      t((await active(page)) === "dd-rename", "Home jumps to the first item", await active(page));
      await press(page, "ArrowUp");
      t((await active(page)) === "dd-rename", "ArrowUp at the first item stays (no wrap)", await active(page));
      await press(page, "End");
      t((await active(page)) === "dd-delete", "End jumps to the last item", await active(page));

      // ── typeahead ──
      await press(page, "Home");
      const typed = [];
      for (const k of ["d", "d", "d"]) {
        await press(page, k);
        typed.push(await active(page));
      }
      t(typed.join(",") === "dd-duplicate,dd-download,dd-delete", "typeahead: a repeated letter cycles through the items it starts", typed.join(" > "));
      await page.waitForTimeout(600);
      await press(page, "Home");
      await press(page, "a");
      t((await active(page)) === "dd-rename", "typeahead never lands on the disabled item", await active(page));
      await page.waitForTimeout(600);
      await press(page, "s");
      await press(page, "h");
      await press(page, "o");
      t((await active(page)) === "dd-ruler", "typeahead matches a prefix typed in quick succession", await active(page));
      await page.waitForTimeout(600);
      await press(page, "c");
      t((await active(page)) === "dd-compact", "after a pause the search starts again", await active(page));

      // ── Escape, ArrowUp, Space ──
      await press(page, "Escape");
      t(!(await showing(page, "#dd-content")) && (await active(page)) === "dd-trigger", "Escape closes it, focus back on the trigger", await active(page));
      await press(page, "ArrowUp");
      t((await active(page)) === "dd-delete", "ArrowUp on the trigger opens it on the last item", await active(page));
      await press(page, "Escape");
      await press(page, " ");
      t((await active(page)) === "dd-rename", "Space opens it on the first item", await active(page));
      await press(page, "Escape");
      await press(page, "ArrowDown");
      t((await active(page)) === "dd-rename", "ArrowDown opens it on the first item", await active(page));

      // ── activation ──
      await press(page, "ArrowDown");
      await press(page, "Enter");
      t((await out(page, "picked")) === "duplicate" && !(await showing(page, "#dd-content")), "Enter on an item runs it and closes the menu", await out(page, "picked"));
      t((await active(page)) === "dd-trigger", "focus returns to the trigger after an item runs", await active(page));
      await press(page, "Enter");
      await press(page, "End");
      await press(page, " ");
      t((await out(page, "picked")) === "delete" && (await active(page)) === "dd-trigger", "Space on an item runs it too", await out(page, "picked"));

      // ── checkbox and radio items ──
      await press(page, "Enter");
      t((await page.locator("#dd-ruler").getAttribute("aria-checked")) === "true" && (await page.locator("#dd-ruler").getAttribute("role")) === "menuitemcheckbox", "a checkbox item is a menuitemcheckbox with its state");
      await press(page, "s");
      await press(page, "h");
      await press(page, "o");
      await press(page, "Enter");
      t((await out(page, "ruler")) === "false" && (await page.locator("#dd-ruler").getAttribute("aria-checked")) === "false", "activating it flips the model and aria-checked", await page.locator("#dd-ruler").getAttribute("aria-checked"));
      t(!(await showing(page, "#dd-content")) && (await active(page)) === "dd-trigger", "and closes the menu, focus back on the trigger");
      await page.waitForTimeout(600);
      await press(page, "Enter");
      await press(page, "c");
      await press(page, "Enter");
      const radios = await page.locator('[role="menuitemradio"]').evaluateAll((els) => els.filter((e) => e.closest("#dd-content")).map((e) => `${e.id}=${e.getAttribute("aria-checked")}`));
      t((await out(page, "density")) === "compact" && radios.join(",") === "dd-compact=true,dd-comfortable=false", "a radio item checks itself and unchecks the others in its group", radios.join(", "));

      // ── Tab leaves ──
      await page.waitForTimeout(600);
      await press(page, "Enter");
      await press(page, "Tab");
      t(!(await showing(page, "#dd-content")) && (await active(page)) === "dd-after", "Tab closes the menu and moves on, as from the trigger", await active(page));

      // ── the pointer ──
      await click(page, "#dd-trigger");
      t((await showing(page, "#dd-content")) && (await active(page)) === "dd-content", "a pointer press opens it with focus on the menu, no item chosen", await active(page));
      await click(page, "#dd-trigger");
      t(!(await showing(page, "#dd-content")), "a second press on the trigger closes it");
      await click(page, "#dd-trigger");
      await page.locator("#dd-duplicate").hover();
      await idle(page);
      t((await page.locator("#dd-duplicate").getAttribute("data-highlighted")) === "pointer" && (await active(page)) === "dd-duplicate", "the pointer highlights the item under it (and the keyboard continues from there)");
      await page.locator("#dd-archive").hover();
      await idle(page);
      t((await page.locator("#dd-archive").getAttribute("data-highlighted")) === null, "a disabled item is not highlighted under the pointer");
      // Playwright refuses to press an aria-disabled element; a reader's pointer does not
      await click(page, "#dd-archive", { force: true });
      t((await showing(page, "#dd-content")) && (await out(page, "picked")) !== "archive", "a press on a disabled item does nothing", await out(page, "picked"));
      await click(page, "#dd-download");
      t((await out(page, "picked")) === "download" && !(await showing(page, "#dd-content")) && (await active(page)) === "dd-trigger", "a press on an item runs it, closes the menu and returns focus", await active(page));
      await click(page, "#dd-trigger");
      await page.mouse.click(980, 780);
      await idle(page);
      t(!(await showing(page, "#dd-content")) && (await active(page)) !== "dd-trigger", "a press outside closes it and does not pull focus back", await active(page));

      // ── submenus by keyboard ──
      t(await page.evaluate(() => document.getElementById("dd-content").contains(document.getElementById("dd-sub-content")) && document.getElementById("dd-sub-content").contains(document.getElementById("dd-sub2-content"))), "submenus are nested in their parent menu in the DOM, two levels deep");
      const subTrigger = page.locator("#dd-sub-trigger");
      t((await subTrigger.getAttribute("role")) === "menuitem" && (await subTrigger.getAttribute("aria-haspopup")) === "menu" && (await subTrigger.getAttribute("aria-expanded")) === "false", "a sub trigger is a menuitem that says it opens a menu");
      await focus(page, "#dd-trigger");
      await press(page, "Enter");
      await press(page, "s");
      t((await active(page)) === "dd-sub-trigger", "typeahead reaches the sub trigger", await active(page));
      await press(page, "ArrowLeft");
      t(!(await showing(page, "#dd-sub-content")) && (await showing(page, "#dd-content")), "the inline-start arrow on a sub trigger opens nothing and closes nothing");
      await press(page, "ArrowRight");
      t((await showing(page, "#dd-sub-content")) && (await active(page)) === "dd-sub-email", "ArrowRight opens the submenu on its first item", await active(page));
      t((await page.getByRole("menu", { name: "Share" }).count()) === 1 && (await subTrigger.getAttribute("aria-expanded")) === "true", "the submenu is named by its trigger, which says it is open");
      await press(page, "ArrowLeft");
      t(!(await showing(page, "#dd-sub-content")) && (await showing(page, "#dd-content")) && (await active(page)) === "dd-sub-trigger", "ArrowLeft closes the submenu alone, focus back on its trigger", await active(page));
      await press(page, "Enter");
      t((await active(page)) === "dd-sub-email", "Enter opens it on its first item", await active(page));
      await press(page, "ArrowLeft");
      await press(page, " ");
      t((await active(page)) === "dd-sub-email", "Space opens it on its first item", await active(page));
      const subDown = await walk(page, "ArrowDown", 3);
      t(subDown.join(",") === "dd-sub-copy,dd-sub2-trigger,dd-sub2-trigger", "inside a submenu the arrows walk its own items only, and stop", subDown.join(" > "));
      await press(page, "ArrowRight");
      t((await showing(page, "#dd-sub2-content")) && (await active(page)) === "dd-sub2-team", "a second level opens the same way", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#dd-sub2-content")) && (await showing(page, "#dd-sub-content")) && (await showing(page, "#dd-content")), "Escape closes one level: the deepest, the other two stay open");
      t((await active(page)) === "dd-sub2-trigger", "focus is back on that level's trigger", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#dd-sub-content")) && (await showing(page, "#dd-content")) && (await active(page)) === "dd-sub-trigger", "the next Escape closes the next level, focus on its trigger", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#dd-content")) && (await active(page)) === "dd-trigger", "the last Escape closes the menu, focus on the trigger", await active(page));
      await press(page, "Enter");
      await press(page, "s");
      await press(page, "ArrowRight");
      await press(page, "End");
      await press(page, "ArrowRight");
      await press(page, "End");
      await press(page, "Enter");
      t((await out(page, "picked")) === "blog" && (await out(page, "dd")) === "false" && (await out(page, "dd-sub")) === "false" && (await out(page, "dd-sub2")) === "false", "activating an item two levels down closes the whole tree, every model", `${await out(page, "dd")}/${await out(page, "dd-sub")}/${await out(page, "dd-sub2")}`);
      t((await active(page)) === "dd-trigger", "and focus returns to the menu's trigger", await active(page));

      // ── submenus by pointer: hover intent, the grace area ──
      await page.mouse.move(980, 780);
      await click(page, "#dd-trigger");
      const st = await rectOf(page, "#dd-sub-trigger");
      await page.mouse.move(centre(st).x, centre(st).y);
      await page.waitForTimeout(250);
      await idle(page);
      t((await showing(page, "#dd-sub-content")) && (await active(page)) === "dd-sub-trigger", "resting on a sub trigger opens it, focus stays on the trigger", await active(page));
      const sub = await rectOf(page, "#dd-sub-content");
      const below = await rectOf(page, "#dd-ruler");
      // Diagonal: from the trigger to the submenu's far half, crossing the item below the trigger on the way.
      const dx = sub.left + 12;
      const dy = Math.min(sub.bottom - 6, below.bottom + 24);
      const crossings = [];
      await page.evaluate(() => {
        window.__kxCrossed = [];
        for (const id of ["dd-download", "dd-ruler", "dd-compact"]) document.getElementById(id).addEventListener("pointermove", () => window.__kxCrossed.push(id));
      });
      await page.mouse.move(dx, dy, { steps: 14 });
      await idle(page);
      crossings.push(...(await page.evaluate(() => [...new Set(window.__kxCrossed)])));
      t(crossings.length > 0, "the diagonal path really crosses parent items on its way", crossings.join(", ") || "crossed none — the path does not test the grace area");
      t(await showing(page, "#dd-sub-content"), "crossing them toward the submenu does not close it (the grace area)");
      t(await page.evaluate(() => document.getElementById("dd-sub-content").contains(document.activeElement)), "the pointer arrives in the submenu, which takes the highlight", await active(page));
      t((await page.locator("#dd-ruler").getAttribute("data-highlighted")) === null, "no parent item was highlighted on the way");
      // Straight down from the trigger onto the next item: not toward the submenu, so it closes.
      await page.mouse.move(centre(st).x, centre(st).y, { steps: 6 });
      await page.waitForTimeout(250);
      await idle(page);
      await page.mouse.move(centre(st).x - 40, centre(below).y, { steps: 6 });
      await page.waitForTimeout(350);
      await page.mouse.move(centre(st).x - 41, centre(below).y);
      await idle(page);
      t(!(await showing(page, "#dd-sub-content")) && (await active(page)) === "dd-ruler", "a path straight down onto the next item closes the submenu and highlights that item", await active(page));
      await press(page, "Escape");
    },
  },
  {
    component: "KxContextMenu",
    async run(page, t) {
      await watchContextmenu(page);
      const region = await rectOf(page, "#ctx-region");
      const at = { x: region.left + 40, y: region.top + 30 };
      await page.mouse.click(at.x, at.y, { button: "right" });
      await idle(page);
      await settled(page);
      const menu = await rectOf(page, "#ctx-content");
      t(await showing(page, "#ctx-content"), "a secondary click in the region opens it");
      t(Math.abs(menu.left - at.x) <= 1.5 && Math.abs(menu.top - (at.y + 2)) <= 1.5, "it opens AT the pointer (its inline-start corner on the point)", `point ${at.x},${at.y}; menu ${menu.left.toFixed(1)},${menu.top.toFixed(1)}`);
      t((await contextmenuLeaks(page)) === 0, "the browser's own context menu is held back");
      t((await page.getByRole("menu", { name: "Canvas actions" }).count()) === 1 && (await active(page)) === "ctx-content", "the menu is named, and holds focus with no item chosen", await active(page));
      // a point in the region beyond the open menu
      const at2 = { x: menu.right + 120, y: region.top + 60 };
      await page.mouse.click(at2.x, at2.y, { button: "right" });
      await idle(page);
      await settled(page);
      const moved = await rectOf(page, "#ctx-content");
      t((await showing(page, "#ctx-content")) && Math.abs(moved.left - at2.x) <= 1.5 && Math.abs(moved.top - (at2.y + 2)) <= 1.5, "a second secondary click moves it to the new point", `${moved.left.toFixed(1)},${moved.top.toFixed(1)}`);
      const paste = await rectOf(page, "#ctx-paste");
      await page.mouse.click(centre(paste).x, centre(paste).y, { button: "right" });
      await idle(page);
      t((await showing(page, "#ctx-content")) && (await contextmenuLeaks(page)) === 0, "a secondary click inside the open menu keeps it, and still no browser menu");
      t((await active(page)) === "ctx-paste", "the item under the pointer is highlighted", await active(page));
      await press(page, "ArrowDown");
      t((await active(page)) === "ctx-select", "ArrowDown continues from there, skipping the disabled item", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#ctx-content")) && (await active(page)) === "ctx-region", "Escape closes it; focus goes to the region, which can take it", await active(page));

      // ── from the keyboard ──
      for (const key of ["ContextMenu", "Shift+F10"]) {
        await focus(page, "#ctx-shape");
        await press(page, key);
        await settled(page);
        const shape = await rectOf(page, "#ctx-shape");
        const m = await rectOf(page, "#ctx-content");
        t((await showing(page, "#ctx-content")) && (await active(page)) === "ctx-paste", `${key} opens it on its first item`, await active(page));
        t(Math.abs(m.left - shape.left) <= 1.5 && (Math.abs(m.top - (shape.bottom + 2)) <= 1.5 || Math.abs(m.bottom - (shape.top - 2)) <= 1.5), `${key}: placed against the focused element`, `shape ${shape.left.toFixed(0)},${shape.bottom.toFixed(0)}; menu ${m.left.toFixed(0)},${m.top.toFixed(0)}`);
        await press(page, "Escape");
        t(!(await showing(page, "#ctx-content")) && (await active(page)) === "ctx-shape", `${key}: Escape gives focus back to the element it opened from`, await active(page));
      }
      t((await contextmenuLeaks(page)) === 0, "no browser context menu from the keyboard either");
      await focus(page, "#ctx-region");
      await press(page, "Shift+F10");
      t((await active(page)) === "ctx-paste", "Shift+F10 on the region itself opens it too", await active(page));

      // ── submenu and activation ──
      await press(page, "End");
      await press(page, "ArrowUp");
      t((await active(page)) === "ctx-sub-trigger", "End, then ArrowUp, reaches the sub trigger", await active(page));
      await press(page, "ArrowRight");
      t((await showing(page, "#ctx-sub-content")) && (await active(page)) === "ctx-sub-front", "ArrowRight opens its submenu", await active(page));
      t(await page.evaluate(() => document.getElementById("ctx-content").contains(document.getElementById("ctx-sub-content"))), "the submenu is nested in the menu");
      await press(page, "Escape");
      t(!(await showing(page, "#ctx-sub-content")) && (await showing(page, "#ctx-content")) && (await active(page)) === "ctx-sub-trigger", "Escape closes the submenu only", await active(page));
      await press(page, "ArrowRight");
      await press(page, "ArrowDown");
      await press(page, "Enter");
      t((await out(page, "picked")) === "back" && (await out(page, "ctx")) === "false" && (await out(page, "ctx-sub")) === "false", "an item in the submenu runs and closes the tree", await out(page, "picked"));
      t((await active(page)) === "ctx-region", "focus goes back to where it was before the menu opened", await active(page));
      await press(page, "Shift+F10");
      await press(page, "End");
      await press(page, "Enter");
      t((await out(page, "guides")) === "true" && (await page.locator("#ctx-guides").getAttribute("aria-checked")) === "true", "a checkbox item in a context menu flips aria-checked");

      // ── closing by the pointer ──
      await page.mouse.click(region.left + 40, region.top + 30, { button: "right" });
      await idle(page);
      await page.mouse.click(region.right - 20, region.bottom - 12);
      await idle(page);
      t(!(await showing(page, "#ctx-content")), "a press elsewhere in the region closes it");
      await page.mouse.click(region.left + 40, region.top + 30, { button: "right" });
      await idle(page);
      await page.mouse.click(980, 780);
      await idle(page);
      t(!(await showing(page, "#ctx-content")), "a press outside the region closes it");
    },
  },
  {
    component: "KxMenubar",
    async run(page, t) {
      t((await page.getByRole("menubar", { name: "Editor" }).count()) === 1, "a menubar, named by its label");
      const triggers = await page.locator("[kxMenubarTrigger]").evaluateAll((els) => els.map((e) => [e.id, e.getAttribute("role"), e.getAttribute("aria-haspopup"), e.getAttribute("aria-expanded"), e.getAttribute("tabindex")].join(":")));
      t(triggers.join(",") === "mb-file:menuitem:menu:false:0,mb-edit:menuitem:menu:false:-1,mb-view:menuitem:menu:false:-1", "its triggers are menuitems that open menus, closed, one Tab stop", triggers.join(", "));
      await focus(page, "#mb-file");
      const right = await walk(page, "ArrowRight", 3);
      t(right.join(",") === "mb-edit,mb-view,mb-file", "ArrowRight moves between triggers and wraps", right.join(" > "));
      const left = await walk(page, "ArrowLeft", 2);
      t(left.join(",") === "mb-view,mb-edit", "ArrowLeft moves back and wraps", left.join(" > "));
      await press(page, "Home");
      t((await active(page)) === "mb-file", "Home jumps to the first trigger", await active(page));
      await press(page, "End");
      t((await active(page)) === "mb-view", "End jumps to the last trigger", await active(page));
      t((await page.locator("#mb-view").getAttribute("tabindex")) === "0" && (await page.locator("#mb-file").getAttribute("tabindex")) === "-1", "the Tab stop moves with focus");
      await press(page, "e");
      t((await active(page)) === "mb-edit", "typeahead moves to the trigger a letter starts", await active(page));
      await press(page, "Home");

      await press(page, "Enter");
      t((await out(page, "bar")) === "file" && (await active(page)) === "mb-new" && (await page.locator("#mb-file").getAttribute("aria-expanded")) === "true", "Enter opens the menu on its first item", await active(page));
      t((await page.getByRole("menu", { name: "File" }).count()) === 1, "the menu is named by its trigger");
      await press(page, "ArrowRight");
      t((await out(page, "bar")) === "edit" && (await active(page)) === "mb-undo" && !(await showing(page, "#mb-file-content")), "with a menu open, ArrowRight opens the next menu", `${await out(page, "bar")}, ${await active(page)}`);
      await press(page, "ArrowRight");
      await press(page, "ArrowRight");
      t((await out(page, "bar")) === "file" && (await active(page)) === "mb-new", "and wraps from the last menu to the first", `${await out(page, "bar")}, ${await active(page)}`);
      await press(page, "ArrowLeft");
      t((await out(page, "bar")) === "view" && (await active(page)) === "mb-bookmarks", "ArrowLeft opens the previous menu, wrapping", `${await out(page, "bar")}, ${await active(page)}`);
      await press(page, "Escape");
      t((await out(page, "bar")) === "" && (await active(page)) === "mb-view", "Escape closes it and leaves focus on its trigger", await active(page));
      await press(page, "ArrowUp");
      t((await active(page)) === "mb-zoom-125", "ArrowUp opens a menu on its last item", await active(page));
      await press(page, "Escape");
      await press(page, "Home");
      await press(page, "ArrowDown");
      t((await active(page)) === "mb-new", "ArrowDown opens it on its first item", await active(page));
      await press(page, "Escape");
      await press(page, " ");
      t((await active(page)) === "mb-new", "Space opens it on its first item", await active(page));

      // ── a submenu inside a menubar menu ──
      await press(page, "s");
      t((await active(page)) === "mb-share-trigger", "typeahead reaches the sub trigger", await active(page));
      await press(page, "ArrowRight");
      t((await showing(page, "#mb-share-content")) && (await active(page)) === "mb-share-email" && (await out(page, "bar")) === "file", "on a sub trigger, ArrowRight opens the submenu, not the next menu", await active(page));
      await press(page, "ArrowLeft");
      t(!(await showing(page, "#mb-share-content")) && (await out(page, "bar")) === "file" && (await active(page)) === "mb-share-trigger", "ArrowLeft in the submenu closes only the submenu", await active(page));
      await press(page, "ArrowRight");
      await press(page, "ArrowRight");
      t((await out(page, "bar")) === "edit" && (await active(page)) === "mb-undo" && !(await showing(page, "#mb-share-content")), "ArrowRight inside the submenu moves on to the next menu", `${await out(page, "bar")}, ${await active(page)}`);

      // ── activation ──
      await press(page, "Enter");
      t((await out(page, "picked")) === "undo" && (await out(page, "bar")) === "" && (await active(page)) === "mb-edit", "an item runs, the menu closes, focus is back on its trigger", await active(page));
      await press(page, "Enter");
      await press(page, "ArrowDown");
      t((await active(page)) === "mb-cut", "the disabled item is skipped", await active(page));
      await press(page, "Escape");
      await click(page, "#mb-view");
      await click(page, "#mb-bookmarks");
      t((await out(page, "bookmarks")) === "false" && (await page.locator("#mb-bookmarks").getAttribute("aria-checked")) === "false", "a checkbox item in a menubar menu flips aria-checked");
      await click(page, "#mb-view");
      await click(page, "#mb-zoom-125");
      t((await out(page, "zoom")) === "125" && (await page.locator("#mb-zoom-125").getAttribute("aria-checked")) === "true", "a radio item in a menubar menu checks itself");

      // ── the pointer ──
      await click(page, "#mb-file");
      t((await out(page, "bar")) === "file", "a press on a trigger opens its menu");
      await page.locator("#mb-edit").hover();
      await idle(page);
      t((await out(page, "bar")) === "edit" && !(await showing(page, "#mb-file-content")) && (await showing(page, "#mb-edit-content")), "with a menu open, hovering another trigger switches to its menu", await out(page, "bar"));
      await page.mouse.click(980, 780);
      await idle(page);
      t((await out(page, "bar")) === "", "a press outside closes it");
      await page.locator("#mb-view").hover();
      await idle(page);
      t((await out(page, "bar")) === "", "with no menu open, hovering a trigger opens nothing");
    },
  },
];

/** Each menu open the way a reader opens it, for axe and forced colours. */
const OPENED = [
  { name: "dropdown menu", open: async (p) => { await focus(p, "#dd-trigger"); await p.keyboard.press("Enter"); await idle(p); } },
  { name: "dropdown menu → submenu → submenu", open: async (p) => { await focus(p, "#dd-trigger"); for (const k of ["Enter", "s", "ArrowRight", "End", "ArrowRight"]) await press(p, k); } },
  { name: "context menu → submenu", open: async (p) => { await focus(p, "#ctx-shape"); for (const k of ["Shift+F10", "End", "ArrowUp", "ArrowRight"]) await press(p, k); } },
  { name: "menubar → submenu", open: async (p) => { await focus(p, "#mb-file"); for (const k of ["Enter", "s", "ArrowRight"]) await press(p, k); } },
  { name: "dialog → menu → submenu", open: async (p) => { await click(p, "#dlg-trigger"); await focus(p, "#dlg-menu-trigger"); for (const k of ["Enter", "End", "ArrowRight"]) await press(p, k); } },
  { name: "data row action menu", open: async (p) => { await focus(p, "#row-INV-002-actions"); await press(p, "Enter"); } },
];
const DEMOS = [
  { demo: "DropdownMenuDemo", open: async (p) => { await focus(p, "[kxDropdownMenuTrigger]"); await press(p, "Enter"); await press(p, "s"); await press(p, "ArrowRight"); } },
  { demo: "ContextMenuDemo", open: async (p) => { await focus(p, "[kxContextMenuTrigger]"); await press(p, "Shift+F10"); await press(p, "m"); await press(p, "ArrowRight"); } },
  { demo: "MenubarDemo", open: async (p) => { await focus(p, "[kxMenubarTrigger]"); await press(p, "Enter"); await press(p, "s"); await press(p, "ArrowRight"); } },
];

if (runs("interaction")) {
  assertClaims("interaction, accessibility", BEHAVIOUR);
  report.push(`\ninteraction — ${BEHAVIOUR.length} menus driven by keyboard and pointer in Chromium`);
  for (const subject of BEHAVIOUR) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await open(context);
    try {
      await subject.run(page, (ok, what, detail) => check(ok, `${subject.component}: ${what}`, detail));
    } catch (err) {
      check(false, `${subject.component}: ran to completion`, process.env.KX_VERBOSE ? String(err.message) : String(err.message).split("\n")[0]);
    }
    await context.close();
  }

  // The data row: a menu per row, and the row's own action removes the row (and the trigger) as it closes.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await open(context);
    try {
      await focus(page, "#row-INV-002-actions");
      await press(page, "Enter");
      t2(page.getByRole("menu", { name: "Actions for INV-002" }), "composition: a data row's action menu is named by its row's trigger");
      await press(page, "End");
      await press(page, "Enter");
      check((await out(page, "rows")) === "INV-001,INV-003", "composition: the row's destructive action ran and removed the row", await out(page, "rows"));
      check(await page.evaluate(() => document.activeElement === document.body || document.activeElement?.isConnected === true), "composition: focus is never left on the removed trigger", await active(page));
      // a menu inside a dialog: Escape closes the menu, then the dialog
      await click(page, "#dlg-trigger");
      await focus(page, "#dlg-menu-trigger");
      await press(page, "Enter");
      await press(page, "Escape");
      check((await out(page, "dialog-menu")) === "false" && (await out(page, "dialog")) === "true" && (await active(page)) === "dlg-menu-trigger", "composition: in a dialog, Escape closes the menu alone, focus back on its trigger", await active(page));
      await press(page, "Escape");
      check((await out(page, "dialog")) === "false", "composition: the next Escape closes the dialog");
    } catch (err) {
      check(false, "compositions: ran to completion", String(err.message).split("\n")[0]);
    }
    await context.close();
  }
  async function t2(locator, label) {
    check((await locator.count()) === 1, label);
  }

  report.push(`\naccessibility — every menu open, under axe (light and dark), visible focus and forced colours`);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, colorScheme: theme, reducedMotion: "reduce" });
    const cases = [...OPENED.map((c) => ({ ...c, fixture: "collections" })), ...DEMOS.map((d) => ({ name: `usage ${d.demo}`, fixture: "usage", demo: d.demo, open: d.open }))];
    for (const c of cases) {
      const page = await open(context, c.fixture, { theme, demo: c.demo });
      try {
        await c.open(page);
        const opened = await page.evaluate(() => document.querySelectorAll('[role="menu"]:popover-open').length);
        const violations = (await axe(page)).flatMap((v) => v.targets.map((target) => `${v.id} ${target}`));
        check(opened > 0 && violations.length === 0, `axe ${theme} ${c.name} (${opened} menu${opened === 1 ? "" : "s"} open)`, opened ? violations.join("; ") : "nothing opened");
      } catch (err) {
        check(false, `axe ${theme} ${c.name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await page.close();
    }
    await context.close();
  }

  // Visible focus: the keyboard highlight draws a ring the pointer highlight does not.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
    const page = await open(context);
    await focus(page, "#dd-trigger");
    await press(page, "Enter");
    const shadow = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).boxShadow);
    const keyboard = await shadow("#dd-rename");
    await page.locator("#dd-duplicate").hover();
    await idle(page);
    const pointer = await shadow("#dd-duplicate");
    check(keyboard !== "none" && pointer === "none", "visible focus: a keyboard highlight draws a ring, a pointer highlight does not", `keyboard ${keyboard}; pointer ${pointer}`);
    await context.close();
  }

  // Forced colours: the highlighted item, every menubar trigger and the context region keep an outline.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, forcedColors: "active", reducedMotion: "reduce" });
    const page = await open(context);
    const outlined = (sel) => page.locator(sel).first().evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0; });
    try {
      await focus(page, "#dd-trigger");
      await press(page, "Enter");
      const missing = [];
      for (let i = 0; i < 8; i++) {
        const id = await active(page);
        if (!(await outlined(`#${id}`))) missing.push(id);
        await press(page, "ArrowDown");
      }
      await page.locator("#dd-compact").hover();
      await idle(page);
      if (!(await outlined("#dd-compact"))) missing.push("dd-compact (pointer)");
      check(missing.length === 0, "forced colours: every highlighted menu item keeps an outline, keyboard and pointer", missing.join(", "));
      await press(page, "Escape");
      const bar = [];
      await focus(page, "#mb-file");
      for (let i = 0; i < 3; i++) {
        const id = await active(page);
        if (!(await outlined(`#${id}`))) bar.push(id);
        await press(page, "ArrowRight");
      }
      check(bar.length === 0, "forced colours: every menubar trigger keeps a focus outline", bar.join(", "));
      await focus(page, "#ctx-region");
      check(await outlined("#ctx-region"), "forced colours: the context region keeps a focus outline");
    } catch (err) {
      check(false, "forced colours: ran to completion", String(err.message).split("\n")[0]);
    }
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: rtl
 *
 * Direction in the four cases (an LTR page, an RTL page, an LTR region in an RTL page, an RTL region in an
 * LTR page). Menus render in the top layer but stay where they were declared in the DOM, so a menu inside an
 * RTL region resolves to RTL even on an LTR page — measured against the region's direction, not the page's.
 *
 *   KxDropdownMenu  the menu's inline-start edge lines up with the trigger's (`align="start"`); the shortcut
 *                   sits at each item's inline end and the check mark at its inline start; the submenu opens by
 *                   the inline-END arrow (ArrowRight in LTR, ArrowLeft in RTL) and not by the other, is painted
 *                   toward the inline end of its parent, and closes by the inline-start arrow; the sub trigger's
 *                   chevron is at its inline end and drawn in the region's direction (mirrored)
 *   KxContextMenu   opened at a point, its inline-start corner is on the point: its left edge in LTR, its right
 *                   edge in RTL
 *   KxMenubar       the inline-end arrow moves to the next trigger (ArrowRight in LTR, ArrowLeft in RTL) and
 *                   the triggers run in reading order; a menu's inline-start edge lines up with its trigger's
 * ════════════════════════════════════════════════════════════════════════════ */
const towardEnd = (dir, a, b) => (dir === "rtl" ? b - a : a - b);
const RTL = [
  {
    component: "KxDropdownMenu",
    async run(page, dir, t) {
      const [into, out] = dir === "rtl" ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
      await focus(page, "#dd-trigger");
      await press(page, "Enter");
      const tr = await rectOf(page, "#dd-trigger");
      const m = await rectOf(page, "#dd-content");
      const aligned = dir === "rtl" ? Math.abs(m.right - tr.right) <= 1.5 : Math.abs(m.left - tr.left) <= 1.5;
      t(aligned, "the menu's inline-start edge lines up with the trigger's", `trigger ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, menu ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      const item = await rectOf(page, "#dd-rename");
      const sc = await rectOf(page, "#dd-shortcut");
      const scAtEnd = dir === "rtl" ? sc.left - item.left <= 12 : item.right - sc.right <= 12;
      t(scAtEnd, "the shortcut sits at the item's inline end", `item ${item.left.toFixed(0)}–${item.right.toFixed(0)}, shortcut ${sc.left.toFixed(0)}–${sc.right.toFixed(0)}`);
      const mark = await rectOf(page, "#dd-ruler .kx-menu__indicator");
      const ruler = await rectOf(page, "#dd-ruler");
      const markAtStart = dir === "rtl" ? ruler.right - mark.right <= 12 : mark.left - ruler.left <= 12;
      t(markAtStart, "the check mark sits at the item's inline start", `item ${ruler.left.toFixed(0)}–${ruler.right.toFixed(0)}, mark ${mark.left.toFixed(0)}–${mark.right.toFixed(0)}`);
      await press(page, "s");
      const st = await rectOf(page, "#dd-sub-trigger");
      const chev = await rectOf(page, "#dd-sub-trigger .kx-menu__chevron");
      const chevDir = await page.locator("#dd-sub-trigger .kx-menu__chevron").evaluate((el) => getComputedStyle(el).direction);
      t(towardEnd(dir, chev.left, st.left + st.width / 2) > 0 && chevDir === dir, "the chevron is at the sub trigger's inline end, drawn in the region's direction", `${chevDir}, chevron ${chev.left.toFixed(0)}–${chev.right.toFixed(0)} in ${st.left.toFixed(0)}–${st.right.toFixed(0)}`);
      await press(page, out);
      t(!(await showing(page, "#dd-sub-content")), `${out} (the inline-start arrow) does not open the submenu`);
      await press(page, into);
      t((await showing(page, "#dd-sub-content")) && (await active(page)) === "dd-sub-email", `${into} (the inline-end arrow) opens it`, await active(page));
      const parent = await rectOf(page, "#dd-content");
      const sub = await rectOf(page, "#dd-sub-content");
      const towardInlineEnd = dir === "rtl" ? sub.right <= st.left + 1 && sub.left < parent.left : sub.left >= st.right - 1 && sub.right > parent.right;
      t(towardInlineEnd, "the submenu is painted toward the inline end of its parent", `parent ${parent.left.toFixed(0)}–${parent.right.toFixed(0)}, sub ${sub.left.toFixed(0)}–${sub.right.toFixed(0)}`);
      await press(page, out);
      t(!(await showing(page, "#dd-sub-content")) && (await active(page)) === "dd-sub-trigger", `${out} closes it, focus back on its trigger`, await active(page));
      await press(page, "Escape");
    },
  },
  {
    component: "KxContextMenu",
    async run(page, dir, t) {
      const region = await rectOf(page, "#ctx-region");
      const at = { x: region.left + region.width / 2, y: region.top + 30 };
      await page.mouse.click(at.x, at.y, { button: "right" });
      await idle(page);
      await settled(page);
      const m = await rectOf(page, "#ctx-content");
      const corner = dir === "rtl" ? Math.abs(m.right - at.x) <= 1.5 : Math.abs(m.left - at.x) <= 1.5;
      t((await showing(page, "#ctx-content")) && corner, "its inline-start corner is on the point", `point ${at.x.toFixed(0)}; menu ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      await press(page, "Escape");
    },
  },
  {
    component: "KxMenubar",
    async run(page, dir, t) {
      const next = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const file = await rectOf(page, "#mb-file");
      const edit = await rectOf(page, "#mb-edit");
      t(towardEnd(dir, edit.left, file.left) > 0, "the triggers run in reading order", `file ${file.left.toFixed(0)}, edit ${edit.left.toFixed(0)}`);
      await focus(page, "#mb-file");
      await press(page, next);
      t((await active(page)) === "mb-edit", `${next} (the inline-end arrow) moves to the next trigger`, await active(page));
      await press(page, "Enter");
      const tr = await rectOf(page, "#mb-edit");
      const m = await rectOf(page, "#mb-edit-content");
      const aligned = dir === "rtl" ? Math.abs(m.right - tr.right) <= 1.5 : Math.abs(m.left - tr.left) <= 1.5;
      t(aligned, "the menu's inline-start edge lines up with its trigger's", `trigger ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, menu ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      await press(page, next);
      t((await out(page, "bar")) === "view", `${next} with a menu open opens the next menu`, await out(page, "bar"));
      await press(page, "Escape");
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
  report.push(`\nrtl — ${RTL.length} menus in ${DIRECTION_CASES.length} direction cases`);
  for (const c of DIRECTION_CASES) {
    const want = c.region ?? c.page;
    const label = c.region ? `${c.region} region in an ${c.page} page` : `${c.page} page`;
    for (const subject of RTL) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
      const page = await open(context, "collections", { dir: c.page, region: c.region });
      const name = `${subject.component} (${label})`;
      try {
        const resolved = await page.locator("#region").evaluate((el) => getComputedStyle(el).direction);
        const menuDir = await page.locator("#dd-content").evaluate((el) => getComputedStyle(el).direction);
        check(resolved === want && menuDir === want, `${name}: the region and its menus resolve to ${want}`, `${resolved}, menu ${menuDir}`);
        await subject.run(page, want, (ok, what, detail) => check(ok, `${name}: ${what}`, detail));
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: largeText
 *
 * 200% text (the root font size doubled) at 1024px and at a 390px phone width, on every menu OPEN, with a
 * submenu open where it has one: the open menu stays inside the viewport and, when it is taller than the room,
 * scrolls inside itself — its last item is reachable by End and is then inside the menu's visible box; nothing
 * is cut off sideways; the text grows; every item is at least a 24px target; and it is still operable —
 * Escape closes it and focus comes back to its trigger.
 *
 *   KxDropdownMenu  opened from the keyboard, then its submenu
 *   KxContextMenu   opened from the keyboard on the region
 *   KxMenubar       a menu opened from its trigger; at 390px the menubar's triggers wrap rather than overflow
 *
 * And the whole page fits 390px at 2x with no horizontal scroll.
 * ════════════════════════════════════════════════════════════════════════════ */
const LARGE = [
  { component: "KxDropdownMenu", trigger: "#dd-trigger", keys: ["Enter"], surface: "#dd-content", sub: { keys: ["s", "ArrowRight"], surface: "#dd-sub-content" } },
  { component: "KxContextMenu", trigger: "#ctx-region", keys: ["Shift+F10"], surface: "#ctx-content", sub: { keys: ["End", "ArrowUp", "ArrowRight"], surface: "#ctx-sub-content" } },
  { component: "KxMenubar", trigger: "#mb-file", keys: ["Enter"], surface: "#mb-file-content", sub: { keys: ["s", "ArrowRight"], surface: "#mb-share-content" } },
];
const SCALE = 2;
const measure = (page, surface) =>
  page.evaluate((surface) => {
    const el = document.querySelector(surface);
    const r = el.getBoundingClientRect();
    const items = [...el.querySelectorAll(".kx-menu__item")].filter((i) => i.closest('[role="menu"]') === el);
    return {
      rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      vw: document.documentElement.clientWidth,
      vh: innerHeight,
      sideways: el.scrollWidth - el.clientWidth,
      scrolls: el.scrollHeight > el.clientHeight + 1,
      overflowY: getComputedStyle(el).overflowY,
      fontSize: parseFloat(getComputedStyle(items[0]).fontSize),
      small: items.filter((i) => Math.min(i.getBoundingClientRect().width, i.getBoundingClientRect().height) < 24).map((i) => i.id || i.textContent.trim()),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, surface);
if (runs("largeText")) {
  assertClaims("largeText", LARGE);
  report.push(`\nlargeText — ${LARGE.length} menus open at ${SCALE}x the root font size, 1024px and 390px`);
  for (const s of LARGE) {
    for (const viewport of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await open(context);
      const name = `${s.component} @${viewport.width}px`;
      try {
        const openIt = async () => {
          await focus(page, s.trigger);
          for (const k of s.keys) await press(page, k);
        };
        await openIt();
        const before = (await measure(page, s.surface)).fontSize;
        await press(page, "Escape");
        await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
        await idle(page);
        await openIt();
        await settled(page);
        for (const [what, surface] of [["the menu", s.surface], ["its submenu", s.sub.surface]]) {
          if (what === "its submenu") for (const k of s.sub.keys) await press(page, k);
          const m = await measure(page, surface);
          const inside = m.rect.left >= 7.5 && m.rect.right <= m.vw - 7.5 && m.rect.top >= 7.5 && m.rect.bottom <= m.vh - 7.5;
          check(inside, `${name}: ${what} stays inside the viewport at ${SCALE}x`, `${m.rect.left.toFixed(0)},${m.rect.top.toFixed(0)}–${m.rect.right.toFixed(0)},${m.rect.bottom.toFixed(0)} in ${m.vw}x${m.vh}`);
          check(m.sideways <= 1, `${name}: nothing in ${what} is cut off sideways`, `${m.sideways}px`);
          check(m.fontSize >= before * 1.8, `${name}: ${what}'s text grows with the reader's`, `${before}px -> ${m.fontSize}px`);
          check(m.small.length === 0, `${name}: every item in ${what} is at least a 24px target`, m.small.join(", "));
          if (m.scrolls) {
            await press(page, "End");
            const last = await page.evaluate((surface) => {
              const el = document.querySelector(surface);
              const a = document.activeElement.getBoundingClientRect();
              const r = el.getBoundingClientRect();
              return { inside: el.contains(document.activeElement) && a.top >= r.top - 0.5 && a.bottom <= r.bottom + 0.5 };
            }, surface);
            check(m.overflowY === "auto" && last.inside, `${name}: ${what} is taller than the room, so it scrolls inside itself; End reaches its last item, in view`, m.overflowY);
            await press(page, "Home");
          }
          check(m.pageOverflow <= 0, `${name}: no horizontal page overflow with ${what} open`, `${m.pageOverflow}px`);
        }
        await press(page, "Escape");
        await press(page, "Escape");
        check(!(await showing(page, s.surface)) && (await page.locator(s.trigger).evaluate((el) => el === document.activeElement)), `${name}: still operable — Escape closes each level, focus comes back`, await active(page));
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await open(context);
  await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
  await idle(page);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflowX <= 0, `the whole menus page fits 390px at ${SCALE}x text`, `${overflowX}px`);
  const bar = await rectOf(page, "#mb");
  check(bar.right <= 390 + 0.5, `the menubar wraps inside 390px at ${SCALE}x rather than overflowing`, `right edge ${bar.right.toFixed(0)}`);
  await context.close();
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: reducedMotion
 *
 * A menu opens and closes with the floating surface's motion (TOKENS.md, "Menus": a fade with a 4px settle),
 * and under `prefers-reduced-motion` with none, in the same end states. Each travel — open and close — is driven
 * in an LTR and an RTL page: with normal motion the opacity passes a rendered midpoint strictly between its end
 * states over a perceptible duration; under reduced motion no animation runs longer than SUPPRESSED_MS and the
 * menu lands where it would have (open: shown and opaque; closed: not rendered). Nothing waits on the motion:
 * the first item has focus as soon as the menu opens.
 *
 *   KxDropdownMenu  opened by pressing its trigger
 *   KxContextMenu   opened by a secondary click in its region
 *   KxMenubar       opened by pressing a trigger
 * ════════════════════════════════════════════════════════════════════════════ */
const MOTION = [
  { component: "KxDropdownMenu", control: "#dd-trigger", target: "#dd-content", how: "click" },
  { component: "KxContextMenu", control: "#ctx-region", target: "#ctx-content", how: "contextmenu" },
  { component: "KxMenubar", control: "#mb-file", target: "#mb-file-content", how: "click" },
];
function sampleTravel(page, { control, target, how }, travel) {
  return page.evaluate(
    ({ control, target, how, travel }) =>
      new Promise((resolve) => {
        const el = document.querySelector(target);
        const read = () => Number(getComputedStyle(el).opacity);
        const shown = () => el.matches(":popover-open");
        const a = read();
        if (travel === "open") {
          const c = document.querySelector(control);
          if (how === "contextmenu") {
            const r = c.getBoundingClientRect();
            c.dispatchEvent(new PointerEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, pointerType: "mouse", clientX: r.left + 30, clientY: r.top + 20 }));
          } else c.click();
        } else {
          (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        }
        let frames = 0;
        let longest = 0;
        const tick = () => {
          frames++;
          const running = el.getAnimations().filter((x) => x.playState === "running" && Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
          longest = Math.max(longest, ...running.map((x) => Number(x.effect.getComputedTiming().activeDuration)));
          const changed = shown() === (travel === "open");
          if (running.length) {
            running.forEach((x) => x.pause());
            running.forEach((x) => (x.currentTime = 0));
            const start = read();
            running.forEach((x) => (x.currentTime = Number(x.effect.getComputedTiming().activeDuration) / 2));
            const mid = read();
            running.forEach((x) => (x.currentTime = Number(x.effect.getComputedTiming().activeDuration) - 0.01));
            const end = read();
            running.forEach((x) => x.finish());
            requestAnimationFrame(() => resolve({ a: start, mid, b: end, durationMs: longest }));
          } else if (changed && frames > 6) {
            resolve({ a, mid: null, b: read(), durationMs: longest });
          } else if (frames > 60) {
            resolve({ a, mid: null, b: read(), durationMs: longest, timeout: true });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { control, target, how, travel },
  );
}
if (runs("reducedMotion")) {
  assertClaims("reducedMotion", MOTION);
  const { PERCEPTIBLE_MS, SUPPRESSED_MS } = await import("./motion-states.mjs");
  report.push(`\nreducedMotion — ${MOTION.length} menus, open and close, LTR and RTL, normal and reduced`);
  for (const s of MOTION) {
    for (const dir of ["ltr", "rtl"]) {
      let openEnd = null;
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, "collections", { dir });
        for (const travel of ["open", "close"]) {
          const name = `${s.component} ${travel} (${dir}, ${reduced ? "reduced" : "normal"} motion)`;
          try {
            const m = await sampleTravel(page, s, travel);
            await settled(page);
            await idle(page);
            const landed = await page.locator(s.target).evaluate((el) => ({ shown: el.matches(":popover-open"), display: getComputedStyle(el).display, opacity: Number(getComputedStyle(el).opacity) }));
            const ok = travel === "open" ? landed.shown && landed.display !== "none" && landed.opacity === 1 : !landed.shown && landed.display === "none";
            if (!reduced) {
              if (travel === "open") openEnd = m.b;
              const between = m.mid != null && Math.min(m.a, m.b) < m.mid && m.mid < Math.max(m.a, m.b);
              check(m.durationMs >= PERCEPTIBLE_MS && between, `${name}: travels through a rendered midpoint`, `${m.a} → ${m.mid} → ${m.b} over ${m.durationMs}ms`);
            } else {
              check(m.durationMs <= SUPPRESSED_MS, `${name}: no perceptible motion`, `${m.durationMs}ms`);
              if (travel === "open") check(Math.abs(m.b - openEnd) <= 0.01, `${name}: lands on the same end state`, `${m.b} (normal: ${openEnd})`);
            }
            check(ok, `${name}: comes to rest ${travel === "open" ? "shown" : "not rendered"}`, JSON.stringify(landed));
          } catch (err) {
            check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
          }
        }
        await context.close();
      }
    }
  }
}

/* ── verdict ─────────────────────────────────────────────────────────────── */

await browser.close();
server.close();
rmSync(harnessDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ angular-collections: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nangular-collections ok — @kinetixui/angular menus, live in Chromium.`);
