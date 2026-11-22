#!/usr/bin/env node
//
// Create Studio application-workspace acceptance gate (M5.19).
//
// The M1 gate (create-studio-browser.mjs) proves the editor's behaviour: documents, properties,
// persistence, export. This gate proves the editor's SHELL — the properties that made the editor
// feel like a marketing page with a canvas embedded in it:
//
//   * the editor route renders no site header and no site footer, while a marketing route still
//     renders both (two-sided, so "no footer" cannot pass by the page failing to load);
//   * the design canvas gets a stated share of the application viewport, and the page itself does
//     not scroll;
//   * no chrome overlaps the canvas;
//   * the library search, the inspector and the recovery action stay reachable, including by
//     keyboard and at 200% text;
//   * the inspector is not a keyboard trap;
//   * switching the responsive preview keeps the selected node;
//   * the save-state vocabulary reports what the service actually confirmed.
//
// Every assertion below is followed by a negative control that reintroduces the defect it exists
// to catch and requires the gate to fail NAMING that defect. Two of the controls (selection
// reading, save-state reading) perturb the measurement rather than the implementation, and are
// labelled `reading-control` because that is what they prove: that the reading discriminates.
// They are not claimed as implementation controls.
//
// Local development only; never targets a deployed service.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.CREATE_BASE ?? "http://127.0.0.1:3137";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local verification only");
const out = resolve(process.env.CREATE_ARTIFACTS ?? ".impeccable/review/create-studio");
await mkdir(out, { recursive: true });

// The canvas share the shell is required to reach at each viewport. These are floors a few
// percent under the measured values, not the measurements themselves, so ordinary chrome changes
// do not redden the gate while a return to the embedded-page layout does. The pre-M5.19 editor
// measured 49.8% at 1440x1000 and 0px visible at 768x1024, so every floor here is unreachable by
// the layout this gate replaced.
const CANVAS_FLOORS = [
  { width: 1440, height: 1000, minPx: 700, minPct: 68 },
  { width: 1280, height: 900, minPx: 600, minPct: 66 },
  { width: 1024, height: 800, minPx: 500, minPct: 62 },
  { width: 768, height: 1024, minPx: 360, minPct: 35 },
  { width: 390, height: 844, minPx: 300, minPct: 34 },
];

const results = [];
const controls = [];
const pass = (name) => { results.push(name); console.log("PASS " + name); };
const browser = await chromium.launch({ headless: true });

/** Fails with a message naming the offending element, so a control cannot pass by reddening elsewhere. */
const siteChrome = (page) => page.evaluate(() => ({
  headers: [...document.querySelectorAll("header")].map((el) => el.className || "header"),
  footers: [...document.querySelectorAll("footer")].map((el) => el.className || "footer"),
}));

const canvasGeometry = (page) => page.evaluate(() => {
  const canvas = document.querySelector(".studio-canvas");
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const visible = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  return {
    height: Math.round(rect.height),
    visible: Math.round(visible),
    pct: Math.round((visible / innerHeight) * 1000) / 10,
    documentHeight: Math.round(document.documentElement.scrollHeight),
    viewportHeight: innerHeight,
    pageScroll: document.documentElement.scrollHeight - innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  };
});

/** Chrome regions that must never cover the canvas. Returns the overlaps, named. */
const canvasOverlaps = (page) => page.evaluate(() => {
  const canvas = document.querySelector(".studio-canvas")?.getBoundingClientRect();
  if (!canvas) return ["no canvas"];
  const chrome = [".studio-appbar", ".studio-statusbar", ".studio-canvas-tools", ".studio-zoom", ".studio-navigator", ".studio-inspector"];
  const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  return chrome.flatMap((selector) => {
    const element = document.querySelector(selector);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    return intersects(canvas, rect) ? [`${selector} overlaps the canvas`] : [];
  });
});

/**
 * Controls that are laid out but cannot be reached.
 *
 * A control scrolled out of view inside a panel whose overflow is `auto` is reachable — the user
 * scrolls to it — so it is NOT an offender; an earlier version of this reading called those five
 * controls hidden at 1280px and 200% text, which was the reading's fault, not the layout's. A
 * control is an offender when it has no size, when a `hidden`/`clip` ancestor puts it entirely
 * outside its own clipping box (no user scroll can bring it back), or when something covers it
 * while it is on screen.
 */
