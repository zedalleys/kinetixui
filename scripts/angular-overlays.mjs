/**
 * angular-overlays.mjs — @kinetixui/angular's overlay family, live in real Chromium.
 *
 *   pnpm build:tokens && node scripts/angular-overlays.mjs
 *   node scripts/angular-overlays.mjs --only=interaction      one pass (interaction | rtl | largeText | reducedMotion)
 *
 * The dialog family (dialog, alert dialog, modal, sheet, drawer) and the floating family (popover, tooltip,
 * hover card) stand on one layer (packages/ui-angular/src/lib/overlay.ts): the browser's top layer, a stack
 * that routes Escape and outside presses, focus that goes in, stays and comes back, and a page scroll lock
 * derived from the stack. Most of what can go wrong with an overlay is a property of that layer seen through
 * two surfaces at once — Escape closing the wrong one, a press inside a nested popover reading as a press
 * outside its dialog, the page scrolling again while a modal is still open — so the subjects here are driven
 * alone AND nested, the way an application nests them (src/fixtures/overlays.ts).
 *
 * The conventions are scripts/angular-browser.mjs's, and its rules hold: each pass is a marked passage
 * (`kx-verify: <kind>`, read by gen-verification.mjs), the components a passage claims are the KinetixUI
 * symbols named in it, and `assertClaims()` fails the run before a browser opens if a passage names a
 * component it does not measure or measures one it does not name. It is a file of its own because the overlay
 * evidence is about one shared layer and reads best in one place; angular-browser.mjs still mounts every
 * overlay usage example under axe with the rest of the catalogue.
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
  if (start === -1) throw new Error(`angular-overlays: no kx-verify: ${kind} passage`);
  const next = self.indexOf("kx-verify:", start + 12);
  return self.slice(start, next === -1 ? undefined : next);
}
const slugOf = (symbol) => {
  const hit = [...coveredSlugs(symbol, "Angular")];
  if (hit.length !== 1) throw new Error(`angular-overlays: ${symbol} does not name exactly one component (${hit.join(", ") || "none"})`);
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
      `angular-overlays: the ${kind} claim and its subjects disagree\n` +
        (over.length ? `  named but not measured: ${over.join(", ")}\n` : "") +
        (under.length ? `  measured but not named: ${under.join(", ")}\n` : "") +
        (unimplemented.length ? `  measured but not an Angular implementation in the manifest: ${unimplemented.join(", ")}\n` : ""),
    );
    process.exit(1);
  }
}

/* ── the page ────────────────────────────────────────────────────────────── */

const harnessDir = buildAngularHarness("angular-overlays");
const server = await serveStatic(harnessDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(78)} ${detail}`);
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  return ok;
};

async function open(context, fixture = "overlays", { theme = "light", dir = null, demo = null } = {}) {
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  const q = new URLSearchParams({ fixture, theme, ...(dir ? { dir } : {}), ...(demo ? { demo } : {}) });
  await page.goto(`${server.base}/index.html?${q}`, { waitUntil: "load" });
  await waitForAngular(page);
  return page;
}
const settle = (page) => settleAngular(page);
/** Let Angular render, then the browser paint, so the DOM read next is what the reader would see. */
async function idle(page) {
  await settle(page);
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
async function click(page, selector) {
  await page.locator(selector).first().click();
  await idle(page);
}
/** A press at a viewport point — on a modal's backdrop, or on the page beside a floating surface. */
async function pressAt(page, x, y) {
  await page.mouse.click(x, y);
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
/** Whether a surface is showing: a modal `<dialog>` open in the top layer, or a popover shown. */
const showing = (page, selector) =>
  page.locator(selector).first().evaluate((el) => (el.tagName === "DIALOG" ? el.open && el.matches(":modal") : el.matches(":popover-open")));
const locked = (page) => page.evaluate(() => document.documentElement.hasAttribute("data-kx-scroll-locked") && getComputedStyle(document.documentElement).overflow === "hidden");
const rectOf = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
const viewportOf = (page) => page.evaluate(() => ({ width: document.documentElement.clientWidth, height: innerHeight }));
/** Where focus can go by Tab, walked from the current position: the ids it visits, in order. */
async function tabWalk(page, n, shift = false) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await press(page, shift ? "Shift+Tab" : "Tab");
    seen.push(await active(page));
  }
  return seen;
}
/** The accessible description, assembled from aria-describedby the way assistive technology reads it. */
const description = (page, selector) =>
  page.locator(selector).first().evaluate((el) =>
    (el.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? `<missing #${id}>`)
      .join(" | "),
  );

async function axe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // angular-browser.mjs's rule set: everything on except the three whole-page landmark and heading rules,
    // which a fixture showing one component does not have.
    const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
    const r = await window.axe.run(document, opts);
    return r.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => String(n.target)) }));
  });
}

/**
 * The document listeners the stack owns, counted through the DevTools protocol (what is really registered,
 * not what the code says it registers): `keydown`, `pointerdown` and `focusin` on `document`.
 */
async function documentListeners(page) {
  const cdp = await page.context().newCDPSession(page);
  const { result } = await cdp.send("Runtime.evaluate", { expression: "document" });
  const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
  await cdp.detach();
  const count = {};
  for (const l of listeners) if (["keydown", "pointerdown", "focusin"].includes(l.type)) count[l.type] = (count[l.type] ?? 0) + 1;
  return count;
}
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);
/** Every running animation finished (one cancelled by a state change counts as finished too). */
const settled = (page) => page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
/**
 * Centred on its trigger, or — when centring would cross the viewport's 8px inset — shifted just far enough to
 * stay inside it, and still over the trigger.
 */
const centredOrShifted = (tip, tr, vw) =>
  Math.abs((tip.left + tip.right) / 2 - (tr.left + tr.right) / 2) <= 1 ||
  ((Math.abs(tip.left - 8) <= 1 || Math.abs(tip.right - (vw - 8)) <= 1) && tip.left <= (tr.left + tr.right) / 2 && tip.right >= (tr.left + tr.right) / 2);

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: interaction, accessibility
 *
 * Every overlay driven with a real keyboard and pointer, alone and nested, read back from the semantics it
 * renders (role, name, description, modality, focus) and from the application model it is bound to.
 *
 *   KxDialog       named by its title and described; opens in the top layer as a modal (the page behind is
 *                  inert); first focus in the content, not on the X; Tab held inside; Escape, the backdrop,
 *                  Cancel and the X each close it and return focus, to the trigger or to the control that
 *                  opened it programmatically; the page does not scroll while it is open; the stack's document
 *                  listeners exist only while something is open. Nested: dialog → popover → tooltip (one Escape
 *                  closes one layer, top first, focus walking back down), a press in the dialog closes only the
 *                  popover and a press in the popover closes nothing, dialog → tooltip, dialog → dialog (the
 *                  inner closes alone, the page stays locked until the outer closes; when the inner trigger is
 *                  removed as it closes, focus goes back to the outer dialog, not the page), and closing the
 *                  dialog closes what is nested in it
 *   KxAlertDialog  `role="alertdialog"`, named and described; first focus Cancel, never the destructive
 *                  action; the backdrop does not dismiss; Escape cancels; no X; Tab cycles Cancel and the
 *                  action. Focus restoration when the trigger is gone: to `returnFocus`, and when there is no
 *                  valid target at all, nowhere (never to a removed element)
 *   KxModal        a dialog with React's fixed layout; first focus Cancel; `action` and `cancel` fire only from
 *                  their buttons; Escape closes with neither; Info's single action takes first focus; the
 *                  `title` input leaves no native tooltip on the host
 *   KxSheet        each of four sides attached to its edge; named; focus in and back; backdrop and Escape
 *                  close it; sheet → popover nests like the dialog
 *   KxDrawer       attached to the bottom edge, full width; first focus the panel; Tab into its content;
 *                  closes and returns focus
 *   KxPopover      a non-modal dialog: trigger semantics (`aria-haspopup`, `aria-expanded`, `aria-controls`),
 *                  named; the page is not inert and not locked; focus moves in; Tab out closes it; Escape and
 *                  the close control return focus to the trigger; a press outside closes it without pulling
 *                  focus back; placed against its trigger, flipped at a viewport edge, against an anchor when
 *                  it has one, out of an overflow-clipped and transformed container, and following its trigger
 *                  through a scrolling container
 *   KxTooltip      the trigger's description from the start (closed included), `role="tooltip"`; keyboard
 *                  focus opens it at once and blur closes it; Escape closes it with focus left on the trigger;
 *                  hover opens it after its delay, and the pointer can move onto it; never a Tab stop; a touch
 *                  pointer does not open it; a trigger's own description is kept
 *   KxHoverCard    no role and no description on the trigger (it is a preview, not a label); keyboard focus
 *                  opens it, Tab walks into its link and on out (closing it); Escape closes it; hover with
 *                  intent opens it and the pointer can travel onto it; the trigger is still a link
 *
 * Then axe, light and dark, on every surface OPEN (the accessibility pass in angular-browser.mjs reads them
 * closed), on the overlay usage examples opened, and on the compositions; and forced colours: every focus
 * stop inside an open surface keeps an outline, and every surface keeps a visible edge.
 * ════════════════════════════════════════════════════════════════════════════ */
