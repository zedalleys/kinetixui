/**
 * large-text.mjs — the selection controls still work when the reader's text is twice the size.
 *
 *   node scripts/large-text.mjs        (needs apps/docs/storybook-static)
 *
 * ── Why this is a browser script and not a unit test ────────────────────────
 *
 * `largeText` was 0 for every React component in verification.json, and it is the one evidence kind that
 * cannot be earned in jsdom: jsdom has no layout, so a test there can assert that a class says `rem` but
 * never that the control actually grew. A claim of "works at 200% text" backed by a string comparison is
 * the kind of evidence this repository exists not to produce.
 *
 * So this measures. Each subject is rendered in Chromium at the default root size and again with the root
 * font size doubled — which is what a reader does when they raise their browser's default font size, and
 * what distinguishes a control sized in `rem` from one sized in `px`.
 *
 * ── The failure it was written for ──────────────────────────────────────────
 *
 * Checkbox and RadioGroupItem were `size-[18px]`. At a 200% default font size their labels doubled and the
 * boxes did not:
 *
 *     checkbox     18x18 -> 18x18   ratio 1.00
 *     radio        18x18 -> 18x18   ratio 1.00
 *     switch       48x24 -> 96x48   ratio 2.00
 *
 * The control halved in size relative to its own text, and its touch target went with it. Switch, Toggle
 * and ToggleGroup were already rem-based and scaled correctly, which is what made the other two visible as
 * defects rather than as a house style.
 *
 * ── What it claims ─────────────────────────────────────────────────────────
 *
 * Subjects are named beside their lists below — a marked passage runs from its marker to the end of the
 * file, so the names that decide the claim have to live after it, not here. The claim and the measurement
 * are therefore two lists that could drift apart, and `assertClaimMatchesSubjects()` reads this file back
 * and fails if they ever do.
 *
 * ── Two families, two models, and why one ratio will not do ─────────────────
 *
 * A selection control is a box whose whole job is to be a box: a checkbox that does not grow with its own
 * label has shrunk relative to it, so `height x 2` is the right question and 1.00 is the bug.
 *
 * A text field is not that. Its width comes from its container and its height from its content plus its
 * padding, so a field that goes 46px -> 70px has done the right thing and would fail a 1.8 ratio rule.
 * Demanding 2.0 of a field would be demanding a redesign in the name of a requirement that does not exist.
 * What a field is held to instead is what a reader at 200% actually needs: its own text grows, its box
 * absorbs that growth, nothing is clipped or truncated, an overlay still fits on screen, and a label, its
 * help text and its error message do not collide. The last of those is a rule no ratio could express.
 *
 * ── Why five form controls are measured but not claimed ─────────────────────
 *
 * The second rule above is the one that bites, and it exposed something bigger than this file's subjects.
 * `packages/ui/tailwind.config.ts` carries the Material-3 type scale as **px** —
 * `"body-md": ["14px", { lineHeight: "20px" }]` — while Tailwind's own `text-sm` is `0.875rem`. Measured
 * at a 32px root:
 *
 *     Label (text-sm)                14px -> 28px
 *     FormLabel / FormDescription    14px -> 28px
 *     InputOTP slot (text-sm)        14px -> 28px
 *     Input / Textarea (body-md)     14px -> 14px
 *     Select's value (body-md)       14px -> 14px
 *     MultiSelect's chips (label-sm) 12px -> 12px
 *
 * So inside one field the label doubles and the value it labels does not: at 200% a form reads at 28px
 * with its own answers at 14px. That is the type scale's defect, not these components' — every component
 * using the scale has it — and converting the scale is a library-wide change whose consequences at 200%
 * are unverified for the other 89 components. It is recorded as a finding and left to its own slice.
 *
 * ── Overlays, which have to be opened before there is anything to measure ───
 *
 * An overlay's geometry at 200% text is not a property of its trigger, so measuring the closed story
 * would measure a button. Each surface is opened through the shared declaration in open-states.mjs —
 * the same one the axe pass uses, so there is one definition of "open" and one place that waits for it —
 * and then judged on whether it is still usable rather than on whether it grew:
 *
 *   the surface stays inside the viewport,         a dialog that grows off-screen loses its buttons
 *   the page gains no horizontal scroll,           sideways scrolling to read a menu is not reading it
 *   nothing inside it is clipped,                  a label cropped to "Cont…" is not a label
 *   its own text actually grew.                    the type-scale rule from the form family, unchanged
 *
 * Measured at desktop width, at phone width, and under RTL — the last because an overlay is positioned,
 * and a positioned surface is where mirroring goes wrong in a way no class check can see.
 *
 * ── And once at phone width ─────────────────────────────────────────────────
 *
 * Every form control is also loaded at 390px and doubled there, because a control can absorb its text
 * perfectly well at desktop width and still push the page sideways on a phone. One did: six InputOTP slots
 * at 72px make a 432px row, and the document gained 106px of horizontal scrolling — a reader with large
 * text scrolling left and right to type an SMS code. The slots wrap now, and this is the measurement that
 * says so.
 *
 * What must not happen meanwhile is those five quietly counting as large-text-verified. They are measured
 * here in full, and every rule except text growth is asserted against them; `TEXT_SCALE_PENDING` names
 * them, and the check fails if one of them *starts* scaling — so the day the scale is fixed, this file is
 * forced to notice rather than being free to keep understating.
 *
 * The overlay family is measured open too, through the declaration in open-states.mjs; its members are
 * named beside the pass itself, below, for the same reason the other two families are.
 *
 * kx-verify: largeText
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { OPEN_STATES, openSurface } from "./open-states.mjs";
import { coverageForRoot } from "./covered-slugs.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
// The same extractor gen-verification awards the evidence with, built from the same manifest, so the
// claim below is checked by the function that reads it rather than by a regex that resembles one.
const { coveredSlugs } = coverageForRoot(root);

if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(1);
}

// Most stories import the built package, so a measurement taken against a stale `dist` would be
// evidence about code that is no longer in the repository. See scripts/ui-dist-stamp.mjs.
assertUiDistMatchesSource("large-text");

/**
 * The selection-control family: <Checkbox>, <RadioGroup>, <Switch>, <Toggle> and <ToggleGroup>.
 *
 * `gen-verification.mjs` reads those names out of this passage to decide what the `largeText` claim covers.
 * Each subject below names the story to render and the element carrying the control's own box — the thing
 * whose size is the hit target, not the label beside it.
 */
