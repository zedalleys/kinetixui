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
const out = (page, key) => page.locator(`output[data-kx-out="${key}"]`).innerText();
const activeId = (page) => page.evaluate(() => document.activeElement?.closest("[id]")?.id ?? null);

async function axe(page, scope = "kx-fixture") {
  await page.evaluate(axeSource);
  return page.evaluate(async (sel) => {
    // The same rule set as the React pass (a11y-browser.mjs): every rule on except the three that judge a
    // whole page's landmarks and heading outline, which a fixture showing one component does not have.
    const opts = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
    const r = await window.axe.run(sel, opts);
    return r.violations.map((v) => ({ id: v.id, help: v.help, targets: v.nodes.slice(0, 3).map((n) => String(n.target)) }));
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

const STATE_FIXTURES = ["selection", "entry", "composite", "card", "behaviour"];

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
      const violations = await axe(page);
      check(violations.length === 0, `axe ${name}`, violations.map((v) => `${v.id} (${v.targets.join(" | ")})`).join("; "));
      await page.close();
    }
    await context.close();
  }

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
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || !el.closest("kx-fixture")) return null;
          // A visually hidden native control (a radio inside a segment or toggle) draws its ring on its label.
          const shown = el.matches("input[type=radio]") && getComputedStyle(el).opacity === "0" ? el.nextElementSibling ?? el : el;
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
 *   text entry   KxInput, KxLabel, KxField, KxTextarea, KxNativeSelect, KxNumberInput, KxPasswordInput
 *   selection    KxCheckbox, KxSwitch, KxRadioGroup, KxSegmentedControl, KxSlider, KxToggle, KxToggleGroup
 *   navigation   KxTabs, KxCodeBlock
 *   disclosure   KxBanner, KxInform, KxTag, KxList (dismiss, remove and press — Angular has no accordion yet)
 *   surface      KxCard (static: not a stop, no role)
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
    },
  },
];
if (runs("interaction")) {
  assertClaims("interaction, accessibility", BEHAVIOUR);
  report.push(`\ninteraction — ${BEHAVIOUR.length} components driven by keyboard in Chromium`);
  for (const theme of ["light"]) {
    for (const subject of BEHAVIOUR) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 1400 } });
      const page = await open(context, "behaviour", { theme });
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
 *     KxCheckbox, KxRadioGroup, KxSwitch, KxToggle, KxToggleGroup, KxSlider
 *   text-bearing controls (their text grows ≥1.8x and the box absorbs all of it, nothing truncated)
 *     KxInput, KxTextarea, KxNativeSelect, KxNumberInput, KxPasswordInput, KxTabs, KxLabel, KxField,
 *     KxSegmentedControl, KxButton
 *
 * Every subject, both kinds: no clipping ancestor, no part escaping its container, no colliding label / control
 * / help / error boxes, no horizontal page overflow at 1024px or at 390px, a target of at least 24px.
 * ════════════════════════════════════════════════════════════════════════════ */
const S = (subject) => `section[data-kx-subject=${subject}]`;
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
    const shown =
      el.matches("input[type=radio]") && getComputedStyle(el).opacity === "0"
        ? el.nextElementSibling ?? el
        : el.matches("input") ? el.closest(".kx-number-input, .kx-password-input") ?? el : el;
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
      const page = await open(context, "behaviour");
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
        }
      } catch (err) {
        check(false, `${name}: ran to completion`, String(err.message).split("\n")[0]);
      }
      await context.close();
    }
  }
  // And the page as a whole: nothing on it, claimed here or not, makes a phone scroll sideways at 200%.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 1400 } });
    const page = await open(context, "behaviour");
    await setRootFontSize(page, 16 * SCALE);
    await settle(page);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll("section[data-kx-subject]")].filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => s.dataset.kxSubject),
    );
    check(overflowX <= 0 && wide.length === 0, `the whole page fits 390px at ${SCALE}x text`, `${overflowX}px; ${wide.join(", ")}`);
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
      const context = await browser.newContext({ viewport: { width: 1024, height: 1400 } });
      const page = await open(context, "behaviour", { dir: c.page });
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
 * React's motion contract (scripts/motion.mjs, motion-states.mjs), on the one Angular component that owes it:
 * KxSwitch, whose thumb travels along `inset-inline-start`. Both directions of travel, in an LTR and an RTL
 * page, twice: with normal motion the thumb passes a rendered midpoint strictly between its end states over a
 * duration a person can see (≥ PERCEPTIBLE_MS); under `prefers-reduced-motion` it arrives with no animation
 * longer than SUPPRESSED_MS, at the same end state. Nothing else in the Angular catalogue animates on
 * interaction (the looping indicators are held to the 3s floor in the accessibility pass above).
 * ════════════════════════════════════════════════════════════════════════════ */
const MOTION = [{ component: "KxSwitch", control: "#sw-push .kx-switch", target: "#sw-push .kx-switch__thumb", property: "insetInlineStart" }];

/** Trigger, then read STATE A, the midpoint of every running transition on the target, and STATE B. */
function sampleMotion(page, { control, target, property }) {
  return page.evaluate(
    ({ control, target, property }) =>
      new Promise((resolve) => {
        const el = document.querySelector(target);
        const a = getComputedStyle(el)[property];
        document.querySelector(control).click();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const running = el.getAnimations().filter((x) => Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
            const longest = Math.max(0, ...running.map((x) => Number(x.effect.getComputedTiming().activeDuration)));
            running.forEach((x) => x.pause());
            running.forEach((x) => (x.currentTime = longest / 2));
            const mid = running.length ? getComputedStyle(el)[property] : null;
            running.forEach((x) => x.finish());
            requestAnimationFrame(() => resolve({ a, mid, b: getComputedStyle(el)[property], durationMs: longest }));
          }),
        );
      }),
    { control, target, property },
  );
}
if (runs("reducedMotion")) {
  assertClaims("reducedMotion", MOTION);
  const { PERCEPTIBLE_MS, SUPPRESSED_MS } = await import("./motion-states.mjs");
  report.push(`\nreducedMotion — ${MOTION.length} component, both directions of travel, normal and reduced`);
  for (const subject of MOTION) {
    for (const dir of ["ltr", "rtl"]) {
      const ends = {};
      for (const reduced of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 1400 }, reducedMotion: reduced ? "reduce" : "no-preference" });
        const page = await open(context, "behaviour", { dir });
        for (const travel of ["off → on", "on → off"]) {
          const name = `${subject.component} ${travel} (${dir}, ${reduced ? "reduced" : "normal"} motion)`;
          const m = await sampleMotion(page, subject);
          await settle(page);
          const [a, mid, b] = [m.a, m.mid, m.b].map((v) => (v == null ? null : parseFloat(v)));
          if (!reduced) {
            ends[travel] = b;
            const between = mid != null && Math.min(a, b) < mid && mid < Math.max(a, b);
            check(m.durationMs >= PERCEPTIBLE_MS && between, `${name}: travels through a rendered midpoint`, `${m.a} → ${m.mid} → ${m.b} over ${m.durationMs}ms`);
          } else {
            check(m.durationMs <= SUPPRESSED_MS, `${name}: no perceptible motion`, `${m.durationMs}ms`);
            check(Math.abs(b - ends[travel]) <= 1, `${name}: lands on the same end state`, `${m.b} (normal: ${ends[travel]}px)`);
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
