/**
 * angular-browser.mjs — @kinetixui/angular, running as a live Angular application in real Chromium.
 *
 *   pnpm build:tokens && node scripts/angular-browser.mjs
 *   node scripts/angular-browser.mjs --only=accessibility     one pass (accessibility | interaction | rtl | largeText | reducedMotion)
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * Until this file, every Angular interaction and accessibility claim in verification.json came from jsdom:
 * no layout, no stylesheet, no focus-visible, no real keyboard. React's equivalent evidence comes from a
 * browser (scripts/a11y-browser.mjs, large-text.mjs, motion.mjs), and the graduation contract
 * (ANGULAR-GRADUATION.md) holds Angular to the same instruments. jsdom evidence does not stand in for them.
 *
 * ── What it renders ──────────────────────────────────────────────────────────
 *
 * The Angular browser harness (packages/ui-angular/browser): Vite + the Angular compiler build the package's
 * own fixtures (src/fixtures) AOT with strict templates, and the page bootstraps one of them as a zoneless
 * Angular application, with the generated token CSS and the package's styles.css linked byte for byte. Every
 * page proves it is Angular before anything is measured: the root carries Angular's `ng-version` stamp, and
 * the harness reports which public directives' compiled selectors actually matched the DOM. A gate here
 * never renders hand-written markup that resembles a component.
 *
 * ── How evidence is attributed ──────────────────────────────────────────────
 *
 * Each pass is a marked passage (`kx-verify: <kind>`, read by gen-verification.mjs). The components a passage
 * claims are the KinetixUI symbols named in it — the same extractor gen-verification uses (covered-slugs.mjs)
 * — and before any browser opens, `assertClaims()` reads this file back and fails if a passage names a
 * component it does not measure, or measures one it does not name. A representative is never allowed to
 * stand in for its family: each subject is driven on its own.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs; KX_ANGULAR_HARNESS_DIR
 * reuses a harness already built by packages/ui-angular/browser/build.mjs.
 */
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { reducedMotionViolations, describeAnimation } from "./a11y-animations.mjs";
import { coverageForRoot } from "./covered-slugs.mjs";
import { buildAngularHarness, contrast, framer, serveStatic, settleAngular, waitForAngular } from "./visual-harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(`${root}/components.manifest.json`, "utf8"));
const { coveredSlugs } = coverageForRoot(root);
const implemented = Object.keys(manifest.components).filter((s) => manifest.components[s].platforms.includes("Angular"));
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const runs = (pass) => !ONLY || ONLY === pass;
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/* ── the claim check ─────────────────────────────────────────────────────── */

/** The text of the passage that starts at `kx-verify: <kind>` and runs to the next marker (gen-verification's rule). */
function passage(kind) {
  const start = self.indexOf(`kx-verify: ${kind}\n`);
  if (start === -1) throw new Error(`angular-browser: no kx-verify: ${kind} passage`);
  const next = self.indexOf("kx-verify:", start + 12);
  return self.slice(start, next === -1 ? undefined : next);
}
const slugOf = (symbol) => {
  const hit = [...coveredSlugs(symbol, "Angular")];
  if (hit.length !== 1) throw new Error(`angular-browser: ${symbol} does not name exactly one component (${hit.join(", ") || "none"})`);
  return hit[0];
};
/**
 * A passage's claim (what gen-verification will read out of it) must equal what the passage measures. Both
 * directions fail: a name with no measurement is an over-claim, a measurement with no name is evidence that
 * silently goes nowhere.
 */
function assertClaims(kind, subjects) {
  const named = coveredSlugs(passage(kind), "Angular");
  const measured = new Set(subjects.map((s) => slugOf(s.component)));
  const over = [...named].filter((s) => !measured.has(s));
  const under = [...measured].filter((s) => !named.has(s));
  const unimplemented = [...measured].filter((s) => !implemented.includes(s));
  if (over.length || under.length || unimplemented.length) {
    console.error(
      `angular-browser: the ${kind} claim and its subjects disagree\n` +
        (over.length ? `  named but not measured: ${over.join(", ")}\n` : "") +
        (under.length ? `  measured but not named: ${under.join(", ")}\n` : "") +
        (unimplemented.length ? `  measured but not an Angular implementation in the manifest: ${unimplemented.join(", ")}\n` : ""),
    );
    process.exit(1);
  }
}

/* ── the page ────────────────────────────────────────────────────────────── */

