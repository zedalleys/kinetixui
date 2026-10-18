/**
 * menu-visual.mjs — the menu item and listbox option state contract, measured on rendered pixels.
 *
 *   pnpm build:tokens && node scripts/menu-visual.mjs
 *
 * Angular Wave C2a (TOKENS.md, "Menus") gives the three menus in @kinetixui/angular — dropdown menu, context
 * menu, menubar — one surface and one set of item states. This gate renders the live Angular application
 * (src/fixtures/collections.ts, painted by the package's own styles.css and the generated token CSS) in
 * Chromium, opens each menu, drives each state with a real keyboard and pointer, and reads it back off the
 * screen:
 *
 *   surface      the menu is painted the `popover` token, edged in the full `border` token, and raised: a shadow
 *                on the page beside it in light, the surface step (lighter than the page) in dark
 *   rest         an item at rest paints nothing of its own: its pixels are the surface's
 *   hover        a pointer highlight lays the state layer over the item (a perceptible change) and draws NO ring
 *   keyboard     a keyboard highlight lays the same layer AND an inset focus ring that clears 3:1 against that
 *                layer (SC 1.4.11) — so keyboard and pointer positions never look the same
 *   pressed      the pressed layer is stronger than the hover layer
 *   disabled     drawn at the disabled opacity, and a pointer over it paints no layer
 *   checked      a checkbox or radio item that is checked carries a mark at its inline start that clears 3:1;
 *                an unchecked one carries none — the state is a shape, never colour alone
 *   destructive  the label is the `destructive` token and readable on the surface (4.5:1) at rest and highlighted
 *   submenu      the sub trigger draws a chevron at its inline end; while its submenu is open and focus is in
 *                the submenu, the trigger keeps the state layer; the submenu is painted toward the inline end
 *   separator    a rule in the `border` token across the menu
 *   label        semibold, readable (4.5:1)
 *   shortcut     muted, readable (4.5:1) at rest and highlighted, at the item's inline end
 *   menubar      a trigger at rest is the bar; an open trigger keeps the state layer; a keyboard-focused trigger
 *                draws a ring that clears 3:1
 *   context      the context menu's surface and items are the same contract (it is the same parts)
 *
 * Wave C2b's listboxes (TOKENS.md, "Listboxes") — the select's and the multi-select's popups, from
 * src/fixtures/listboxes.ts — hold the same option states, plus one a menu has no use for:
 *
 *   surface      the listbox is the same popover surface and edge
 *   rest         an option at rest paints nothing of its own
 *   keyboard     the keyboard highlight (the active descendant: focus stays on the field) draws the layer and an
 *                inset ring that clears 3:1; a pointer highlight draws the layer and no ring
 *   selected     a CHOSEN option carries a check mark at its inline start that clears 3:1, and paints no layer
 *                when it is not highlighted — chosen and highlighted are two states, never one look; an
 *                unchosen option carries no mark
 *   disabled     drawn at the disabled opacity, and a pointer over it paints no layer
 *
 * Light and dark, LTR and RTL. Thresholds appear only where a standard names one (3:1, SC 1.4.11; 4.5:1,
 * SC 1.4.3); every other assertion is a relation between two renderings in the same run.
 *
 * Angular only: React's menus and listboxes are not changed by Waves C2a and C2b and are not measured here
 * (visual-gates.mjs).
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { rmSync } from "node:fs";
import { chromium } from "playwright";
import { buildAngularSubject, waitForAngular, contrast, framer, serveStatic } from "./visual-harness.mjs";
import { gate } from "./visual-gates.mjs";

const COVERS = new Set(gate("scripts/menu-visual.mjs").covers.Angular);
const DPR = 2;
const PAD = 12;
const frame = framer({ dpr: DPR, pad: PAD });
const VIEWPORT = { width: 1024, height: 800 };

const dir = buildAngularSubject("collections", { name: "menu-visual", layout: "" });
const server = await serveStatic(dir);
const listDir = buildAngularSubject("listboxes", { name: "listbox-visual", layout: "" });
const listServer = await serveStatic(listDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(theme, { rtl = false, forced = false, at = server } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, reducedMotion: "reduce", forcedColors: forced ? "active" : "none" });
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(at.base) && !url.href.startsWith("data:"), (route) => route.abort());
  await page.goto(`${at.base}/${theme}.html${rtl ? "?dir=rtl" : ""}`, { waitUntil: "load" });
  await waitForAngular(page);
  await page.mouse.move(0, 0);
  return { page, close: () => context.close() };
}
const rest = (page) =>
  page.evaluate(() => window.kxHarness.settle().then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => Promise.allSettled(document.getAnimations().map((a) => a.finished))));
async function key(page, k) {
  await page.keyboard.press(k);
  await rest(page);
}
async function keyboardFocus(page, sel) {
  await page.keyboard.press("Shift");
  await page.locator(sel).first().focus();
  await rest(page);
}
const box = (page, sel) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().toJSON());
const token = (page, name) =>
  page.evaluate((v) => {
    const probe = document.createElement("i");
    probe.style.color = `hsl(var(${v}))`;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    probe.remove();
    return rgb;
  }, name);
const rgb = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const style = (page, sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);
const r2 = (n) => n.toFixed(2);
const sum = (p) => p.reduce((t, v) => t + v, 0);
/** The strongest contrast against `ref` along a short line, both ends inclusive. */
function strongest(f, ref, [x0, y0], [x1, y1]) {
  let best = 1;
  const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * DPR);
  for (let i = 0; i <= n; i++) best = Math.max(best, contrast(f.at(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n), ref));
  return best;
}
/** A point inside an item's padding, away from its text and its edge: what the item's own fill is. */
const fillPoint = (b, rtl) => [rtl ? b.x + 3.5 : b.x + b.width - 3.5, b.y + b.height / 2];
/** One pixel inside the item's edge, where an inset ring is drawn. */
const ringPoint = (b) => [b.x + b.width / 2, b.y + 1];

