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

/* ── listbox helpers: focus stays put, the active descendant moves ───────── */

/** The focused field's `aria-activedescendant` — the option the keys are on — or null. */
const descendant = (page, field) => page.locator(field).first().getAttribute("aria-activedescendant");
/**
 * Whether a field's active descendant is one a reader can be on: null, or exactly one element with that id, an
 * enabled `role="option"`, rendered, inside the listbox the field controls. A stale id (an option that closed,
 * was filtered out or removed) or one pointing at a disabled option fails.
 */
const descendantValid = (page, field) =>
  page.locator(field).first().evaluate((f) => {
    const id = f.getAttribute("aria-activedescendant");
    if (id === null) return { ok: true, id };
    const all = document.querySelectorAll(`[id="${CSS.escape(id)}"]`);
    const el = all[0];
    const list = document.getElementById(f.getAttribute("aria-controls") ?? "");
    const why = [];
    if (all.length !== 1) why.push(`${all.length} elements`);
    if (el && el.getAttribute("role") !== "option") why.push("not an option");
    if (el && (el.hidden || !el.checkVisibility())) why.push("not rendered");
    if (el && el.getAttribute("aria-disabled") === "true") why.push("disabled");
    if (el && !list?.contains(el)) why.push("outside the controlled listbox");
    return { ok: why.length === 0, id, why: why.join(", ") };
  });
/** Ids used more than once, and id references (aria-controls/-activedescendant/-labelledby/-describedby, for) that resolve to nothing. */
const idHygiene = (page) =>
  page.evaluate(() => {
    const count = {};
    for (const e of document.querySelectorAll("[id]")) count[e.id] = (count[e.id] ?? 0) + 1;
    const dups = Object.entries(count).filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
    const broken = [];
    for (const attr of ["aria-controls", "aria-activedescendant", "aria-labelledby", "aria-describedby", "for"]) {
      for (const e of document.querySelectorAll(`[${attr}]`)) {
        for (const id of e.getAttribute(attr).split(/\s+/).filter(Boolean)) if (!document.getElementById(id)) broken.push(`${attr}=${id}`);
      }
    }
    return { dups, broken };
  });
/** The rendered options of a listbox, by id, with their state. */
const optionsOf = (page, list) =>
  page.locator(list).first().evaluate((l) =>
    [...l.querySelectorAll('[role="option"]')].filter((o) => !o.hidden).map((o) => ({ id: o.id, selected: o.getAttribute("aria-selected"), disabled: o.getAttribute("aria-disabled") === "true", highlighted: o.getAttribute("data-highlighted") })),
  );