const BEHAVIOUR = [
  {
    component: "KxDialog",
    async run(page, t) {
      const trigger = page.locator("#dlg-trigger");
      t((await trigger.getAttribute("aria-haspopup")) === "dialog" && (await trigger.getAttribute("aria-expanded")) === "false", "the trigger says it opens a dialog, and that it is closed");
      t((await trigger.getAttribute("aria-controls")) === "dlg-content", "the trigger controls the surface", await trigger.getAttribute("aria-controls"));
      t((await page.getByRole("dialog").count()) === 0, "closed, nothing is exposed as a dialog");
      const before = await documentListeners(page);
      // the page really scrolls before anything opens
      await page.mouse.move(600, 400);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(100);
      t((await page.evaluate(() => scrollY)) > 0, "the page scrolls before a dialog opens", `scrollY ${await page.evaluate(() => scrollY)}`);
      await page.evaluate(() => scrollTo(0, 0));

      await focus(page, "#dlg-trigger");
      await press(page, "Enter");
      t(await showing(page, "#dlg-content"), "Enter opens it, modal, in the top layer");
      t((await page.getByRole("dialog", { name: "Edit profile" }).count()) === 1, "named by its title");
      t((await description(page, "#dlg-content")) === "Changes are saved when you press Save.", "described by its description", await description(page, "#dlg-content"));
      t((await trigger.getAttribute("aria-expanded")) === "true" && (await out(page, "dialog")) === "true", "the trigger and the model say it is open");
      t((await active(page)) === "dlg-name", "first focus is the first field, not the close button", await active(page));
      t(await page.locator("#dlg-programmatic").evaluate((el) => el.matches(":not(:focus)") && !document.getElementById("dlg-content").contains(el)), "the page behind is outside the dialog");
      const during = await documentListeners(page);
      t(total(during) === total(before) + 3, "opening adds exactly the stack's three document listeners", `${JSON.stringify(before)} -> ${JSON.stringify(during)}`);

      // Tab held: walk more stops than the dialog has; nothing outside it is ever reached
      const walk = await tabWalk(page, 12);
      const inside = await page.evaluate((ids) => ids.map((id) => document.getElementById("dlg-content").contains(document.getElementById(id)) || id === "dlg-content"), walk);
      t(inside.every(Boolean), "Tab never leaves the dialog", walk.join(" > "));
      t(walk.indexOf("dlg-name") > walk.indexOf("dlg-save"), "Tab from the last stop (the close button) wraps to the first", walk.join(" > "));
      await focus(page, "#dlg-name");
      const back = await tabWalk(page, 1, true);
      t(await page.evaluate((id) => document.activeElement.matches(".kx-dialog__close") && document.getElementById("dlg-content").contains(document.activeElement), back[0]), "Shift+Tab from the first stop wraps to the last (the close button)", back[0]);

      // the page does not scroll under it
      await page.mouse.move(40, 760);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
      t((await page.evaluate(() => scrollY)) === 0 && (await locked(page)), "the page does not scroll while it is open", `scrollY ${await page.evaluate(() => scrollY)}`);

      await press(page, "Escape");
      t(!(await showing(page, "#dlg-content")) && (await out(page, "dialog")) === "false", "Escape closes it");
      t((await active(page)) === "dlg-trigger", "focus returns to the trigger", await active(page));
      t(!(await locked(page)), "the page scrolls again");
      const after = await documentListeners(page);
      t(total(after) === total(before), "closing removes every listener it added", `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);

      // the other ways out
      await press(page, "Enter");
      await pressAt(page, 6, 6);
      t(!(await showing(page, "#dlg-content")) && (await active(page)) === "dlg-trigger", "a press on the backdrop closes it, focus back on the trigger", await active(page));
      await press(page, "Enter");
      await click(page, "#dlg-cancel");
      t(!(await showing(page, "#dlg-content")) && (await active(page)) === "dlg-trigger", "Cancel (kxDialogClose) closes it, focus back on the trigger");
      await press(page, "Enter");
      const x = page.getByRole("button", { name: "Close", exact: true });
      t((await x.count()) === 1, "the close button is named Close");
      await x.click();
      await idle(page);
      t(!(await showing(page, "#dlg-content")) && (await active(page)) === "dlg-trigger", "the close button closes it, focus back on the trigger");
      await press(page, "Enter");
      await click(page, "#dlg-save");
      t((await out(page, "saves")) === "1" && !(await showing(page, "#dlg-content")), "an action that sets [(open)] false closes it");

      // opened from somewhere other than its trigger: focus goes back to where it was
      await focus(page, "#dlg-programmatic");
      await press(page, "Enter");
      t(await showing(page, "#dlg-content"), "setting [(open)] from elsewhere opens it");
      await press(page, "Escape");
      t((await active(page)) === "dlg-programmatic", "focus returns to the control that opened it, not the trigger", await active(page));

      // ── dialog → popover → tooltip ──
      await focus(page, "#dlg-trigger");
      await press(page, "Enter");
      await focus(page, "#dlg-pop-trigger");
      await press(page, "Enter");
      t(await showing(page, "#dlg-pop-content"), "nested: a popover opens inside the dialog");
      t((await active(page)) === "dlg-pop-input", "nested: focus moves into the popover", await active(page));
      t(await locked(page), "nested: the page stays locked with a popover on top of the modal");
      await press(page, "Tab");
      t((await active(page)) === "dlg-pop-tip-trigger" && (await showing(page, "#dlg-pop-tip")), "nested: keyboard focus opens a tooltip inside the popover", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#dlg-pop-tip")) && (await showing(page, "#dlg-pop-content")) && (await showing(page, "#dlg-content")), "nested: the first Escape closes only the tooltip");
      t((await active(page)) === "dlg-pop-tip-trigger", "nested: focus stays on the tooltip's trigger", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#dlg-pop-content")) && (await showing(page, "#dlg-content")), "nested: the second Escape closes only the popover");
      t((await active(page)) === "dlg-pop-trigger", "nested: focus returns to the popover's trigger, inside the dialog", await active(page));
      t(await locked(page), "nested: the page is still locked while the dialog remains");
      await press(page, "Escape");
      t(!(await showing(page, "#dlg-content")) && (await active(page)) === "dlg-trigger", "nested: the third Escape closes the dialog, focus on its trigger", await active(page));

      // presses: inside the popover closes nothing; inside the dialog but outside the popover closes the popover
      await press(page, "Enter");
      await click(page, "#dlg-pop-trigger");
      await click(page, "#dlg-pop-title");
      t((await showing(page, "#dlg-pop-content")) && (await showing(page, "#dlg-content")), "nested: a press inside the popover closes neither layer");
      const title = await rectOf(page, "#dlg-content .kx-dialog__title");
      await pressAt(page, title.left + 4, title.top + title.height / 2);
      t(!(await showing(page, "#dlg-pop-content")) && (await showing(page, "#dlg-content")), "nested: a press in the dialog outside the popover closes only the popover");
      // closing the dialog closes what is nested in it, whatever closed the dialog
      await click(page, "#dlg-pop-trigger");
      await page.locator("#dlg-save").evaluate((el) => el.click());
      await idle(page);
      t(!(await showing(page, "#dlg-content")) && !(await showing(page, "#dlg-pop-content")) && (await out(page, "dialog-popover")) === "false", "nested: closing the dialog closes the popover nested in it, and its model");

      // ── dialog → tooltip, by hover ──
      await click(page, "#dlg-trigger");
      await page.locator("#dlg-tip-trigger").hover();
      await page.waitForTimeout(450);
      await idle(page);
      t(await showing(page, "#dlg-tip"), "nested: hovering a control in the dialog opens its tooltip");
      await press(page, "Escape");
      t(!(await showing(page, "#dlg-tip")) && (await showing(page, "#dlg-content")), "nested: Escape closes the tooltip, not the dialog");
      await page.mouse.move(2, 2);

      // ── dialog → dialog ──
      await focus(page, "#dlg-inner-trigger");
      await press(page, "Enter");
      t((await showing(page, "#dlg-inner-content")) && (await active(page)) === "dlg-inner-input", "nested: a dialog opens over the dialog, focus in it", await active(page));
      t((await page.getByRole("dialog", { name: "Advanced settings" }).count()) === 1, "nested: the inner dialog is named by its own title");
      await press(page, "Escape");
      t(!(await showing(page, "#dlg-inner-content")) && (await showing(page, "#dlg-content")), "nested: Escape closes the inner dialog only");
      t((await active(page)) === "dlg-inner-trigger", "nested: focus returns to the inner trigger", await active(page));
      t(await locked(page), "nested: the page stays locked while the outer dialog is open");
      await press(page, "Enter");
      await pressAt(page, 6, 6);
      t(!(await showing(page, "#dlg-inner-content")) && (await showing(page, "#dlg-content")), "nested: a press on the backdrop closes the inner dialog only");
      await press(page, "Escape");
      t(!(await locked(page)) && !(await showing(page, "#dlg-content")), "nested: the page unlocks when the last modal closes");
      t(total(await documentListeners(page)) === total(before), "nothing left listening after every nested case", JSON.stringify(await documentListeners(page)));

      // ── dialog → dialog, the inner trigger removed as the inner dialog closes: focus stays in the outer dialog ──
      await click(page, "#dlg-trigger");
      await click(page, "#dlg-inner-trigger");
      await focus(page, "#dlg-inner-reset");
      await press(page, "Enter");
      t((await page.locator("#dlg-inner-trigger").count()) === 0 && !(await showing(page, "#dlg-inner-content")), "nested: the inner dialog closed and its trigger is gone");
      t(await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && document.getElementById("dlg-content").contains(a); }), "nested: focus goes back to the outer dialog when the inner trigger is gone", await active(page));
      await press(page, "Escape");
    },
  },
  {
    component: "KxAlertDialog",
    async run(page, t) {
      await focus(page, "#ad-trigger");
      await press(page, "Enter");
      t((await page.getByRole("alertdialog", { name: "Delete “Atlas”?" }).count()) === 1, "an alertdialog, named by its title");
      t((await description(page, "#ad-content")).startsWith("Its 214 files"), "described by its description");
      t((await active(page)) === "ad-cancel", "first focus is Cancel, not the destructive action", await active(page));
      t((await page.locator("#ad-content .kx-dialog__close").count()) === 0, "it has no close button: the two buttons are the answers");
      const walk = await tabWalk(page, 3);
      t(walk.join(",") === "ad-action,ad-cancel,ad-action", "Tab cycles Cancel and the action", walk.join(" > "));
      await pressAt(page, 6, 6);
      t(await showing(page, "#ad-content"), "a press on the backdrop does not dismiss it");
      await press(page, "Escape");
      t(!(await showing(page, "#ad-content")) && (await out(page, "answer")) === "", "Escape closes it without the action");
      t((await active(page)) === "ad-trigger", "focus returns to the trigger", await active(page));
      await press(page, "Enter");
      await click(page, "#ad-action");
      t((await out(page, "answer")) === "delete" && !(await showing(page, "#ad-content")), "the action runs and closes it");

      // the trigger is gone after the action: focus goes to returnFocus (the list), never to the removed button
      await focus(page, "#row-Backlog-delete");
      await press(page, "Enter");
      await focus(page, "#row-Backlog-confirm");
      await press(page, "Enter");
      t((await out(page, "rows")) === "Pipeline,Archive", "confirming removes the row and its trigger");
      t((await active(page)) === "rows", "focus goes to returnFocus when the trigger is gone", await active(page));
      // no valid target at all: focus is left alone, not sent to a detached element
      await focus(page, "#lost-trigger");
      await press(page, "Enter");
      await focus(page, "#lost-close");
      await press(page, "Enter");
      t((await page.locator("#lost-trigger").count()) === 0, "the trigger was removed as the dialog closed");
      t(await page.evaluate(() => document.activeElement === document.body || document.activeElement?.isConnected === true), "with no valid target, focus is not on a removed element", await active(page));
    },
  },
  {
    component: "KxModal",
    async run(page, t) {
      t((await page.locator("kx-modal#modal").getAttribute("title")) === null, "its title input leaves no native tooltip on the host");
      await focus(page, "#modal-trigger");
      await press(page, "Enter");
      t((await page.getByRole("dialog", { name: "Delete this view?" }).count()) === 1, "a dialog, named by its title");
      const scope = page.getByRole("dialog", { name: "Delete this view?" });
      t((await scope.getByRole("button", { name: "Cancel" }).evaluate((el) => el === document.activeElement)), "first focus is Cancel, not Delete");
      await press(page, "Escape");
      t((await out(page, "modal")) === "false" && (await out(page, "modal-action")) === "0" && (await out(page, "modal-cancel")) === "0", "Escape closes it with neither action nor cancel");
      t((await active(page)) === "modal-trigger", "focus returns to the trigger", await active(page));
      await press(page, "Enter");
      await scope.getByRole("button", { name: "Delete" }).click();
      await idle(page);
      t((await out(page, "modal-action")) === "1" && (await out(page, "modal")) === "false", "Delete emits action and closes");
      await press(page, "Enter");
      await scope.getByRole("button", { name: "Cancel" }).click();
      await idle(page);
      t((await out(page, "modal-cancel")) === "1" && (await out(page, "modal-action")) === "1", "Cancel emits cancel and closes");
      await focus(page, "#modal-info-trigger");
      await press(page, "Enter");
      const info = page.getByRole("dialog", { name: "Export started" });
      t((await info.getByRole("button").filter({ hasText: "Got it" }).evaluate((el) => el === document.activeElement)), "Info: its one action takes first focus");
      await press(page, "Escape");
    },
  },
  {
    component: "KxSheet",
    async run(page, t) {
      const vp = await viewportOf(page);
      const edges = { start: (r) => Math.abs(r.left) <= 1, end: (r) => Math.abs(r.right - vp.width) <= 1, top: (r) => Math.abs(r.top) <= 1, bottom: (r) => Math.abs(r.bottom - vp.height) <= 1 };
      for (const side of ["start", "end", "top", "bottom"]) {
        await focus(page, `#sheet-${side}-trigger`);
        await press(page, "Enter");
        const surface = `#sheet-${side} dialog`;
        await settled(page);
        const r = await rectOf(page, surface);
        t(edges[side](r), `${side}: attached to the ${side} edge (LTR page)`, `${r.left.toFixed(0)},${r.top.toFixed(0)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
        const full = side === "start" || side === "end" ? Math.abs(r.height - vp.height) <= 1 : Math.abs(r.width - vp.width) <= 1;
        t(full, `${side}: full length along its edge`);
        t((await page.getByRole("dialog", { name: "Filters" }).count()) === 1, `${side}: named by its title`);
        t((await active(page)) === `sheet-${side}-input`, `${side}: first focus is its first field`, await active(page));
        await press(page, "Escape");
        t(!(await showing(page, surface)) && (await active(page)) === `sheet-${side}-trigger`, `${side}: Escape closes it, focus back on the trigger`, await active(page));
      }
      // backdrop, and sheet → popover
      await focus(page, "#sheet-end-trigger");
      await press(page, "Enter");
      await focus(page, "#sheet-end-pop-trigger");
      await press(page, "Enter");
      const pop = "#sheet-end kx-popover-content";
      t((await showing(page, pop)) && (await active(page)) === "sheet-end-pop-input", "nested: a popover opens inside the sheet, focus in it", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, pop)) && (await showing(page, "#sheet-end dialog")), "nested: Escape closes only the popover");
      t((await active(page)) === "sheet-end-pop-trigger" && (await locked(page)), "nested: focus back on its trigger, the page still locked", await active(page));
      await press(page, "Enter");
      const sheet = await rectOf(page, "#sheet-end dialog");
      await pressAt(page, sheet.left + 30, sheet.bottom - 30);
      t(!(await showing(page, pop)) && (await showing(page, "#sheet-end dialog")), "nested: a press in the sheet outside the popover closes only the popover");
      await pressAt(page, 6, vp.height / 2);
      t(!(await showing(page, "#sheet-end dialog")) && !(await locked(page)), "a press on the backdrop closes the sheet and unlocks the page");
    },
  },
  {
    component: "KxDrawer",
    async run(page, t) {
      const vp = await viewportOf(page);
      await focus(page, "#drawer-trigger");
      await press(page, "Enter");
      await settled(page);
      const r = await rectOf(page, "#drawer-content");
      t(Math.abs(r.bottom - vp.height) <= 1 && Math.abs(r.width - vp.width) <= 1, "attached to the bottom edge, full width", `${r.left.toFixed(0)},${r.top.toFixed(0)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
      t((await page.getByRole("dialog", { name: "Share “Q3 report”" }).count()) === 1, "a dialog, named by its title");
      t((await active(page)) === "drawer-content", "first focus is the panel, so no keyboard rises over an unseen drawer", await active(page));
      t((await page.locator("#drawer-content .kx-drawer__handle").getAttribute("aria-hidden")) === "true", "the handle is decorative");
      await press(page, "Tab");
      t((await active(page)) === "drawer-input", "Tab goes into its content", await active(page));
      await press(page, "Escape");
      t(!(await showing(page, "#drawer-content")) && (await active(page)) === "drawer-trigger", "Escape closes it, focus back on the trigger", await active(page));
      await press(page, "Enter");
      await pressAt(page, vp.width / 2, 6);
      t(!(await showing(page, "#drawer-content")) && (await out(page, "drawer")) === "false", "a press on the backdrop closes it");
    },
  },
  {
    component: "KxPopover",
    async run(page, t) {
      const trigger = page.locator("#pop-trigger");
      t((await trigger.getAttribute("aria-haspopup")) === "dialog" && (await trigger.getAttribute("aria-expanded")) === "false" && (await trigger.getAttribute("aria-controls")) === "pop-content", "trigger: aria-haspopup, aria-expanded, aria-controls");
      await focus(page, "#pop-trigger");
      await press(page, "Enter");
      t((await showing(page, "#pop-content")) && (await trigger.getAttribute("aria-expanded")) === "true", "Enter opens it");
      t((await page.getByRole("dialog", { name: "Dimensions" }).count()) === 1, "a dialog, named by its heading");
      t(!(await page.locator("#pop-content").evaluate((el) => el.matches(":modal"))) && !(await locked(page)), "not modal: the page is neither inert nor locked");
      t((await active(page)) === "pop-input", "focus moves to its first field", await active(page));
      const [tr, pr] = [await rectOf(page, "#pop-trigger"), await rectOf(page, "#pop-content")];
      t(pr.top >= tr.bottom && pr.top - tr.bottom <= 6 && Math.abs(pr.left - tr.left) <= 1, "below its trigger, aligned to its inline start", `trigger ${tr.left.toFixed(0)},${tr.bottom.toFixed(0)} popover ${pr.left.toFixed(0)},${pr.top.toFixed(0)}`);
      await press(page, "Tab");
      await press(page, "Tab");
      t((await active(page)) === "pop-after" && !(await showing(page, "#pop-content")), "Tab past its last stop continues to the page, and closes it", await active(page));
      await focus(page, "#pop-trigger");
      await press(page, "Enter");
      await press(page, "Escape");
      t(!(await showing(page, "#pop-content")) && (await active(page)) === "pop-trigger", "Escape closes it, focus back on the trigger", await active(page));
      await press(page, "Enter");
      await click(page, "#pop-close");
      t(!(await showing(page, "#pop-content")) && (await active(page)) === "pop-trigger", "its close control closes it, focus back on the trigger", await active(page));
      await click(page, "#pop-trigger");
      await click(page, "#pop-trigger");
      t(!(await showing(page, "#pop-content")), "pressing the trigger again closes it");
      await click(page, "#pop-trigger");
      await page.locator("#tip-next").click();
      await idle(page);
      t(!(await showing(page, "#pop-content")) && (await active(page)) === "tip-next", "a press outside closes it and leaves focus where it was put", await active(page));

      // placement: flipped at both viewport edges, against an anchor, out of a clip, through a scroller
      const vp = await viewportOf(page);
      for (const [id, want] of [["pop-start", "right"], ["pop-end", "left"]]) {
        await click(page, `#${id}-trigger`);
        const placement = await page.locator(`#${id}-content`).getAttribute("data-placement");
        const r = await rectOf(page, `#${id}-content`);
        t(placement === want && r.left >= 0 && r.right <= vp.width, `${id === "pop-start" ? "side=start" : "side=end"} with no room there flips to the ${want}, inside the viewport`, `${placement}, ${r.left.toFixed(0)}–${r.right.toFixed(0)} of ${vp.width}`);
        await press(page, "Escape");
      }
      await click(page, "#pop-anchored-trigger");
      const [ar, apr] = [await rectOf(page, "#pop-anchor"), await rectOf(page, "#pop-anchored-content")];
      t(Math.abs(apr.right - ar.right) <= 1 && apr.top >= ar.bottom, "placed against its anchor (align end), not its trigger", `anchor right ${ar.right.toFixed(0)}, popover right ${apr.right.toFixed(0)}`);
      await press(page, "Escape");
      await click(page, "#pop-clipped-trigger");
      const [clip, cr] = [await rectOf(page, "#clip"), await rectOf(page, "#pop-clipped-content")];
      const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("kx-popover-content")?.id ?? null, { x: cr.left + cr.width / 2, y: Math.max(cr.bottom - 8, clip.bottom + 4) });
      t(cr.bottom > clip.bottom && hit === "pop-clipped-content", "escapes an overflow-clipped, transformed container (painted beyond it)", `clip bottom ${clip.bottom.toFixed(0)}, surface bottom ${cr.bottom.toFixed(0)}, hit ${hit}`);
      await press(page, "Escape");
      await page.locator("#scroller").evaluate((el) => (el.scrollTop = 120));
      await click(page, "#pop-scroll-trigger");
      const [t0, p0] = [await rectOf(page, "#pop-scroll-trigger"), await rectOf(page, "#pop-scroll-content")];
      await page.locator("#scroller").evaluate((el) => (el.scrollTop += 30));
      await idle(page);
      const [t1, p1] = [await rectOf(page, "#pop-scroll-trigger"), await rectOf(page, "#pop-scroll-content")];
      t(Math.abs(t1.top - t0.top + 30) <= 1 && Math.abs(p1.top - p0.top - (t1.top - t0.top)) <= 1, "follows its trigger when a container scrolls", `trigger moved ${(t1.top - t0.top).toFixed(1)}, surface ${(p1.top - p0.top).toFixed(1)}`);
      await press(page, "Escape");
    },
  },
  {
    component: "KxTooltip",
    async run(page, t) {
      t((await page.getByRole("button", { name: "Copy link" }).count()) === 1, "an icon-only trigger keeps its own name");
      t((await description(page, "#tip-trigger")) === "Copies a link anyone in the workspace can open", "closed, the tooltip is already the trigger's description", await description(page, "#tip-trigger"));
      t((await page.locator("#tip-content").getAttribute("role")) === "tooltip", "role tooltip");
      t((await description(page, "#tip-described-trigger")) === "Saved to your library. | Ctrl+S", "a trigger's own description is kept, the tooltip added", await description(page, "#tip-described-trigger"));
      await focus(page, "#dlg-programmatic");
      await page.locator("#pop-after").focus();
      await page.keyboard.press("Shift");
      await focus(page, "#tip-trigger");
      t(await showing(page, "#tip-content"), "keyboard focus opens it at once");
      const [tr, tip] = [await rectOf(page, "#tip-trigger"), await rectOf(page, "#tip-content")];
      const vw = (await viewportOf(page)).width;
      t(tip.bottom <= tr.top && centredOrShifted(tip, tr, vw), "above its trigger, centred on it (shifted to stay 8px inside the viewport)", `trigger ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, tooltip ${tip.left.toFixed(0)}–${tip.right.toFixed(0)}`);
      await press(page, "Escape");
      t(!(await showing(page, "#tip-content")) && (await active(page)) === "tip-trigger", "Escape closes it, focus stays on the trigger", await active(page));
      await press(page, "Tab");
      t((await active(page)) === "tip-described-trigger", "it is never a Tab stop: Tab goes to the next control", await active(page));
      t(!(await showing(page, "#tip-content")) && (await showing(page, "#tip-described-content")), "blur closes it; the next trigger's opens");
      await press(page, "Tab");
      t(!(await showing(page, "#tip-described-content")), "and blur closes that one");

      // hover: a delay, then open; the pointer may travel onto it; leaving both closes it
      await page.mouse.move(2, 2);
      await page.locator("#tip-trigger").hover();
      await page.waitForTimeout(300);
      await idle(page);
      t(!(await showing(page, "#tip-content")), "hover does not open it before its delay (700ms)");
      await page.waitForTimeout(550);
      await idle(page);
      t(await showing(page, "#tip-content") && (await out(page, "tooltip")) === "true", "hover opens it after its delay");
      const box = await rectOf(page, "#tip-content");
      await page.mouse.move(box.left + box.width / 2, box.top + box.height / 2, { steps: 4 });
      await page.waitForTimeout(250);
      await idle(page);
      t(await showing(page, "#tip-content"), "the pointer can move onto it without it closing (WCAG 1.4.13 hoverable)");
      await page.mouse.move(600, 780);
      await page.waitForTimeout(250);
      await idle(page);
      t(!(await showing(page, "#tip-content")), "leaving trigger and tooltip closes it");
      // pressing the trigger acts on it; the tooltip gets out of the way and does not open from that focus
      await page.locator("#tip-trigger").hover();
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(900);
      await idle(page);
      t(!(await showing(page, "#tip-content")), "pressing the trigger closes it, and focus from a press does not open it");
      await page.mouse.move(600, 780);
      // touch never hovers: a touch pointer does not open it
      await page.locator("#tip-described-trigger").evaluate((el) => el.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" })));
      await page.waitForTimeout(800);
      await idle(page);
      t(!(await showing(page, "#tip-described-content")), "a touch pointer does not open it");
    },
  },
  {
    component: "KxHoverCard",
    async run(page, t) {
      const trigger = page.locator("#hc-trigger");
      t((await trigger.getAttribute("aria-describedby")) === null && (await page.locator("#hc-content").getAttribute("role")) === null, "a preview, not a label: no role, and not the trigger's description");
      t((await page.getByRole("link", { name: "Ada Lovelace" }).count()) === 1, "the trigger is still a link");
      await focus(page, "#hc-trigger");
      t(await showing(page, "#hc-content"), "keyboard focus opens it");
      await press(page, "Tab");
      t((await active(page)) === "hc-link" && (await showing(page, "#hc-content")), "Tab walks into its link, and it stays open", await active(page));
      await press(page, "Tab");
      t((await active(page)) === "hc-after" && !(await showing(page, "#hc-content")), "Tab on out of it closes it", await active(page));
      await focus(page, "#hc-trigger");
      await press(page, "Escape");
      t(!(await showing(page, "#hc-content")) && (await active(page)) === "hc-trigger", "Escape closes it, focus stays on the trigger");
      await press(page, "Enter");
      t((await page.evaluate(() => location.hash)) === "#people-ada", "Enter follows the link");
      await page.mouse.move(2, 2);
      await idle(page);
      t(!(await showing(page, "#hc-content")), "closed once focus and pointer are both elsewhere", String(await out(page, "hover-card")));
      await trigger.hover();
      await page.waitForTimeout(800);
      await idle(page);
      t(await showing(page, "#hc-content"), "hover with intent (its 700ms delay) opens it");
      const box = await rectOf(page, "#hc-content");
      await page.mouse.move(box.left + 20, box.top + 10, { steps: 4 });
      await page.waitForTimeout(400);
      await idle(page);
      t(await showing(page, "#hc-content"), "the pointer can travel onto it and use it");
      await page.mouse.move(980, 20);
      await page.waitForTimeout(450);
      await idle(page);
      t(!(await showing(page, "#hc-content")), "leaving both closes it after its close delay");
    },
  },
];

/** Every surface, open, the way a gate opens it — for axe and forced colours. */
const OPENED = [
  { name: "dialog → popover → tooltip", open: async (p) => { await focus(p, "#dlg-trigger"); await press(p, "Enter"); await focus(p, "#dlg-pop-trigger"); await press(p, "Enter"); await press(p, "Tab"); }, surface: "#dlg-content" },
  { name: "dialog → dialog", open: async (p) => { await click(p, "#dlg-trigger"); await click(p, "#dlg-inner-trigger"); }, surface: "#dlg-inner-content" },
  { name: "alert dialog", open: async (p) => { await click(p, "#ad-trigger"); }, surface: "#ad-content" },
  { name: "modal", open: async (p) => { await click(p, "#modal-trigger"); }, surface: "#modal dialog" },
  { name: "sheet (end) → popover", open: async (p) => { await click(p, "#sheet-end-trigger"); await click(p, "#sheet-end-pop-trigger"); }, surface: "#sheet-end dialog" },
  { name: "sheet (bottom)", open: async (p) => { await click(p, "#sheet-bottom-trigger"); }, surface: "#sheet-bottom dialog" },
  { name: "drawer", open: async (p) => { await click(p, "#drawer-trigger"); }, surface: "#drawer-content" },
  { name: "popover", open: async (p) => { await click(p, "#pop-trigger"); }, surface: "#pop-content" },
  { name: "tooltip", open: async (p) => { await focus(p, "#tip-trigger"); }, surface: "#tip-content" },
  { name: "hover card", open: async (p) => { await focus(p, "#hc-trigger"); }, surface: "#hc-content" },
];
/** The overlay usage examples (src/usage/examples.ts), each opened by its own trigger. */
const DEMOS = ["DialogDemo", "AlertDialogDemo", "ModalDemo", "SheetDemo", "DrawerDemo", "PopoverDemo", "TooltipDemo", "HoverCardDemo"];
/** The compositions (src/fixtures/overlay-compositions.ts), at their deepest open state. */
const COMPOSITIONS = [
  { name: "destructive confirmation", open: async (p) => { await click(p, "#cmp-delete"); } },
  { name: "mobile settings → filters sheet", open: async (p) => { await click(p, "#cmp-filters"); } },
  { name: "mobile settings → share drawer", open: async (p) => { await click(p, "#cmp-share"); } },
  { name: "invite dialog → popover → tooltip", open: async (p) => { await click(p, "#cmp-invite"); await click(p, "#cmp-role-trigger"); await focus(p, "#cmp-role-help"); } },
  { name: "invite dialog → hover card", open: async (p) => { await click(p, "#cmp-invite"); await focus(p, "#cmp-member"); } },
];

if (runs("interaction")) {
  assertClaims("interaction, accessibility", BEHAVIOUR);
  report.push(`\ninteraction — ${BEHAVIOUR.length} overlay components driven by keyboard and pointer in Chromium`);
  for (const subject of BEHAVIOUR) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await open(context);
    try {
      await subject.run(page, (ok, what, detail) => check(ok, `${subject.component}: ${what}`, detail));
    } catch (err) {
      check(false, `${subject.component}: ran to completion`, String(err.message).split("\n")[0]);
    }
    await context.close();
  }

  report.push(`\naccessibility — every overlay open, under axe (light and dark) and forced colours`);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, colorScheme: theme, reducedMotion: "reduce" });
    const cases = [
      ...OPENED.map((c) => ({ ...c, fixture: "overlays" })),
      ...DEMOS.map((demo) => ({ name: `usage ${demo}`, fixture: "usage", demo, open: async (p) => { const t = p.locator("[kxDialogTrigger], [kxPopoverTrigger]").first(); if (await t.count()) { await t.click(); await idle(p); } else await focus(p, "[kxTooltipTrigger], [kxHoverCardTrigger]"); } })),
      ...COMPOSITIONS.map((c) => ({ ...c, name: `composition ${c.name}`, fixture: "overlay-compositions" })),
    ];
    for (const c of cases) {
      const page = await open(context, c.fixture, { theme, demo: c.demo });
      try {
        await c.open(page);
        const opened = await page.evaluate(() => document.querySelectorAll("dialog:modal, :popover-open").length);
        const violations = (await axe(page)).flatMap((v) => v.targets.map((target) => `${v.id} ${target}`));
        check(opened > 0 && violations.length === 0, `axe ${theme} ${c.name} (open)`, opened ? violations.join("; ") : "nothing opened");
      } catch (err) {
        check(false, `axe ${theme} ${c.name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await page.close();
    }
    await context.close();
  }

  // Forced colours: inside every open surface, each focus stop keeps an outline, and the surface keeps an edge.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, forcedColors: "active", reducedMotion: "reduce" });
    for (const c of OPENED) {
      const page = await open(context);
      try {
        await c.open(page);
        const edge = await page.locator(c.surface).evaluate((el) => {
          const cs = getComputedStyle(el);
          const side = (w, s, col) => parseFloat(w) > 0 && s !== "none" && col !== "rgba(0, 0, 0, 0)";
          return [side(cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor), side(cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor), side(cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor), side(cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor)].some(Boolean);
        });
        check(edge, `forced colours ${c.name}: the surface keeps a visible edge`);
        const missing = new Set();
        let stops = 0;
        const top = c.surface;
        for (let i = 0; i < 10; i++) {
          await press(page, "Tab");
          const stop = await page.evaluate((sel) => {
            const el = document.activeElement;
            const surface = document.querySelector(sel);
            if (!el || el === document.body || el === surface) return { skip: true };
            const cs = getComputedStyle(el);
            return { name: el.id || el.className || el.tagName, visible: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 };
          }, top);
          if (stop.skip) continue;
          stops++;
          if (!stop.visible) missing.add(stop.name);
        }
        check(stops > 0 && missing.size === 0, `forced colours ${c.name}: every focus stop keeps an outline (${stops} stops)`, [...missing].join(", "));
      } catch (err) {
        check(false, `forced colours ${c.name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await page.close();
    }
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: rtl
 *
 * Direction in the four cases (an LTR page, an RTL page, an LTR region in an RTL page, an RTL region in an
 * LTR page), measured against the direction the surface's OWN element resolves to. This is where rendering
 * in the top layer instead of a portal pays: a surface declared inside an RTL region stays in that region in
 * the DOM, so it inherits the region's direction — a portal to <body> would take the page's.
 *
 *   KxDialog       the close button at the inline end of the title row; the confirming action toward the
 *                  inline end of Cancel; the surface's text resolves to the region's direction
 *   KxAlertDialog  Cancel at the inline start of the action
 *   KxModal        the close button at the inline end of its header; Delete toward the inline end of Cancel
 *   KxSheet        `side="start"` attaches to the inline-start edge of the viewport and `side="end"` to the
 *                  inline end, chosen by the sheet's own direction (in an RTL region of an LTR page, `end` is
 *                  the left edge); its close button at the inline end
 *   KxDrawer       the bottom edge, full width in every direction; actions toward the inline end, in order
 *   KxPopover      aligned to its trigger's inline start; `side="end"` opens toward the inline end and
 *                  `side="start"` toward the start, each flipping at the viewport edge it lacks room against
 *   KxTooltip      centred above its trigger, its text in the trigger's direction
 *   KxHoverCard    its text in the trigger's direction, aligned to the inline start
 * ════════════════════════════════════════════════════════════════════════════ */
const towardEnd = (dir, a, b) => (dir === "rtl" ? b - a : a - b);
const mid = (r) => (r.left + r.right) / 2;
const textDir = (page, sel) => page.locator(sel).first().evaluate((el) => ({ direction: getComputedStyle(el).direction, align: getComputedStyle(el).textAlign }));
const RTL = [
  {
    component: "KxDialog",
    region: "#dlg",
    async run(page, dir, t) {
      await click(page, "#dlg-trigger");
      await settled(page);
      const [title, x] = [await rectOf(page, "#dlg-content .kx-dialog__title"), await rectOf(page, "#dlg-content > .kx-dialog__close")];
      t(towardEnd(dir, mid(x), mid(title)) > 0, "the close button sits at the inline end of the title row");
      const [cancel, save] = [await rectOf(page, "#dlg-cancel"), await rectOf(page, "#dlg-save")];
      t(towardEnd(dir, mid(save), mid(cancel)) > 0, "the confirming action toward the inline end of Cancel");
      t((await textDir(page, "#dlg-content")).direction === dir, "the surface resolves to its region's direction", (await textDir(page, "#dlg-content")).direction);
    },
  },
  {
    component: "KxAlertDialog",
    region: "#ad",
    async run(page, dir, t) {
      await click(page, "#ad-trigger");
      await settled(page);
      const [cancel, action] = [await rectOf(page, "#ad-cancel"), await rectOf(page, "#ad-action")];
      t(towardEnd(dir, mid(action), mid(cancel)) > 0, "Cancel at the inline start of the action");
      t((await active(page)) === "ad-cancel", "first focus is still Cancel");
    },
  },
  {
    component: "KxModal",
    region: "#modal",
    async run(page, dir, t) {
      await click(page, "#modal-trigger");
      await settled(page);
      const scope = "#modal dialog";
      const [title, x] = [await rectOf(page, `${scope} .kx-modal__title`), await rectOf(page, `${scope} .kx-modal__close`)];
      t(towardEnd(dir, mid(x), mid(title)) > 0, "the close button at the inline end of its header");
      const buttons = page.locator(`${scope} .kx-modal__footer button`);
      const [cancel, del] = [await buttons.nth(0).evaluate((el) => el.getBoundingClientRect().toJSON()), await buttons.nth(1).evaluate((el) => el.getBoundingClientRect().toJSON())];
      t(towardEnd(dir, mid(del), mid(cancel)) > 0, "Delete toward the inline end of Cancel");
    },
  },
  {
    component: "KxSheet",
    region: "#sheet-end",
    async run(page, dir, t) {
      const vp = await viewportOf(page);
      for (const side of ["start", "end"]) {
        await click(page, `#sheet-${side}-trigger`);
        await settled(page);
        const r = await rectOf(page, `#sheet-${side} dialog`);
        const atLeft = Math.abs(r.left) <= 1;
        const atRight = Math.abs(r.right - vp.width) <= 1;
        const wantRight = (side === "end") === (dir === "ltr");
        t(wantRight ? atRight : atLeft, `side=${side} attaches to the inline-${side} edge (${wantRight ? "right" : "left"})`, `${r.left.toFixed(0)}–${r.right.toFixed(0)} of ${vp.width}`);
        const [title, x] = [await rectOf(page, `#sheet-${side} dialog .kx-dialog__title`), await rectOf(page, `#sheet-${side} dialog > .kx-dialog__close`)];
        t(towardEnd(dir, mid(x), mid(title)) > 0, `side=${side}: its close button at the inline end`);
        await press(page, "Escape");
      }
    },
  },
  {
    component: "KxDrawer",
    region: "#drawer",
    async run(page, dir, t) {
      const vp = await viewportOf(page);
      await click(page, "#drawer-trigger");
      await settled(page);
      const r = await rectOf(page, "#drawer-content");
      t(Math.abs(r.bottom - vp.height) <= 1 && Math.abs(r.width - vp.width) <= 1, "the bottom edge, full width");
      const [cancel, send] = [await rectOf(page, "#drawer-cancel"), await rectOf(page, "#drawer-send")];
      t(towardEnd(dir, mid(send), mid(cancel)) > 0, "the actions toward the inline end, in order");
    },
  },
  {
    component: "KxPopover",
    region: "#pop",
    async run(page, dir, t) {
      await click(page, "#pop-trigger");
      const [tr, pr] = [await rectOf(page, "#pop-trigger"), await rectOf(page, "#pop-content")];
      const start = (r) => (dir === "rtl" ? r.right : r.left);
      t(Math.abs(start(pr) - start(tr)) <= 1, "align=start: aligned to the trigger's inline start", `trigger ${start(tr).toFixed(0)}, popover ${start(pr).toFixed(0)}`);
      t((await textDir(page, "#pop-content")).direction === dir, "its text resolves to the trigger's direction");
      await press(page, "Escape");
      // In the region case the row of edge triggers is in the same section, so it mirrors with it.
      for (const [id, side] of [["pop-start", "start"], ["pop-end", "end"]]) {
        await click(page, `#${id}-trigger`);
        const [a, s] = [await rectOf(page, `#${id}-trigger`), await rectOf(page, `#${id}-content`)];
        // each asks for the side with no room (it sits against that edge), so each must open the other way
        const opensToward = towardEnd(dir, mid(s), mid(a)) > 0 ? "end" : "start";
        t(opensToward === (side === "start" ? "end" : "start"), `side=${side}, against the inline-${side} edge, flips toward the inline ${side === "start" ? "end" : "start"}`, `opened toward the ${opensToward}`);
        await press(page, "Escape");
      }
    },
  },
  {
    component: "KxTooltip",
    region: "#tip",
    async run(page, dir, t) {
      await focus(page, "#tip-trigger");
      const [tr, tip] = [await rectOf(page, "#tip-trigger"), await rectOf(page, "#tip-content")];
      t(tip.bottom <= tr.top && centredOrShifted(tip, tr, (await viewportOf(page)).width), "centred above its trigger (shifted to stay inside the viewport)", `trigger ${tr.left.toFixed(0)}–${tr.right.toFixed(0)}, tooltip ${tip.left.toFixed(0)}–${tip.right.toFixed(0)}`);
      t((await textDir(page, "#tip-content")).direction === dir, "its text in the trigger's direction");
    },
  },
  {
    component: "KxHoverCard",
    region: "#hc",
    async run(page, dir, t) {
      await focus(page, "#hc-trigger");
      const d = await textDir(page, "#hc-content");
      t(d.direction === dir && ["start", dir === "rtl" ? "right" : "left"].includes(d.align), "its text in the trigger's direction, aligned to the inline start", `${d.direction}, ${d.align}`);
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
  report.push(`\nrtl — ${RTL.length} overlay components in ${DIRECTION_CASES.length} direction cases`);
  for (const c of DIRECTION_CASES) {
    const want = c.region ?? c.page;
    const label = c.region ? `${c.region} region in an ${c.page} page` : `${c.page} page`;
    for (const subject of RTL) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: "reduce" });
      const page = await open(context, "overlays", { dir: c.page });
      const name = `${subject.component} (${label})`;
      try {
        if (c.region) await page.locator(subject.region).first().evaluate((el, d) => el.closest("section").setAttribute("dir", d), c.region);
        await idle(page);
        const resolved = await page.locator(subject.region).first().evaluate((el) => getComputedStyle(el).direction);
        check(resolved === want, `${name}: resolves to ${want}`, resolved);
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
 * 200% text, applied as a reader applies it (the root font size doubles), at 1024px and at a 390px phone
 * width, on every overlay OPEN. React's rules (scripts/large-text.mjs) where they apply, plus what an overlay
 * adds: the surface stays inside the viewport and scrolls inside itself rather than running off it, nothing in
 * it is cut off sideways, its actions still meet the 24px target and are not truncated, and it is still
 * operable — Escape closes it and focus comes back.
 *
 *   KxDialog, KxAlertDialog, KxModal   the title grows ≥1.8x; at 390px the actions stack in DOM order
 *   KxSheet, KxDrawer                  the same, against their edge
 *   KxPopover, KxHoverCard             the text grows; the surface is capped to the room beside its trigger
 *   KxTooltip                          the text grows; it stays inside the viewport
 *
 * And the overlays page as a whole fits 390px at 2x with no horizontal scroll.
 * ════════════════════════════════════════════════════════════════════════════ */
const LARGE = [
  { component: "KxDialog", open: "#dlg-trigger", surface: "#dlg-content", text: "#dlg-content .kx-dialog__title", actions: "#dlg-content kx-dialog-footer button" },
  { component: "KxAlertDialog", open: "#ad-trigger", surface: "#ad-content", text: "#ad-content .kx-dialog__title", actions: "#ad-content kx-dialog-footer button" },
  { component: "KxModal", open: "#modal-trigger", surface: "#modal dialog", text: "#modal .kx-modal__title", actions: "#modal .kx-modal__footer button" },
  { component: "KxSheet", open: "#sheet-end-trigger", surface: "#sheet-end dialog", text: "#sheet-end .kx-dialog__title", actions: "#sheet-end kx-dialog-footer button" },
  { component: "KxDrawer", open: "#drawer-trigger", surface: "#drawer-content", text: "#drawer-content .kx-dialog__title", actions: "#drawer-content kx-dialog-footer button" },
  { component: "KxPopover", open: "#pop-trigger", surface: "#pop-content", text: "#pop-title", actions: "#pop-close", floating: true },
  { component: "KxTooltip", focusOpen: "#tip-trigger", surface: "#tip-content", text: "#tip-content", floating: true },
  { component: "KxHoverCard", focusOpen: "#hc-trigger", surface: "#hc-content", text: "#hc-content p", floating: true },
];
const SCALE = 2;
if (runs("largeText")) {
  assertClaims("largeText", LARGE);
  report.push(`\nlargeText — ${LARGE.length} overlays open at ${SCALE}x the root font size, 1024px and 390px`);
  for (const s of LARGE) {
    for (const viewport of [{ width: 1024, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await open(context);
      const name = `${s.component} @${viewport.width}px`;
      try {
        const openIt = async () => {
          if (s.open) return click(page, s.open);
          await page.evaluate(() => document.activeElement?.blur());
          return focus(page, s.focusOpen);
        };
        await openIt();
        const before = await page.locator(s.text).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        await press(page, "Escape");
        await page.evaluate((px) => (document.documentElement.style.fontSize = `${px}px`), 16 * SCALE);
        await idle(page);
        await openIt();
        await settled(page);
        const m = await page.evaluate(({ surface, text, actions }) => {
          const el = document.querySelector(surface);
          const r = el.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          // the actions this surface shows (a nested surface's, closed, renders none)
          const buttons = actions ? [...document.querySelectorAll(actions)].filter((b) => b.getClientRects().length) : [];
          return {
            rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
            vw,
            vh: innerHeight,
            sideways: el.scrollWidth - el.clientWidth,
            fontSize: parseFloat(getComputedStyle(document.querySelector(text)).fontSize),
            truncated: buttons.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()),
            small: buttons.filter((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height) < 24).map((b) => b.textContent.trim()),
            rows: new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top))).size,
            columns: buttons.length,
            order: buttons.length > 1 ? buttons[1].getBoundingClientRect().top >= buttons[0].getBoundingClientRect().top : true,
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        }, s);
        const pad = s.floating ? 8 - 0.5 : -0.5;
        const inside = m.rect.left >= pad && m.rect.right <= m.vw - pad && m.rect.top >= pad && m.rect.bottom <= m.vh - pad;
        check(inside, `${name}: the open surface stays inside the viewport at ${SCALE}x`, `${m.rect.left.toFixed(0)},${m.rect.top.toFixed(0)}–${m.rect.right.toFixed(0)},${m.rect.bottom.toFixed(0)} in ${m.vw}x${m.vh}`);
        check(m.sideways <= 1, `${name}: nothing inside it is cut off sideways`, `${m.sideways}px`);
        check(m.fontSize >= before * 1.8, `${name}: its text grows with the reader's`, `${before}px -> ${m.fontSize}px`);
        if (s.actions) {
          check(m.truncated.length === 0, `${name}: no action is truncated`, m.truncated.join(", "));
          check(m.small.length === 0, `${name}: every action is at least a 24px target`, m.small.join(", "));
          if (viewport.width < 1024 && m.columns > 1) check(m.rows === m.columns && m.order, `${name}: the actions stack, in DOM order`, `${m.columns} actions on ${m.rows} rows`);
        }
        check(m.pageOverflow <= 0, `${name}: no horizontal page overflow`, `${m.pageOverflow}px`);
        await press(page, "Escape");
        const back = s.open ?? s.focusOpen;
        check(!(await showing(page, s.surface)) && (await page.locator(back).evaluate((el) => el === document.activeElement)), `${name}: still operable — Escape closes it, focus comes back`);
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
  check(overflowX <= 0, `the whole overlays page fits 390px at ${SCALE}x text`, `${overflowX}px`);
  await context.close();
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: reducedMotion
 *
 * Every overlay opens and closes with motion (TOKENS.md, "Overlays"), and under `prefers-reduced-motion` with
 * none, in the same end states. Each travel — open and close — is driven in an LTR and an RTL page: with
 * normal motion the property passes a rendered midpoint strictly between its end states over a perceptible
 * duration; under reduced motion no animation runs longer than SUPPRESSED_MS and the surface lands where it
 * would have (open: shown, opaque, at its edge; closed: not rendered). The midpoint is read by pausing and
 * seeking the running transitions, never by sleeping.
 *
 *   KxDialog, KxAlertDialog, KxModal   opacity (with a scale settle)
 *   KxSheet                            its inline-end margin: it slides in from the inline end and back out
 *   KxDrawer                           its translation: up from the bottom edge and back down
 *   KxPopover, KxHoverCard             opacity (with a 4px settle away from the trigger)
 *   KxTooltip                          opacity
 * ════════════════════════════════════════════════════════════════════════════ */
const MOTION = [
  { component: "KxDialog", control: "#dlg-trigger", target: "#dlg-content", property: "opacity" },
  { component: "KxAlertDialog", control: "#ad-trigger", target: "#ad-content", property: "opacity" },
  { component: "KxModal", control: "#modal-trigger", target: "#modal dialog", property: "opacity" },
  { component: "KxSheet", control: "#sheet-end-trigger", target: "#sheet-end dialog", property: "marginInlineEnd" },
  { component: "KxDrawer", control: "#drawer-trigger", target: "#drawer-content", property: "translate" },
  { component: "KxPopover", control: "#pop-trigger", target: "#pop-content", property: "opacity" },
  { component: "KxTooltip", control: "#tip-trigger", target: "#tip-content", property: "opacity", byFocus: true },
  { component: "KxHoverCard", control: "#hc-trigger", target: "#hc-content", property: "opacity", byFocus: true },
];
/**
 * Start a travel (open: activate the control; close: Escape), then, frame by frame until the change has
 * rendered, read the property before, at the midpoint of every running transition on the target, and after.
 */
function sampleTravel(page, { control, target, property, byFocus }, travel) {
  return page.evaluate(
    ({ control, target, property, byFocus, travel }) =>
      new Promise((resolve) => {
        const el = document.querySelector(target);
        const num = (v) => {
          if (v == null || v === "none") return 0;
          const n = String(v).match(/-?[\d.]+(?:e[-+]?\d+)?/gi);
          return n ? Number(n[n.length - 1]) : 0;
        };
        const read = () => num(getComputedStyle(el)[property]);
        const shown = () => (el.tagName === "DIALOG" ? el.open : el.matches(":popover-open"));
        const a = read();
        if (travel === "open") {
          if (byFocus) document.querySelector(control).focus();
          else document.querySelector(control).click();
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
            // Read the start from the transition itself: a surface that was `display: none` has no used value
            // to read beforehand (a percentage in its margin cannot resolve without a box).
            running.forEach((x) => x.pause());
            running.forEach((x) => (x.currentTime = 0));
            const start = read();
            running.forEach((x) => (x.currentTime = Number(x.effect.getComputedTiming().activeDuration) / 2));
            const mid = read();
            // and the end from its last frame, for the same reason when it closes to `display: none`
            running.forEach((x) => (x.currentTime = Number(x.effect.getComputedTiming().activeDuration) - 0.01));
            const end = read();
            running.forEach((x) => x.finish());
            requestAnimationFrame(() => resolve({ a: start, mid, b: end, durationMs: longest, shown: shown(), display: getComputedStyle(el).display }));
          } else if (changed && frames > 6) {
            resolve({ a, mid: null, b: read(), durationMs: longest, shown: shown(), display: getComputedStyle(el).display });
          } else if (frames > 60) {
            resolve({ a, mid: null, b: read(), durationMs: longest, shown: shown(), display: getComputedStyle(el).display, timeout: true });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { control, target, property, byFocus, travel },
  );
}
if (runs("reducedMotion")) {
  assertClaims("reducedMotion", MOTION);
  const { PERCEPTIBLE_MS, SUPPRESSED_MS } = await import("./motion-states.mjs");
  report.push(`\nreducedMotion — ${MOTION.length} overlays, open and close, LTR and RTL, normal and reduced`);
  for (const s of MOTION) {
    for (const dir of ["ltr", "rtl"]) {
      const ends = {};
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, "overlays", { dir });
        if (s.byFocus) await page.keyboard.press("Shift");
        for (const travel of ["open", "close"]) {
          const name = `${s.component} ${travel} (${dir}, ${reduced ? "reduced" : "normal"} motion)`;
          try {
            const m = await sampleTravel(page, s, travel);
            await settled(page);
            await idle(page);
            const landedShown = await showing(page, s.target);
            const landedDisplay = await page.locator(s.target).evaluate((el) => getComputedStyle(el).display);
            const landed = travel === "open" ? landedShown && landedDisplay !== "none" : !landedShown && landedDisplay === "none";
            if (!reduced) {
              ends[travel] = travel === "open" ? m.b : landed;
              const between = m.mid != null && Math.min(m.a, m.b) < m.mid && m.mid < Math.max(m.a, m.b);
              check(m.durationMs >= PERCEPTIBLE_MS && between, `${name}: travels through a rendered midpoint`, `${m.a} → ${m.mid} → ${m.b} over ${m.durationMs}ms`);
            } else {
              check(m.durationMs <= SUPPRESSED_MS, `${name}: no perceptible motion`, `${m.durationMs}ms`);
              // open: the same value of the property; closed: the same "not rendered" (a closed surface has no
              // box, so its margin or opacity is not an end state anyone sees)
              const same = travel === "open" ? Math.abs(m.b - ends.open) <= 0.5 : landed === ends.close;
              check(same, `${name}: lands on the same end state`, travel === "open" ? `${m.b} (normal: ${ends.open})` : `not rendered: ${landed} (normal: ${ends.close})`);
            }
            check(landed, `${name}: comes to rest ${travel === "open" ? "shown" : "not rendered"}`, `${landedShown ? "shown" : "hidden"}, display ${landedDisplay}`);
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
  console.error(`\n✗ angular-overlays: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nangular-overlays ok — @kinetixui/angular overlays, live in Chromium.`);