const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(84)} ${detail}`);
  if (process.env.KX_VERBOSE) console.log(report.at(-1));
  if (!ok) failures.push(`${label}: ${detail}`);
};

async function dropdown(theme, rtl) {
  const name = `${theme} ${rtl ? "rtl" : "ltr"} dropdown-menu`;
  const { page, close } = await open(theme, { rtl });
  const fill = await token(page, "--popover");
  const border = await token(page, "--border");
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));

  await keyboardFocus(page, "#dd-trigger");
  await key(page, "Enter");
  const m = await box(page, "#dd-content");
  const sf = await frame(page, m);
  check(contrast(sf.at(m.x + m.width / 2, m.y + m.height - 3), fill) < 1.05, `${name} the menu is painted the popover token`);
  check(contrast(sf.at(m.x + 0.5, m.y + m.height / 2), border) < 1.1, `${name} its edge is drawn in the full border token`, `${sf.at(m.x + 0.5, m.y + m.height / 2)} vs ${border}`);
  if (theme === "light") {
    const x = m.x + m.width / 2;
    const withIt = sf.at(x, m.y + m.height + 3);
    await key(page, "Escape");
    await page.evaluate(() => document.activeElement?.blur());
    await rest(page);
    const without = (await frame(page, m)).at(x, m.y + m.height + 3);
    check(sum(withIt) < sum(without), `${name} a shadow under the menu`, `${withIt} open, ${without} closed`);
    await keyboardFocus(page, "#dd-trigger");
    await key(page, "Enter");
  } else {
    check(sum(fill) > sum(pageBg), `${name} dark: the menu is lighter than the page (the surface step)`, `${r2(contrast(fill, pageBg))}:1`);
  }

  // keyboard highlight on the first item; rest on the second
  const kb = await box(page, "#dd-rename");
  const rb = await box(page, "#dd-duplicate");
  const f1 = await frame(page, m);
  const restFill = f1.at(...fillPoint(rb, rtl));
  check(contrast(restFill, fill) < 1.03, `${name} rest: an item paints nothing of its own`, `${restFill} vs ${fill}`);
  const kbFill = f1.at(...fillPoint(kb, rtl));
  const layer = contrast(kbFill, fill);
  check(layer > 1.03, `${name} keyboard highlight: the state layer is drawn`, `${r2(layer)}:1`);
  const kbRing = strongest(f1, kbFill, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2]);
  check(kbRing >= 3, `${name} keyboard highlight: an inset focus ring clears 3:1 against the layer`, `${r2(kbRing)}:1`);
  const kbRingAt = f1.at(...ringPoint(kb));

  // the pointer on the same item: the layer, no ring
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await rest(page);
  const f2 = await frame(page, m);
  const ptFill = f2.at(...fillPoint(kb, rtl));
  check(contrast(ptFill, fill) > 1.03 && contrast(ptFill, kbFill) < 1.03, `${name} hover: the same state layer as the keyboard highlight`, `${r2(contrast(ptFill, fill))}:1 over the surface`);
  const ptRing = strongest(f2, ptFill, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2]);
  const differs = contrast(f2.at(...ringPoint(kb)), kbRingAt);
  check(ptRing < 1.5 && differs >= 3, `${name} hover draws NO ring: keyboard and pointer highlights look different`, `ring ${r2(ptRing)}:1 under the pointer; keyboard vs pointer edge ${r2(differs)}:1`);

  // pressed: stronger than hover
  await page.mouse.down();
  await rest(page);
  const f3 = await frame(page, m);
  const pressed = f3.at(...fillPoint(kb, rtl));
  check(contrast(pressed, fill) > contrast(ptFill, fill) + 0.01, `${name} pressed: a stronger layer than hover`, `${r2(contrast(pressed, fill))}:1 vs ${r2(contrast(ptFill, fill))}:1`);
  // release elsewhere so the item does not run
  await page.mouse.move(m.x + m.width / 2, m.y - 30);
  await page.mouse.up();
  await rest(page);
  if (!(await page.locator("#dd-content").evaluate((el) => el.matches(":popover-open")))) {
    await keyboardFocus(page, "#dd-trigger");
    await key(page, "Enter");
  }

  // disabled: dimmed, and the pointer paints nothing over it
  const db = await box(page, "#dd-archive");
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await rest(page);
  const f4 = await frame(page, m);
  const opacity = Number(await style(page, "#dd-archive", "opacity"));
  const want = await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--opacity-disabled")) || null);
  check(want !== null && Math.abs(opacity - want) < 0.01, `${name} disabled: drawn at the disabled opacity`, `${opacity} (token ${want})`);
  check(contrast(f4.at(...fillPoint(db, rtl)), fill) < 1.03, `${name} disabled: a pointer over it paints no layer`);

  // checked and unchecked marks (the fixture starts with the ruler checked and "comfortable" chosen)
  for (const [sel, checked] of [["#dd-ruler", true], ["#dd-comfortable", true], ["#dd-compact", false]]) {
    const mark = await box(page, `${sel} .kx-menu__indicator`);
    const item = await box(page, sel);
    const atStart = rtl ? item.right - mark.right <= 12 : mark.left - item.left <= 12;
    const f = await frame(page, mark);
    let ink = 1;
    for (let y = mark.y + 2; y <= mark.y + mark.height - 2; y += 0.5) ink = Math.max(ink, strongest(f, fill, [mark.x + 1, y], [mark.x + mark.width - 1, y]));
    if (checked) check(ink >= 3 && atStart, `${name} checked ${sel}: a mark at the inline start that clears 3:1`, `${r2(ink)}:1`);
    else check(ink < 1.5, `${name} unchecked ${sel}: no mark`, `${r2(ink)}:1`);
  }

  // destructive: readable on the surface, at rest and highlighted
  const destructive = await token(page, "--destructive");
  const delColor = rgb(await style(page, "#dd-delete", "color"));
  check(contrast(delColor, destructive) < 1.03, `${name} destructive: the label is the destructive token`, `${delColor} vs ${destructive}`);
  const del = await box(page, "#dd-delete");
  const f5 = await frame(page, m);
  check(contrast(delColor, f5.at(...fillPoint(del, rtl))) >= 4.5, `${name} destructive at rest: readable (4.5:1)`, `${r2(contrast(delColor, f5.at(...fillPoint(del, rtl))))}:1`);
  await page.mouse.move(del.x + del.width / 2, del.y + del.height / 2);
  await rest(page);
  const delHi = (await frame(page, m)).at(...fillPoint(del, rtl));
  check(contrast(delHi, fill) > 1.03 && contrast(delColor, delHi) >= 4.5, `${name} destructive highlighted: a layer, still readable (4.5:1)`, `${r2(contrast(delColor, delHi))}:1`);

  // separator, label, shortcut
  const sep = await box(page, "#dd-separator");
  const f6 = await frame(page, m);
  check(contrast(f6.at(sep.x + sep.width / 2, sep.y + sep.height / 2), border) < 1.1 && sep.width >= m.width - 4, `${name} separator: a rule in the border token across the menu`, `${f6.at(sep.x + sep.width / 2, sep.y + sep.height / 2)} vs ${border}, ${sep.width.toFixed(0)} of ${m.width.toFixed(0)}px`);
  const weight = Number(await style(page, "#dd-label", "fontWeight"));
  const labelColor = rgb(await style(page, "#dd-label", "color"));
  const lb = await box(page, "#dd-label");
  check(weight >= 600 && contrast(labelColor, f6.at(rtl ? lb.x + 2 : lb.x + lb.width - 2, lb.y + lb.height / 2)) >= 4.5, `${name} label: semibold and readable`, `weight ${weight}`);
  const sc = await box(page, "#dd-shortcut");
  const scItem = await box(page, "#dd-rename");
  const scColor = rgb(await style(page, "#dd-shortcut", "color"));
  const muted = await token(page, "--muted-foreground");
  const atEnd = rtl ? sc.left - scItem.left <= 12 : scItem.right - sc.right <= 12;
  // #dd-rename is not highlighted now (the pointer is on Delete): the shortcut at rest
  const scRest = contrast(scColor, f6.at(...fillPoint(scItem, !rtl)));
  check(contrast(scColor, muted) < 1.03 && scRest >= 4.5 && atEnd, `${name} shortcut at rest: muted, readable, at the inline end`, `${r2(scRest)}:1`);
  await page.mouse.move(scItem.x + scItem.width / 2, scItem.y + scItem.height / 2);
  await rest(page);
  const scHiColor = rgb(await style(page, "#dd-shortcut", "color"));
  const scHi = contrast(scHiColor, (await frame(page, m)).at(...fillPoint(scItem, rtl)));
  check(scHi >= 4.5, `${name} shortcut highlighted: still readable (4.5:1)`, `${r2(scHi)}:1`);

  // the submenu: chevron at the inline end, painted toward the inline end, its trigger keeps the layer
  await page.mouse.move(0, 0);
  await keyboardFocus(page, "#dd-rename");
  await key(page, "s");
  const st = await box(page, "#dd-sub-trigger");
  const chev = await box(page, "#dd-sub-trigger .kx-menu__chevron");
  const fc = await frame(page, chev);
  let chevInk = 1;
  for (let y = chev.y + 1; y <= chev.y + chev.height - 1; y += 0.5) chevInk = Math.max(chevInk, strongest(fc, fill, [chev.x, y], [chev.x + chev.width, y]));
  const chevAtEnd = rtl ? chev.left - st.left <= 16 : st.right - chev.right <= 16;
  check(chevInk >= 3 && chevAtEnd, `${name} sub trigger: a chevron at its inline end`, `${r2(chevInk)}:1`);
  await key(page, rtl ? "ArrowLeft" : "ArrowRight");
  const sub = await box(page, "#dd-sub-content");
  const full = await frame(page, { x: Math.min(m.x, sub.x), y: m.y, width: Math.max(m.right, sub.right) - Math.min(m.x, sub.x), height: Math.max(m.bottom, sub.bottom) - m.y });
  const subPainted = contrast(full.at(rtl ? sub.x + 6 : sub.right - 6, sub.y + sub.height / 2), fill) < 1.05;
  const towardEnd = rtl ? sub.right <= m.x + 6 : sub.x >= m.right - 6;
  check(subPainted && towardEnd, `${name} the submenu is painted toward the inline end`, `menu ${m.x.toFixed(0)}–${m.right.toFixed(0)}, sub ${sub.x.toFixed(0)}–${sub.right.toFixed(0)}`);
  check(contrast(full.at(st.x + st.width / 2, st.y + st.height - 3), fill) > 1.03, `${name} sub trigger: keeps the state layer while its submenu is open`, `${r2(contrast(full.at(st.x + st.width / 2, st.y + st.height - 3), fill))}:1`);
  await close();
}

async function context(theme) {
  const name = `${theme} context-menu`;
  const { page, close } = await open(theme);
  const fill = await token(page, "--popover");
  const border = await token(page, "--border");
  await keyboardFocus(page, "#ctx-shape");
  await key(page, "Shift+F10");
  const m = await box(page, "#ctx-content");
  const f = await frame(page, m);
  const inner = f.at(m.x + m.width / 2, m.y + m.height - 3);
  // the edge: the pixel across the left edge nearest the border token
  let edge = f.at(m.x, m.y + m.height / 2);
  for (let x = m.x - 0.5; x <= m.x + 2; x += 0.5) if (contrast(f.at(x, m.y + m.height / 2), border) < contrast(edge, border)) edge = f.at(x, m.y + m.height / 2);
  check(contrast(inner, fill) < 1.05 && contrast(edge, border) < 1.1, `${name} the same surface: popover fill, border edge`, `${inner} vs ${fill}; ${edge} vs ${border}`);
  const kb = await box(page, "#ctx-paste");
  const kbFill = f.at(...fillPoint(kb, false));
  const ring = strongest(f, kbFill, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2]);
  check(contrast(kbFill, fill) > 1.03 && ring >= 3, `${name} the same keyboard highlight: layer and ring`, `${r2(ring)}:1`);
  const region = await box(page, "#ctx-region");
  await keyboardFocus(page, "#ctx-region");
  await key(page, "Escape");
  await keyboardFocus(page, "#ctx-region");
  const rf = await frame(page, region);
  const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const regionRing = strongest(rf, pageBg, [region.x + region.width / 2, region.y - 3.5], [region.x + region.width / 2, region.y - 0.5]);
  check(regionRing >= 3, `${name} the region's focus ring clears 3:1`, `${r2(regionRing)}:1`);
  await close();
}