const harnessDir = buildAngularHarness("angular-browser");
const server = await serveStatic(harnessDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const report = [];
const check = (ok, label, detail = "") => {
  report.push(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(66)} ${detail}`);
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  return ok;
};

/**
 * Open a fixture as a live Angular page. `dir` sets the document's direction (where an RTL application sets
 * it); `context` options carry the viewport, colour scheme, reduced motion and forced colours.
 */
async function open(context, fixture, { theme = "light", dir = null, demo = null } = {}) {
  const page = await context.newPage();
  await page.route((url) => !url.href.startsWith(server.base) && !url.href.startsWith("data:"), (route) => route.abort());
  const q = new URLSearchParams({ fixture, theme, ...(dir ? { dir } : {}), ...(demo ? { demo } : {}) });
  await page.goto(`${server.base}/index.html?${q}`, { waitUntil: "load" });
  await waitForAngular(page);
  return page;
}
const settle = (page) => settleAngular(page);
/** A key, then Angular's change detection, so what is read next is what the user would see. */
async function press(page, key) {
  await page.keyboard.press(key);
  await settle(page);
}
async function focus(page, selector) {
  // Keyboard modality first, so `:focus-visible` matches as it would after a Tab.
  await page.keyboard.press("Shift");
  await page.locator(selector).first().focus();
  await settle(page);
}
/** One subject's region in the behaviour fixture. */
const S = (subject) => `section[data-kx-subject=${subject}]`;
const out = (page, key) => page.locator(`output[data-kx-out="${key}"]`).innerText();
const activeId = (page) => page.evaluate(() => document.activeElement?.closest("[id]")?.id ?? null);

async function axe(page, scope = "kx-fixture") {
  await page.evaluate(axeSource);
  return page.evaluate(async (sel) => {
    // The same rule set as the React pass (a11y-browser.mjs): every rule on except the three that judge a
    // whole page's landmarks and heading outline, which a fixture showing one component does not have.
    const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
    const r = await window.axe.run(sel, opts);
    return r.violations.map((v) => ({ id: v.id, help: v.help, targets: v.nodes.map((n) => String(n.target)) }));
  }, scope);
}

async function liveAnimations(page) {
  return page.evaluate(() =>
    document.getAnimations().map((a) => {
      const timing = a.effect && a.effect.getComputedTiming();
      const target = a.effect && a.effect.target;
      return {
        name: a.animationName || a.transitionProperty || null,
        target: target ? target.tagName.toLowerCase() + (target.classList && target.classList.length ? `.${target.classList[0]}` : "") : null,
        durationMs: timing ? timing.duration : null,
        loops: timing ? timing.iterations === Infinity : false,
        playState: a.playState,
      };
    }),
  );
}

const STATE_FIXTURES = ["selection", "entry", "composite", "card", "behaviour", "navigation", "compositions"];

/**
 * axe findings that are correct for axe and wrong for WCAG, each with the reason — the same mechanism and the
 * same single finding as React's a11y-baseline.json. Keyed `<page>|<theme>|<rule>|<target>`, and checked in both
 * directions: an entry that stops occurring fails the run, so it is removed rather than left to hide a
 * different node later.
 */
const AXE_BASELINE = {
  'composite|light|color-contrast|kx-input-group[data-kx-case="disabled"] > kx-input-group-text':
    "The \"https://\" text add-on of the disabled InputGroup. The group's input is disabled, so the whole field takes " +
    "--opacity-disabled, and the add-on dims with it. WCAG 1.4.3 exempts text that is part of an inactive user " +
    "interface component; axe exempts only text inside a disabled control, and the add-on is a sibling of the input. " +
    "Dimming it is deliberate: a disabled field whose prefix stayed at full strength would read as half-enabled. " +
    "React carries the same entry (form-inputs-inputgroup--entry-states).",
  'composite|dark|color-contrast|kx-input-group[data-kx-case="disabled"] > kx-input-group-text': "Same finding as the light entry.",
};

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: accessibility
 * kx-verify-covers: packages/ui-angular/src/usage/examples.ts
 *
 * Every usage example — the code the website shows, which uses every implemented component — mounted live in
 * Chromium, in light and dark, with every axe rule on; then the state fixtures the visual gates measure
 * (disabled, invalid, checked, read-only), with axe again. The subjects are the examples file, so a
 * component with no example earns nothing here, and the run reconciles the file against the manifest and
 * against what actually rendered before it claims anything.
 *
 * Two behaviour checks only a browser can make ride along, as React's pass does: under
 * `prefers-reduced-motion` no example may leave a looping animation faster than 3s running, and under
 * `forced-colors: active` every focus stop must keep a visible indicator (box-shadow rings are removed in
 * that mode; an outline survives).
 * ════════════════════════════════════════════════════════════════════════════ */
if (runs("accessibility")) {
  const examplesCover = coveredSlugs(readFileSync(`${root}/packages/ui-angular/src/usage/examples.ts`, "utf8"), "Angular");
  const missingExamples = implemented.filter((s) => !examplesCover.has(s));
  check(missingExamples.length === 0, "every implemented component is used by a usage example", missingExamples.join(", "));

  const probe = await browser.newContext();
  const first = await open(probe, "usage");
  const { demos, exports: publicExports, ngVersion } = await first.evaluate(() => ({
    demos: window.kxHarness.demos,
    exports: window.kxHarness.exports,
    ngVersion: document.querySelector("kx-fixture").getAttribute("ng-version"),
  }));
  await first.close();
  await probe.close();
  report.push(`\naccessibility — ${demos.length} usage examples, Angular ${ngVersion}, ${publicExports.length} public directives/components`);

  const rendered = new Map(publicExports.map((e) => [e.name, 0]));
  const seenBaseline = new Set();
  const subjects = [...demos.map((demo) => ({ fixture: "usage", demo })), ...STATE_FIXTURES.map((fixture) => ({ fixture }))];
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, colorScheme: theme });
    for (const s of subjects) {
      const page = await open(context, s.fixture, { theme, demo: s.demo });
      const name = `${theme} ${s.demo ?? s.fixture}`;
      const counts = await page.evaluate(() =>
        window.kxHarness.exports.map((e) => ({ name: e.name, n: e.selector ? document.querySelectorAll(`kx-fixture :is(${e.selector})`).length : 0 })),
      );
      for (const c of counts) rendered.set(c.name, rendered.get(c.name) + c.n);
      const found = (await axe(page)).flatMap((v) => v.targets.map((target) => `${s.demo ?? s.fixture}|${theme}|${v.id}|${target}`));
      for (const key of found.filter((k) => AXE_BASELINE[k])) seenBaseline.add(key);
      const violations = found.filter((k) => !AXE_BASELINE[k]);
      check(violations.length === 0, `axe ${name}`, violations.map((k) => k.split("|").slice(2).join(" ")).join("; "));
      await page.close();
    }
    await context.close();
  }

  const stale = Object.keys(AXE_BASELINE).filter((k) => !seenBaseline.has(k));
  check(stale.length === 0, `every axe baseline entry still occurs (${Object.keys(AXE_BASELINE).length})`, stale.join("; "));

  // What rendered, not what was imported: every public directive matched the live DOM somewhere, and every
  // implemented component had at least one of its directives on a page axe read. A directive that sits on an
  // <ng-template> leaves no element behind, so it cannot match; it is named here, and the exemption is checked
  // in the other direction too — if one ever does match an element, it no longer belongs on this list.
  const TEMPLATE_DIRECTIVES = ["KxMarqueeContent"];
  for (const name of TEMPLATE_DIRECTIVES) check(rendered.get(name) === 0, `${name} lives on an <ng-template> (leaves no element)`, `${rendered.get(name)} element(s) matched`);
  const neverRendered = [...rendered].filter(([name, n]) => n === 0 && !TEMPLATE_DIRECTIVES.includes(name)).map(([name]) => name);
  check(neverRendered.length === 0, "every public directive/component rendered in the live DOM", neverRendered.join(", "));
  const renderedSlugs = new Set([...rendered].filter(([, n]) => n > 0).flatMap(([name]) => [...coveredSlugs(name, "Angular")]));
  const unrendered = implemented.filter((s) => !renderedSlugs.has(s));
  check(unrendered.length === 0, `all ${implemented.length} implemented components rendered and scanned`, unrendered.join(", "));

  // Reduced motion: nothing left looping fast.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
    for (const s of subjects) {
      const page = await open(context, s.fixture, { demo: s.demo });
      await page.waitForTimeout(150);
      const bad = reducedMotionViolations(await liveAnimations(page));
      check(bad.length === 0, `reduced motion ${s.demo ?? s.fixture}`, bad.map(describeAnimation).join("; "));
      await page.close();
    }
    await context.close();
  }

  // Forced colours: every focus stop keeps an indicator a forced palette cannot remove.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, forcedColors: "active", reducedMotion: "reduce" });
    for (const s of subjects) {
      const page = await open(context, s.fixture, { demo: s.demo });
      const missing = new Set();
      let stops = 0;
      for (let i = 0; i < 80; i++) {
        await press(page, "Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || !el.closest("kx-fixture")) return null;
          // A visually hidden native control (a radio inside a segment, toggle or rating) draws its ring on its
          // label; the one-time-code input, which paints nothing, draws it on the cell the next character goes in.
          const shown = el.matches(".kx-input-otp__input")
            ? el.closest("kx-input-otp").querySelector("[data-active]") ?? el
            : el.matches("input[type=radio]") && getComputedStyle(el).opacity === "0" ? el.labels?.[0] ?? el.nextElementSibling ?? el : el;
          const cs = getComputedStyle(shown);
          const visible = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
          const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}`;
          return { visible, name };
        });
        if (!stop) break;
        stops++;
        if (!stop.visible) missing.add(stop.name);
      }
      check(missing.size === 0, `forced colours ${s.demo ?? s.fixture} (${stops} focus stops)`, [...missing].join(", "));
      await page.close();
    }
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: interaction, accessibility
 *
 * The keyboard and behaviour contract of every interactive component, driven with a real keyboard in a real
 * browser (src/fixtures/behaviour.ts). Each subject is exercised on its own — a passing checkbox proves
 * nothing about a switch — and each change is read back twice: from the semantics the component renders
 * (role, name, state, focus, tab order) and from the application model it is bound to.
 *
 * Subjects, named so the claim resolves to exactly what is driven:
 *   actions      KxButton, KxFab, KxButtonGroup
 *   text entry   KxInput, KxLabel, KxField, KxTextarea, KxNativeSelect, KxNumberInput, KxPasswordInput,
 *                KxInputGroup, KxInputOtp
 *   selection    KxCheckbox, KxSwitch, KxRadioGroup, KxSegmentedControl, KxSlider, KxToggle, KxToggleGroup, KxRating
 *   navigation   KxTabs, KxCodeBlock, KxBreadcrumb, KxPagination, KxTableOfContents, KxTabBar, KxNavigationBar,
 *                KxAppBar (inline links when wide; below 48rem a Menu disclosure: aria-expanded, Escape, focus),
 *                KxFooter — links stay links, `aria-current` marks where you are, one Tab stop per destination
 *   disclosure   KxAccordion (heading + button, aria-expanded/-controls, single / collapsible / multiple,
 *                ArrowUp/ArrowDown/Home/End between triggers, closed content out of the tab order),
 *                KxCollapsible (the same contract on the caller's button; a focus ring flush with the content
 *                edge is not clipped), and KxBanner, KxInform, KxTag, KxList (dismiss, remove and press)
 *   surface      KxCard (static: not a stop, no role; on a link or button: one stop, the element's own action)
 *
 * The stepper is not here: it is display, with no key to press. Its semantics are asserted in jsdom
 * (navigation.spec.ts) and by axe below, and its layout by the RTL and 200% passes.
 * ════════════════════════════════════════════════════════════════════════════ */
const BEHAVIOUR = [
  {
    component: "KxButton",
    async run(page, t) {
      await focus(page, "#btn-save");
      await press(page, "Enter");
      await press(page, "Space");
      t((await out(page, "clicks")) === "2", "Enter and Space each activate", `clicks ${await out(page, "clicks")}`);
      await press(page, "Tab");
      t((await activeId(page)) !== "btn-disabled", "a disabled button is not a tab stop", `focus on #${await activeId(page)}`);
      await page.locator("#btn-disabled").click({ force: true });
      await settle(page);
      t((await out(page, "clicks")) === "2", "a disabled button does not activate", `clicks ${await out(page, "clicks")}`);
    },
  },
  {
    component: "KxFab",
    async run(page, t) {
      t((await page.getByRole("button", { name: "New message" }).count()) === 1, "named by its aria-label");
      await focus(page, "#fab");
      await press(page, "Enter");
      t((await out(page, "fabs")) === "1", "Enter activates", `presses ${await out(page, "fabs")}`);
    },
  },
  {
    component: "KxButtonGroup",
    async run(page, t) {
      const group = page.getByRole("group", { name: "Quantity" });
      t((await group.count()) === 1, "a named group");
      t((await group.getByRole("separator").count()) === 1, "its separator is exposed as a separator");
      await focus(page, "#bg-less");
      await press(page, "Tab");
      t((await activeId(page)) === "bg-more", "Tab moves button to button; text and separator are not stops", `focus on #${await activeId(page)}`);
      await press(page, "Enter");
      t((await out(page, "qty")) === "2", "each button is its own action", `qty ${await out(page, "qty")}`);
    },
  },
  {
    component: "KxInput",
    async run(page, t) {
      const field = page.getByRole("textbox", { name: "Display name" });
      await field.focus();
      await page.keyboard.type("Ada");
      await settle(page);
      t((await out(page, "displayName")) === "Ada", "typing reaches the bound model", `model "${await out(page, "displayName")}"`);
      await focus(page, "#in-id");
      await page.keyboard.type("x");
      t((await page.locator("#in-id").inputValue()) === "acct_7Q2X9", "a read-only field cannot be typed into");
      t((await page.locator("#in-id").evaluate((el) => el.tabIndex)) === 0, "a read-only field stays a tab stop");
      await press(page, "Tab");
      t((await activeId(page)) !== "in-org", "a disabled field is not a tab stop", `focus on #${await activeId(page)}`);
    },
  },
  {
    component: "KxLabel",
    async run(page, t) {
      await page.locator("label[for=in-name]").click();
      t((await activeId(page)) === "in-name", "pressing the label focuses its control", `focus on #${await activeId(page)}`);
    },
  },
  {
    component: "KxField",
    async run(page, t) {
      await page.locator("label[for=fld-email]").click();
      t((await activeId(page)) === "fld-email", "the field label focuses its control");
      t((await page.getByRole("textbox", { name: "Email" }).count()) === 1, "the control is named by the field label");
      const described = await page.locator("#fld-email").evaluate((el) =>
        (el.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent?.trim() ?? null),
      );
      t(described.every(Boolean) && described.length === 2, "help and error text both describe the control", JSON.stringify(described));
      t((await page.locator("#fld-email").getAttribute("aria-invalid")) === "true", "the invalid state is on the control");
      t((await page.locator("section[data-kx-subject=field]").getByRole("alert").count()) === 1, "the error message is an alert");
      await page.keyboard.type("ada@example.com");
      await settle(page);
      t((await out(page, "email")) === "ada@example.com", "typing reaches the bound model");
    },
  },
  {
    component: "KxTextarea",
    async run(page, t) {
      await page.getByRole("textbox", { name: "Notes" }).focus();
      await page.keyboard.type("Line one");
      await press(page, "Enter");
      await page.keyboard.type("Line two");
      await settle(page);
      t((await page.locator("#ta-notes").inputValue()) === "Line one\nLine two", "Enter inserts a line break, not a submit");
      t((await out(page, "notes")).includes("Line two"), "the model follows");
    },
  },
  {
    component: "KxNativeSelect",
    async run(page, t) {
      await page.getByRole("combobox", { name: "Time zone" }).focus();
      await press(page, "ArrowDown");
      t((await out(page, "zone")) === "cet", "ArrowDown chooses the next option", `model ${await out(page, "zone")}`);
    },
  },
  {
    component: "KxNumberInput",
    async run(page, t) {
      const field = page.getByRole("spinbutton", { name: "Seats" });
      await field.focus();
      await press(page, "ArrowUp");
      t((await out(page, "seats")) === "3", "ArrowUp steps up", `model ${await out(page, "seats")}`);
      for (let i = 0; i < 4; i++) await press(page, "ArrowUp");
      t((await out(page, "seats")) === "5" && (await field.inputValue()) === "5", "stepping stops at max", `model ${await out(page, "seats")}, shown ${await field.inputValue()}`);
      await press(page, "ArrowDown");
      t((await out(page, "seats")) === "4", "ArrowDown steps down");
      await field.fill("");
      await page.keyboard.type("9");
      await field.blur();
      await settle(page);
      t((await out(page, "seats")) === "5" && (await field.inputValue()) === "5", "a typed value past max is clamped — in the model and on screen", `model ${await out(page, "seats")}, shown ${await field.inputValue()}`);
      await field.focus();
      await press(page, "Tab");
      const onStepper = await page.evaluate(() => document.activeElement?.classList.contains("kx-number-input__step") ?? false);
      t(!onStepper, "the steppers are not tab stops (the input's own arrows do their job)");
      await page.locator("section[data-kx-subject=number-input] .kx-number-input__step").first().click();
      await settle(page);
      t((await out(page, "seats")) === "4", "the decrease stepper steps by pointer", `model ${await out(page, "seats")}`);
    },
  },
  {
    component: "KxPasswordInput",
    async run(page, t) {
      const scope = page.locator("section[data-kx-subject=password-input]");
      const input = scope.locator("input");
      await input.focus();
      await page.keyboard.type("hunter22");
      await settle(page);
      t((await out(page, "password")) === "hunter22" && (await input.getAttribute("type")) === "password", "typing reaches the model, masked");
      await press(page, "Tab");
      const toggle = scope.getByRole("button", { name: "Show password" });
      t((await toggle.evaluate((el) => el === document.activeElement)) && (await toggle.getAttribute("aria-pressed")) === "false", "Tab reaches the reveal toggle, not pressed");
      await press(page, "Space");
      t(
        (await input.getAttribute("type")) === "text" && (await scope.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")) === "true",
        "Space reveals, and the toggle says so",
      );
    },
  },
  {
    component: "KxInputGroup",
    async run(page, t) {
      await page.locator("label[for=ig-site]").click();
      t((await activeId(page)) === "ig-site", "its label reaches the group's input");
      t((await page.getByRole("textbox", { name: "Website" }).count()) === 1, "the input is named by the label; the add-on text is not part of it");
      await page.keyboard.press("End");
      await page.keyboard.type("/docs");
      await settle(page);
      t((await out(page, "site")) === "kinetixui.com/docs", "typing reaches the bound model", `model ${await out(page, "site")}`);
      await press(page, "Tab");
      t((await activeId(page)) === "ig-clear", "Tab reaches the add-on button, a stop of its own", `focus on #${await activeId(page)}`);
      t((await page.locator("#ig-clear").getAttribute("type")) === "button", "the add-on button is type=button (never submits a form)");
      await press(page, "Enter");
      t((await out(page, "site")) === "", "Enter activates it", `model "${await out(page, "site")}"`);
      // With nothing to clear the button disables itself. That is the button's state, not the field's: the group
      // must not dim, because its input still takes typing.
      const look = await page.locator("#ig-clear").evaluate((b) => ({
        disabled: b.disabled,
        button: Number(getComputedStyle(b).opacity),
        group: Number(getComputedStyle(b.closest("kx-input-group")).opacity),
        cursor: getComputedStyle(b.closest("kx-input-group").querySelector("input")).cursor,
      }));
      t(look.disabled && look.button < 1 && look.group === 1 && look.cursor !== "not-allowed", "a disabled add-on dims itself, not the field", `button ${look.button}, group ${look.group}, input cursor ${look.cursor}`);
      await focus(page, "#ig-site");
      await press(page, "Tab");
      t((await activeId(page)) === "ig-weight", "a disabled add-on and a text add-on are not stops", `focus on #${await activeId(page)}`);
    },
  },
  {
    component: "KxInputOtp",
    async run(page, t) {
      const field = page.getByRole("textbox", { name: "Verification code" });
      t((await field.count()) === 1 && (await page.locator(`${S("input-otp")} input`).count()) === 1, "one named text field, not a row of boxes");
      t((await field.getAttribute("autocomplete")) === "one-time-code" && (await field.getAttribute("inputmode")) === "numeric", "offers one-time-code autofill and the number pad");
      await field.focus();
      await settle(page);
      const activeCell = () => page.locator(`${S("input-otp")} .kx-input-otp__slot`).evaluateAll((cells) => cells.findIndex((c) => c.hasAttribute("data-active")));
      t((await activeCell()) === 0, "focused and empty, the first cell is the active one");
      await page.keyboard.type("12a3");
      await settle(page);
      t((await out(page, "code")) === "123" && (await field.inputValue()) === "123", "a character it does not accept is dropped", `model ${await out(page, "code")}`);
      t((await activeCell()) === 3, "the active cell follows the code", `cell ${await activeCell()}`);
      await press(page, "Backspace");
      t((await out(page, "code")) === "12", "Backspace removes the last character");
      await page.keyboard.insertText("3456789");
      await settle(page);
      t((await out(page, "code")) === "123456" && (await out(page, "completed")) === "123456", "a pasted code fills it to its length, and completes it", `model ${await out(page, "code")}`);
      const cells = await page.locator(`${S("input-otp")} .kx-input-otp__slot`).allInnerTexts();
      t(cells.join("") === "123456", "every cell shows its character", JSON.stringify(cells));
    },
  },
  {
    component: "KxRating",
    async run(page, t) {
      const group = page.getByRole("radiogroup", { name: "Rate this article" });
      t((await group.getByRole("radio").count()) === 5, "a named radiogroup of five stars");
      t((await group.getByRole("radio", { name: "3 stars" }).count()) === 1, "each star is named by its count");
      await focus(page, "#ig-weight");
      for (let i = 0; i < 20 && !(await page.evaluate(() => !!document.activeElement?.closest("kx-rating"))); i++) await press(page, "Tab");
      t((await group.getByRole("radio", { name: "1 star" }).evaluate((el) => el === document.activeElement)), "Tab lands on the first star when none is chosen");
      await press(page, "Space");
      t((await out(page, "stars")) === "1", "Space chooses it", `model ${await out(page, "stars")}`);
      await press(page, "ArrowRight");
      t((await out(page, "stars")) === "2", "an arrow moves and chooses", `model ${await out(page, "stars")}`);
      await press(page, "End");
      t((await out(page, "stars")) === "5" && (await group.getByRole("radio", { name: "5 stars" }).evaluate((el) => el === document.activeElement)), "End chooses the highest", `model ${await out(page, "stars")}`);
      await press(page, "Home");
      t((await out(page, "stars")) === "1", "Home chooses the lowest", `model ${await out(page, "stars")}`);
      await press(page, "Tab");
      t(!(await page.evaluate(() => document.activeElement?.closest("kx-rating")?.getAttribute("aria-label") === "Rate this article")), "one tab stop for the whole rating");
      t((await page.getByRole("radiogroup", { name: "Rate the venue" }).getByRole("radio").evaluateAll((rs) => rs.every((r) => r.disabled))), "a disabled rating's stars are disabled");
      const shown = () => group.locator(".kx-rating__star--on").count();
      await group.locator("label").nth(2).click();
      await settle(page);
      t((await out(page, "stars")) === "3", "clicking a star chooses it");
      await group.locator("label").nth(3).hover();
      await settle(page);
      const previewed = await shown();
      await page.mouse.move(0, 0);
      await settle(page);
      t(previewed === 4 && (await shown()) === 3 && (await out(page, "stars")) === "3", "hovering previews without choosing", `${previewed} shown under the pointer, ${await shown()} after`);
      const still = page.locator("#rating-static");
      t(
        (await still.getAttribute("role")) === "img" && (await still.getAttribute("aria-label")) === "Rated 4 out of 5" && (await still.locator("input, [tabindex]").count()) === 0,
        "read-only is one image named by its score, with no stops",
      );
    },
  },
  {
    component: "KxCheckbox",
    async run(page, t) {
      const box = page.getByRole("checkbox", { name: "Product updates" });
      await box.focus();
      await press(page, "Space");
      t((await box.getAttribute("aria-checked")) === "true" && (await out(page, "updates")) === "true", "Space checks it, and the form model follows");
      await press(page, "Space");
      t((await box.getAttribute("aria-checked")) === "false" && (await out(page, "updates")) === "false", "Space again unchecks it");
      const all = page.getByRole("checkbox", { name: "All regions" });
      t((await all.getAttribute("aria-checked")) === "mixed", "indeterminate is announced as mixed");
      await all.focus();
      await press(page, "Space");
      t((await all.getAttribute("aria-checked")) === "true" && (await out(page, "regions")) === "true", "activating a mixed box resolves it to checked");
      await press(page, "Tab");
      t((await activeId(page)) !== "cb-locked", "a disabled checkbox is not a tab stop");
      await page.locator("#cb-locked button").click({ force: true });
      t((await page.locator("#cb-locked button").getAttribute("aria-checked")) === "true", "a disabled checkbox does not change");
    },
  },
  {
    component: "KxSwitch",
    async run(page, t) {
      const sw = page.getByRole("switch", { name: "Push notifications" });
      await sw.focus();
      await press(page, "Space");
      t((await sw.getAttribute("aria-checked")) === "true" && (await out(page, "push")) === "true", "Space turns it on, and the model follows");
      await press(page, "Enter");
      t((await sw.getAttribute("aria-checked")) === "false" && (await out(page, "push")) === "false", "Enter turns it off");
      t((await page.getByRole("switch", { name: "SMS alerts" }).isDisabled()), "a disabled switch is disabled to assistive technology");
    },
  },
  {
    component: "KxRadioGroup",
    async run(page, t) {
      const group = page.getByRole("radiogroup", { name: "Plan" });
      await focus(page, "#in-org", { force: true }).catch(() => {});
      await group.getByRole("radio", { name: "Pro" }).focus();
      t((await group.getByRole("radio", { name: "Pro" }).isChecked()), "the chosen radio is the group's stop");
      await press(page, "ArrowDown");
      t((await out(page, "plan")) === "team" && (await group.getByRole("radio", { name: "Team" }).isChecked()), "ArrowDown selects the next enabled radio, skipping a disabled one", `model ${await out(page, "plan")}`);
      await press(page, "ArrowUp");
      await press(page, "ArrowUp");
      t((await out(page, "plan")) === "free", "ArrowUp walks back", `model ${await out(page, "plan")}`);
      await press(page, "Tab");
      const inGroup = await page.evaluate(() => !!document.activeElement?.closest("kx-radio-group"));
      t(!inGroup, "Tab leaves the group: one stop for the whole group");
    },
  },
  {
    component: "KxSegmentedControl",
    async run(page, t) {
      const control = page.getByRole("radiogroup", { name: "Range" });
      await control.getByRole("radio", { name: "Week" }).focus();
      await press(page, "ArrowRight");
      t((await out(page, "range")) === "year", "an arrow chooses the next enabled segment", `model ${await out(page, "range")}`);
      await press(page, "ArrowLeft");
      t((await out(page, "range")) === "week", "and back");
      await press(page, "Tab");
      t(!(await page.evaluate(() => !!document.activeElement?.closest("kx-segmented-control"))), "one tab stop for the control");
    },
  },
  {
    component: "KxSlider",
    async run(page, t) {
      const slider = page.getByRole("slider", { name: "Volume" });
      await slider.focus();
      await press(page, "ArrowRight");
      t((await out(page, "volume")) === "45", "an arrow moves one step", `model ${await out(page, "volume")}`);
      await press(page, "End");
      t((await out(page, "volume")) === "100", "End jumps to max");
      await press(page, "Home");
      t((await out(page, "volume")) === "0", "Home jumps to min");
    },
  },
  {
    component: "KxToggle",
    async run(page, t) {
      const toggle = page.locator("#tg-bold");
      t((await toggle.getAttribute("aria-label")) === "Bold" && (await toggle.getAttribute("aria-pressed")) === "false", "a named button, not pressed");
      await toggle.focus();
      await press(page, "Space");
      t((await toggle.getAttribute("aria-pressed")) === "true" && (await out(page, "bold")) === "true", "Space presses it, and the model follows");
    },
  },
  {
    component: "KxToggleGroup",
    async run(page, t) {
      const multiple = page.getByRole("group", { name: "Text style" });
      await multiple.getByRole("button", { name: "Bold" }).focus();
      await press(page, "Tab");
      t((await multiple.getByRole("button", { name: "Italic" }).evaluate((el) => el === document.activeElement)), "multiple: every item is its own stop");
      await press(page, "Space");
      t((await out(page, "marks")) === "bold,italic", "multiple: Space adds an item", `model ${await out(page, "marks")}`);
      const single = page.getByRole("radiogroup", { name: "Alignment" });
      const start = single.getByRole("radio", { name: "Start" });
      t((await single.getByRole("radio").count()) === 3 && (await start.count()) === 1, "single: each radio is named by its label");
      await start.focus();
      await press(page, "ArrowRight");
      t((await out(page, "align")) === "centre", "single: an arrow chooses the next item", `model ${await out(page, "align")}`);
    },
  },
  {
    component: "KxTabs",
    async run(page, t) {
      const list = page.getByRole("tablist", { name: "Project" });
      const stops = await list.getByRole("tab").evaluateAll((tabs) => tabs.map((el) => el.tabIndex));
      t(stops.filter((n) => n === 0).length === 1, "one tab is in the tab order (roving tabindex)", JSON.stringify(stops));
      await list.getByRole("tab", { name: "Overview" }).focus();
      await press(page, "ArrowRight");
      const activity = list.getByRole("tab", { name: "Activity" });
      t(
        (await out(page, "tab")) === "activity" && (await activity.getAttribute("aria-selected")) === "true" && (await activity.evaluate((el) => el === document.activeElement)),
        "ArrowRight selects and focuses the next enabled tab",
        `model ${await out(page, "tab")}`,
      );
      await press(page, "End");
      t((await out(page, "tab")) === "settings", "End jumps to the last tab");
      await press(page, "Home");
      t((await out(page, "tab")) === "overview", "Home jumps to the first");
      await press(page, "ArrowLeft");
      t((await out(page, "tab")) === "settings", "ArrowLeft from the first wraps to the last");
      await press(page, "Tab");
      const panel = await page.evaluate(() => {
        const el = document.activeElement;
        const tab = document.querySelector('[role=tab][aria-selected="true"]');
        return { role: el?.getAttribute("role"), id: el?.id, controls: tab?.getAttribute("aria-controls"), labelledby: el?.getAttribute("aria-labelledby"), tabId: tab?.id };
      });
      t(panel.role === "tabpanel" && panel.id === panel.controls && panel.labelledby === panel.tabId, "Tab moves to the panel the selected tab controls, labelled by it", JSON.stringify(panel));
    },
  },
  {
    component: "KxCodeBlock",
    async run(page, t) {
      const scope = page.locator("section[data-kx-subject=code-block]");
      await scope.getByRole("tab", { name: "main.ts" }).focus();
      await press(page, "ArrowRight");
      const html = scope.getByRole("tab", { name: "app.html" });
      t((await html.getAttribute("aria-selected")) === "true" && (await html.evaluate((el) => el === document.activeElement)), "an arrow moves to the next file");
      t((await scope.locator("pre").innerText()).includes("<button"), "and shows that file");
    },
  },
  {
    component: "KxBanner",
    async run(page, t) {
      const dismiss = page.locator("section[data-kx-subject=banner]").getByRole("button", { name: "Dismiss" });
      await dismiss.focus();
      await press(page, "Enter");
      t((await out(page, "banner")) === "dismissed", "its dismiss control is a named button that works from the keyboard");
    },
  },
  {
    component: "KxInform",
    async run(page, t) {
      const dismiss = page.locator("section[data-kx-subject=inform]").getByRole("button", { name: "Dismiss" });
      await dismiss.focus();
      await press(page, "Space");
      t((await out(page, "inform")) === "dismissed", "its dismiss control is a named button that works from the keyboard");
    },
  },
  {
    component: "KxTag",
    async run(page, t) {
      await page.getByRole("button", { name: "Remove Design" }).focus();
      await press(page, "Enter");
      t((await out(page, "tags")) === "Research", "the remove control is named after its tag and works from the keyboard", `tags ${await out(page, "tags")}`);
    },
  },
  {
    component: "KxList",
    async run(page, t) {
      const scope = page.locator("section[data-kx-subject=list]");
      const row = scope.getByRole("button", { name: /Billing/ });
      await row.focus();
      await press(page, "Enter");
      t((await out(page, "opened")) === "billing", "a pressable row is a button inside its list item");
      t((await scope.getByRole("button", { name: /Audit log/ }).isDisabled()), "a disabled row is a disabled button");
      t((await scope.getByRole("listitem").count()) === 2, "the rows stay list items");
    },
  },
  {
    component: "KxCard",
    async run(page, t) {
      const card = page.locator("#card-static");
      const semantics = await card.evaluate((el) => ({ role: el.getAttribute("role"), tabIndex: el.tabIndex }));
      t(semantics.role === null && semantics.tabIndex === -1, "a static card is not a stop and claims no role", JSON.stringify(semantics));
      t((await card.getByRole("heading", { name: "Usage", level: 3 }).count()) === 1, "its title is a heading");
      const link = page.getByRole("link", { name: /Q3 report/ });
      await link.focus();
      await press(page, "Enter");
      t((await out(page, "cardOpened")) === "q3", "a link card is a link, and Enter follows it");
      const toggle = page.getByRole("button", { name: "Daily backups" });
      await press(page, "Tab");
      t((await toggle.evaluate((el) => el === document.activeElement)) && (await toggle.getAttribute("aria-pressed")) === "false", "a button card is the next stop, not pressed");
      await press(page, "Space");
      t((await toggle.getAttribute("aria-pressed")) === "true" && (await out(page, "backups")) === "true", "Space toggles it, and says so");
    },
  },
  {
    component: "KxAccordion",
    fixture: "navigation",
    async run(page, t) {
      const faq = page.locator("#faq");
      const trigger = (name) => faq.getByRole("button", { name });
      const focused = (name) => trigger(name).evaluate((el) => el === document.activeElement);
      t((await faq.getByRole("heading", { level: 3 }).count()) === 4, "each trigger sits in a heading at the level the page set");
      const returns = trigger("Can I return an item after thirty days?");
      const region = await returns.getAttribute("aria-controls");
      t((await page.locator(`#${region}`).getAttribute("role")) === "region" && (await page.locator(`#${region}`).getAttribute("aria-labelledby")) === (await returns.getAttribute("id")), "aria-controls names a region labelled by its trigger");
      await focus(page, "#faq kx-accordion-item:nth-child(2) button");
      await press(page, "Enter");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      t(
        (await out(page, "faq")) === "returns" && (await returns.getAttribute("aria-expanded")) === "true" && (await trigger("When will my order ship?").getAttribute("aria-expanded")) === "false",
        "Enter opens its item and, in a single accordion, closes the other",
        `model ${await out(page, "faq")}`,
      );
      t(await focused("Can I return an item after thirty days?"), "focus stays on the trigger");
      t(await page.locator(`#${region}`).isVisible(), "its region is shown");
      await press(page, "Space");
      t((await out(page, "faq")) === "" && (await returns.getAttribute("aria-expanded")) === "false", "Space closes it again (collapsible)", `model "${await out(page, "faq")}"`);
      await press(page, "ArrowDown");
      t(await focused("What does the warranty cover?"), "ArrowDown moves to the next enabled trigger, skipping a disabled one");
      t((await out(page, "faq")) === "", "an arrow moves focus and opens nothing");
      await press(page, "ArrowDown");
      t(await focused("When will my order ship?"), "ArrowDown from the last wraps to the first");
      await press(page, "ArrowUp");
      t(await focused("What does the warranty cover?"), "ArrowUp from the first wraps to the last");
      await press(page, "Home");
      t(await focused("When will my order ship?"), "Home moves to the first trigger");
      await press(page, "End");
      t(await focused("What does the warranty cover?"), "End moves to the last enabled trigger");
      t(await trigger("Gift wrapping").isDisabled(), "a disabled item's trigger is a disabled button");
      // Closed content leaves the tab order: with the shipping item closed, Tab from its trigger skips its link.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      await focus(page, "#faq kx-accordion-item:nth-child(1) button");
      await press(page, "Tab");
      t((await activeId(page)) !== "faq-link" && (await focused("Can I return an item after thirty days?")), "closed content is not reachable: Tab goes to the next trigger", `focus on #${await activeId(page)}`);
      await focus(page, "#faq kx-accordion-item:nth-child(1) button");
      await press(page, "Enter");
      await press(page, "Tab");
      t((await activeId(page)) === "faq-link", "open content is: Tab goes from the trigger into it", `focus on #${await activeId(page)}`);
      // Single, not collapsible: the open trigger cannot close, and says so.
      const team = page.locator("#plan").getByRole("button", { name: "Team plan" });
      t((await team.getAttribute("aria-disabled")) === "true" && (await team.getAttribute("tabindex")) !== "-1", "single, not collapsible: the open trigger reports aria-disabled and stays focusable");
      await team.focus();
      await press(page, "Enter");
      t((await out(page, "plan")) === "team", "and Enter does not close it", `model ${await out(page, "plan")}`);
      t((await page.locator("#plan").getByRole("heading", { level: 4 }).count()) === 2, "headingLevel sets the level");
      await press(page, "ArrowDown");
      await press(page, "Enter");
      t((await out(page, "plan")) === "enterprise", "another item opens and takes over", `model ${await out(page, "plan")}`);
      // Multiple: independent.
      const topics = page.locator("#topics");
      await topics.getByRole("button", { name: "Alerts" }).focus();
      await press(page, "Enter");
      await press(page, "ArrowDown");
      await press(page, "Enter");
      t((await out(page, "topics")) === "a,b", "multiple: items open independently", `model ${await out(page, "topics")}`);
    },
  },
  {
    component: "KxCollapsible",
    fixture: "navigation",
    async run(page, t) {
      const trigger = page.locator("#advanced-trigger");
      const content = await trigger.getAttribute("aria-controls");
      t(!!content && (await page.locator(`#${content}`).count()) === 1, "aria-controls names content that exists while closed");
      t((await trigger.getAttribute("aria-expanded")) === "false" && !(await page.locator("#advanced-link").isVisible()), "closed: not expanded, content not shown");
      await focus(page, "#advanced-trigger");
      await press(page, "Enter");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      t((await out(page, "advanced")) === "true" && (await trigger.getAttribute("aria-expanded")) === "true", "Enter opens it, and the model follows");
      t((await activeId(page)) === "advanced-trigger", "focus stays on the trigger");
      await press(page, "Tab");
      t((await activeId(page)) === "advanced-link", "Tab goes from the trigger into the content", `focus on #${await activeId(page)}`);
      // The content clips while it animates; a focus ring flush with its edge must still be drawn whole.
      const ring = await page.locator("#advanced-link").evaluate((el) => {
        const r = el.getBoundingClientRect();
        // the UA ring this link draws: a 1px offset, then the ring itself — its centre lies 2px outside the box
        return { x: r.left - 2, y: r.top + r.height / 2 };
      });
      const shot = await framer({ dpr: 1, pad: 0 })(page, { x: ring.x - 1, y: ring.y - 1, width: 3, height: 3 });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).map(Number));
      t(contrast(shot.at(ring.x, ring.y), bg) > 1.05, "a focus ring flush with the content's edge is not clipped", `pixel ${shot.at(ring.x, ring.y)} vs background ${bg}`);
      await focus(page, "#advanced-trigger");
      await press(page, "Space");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      t((await out(page, "advanced")) === "false", "Space closes it");
      await press(page, "Tab");
      t((await activeId(page)) !== "advanced-link" && (await activeId(page)) !== "locked-trigger", "closed content and a disabled trigger are not stops", `focus on #${await activeId(page)}`);
      t(await page.locator("#locked-trigger").isDisabled(), "a disabled collapsible's trigger is disabled");
    },
  },
  {
    component: "KxBreadcrumb",
    fixture: "navigation",
    async run(page, t) {
      const nav = page.getByRole("navigation", { name: "Breadcrumb" });
      t((await nav.count()) === 1 && (await nav.getByRole("list").count()) === 1, "a navigation landmark named Breadcrumb, around a list");
      t((await nav.getByRole("link").count()) === 2, "the crumbs above the current page are links");
      const current = nav.locator("[aria-current=page]");
      t((await current.count()) === 1 && (await current.evaluate((el) => el.tagName)) === "SPAN" && (await current.innerText()) === "Billing and invoices", "the current page is aria-current=page, and not a link");
      await focus(page, "#crumb-home");
      await press(page, "Tab");
      t((await activeId(page)) === "crumb-settings", "Tab moves crumb to crumb; separators are not stops", `focus on #${await activeId(page)}`);
      await press(page, "Tab");
      t(!(await page.evaluate(() => !!document.activeElement?.closest(".kx-breadcrumb"))), "the current page is not a stop");
      await focus(page, "#crumb-settings");
      await press(page, "Enter");
      t((await page.evaluate(() => location.hash)) === "#settings", "Enter follows the link");
    },
  },
  {
    component: "KxPagination",
    fixture: "navigation",
    async run(page, t) {
      const nav = page.getByRole("navigation", { name: "Results pages" });
      // read without waiting: a page with no current entry must fail here, not time out
      const current = async () => ((await nav.locator("[aria-current=page]").count()) === 1 ? nav.locator("[aria-current=page]").innerText() : "no current page");
      t((await current()) === "1", "the current page is aria-current=page");
      t(await page.locator("#page-prev").isDisabled(), "Previous is disabled on the first page");
      await focus(page, "#page-prev");
      t((await activeId(page)) !== "page-prev", "a disabled Previous is not a stop");
      await nav.getByRole("button", { name: "3", exact: true }).focus();
      await press(page, "Enter");
      t((await out(page, "page")) === "3" && (await current()) === "3", "Enter on a page selects it, and aria-current moves", `model ${await out(page, "page")}`);
      t((await nav.getByRole("button", { name: "3", exact: true }).evaluate((el) => el === document.activeElement)), "focus stays where it was");
      await page.locator("#page-next").focus();
      await press(page, "Enter");
      t((await out(page, "page")) === "4" && (await page.locator("#page-next").isDisabled()), "Next steps forward, and disables itself on the last page", `model ${await out(page, "page")}`);
      t((await page.getByRole("button", { name: "Previous" }).first().isEnabled()), "Previous is enabled once there is a previous page");
      // As links: real links, a current link, and a disabled link that cannot be followed.
      const archive = page.getByRole("navigation", { name: "Archive pages" });
      t((await archive.getByRole("link").count()) === 4, "as anchors, every entry is still a link");
      t((await page.locator("#archive-1").getAttribute("aria-current")) === "page", "the current link is aria-current=page");
      const prev = page.locator("#archive-prev");
      t((await prev.getAttribute("aria-disabled")) === "true" && (await prev.evaluate((el) => el.tabIndex)) === -1, "a disabled link says so and leaves the tab order");
      // force: Playwright would wait for an aria-disabled element to become enabled; a person can still click it
      await prev.click({ force: true });
      t((await page.evaluate(() => location.hash)) !== "#archive-0", "a disabled link is not followed");
      await page.locator("#archive-2").focus();
      await press(page, "Enter");
      t((await page.evaluate(() => location.hash)) === "#archive-2", "Enter follows a page link");
    },
  },
  {
    component: "KxTableOfContents",
    fixture: "navigation",
    async run(page, t) {
      const nav = page.getByRole("navigation", { name: "On this page" });
      const links = nav.getByRole("link");
      t((await links.count()) === 3 && (await links.first().getAttribute("href")) === "#install", "in-page anchors in a named landmark");
      t((await nav.locator("[aria-current=location]").innerText()) === "Installation", "the section being read is aria-current=location");
      await links.first().focus();
      await press(page, "Tab");
      await press(page, "Tab");
      t((await links.nth(2).evaluate((el) => el === document.activeElement)), "every entry is a Tab stop, in order");
      await press(page, "Enter");
      t(
        (await out(page, "section")) === "usage" && (await nav.locator("[aria-current=location]").innerText()) === "Usage" && (await page.evaluate(() => location.hash)) === "#usage",
        "Enter follows the anchor and marks its entry current",
        `model ${await out(page, "section")}`,
      );
    },
  },
  {
    component: "KxTabBar",
    fixture: "navigation",
    async run(page, t) {
      const nav = page.getByRole("navigation", { name: "Primary sections" });
      t((await nav.getByRole("button", { name: "Inbox (3)", exact: true }).count()) === 1, "each destination is named by its label, the badge read after it");
      t((await page.locator("#tb-home").getAttribute("aria-current")) === "page", "the current destination is aria-current=page");
      await focus(page, "#tb-home");
      await press(page, "Tab");
      t((await activeId(page)) === "tb-inbox", "each destination is its own Tab stop (a navigation, not a tablist)");
      await press(page, "Enter");
      t((await out(page, "destination")) === "inbox" && (await page.locator("#tb-inbox").getAttribute("aria-current")) === "page" && !(await page.locator("#tb-home").getAttribute("aria-current")), "Enter selects it, and aria-current moves", `model ${await out(page, "destination")}`);
      t((await nav.getByRole("tablist").count()) === 0, "no tab semantics are claimed");
    },
  },
  {
    component: "KxNavigationBar",
    fixture: "navigation",
    async run(page, t) {
      const scope = page.locator(S("navigation-bar"));
      t((await scope.getByRole("heading", { level: 2, name: /regional support team/ }).count()) === 1, "the title is a heading at the level the page set");
      const back = scope.getByRole("button", { name: "Back" });
      t((await back.count()) === 1, "Back is a button named Back");
      await back.focus();
      await press(page, "Enter");
      t((await out(page, "backs")) === "1", "Enter activates it");
      await press(page, "Tab");
      t((await activeId(page)) === "nb-edit", "Tab goes from Back to the trailing action", `focus on #${await activeId(page)}`);
    },
  },
  {
    component: "KxAppBar",
    fixture: "navigation",
    async run(page, t) {
      const scope = page.locator(S("app-bar"));
      const nav = scope.getByRole("navigation", { name: "Primary" });
      const toggle = scope.getByRole("button", { name: "Menu" });
      t((await nav.getByRole("link", { name: "Overview" }).getAttribute("aria-current")) === "page", "the current destination is aria-current=page");
      // Wide: the links are simply there, and the menu button is not.
      t(!(await toggle.isVisible()) && (await nav.getByRole("link", { name: "Reports" }).isVisible()), "wide: links shown inline, no menu button");
      await focus(page, `${S("app-bar")} [kxAppBarBrand]`);
      await press(page, "Tab");
      t((await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Overview", "wide: Tab goes from the brand to the first link");
      // Narrow: a disclosure.
      await page.setViewportSize({ width: 390, height: 1400 });
      await settle(page);
      // crossing the breakpoint, the wide layout's always-shown links collapse with the disclosure's own motion
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      t((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "false" && (await toggle.getAttribute("aria-controls")) === (await scope.locator("nav[kxAppBarNav]").getAttribute("id")), "narrow: a Menu button that controls the navigation, collapsed");
      t(!(await nav.getByRole("link", { name: "Reports" }).isVisible()), "narrow and closed: the links are not shown");
      // Tab order is brand, menu button, links, actions; the screen must read in the same order
      const [tg, act] = [await toggle.boundingBox(), await page.locator("#app-bar-new").boundingBox()];
      t(act.y >= tg.y + tg.height - 1, "narrow: the actions sit after the menu button on screen, as they do in Tab order", `button bottom ${(tg.y + tg.height).toFixed(1)}, actions top ${act.y.toFixed(1)}`);
      await toggle.focus();
      await press(page, "Tab");
      t((await activeId(page)) === "app-bar-new", "narrow and closed: Tab skips the hidden links", `focus on #${await activeId(page)}`);
      await toggle.focus();
      await press(page, "Enter");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      t((await toggle.getAttribute("aria-expanded")) === "true" && (await out(page, "menu")) === "true", "Enter opens it, and says so");
      await press(page, "Tab");
      t((await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Overview", "Tab goes from the button straight into the links");
      await press(page, "Escape");
      t((await out(page, "menu")) === "false" && (await toggle.evaluate((el) => el === document.activeElement)), "Escape closes it and returns focus to the button");
      await press(page, "Enter");
      await nav.getByRole("link", { name: "Reports" }).focus();
      await press(page, "Enter");
      t((await out(page, "followed")) === "reports" && (await out(page, "menu")) === "false", "following a link closes the menu");
    },
  },
  {
    component: "KxFooter",
    fixture: "navigation",
    async run(page, t) {
      const scope = page.locator(S("footer"));
      t((await scope.getByRole("group", { name: "Product" }).getByRole("link").count()) === 2, "each column is a group named by its title");
      await focus(page, "#ft-pricing");
      await press(page, "Tab");
      await press(page, "Tab");
      t((await page.evaluate(() => document.activeElement?.textContent?.trim())) === "About", "Tab runs down a column, then into the next");
      await focus(page, "#ft-privacy");
      await press(page, "Enter");
      t((await page.evaluate(() => location.hash)) === "#privacy", "Enter follows a link");
    },
  },
];
if (runs("interaction")) {
  assertClaims("interaction, accessibility", BEHAVIOUR);
  report.push(`\ninteraction — ${BEHAVIOUR.length} components driven by keyboard in Chromium`);
  for (const theme of ["light"]) {
    for (const subject of BEHAVIOUR) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 1400 } });
      const page = await open(context, subject.fixture ?? "behaviour", { theme });
      const name = subject.component;
      try {
        await subject.run(page, (ok, what, detail) => check(ok, `${name}: ${what}`, detail));
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
 * 200% text — the WCAG 1.4.4 resize target — applied the way a reader applies it: the root font size doubles,
 * nothing else changes. The rules are React's (scripts/large-text.mjs), measured on the live Angular controls
 * of src/fixtures/behaviour.ts, plus what only an operable page can show: at 2x each control still takes
 * focus with a visible indicator, still answers its key, and its label still reaches it.
 *
 *   selection controls (no text of their own: the box itself must scale ≥1.8x)
 *     KxCheckbox, KxRadioGroup, KxSwitch, KxToggle, KxToggleGroup, KxSlider, KxRating, and KxInputOtp's cells
 *   text-bearing controls (their text grows ≥1.8x and the box absorbs all of it, nothing truncated)
 *     KxInput, KxTextarea, KxNativeSelect, KxNumberInput, KxPasswordInput, KxInputGroup, KxTabs, KxLabel,
 *     KxField, KxSegmentedControl, KxButton
 *   navigation and disclosure (src/fixtures/navigation.ts), text-bearing
 *     KxAccordion (a trigger, and open content: still reachable, nothing clipped by the disclosure's own clip),
 *     KxCollapsible, KxBreadcrumb and KxPagination (rows that wrap rather than overflow), KxTableOfContents,
 *     KxTabBar, KxStepper (a horizontal stepper reflows into a list), KxNavigationBar (the title wraps, it is
 *     not truncated), KxAppBar, KxFooter. A link is "operable" when Enter still follows it.
 *
 * A one-time code wraps at 390px and 2x; every cell must then still carry all four borders, so a wrapped row is
 * closed at the end it starts from (React's InputOTP rule).
 *
 * Every subject, both kinds: no clipping ancestor, no part escaping its container, no colliding label / control
 * / help / error boxes, no horizontal page overflow at 1024px or at 390px, a target of at least 24px.
 * ════════════════════════════════════════════════════════════════════════════ */
const LARGE = [
  { component: "KxCheckbox", control: "#cb-updates .kx-checkbox", focus: "#cb-updates .kx-checkbox", key: "Space", out: "updates" },
  { component: "KxRadioGroup", control: `${S("radio-group")} .kx-radio__input`, focus: `${S("radio-group")} input:checked`, key: "ArrowDown", out: "plan", label: `${S("radio-group")} .kx-radio__label` },
  { component: "KxSwitch", control: "#sw-push .kx-switch", focus: "#sw-push .kx-switch", key: "Space", out: "push" },
  { component: "KxToggle", control: "#tg-bold", focus: "#tg-bold", key: "Space", out: "bold" },
  { component: "KxToggleGroup", control: `${S("toggle-group")} button.kx-toggle`, focus: `${S("toggle-group")} button.kx-toggle`, key: "Space", out: "marks" },
  { component: "KxSlider", control: `${S("slider")} .kx-slider__input`, focus: `${S("slider")} .kx-slider__input`, key: "ArrowRight", out: "volume" },
  { component: "KxInput", control: "#in-name", text: "#in-name", focus: "#in-name", type: "a", out: "displayName", label: "label[for=in-name]" },
  { component: "KxLabel", control: "label[for=in-name]", text: "label[for=in-name]", label: "label[for=in-name]" },
  { component: "KxTextarea", control: "#ta-notes", text: "#ta-notes", focus: "#ta-notes", type: "a", out: "notes", label: "label[for=ta-notes]" },
  { component: "KxNativeSelect", control: "#sel-tz", text: "#sel-tz", focus: "#sel-tz", key: "ArrowDown", out: "zone", label: "label[for=sel-tz]" },
  {
    component: "KxNumberInput",
    control: `${S("number-input")} kx-number-input`,
    text: `${S("number-input")} .kx-number-input__input`,
    inside: `${S("number-input")} kx-number-input > *`,
    focus: `${S("number-input")} .kx-number-input__input`,
    key: "ArrowUp",
    out: "seats",
  },
  {
    component: "KxPasswordInput",
    control: `${S("password-input")} kx-password-input`,
    text: `${S("password-input")} .kx-password-input__input`,
    inside: `${S("password-input")} kx-password-input > *`,
    focus: `${S("password-input")} .kx-password-input__input`,
    type: "a",
    out: "password",
  },
  {
    component: "KxSegmentedControl",
    control: `${S("segmented-control")} kx-segmented-control`,
    text: `${S("segmented-control")} .kx-segmented__label`,
    inside: `${S("segmented-control")} .kx-segmented__item`,
    focus: `${S("segmented-control")} input:checked`,
    key: "ArrowRight",
    out: "range",
  },
  {
    component: "KxTabs",
    control: `${S("tabs")} kx-tab-list`,
    text: `${S("tabs")} .kx-tab`,
    inside: `${S("tabs")} kx-tab-list > *`,
    focus: `${S("tabs")} [role=tab][tabindex="0"]`,
    key: "ArrowRight",
    out: "tab",
  },
  { component: "KxField", control: "#fld-email", text: "#fld-email", stack: `${S("field")} kx-field`, label: "label[for=fld-email]", focus: "#fld-email", type: "a", out: "email" },
  { component: "KxButton", control: "#btn-save", text: "#btn-save", focus: "#btn-save", key: "Enter", out: "clicks" },
  {
    component: "KxInputGroup",
    control: `${S("input-group")} kx-input-group`,
    text: "#ig-site",
    inside: `${S("input-group")} kx-input-group:first-of-type > *`,
    label: "label[for=ig-site]",
    focus: "#ig-site",
    type: "a",
    out: "site",
  },
  {
    component: "KxInputOtp",
    control: `${S("input-otp")} .kx-input-otp__slot`,
    closed: `${S("input-otp")} .kx-input-otp__slot`,
    focus: `${S("input-otp")} input`,
    type: "4",
    out: "code",
  },
  { component: "KxRating", control: `${S("rating")} label.kx-rating__item`, focus: `${S("rating")} kx-rating input`, key: "Space", out: "stars" },  // Navigation and disclosure (src/fixtures/navigation.ts)
  { component: "KxAccordion", fixture: "navigation", control: "#faq kx-accordion-item:nth-child(2) button", text: "#faq kx-accordion-item:nth-child(2) button", inside: "#faq kx-accordion-item:nth-child(2) button > *", focus: "#faq kx-accordion-item:nth-child(2) button", key: "Enter", out: "faq" },
  { component: "KxAccordion", fixture: "navigation", control: "#faq kx-accordion-item:nth-child(1) .kx-accordion__inner", text: "#faq kx-accordion-item:nth-child(1) .kx-accordion__inner" },
  { component: "KxCollapsible", fixture: "navigation", control: "#advanced-trigger", text: "#advanced-trigger", focus: "#advanced-trigger", key: "Enter", out: "advanced" },
  { component: "KxBreadcrumb", fixture: "navigation", control: `${S("breadcrumb")} .kx-breadcrumb__list`, text: "#crumb-settings", inside: `${S("breadcrumb")} .kx-breadcrumb__list > *`, focus: "#crumb-settings", key: "Enter", hash: "#settings" },
  { component: "KxPagination", fixture: "navigation", control: `${S("pagination")} .kx-pagination__content`, text: "#page-next", inside: `${S("pagination")} .kx-pagination__content > *`, focus: "#page-next", key: "Enter", out: "page" },
  { component: "KxTableOfContents", fixture: "navigation", control: `${S("table-of-contents")} li:nth-child(2) a`, text: `${S("table-of-contents")} li:nth-child(2) a`, focus: `${S("table-of-contents")} li:nth-child(3) a`, key: "Enter", out: "section" },
  { component: "KxTabBar", fixture: "navigation", control: "#tb-inbox", text: "#tb-inbox .kx-tab-bar__label", inside: "#tb-inbox > *", focus: "#tb-inbox", key: "Enter", out: "destination" },
  { component: "KxStepper", fixture: "navigation", control: `${S("stepper")} ol:first-of-type li:nth-child(2)`, text: `${S("stepper")} ol:first-of-type li:nth-child(2) .kx-stepper__label`, inside: `${S("stepper")} ol:first-of-type li:nth-child(2) > *` },
  { component: "KxNavigationBar", fixture: "navigation", control: `${S("navigation-bar")} header`, text: `${S("navigation-bar")} .kx-navigation-bar__title`, inside: `${S("navigation-bar")} header > *`, focus: `${S("navigation-bar")} .kx-navigation-bar__back`, key: "Enter", out: "backs" },
  { component: "KxAppBar", fixture: "navigation", control: `${S("app-bar")} header`, text: `${S("app-bar")} [data-kx-case=current]`, inside: `${S("app-bar")} header > :not(.kx-app-bar__toggle)`, focus: `${S("app-bar")} [data-kx-case=rest]`, key: "Enter", out: "followed" },
  { component: "KxFooter", fixture: "navigation", control: "#ft-pricing", text: "#ft-pricing", focus: "#ft-pricing", key: "Enter", hash: "#pricing" },
];
const SCALE = 2;
const MIN_RATIO = 1.8;
const MIN_TARGET = 24;

/** React's measurements (scripts/large-text.mjs), read from one subject. */
function measureLarge(page, subject) {
  return page.evaluate(({ control, text, inside, stack }) => {
    const el = document.querySelector(control);
    const r = el.getBoundingClientRect();
    const textEl = text ? document.querySelector(text) : null;
    const scrolls = getComputedStyle(el).overflowY === "auto" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
    const truncated = !scrolls && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    const escaped = inside
      ? [...document.querySelectorAll(inside)].filter((child) => {
          const c = child.getBoundingClientRect();
          const p = child.parentElement.getBoundingClientRect();
          return c.right > p.right + 1 || c.bottom > p.bottom + 1 || c.left < p.left - 1 || c.top < p.top - 1;
        }).length
      : 0;
    const collisions = (() => {
      if (!stack) return 0;
      const boxes = [...document.querySelector(stack).querySelectorAll("label, input, textarea, p, kx-field-message")].map((n) => n.getBoundingClientRect());
      let hits = 0;
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits++;
        }
      return hits;
    })();
    const clipped = (() => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflow !== "visible" && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) return true;
      }
      return false;
    })();
    return {
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
      fontSize: textEl ? parseFloat(getComputedStyle(textEl).fontSize) : 0,
      truncated,
      escaped,
      collisions,
      clipped,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, subject);
}
/** The focused control draws an indicator: an outline or a ring (a hidden native radio draws it on its label). */
const focusIndicator = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    // A composite field (number, password) is one field: its ring is on the wrapper, around the focused input.
    const shown = el.matches(".kx-input-otp__input")
      ? el.closest("kx-input-otp").querySelector("[data-active]") ?? el
      : el.matches("input[type=radio]") && getComputedStyle(el).opacity === "0"
        ? el.labels?.[0] ?? el.nextElementSibling ?? el
        : el.matches("input") ? el.closest(".kx-number-input, .kx-password-input, .kx-input-group") ?? el : el;
    const cs = getComputedStyle(shown);
    return (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
  });
const setRootFontSize = (page, px) => page.evaluate((v) => { document.documentElement.style.fontSize = `${v}px`; }, px);

if (runs("largeText")) {
  assertClaims("largeText", LARGE);
  report.push(`\nlargeText — ${LARGE.length} controls at ${SCALE}x the root font size, live Angular`);
  for (const subject of LARGE) {
    const name = subject.component;
    for (const viewport of [{ width: 1024, height: 1400 }, { width: 390, height: 1400 }]) {
      const narrow = viewport.width < 1024;
      const context = await browser.newContext({ viewport });
      const page = await open(context, subject.fixture ?? "behaviour");
      try {
        const before = await measureLarge(page, subject);
        await setRootFontSize(page, 16 * SCALE);
        await settle(page);
        const after = await measureLarge(page, subject);
        if (narrow) {
          // Its own region: the control fits the width a phone gives it, by wrapping or scrolling itself.
          const escaped = await page.evaluate((sel) => {
            const region = document.querySelector(sel).closest("section");
            const r = region.getBoundingClientRect();
            return [...region.querySelectorAll("*")]
              .filter((n) => getComputedStyle(n).opacity !== "0")
              .filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); })
              .map((n) => n.className || n.tagName.toLowerCase());
          }, subject.control);
          check(escaped.length === 0, `${name}: fits a ${viewport.width}px viewport at ${SCALE}x text`, escaped.slice(0, 3).join(", "));
          if (subject.closed) {
            const { open, rows } = await page.evaluate((sel) => {
              const parts = [...document.querySelectorAll(sel)];
              const open = parts.filter((el) => {
                const cs = getComputedStyle(el);
                return [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].some((w) => parseFloat(w) === 0);
              }).length;
              return { open, rows: new Set(parts.map((el) => Math.round(el.getBoundingClientRect().y))).size };
            }, subject.closed);
            check(open === 0, `${name}: every cell keeps all four edges when it wraps`, `${rows} row(s), ${open} open cell(s)`);
          }
          continue;
        }
        check(after.overflowX <= 0, `${name}: no horizontal page overflow`, `${after.overflowX}px`);
        const ratio = before.h > 0 ? after.h / before.h : 0;
        const size = `${before.w}x${before.h} -> ${after.w}x${after.h}`;
        if (subject.text) {
          const textGrowth = after.fontSize - before.fontSize;
          const boxGrowth = after.h - before.h;
          check(textGrowth >= before.fontSize * (MIN_RATIO - 1), `${name}: its text grows with the reader's`, `${before.fontSize}px -> ${after.fontSize}px`);
          check(boxGrowth + 1 >= textGrowth, `${name}: the box absorbs its text`, `text +${textGrowth.toFixed(1)}px, box +${boxGrowth.toFixed(1)}px (${size})`);
        } else {
          check(ratio >= MIN_RATIO, `${name}: the control scales with the text`, `${size}, ratio ${ratio.toFixed(2)}`);
        }
        check(!after.truncated, `${name}: nothing truncated inside it`);
        check(!after.clipped, `${name}: no ancestor clips it`);
        check(after.escaped === 0, `${name}: every part stays inside it`, `${after.escaped} escaped`);
        check(after.collisions === 0, `${name}: label, control, help and error do not overlap`, `${after.collisions} collision(s)`);
        check(Math.min(after.w, after.h) >= MIN_TARGET, `${name}: target at least ${MIN_TARGET}px`, `${after.w}x${after.h}`);
        if (subject.label) {
          await page.locator(subject.label).first().click();
          await settle(page);
          const reached = await page.evaluate(() => document.activeElement?.matches("input, textarea, select") ?? false);
          check(reached, `${name}: its label still reaches the control`);
        }
        if (subject.focus) {
          await focus(page, subject.focus);
          check(await focusIndicator(page), `${name}: keyboard focus is visible`);
          const was = subject.out ? await out(page, subject.out) : null;
          if (subject.type) await page.keyboard.type(subject.type);
          else if (subject.key) await page.keyboard.press(subject.key);
          await settle(page);
          if (subject.out) check((await out(page, subject.out)) !== was, `${name}: still operable from the keyboard`, `${was} -> ${await out(page, subject.out)}`);
          if (subject.hash) check((await page.evaluate(() => location.hash)) === subject.hash, `${name}: still operable from the keyboard (the link is followed)`, await page.evaluate(() => location.hash));
        }
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
  // And each page as a whole: nothing on it, claimed here or not, makes a phone scroll sideways at 200%.
  for (const fixture of ["behaviour", "navigation"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 1400 } });
    const page = await open(context, fixture);
    await setRootFontSize(page, 16 * SCALE);
    await settle(page);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll("section[data-kx-subject]")].filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => s.dataset.kxSubject),
    );
    check(overflowX <= 0 && wide.length === 0, `the whole ${fixture} page fits 390px at ${SCALE}x text`, `${overflowX}px; ${wide.join(", ")}`);
    await context.close();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * kx-verify: rtl
 *
 * Direction, in the four cases an application meets: an LTR page, an RTL page, an LTR region inside an RTL page,
 * and an RTL region inside an LTR page. The nested cases are the ones a rule keyed on any `[dir=rtl]` ancestor
 * gets wrong (the bug check:selection-visual caught in the Switch), so every subject is measured in all four,
 * against the direction its OWN element resolves to — read from the browser's layout and, where a fill is
 * painted, from the pixels.
 *
 *   KxInput, KxTextarea        the label and the field share their inline-start edge; text aligns to start
 *   KxRadioGroup               each radio sits on the inline-start side of its label
 *   KxSlider                   the filled track grows from the inline start; the arrow that points toward
 *                              the inline end raises the value
 *   KxSwitch                   on, the thumb sits at the inline end and inside the track
 *   KxTabs, KxCodeBlock        the arrow pointing toward the inline end moves to the next tab
 *   KxNumberInput              decrease at the inline start, increase at the inline end
 *   KxPasswordInput            the reveal control at the inline end
 *   KxSegmentedControl, KxToggleGroup   the first item at the inline start
 *   KxInputGroup               a leading text add-on at the inline start, a button at the inline end
 *   KxInputOtp                 the first cell at the inline start, and it is the one the first character fills
 *   KxRating                   the first star at the inline start; the arrow pointing toward the inline end
 *                              raises the rating
 *   KxBreadcrumb               the path runs from the inline start; the separator glyph, read from its
 *                              pixels, points toward the inline end
 *   KxPagination               Previous at the inline start pointing back, Next at the end pointing on,
 *                              numbers ascending toward the end
 *   KxTableOfContents          nesting indents from the inline start; the current bar is on that edge
 *   KxTabBar, KxFooter         the first destination / column at the inline start
 *   KxStepper                  step 1 at the inline start, the connector between steps 1 and 2; vertical:
 *                              the marker at the inline start of its text
 *   KxNavigationBar            Back at the inline start, pointing that way; actions at the inline end
 *   KxAppBar                   brand, links in order, then actions, from the inline start
 *   KxAccordion                label at the inline start, chevron at the end (it points down, so it does not
 *                              mirror); ArrowDown still moves down
 * ════════════════════════════════════════════════════════════════════════════ */
/** Positive when `a` lies further toward the inline end than `b`, in `dir`. */
const towardEnd = (dir, a, b) => (dir === "rtl" ? b - a : a - b);
const mid = (r) => (r.left + r.right) / 2;
const rectOf = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, x: r.x, y: r.y, width: r.width, height: r.height }; });
const endKey = (dir) => (dir === "rtl" ? "ArrowLeft" : "ArrowRight");
const RTL = [
  ...[
    ["KxInput", "label[for=in-name]", "#in-name"],
    ["KxTextarea", "label[for=ta-notes]", "#ta-notes"],
  ].map(([component, label, field]) => ({
    component,
    region: field,
    async run(page, dir, t) {
      const [l, f] = [await rectOf(page, label), await rectOf(page, field)];
      const startEdge = (r) => (dir === "rtl" ? r.right : r.left);
      t(Math.abs(startEdge(l) - startEdge(f)) <= 1, "the label and the field share their inline-start edge", `label ${startEdge(l).toFixed(1)}, field ${startEdge(f).toFixed(1)}`);
      const align = await page.locator(field).evaluate((el) => getComputedStyle(el).textAlign);
      t(["start", dir === "rtl" ? "right" : "left"].includes(align), "text aligns to the inline start", align);
    },
  })),
  {
    component: "KxRadioGroup",
    region: S("radio-group"),
    async run(page, dir, t) {
      const [input, label] = [await rectOf(page, `${S("radio-group")} .kx-radio__input`), await rectOf(page, `${S("radio-group")} .kx-radio__label`)];
      t(towardEnd(dir, mid(label), mid(input)) > 0, "the radio sits on the inline-start side of its label", `radio ${mid(input).toFixed(0)}, label ${mid(label).toFixed(0)}`);
      await focus(page, `${S("radio-group")} input:checked`);
      await press(page, "ArrowDown");
      t((await out(page, "plan")) === "team", "ArrowDown still selects the next radio", `model ${await out(page, "plan")}`);
    },
  },
  {
    component: "KxSlider",
    region: S("slider"),
    async run(page, dir, t) {
      const sel = `${S("slider")} .kx-slider__input`;
      await page.locator(sel).scrollIntoViewIfNeeded();
      const r = await rectOf(page, sel);
      const [primary, muted] = await page.evaluate(() =>
        ["--primary", "--muted"].map((v) => {
          const probe = document.createElement("i");
          probe.style.color = `hsl(var(${v}))`;
          document.body.append(probe);
          const rgb = getComputedStyle(probe).color.match(/\d+/g).slice(0, 3).map(Number);
          probe.remove();
          return rgb;
        }),
      );
      const frame = await framer({ dpr: 1, pad: 0 })(page, r);
      const y = r.top + r.height / 2;
      const closer = (rgb) => (contrast(rgb, primary) < contrast(rgb, muted) ? "filled" : "empty");
      // The model is 40: the 15% point from the inline start is filled, the 15% point from the inline end is not.
      const nearStart = dir === "rtl" ? r.right - r.width * 0.15 : r.left + r.width * 0.15;
      const nearEnd = dir === "rtl" ? r.left + r.width * 0.15 : r.right - r.width * 0.15;
      const [s, e] = [closer(frame.at(nearStart, y)), closer(frame.at(nearEnd, y))];
      t(s === "filled" && e === "empty", "the fill grows from the inline start", `start ${s}, end ${e}`);
      await focus(page, sel);
      await press(page, endKey(dir));
      t((await out(page, "volume")) === "45", `${endKey(dir)} (toward the inline end) raises the value`, `model ${await out(page, "volume")}`);
    },
  },
  {
    component: "KxSwitch",
    region: S("switch"),
    async run(page, dir, t) {
      await page.locator("#sw-push .kx-switch").click();
      await settle(page);
      // where the thumb comes to rest, not a frame of its travel
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const [track, thumb] = [await rectOf(page, "#sw-push .kx-switch"), await rectOf(page, "#sw-push .kx-switch__thumb")];
      const inside = thumb.left >= track.left - 0.5 && thumb.right <= track.right + 0.5;
      t(inside && towardEnd(dir, mid(thumb), mid(track)) > 0, "on, the thumb sits at the inline end, inside the track", `thumb ${thumb.left.toFixed(1)}–${thumb.right.toFixed(1)} in ${track.left.toFixed(1)}–${track.right.toFixed(1)}`);
    },
  },
  {
    component: "KxTabs",
    region: S("tabs"),
    async run(page, dir, t) {
      const [first, second] = [await rectOf(page, `${S("tabs")} [role=tab] >> nth=0`), await rectOf(page, `${S("tabs")} [role=tab] >> nth=1`)];
      t(towardEnd(dir, mid(second), mid(first)) > 0, "the tabs run from the inline start");
      await focus(page, `${S("tabs")} [role=tab][tabindex="0"]`);
      await press(page, endKey(dir));
      t((await out(page, "tab")) === "activity", `${endKey(dir)} (toward the inline end) moves to the next tab`, `model ${await out(page, "tab")}`);
    },
  },
  {
    component: "KxCodeBlock",
    region: S("code-block"),
    async run(page, dir, t) {
      const scope = page.locator(S("code-block"));
      await scope.getByRole("tab", { name: "main.ts" }).focus();
      await press(page, endKey(dir));
      t((await scope.getByRole("tab", { name: "app.html" }).getAttribute("aria-selected")) === "true", `${endKey(dir)} (toward the inline end) moves to the next file`);
    },
  },
  {
    component: "KxNumberInput",
    region: S("number-input"),
    async run(page, dir, t) {
      const steps = page.locator(`${S("number-input")} .kx-number-input__step`);
      const [dec, inc] = [await steps.nth(0).evaluate((el) => el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2), await steps.nth(1).evaluate((el) => el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2)];
      t(towardEnd(dir, inc, dec) > 0, "decrease at the inline start, increase at the inline end");
      await steps.nth(1).click();
      await settle(page);
      t((await out(page, "seats")) === "3", "the inline-end control increases", `model ${await out(page, "seats")}`);
    },
  },
  {
    component: "KxPasswordInput",
    region: S("password-input"),
    async run(page, dir, t) {
      const [input, reveal] = [await rectOf(page, `${S("password-input")} input`), await rectOf(page, `${S("password-input")} .kx-password-input__reveal`)];
      t(towardEnd(dir, mid(reveal), mid(input)) > 0, "the reveal control sits at the inline end");
    },
  },
  ...[
    ["KxSegmentedControl", "segmented-control", ".kx-segmented__label"],
    ["KxToggleGroup", "toggle-group", "button.kx-toggle"],
  ].map(([component, subject, item]) => ({
    component,
    region: S(subject),
    async run(page, dir, t) {
      const [first, second] = [await rectOf(page, `${S(subject)} ${item} >> nth=0`), await rectOf(page, `${S(subject)} ${item} >> nth=1`)];
      t(towardEnd(dir, mid(second), mid(first)) > 0, "the first item sits at the inline start");
    },
  })),
];
RTL.push(
  {
    component: "KxInputGroup",
    region: S("input-group"),
    async run(page, dir, t) {
      const scope = `${S("input-group")} kx-input-group >> nth=0`;
      const [text, input, button] = await Promise.all(["kx-input-group-text", "input", "button"].map((p) => rectOf(page, `${scope} >> ${p}`)));
      t(towardEnd(dir, mid(input), mid(text)) > 0 && towardEnd(dir, mid(button), mid(input)) > 0, "text add-on at the inline start, button at the inline end");
    },
  },
  {
    component: "KxInputOtp",
    region: S("input-otp"),
    async run(page, dir, t) {
      const cells = `${S("input-otp")} .kx-input-otp__slot`;
      const [first, second] = [await rectOf(page, `${cells} >> nth=0`), await rectOf(page, `${cells} >> nth=1`)];
      t(towardEnd(dir, mid(second), mid(first)) > 0, "the first cell sits at the inline start");
      await page.locator(`${S("input-otp")} input`).focus();
      await page.keyboard.type("7");
      await settle(page);
      t((await page.locator(`${cells} >> nth=0`).innerText()) === "7", "and the first character fills it");
    },
  },
  {
    component: "KxRating",
    region: S("rating"),
    async run(page, dir, t) {
      const stars = `${S("rating")} kx-rating >> nth=0 >> label`;
      const [first, second] = [await rectOf(page, `${stars} >> nth=0`), await rectOf(page, `${stars} >> nth=1`)];
      t(towardEnd(dir, mid(second), mid(first)) > 0, "the first star sits at the inline start");
      await page.locator(`${S("rating")} kx-rating >> nth=0 >> input >> nth=1`).focus();
      await press(page, "Space");
      await press(page, endKey(dir));
      t((await out(page, "stars")) === "3", `${endKey(dir)} (toward the inline end) raises the rating`, `model ${await out(page, "stars")}`);
    },
  },
);
/**
 * Which way a rendered glyph points, read from its pixels: the ink of an angle mark (‹ ›) is furthest toward its
 * tip in its middle rows and furthest from it at its top and bottom. Returns "right" or "left" — what a reader
 * sees, whatever the source character was.
 */