const SUBJECTS = [
  { component: "Checkbox", story: "form-inputs-checkbox--default", control: "[role=checkbox]" },
  { component: "RadioGroup", story: "form-inputs-radiogroup--default", control: "[role=radio]" },
  { component: "Switch", story: "form-inputs-switch--default", control: "[role=switch]" },
  { component: "Toggle", story: "controls-actions-toggle--default", control: "button[data-state]" },
  { component: "ToggleGroup", story: "controls-actions-togglegroup--default", control: "button[data-state]" },
];

/**
 * The form family. Claimed for `largeText`: <Slider>, <InputOTP> and <Label>.
 *
 * Input, Textarea, Select, MultiSelect and Form are measured too, and named in `TEXT_SCALE_PENDING`
 * rather than in angle brackets, because `gen-verification.mjs` reads the bracketed names out of this
 * passage as the claim — a component whose text cannot grow must not appear in it.
 *
 * `control` is the box that must absorb its text, `text` the element that actually renders the
 * user-visible text (a trigger's font-size is inherited and says nothing about the span inside it).
 * `model: "control"` switches to the selection-control rule for subjects with no text of their own.
 * `opens` names a trigger to click so an overlay is on screen at 200%, `inside` descendants that must
 * stay within their container, and `stack` a field column whose parts must not collide.
 */