async function menubar(theme, rtl) {
  const name = `${theme} ${rtl ? "rtl" : "ltr"} menubar`;
  const { page, close } = await open(theme, { rtl });
  const bar = await box(page, "#mb");
  const barBg = rgb(await style(page, "#mb", "backgroundColor"));
  const restF = await frame(page, bar);
  const edit = await box(page, "#mb-edit");
  check(contrast(restF.at(edit.x + 3, edit.y + edit.height / 2), barBg) < 1.03, `${name} a trigger at rest is the bar`);
  await keyboardFocus(page, "#mb-edit");
  const ff = await frame(page, bar);
  const ring = strongest(ff, barBg, [edit.x + edit.width / 2, edit.y - 3.5], [edit.x + edit.width / 2, edit.y - 0.5]);
  check(ring >= 3, `${name} a keyboard-focused trigger draws a ring that clears 3:1`, `${r2(ring)}:1`);
  await key(page, "Enter");
  await page.mouse.move(0, 0);
  const of = await frame(page, bar);
  const openLayer = contrast(of.at(edit.x + 3, edit.y + edit.height / 2), barBg);
  check(openLayer > 1.03, `${name} an open trigger keeps the state layer`, `${r2(openLayer)}:1`);
  const file = await box(page, "#mb-file");
  check(rtl ? edit.right <= file.left + 1 : edit.left >= file.right - 1, `${name} the triggers run in reading order`, `file ${file.left.toFixed(0)}, edit ${edit.left.toFixed(0)}`);
  const content = await box(page, "#mb-edit-content");
  check(rtl ? Math.abs(content.right - edit.right) <= 1.5 : Math.abs(content.left - edit.left) <= 1.5, `${name} the menu's inline-start edge lines up with its trigger's`);
  await close();
}