async function glyphPoints(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  const r = await rectOf(page, selector);
  const dpr = await page.evaluate(() => devicePixelRatio);
  const frame = await framer({ dpr, pad: 2 })(page, r);
  const bg = frame.at(r.left - 1, r.top - 1);
  // Only the glyph's ink decides: its line box carries empty leading above and below.
  // Ink is relative to the glyph's own darkest pixel, so a disabled (deliberately faint) glyph still reads.
  const px = [];
  for (let y = r.top; y <= r.bottom; y += 1 / dpr) for (let x = r.left; x <= r.right; x += 1 / dpr) px.push([x, y, contrast(frame.at(x, y), bg)]);
  const peak = Math.max(...px.map((p) => p[2]));
  if (peak < 1.3) return "unreadable";
  const ink = px.filter((p) => p[2] > 1 + (peak - 1) * 0.4);
  if (ink.length < 6) return "unreadable";
  const [top, bottom] = [Math.min(...ink.map((p) => p[1])), Math.max(...ink.map((p) => p[1]))];
  const third = (bottom - top) / 3;
  const centroid = (y0, y1) => {
    const xs = ink.filter((p) => p[1] >= y0 && p[1] <= y1).map((p) => p[0]);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const middle = centroid(top + third, bottom - third);
  const ends = [centroid(top, top + third), centroid(bottom - third, bottom)].filter((v) => v != null);
  if (middle == null || !ends.length) return "unreadable";
  // A chevron's tip is its middle; the arms trail behind it. The tip is the side it points to.
  return middle > ends.reduce((a, b) => a + b, 0) / ends.length ? "right" : "left";
}
const pointsToward = (dir, seen) => (seen === "unreadable" ? "unreadable" : (seen === "right") === (dir === "ltr") ? "inline end" : "inline start");
RTL.push(
  {
    component: "KxBreadcrumb",
    fixture: "navigation",
    region: S("breadcrumb"),
    async run(page, dir, t) {
      const [home, settings] = [await rectOf(page, "#crumb-home"), await rectOf(page, "#crumb-settings")];
      t(towardEnd(dir, mid(settings), mid(home)) > 0, "the path runs from the inline start");
      const seen = await glyphPoints(page, `${S("breadcrumb")} .kx-breadcrumb__separator`);
      t(pointsToward(dir, seen) === "inline end", "the separator points along the reading direction", `points ${seen}`);
    },
  },
  {
    component: "KxPagination",
    fixture: "navigation",
    region: S("pagination"),
    async run(page, dir, t) {
      const [prev, next] = [await rectOf(page, "#page-prev"), await rectOf(page, "#page-next")];
      t(towardEnd(dir, mid(next), mid(prev)) > 0, "Previous at the inline start, Next at the inline end");
      const [p, n] = [await glyphPoints(page, "#page-prev .kx-pagination__glyph"), await glyphPoints(page, "#page-next .kx-pagination__glyph")];
      t(pointsToward(dir, p) === "inline start" && pointsToward(dir, n) === "inline end", "Previous points back, Next points on, in reading terms", `previous ${p}, next ${n}`);
      const [one, two] = [await rectOf(page, `${S("pagination")} .kx-pagination__link[data-kx-case=current]`), await rectOf(page, `${S("pagination")} li:nth-child(3) button`)];
      t(towardEnd(dir, mid(two), mid(one)) > 0, "page numbers ascend toward the inline end");
    },
  },
  {
    component: "KxTableOfContents",
    fixture: "navigation",
    region: S("table-of-contents"),
    async run(page, dir, t) {
      const startOf = async (sel) => page.locator(sel).evaluate((el, d) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return d === "rtl" ? r.right : r.left;
      }, dir);
      const [top, nested] = [await startOf(`${S("table-of-contents")} li:nth-child(1) a`), await startOf(`${S("table-of-contents")} li:nth-child(2) a`)];
      t(towardEnd(dir, nested, top) > 4, "a nested entry is indented from the inline start", `level 1 text at ${top.toFixed(1)}, level 2 at ${nested.toFixed(1)}`);
      // a bar is a width AND a colour that is not transparent, on the physical side the direction resolves to
      const bar = await page.locator(`${S("table-of-contents")} [aria-current]`).evaluate((el) => {
        const cs = getComputedStyle(el);
        const seen = (w, c) => parseFloat(w) >= 2 && !/rgba\(.*,\s*0\)$/.test(c) && c !== "transparent";
        return { left: seen(cs.borderLeftWidth, cs.borderLeftColor), right: seen(cs.borderRightWidth, cs.borderRightColor), lc: cs.borderLeftColor, rc: cs.borderRightColor };
      });
      const [start, end] = dir === "rtl" ? [bar.right, bar.left] : [bar.left, bar.right];
      t(start && !end, "the current indicator is on the inline-start edge", `left ${bar.left ? "drawn" : "none"} (${bar.lc}), right ${bar.right ? "drawn" : "none"} (${bar.rc})`);
    },
  },
  {
    component: "KxTabBar",
    fixture: "navigation",
    region: S("tab-bar"),
    async run(page, dir, t) {
      const [home, inbox] = [await rectOf(page, "#tb-home"), await rectOf(page, "#tb-inbox")];
      t(towardEnd(dir, mid(inbox), mid(home)) > 0, "the first destination sits at the inline start");
    },
  },
  {
    component: "KxStepper",
    fixture: "navigation",
    region: S("stepper"),
    async run(page, dir, t) {
      const marker = (n) => rectOf(page, `${S("stepper")} ol:first-of-type li:nth-child(${n}) .kx-stepper__marker`);
      const [one, two] = [await marker(1), await marker(2)];
      t(towardEnd(dir, mid(two), mid(one)) > 0, "step 1 sits at the inline start");
      const line = await rectOf(page, `${S("stepper")} ol:first-of-type li:nth-child(1) .kx-stepper__connector`);
      const [lo, hi] = [Math.min(mid(one), mid(two)), Math.max(mid(one), mid(two))];
      t(line.left >= lo && line.right <= hi && line.width > 0, "the connector runs between step 1 and step 2", `${line.left.toFixed(0)}–${line.right.toFixed(0)} within ${lo.toFixed(0)}–${hi.toFixed(0)}`);
      const [vMarker, vText] = [await rectOf(page, "#stepper-vertical li:nth-child(1) .kx-stepper__marker"), await rectOf(page, "#stepper-vertical li:nth-child(1) .kx-stepper__text")];
      t(towardEnd(dir, mid(vText), mid(vMarker)) > 0, "vertical: the marker sits at the inline start of its text");
    },
  },
  {
    component: "KxNavigationBar",
    fixture: "navigation",
    region: S("navigation-bar"),
    async run(page, dir, t) {
      const [back, title, edit] = [await rectOf(page, `${S("navigation-bar")} .kx-navigation-bar__back`), await rectOf(page, `${S("navigation-bar")} .kx-navigation-bar__title`), await rectOf(page, "#nb-edit")];
      t(towardEnd(dir, mid(title), mid(back)) > 0 && towardEnd(dir, mid(edit), mid(title)) > 0, "Back at the inline start, actions at the inline end");
      const seen = await glyphPoints(page, `${S("navigation-bar")} .kx-navigation-bar__glyph`);
      t(pointsToward(dir, seen) === "inline start", "Back points toward the inline start", `points ${seen}`);
    },
  },
  {
    component: "KxAppBar",
    fixture: "navigation",
    region: S("app-bar"),
    async run(page, dir, t) {
      const [brand, overview, reports, action] = [await rectOf(page, `${S("app-bar")} [kxAppBarBrand]`), await rectOf(page, `${S("app-bar")} [data-kx-case=current]`), await rectOf(page, `${S("app-bar")} [data-kx-case=rest]`), await rectOf(page, "#app-bar-new")];
      t(towardEnd(dir, mid(overview), mid(brand)) > 0 && towardEnd(dir, mid(reports), mid(overview)) > 0 && towardEnd(dir, mid(action), mid(reports)) > 0, "brand, links in order, then actions, from the inline start");
    },
  },
  {
    component: "KxAccordion",
    fixture: "navigation",
    region: S("accordion"),
    async run(page, dir, t) {
      const trigger = "#faq kx-accordion-item:nth-child(2) button";
      const [label, chevron] = [await rectOf(page, `${trigger} .kx-accordion__label`), await rectOf(page, `${trigger} .kx-accordion__chevron`)];
      t(towardEnd(dir, mid(chevron), mid(label)) > 0, "the label at the inline start, the chevron at the inline end");
      const align = await page.locator(`${trigger}`).evaluate((el) => getComputedStyle(el).textAlign);
      t(["start", dir === "rtl" ? "right" : "left"].includes(align), "the label aligns to the inline start", align);
      await focus(page, trigger);
      await press(page, "ArrowDown");
      t((await page.evaluate(() => document.activeElement?.textContent?.trim())) === "What does the warranty cover?", "ArrowDown still moves down: block-axis keys do not mirror");
    },
  },
  {
    component: "KxFooter",
    fixture: "navigation",
    region: S("footer"),
    async run(page, dir, t) {
      const [product, company] = [await rectOf(page, `${S("footer")} kx-footer-column:nth-child(1)`), await rectOf(page, `${S("footer")} kx-footer-column:nth-child(2)`)];
      t(towardEnd(dir, mid(company), mid(product)) > 0, "the first column sits at the inline start");
    },
  },
);
const DIRECTION_CASES = [
  { page: "ltr", region: null },
  { page: "rtl", region: null },
  { page: "rtl", region: "ltr" },
  { page: "ltr", region: "rtl" },
];
if (runs("rtl")) {
  assertClaims("rtl", RTL);
  report.push(`\nrtl — ${RTL.length} components in ${DIRECTION_CASES.length} direction cases`);
  for (const c of DIRECTION_CASES) {
    const want = c.region ?? c.page;
    const label = c.region ? `${c.region} region in an ${c.page} page` : `${c.page} page`;
    for (const subject of RTL) {
      const context = await browser.newContext({ viewport: subject.viewport ?? { width: 1024, height: 1400 } });
      const page = await open(context, subject.fixture ?? "behaviour", { dir: c.page });
      const name = `${subject.component} (${label})`;
      try {
        if (c.region) await page.locator(subject.region).first().evaluate((el, d) => el.closest("section").setAttribute("dir", d), c.region);
        await settle(page);
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
 * kx-verify: reducedMotion
 *
 * React's motion contract (scripts/motion.mjs, motion-states.mjs), on every Angular component that animates on
 * interaction. Each declared motion runs in both directions of travel, in an LTR and an RTL page, twice: with
 * normal motion the property passes a rendered midpoint strictly between its end states over a duration a
 * person can see (≥ PERCEPTIBLE_MS); under `prefers-reduced-motion` it arrives with no animation longer than
 * SUPPRESSED_MS, at the same end state. The midpoint is obtained by pausing and seeking the running
 * transitions (Web Animations), never by sleeping.
 *
 *   KxSwitch        the thumb along `inset-inline-start`, off → on and on → off
 *   KxAccordion     the content's block size, expand and collapse; and the chevron's rotation
 *   KxCollapsible   the content's block size, expand and collapse
 *   KxAppBar        below 48rem, the menu panel's block size, open and close
 *
 * A disclosure is also checked for where it LANDS, in both modes, after every animation has finished: open is
 * taller than zero, visible and `aria-expanded="true"`; closed is zero, `visibility: hidden` (out of the tab
 * order and the accessibility tree) and `aria-expanded="false"`. Reduced motion must change how it gets there,
 * not where it ends up — so a collapse that skipped its transition but left the content reachable fails.
 * Nothing else in the Angular catalogue animates on interaction (the looping indicators are held to the 3s
 * floor in the accessibility pass above).
 * ════════════════════════════════════════════════════════════════════════════ */
const DISCLOSURE_LANDING = { expand: "open", collapse: "closed" };
const MOTION = [
  { component: "KxSwitch", control: "#sw-push .kx-switch", target: "#sw-push .kx-switch__thumb", property: "insetInlineStart" },
  { component: "KxAccordion", fixture: "navigation", travels: ["expand", "collapse"], control: "#faq kx-accordion-item:nth-child(2) button", target: "#faq kx-accordion-item:nth-child(2) kx-accordion-content", property: "height", landing: true },
  { component: "KxAccordion", fixture: "navigation", travels: ["expand", "collapse"], what: "chevron", control: "#faq kx-accordion-item:nth-child(4) button", target: "#faq kx-accordion-item:nth-child(4) .kx-accordion__chevron", property: "transform" },
  { component: "KxCollapsible", fixture: "navigation", travels: ["expand", "collapse"], control: "#advanced-trigger", target: "#advanced kx-collapsible-content", property: "height", landing: true },
  { component: "KxAppBar", fixture: "navigation", travels: ["expand", "collapse"], viewport: { width: 390, height: 1400 }, control: `${S("app-bar")} .kx-app-bar__toggle`, target: `${S("app-bar")} nav`, property: "height", landing: true },
];

/** Trigger, then read STATE A, the midpoint of every running transition on the target, and STATE B. */
function sampleMotion(page, { control, target, property }) {
  return page.evaluate(
    ({ control, target, property }) =>
      new Promise((resolve) => {
        const el = document.querySelector(target);
        // A rotation is read as its angle: a matrix string has no "between".
        const read = () => {
          const v = getComputedStyle(el)[property];
          if (property !== "transform") return v;
          const m = v === "none" ? [1, 0] : v.match(/matrix\(([^)]+)\)/)[1].split(",").map(Number);
          return `${((Math.atan2(m[1], m[0]) * 180) / Math.PI + 360) % 360}deg`;
        };
        const a = read();
        document.querySelector(control).click();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const running = el.getAnimations().filter((x) => Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
            const longest = Math.max(0, ...running.map((x) => Number(x.effect.getComputedTiming().activeDuration)));
            running.forEach((x) => x.pause());
            running.forEach((x) => (x.currentTime = longest / 2));
            const mid = running.length ? read() : null;
            running.forEach((x) => x.finish());
            requestAnimationFrame(() => resolve({ a, mid, b: read(), durationMs: longest }));
          }),
        );
      }),
    { control, target, property },
  );
}
/** Where a disclosure came to rest, once every transition (including the delayed visibility) has finished. */
async function landed(page, { control, target }) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  return page.evaluate(
    ({ control, target }) => {
      const el = document.querySelector(target);
      return {
        height: el.getBoundingClientRect().height,
        visibility: getComputedStyle(el).visibility,
        expanded: document.querySelector(control).getAttribute("aria-expanded"),
      };
    },
    { control, target },
  );
}
if (runs("reducedMotion")) {
  assertClaims("reducedMotion", MOTION);
  const { PERCEPTIBLE_MS, SUPPRESSED_MS } = await import("./motion-states.mjs");
  report.push(`\nreducedMotion — ${MOTION.length} motions on ${new Set(MOTION.map((m) => m.component)).size} components, both directions of travel, normal and reduced`);
  for (const subject of MOTION) {
    const travels = subject.travels ?? ["off → on", "on → off"];
    const label = `${subject.component}${subject.what ? ` ${subject.what}` : ""}`;
    for (const dir of ["ltr", "rtl"]) {
      const ends = {};
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: subject.viewport ?? { width: 1024, height: 1400 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, subject.fixture ?? "behaviour", { dir });
        for (const travel of travels) {
          const name = `${label} ${travel} (${dir}, ${reduced ? "reduced" : "normal"} motion)`;
          try {
            const m = await sampleMotion(page, subject);
            await settle(page);
            const [a, mid, b] = [m.a, m.mid, m.b].map((v) => (v == null ? null : parseFloat(v)));
            if (!reduced) {
              ends[travel] = b;
              const between = mid != null && Math.min(a, b) < mid && mid < Math.max(a, b);
              check(m.durationMs >= PERCEPTIBLE_MS && between, `${name}: travels through a rendered midpoint`, `${m.a} → ${m.mid} → ${m.b} over ${m.durationMs}ms`);
            } else {
              check(m.durationMs <= SUPPRESSED_MS, `${name}: no perceptible motion`, `${m.durationMs}ms`);
              check(Math.abs(b - ends[travel]) <= 1, `${name}: lands on the same end state`, `${m.b} (normal: ${ends[travel]})`);
            }
            if (subject.landing) {
              const at = await landed(page, subject);
              const want = DISCLOSURE_LANDING[travel];
              const ok = want === "open" ? at.height > 0 && at.visibility === "visible" && at.expanded === "true" : at.height === 0 && at.visibility === "hidden" && at.expanded === "false";
              check(ok, `${name}: comes to rest ${want}`, `${at.height.toFixed(1)}px, ${at.visibility}, aria-expanded=${at.expanded}`);
            } else {
              await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
            }
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
  console.error(`\n✗ angular-browser: ${failures.length} failure(s)\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`\nangular-browser ok — @kinetixui/angular, live in Chromium.`);