const FORM_SUBJECTS = [
  { component: "Input", story: "form-inputs-input--playground", control: "input", text: "input" },
  { component: "Textarea", story: "form-inputs-textarea--playground", control: "textarea", text: "textarea" },
  {
    component: "Select",
    story: "form-inputs-select--default",
    control: "[role=combobox]",
    text: "[role=combobox] span",
    opens: "[role=combobox]",
    overlay: "[role=listbox]",
  },
  { component: "Slider", story: "form-inputs-slider--default", control: "[role=slider]", model: "control" },
  {
    component: "InputOTP",
    story: "form-inputs-inputotp--default",
    control: "[class*='size-9']",
    model: "control",
    text: "[class*='size-9']",
    // At phone width and 2x text these wrap, and a row that wraps has to be closed at the end it starts
    // from. The first spelling of the fix left the second row's outer start edge with no border at all.
    closed: "[class*='size-9']",
  },
  {
    component: "MultiSelect",
    story: "form-inputs-multiselect--default",
    control: "[role=combobox]",
    text: "[role=combobox] span",
    inside: "[role=combobox] > *",
  },
  { component: "Label", story: "foundations-label--default", control: "label", text: "label" },
  // The Form story is the one place a label, a control, its help text and its error message share a
  // column, which is where 200% text makes them collide if anything in that stack is sized in px.
  { component: "Form", story: "form-inputs-form--default", control: "input", text: "input", stack: "form" },
];

/**
 * Form controls whose visible text is pinned by the px type scale described above. Every other rule is
 * asserted against them; they simply do not earn the `largeText` claim while their text cannot grow.
 * The list is checked in both directions, so it shrinks by failing rather than by being remembered.
 */
const TEXT_SCALE_PENDING = new Set(["Input", "Textarea", "Select", "MultiSelect", "Form"]);

/** 200% is the resize target WCAG 1.4.4 names, and the size at which a px control is unmistakably wrong. */
const SCALE = 2;
/** Allow for sub-pixel rounding and borders; a control that scales lands far above this, a px one at 1.00. */
const MIN_RATIO = 1.8;
/** WCAG 2.5.8 target size (minimum). A control that stops meeting it when text grows has regressed. */
const MIN_TARGET = 24;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(staticDir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

/**
 * The verification claim is derived from prose; the measurements are derived from the subject lists.
 * Nothing otherwise keeps the two in step, and a claim that outruns its measurement is the exact failure
 * this whole evidence model exists to prevent — so it is checked rather than trusted.
 */
/** `Checkbox` -> `checkbox`, `InputOTP` -> `input-otp`: the manifest's spelling, which coveredSlugs returns. */
const SLUG_OF = { InputOTP: "input-otp", RadioGroup: "radio-group", ToggleGroup: "toggle-group", MultiSelect: "multi-select", AlertDialog: "alert-dialog", DropdownMenu: "dropdown-menu", ContextMenu: "context-menu" };
const slugOf = (name) => SLUG_OF[name] ?? name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function assertClaimMatchesSubjects() {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  // The same region gen-verification.mjs reads: a passage runs from its marker to the end of the file.
  const passage = self.slice(self.indexOf("kx-verify: largeText"));
  // And read with the same function that awards the evidence, rather than a regex that resembles it.
  // The earlier version here matched only `<Component>`, while gen-verification also reads `Kinetix*`
  // and `Name(` — so a single word in a comment, "the direction provider", quietly credited
  // direction-provider with a large-text measurement that had never been taken. A claim check that does
  // not use the extractor is a second opinion about what the extractor will do.
  const named = coveredSlugs(passage, "React");
  // The claim is what is measured AND passes the text-growth rule — a pending subject is measured in
  // full but must not reach verification.json, so it must not be named in the passage at all.
  const claimed = new Set(
    [...SUBJECTS, ...FORM_SUBJECTS, ...OPEN_STATES]
      .map((s) => s.component ?? s)
      .filter((c) => !TEXT_SCALE_PENDING.has(c))
      .map(slugOf),
  );
  const missing = [...claimed].filter((c) => !named.has(c));
  const extra = [...named].filter((c) => !claimed.has(c));
  if (missing.length || extra.length) {
    console.error(
      "large-text: the verification claim and the measured subjects disagree.\n" +
        (missing.length ? `  measured but not claimed: ${missing.join(", ")}\n` : "") +
        (extra.length
          ? `  claimed but not measured, or claimed while pending: ${extra.join(", ")}\n`
          : ""),
    );
    process.exit(1);
  }
}
assertClaimMatchesSubjects();

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const problems = [];
const rows = [];
const formRows = [];
const narrowRows = [];

/** Open a story at the default root size; the caller doubles it. */
async function open(story, waitFor) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto(`${base}/iframe.html?id=${story}&viewMode=story`, { waitUntil: "networkidle" });
  await page.waitForSelector(waitFor, { timeout: 15_000 });
  return page;
}