/** Press keys one after another, collecting the field's active descendant after each. */
async function walkDescendant(page, field, key, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await press(page, key);
    seen.push(await descendant(page, field));
  }
  return seen;
}
const listboxOf = (page, field) => page.locator(field).first().getAttribute("aria-controls").then((id) => `[id="${id}"]`);

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
 * Wave C2b adds the listboxes on the same core: select, command, the combobox recipe and multi-select, sharing
 * one listbox layer (src/lib/listbox.ts: options, highlight, selection, `aria-activedescendant`) and floating on
 * the same overlay layer (src/fixtures/listboxes.ts). In all four, DOM focus stays on the field — the trigger,
 * the search field or the input — and only `aria-activedescendant` moves; after every key the gate reads it back
 * and requires it to name exactly one rendered, enabled option inside the listbox the field controls, or nothing.
 *
 *   KxSelect        the trigger is `role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded` and
 *                   `aria-controls`, named by its `<label for>`; closed, no listbox is exposed. ArrowDown, Enter
 *                   and Space open it with focus kept on the trigger, the highlight on the first option (or the
 *                   chosen one), ArrowUp on the last; the listbox is named by the field's label; arrows stop at
 *                   the ends and skip the disabled options, which are `aria-disabled` and never the active
 *                   descendant; Home / End jump; typeahead matches a prefix and never lands on a disabled option.
 *                   Enter chooses and closes; the chosen option alone carries `aria-selected="true"` and the
 *                   trigger shows its text; Escape closes without choosing; Tab closes without choosing and moves
 *                   on (and the form control is touched); a closed select chooses by typeahead without opening.
 *                   A pointer press opens and closes it, a resting pointer highlights (as a pointer highlight, not
 *                   a keyboard one), a press on an option chooses it, a press on a disabled option does nothing,
 *                   and a press outside closes it. No stale active descendant survives a close or reopen
 *   KxCommand       the search field is `role="combobox"`, `aria-expanded="true"`, `aria-controls` its list and
 *                   is named by the command's label, as is the `role="listbox"` list; the first item is the active
 *                   descendant and, being an action, the only one `aria-selected`. ArrowDown / ArrowUp stop at the
 *                   ends and skip the disabled item; Home / End stay the field's caret keys; typing filters
 *                   locally (text, value and keywords; a shortcut is not text), the highlight resets to the first
 *                   match, groups with no match and the separator hide; when nothing enabled matches there is no
 *                   active descendant, and the empty state shows. Enter and a press run the item with focus
 *                   kept in the field; removing the highlighted item moves the highlight to one that remains. The
 *                   query never leaves the page: no request is made while typing
 *   KxCombobox      a RECIPE (a button, a popover and a command — there is no component): Enter on the button
 *                   opens it with focus in the search field and the first option active; typing filters; the
 *                   disabled option is skipped; Enter chooses, the popover closes and focus returns to the button,
 *                   which shows the choice; Escape closes it the same way
 *   KxMultiSelect   the input is `role="combobox"` named by its `<label for>`, described by a summary of what is
 *                   chosen; the listbox is `aria-multiselectable`, and `aria-selected` on every option says
 *                   whether it is CHOSEN, independent of the highlight. ArrowDown opens it on the first option;
 *                   arrows stop at the ends and skip the disabled option; Enter toggles the highlighted option and
 *                   the list stays open; typing filters and resets the highlight; Escape closes only the list;
 *                   Backspace in an empty input removes the last chip. Each chip's remove button is named
 *                   "Remove X"; Enter on it removes the chip and focus moves to the neighbouring chip, then the
 *                   input — never the page; a pointer press on one does the same; with `creatable`, a new text is
 *                   offered and added. The form control is touched on blur
 *
 * Wave C3 adds the navigation menu, measured here beside the menus because it must NOT be one: it is the
 * disclosure-navigation pattern (src/lib/navigation-menu.ts), on the same collection core and floating layer.
 *
 *   KxNavigationMenu  a `navigation` landmark, named; no menu, menubar or menuitem role anywhere inside; its
 *                   triggers are plain buttons, `aria-expanded`, with `aria-controls` only while open; its links
 *                   are links (`<a href>`, the page you are on `aria-current="page"`). Every trigger and top-level
 *                   link is a Tab stop and a closed panel is never reached by Tab; with a panel open, Tab runs
 *                   trigger → the panel's links → the next trigger. Arrows move between the top-level stops and
 *                   stop at the ends (no wrap); Home / End jump; ArrowDown on a closed trigger moves on, and on
 *                   an open one goes into the panel, where the arrows, Home and End walk its links. Enter and
 *                   Space toggle a panel with focus kept on the trigger; the panel is named by its trigger and
 *                   has no role of its own. Escape closes the panel and returns focus to its trigger; opening a
 *                   second trigger closes the first; Tab out of the navigation closes it; following a link
 *                   closes it (and the link navigated). Pointer: resting on a trigger opens its panel after the
 *                   open delay and not before, the next one opens at once while one is open (the skip delay),
 *                   the pointer can travel onto the panel, and leaving both closes it; a trigger closed by a
 *                   press does not reopen under a pointer that has not left it; a press outside closes it. The
 *                   indicator sits under the open trigger and follows it to the next
 *
 * Compositions: a select and a multi-select inside a dialog — Escape closes the listbox alone (focus stays on
 * its field), the next Escape closes the dialog and focus returns to the button that opened it; the command
 * dialog — focus starts in its search field, Enter runs an item, the dialog closes and focus returns. With every
 * listbox open on the page at once, no id is used twice and every id reference resolves.
 *
 * Then axe, light and dark, with each menu open, with a submenu open, in a menu inside a dialog, on a data
 * row's action menu, with a navigation panel open (and focus in it), and on the usage examples opened; disabled items carry `aria-disabled` and no
 * native `disabled`; and visible focus: a keyboard-highlighted item draws a focus ring a pointer highlight does
 * not, and under forced colours every highlighted item, menubar trigger and the context region keep an outline,
 * and so does every navigation trigger and link with focus, and the open trigger.
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
  {
    component: "KxSelect",
    fixture: "listboxes",
    async run(page, t) {
      const trigger = page.locator("#sel-trigger");
      const valid = async (what) => {
        const v = await descendantValid(page, "#sel-trigger");
        t(v.ok, `${what}: the active descendant is valid`, v.ok ? String(v.id) : `${v.id}: ${v.why}`);
      };
      t((await trigger.getAttribute("role")) === "combobox" && (await trigger.getAttribute("aria-haspopup")) === "listbox", "the trigger is a combobox that opens a listbox");
      t((await trigger.getAttribute("aria-expanded")) === "false" && (await trigger.getAttribute("aria-controls")) === "sel-content", "closed, it says so and names the listbox it controls", await trigger.getAttribute("aria-controls"));
      t((await page.getByRole("combobox", { name: "Fruit" }).count()) === 1, "the trigger is named by its label");
      t((await page.locator("#sel-content").evaluate((el) => el.checkVisibility())) === false && (await trigger.getAttribute("aria-activedescendant")) === null, "closed, no listbox is exposed and nothing is active");

      // ── opening from the keyboard: focus stays on the trigger ──
      await focus(page, "#sel-trigger");
      await press(page, "ArrowDown");
      t((await showing(page, "#sel-content")) && (await active(page)) === "sel-trigger", "ArrowDown opens it, focus stays on the trigger", await active(page));
      t((await descendant(page, "#sel-trigger")) === "sel-apple" && (await page.locator("#sel-apple").getAttribute("data-highlighted")) === "keyboard", "the first option is the active descendant, a keyboard highlight", await descendant(page, "#sel-trigger"));
      t((await page.getByRole("listbox", { name: "Fruit" }).count()) === 1, "the listbox is named by the field's label");
      t((await trigger.getAttribute("aria-expanded")) === "true" && (await out(page, "sel-open")) === "true", "the trigger and the model say it is open");
      t((await optionsOf(page, "#sel-content")).every((o) => o.selected === "false"), "nothing is chosen yet: every option is aria-selected=false");
      t((await page.locator("#sel-blueberry").getAttribute("aria-disabled")) === "true", "the disabled option is aria-disabled");
      await valid("opened");

      // ── arrows stop at the ends and skip the disabled options ──
      const down = await walkDescendant(page, "#sel-trigger", "ArrowDown", 7);
      const expected = ["sel-apricot", "sel-banana", "sel-cherry", "sel-dragonfruit", "sel-elderberry", "sel-elderberry", "sel-elderberry"];
      t(down.join(",") === expected.join(","), "ArrowDown walks the options, skips the disabled ones and stops at the end", down.join(" > "));
      t((await active(page)) === "sel-trigger", "focus never left the trigger while the keys moved", await active(page));
      await valid("at the end");
      await press(page, "Home");
      t((await descendant(page, "#sel-trigger")) === "sel-apple", "Home jumps to the first option");
      await press(page, "ArrowUp");
      t((await descendant(page, "#sel-trigger")) === "sel-apple", "ArrowUp at the first option stays (no wrap)");
      await press(page, "End");
      t((await descendant(page, "#sel-trigger")) === "sel-elderberry", "End jumps to the last enabled option, past the disabled one", await descendant(page, "#sel-trigger"));

      // ── typeahead ──
      await page.waitForTimeout(600);
      await press(page, "b");
      t((await descendant(page, "#sel-trigger")) === "sel-banana", "typeahead never lands on the disabled option", await descendant(page, "#sel-trigger"));
      await page.waitForTimeout(600);
      for (const k of ["a", "p", "r"]) await press(page, k);
      t((await descendant(page, "#sel-trigger")) === "sel-apricot", "typeahead matches a prefix typed in quick succession", await descendant(page, "#sel-trigger"));
      await valid("after typeahead");

      // ── Enter chooses ──
      await press(page, "Enter");
      t(!(await showing(page, "#sel-content")) && (await active(page)) === "sel-trigger" && (await out(page, "fruit")) === "apricot", "Enter chooses the option and closes, focus on the trigger", `${await out(page, "fruit")} / ${await active(page)}`);
      t((await trigger.getAttribute("aria-activedescendant")) === null && (await trigger.getAttribute("aria-expanded")) === "false", "closed, no stale active descendant is left on the trigger");
      t((await trigger.textContent()).trim() === "Apricot", "the trigger shows the chosen option", (await trigger.textContent()).trim());
      await press(page, " ");
      t((await descendant(page, "#sel-trigger")) === "sel-apricot", "Space reopens it on the chosen option", await descendant(page, "#sel-trigger"));
      const chosen = (await optionsOf(page, "#sel-content")).filter((o) => o.selected === "true").map((o) => o.id);
      t(chosen.join(",") === "sel-apricot", "the chosen option alone is aria-selected=true", chosen.join(","));
      await press(page, "ArrowDown");
      t((await page.locator("#sel-apricot").getAttribute("aria-selected")) === "true" && (await page.locator("#sel-banana").getAttribute("aria-selected")) === "false", "moving the highlight does not move the selection");
      await valid("reopened");

      // ── Escape, Tab ──
      await press(page, "Escape");
      t(!(await showing(page, "#sel-content")) && (await active(page)) === "sel-trigger" && (await out(page, "fruit")) === "apricot", "Escape closes without choosing, focus on the trigger", await out(page, "fruit"));
      await press(page, "ArrowUp");
      await press(page, "ArrowDown");
      await press(page, "Tab");
      t(!(await showing(page, "#sel-content")) && (await active(page)) === "sel-after" && (await out(page, "fruit")) === "apricot", "Tab closes without choosing and moves on", `${await active(page)} / ${await out(page, "fruit")}`);
      t((await out(page, "fruit-touched")) === "true", "leaving the trigger marks the form control touched");

      // ── a closed select chooses by typeahead without opening ──
      await focus(page, "#sel-trigger");
      await page.waitForTimeout(600);
      await press(page, "c");
      t(!(await showing(page, "#sel-content")) && (await out(page, "fruit")) === "cherry", "closed, a printable key chooses the next match without opening", await out(page, "fruit"));
      await page.waitForTimeout(600);
      await press(page, "z");
      t((await out(page, "fruit")) === "cherry", "closed typeahead never chooses a disabled option", await out(page, "fruit"));

      // ── the pointer ──
      await click(page, "#sel-trigger");
      t((await showing(page, "#sel-content")) && (await active(page)) === "sel-trigger", "a press opens it, focus on the trigger");
      await page.locator("#sel-banana").hover();
      await idle(page);
      t((await descendant(page, "#sel-trigger")) === "sel-banana" && (await page.locator("#sel-banana").getAttribute("data-highlighted")) === "pointer", "a resting pointer highlights an option, as a pointer highlight");
      await page.locator("#sel-blueberry").hover();
      await idle(page);
      await valid("pointer over the disabled option");
      await click(page, "#sel-blueberry", { force: true });
      t((await showing(page, "#sel-content")) && (await out(page, "fruit")) === "cherry", "a press on the disabled option does nothing");
      await click(page, "#sel-banana");
      t(!(await showing(page, "#sel-content")) && (await out(page, "fruit")) === "banana" && (await active(page)) === "sel-trigger", "a press on an option chooses it and closes, focus on the trigger", `${await out(page, "fruit")} / ${await active(page)}`);
      await click(page, "#sel-trigger");
      await click(page, "#sel-trigger");
      t(!(await showing(page, "#sel-content")), "a second press on the trigger closes it");
      await click(page, "#sel-trigger");
      await page.mouse.click(980, 780);
      await idle(page);
      t(!(await showing(page, "#sel-content")) && (await out(page, "fruit")) === "banana", "a press outside closes it without choosing");

      // ── two selects on one page ──
      await focus(page, "#sel2-trigger");
      await press(page, "Enter");
      t((await descendant(page, "#sel2-trigger"))?.length > 0 && (await page.locator("#sel2-trigger").getAttribute("aria-controls")) === "sel2-content", "a second select opens on its own listbox, on its chosen option", await descendant(page, "#sel2-trigger"));
      const ids = await idHygiene(page);
      t(ids.dups.length === 0 && ids.broken.length === 0, "two selects on one page: no duplicate ids, every reference resolves", [...ids.dups, ...ids.broken].join(", "));
      await press(page, "Escape");

      // ── a disabled select is never open, however the page asks ──
      const lock = page.locator("#lock-trigger");
      t((await lock.isDisabled()) && (await lock.getAttribute("aria-expanded")) === "false", "a disabled select is closed");
      await click(page, "#lock-open");
      await idle(page);
      t(!(await showing(page, "#lock-content")) && (await out(page, "lock-open")) === "false", "a disabled field cannot be externally reopened: [(open)] set true settles back to false, no popup", `open=${await out(page, "lock-open")}`);
      t((await lock.getAttribute("aria-expanded")) === "false" && (await lock.getAttribute("aria-activedescendant")) === null, "…and the trigger reads collapsed with no active descendant");
      await page.locator("#lock-one").evaluate((el) => el.click());
      await idle(page);
      t((await out(page, "lock")) === "two", "…and no option can change its value", await out(page, "lock"));
      await click(page, "#lock-toggle");
      await click(page, "#lock-trigger");
      t((await showing(page, "#lock-content")) && (await out(page, "lock-open")) === "true", "re-enabled, it opens normally again");
      await click(page, "#lock-toggle");
      await idle(page);
      t(!(await showing(page, "#lock-content")) && (await out(page, "lock-open")) === "false", "disabled while open, it closes");
    },
  },
  {
    component: "KxCommand",
    fixture: "listboxes",
    async run(page, t) {
      const requests = [];
      page.on("request", (r) => requests.push(r.url()));
      const field = page.locator("#cmd-input");
      const valid = async (what) => {
        const v = await descendantValid(page, "#cmd-input");
        t(v.ok, `${what}: the active descendant is valid`, v.ok ? String(v.id) : `${v.id}: ${v.why}`);
      };
      const shown = () => optionsOf(page, "#cmd-list").then((os) => os.map((o) => o.id).join(","));
      t((await field.getAttribute("role")) === "combobox" && (await field.getAttribute("aria-expanded")) === "true" && (await field.getAttribute("aria-controls")) === "cmd-list", "the search field is a combobox whose list is always showing");
      t((await page.getByRole("combobox", { name: "Commands" }).count()) === 1 && (await page.getByRole("listbox", { name: "Commands" }).count()) === 1, "the field and the list are named by the command's label");
      t((await page.getByRole("group", { name: "Suggestions" }).count()) === 1, "a group is named by its heading");
      t((await descendant(page, "#cmd-input")) === "cmd-calendar", "the first item is the active descendant", await descendant(page, "#cmd-input"));
      const sel = (await optionsOf(page, "#cmd-list")).filter((o) => o.selected === "true").map((o) => o.id);
      t(sel.join(",") === "cmd-calendar", "an action list: aria-selected follows the highlight, on one item", sel.join(","));

      await focus(page, "#cmd-input");
      const down = await walkDescendant(page, "#cmd-input", "ArrowDown", 7);
      const expected = ["cmd-emoji", "cmd-calculator", "cmd-profile", "cmd-billing", "cmd-extra", "cmd-extra", "cmd-extra"];
      t(down.join(",") === expected.join(","), "ArrowDown walks the items, skips the disabled one and stops at the end", down.join(" > "));
      t((await active(page)) === "cmd-input", "focus stays in the search field", await active(page));
      await press(page, "Home");
      t((await descendant(page, "#cmd-input")) === "cmd-extra", "Home stays the field's caret key and moves no highlight");
      for (let i = 0; i < 8; i++) await press(page, "ArrowUp");
      t((await descendant(page, "#cmd-input")) === "cmd-calendar", "ArrowUp stops at the first item (no wrap)");

      // ── filtering ──
      await page.keyboard.type("cal");
      await idle(page);
      t((await shown()) === "cmd-calendar,cmd-calculator" && (await descendant(page, "#cmd-input")) === "cmd-calendar", "typing filters locally; the highlight resets to the first match", await shown());
      t((await page.locator("#cmd-settings").evaluate((el) => el.hidden)) && (await page.locator("#cmd-separator").evaluate((el) => el.hidden)), "a group with no match and the separator hide");
      await press(page, "ArrowDown");
      t((await descendant(page, "#cmd-input")) === "cmd-calculator", "the arrows walk only what the filter left");
      await press(page, "c");
      t((await descendant(page, "#cmd-input")) === "cmd-calculator" && (await shown()) === "cmd-calculator", "as the results shrink the active descendant stays on one that remains", await descendant(page, "#cmd-input"));
      await valid("results shrank");
      await page.fill("#cmd-input", "smiley");
      await idle(page);
      t((await shown()) === "cmd-emoji" && (await descendant(page, "#cmd-input")) === "cmd-emoji", "keywords match", await shown());
      await page.fill("#cmd-input", "ctrl");
      await idle(page);
      t((await shown()) === "" && !(await page.locator("#cmd-empty").evaluate((el) => el.hidden)), "a shortcut is not part of what the filter matches; the empty state shows", await shown());
      await page.fill("#cmd-input", "launch");
      await idle(page);
      t((await shown()) === "cmd-launch" && (await descendant(page, "#cmd-input")) === null, "only a disabled item matches: it shows, and is never the active descendant", String(await descendant(page, "#cmd-input")));
      await press(page, "Enter");
      t((await out(page, "ran")) === "", "Enter with nothing active runs nothing");
      await page.fill("#cmd-input", "zzz");
      await idle(page);
      t((await descendant(page, "#cmd-input")) === null && !(await page.locator("#cmd-empty").evaluate((el) => el.hidden)), "no match: no active descendant, and the empty state shows");
      t((await page.locator("#cmd-list").getAttribute("role")) === null && (await field.getAttribute("aria-expanded")) === "false", "no match: the list is no longer a listbox (it would own no options) and the field reads collapsed");
      await page.fill("#cmd-input", "");
      await idle(page);
      t((await descendant(page, "#cmd-input")) === "cmd-calendar" && (await page.locator("#cmd-empty").evaluate((el) => el.hidden)), "clearing the search brings every item and the first highlight back");

      // ── running ──
      await press(page, "ArrowDown");
      await press(page, "Enter");
      t((await out(page, "ran")) === "emoji" && (await active(page)) === "cmd-input", "Enter runs the highlighted item, focus stays in the field", await out(page, "ran"));
      await page.locator("#cmd-billing").hover();
      await idle(page);
      t((await descendant(page, "#cmd-input")) === "cmd-billing", "a resting pointer highlights an item");
      await click(page, "#cmd-billing");
      t((await out(page, "ran")) === "billing" && (await active(page)) === "cmd-input", "a press runs the item, focus stays in the field", await active(page));
      await click(page, "#cmd-launch", { force: true });
      t((await out(page, "ran")) === "billing", "a press on the disabled item does nothing");

      // ── the highlighted item goes away ──
      await focus(page, "#cmd-input");
      for (let i = 0; i < 7; i++) await press(page, "ArrowDown");
      t((await descendant(page, "#cmd-input")) === "cmd-extra", "the last item is highlighted");
      await page.evaluate(() => document.querySelector("#cmd-toggle-extra").click());
      await idle(page);
      t((await descendant(page, "#cmd-input")) !== "cmd-extra" && (await page.locator("#cmd-extra").count()) === 0, "removing the highlighted item moves the highlight to one that remains", String(await descendant(page, "#cmd-input")));
      await valid("item removed");

      const leaked = requests.filter((u) => /cal|smiley|ctrl|launch|zzz/i.test(new URL(u).search + new URL(u).pathname));
      t(requests.length === 0 && leaked.length === 0, "the query never leaves the page: no request was made while searching", requests.join(", "));
    },
  },
  {
    component: "KxCombobox",
    fixture: "listboxes",
    async run(page, t) {
      await focus(page, "#cb-trigger");
      await press(page, "Enter");
      t((await out(page, "cb-open")) === "true" && (await active(page)) === "cb-input", "Enter on the button opens the recipe, focus in the search field", await active(page));
      t((await descendant(page, "#cb-input")) === "cb-next" && (await page.getByRole("listbox", { name: "Frameworks" }).count()) === 1, "the first option is active in the named list", await descendant(page, "#cb-input"));
      await press(page, "ArrowDown");
      await press(page, "ArrowDown");
      t((await descendant(page, "#cb-input")) === "cb-remix", "the arrows skip the disabled option", await descendant(page, "#cb-input"));
      await page.keyboard.type("as");
      await idle(page);
      t((await descendant(page, "#cb-input")) === "cb-astro", "typing filters and resets the highlight to the first match", await descendant(page, "#cb-input"));
      await press(page, "Enter");
      t((await out(page, "cb")) === "astro" && (await out(page, "cb-open")) === "false" && (await active(page)) === "cb-trigger", "Enter chooses, the popover closes and focus returns to the button", `${await out(page, "cb")} / ${await active(page)}`);
      t((await page.locator("#cb-trigger").textContent()).trim() === "Astro", "the button shows the choice");
      await press(page, "Enter");
      await press(page, "Escape");
      t((await out(page, "cb-open")) === "false" && (await active(page)) === "cb-trigger" && (await out(page, "cb")) === "astro", "Escape closes it without choosing, focus back on the button", await active(page));
    },
  },
  {
    component: "KxMultiSelect",
    fixture: "listboxes",
    async run(page, t) {
      const input = page.locator("#ms-input");
      const valid = async (what) => {
        const v = await descendantValid(page, "#ms-input");
        t(v.ok, `${what}: the active descendant is valid`, v.ok ? String(v.id) : `${v.id}: ${v.why}`);
      };
      const list = await listboxOf(page, "#ms-input");
      const chosenIds = async () => (await optionsOf(page, list)).filter((o) => o.selected === "true").length;
      t((await input.getAttribute("role")) === "combobox" && (await input.getAttribute("aria-expanded")) === "false", "the input is a combobox, closed");
      t((await page.getByRole("combobox", { name: "Labels" }).count()) === 1, "the input is named by its label");
      const described = await input.evaluate((el) => el.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
      t(described.includes("2 selected: Design, Documentation"), "the input is described by a summary of what is chosen", described);
      const removes = await page.locator("#ms").getByRole("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
      t(removes.join(",") === "Remove Design,Remove Documentation", "each chip's remove button is named Remove X", removes.join(","));

      await focus(page, "#ms-input");
      await press(page, "ArrowDown");
      t((await showing(page, list)) && (await active(page)) === "ms-input", "ArrowDown opens the list, focus stays in the input");
      t((await page.locator(list).getAttribute("aria-multiselectable")) === "true" && (await page.getByRole("listbox", { name: "Labels" }).count()) === 1, "the listbox is multiselectable and named by the field's label");
      const opts = await optionsOf(page, list);
      t(opts.map((o) => o.selected).join(",") === "false,true,true,false,false,false", "aria-selected says which options are CHOSEN", opts.map((o) => o.selected).join(","));
      t((await descendant(page, "#ms-input")) === opts[0].id, "the first option is the active descendant");
      const walked = await walkDescendant(page, "#ms-input", "ArrowDown", 6);
      t(walked.join(",") === [opts[1].id, opts[2].id, opts[4].id, opts[5].id, opts[5].id, opts[5].id].join(","), "ArrowDown skips the disabled option and stops at the end", walked.join(" > "));
      t((await page.locator(`[id="${opts[3].id}"]`).getAttribute("aria-disabled")) === "true", "the disabled option is aria-disabled");
      await valid("walked");

      // ── Enter toggles; the list stays open ──
      await press(page, "Enter");
      t((await out(page, "ms")) === "design,docs,a11y" && (await showing(page, list)) && (await page.locator(`[id="${opts[5].id}"]`).getAttribute("aria-selected")) === "true", "Enter chooses the highlighted option and the list stays open", await out(page, "ms"));
      t((await page.locator("#ms [role=status]").textContent()).includes("Accessibility selected"), "the change is announced");
      await press(page, "Enter");
      t((await out(page, "ms")) === "design,docs" && (await page.locator(`[id="${opts[5].id}"]`).getAttribute("aria-selected")) === "false", "Enter again removes it: aria-selected stays accurate", await out(page, "ms"));
      t((await chosenIds()) === 2, "two options are chosen, two are aria-selected");

      // ── filtering ──
      await page.keyboard.type("res");
      await idle(page);
      const left = (await optionsOf(page, list)).map((o) => o.id);
      t(left.join(",") === opts[4].id && (await descendant(page, "#ms-input")) === opts[4].id, "typing filters the options and resets the highlight to the first match", left.join(","));
      await press(page, "Enter");
      t((await out(page, "ms")) === "design,docs,research" && (await input.inputValue()) === "", "Enter adds it and clears the search", await out(page, "ms"));
      await valid("after a filtered choice");
      await page.keyboard.type("zz");
      await idle(page);
      t((await descendant(page, "#ms-input")) === null, "no match: no active descendant");
      await page.fill("#ms-input", "");
      await idle(page);

      // ── Escape closes only the list ──
      await press(page, "Escape");
      t(!(await showing(page, list)) && (await active(page)) === "ms-input" && (await input.getAttribute("aria-activedescendant")) === null, "Escape closes the list, focus stays, no stale active descendant");
      await press(page, "Backspace");
      t((await out(page, "ms")) === "design,docs", "Backspace in an empty input removes the last chip", await out(page, "ms"));

      // ── chips: keyboard removal keeps focus ──
      await press(page, "Shift+Tab");
      const onChip = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      t(onChip === "Remove Documentation", "Shift+Tab reaches the last chip's remove button", onChip);
      await press(page, "Enter");
      const after = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.id);
      t((await out(page, "ms")) === "design" && after === "Remove Design", "Enter removes the chip; focus moves to the neighbouring chip's button", `${await out(page, "ms")} / ${after}`);
      await press(page, " ");
      t((await out(page, "ms")) === "" && (await active(page)) === "ms-input", "removing the last chip leaves focus in the input, never on the page", await active(page));
      t((await out(page, "ms-touched")) === "true", "leaving the input marks the form control touched");

      // ── the pointer ──
      await click(page, "#ms-input");
      t(await showing(page, list), "a press on the field opens the list");
      const os = await optionsOf(page, list);
      await click(page, `[id="${os[3].id}"]`, { force: true });
      t((await out(page, "ms")) === "", "a press on the disabled option does nothing");
      await click(page, `[id="${os[0].id}"]`);
      await click(page, `[id="${os[1].id}"]`);
      t((await out(page, "ms")) === "bug,design" && (await active(page)) === "ms-input" && (await showing(page, list)), "a press toggles an option, focus stays in the input", await out(page, "ms"));
      await page.mouse.click(980, 780);
      await idle(page);
      t(!(await showing(page, list)), "a press outside closes the list");
      await click(page, "#ms [aria-label='Remove Bug']");
      const afterPointer = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.id);
      t((await out(page, "ms")) === "design" && afterPointer === "Remove Design", "a press on a chip's remove button removes it; focus is kept on a neighbour", afterPointer);

      // ── creatable ──
      await focus(page, "#ms2-input");
      await page.keyboard.type("Someday");
      await idle(page);
      const offer = await page.evaluate(() => document.getElementById(document.activeElement.getAttribute("aria-activedescendant"))?.textContent.trim());
      t(offer === "Create “Someday”", "creatable: a new text is offered as an option", offer);
      await press(page, "Enter");
      t((await out(page, "ms2")) === "Someday", "creatable: Enter adds the text", await out(page, "ms2"));
      await press(page, "Escape");

      // ── a disabled multi-select is never open, however the page asks ──
      await click(page, "#ms-lock-open");
      await idle(page);
      const lockInput = page.locator("#ms-lock-input");
      t(!(await showing(page, "#ms-lock .kx-option-popup")) && (await out(page, "ms-lock-open")) === "false", "a disabled field cannot be externally reopened: [(open)] set true settles back to false, no popup", `open=${await out(page, "ms-lock-open")}`);
      t((await lockInput.getAttribute("aria-expanded")) === "false" && (await lockInput.getAttribute("aria-activedescendant")) === null, "…and the input reads collapsed with no active descendant");
      await page.locator("#ms-lock .kx-option").first().evaluate((el) => el.click());
      await idle(page);
      t((await out(page, "ms-lock")) === "", "…and no option can change the selection", await out(page, "ms-lock"));
    },
  },
  {
    component: "KxNavigationMenu",
    async run(page, t) {
      const nav = page.locator("#nm");
      t((await page.getByRole("navigation", { name: "Site" }).count()) === 1, "a navigation landmark, named by its label");
      t((await nav.locator('[role="menu"], [role="menubar"], [role="menuitem"]').count()) === 0, "no menu, menubar or menuitem role anywhere inside: site navigation, not an application menu");
      const trig = page.locator("#nm-products");
      const plain = await trig.evaluate((el) => el.tagName === "BUTTON" && el.type === "button" && !el.hasAttribute("role") && !el.hasAttribute("aria-haspopup"));
      t(plain && (await trig.getAttribute("aria-expanded")) === "false" && (await trig.getAttribute("aria-controls")) === null, "a trigger is a plain button, collapsed, controlling nothing while closed");
      const links = await page.locator("#nm a[kxNavigationMenuLink]").evaluateAll((as) => as.map((a) => a.tagName === "A" && a.hasAttribute("href") && !a.hasAttribute("role")));
      t(links.length === 6 && links.every(Boolean), "every link is a real link with an href and no role of its own", `${links.length} links`);
      t((await page.locator("#nm-billing").getAttribute("aria-current")) === "page" && (await page.locator("#nm-analytics").getAttribute("aria-current")) === null, "the page you are on is aria-current=page, the others are not");

      // ── Tab: every trigger and top-level link, never a closed panel ──
      await focus(page, "#nm-before");
      const tabs = await walk(page, "Tab", 4);
      t(tabs.join(",") === "nm-products,nm-resources,nm-pricing,nm-after", "Tab walks the triggers and the top-level link; closed panels are skipped", tabs.join(" > "));

      // ── arrows between the top-level stops ──
      await focus(page, "#nm-products");
      const right = await walk(page, "ArrowRight", 3);
      t(right.join(",") === "nm-resources,nm-pricing,nm-pricing", "ArrowRight moves to the next stop and stops at the end (no wrap)", right.join(" > "));
      await press(page, "Home");
      t((await active(page)) === "nm-products", "Home jumps to the first stop", await active(page));
      await press(page, "End");
      t((await active(page)) === "nm-pricing", "End jumps to the last stop", await active(page));
      await press(page, "ArrowLeft");
      await press(page, "ArrowUp");
      t((await active(page)) === "nm-products", "ArrowLeft and ArrowUp move back", await active(page));
      await press(page, "ArrowDown");
      t((await active(page)) === "nm-resources" && (await out(page, "nav")) === "", "ArrowDown on a closed trigger moves on and opens nothing", await active(page));

      // ── open, into the panel, out again ──
      await focus(page, "#nm-products");
      await press(page, "Enter");
      const panel = page.locator("#nm-products-content");
      t((await showing(page, "#nm-products-content")) && (await out(page, "nav")) === "products" && (await active(page)) === "nm-products", "Enter opens the panel with focus kept on the trigger", await active(page));
      t((await trig.getAttribute("aria-expanded")) === "true" && (await trig.getAttribute("aria-controls")) === "nm-products-content", "the trigger says it is expanded and controls the panel");
      t((await panel.getAttribute("aria-labelledby")) === "nm-products" && (await panel.getAttribute("role")) === null, "the panel is named by its trigger and has no role of its own");
      await press(page, "ArrowDown");
      t((await active(page)) === "nm-analytics", "ArrowDown on an open trigger goes into the panel, to its first link", await active(page));
      const inPanel = await walk(page, "ArrowDown", 3);
      t(inPanel.join(",") === "nm-billing,nm-security,nm-security", "the arrows walk the panel's links and stop at the end", inPanel.join(" > "));
      await press(page, "Home");
      t((await active(page)) === "nm-analytics", "Home jumps to the panel's first link", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#nm-products-content")) && (await out(page, "nav")) === "" && (await active(page)) === "nm-products", "Escape closes the panel and returns focus to its trigger", await active(page));
      await press(page, " ");
      t((await out(page, "nav")) === "products", "Space opens it");
      const through = await walk(page, "Tab", 4);
      t(through.join(",") === "nm-analytics,nm-billing,nm-security,nm-resources", "with a panel open, Tab runs trigger → its links → the next trigger", through.join(" > "));
      await focus(page, "#nm-products");
      await press(page, " ");
      t((await out(page, "nav")) === "", "Space closes it again");

      // ── one panel at a time; leaving closes ──
      await press(page, "Enter");
      await focus(page, "#nm-resources");
      await press(page, "Enter");
      t((await out(page, "nav")) === "resources" && (await trig.getAttribute("aria-expanded")) === "false" && !(await showing(page, "#nm-products-content")), "opening a second trigger closes the first");
      const out1 = await walk(page, "Tab", 4);
      t(out1.at(-1) === "nm-after" && (await out(page, "nav")) === "", "Tab out of the navigation closes the panel", out1.join(" > "));
      await focus(page, "#nm-products");
      await press(page, "Enter");
      await click(page, "#nm-analytics");
      t((await out(page, "nav")) === "" && (await out(page, "picked")) === "analytics" && (await page.evaluate(() => location.hash)) === "#analytics", "following a link closes the panel, and the link navigated", await page.evaluate(() => location.hash));

      // ── the pointer ──
      await page.mouse.move(2, 2);
      await page.waitForTimeout(400);
      await idle(page);
      const res = await rectOf(page, "#nm-resources");
      await page.mouse.move(res.left + 10, res.top + 10);
      await page.mouse.move(res.left + 12, res.top + 12);
      await page.waitForTimeout(100);
      await idle(page);
      t((await out(page, "nav")) === "", "resting on a trigger does not open it before the open delay");
      await page.waitForTimeout(250);
      await idle(page);
      t((await out(page, "nav")) === "resources", "…and opens it after the delay");
      const pro = await rectOf(page, "#nm-products");
      await page.mouse.move(pro.left + 10, pro.top + 10);
      await page.mouse.move(pro.left + 12, pro.top + 12);
      await page.waitForTimeout(40);
      await idle(page);
      t((await out(page, "nav")) === "products", "with one open, the next opens at once (the skip delay)");
      await settled(page);
      const ind = await rectOf(page, "#nm-indicator");
      t(Math.abs(centre(ind).x - centre(pro).x) <= 1.5 && ind.top >= pro.bottom - 1, "the indicator sits under the open trigger", `trigger ${centre(pro).x.toFixed(0)}, indicator ${centre(ind).x.toFixed(0)}`);
      const pr = await rectOf(page, "#nm-products-content");
      await page.mouse.move(pro.left + 12, pr.top - 2, { steps: 4 });
      await page.mouse.move(pr.left + 20, pr.top + 20, { steps: 4 });
      await page.waitForTimeout(300);
      await idle(page);
      t((await out(page, "nav")) === "products", "the pointer can travel onto the panel without it closing");
      await page.mouse.move(pr.right + 200, pr.bottom + 150, { steps: 4 });
      await page.waitForTimeout(350);
      await idle(page);
      t((await out(page, "nav")) === "", "leaving trigger and panel closes it");
      await page.mouse.click(pro.left + 12, pro.top + 12);
      await idle(page);
      t((await out(page, "nav")) === "products", "a press opens it");
      await page.mouse.click(pro.left + 12, pro.top + 12);
      await idle(page);
      await page.mouse.move(pro.left + 16, pro.top + 14);
      await page.waitForTimeout(400);
      await idle(page);
      t((await out(page, "nav")) === "", "closed by a press, it does not reopen under a pointer that has not left");
      await page.mouse.click(pro.left + 12, pro.top + 12);
      await idle(page);
      await page.mouse.click(4, 760);
      await idle(page);
      t((await out(page, "nav")) === "", "a press outside closes it");
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
  { name: "select", fixture: "listboxes", open: async (p) => { await focus(p, "#sel-trigger"); await press(p, "ArrowDown"); } },
  { name: "command, filtered", fixture: "listboxes", open: async (p) => { await focus(p, "#cmd-input"); await p.keyboard.type("ca"); await idle(p); } },
  { name: "command, no match", fixture: "listboxes", open: async (p) => { await focus(p, "#cmd-input"); await p.keyboard.type("zzz"); await idle(p); } },
  { name: "combobox recipe", fixture: "listboxes", open: async (p) => { await focus(p, "#cb-trigger"); await press(p, "Enter"); } },
  { name: "multi-select", fixture: "listboxes", open: async (p) => { await focus(p, "#ms-input"); await press(p, "ArrowDown"); } },
  { name: "multi-select, creatable", fixture: "listboxes", open: async (p) => { await focus(p, "#ms2-input"); await p.keyboard.type("Someday"); await idle(p); } },
  { name: "dialog → select", fixture: "listboxes", open: async (p) => { await click(p, "#dlg-trigger"); await focus(p, "#dlg-sel-trigger"); await press(p, "Enter"); } },
  { name: "dialog → multi-select", fixture: "listboxes", open: async (p) => { await click(p, "#dlg-trigger"); await focus(p, "#dlg-ms-input"); await press(p, "ArrowDown"); } },
  { name: "command dialog", fixture: "listboxes", open: async (p) => { await click(p, "#pal-open"); } },
  { name: "navigation menu, panel open", open: async (p) => { await focus(p, "#nm-products"); await press(p, "Enter"); } },
  { name: "navigation menu, focus in the panel", open: async (p) => { await focus(p, "#nm-resources"); await press(p, "Enter"); await press(p, "ArrowDown"); } },
];
const DEMOS = [
  { demo: "DropdownMenuDemo", open: async (p) => { await focus(p, "[kxDropdownMenuTrigger]"); await press(p, "Enter"); await press(p, "s"); await press(p, "ArrowRight"); } },
  { demo: "ContextMenuDemo", open: async (p) => { await focus(p, "[kxContextMenuTrigger]"); await press(p, "Shift+F10"); await press(p, "m"); await press(p, "ArrowRight"); } },
  { demo: "MenubarDemo", open: async (p) => { await focus(p, "[kxMenubarTrigger]"); await press(p, "Enter"); await press(p, "s"); await press(p, "ArrowRight"); } },
  { demo: "SelectDemo", open: async (p) => { await focus(p, "[kxSelectTrigger]"); await press(p, "Enter"); } },
  { demo: "CommandDemo", open: async (p) => { await focus(p, "[kxCommandInput]"); await press(p, "ArrowDown"); } },
  { demo: "ComboboxDemo", open: async (p) => { await focus(p, ".combobox-trigger"); await press(p, "Enter"); } },
  { demo: "MultiSelectDemo", open: async (p) => { await focus(p, "#platforms"); await press(p, "ArrowDown"); } },
  { demo: "NavigationMenuDemo", open: async (p) => { await focus(p, "[kxNavigationMenuTrigger]"); await press(p, "Enter"); await press(p, "ArrowDown"); } },
];

if (runs("interaction")) {
  assertClaims("interaction, accessibility", BEHAVIOUR);
  report.push(`\ninteraction — ${BEHAVIOUR.length} menus and listboxes driven by keyboard and pointer in Chromium`);
  for (const subject of BEHAVIOUR) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await open(context, subject.fixture);
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
  // The listboxes composed: inside a dialog, the command dialog, and every listbox open on one page.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await open(context, "listboxes");
    try {
      await click(page, "#dlg-trigger");
      await focus(page, "#dlg-sel-trigger");
      await press(page, "Enter");
      check((await out(page, "dlg-sel-open")) === "true" && (await active(page)) === "dlg-sel-trigger", "composition: a select opens inside a dialog, focus on its trigger");
      await press(page, "Escape");
      check((await out(page, "dlg-sel-open")) === "false" && (await out(page, "dialog")) === "true" && (await active(page)) === "dlg-sel-trigger", "composition: in a dialog, Escape closes the select alone, focus on its trigger", await active(page));
      await focus(page, "#dlg-ms-input");
      await press(page, "ArrowDown");
      check((await out(page, "dlg-ms-open")) === "true" && (await active(page)) === "dlg-ms-input", "composition: a multi-select opens inside a dialog, focus in its input");
      await press(page, "Escape");
      check((await out(page, "dlg-ms-open")) === "false" && (await out(page, "dialog")) === "true" && (await active(page)) === "dlg-ms-input", "composition: in a dialog, Escape closes the multi-select's list alone", await active(page));
      await press(page, "Escape");
      check((await out(page, "dialog")) === "false" && (await active(page)) === "dlg-trigger", "composition: the next Escape closes the dialog, focus back on its button", await active(page));

      await focus(page, "#pal-open");
      await press(page, "Enter");
      check((await out(page, "palette")) === "true" && (await active(page)) === "pal-input" && (await descendant(page, "#pal-input")) === "pal-home", "composition: the command dialog opens with focus in its search field", await active(page));
      check((await page.getByRole("dialog", { name: "Command palette" }).count()) === 1, "composition: the command dialog is named");
      await page.keyboard.type("inb");
      await idle(page);
      await press(page, "Enter");
      check((await out(page, "palette-ran")) === "inbox" && (await out(page, "palette")) === "false" && (await active(page)) === "pal-open", "composition: Enter runs the item, the dialog closes, focus returns", await active(page));
      await press(page, "Enter");
      await press(page, "Escape");
      check((await out(page, "palette")) === "false" && (await active(page)) === "pal-open", "composition: Escape closes the command dialog, focus returns", await active(page));

      // every listbox open at once: the generated ids never collide, and every reference resolves
      await focus(page, "#sel-trigger");
      await press(page, "Enter");
      const sel = await idHygiene(page);
      await press(page, "Escape");
      await focus(page, "#ms-input");
      await press(page, "ArrowDown");
      const ms = await idHygiene(page);
      await press(page, "Escape");
      await focus(page, "#ms2-input");
      await press(page, "ArrowDown");
      const ms2 = await idHygiene(page);
      await press(page, "Escape");
      await focus(page, "#cb-trigger");
      await press(page, "Enter");
      const cb = await idHygiene(page);
      await press(page, "Escape");
      const bad = [sel, ms, ms2, cb].flatMap((r) => [...r.dups, ...r.broken]);
      check(bad.length === 0, "composition: with each listbox open, no id is used twice and every id reference resolves", [...new Set(bad)].join(", "));
      // reopen: no stale ids, the active descendant is a live option
      await focus(page, "#ms-input");
      await press(page, "ArrowDown");
      await press(page, "Escape");
      await press(page, "ArrowDown");
      const v = await descendantValid(page, "#ms-input");
      check(v.ok && v.id !== null, "composition: closed and reopened, the active descendant is a live option, not a stale id", v.ok ? String(v.id) : `${v.id}: ${v.why}`);
    } catch (err) {
      check(false, "listbox compositions: ran to completion", String(err.message).split("\n")[0]);
    }
    await context.close();
  }
  async function t2(locator, label) {
    check((await locator.count()) === 1, label);
  }

  report.push(`\naccessibility — every menu and listbox open, under axe (light and dark), visible focus and forced colours`);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, colorScheme: theme, reducedMotion: "reduce" });
    const cases = [...OPENED.map((c) => ({ ...c, fixture: c.fixture ?? "collections" })), ...DEMOS.map((d) => ({ name: `usage ${d.demo}`, fixture: "usage", demo: d.demo, open: d.open }))];
    for (const c of cases) {
      const page = await open(context, c.fixture, { theme, demo: c.demo });
      try {
        await c.open(page);
        // a menu or a listbox popup open in the top layer, or (a command) a listbox on the page with a search field driving it
        const opened = await page.evaluate(() => [...document.querySelectorAll('[role="menu"]:popover-open, [role="listbox"], .kx-command__list, .kx-navigation-menu__content:popover-open')].filter((el) => el.checkVisibility()).length);
        const violations = (await axe(page)).flatMap((v) => v.targets.map((target) => `${v.id} ${target}`));
        check(opened > 0 && violations.length === 0, `axe ${theme} ${c.name} (${opened} surface${opened === 1 ? "" : "s"} open)`, opened ? violations.join("; ") : "nothing opened");
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
      const navMissing = [];
      for (const id of ["nm-products", "nm-resources", "nm-pricing"]) {
        await focus(page, `#${id}`);
        if (!(await outlined(`#${id}`))) navMissing.push(id);
      }
      await press(page, "Escape");
      await focus(page, "#nm-products");
      await press(page, "Enter");
      await press(page, "Tab");
      if (!(await outlined("#nm-analytics"))) navMissing.push("nm-analytics");
      if (!(await outlined("#nm-products"))) navMissing.push("nm-products (open)");
      check(navMissing.length === 0, "forced colours: every navigation trigger and link with focus, and the open trigger, keeps an outline", navMissing.join(", "));
    } catch (err) {
      check(false, "forced colours: ran to completion", String(err.message).split("\n")[0]);
    }
    await context.close();
  }
  // Visible focus in the listboxes: a keyboard highlight draws a ring, a pointer highlight does not, and
  // the chosen option's mark is a shape that does not depend on the highlight.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
    const page = await open(context, "listboxes");
    const shadow = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).boxShadow);
    try {
      for (const [field, keyboardOpt, pointerOpt, how] of [["#sel-trigger", "#sel-apple", "#sel-banana", "ArrowDown"], ["#ms-input", null, null, "ArrowDown"]]) {
        await focus(page, field);
        await press(page, how);
        const kb = keyboardOpt ?? `[id="${await descendant(page, field)}"]`;
        const keyboard = await shadow(kb);
        const list = await listboxOf(page, field);
        const ptr = pointerOpt ?? `${list} [role="option"]:nth-of-type(3)`;
        await page.locator(ptr).hover();
        await idle(page);
        const pointer = await shadow(ptr);
        check(keyboard !== "none" && pointer === "none", `visible focus: in ${field.slice(1)}'s listbox a keyboard highlight draws a ring, a pointer highlight does not`, `keyboard ${keyboard}; pointer ${pointer}`);
        await press(page, "Escape");
      }
      await focus(page, "#sel-trigger");
      check((await shadow("#sel-trigger")) !== "none", "visible focus: the select trigger draws a focus ring");
      await focus(page, "#ms-input");
      check((await shadow("#ms .kx-multi-select__field")) !== "none", "visible focus: the multi-select field draws a focus ring while its input has focus");
      await focus(page, "#cmd-input");
      check((await shadow("#cmd-input")) !== "none", "visible focus: the command's search field draws its focus rule");
    } catch (err) {
      check(false, "listbox visible focus: ran to completion", String(err.message).split("\n")[0]);
    }
    await context.close();
  }

  // Forced colours in the listboxes: the field with focus and the highlighted option keep an outline.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, forcedColors: "active", reducedMotion: "reduce" });
    const page = await open(context, "listboxes");
    const outlined = (sel) => page.locator(sel).first().evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0; });
    try {
      const missing = [];
      await focus(page, "#sel-trigger");
      if (!(await outlined("#sel-trigger"))) missing.push("select trigger");
      await press(page, "ArrowDown");
      for (let i = 0; i < 4; i++) {
        const id = await descendant(page, "#sel-trigger");
        if (!(await outlined(`[id="${id}"]`))) missing.push(id);
        await press(page, "ArrowDown");
      }
      await page.locator("#sel-banana").hover();
      await idle(page);
      if (!(await outlined("#sel-banana"))) missing.push("sel-banana (pointer)");
      await press(page, "Escape");
      await focus(page, "#ms-input");
      if (!(await outlined("#ms .kx-multi-select__field"))) missing.push("multi-select field");
      await press(page, "ArrowDown");
      const msOpt = await descendant(page, "#ms-input");
      if (!(await outlined(`[id="${msOpt}"]`))) missing.push(msOpt);
      await press(page, "Escape");
      await focus(page, "#cmd-input");
      if (!(await outlined("#cmd-input"))) missing.push("command search field");
      const cmdOpt = await descendant(page, "#cmd-input");
      if (!(await outlined(`[id="${cmdOpt}"]`))) missing.push(cmdOpt);
      check(missing.length === 0, "forced colours: every listbox field with focus and every highlighted option keeps an outline", missing.join(", "));
    } catch (err) {
      check(false, "listbox forced colours: ran to completion", String(err.message).split("\n")[0]);
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
 *
 * The listboxes, in the same four cases (src/fixtures/listboxes.ts):
 *
 *   KxSelect        the listbox's inline-start edge lines up with the trigger's; the value sits at the trigger's
 *                   inline start and the chevron at its inline end; the check mark sits at an option's inline
 *                   start; and the keys do not flip — ArrowDown still moves down
 *   KxCommand       an item's shortcut sits at its inline end, its text at its inline start
 *   KxCombobox      the recipe's popover lines up with its button's inline-start edge
 *   KxMultiSelect   the chips run in reading order from the field's inline start, the input after them; the
 *                   listbox lines up with the field's inline-start edge; the check mark sits at an option's
 *                   inline start
 *
 * The navigation menu, in the same four cases:
 *
 *   KxNavigationMenu  the triggers run in reading order; the inline-end arrow (ArrowRight in LTR, ArrowLeft in
 *                   RTL) moves to the next stop and the other arrow back; the chevron sits at each trigger's
 *                   inline end; the panel lines up with the navigation's inline-start edge; the indicator sits
 *                   under the open trigger; the panel's text resolves to the region's direction
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
  {
    component: "KxSelect",
    fixture: "listboxes",
    probe: "#sel-content",
    async run(page, dir, t) {
      const startEdge = (r) => (dir === "rtl" ? r.right : r.left);
      await focus(page, "#sel-trigger");
      await press(page, "ArrowDown");
      await settled(page);
      const tr = await rectOf(page, "#sel-trigger");
      const m = await rectOf(page, "#sel-content");
      t(Math.abs(startEdge(m) - startEdge(tr)) <= 1.5, "the listbox's inline-start edge lines up with the trigger's", `trigger ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, listbox ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      const chev = await rectOf(page, "#sel-trigger .kx-select__chevron");
      const val = await rectOf(page, "#sel-trigger .kx-select__value");
      t(towardEnd(dir, chev.left, val.left) > 0, "the value sits at the trigger's inline start, the chevron at its inline end", `value ${val.left.toFixed(0)}, chevron ${chev.left.toFixed(0)}`);
      await press(page, "ArrowDown");
      await press(page, "Enter");
      await press(page, "ArrowDown");
      const opt = await rectOf(page, "#sel-apricot");
      const mark = await rectOf(page, "#sel-apricot .kx-option__indicator");
      const atStart = dir === "rtl" ? opt.right - mark.right <= 12 : mark.left - opt.left <= 12;
      t(atStart, "the check mark sits at the option's inline start", `option ${opt.left.toFixed(0)}–${opt.right.toFixed(0)}, mark ${mark.left.toFixed(0)}–${mark.right.toFixed(0)}`);
      await press(page, "ArrowDown");
      t((await descendant(page, "#sel-trigger")) === "sel-banana", "ArrowDown still moves down", await descendant(page, "#sel-trigger"));
      await press(page, "Escape");
    },
  },
  {
    component: "KxCommand",
    fixture: "listboxes",
    probe: "#cmd-list",
    async run(page, dir, t) {
      const item = await rectOf(page, "#cmd-profile");
      const sc = await rectOf(page, "#cmd-profile kx-command-shortcut");
      const atEnd = dir === "rtl" ? sc.left - item.left <= 12 : item.right - sc.right <= 12;
      t(atEnd, "the shortcut sits at the item's inline end", `item ${item.left.toFixed(0)}–${item.right.toFixed(0)}, shortcut ${sc.left.toFixed(0)}–${sc.right.toFixed(0)}`);
    },
  },
  {
    component: "KxCombobox",
    fixture: "listboxes",
    probe: "#cb-list",
    async run(page, dir, t) {
      await focus(page, "#cb-trigger");
      await press(page, "Enter");
      await settled(page);
      const tr = await rectOf(page, "#cb-trigger");
      const m = await rectOf(page, "#cb-content");
      const aligned = dir === "rtl" ? Math.abs(m.right - tr.right) <= 1.5 : Math.abs(m.left - tr.left) <= 1.5;
      t(aligned, "the recipe's popover lines up with its button's inline-start edge", `button ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, popover ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      await press(page, "Escape");
    },
  },
  {
    component: "KxMultiSelect",
    fixture: "listboxes",
    probe: "#ms .kx-option-popup",
    async run(page, dir, t) {
      const chips = await page.locator("#ms .kx-multi-select__chip").evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().left));
      const input = await rectOf(page, "#ms-input");
      t(towardEnd(dir, chips[1], chips[0]) > 0 && towardEnd(dir, input.left, chips[1]) > 0, "the chips run in reading order, the input after them", `${chips.map((x) => x.toFixed(0)).join(", ")}, input ${input.left.toFixed(0)}`);
      await focus(page, "#ms-input");
      await press(page, "ArrowDown");
      await settled(page);
      const field = await rectOf(page, "#ms .kx-multi-select__field");
      const m = await rectOf(page, "#ms .kx-option-popup");
      const aligned = dir === "rtl" ? Math.abs(m.right - field.right) <= 1.5 : Math.abs(m.left - field.left) <= 1.5;
      t(aligned, "the listbox lines up with the field's inline-start edge", `field ${field.left.toFixed(0)}–${field.right.toFixed(0)}, listbox ${m.left.toFixed(0)}–${m.right.toFixed(0)}`);
      const opt = await page.locator("#ms .kx-option-popup [aria-selected='true']").first();
      const o = await opt.evaluate((el) => el.getBoundingClientRect().toJSON());
      const mk = await opt.locator(".kx-option__indicator").evaluate((el) => el.getBoundingClientRect().toJSON());
      const atStart = dir === "rtl" ? o.right - mk.right <= 12 : mk.left - o.left <= 12;
      t(atStart, "the check mark sits at the chosen option's inline start", `option ${o.left.toFixed(0)}–${o.right.toFixed(0)}, mark ${mk.left.toFixed(0)}–${mk.right.toFixed(0)}`);
      await press(page, "Escape");
    },
  },
  {
    component: "KxNavigationMenu",
    probe: "#nm-products-content",
    async run(page, dir, t) {
      const [next, back] = dir === "rtl" ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
      const [p, r] = [await rectOf(page, "#nm-products"), await rectOf(page, "#nm-resources")];
      t(towardEnd(dir, r.left, p.left) > 0, "the triggers run in reading order", `products ${p.left.toFixed(0)}, resources ${r.left.toFixed(0)}`);
      await focus(page, "#nm-products");
      await press(page, next);
      t((await active(page)) === "nm-resources", `${next} (the inline-end arrow) moves to the next stop`, await active(page));
      await press(page, back);
      t((await active(page)) === "nm-products", `${back} moves back`, await active(page));
      const [label, chev] = [await page.locator("#nm-products").evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el.firstChild); return range.getBoundingClientRect().toJSON(); }), await rectOf(page, "#nm-products .kx-navigation-menu__chevron")];
      t(towardEnd(dir, chev.left, label.left) > 0, "the chevron sits at the trigger's inline end", `label ${label.left.toFixed(0)}, chevron ${chev.left.toFixed(0)}`);
      await press(page, "Enter");
      await settled(page);
      const [navR, panel, trig, ind] = [await rectOf(page, "#nm"), await rectOf(page, "#nm-products-content"), await rectOf(page, "#nm-products"), await rectOf(page, "#nm-indicator")];
      const aligned = dir === "rtl" ? Math.abs(panel.right - navR.right) <= 1.5 : Math.abs(panel.left - navR.left) <= 1.5;
      t(aligned, "the panel lines up with the navigation's inline-start edge", `nav ${navR.left.toFixed(0)}–${navR.right.toFixed(0)}, panel ${panel.left.toFixed(0)}–${panel.right.toFixed(0)}`);
      t(Math.abs(centre(ind).x - centre(trig).x) <= 1.5, "the indicator sits under the open trigger", `trigger ${centre(trig).x.toFixed(0)}, indicator ${centre(ind).x.toFixed(0)}`);
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
  report.push(`\nrtl — ${RTL.length} menus and listboxes in ${DIRECTION_CASES.length} direction cases`);
  for (const c of DIRECTION_CASES) {
    const want = c.region ?? c.page;
    const label = c.region ? `${c.region} region in an ${c.page} page` : `${c.page} page`;
    for (const subject of RTL) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
      const page = await open(context, subject.fixture, { dir: c.page, region: c.region });
      const name = `${subject.component} (${label})`;
      try {
        const resolved = await page.locator("#region").evaluate((el) => getComputedStyle(el).direction);
        const menuDir = await page.locator(subject.probe ?? "#dd-content").first().evaluate((el) => getComputedStyle(el).direction);
        check(resolved === want && menuDir === want, `${name}: the region and its ${subject.probe ? "listbox" : "menus"} resolve to ${want}`, `${resolved}, surface ${menuDir}`);
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
 *
 * The listboxes, at the same 2x, 1024px and 390px: opened from the keyboard, the listbox stays inside the
 * viewport, scrolls inside itself when it is taller than the room (the arrows reach its last option and it is
 * then in view), cuts nothing off sideways, grows its text and keeps every option a 24px target; it is still
 * operable (Escape closes it, focus on its field).
 *
 *   KxSelect        the trigger, its long value wrapped rather than cut; the listbox with its longest option
 *   KxCommand       the inline list (no popup): text grows, nothing is cut, every item is a 24px target
 *   KxCombobox      the recipe's popover with its search field and list
 *   KxMultiSelect   with every enabled option chosen (a long selection): the chips wrap inside the field, every
 *                   remove button is a 24px target, and the field never pushes the page sideways
 *
 *   KxNavigationMenu  the triggers wrap rather than overflow at 390px and stay 24px targets; a panel opened from
 *                   the keyboard stays inside the viewport, cuts nothing off sideways, grows its text and keeps
 *                   its links 24px targets; Escape closes it and focus returns to its trigger
 * ════════════════════════════════════════════════════════════════════════════ */
const LARGE = [
  { component: "KxDropdownMenu", trigger: "#dd-trigger", keys: ["Enter"], surface: "#dd-content", sub: { keys: ["s", "ArrowRight"], surface: "#dd-sub-content" } },
  { component: "KxContextMenu", trigger: "#ctx-region", keys: ["Shift+F10"], surface: "#ctx-content", sub: { keys: ["End", "ArrowUp", "ArrowRight"], surface: "#ctx-sub-content" } },
  { component: "KxMenubar", trigger: "#mb-file", keys: ["Enter"], surface: "#mb-file-content", sub: { keys: ["s", "ArrowRight"], surface: "#mb-share-content" } },
  { component: "KxSelect", fixture: "listboxes", field: "#sel-trigger", keys: ["ArrowDown"], surface: "#sel-content", items: ".kx-option" },
  { component: "KxCommand", fixture: "listboxes", field: "#cmd-input", keys: [], surface: "#cmd-list", items: ".kx-option", inline: true },
  { component: "KxCombobox", fixture: "listboxes", field: "#cb-trigger", keys: ["Enter"], surface: "#cb-content", items: ".kx-option", focusAfter: "cb-input" },
  { component: "KxMultiSelect", fixture: "listboxes", field: "#ms-input", keys: ["ArrowDown"], surface: "#ms .kx-option-popup", items: ".kx-option", long: true },
  { component: "KxNavigationMenu", navigation: true, trigger: "#nm-products", surface: "#nm-products-content" },
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
  report.push(`\nlargeText — ${LARGE.length} menus and listboxes open at ${SCALE}x the root font size, 1024px and 390px`);
  for (const s of LARGE.filter((x) => !x.fixture && !x.navigation)) {
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
  // The listboxes: focus stays on the field, so "reaching the last option" is the active descendant's, not focus.
  const measureList = (page, surface, items) =>
    page.evaluate(({ surface, items }) => {
      const el = document.querySelector(surface);
      const r = el.getBoundingClientRect();
      const opts = [...el.querySelectorAll(items)].filter((i) => !i.hidden && i.checkVisibility());
      const scroller = el.matches('[role="listbox"]') ? el : (el.querySelector('[role="listbox"]') ?? el);
      return {
        rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        vw: document.documentElement.clientWidth,
        vh: innerHeight,
        sideways: Math.max(el.scrollWidth - el.clientWidth, scroller.scrollWidth - scroller.clientWidth),
        scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
        overflowY: getComputedStyle(scroller).overflowY,
        fontSize: parseFloat(getComputedStyle(opts[0]).fontSize),
        small: opts.filter((i) => Math.min(i.getBoundingClientRect().width, i.getBoundingClientRect().height) < 24).map((i) => i.id || i.textContent.trim()),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, { surface, items });
  /** Wait until a surface's box stops moving: placement re-runs when its size changes (a ResizeObserver). */
  const restOf = (page, surface) =>
    page.evaluate(
      (surface) =>
        new Promise((resolve) => {
          let last = "";
          let frames = 0;
          const tick = () => {
            const r = document.querySelector(surface).getBoundingClientRect();
            const now = [r.left, r.top, r.right, r.bottom].map(Math.round).join();
            if ((now === last && frames > 2) || frames > 30) return resolve(frames);
            last = now;
            frames++;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      surface,
    );
  for (const s of LARGE.filter((x) => x.fixture === "listboxes")) {
    for (const viewport of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await open(context, "listboxes");
      const name = `${s.component} @${viewport.width}px`;
      try {
        const openIt = async () => {
          await focus(page, s.field);
          // the larger text moved the field: bring it back into view, as a reader scrolling to it would
          await page.locator(s.field).scrollIntoViewIfNeeded();
          for (const k of s.keys) await press(page, k);
          await settled(page);
        };
        await openIt();
        const before = (await measureList(page, s.surface, s.items)).fontSize;
        if (!s.inline) await press(page, "Escape");
        await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
        await idle(page);
        if (s.long) {
          // a long selection: every enabled option chosen
          await focus(page, s.field);
          await press(page, "ArrowDown");
          for (let i = 0; i < 6; i++) {
            const id = await descendant(page, s.field);
            if ((await page.locator(`[id="${id}"]`).getAttribute("aria-selected")) === "false") await press(page, "Enter");
            await press(page, "ArrowDown");
          }
          await press(page, "Escape");
          const f = await page.locator("#ms .kx-multi-select__field").evaluate((el) => {
            const r = el.getBoundingClientRect();
            const chips = [...el.querySelectorAll(".kx-multi-select__chip")];
            const rows = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top))).size;
            const smallRemove = [...el.querySelectorAll(".kx-tag__remove")].filter((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height) < 24).map((b) => b.getAttribute("aria-label"));
            const outside = chips.filter((c) => c.getBoundingClientRect().right > r.right + 0.5 || c.getBoundingClientRect().left < r.left - 0.5).length;
            return { chips: chips.length, rows, smallRemove, outside, right: r.right, vw: document.documentElement.clientWidth, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          check(f.chips === 5 && f.outside === 0 && f.right <= f.vw + 0.5, `${name}: a long selection (${f.chips} chips) wraps inside the field`, `${f.rows} rows, ${f.outside} outside, field right ${f.right.toFixed(0)} of ${f.vw}`);
          check(f.smallRemove.length === 0, `${name}: every chip's remove button is at least a 24px target`, f.smallRemove.join(", "));
          check(f.pageOverflow <= 0, `${name}: the long selection never pushes the page sideways`, `${f.pageOverflow}px`);
        }
        await openIt();
        const frames = await restOf(page, s.surface);
        const m = await measureList(page, s.surface, s.items);
        if (process.env.KX_VERBOSE) console.log(`  ${name}: placement came to rest after ${frames} frame(s)`);
        if (!s.inline) {
          const inside = m.rect.left >= 7.5 && m.rect.right <= m.vw - 7.5 && m.rect.top >= 7.5 && m.rect.bottom <= m.vh - 7.5;
          check(inside, `${name}: the listbox stays inside the viewport at ${SCALE}x`, `${m.rect.left.toFixed(0)},${m.rect.top.toFixed(0)}–${m.rect.right.toFixed(0)},${m.rect.bottom.toFixed(0)} in ${m.vw}x${m.vh}`);
        }
        check(m.sideways <= 1, `${name}: nothing in the listbox is cut off sideways`, `${m.sideways}px`);
        check(m.fontSize >= before * 1.8, `${name}: the options' text grows with the reader's`, `${before}px -> ${m.fontSize}px`);
        check(m.small.length === 0, `${name}: every option is at least a 24px target`, m.small.join(", "));
        if (m.scrolls) {
          const owner = s.focusAfter ? `#${s.focusAfter}` : s.field;
          for (let i = 0; i < 14; i++) await press(page, "ArrowDown");
          const last = await page.evaluate(({ owner, surface }) => {
            const el = document.querySelector(surface);
            const scroller = el.matches('[role="listbox"]') ? el : el.querySelector('[role="listbox"]');
            const a = document.getElementById(document.querySelector(owner).getAttribute("aria-activedescendant") ?? "");
            const visible = [...scroller.querySelectorAll('[role="option"]')].filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
            if (!a) return { inside: false, last: false };
            const ar = a.getBoundingClientRect();
            const r = scroller.getBoundingClientRect();
            return { inside: ar.top >= r.top - 0.5 && ar.bottom <= r.bottom + 0.5, last: a === visible.at(-1) };
          }, { owner, surface: s.surface });
          check(m.overflowY === "auto" && last.inside && last.last, `${name}: the listbox is taller than the room, so it scrolls inside itself; the arrows reach its last option, in view`, `${m.overflowY} ${JSON.stringify(last)}`);
        }
        check(m.pageOverflow <= 0, `${name}: no horizontal page overflow with the listbox open`, `${m.pageOverflow}px`);
        if (!s.inline) {
          await press(page, "Escape");
          check(!(await showing(page, s.surface)) && (await page.locator(s.field).evaluate((el) => el === document.activeElement)), `${name}: still operable — Escape closes it, focus on its field`, await active(page));
        } else {
          await page.keyboard.type("bil");
          await idle(page);
          check((await descendant(page, s.field)) === "cmd-billing", `${name}: still operable — typing filters and moves the active descendant`, String(await descendant(page, s.field)));
        }
        if (s.component === "KxSelect") {
          await focus(page, s.field);
          await press(page, "Enter");
          await press(page, "End");
          await press(page, "ArrowUp");
          await press(page, "Enter");
          const t = await page.locator(s.field).evaluate((el) => ({ sideways: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right, vw: document.documentElement.clientWidth, text: el.textContent.trim() }));
          check(t.sideways <= 1 && t.right <= t.vw + 0.5 && t.text.startsWith("Dragon fruit"), `${name}: a long chosen value wraps inside the trigger rather than being cut`, `${t.sideways}px, right ${t.right.toFixed(0)} of ${t.vw}`);
        }
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
  for (const s of LARGE.filter((x) => x.navigation)) {
    for (const viewport of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await open(context);
      const name = `${s.component} @${viewport.width}px`;
      try {
        const size = () => page.locator(`${s.surface} a`).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        await focus(page, s.trigger);
        await press(page, "Enter");
        const before = await size();
        await press(page, "Escape");
        await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
        await idle(page);
        const bar = await page.evaluate(() => {
          const stops = [...document.querySelectorAll("#nm .kx-navigation-menu__trigger, #nm .kx-navigation-menu__link--top")];
          const vw = document.documentElement.clientWidth;
          return { out: stops.filter((el) => el.getBoundingClientRect().right > vw + 0.5 || el.getBoundingClientRect().left < -0.5).map((el) => el.id), small: stops.filter((el) => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height) < 24).map((el) => el.id) };
        });
        check(bar.out.length === 0 && bar.small.length === 0, `${name}: the triggers stay inside the viewport and are 24px targets`, [...bar.out, ...bar.small].join(", "));
        await focus(page, s.trigger);
        await press(page, "Enter");
        await settled(page);
        const m = await page.evaluate((surface) => {
          const el = document.querySelector(surface);
          const r = el.getBoundingClientRect();
          const links = [...el.querySelectorAll("a")];
          return {
            rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
            vw: document.documentElement.clientWidth,
            vh: innerHeight,
            sideways: el.scrollWidth - el.clientWidth,
            small: links.filter((a) => Math.min(a.getBoundingClientRect().width, a.getBoundingClientRect().height) < 24).map((a) => a.id),
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        }, s.surface);
        const inside = m.rect.left >= 7.5 && m.rect.right <= m.vw - 7.5 && m.rect.top >= 7.5 && m.rect.bottom <= m.vh - 7.5;
        check(inside, `${name}: the panel stays inside the viewport at ${SCALE}x`, `${m.rect.left.toFixed(0)},${m.rect.top.toFixed(0)}–${m.rect.right.toFixed(0)},${m.rect.bottom.toFixed(0)} in ${m.vw}x${m.vh}`);
        check(m.sideways <= 1, `${name}: nothing in the panel is cut off sideways`, `${m.sideways}px`);
        const after = await size();
        check(after >= before * 1.8, `${name}: the panel's text grows with the reader's`, `${before}px -> ${after}px`);
        check(m.small.length === 0, `${name}: every link in the panel is at least a 24px target`, m.small.join(", "));
        check(m.pageOverflow <= 0, `${name}: no horizontal page overflow`, `${m.pageOverflow}px`);
        await press(page, "Escape");
        check(!(await showing(page, s.surface)) && (await active(page)) === s.trigger.slice(1), `${name}: still operable — Escape closes it, focus back on its trigger`, await active(page));
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await open(context, "listboxes");
    await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
    await idle(page);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflowX <= 0, `the whole listboxes page fits 390px at ${SCALE}x text`, `${overflowX}px`);
    await context.close();
  }
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
 *
 * The listboxes' popups float on the same surface and move the same way, measured the same way:
 *
 *   KxSelect        opened by pressing its trigger
 *   KxMultiSelect   opened by pressing its field
 *
 * And the navigation menu's panel, which floats on the same surface:
 *
 *   KxNavigationMenu  opened by pressing its trigger
 * ════════════════════════════════════════════════════════════════════════════ */
const MOTION = [
  { component: "KxDropdownMenu", control: "#dd-trigger", target: "#dd-content", how: "click" },
  { component: "KxContextMenu", control: "#ctx-region", target: "#ctx-content", how: "contextmenu" },
  { component: "KxMenubar", control: "#mb-file", target: "#mb-file-content", how: "click" },
  { component: "KxSelect", fixture: "listboxes", control: "#sel-trigger", target: "#sel-content", how: "click" },
  { component: "KxMultiSelect", fixture: "listboxes", control: "#ms-input", target: "#ms .kx-option-popup", how: "click" },
  { component: "KxNavigationMenu", control: "#nm-products", target: "#nm-products-content", how: "click" },
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
  report.push(`\nreducedMotion — ${MOTION.length} menus and listbox popups, open and close, LTR and RTL, normal and reduced`);
  for (const s of MOTION) {
    for (const dir of ["ltr", "rtl"]) {
      let openEnd = null;
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, s.fixture, { dir });
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