async function forced(theme) {
  const { page, close } = await open(theme, { forced: true });
  const canvas = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  await keyboardFocus(page, "#dd-trigger");
  await key(page, "Enter");
  const kb = await box(page, "#dd-rename");
  const f = await frame(page, kb);
  const ring = strongest(f, canvas, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2.5]);
  check(ring >= 3, `${theme} forced colours: the highlighted item still draws its outline`, `${r2(ring)}:1`);
  await close();
}

/**
 * A listbox's option states. `subject` names the field, how it opens, and which options are which once open:
 * `keyboard` is the highlight the opening key lands on, `chosen` is selected but not highlighted, `rest` neither,
 * `disabled` disabled.
 */
async function listbox(theme, rtl, subject) {
  const name = `${theme} ${rtl ? "rtl" : "ltr"} ${subject.slug}`;
  const { page, close } = await open(theme, { rtl, at: listServer });
  const fill = await token(page, "--popover");
  const border = await token(page, "--border");
  const sel = (id) => `[id="${id}"]`;
  await subject.prepare?.(page);
  await keyboardFocus(page, subject.field);
  for (const k of subject.keys) await key(page, k);
  const ids = await subject.ids(page);
  const m = await box(page, subject.surface);
  const f = await frame(page, m);
  check(contrast(f.at(m.x + m.width / 2, m.y + m.height - 3), fill) < 1.05, `${name} the listbox is painted the popover token`);
  let edge = f.at(m.x, m.y + m.height / 2);
  for (let x = m.x - 0.5; x <= m.x + 2; x += 0.5) if (contrast(f.at(x, m.y + m.height / 2), border) < contrast(edge, border)) edge = f.at(x, m.y + m.height / 2);
  check(contrast(edge, border) < 1.1, `${name} its edge is drawn in the full border token`, `${edge} vs ${border}`);
  check((await page.locator(subject.field).evaluate((el) => el === document.activeElement)) && (await page.locator(subject.field).getAttribute("aria-activedescendant")) === ids.keyboard, `${name} focus stays on the field; the active descendant is the keyboard highlight`);

  // rest, keyboard highlight
  const kb = await box(page, sel(ids.keyboard));
  const rb = await box(page, sel(ids.rest));
  const restFill = f.at(...fillPoint(rb, rtl));
  check(contrast(restFill, fill) < 1.03, `${name} rest: an option paints nothing of its own`, `${restFill} vs ${fill}`);
  const kbFill = f.at(...fillPoint(kb, rtl));
  check(contrast(kbFill, fill) > 1.03, `${name} keyboard highlight: the state layer is drawn`, `${r2(contrast(kbFill, fill))}:1`);
  const kbRing = strongest(f, kbFill, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2]);
  check(kbRing >= 3, `${name} keyboard highlight: an inset ring clears 3:1 against the layer`, `${r2(kbRing)}:1`);
  const kbRingAt = f.at(...ringPoint(kb));

  // chosen, not highlighted: a mark, no layer; unchosen: no mark
  const markInk = (fr, mk) => {
    let ink = 1;
    for (let y = mk.y + 2; y <= mk.y + mk.height - 2; y += 0.5) ink = Math.max(ink, strongest(fr, fill, [mk.x + 1, y], [mk.x + mk.width - 1, y]));
    return ink;
  };
  const cb = await box(page, sel(ids.chosen));
  const cm = await box(page, `${sel(ids.chosen)} .kx-option__indicator`);
  const markAtStart = rtl ? cb.right - cm.right <= 12 : cm.left - cb.left <= 12;
  const chosenInk = markInk(await frame(page, cm), cm);
  check(chosenInk >= 3 && markAtStart, `${name} selected: a check mark at the inline start that clears 3:1`, `${r2(chosenInk)}:1`);
  check(contrast(f.at(...fillPoint(cb, rtl)), fill) < 1.03, `${name} selected but not highlighted: no state layer — chosen and highlighted look different`);
  const rm = await box(page, `${sel(ids.rest)} .kx-option__indicator`);
  check(markInk(await frame(page, rm), rm) < 1.5, `${name} unselected: no mark`);

  // the pointer on the keyboard-highlighted option: the same layer, no ring
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await rest(page);
  const f2 = await frame(page, m);
  const ptFill = f2.at(...fillPoint(kb, rtl));
  check(contrast(ptFill, fill) > 1.03 && contrast(ptFill, kbFill) < 1.03, `${name} hover: the same state layer as the keyboard highlight`, `${r2(contrast(ptFill, fill))}:1 over the surface`);
  const ptRing = strongest(f2, ptFill, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2]);
  const differs = contrast(f2.at(...ringPoint(kb)), kbRingAt);
  check(ptRing < 1.5 && differs >= 3, `${name} hover draws NO ring: keyboard and pointer highlights look different`, `ring ${r2(ptRing)}:1 under the pointer; keyboard vs pointer edge ${r2(differs)}:1`);

  // disabled: dimmed, and the pointer paints nothing over it
  const db = await box(page, sel(ids.disabled));
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await rest(page);
  const f4 = await frame(page, m);
  const opacity = Number(await style(page, sel(ids.disabled), "opacity"));
  const want = await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--opacity-disabled")) || null);
  check(want !== null && Math.abs(opacity - want) < 0.01, `${name} disabled: drawn at the disabled opacity`, `${opacity} (token ${want})`);
  check(contrast(f4.at(...fillPoint(db, rtl)), fill) < 1.03, `${name} disabled: a pointer over it paints no layer`);
  await close();
}
const LISTBOXES = [
  {
    slug: "select",
    field: "#sel-trigger",
    // choose Apricot first, then reopen and move the highlight off it
    prepare: async (page) => {
      await keyboardFocus(page, "#sel-trigger");
      for (const k of ["ArrowDown", "ArrowDown", "Enter"]) await key(page, k);
    },
    keys: ["ArrowDown", "ArrowDown"],
    surface: "#sel-content",
    ids: async () => ({ keyboard: "sel-banana", chosen: "sel-apricot", rest: "sel-cherry", disabled: "sel-blueberry" }),
  },
  {
    slug: "multi-select",
    field: "#ms-input",
    keys: ["ArrowDown"],
    surface: "#ms .kx-option-popup",
    // Bug is highlighted, Design and Documentation are chosen, Research is neither, Blocked is disabled
    ids: (page) =>
      page.locator("#ms .kx-option-popup [role=option]").evaluateAll((os) => ({ keyboard: os[0].id, chosen: os[1].id, disabled: os[3].id, rest: os[4].id })),
  },
];
async function forcedListbox(theme) {
  const { page, close } = await open(theme, { forced: true, at: listServer });
  const canvas = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  await keyboardFocus(page, "#sel-trigger");
  await key(page, "ArrowDown");
  const kb = await box(page, "#sel-apple");
  const f = await frame(page, kb);
  const ring = strongest(f, canvas, [kb.x + kb.width / 2, kb.y + 0.5], [kb.x + kb.width / 2, kb.y + 2.5]);
  check(ring >= 3, `${theme} forced colours: the highlighted option still draws its outline`, `${r2(ring)}:1`);
  await close();
}

for (const theme of ["light", "dark"]) {
  report.push(`\nAngular · ${theme}`);
  for (const rtl of [false, true]) {
    if (COVERS.has("dropdown-menu")) await dropdown(theme, rtl);
    if (COVERS.has("menubar")) await menubar(theme, rtl);
  }
  if (COVERS.has("context-menu")) await context(theme);
  if (COVERS.has("dropdown-menu")) await forced(theme);
  for (const rtl of [false, true]) for (const subject of LISTBOXES) if (COVERS.has(subject.slug)) await listbox(theme, rtl, subject);
  if (COVERS.has("select")) await forcedListbox(theme);
}

await browser.close();
server.close();
listServer.close();
rmSync(dir, { recursive: true, force: true });
rmSync(listDir, { recursive: true, force: true });
console.log(report.join("\n"));
if (failures.length) {
  console.error(`\n✗ menu-visual: ${failures.length} contract failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nmenu-visual ok — the menu item and listbox option state contract holds for Angular, in light and dark, LTR and RTL, on rendered pixels.");