const setRootFontSize = (page, px) => page.evaluate((v) => { document.documentElement.style.fontSize = `${v}px`; }, px);

for (const subject of SUBJECTS) {
  const page = await open(subject.story, subject.control);

  const measure = () =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      return {
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        // Horizontal scrolling caused by a control growing is its own failure, separate from the size.
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Clipped content: an ancestor that cannot grow crops the control rather than resizing with it.
        clipped: (() => {
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.overflow !== "visible" && n.scrollHeight > n.clientHeight + 1) return true;
          }
          return false;
        })(),
      };
    }, subject.control);

  const before = await measure();
  await setRootFontSize(page, 16 * SCALE);
  // Let layout settle before reading geometry back.
  await page.waitForTimeout(200);
  const after = await measure();
  await page.close();

  const ratio = before.h > 0 ? after.h / before.h : 0;
  const where = `${subject.component} (${subject.story})`;
  if (ratio < MIN_RATIO) {
    problems.push(`${where}: control did not grow with the text — ${before.w}x${before.h} -> ${after.w}x${after.h} (ratio ${ratio.toFixed(2)}, expected >= ${MIN_RATIO}). A px size does this; use rem.`);
  }
  if (after.overflowX !== 0) problems.push(`${where}: ${after.overflowX}px of horizontal overflow at ${SCALE}x text.`);
  if (after.clipped) problems.push(`${where}: an ancestor clips the control at ${SCALE}x text.`);
  if (Math.min(after.w, after.h) < MIN_TARGET) {
    problems.push(`${where}: target shrank below ${MIN_TARGET}px at ${SCALE}x text (${after.w}x${after.h}).`);
  }
  rows.push(`  ${subject.component.padEnd(12)} ${before.w}x${before.h} -> ${after.w}x${after.h}  ratio ${ratio.toFixed(2)}`);
}