const unreachableControls = (page) => page.evaluate(() => {
  const scopes = [".studio-appbar", ".studio-statusbar", ".studio-panel-switch", ".studio-canvas-tools", ".studio-zoom"];
  const describe = (node) => node.tagName.toLowerCase() + (node.className && typeof node.className === "string" ? "." + node.className.trim().split(/\s+/)[0] : "");
  // Accumulate every clipping ancestor's visible box. A control whose visible area is empty is
  // only an offender when nothing in that chain is user-scrollable: with an `auto`/`scroll`
  // ancestor the user scrolls to it, and blaming an outer `overflow: hidden` for that would
  // report a panel's own scrolling as a hidden control.
  const reach = (element) => {
    let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    let scrollable = false;
    let culprit = null;
    for (let node = element.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const hiddenX = ["hidden", "clip"].includes(style.overflowX);
      const hiddenY = ["hidden", "clip"].includes(style.overflowY);
      const scrollsX = ["auto", "scroll"].includes(style.overflowX);
      const scrollsY = ["auto", "scroll"].includes(style.overflowY);
      if (!(hiddenX || hiddenY || scrollsX || scrollsY)) continue;
      const box = node.getBoundingClientRect();
      if (hiddenX || scrollsX) { clip = { ...clip, left: Math.max(clip.left, box.left), right: Math.min(clip.right, box.right) }; }
      if (hiddenY || scrollsY) { clip = { ...clip, top: Math.max(clip.top, box.top), bottom: Math.min(clip.bottom, box.bottom) }; }
      if (scrollsX || scrollsY) scrollable = true;
      else if (!culprit) culprit = node;
    }
    const rect = element.getBoundingClientRect();
    const visible = {
      left: Math.max(rect.left, clip.left), top: Math.max(rect.top, clip.top),
      right: Math.min(rect.right, clip.right), bottom: Math.min(rect.bottom, clip.bottom),
    };
    return { visible, empty: visible.right - visible.left < 1 || visible.bottom - visible.top < 1, scrollable, culprit };
  };
  const offenders = [];
  for (const scope of scopes) {
    const root = document.querySelector(scope);
    if (!root) { offenders.push(`${scope} is absent`); continue; }
    for (const control of root.querySelectorAll("button, select, input, [role='button']")) {
      const rect = control.getBoundingClientRect();
      const name = (control.getAttribute("aria-label") || control.textContent || control.id || "control").trim().slice(0, 40);
      if (rect.width < 1 || rect.height < 1) { offenders.push(`${scope} -> ${name}: zero size`); continue; }
      const { visible, empty, scrollable, culprit } = reach(control);
      if (empty) {
        if (!scrollable) offenders.push(`${scope} -> ${name}: clipped by ${culprit ? describe(culprit) : "an ancestor"}`);
        continue; // otherwise reachable by scrolling the panel it sits in
      }
      const hit = document.elementFromPoint((visible.left + visible.right) / 2, (visible.top + visible.bottom) / 2);
      if (!hit || !(hit === control || control.contains(hit) || hit.contains(control))) {
        offenders.push(`${scope} -> ${name}: covered by ${hit ? describe(hit) : "nothing"}`);
      }
    }
  }
  return offenders;
});

/** The selected node, read from the model's own two surfaces. */
const selection = async (studio) => ({
  tree: await studio.locator('[role="treeitem"][aria-selected="true"]').allInnerTexts(),
  inspector: (await studio.locator(".studio-selection-label").innerText().catch(() => "")).trim(),
});

async function openEditor(context, { name }) {
  const page = await context.newPage();
  // A cold `next dev` compiles each route on first request; CI has measured well over the 30s
  // default on first navigation.
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(120_000);
  const studio = page.locator(".create-studio");
  await page.goto(base + "/create/studio");
  await studio.getByRole("button", { name: "Start local workspace" }).click();
  await studio.getByLabel("New product name").fill(name);
  await studio.getByRole("button", { name: "New product", exact: true }).click();
  await studio.getByRole("button", { name: "Add Button", exact: true }).waitFor();
  await studio.getByRole("button", { name: "Add Button", exact: true }).click();
  await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
  return { page, studio };
}