for (const subject of FORM_SUBJECTS) {
  const page = await open(subject.story, subject.control);

  const measure = (sel, textSel, inside, stack) =>
    page.evaluate(([s, textSelector, insideSel, stackSel]) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      const textEl = textSelector ? document.querySelector(textSelector) : null;
      // A field is clipped when its own content does not fit the space it reports having. A textarea
      // scrolls by design, so its own overflow is excluded and only its box growth is judged.
      const scrolls = getComputedStyle(el).overflowY === "auto" || el.tagName === "TEXTAREA";
      const truncated = !scrolls && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
      const escaped = insideSel
        ? [...document.querySelectorAll(insideSel)].filter((child) => {
            const c = child.getBoundingClientRect();
            const p = child.parentElement.getBoundingClientRect();
            return c.right > p.right + 1 || c.bottom > p.bottom + 1 || c.left < p.left - 1 || c.top < p.top - 1;
          }).length
        : 0;
      // Within one field's column, no two of label / control / help / error may share pixels.
      const collisions = (() => {
        if (!stackSel) return 0;
        const root = document.querySelector(stackSel);
        if (!root) return 0;
        const boxes = [...root.querySelectorAll("label, input, textarea, p")].map((n) => n.getBoundingClientRect());
        let hits = 0;
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            // 1px of tolerance: adjacent boxes legitimately share an edge.
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits++;
          }
        }
        return hits;
      })();
      return {
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        fontSize: textEl ? parseFloat(getComputedStyle(textEl).fontSize) : 0,
        truncated,
        escaped,
        collisions,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, [sel, textSel ?? null, inside ?? null, stack ?? null]);

  const before = await measure(subject.control, subject.text, subject.inside, subject.stack);
  await setRootFontSize(page, 16 * SCALE);
  await page.waitForTimeout(200);
  const after = await measure(subject.control, subject.text, subject.inside, subject.stack);

  const where = `${subject.component} (${subject.story})`;
  const textGrowth = after.fontSize - before.fontSize;
  const boxGrowth = after.h - before.h;
  const pending = TEXT_SCALE_PENDING.has(subject.component);

  if (subject.model === "control") {
    // No text of its own to judge, so the selection-control rule applies: the box itself must scale.
    const ratio = before.h > 0 ? after.h / before.h : 0;
    if (ratio < MIN_RATIO) {
      problems.push(`${where}: control did not grow with the text — ${before.w}x${before.h} -> ${after.w}x${after.h} (ratio ${ratio.toFixed(2)}, expected >= ${MIN_RATIO}).`);
    }
  } else if (pending) {
    // The claim is withheld from these, so the thing to enforce is that the reason still holds. If the
    // type scale is converted to rem, this fires and the list has to shrink.
    if (textGrowth > 1) {
      problems.push(
        `${where}: its text now scales (${before.fontSize}px -> ${after.fontSize}px), so it no longer ` +
          `belongs in TEXT_SCALE_PENDING — remove it there and add <${subject.component}> to the claim.`,
      );
    }
  } else {
    if (textGrowth < before.fontSize * (MIN_RATIO - 1)) {
      problems.push(
        `${where}: its text did not grow with the reader's — ${before.fontSize}px -> ${after.fontSize}px. ` +
          `A px font size does this; use rem.`,
      );
    }
    // Whatever the text gained, the box absorbed. A box pinned in px gains nothing and fails here; a box
    // whose padding stays put but whose height follows the text passes, which is the correct outcome.
    if (boxGrowth + 1 < textGrowth) {
      problems.push(
        `${where}: the box did not absorb its own text at ${SCALE}x — text grew ${textGrowth.toFixed(1)}px, ` +
          `the box grew ${boxGrowth.toFixed(1)}px (${before.w}x${before.h} -> ${after.w}x${after.h}).`,
      );
    }
  }

  // These hold for every form control, claimed or pending: a reader at 200% meets them either way.
  if (after.truncated) problems.push(`${where}: content no longer fits the control at ${SCALE}x text.`);
  if (after.escaped) problems.push(`${where}: ${after.escaped} element(s) sit outside their container at ${SCALE}x text.`);
  if (after.collisions) problems.push(`${where}: ${after.collisions} overlapping label/help/error box(es) at ${SCALE}x text.`);
  if (after.overflowX !== 0) problems.push(`${where}: ${after.overflowX}px of horizontal overflow at ${SCALE}x text.`);
  if (Math.min(after.w, after.h) < MIN_TARGET) {
    problems.push(`${where}: target is under ${MIN_TARGET}px at ${SCALE}x text (${after.w}x${after.h}).`);
  }

  // An overlay-bearing control is only usable at 200% if its overlay still fits on screen.
  let overlayNote = "";
  if (subject.opens) {
    await page.click(subject.opens);
    await page.waitForSelector(subject.overlay, { timeout: 10_000 });
    await page.waitForTimeout(150);
    const fit = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        offscreen: r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1,
        empty: r.width < 1 || r.height < 1,
      };
    }, subject.overlay);
    if (fit.offscreen) problems.push(`${where}: its overlay does not fit the viewport at ${SCALE}x text (${fit.w}x${fit.h}).`);
    if (fit.empty) problems.push(`${where}: its overlay has no size at ${SCALE}x text.`);
    overlayNote = `  overlay ${fit.w}x${fit.h}`;
  }

  await page.close();
  formRows.push(
    `  ${subject.component.padEnd(12)}${pending ? " *" : "  "} ${before.w}x${before.h} -> ${after.w}x${after.h}  ` +
      `${before.fontSize ? `text ${before.fontSize}px -> ${after.fontSize}px, ` : "no text of its own, "}` +
      `box +${boxGrowth.toFixed(0)}px${overlayNote}`,
  );
}

/**
 * Phone width, doubled. Only the page-level consequence is judged here: a control that needs more room
 * than the viewport has must find it by wrapping or scrolling itself, not by making the whole document
 * scroll sideways.
 */
const NARROW = { width: 390, height: 844 };
for (const subject of FORM_SUBJECTS) {
  const page = await browser.newPage({ viewport: NARROW });
  await page.goto(`${base}/iframe.html?id=${subject.story}&viewMode=story`, { waitUntil: "networkidle" });
  await page.waitForSelector(subject.control, { timeout: 15_000 });
  await setRootFontSize(page, 16 * SCALE);
  await page.waitForTimeout(200);
  const { overflowX, open, rows } = await page.evaluate((closedSel) => {
    const parts = closedSel ? [...document.querySelectorAll(closedSel)] : [];
    // `:first-child` is the first element in the DOM, not the first on each visual row, so a wrapped row
    // can begin with no border on the side it begins from. Every part must carry all four.
    const open = parts.filter((el) => {
      const cs = getComputedStyle(el);
      return [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].some(
        (w) => parseFloat(w) === 0,
      );
    }).length;
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      open,
      rows: new Set(parts.map((el) => Math.round(el.getBoundingClientRect().y))).size,
    };
  }, subject.closed ?? null);
  if (overflowX > 0) {
    problems.push(
      `${subject.component} (${subject.story}): ${overflowX}px of horizontal page overflow at ` +
        `${NARROW.width}px wide and ${SCALE}x text.`,
    );
  }
  if (open > 0) {
    problems.push(
      `${subject.component} (${subject.story}): ${open} part(s) have an unbordered edge at ` +
        `${NARROW.width}px wide and ${SCALE}x text — a wrapped row is open at one end.`,
    );
  }
  narrowRows.push(
    `  ${subject.component.padEnd(12)} overflowX ${overflowX}px` +
      (subject.closed ? `, ${rows} row(s), every edge bordered` : ""),
  );
  await page.close();
}

/** A pending entry that is not measured at all would be an exclusion nobody checks. */
for (const name of TEXT_SCALE_PENDING) {
  if (!FORM_SUBJECTS.some((s) => s.component === name)) {
    problems.push(`TEXT_SCALE_PENDING names ${name}, which is not among the measured form controls.`);
  }
}

/**
 * Overlays: <Dialog>, <AlertDialog>, <Sheet>, <Drawer>, <Modal>, <Popover>, <Tooltip>, <DropdownMenu>,
 * <ContextMenu> and <Menubar> — opened, then measured at 1x and 2x, at desktop and phone width, in both
 * directions. Named here rather than in the file header because the claim is the passage from the marker
 * to the end of the file, and the header is above it: names written there are read by nobody.
 *
 * `TEXT_SCALE_PENDING` applies here too — an overlay whose body copy is `text-body-md` cannot grow its
 * text until the type scale is converted, and saying otherwise would be the same overstatement the form
 * family's list exists to prevent. Which overlays those are is measured below rather than assumed.
 */