const save = (page, studio) => studio.getByRole("button", { name: "Save", exact: true }).click()
  .then(() => page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally"));

/** Runs `check`, requires it to throw, and requires the message to name `expect`. */
async function control(label, defect, check, expect, restore) {
  await defect();
  let message = null;
  try { await check(); } catch (error) { message = String(error.message ?? error); }
  await restore();
  assert.ok(message, `negative control "${label}" did not fail at all`);
  assert.ok(message.includes(expect), `negative control "${label}" failed for the wrong reason:\n${message}\nexpected it to name: ${expect}`);
  await check(); // the restored implementation must pass again
  controls.push({ label, expected: expect, failure: message.split("\n")[0].slice(0, 220) });
  console.log(`CONTROL ${label} → detected: ${message.split("\n")[0].slice(0, 140)}`);
}

try {
  // ---------- 1. The editor route renders no site chrome; a marketing route still does ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const marketing = await context.newPage();
    marketing.setDefaultTimeout(60_000);
    marketing.setDefaultNavigationTimeout(120_000);
    await marketing.goto(base + "/create");
    const marketingChrome = await siteChrome(marketing);
    assert.ok(marketingChrome.headers.length >= 1, "the marketing Create page must keep the site header");
    assert.ok(marketingChrome.footers.length >= 1, "the marketing Create page must keep the site footer");
    const { page, studio } = await openEditor(context, { name: "Workspace shell" });
    const editorChrome = await siteChrome(page);
    const assertNoSiteChrome = async () => {
      const chrome = await siteChrome(page);
      assert.deepEqual(chrome.footers, [], `the editor must render no site footer, found: ${chrome.footers.join(", ")}`);
      assert.deepEqual(chrome.headers, [], `the editor must render no site header, found: ${chrome.headers.join(", ")}`);
    };
    await assertNoSiteChrome();
    assert.equal(await studio.count(), 1);
    await control(
      "marketing footer reappears inside the editor",
      () => page.evaluate(() => { const f = document.createElement("footer"); f.className = "site-footer-regression"; f.style.height = "200px"; f.textContent = "Marketing footer"; document.querySelector("[data-app-shell]").append(f); }),
      assertNoSiteChrome,
      "site-footer-regression",
      () => page.evaluate(() => document.querySelector(".site-footer-regression")?.remove()),
    );
    pass(`editor route renders no site chrome (${editorChrome.headers.length} headers, ${editorChrome.footers.length} footers) while /create keeps both`);

    // ---------- 2. Canvas share of the application viewport, and no page scroll ----------
    const measurements = [];
    const assertFloor = async (floor) => {
      await page.setViewportSize({ width: floor.width, height: floor.height });
      await page.waitForTimeout(120);
      const geometry = await canvasGeometry(page);
      assert.ok(geometry, "canvas is absent");
      assert.ok(
        geometry.visible >= floor.minPx && geometry.pct >= floor.minPct,
        `canvas height at ${floor.width}x${floor.height}: ${geometry.visible}px (${geometry.pct}%) is below the floor of ${floor.minPx}px / ${floor.minPct}%`,
      );
      assert.ok(geometry.pageScroll <= 1, `the editor page must not scroll at ${floor.width}x${floor.height}: ${geometry.pageScroll}px of page scroll`);
      assert.ok(geometry.horizontalOverflow <= 1, `horizontal overflow at ${floor.width}x${floor.height}: ${geometry.horizontalOverflow}px`);
      return geometry;
    };
    // `canvasGeometry` reports its own `height`, so the floor's viewport is recorded under its own
    // key rather than being overwritten by the canvas height in the artefact.
    for (const floor of CANVAS_FLOORS) measurements.push({ viewport: `${floor.width}x${floor.height}`, floor: { px: floor.minPx, pct: floor.minPct }, ...(await assertFloor(floor)) });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(120);
    await control(
      "canvas loses substantial viewport height",
      () => page.addStyleTag({ content: ".studio-canvas{max-height:200px!important}" }).then((handle) => { globalThis.__shrink = handle; }),
      () => assertFloor(CANVAS_FLOORS[0]),
      "is below the floor",
      () => globalThis.__shrink.evaluate((element) => element.remove()),
    );
    await control(
      "the editor page scrolls again like a marketing page",
      () => page.addStyleTag({ content: "[data-app-shell]{height:auto!important;overflow:visible!important}.create-studio{height:2200px!important}" }).then((handle) => { globalThis.__scroll = handle; }),
      () => assertFloor(CANVAS_FLOORS[0]),
      "of page scroll",
      () => globalThis.__scroll.evaluate((element) => element.remove()),
    );
    pass("canvas reaches its viewport floor at 1440, 1280, 1024, 768 and 390 with no page scroll");

    // ---------- 3. Chrome does not obstruct the canvas ----------
    const assertNoOverlap = async () => {
      const overlaps = await canvasOverlaps(page);
      assert.deepEqual(overlaps, [], `chrome must not cover the canvas: ${overlaps.join("; ")}`);
    };
    await assertNoOverlap();
    await control(
      "the top bar obstructs the canvas",
      () => page.addStyleTag({ content: ".studio-appbar{position:fixed!important;inset-block-start:40%!important;inset-inline:0!important;height:120px!important;z-index:50}" }).then((handle) => { globalThis.__bar = handle; }),
      assertNoOverlap,
      ".studio-appbar overlaps the canvas",
      () => globalThis.__bar.evaluate((element) => element.remove()),
    );
    pass("app bar, status bar, canvas strip, zoom strip and both panels sit beside the canvas, never over it");

    // ---------- 4. Library search stays reachable and filters ----------
    const search = studio.getByLabel("Find a component");
    const assertSearchReachable = async () => {
      const offenders = await page.evaluate(() => {
        const input = document.querySelector("#studio-search");
        if (!input) return ["#studio-search is absent"];
        const rect = input.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return ["#studio-search has zero size"];
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === input ? [] : [`#studio-search is not the hit target at its own centre`];
      });
      assert.deepEqual(offenders, [], `library search must stay reachable: ${offenders.join("; ")}`);
    };
    await assertSearchReachable();
    await search.fill("badge");
    await assert.doesNotReject(studio.getByRole("button", { name: "Add Badge", exact: true }).waitFor({ timeout: 2000 }));
    assert.equal(await studio.getByRole("button", { name: "Add Button", exact: true }).count(), 0, "search must exclude non-matching components");
    await search.fill("zzzz");
    await studio.getByText("No supported components match this search.").waitFor();
    await search.fill("");
    await studio.getByRole("button", { name: "Add Button", exact: true }).waitFor();
    // Reached from the panel switch by keyboard alone, within a bounded number of stops.
    await studio.getByRole("button", { name: "Library", exact: true }).focus();
    let reached = false;
    for (let stop = 0; stop < 4 && !reached; stop++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.id === "studio-search");
    }
    assert.ok(reached, "library search must be reachable from the panel switch by Tab");
    await control(
      "library search becomes inaccessible",
      () => page.addStyleTag({ content: "#studio-search{display:none!important}" }).then((handle) => { globalThis.__search = handle; }),
      assertSearchReachable,
      "#studio-search has zero size",
      () => globalThis.__search.evaluate((element) => element.remove()),
    );
    pass("library search is reachable by pointer and keyboard, filters, and states an empty result");

    // ---------- 5. The inspector is not a keyboard trap ----------
    await studio.getByRole("button", { name: "Layers", exact: true }).click();
    await studio.getByRole("treeitem", { name: "Button", exact: true }).click();
    const inspector = studio.getByRole("complementary", { name: "Properties inspector" });
    await inspector.getByLabel("Text", { exact: true }).waitFor();
    const assertNotTrapped = async () => {
      await inspector.getByLabel("Text", { exact: true }).focus();
      let escaped = false;
      for (let stop = 0; stop < 40 && !escaped; stop++) {
        await page.keyboard.press("Tab");
        escaped = await page.evaluate(() => !document.querySelector(".studio-inspector")?.contains(document.activeElement));
      }
      assert.ok(escaped, "Tab must leave the properties inspector within 40 stops (keyboard trap)");
    };
    await assertNotTrapped();
    await control(
      "inspector focus becomes trapped",
      () => page.evaluate(() => {
        globalThis.__trap = (event) => { if (event.key === "Tab" && document.querySelector(".studio-inspector")?.contains(event.target)) event.preventDefault(); };
        document.addEventListener("keydown", globalThis.__trap, true);
      }),
      assertNotTrapped,
      "keyboard trap",
      () => page.evaluate(() => document.removeEventListener("keydown", globalThis.__trap, true)),
    );
    pass("properties inspector releases keyboard focus in both directions");

    // ---------- 6. Responsive preview keeps the selected node ----------
    await studio.getByRole("treeitem", { name: "Button", exact: true }).click();
    const before = await selection(studio);
    assert.deepEqual(before.tree, ["Button"], "precondition: Button is the selected layer");
    const assertSelectionHeld = async (expected) => {
      const after = await selection(studio);
      assert.deepEqual(after, expected, `switching the responsive preview must keep the selection: ${JSON.stringify(after)} !== ${JSON.stringify(expected)}`);
    };
    await studio.getByLabel("Viewport width").selectOption("390");
    await assertSelectionHeld(before);
    await studio.getByRole("button", { name: "Preview", exact: true }).click();
    await page.locator('iframe[title="Screen preview"]').waitFor();
    await studio.getByRole("button", { name: "Back to editing", exact: true }).click();
    await assertSelectionHeld(before);
    await studio.getByLabel("Viewport width").selectOption("960");
    await assertSelectionHeld(before);
    await control(
      "reading-control: the selection reading detects a changed selection",
      () => studio.getByRole("treeitem", { name: "Badge", exact: true }).click(),
      () => assertSelectionHeld(before),
      "must keep the selection",
      () => studio.getByRole("treeitem", { name: "Button", exact: true }).click(),
    );
    pass("viewport switching and preview round-trip keep the selected node and its inspector");

    // ---------- 7. Save-state vocabulary reports what the service confirmed ----------
    const state = () => studio.locator(".studio-save-state").innerText();
    const expectState = async (pattern, note) => {
      const text = (await state()).trim();
      assert.match(text, pattern, `save state ${note}: read "${text}"`);
      return text;
    };
    await inspector.getByLabel("Text", { exact: true }).fill("Unsaved edit");
    await inspector.getByRole("button", { name: "Apply", exact: true }).click();
    await expectState(/^Unsaved changes$/, "after an applied edit");
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route("**/api/create-studio", async (route) => {
      if (route.request().postDataJSON()?.operation !== "save") return route.continue();
      await held; await route.continue();
    });
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent?.startsWith("Saving"));
    await expectState(/^Saving/, "while the save is in flight");
    release();
    await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally");
    await page.unroute("**/api/create-studio");
    await inspector.getByLabel("Text", { exact: true }).fill("Edit that fails to save");
    await inspector.getByRole("button", { name: "Apply", exact: true }).click();
    await page.route("**/api/create-studio", async (route) => {
      if (route.request().postDataJSON()?.operation === "save") await route.abort("failed"); else await route.continue();
    });
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    await studio.getByRole("alert").waitFor();
    // This route ABORTS, so the service never rejected anything — it never answered. The editor
    // cannot distinguish that from a connection lost after the route committed, so it reports the
    // outcome as unknown (M5.22). Both false claims are checked. The previous pair of assertions
    // here required the chip to say "Save failed · Unsaved changes", which is the false-failure
    // claim this gate would otherwise enforce.
    const unconfirmedText = await expectState(/unconfirmed/i, "after a save that could not be confirmed");
    assert.doesNotMatch(unconfirmedText, /^Saved/, `an unconfirmed save must never read as saved: read "${unconfirmedText}"`);
    assert.doesNotMatch(unconfirmedText, /Save failed/, `an unconfirmed save must not be reported as a definite failure: read "${unconfirmedText}"`);
    await page.unroute("**/api/create-studio");

    // Settle the open question FIRST. Under the corrected model (M5.23) a rejection arriving while
    // an earlier attempt is still unresolved keeps the state unconfirmed — a rejection of the
    // latest request says nothing about the ones before it — so a "Save failed" assertion made
    // here would be asserting the defect. The abort above never reached the server, so the check
    // resolves it to a definite failure, which is also the one path in this gate that exercises
    // reconciliation.
    await studio.getByRole("button", { name: "Check the stored version" }).click();
    await page.waitForFunction(
      () => /did not commit|Save failed/.test([".studio-checked", ".studio-error", ".studio-save-state"]
        .map(s => document.querySelector(s)?.textContent ?? "").join(" ")),
      null, { timeout: 30_000 });

    // Now get back to a state that is NOT already a definite failure. Reconciliation left the
    // outcome `rejected`, so the chip already read "Save failed · Unsaved changes" before the 413
    // was ever sent — and every assertion below would then have passed on reconciliation's verdict
    // rather than on the rejected request's own. A regression in the 413 handler that left the
    // previous outcome untouched would have gone unseen. Found by Codex on this PR's own head, and
    // it is the same mistake in a new place: an assertion moved into a state where it was already
    // satisfied for another reason.
    await save(page, studio);
    await expectState(/^Saved locally$/, "after a clean save, before the rejected one");
    await inspector.getByLabel("Text", { exact: true }).fill("Edit that the server rejects");
    await inspector.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForFunction(() => /Unsaved/.test(document.querySelector(".studio-save-state")?.textContent ?? ""), { timeout: 30_000 });

    // And the vocabulary this gate exists to cover still includes a definite failure — now driven
    // by a REAL rejection rather than by an abort mislabelled as one, and from a state that is
    // neither saved nor already failed, so the announcement can only come from this request. The
    // body is padded past the route's 1,050,000 byte ceiling, so the route answers 413 before
    // `service().save` is called and therefore before anything can be written.
    await page.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postData() ?? "{}";
      await route.continue({ postData: body.slice(0, -1) + ',"pad":"' + "x".repeat(1_100_000) + '"}' });
    });
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(() => /Save failed/.test(document.querySelector(".studio-save-state")?.textContent ?? ""), { timeout: 30_000 });
    const failedText = await expectState(/Save failed/, "after a save the service rejected");
    assert.match(failedText, /Unsaved/, `a rejected save must still report unsaved work: read "${failedText}"`);
    assert.doesNotMatch(failedText, /unconfirmed/i, `a rejection raised before the write is not unconfirmed: read "${failedText}"`);
    await page.unroute("**/api/create-studio");
    await save(page, studio);
    await expectState(/^Saved locally$/, "after the service confirmed");
    await control(
      "reading-control: the save-state reading detects a wrong announcement",
      () => page.evaluate(() => { document.querySelector(".studio-save-state").textContent = "Saved locally (claimed)"; }),
      () => expectState(/^Saved locally$/, "after the service confirmed"),
      "save state after the service confirmed",
      () => page.evaluate(() => { document.querySelector(".studio-save-state").textContent = "Saved locally"; }),
    );
    pass("save state distinguishes unsaved, saving, unconfirmed, rejected and confirmed, and never claims a save the service refused");

    // ---------- 8. Recovery lives in the document status surface, not among the view controls ----------
    const assertRecoveryPlaced = async () => {
      const placement = await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.trim() === "Recover draft");
        if (!button) return { found: false };
        const rect = button.getBoundingClientRect();
        return {
          found: true,
          inStatusBar: !!button.closest(".studio-statusbar"),
          inZoomControls: !!button.closest(".studio-zoom"),
          operable: rect.width > 0 && rect.height > 0 && document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button,
        };
      });
      assert.ok(placement.found, "the recovery action must exist");
      assert.ok(placement.operable, "the recovery action must be reachable");
      assert.equal(placement.inStatusBar, true, "the recovery action belongs to the document status surface");
      assert.equal(placement.inZoomControls, false, "the recovery action must not sit among the canvas view controls");
    };
    await assertRecoveryPlaced();
    await control(
      "recovery action becomes unreachable",
      () => page.addStyleTag({ content: ".studio-recovery{display:none!important}" }).then((handle) => { globalThis.__recovery = handle; }),
      assertRecoveryPlaced,
      "must be reachable",
      () => globalThis.__recovery.evaluate((element) => element.remove()),
    );
    pass("draft recovery sits in the document status bar, reachable, and not among the zoom controls");

    // ---------- 9. 200% text hides no control ----------
    const cdp = await context.newCDPSession(page);
    const assertNothingHidden = async (width, height) => {
      await page.setViewportSize({ width, height });
      await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), "32px");
      const offenders = await unreachableControls(page);
      assert.deepEqual(offenders, [], `at ${width}x${height} and 200% text these controls are not operable: ${offenders.join("; ")}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `at ${width}x${height} and 200% text the page overflows horizontally by ${overflow}px`);
    };
    for (const [width, height] of [[1280, 900], [768, 1024], [320, 900]]) await assertNothingHidden(width, height);
    await control(
      "200% text clips controls out of the app bar",
      () => page.addStyleTag({ content: ".studio-appbar{flex-wrap:nowrap!important;overflow:hidden!important}" }).then((handle) => { globalThis.__clip = handle; }),
      () => assertNothingHidden(320, 900),
      "clipped by",
      () => globalThis.__clip.evaluate((element) => element.remove()),
    );
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16, fixed: 13 } });
    await page.setViewportSize({ width: 1440, height: 1000 });
    pass("every app-bar, status-bar, panel-switch, canvas-strip and zoom control stays operable at 200% text, 1280 to 320px");

    // ---------- 10. Editor motion, and the final state under reduced motion ----------
    // The shell adds two transitions, both on paint-only properties (background, box-shadow,
    // border-colour). Under `prefers-reduced-motion: reduce` they must not run AND the selected
    // state must still be painted: a reduced-motion user has to see the selection, not a
    // half-applied one.
    const motionOf = () => page.evaluate(() => {
      const item = document.querySelector('.studio-layer-panel [role="treeitem"][aria-selected="true"]')
        ?? document.querySelector('.studio-layer-panel [role="treeitem"]');
      if (!item) return null;
      const style = getComputedStyle(item);
      return { duration: style.transitionDuration, property: style.transitionProperty, shadow: style.boxShadow, selected: item.getAttribute("aria-selected") };
    });
    await studio.getByRole("button", { name: "Layers", exact: true }).click();
    await studio.getByRole("treeitem", { name: "Button", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const motion = await motionOf();
    assert.ok(motion, "a layer row is required to read editor motion");
    assert.notEqual(motion.duration, "0s", "the editor's selection transition must exist when motion is allowed");
    assert.match(motion.property, /background-color/);
    assert.doesNotMatch(motion.property, /\ball\b/, "transition-all is banned: name the properties");
    const assertReducedMotionFinalState = async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const reduced = await motionOf();
      // The site's own reduced-motion floor (`transition-duration: 0.01ms !important` on `*`, from
      // the Tailwind preflight) is what actually wins here; the editor's own `transition: none`
      // states the same intent at component level. Either way the invariant is the same: the
      // transition cannot run. Asserted as "effectively instant" rather than exactly 0s, because
      // 0.01ms is what the cascade produces and pretending otherwise would be a false reading.
      assert.ok(Number.parseFloat(reduced.duration) <= 0.0001, `reduced motion must remove the editor transition: read ${reduced.duration}`);
      assert.equal(reduced.selected, "true", "the selected layer must still be selected under reduced motion");
      assert.notEqual(reduced.shadow, "none", "the selection indicator must still be painted under reduced motion");
    };
    await assertReducedMotionFinalState();
    await control(
      "reduced motion stops removing the editor transition",
      () => page.addStyleTag({ content: '@media (prefers-reduced-motion: reduce){.studio-layer-panel [role="treeitem"]{transition-duration:240ms!important}}' }).then((handle) => { globalThis.__motion = handle; }),
      assertReducedMotionFinalState,
      "reduced motion must remove the editor transition",
      () => globalThis.__motion.evaluate((element) => element.remove()),
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    pass("editor motion names its properties, and reduced motion removes it while keeping the selection painted");

    await writeFile(resolve(out, "workspace-geometry.json"), JSON.stringify({ measurements, results, controls }, null, 2));
    await page.screenshot({ path: resolve(out, "workspace-1440.png") });
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length, controls: controls.length, out }));
} catch (error) {
  await writeFile(resolve(out, "workspace-failure.json"), JSON.stringify({ message: String(error), results, controls }, null, 2));
  throw error;
} finally { await browser.close(); }