const VIEWPORTS = [
  { label: "desktop", width: 1024, height: 768 },
  { label: "phone", width: NARROW.width, height: NARROW.height },
];
const overlayRows = [];
for (const entry of OPEN_STATES) {
  for (const viewport of VIEWPORTS) {
    for (const dir of ["ltr", "rtl"]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const where = `${entry.component} (${viewport.label}/${dir})`;
      try {
        await page.goto(`${base}/iframe.html?id=${entry.story}&viewMode=story`, { waitUntil: "load" });
        await page.waitForFunction(() => document.body.classList.contains("sb-show-main"), null, { timeout: 20_000 });
        // Direction on the document element, which is where an RTL app sets it and the only place a
        // portaled surface can inherit it from — it is a child of <body>, not of the component's tree.
        await page.evaluate((d) => { document.documentElement.dir = d; }, dir);

        const before = await openSurface(page, entry);
        const beforeFont = await page.evaluate((sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize), entry.surface);
        await page.keyboard.press("Escape");
        await page.waitForSelector(entry.surface, { state: "detached", timeout: 10_000 });

        await setRootFontSize(page, 16 * SCALE);
        const after = await openSurface(page, entry);
        const afterFont = await page.evaluate((sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize), entry.surface);
        const computedDir = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).direction, entry.surface);

        const stampedDir = await page.evaluate((sel) => document.querySelector(sel).getAttribute("dir"), entry.surface);
        if (entry.stampsDir) {
          // These resolve direction from React context and write it onto the content, which overrides
          // whatever the document says. With no direction provider wrapping the story there is nothing
          // for them to read, so the correct expectation is the stamp itself — not the document's dir.
          if (!stampedDir) {
            problems.push(`${where}: expected this surface to carry its own dir attribute (see stampsDir in open-states.mjs); it has none.`);
          }
        } else if (computedDir !== dir) {
          problems.push(`${where}: the portaled surface computes direction ${computedDir} with the document set to ${dir}.`);
        }
        if (after.overflowX !== 0) problems.push(`${where}: ${after.overflowX}px of horizontal page overflow at ${SCALE}x text.`);
        if (after.offscreen) problems.push(`${where}: the open surface does not fit the viewport at ${SCALE}x text (${after.w}x${after.h}).`);
        if (after.clipped) problems.push(`${where}: content inside the open surface is clipped at ${SCALE}x text.`);
        if (!TEXT_SCALE_PENDING.has(entry.component) && afterFont < beforeFont * (MIN_RATIO - 1) + beforeFont - 0.5) {
          problems.push(`${where}: the surface's own text did not grow — ${beforeFont}px -> ${afterFont}px.`);
        }
        overlayRows.push(
          `  ${entry.component.padEnd(14)} ${viewport.label.padEnd(7)} ${dir}  ${before.w}x${before.h} -> ${after.w}x${after.h}  ` +
            `text ${beforeFont}px -> ${afterFont}px  dir=${computedDir}${entry.stampsDir ? ` (stamped ${stampedDir})` : ""}  overflowX=${after.overflowX}px`,
        );
      } catch (err) {
        problems.push(`${where}: ${String(err.message).split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
  }
}

await browser.close();
server.close();

console.log(`large-text — ${SUBJECTS.length} selection controls at ${SCALE}x the default font size:`);
for (const r of rows) console.log(r);
console.log(`large-text — ${FORM_SUBJECTS.length} form controls at ${SCALE}x the default font size:`);
for (const r of formRows) console.log(r);
console.log(`  (* text pinned by the px type scale — measured, not claimed; see TEXT_SCALE_PENDING)`);
console.log(`large-text — the same controls at ${NARROW.width}px wide and ${SCALE}x text:`);
for (const r of narrowRows) console.log(r);
console.log(`large-text — ${OPEN_STATES.length} overlays opened and measured at ${SCALE}x text, both widths, both directions:`);
for (const r of overlayRows) console.log(r);

if (problems.length) {
  console.error(`\nlarge-text FAILED:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `large-text ok — ${SUBJECTS.length} selection controls scaled with the text; ` +
    `${FORM_SUBJECTS.length - TEXT_SCALE_PENDING.size} form controls grew their own text and ` +
    `${TEXT_SCALE_PENDING.size} are still pinned by the type scale. None clipped, overlapped, escaped its ` +
    `container or overflowed the page, and every overlay fitted the viewport.`,
);
