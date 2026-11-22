#!/usr/bin/env node
//
// Create Studio application-resilience gate (M5.20).
//
// The M1 gate (create-studio-browser.mjs) proves the editor's behaviour. The workspace gate
// (create-studio-workspace-browser.mjs) proves the shell's geometry and reachability. This gate
// proves what the editor does when something GOES WRONG, and what it keeps when the user moves
// around:
//
//   * a document the editor cannot read is reported in the editor, not rendered — before M5.20 a
//     reply carrying an unimplemented component `ref` threw inside the canvas and replaced the
//     whole workspace with the framework's "Application error" page;
//   * a transport failure (the local server stops answering) says nothing was saved, and the
//     stored revision is in fact unchanged;
//   * Escape out of the responsive preview returns focus to the control that opened it, from
//     anywhere — not only from inside the preview frame;
//   * committing a project rename with Enter keeps focus in the field it was typed in;
//   * selection survives hiding and showing either panel, and a hidden panel holds no reachable
//     focus;
//   * leaving the editor with unsaved work and coming back still offers that work to recover.
//
// Each assertion is also run against a deliberate defect. Two kinds of control appear:
//
//   * `reading-control` — the control perturbs the MEASUREMENT, proving the reading discriminates
//     (a focus reading that cannot tell <body> from a button would pass whatever the editor did);
//   * source controls — the control removes the implementation and requires this gate to fail
//     naming it. Those live in scripts/create-studio-resilience-controls.sh, because a browser
//     gate cannot edit the source it is measuring.
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

const results = [];
const controls = [];
const readings = {};
const pass = (label) => { results.push(label); console.log("PASS " + label); };

const browser = await chromium.launch();

const siteChrome = (page) => page.evaluate(() => ({
  headers: [...document.querySelectorAll("header")].map((el) => el.className || "header"),
  footers: [...document.querySelectorAll("footer")].map((el) => el.className || "footer"),
  frameworkError: /Application error|client-side exception/i.test(document.body.innerText),
  studio: !!document.querySelector(".create-studio"),
}));

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { kind: "body", name: null };
  // `||`, not `??`: an element with no aria-label still has an empty-string `id`, which would
  // otherwise read as the name and make every focus assertion compare against "".
  return { kind: el.tagName.toLowerCase(), name: el.getAttribute("aria-label") || el.id || (el.textContent ?? "").trim().slice(0, 40) || "(unnamed)" };
});

const selected = (studio) => studio.locator('[role="treeitem"][aria-selected="true"]').allInnerTexts();

const revision = (page) => page.evaluate(async () => {
  const reply = await fetch("/api/create-studio", { cache: "no-store" });
  const body = await reply.json();
  return body.products?.[0]?.revision ?? body.code ?? "unknown";
});

async function openEditor(context, { name }) {
  const page = await context.newPage();
  // A cold `next dev` compiles each route on first request; CI has measured well over the 30s default.
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

/**
 * Open the local workspace, tolerating hydration. A back navigation re-renders the route, and a
 * click dispatched before React has attached its handler reaches the element but does nothing; the
 * symptom is a product list that never appears. So: click, wait, and click again if the button is
 * still the thing on screen.
 */
async function startWorkspace(page, studio) {
  const start = studio.getByRole("button", { name: "Start local workspace" });
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await start.count()) await start.click({ timeout: 10_000 }).catch(() => {});
    try {
      await studio.locator("#studio-open-product").waitFor({ timeout: 4_000 });
      return;
    } catch { /* not open yet */ }
  }
  throw new Error("the local workspace did not open after five attempts");
}

/** Runs `check`, requires it to throw, and requires the message to name `expect`. */
async function control(label, kind, defect, check, expect, restore) {
  await defect();
  let message = null;
  try { await check(); } catch (error) { message = String(error.message ?? error); }
  await restore();
  assert.ok(message, `negative control "${label}" did not fail at all`);
  assert.ok(message.includes(expect), `negative control "${label}" failed for the wrong reason:\n${message}\nexpected it to name: ${expect}`);
  await check(); // the restored state must pass again
  controls.push({ label, kind, expected: expect, failure: message.split("\n")[0].slice(0, 220) });
  console.log(`CONTROL (${kind}) ${label} → detected: ${message.split("\n")[0].slice(0, 140)}`);
}

try {
  // ---------- 1. A document this editor cannot read is reported, not rendered ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openEditor(context, { name: "Unreadable document" });
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally");
    const before = await revision(page);

    // A reply the service would never store: a component `ref` this build does not implement.
    // Nothing in the editor's own source is touched, so this is the real path a version skew, a
    // truncated response or a tampered local proxy would take.
    const realDocument = await page.evaluate(async () => {
      const list = await (await fetch("/api/create-studio", { cache: "no-store" })).json();
      const product = await (await fetch("/api/create-studio?id=" + encodeURIComponent(list.products[0].id), { cache: "no-store" })).json();
      return product;
    });
    const poisoned = structuredClone(realDocument);
    poisoned.doc.pages[0].root.children[0].children.push({ id: "node_9001", kind: "component", ref: "component:NotInThisBuild", props: { text: "x" } });
    await context.route("**/api/create-studio?id=*", (route) => route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(poisoned),
    }));
    await studio.locator("#studio-open-product").selectOption(realDocument.id);
    const assertReportedNotRendered = async () => {
      // Wait for whichever surface appears — the editor's own alert, the route's recovery surface,
      // or the framework's error page — and only then read the page. Waiting on the alert alone
      // would time out before the assertion that names what went wrong could run, which is exactly
      // what happened when this gate was first pointed at the unvalidated implementation.
      await page.waitForFunction(() => !!document.querySelector('.create-studio [role="alert"], .studio-recovery-surface')
        || /Application error|client-side exception/i.test(document.body.innerText), { timeout: 20_000 });
      const chrome = await siteChrome(page);
      assert.ok(chrome.studio, "the workspace must stay mounted when a document cannot be read");
      const alert = (await studio.getByRole("alert").first().innerText()).replace(/\s+/g, " ");
      assert.equal(chrome.frameworkError, false, "an unreadable document must not reach the framework error page");
      assert.deepEqual(chrome.footers, [], "the editor must still render no site footer");
      assert.match(alert, /cannot be opened by this version/i, `the editor must say the document cannot be opened, read: ${alert.slice(0, 180)}`);
      assert.match(alert, /has not been changed/i, "the editor must say the saved copy is untouched");
    };
    await assertReportedNotRendered();
    readings.unreadableDocument = { alert: (await studio.getByRole("alert").first().innerText()).replace(/\s+/g, " ").slice(0, 220) };
    assert.equal(await revision(page), before, "reading an unreadable document must not change the stored revision");
    await control(
      "the unreadable-document reading cannot tell the report from the framework error page",
      "reading-control",
      // Put the framework's own wording on the page: a reading that only looks for an alert, or
      // only for "studio is mounted", would still pass. This one must notice.
      () => page.evaluate(() => { const p = document.createElement("p"); p.id = "control-framework-text"; p.textContent = "Application error: a client-side exception has occurred"; document.body.append(p); }),
      assertReportedNotRendered,
      "must not reach the framework error page",
      () => page.evaluate(() => document.getElementById("control-framework-text")?.remove()),
    );
    await context.unroute("**/api/create-studio?id=*");
    await page.screenshot({ path: resolve(out, "resilience-unreadable-document.png") });
    pass("a document this editor cannot read is reported inside the workspace, with the saved revision untouched");
    await context.close();
  }

  // ---------- 2. A transport failure says nothing was saved, and nothing was ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openEditor(context, { name: "Transport failure" });
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally");
    const before = await revision(page);
    await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
    await context.route("**/api/create-studio", (route) => route.abort("connectionrefused"));
    await studio.getByRole("button", { name: "Save", exact: true }).click();
    const assertTruthfulFailure = async () => {
      // Wait on the ALERT, not on the save state: the save-state reading is what one of the
      // controls below perturbs, and a wait on it would time out before the assertion that names
      // what went wrong could run.
      await page.waitForFunction(() => /Nothing was saved/i.test(document.querySelector('[role="alert"]')?.textContent ?? ""), { timeout: 15_000 });
      const alert = (await studio.getByRole("alert").first().innerText()).replace(/\s+/g, " ");
      assert.match(alert, /Nothing was saved/i, `a transport failure must say nothing was saved, read: ${alert.slice(0, 180)}`);
      assert.doesNotMatch(alert, /Failed to fetch/i, "a transport failure must not surface the browser's own message");
      const state = await studio.locator(".studio-save-state").innerText();
      assert.match(state, /Save failed/, `the save state must report the failure, read: ${state}`);
      assert.doesNotMatch(state, /^Saved/, "a failed save must never read as saved");
    };
    await assertTruthfulFailure();
    readings.transportFailure = {
      alert: (await studio.getByRole("alert").first().innerText()).replace(/\s+/g, " ").slice(0, 220),
      state: await studio.locator(".studio-save-state").innerText(),
    };
    await control(
      "the save-truth reading cannot tell a failure from a success",
      "reading-control",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.dataset.controlPrevious = el.textContent; el.textContent = "Saved locally"; }),
      assertTruthfulFailure,
      "the save state must report the failure",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.textContent = el.dataset.controlPrevious; delete el.dataset.controlPrevious; }),
    );
    await context.unroute("**/api/create-studio");
    assert.equal(await revision(page), before, "a failed save must leave the stored revision alone");
    // The draft the failed save was carrying must still be downloadable and still stored.
    assert.ok(await studio.getByRole("button", { name: "Download draft" }).first().isEnabled(), "a failed save must leave the draft downloadable");
    assert.ok(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("kinetix-studio:"))), "a failed save must leave the browser draft in place");
    pass("a transport failure is reported truthfully, the stored revision is unchanged, and the draft is still held");
    await context.close();
  }

  // ---------- 3. Focus continuity: Escape out of preview, and Enter on the project name ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openEditor(context, { name: "Focus continuity" });

    const assertEscapeReturnsFocus = async () => {
      await studio.getByRole("button", { name: "Preview", exact: true }).click();
      await studio.getByRole("button", { name: "Back to editing", exact: true }).waitFor();
      // Deliberately from OUTSIDE the preview frame: the frame's own Escape handler is a different
      // path, and the one that was losing focus is this one.
      await studio.locator(".studio-appbar").click({ position: { x: 4, y: 4 } });
      await page.keyboard.press("Escape");
      await studio.getByRole("button", { name: "Preview", exact: true }).waitFor();
      const where = await focused(page);
      assert.notEqual(where.kind, "body", "Escape out of the preview must not drop focus to the document body");
      assert.match(String(where.name), /Preview/, `Escape must return focus to the preview toggle, found: ${JSON.stringify(where)}`);
    };
    await assertEscapeReturnsFocus();
    readings.escapeFocus = await focused(page);
    await control(
      "the focus reading cannot tell the document body from the toggle",
      "reading-control",
      // Exactly the pre-M5.20 state: nothing focused, so focus has fallen to <body>. If the
      // reading cannot see that, the assertion above would pass whatever Escape did.
      () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined)),
      async () => {
        const where = await focused(page);
        assert.notEqual(where.kind, "body", "Escape out of the preview must not drop focus to the document body");
        assert.match(String(where.name), /Preview/, `Escape must return focus to the preview toggle, found: ${JSON.stringify(where)}`);
      },
      "must not drop focus to the document body",
      () => studio.getByRole("button", { name: "Preview", exact: true }).focus(),
    );
    await assertEscapeReturnsFocus();

    const assertRenameKeepsFocus = async () => {
      const field = studio.locator("#studio-project-title");
      await field.click();
      await field.fill("Renamed with the keyboard");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const where = await focused(page);
      assert.equal(where.name, "Project name", `committing a rename must keep focus in the project name field, found: ${JSON.stringify(where)}`);
      assert.equal(await field.inputValue(), "Renamed with the keyboard", "the rename must be committed to the document");
      const state = await studio.locator(".studio-save-state").innerText();
      assert.match(state, /Unsaved changes/, `a rename is a document change and must read as unsaved, read: ${state}`);
    };
    await assertRenameKeepsFocus();
    readings.renameFocus = await focused(page);
    pass("Escape returns focus to the preview toggle from anywhere, and committing a rename keeps focus in its field");
    await context.close();
  }

  // ---------- 4. Selection and reachability across panel and viewport changes ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openEditor(context, { name: "State continuity" });
    await studio.getByRole("button", { name: "Layers", exact: true }).click();
    await studio.getByRole("treeitem", { name: "Button", exact: true }).click();
    assert.deepEqual(await selected(studio), ["Button"], "the clicked layer must be selected");

    const hiddenPanelFocus = () => page.evaluate(() => [".studio-navigator", ".studio-inspector"].map((selector) => {
      const panel = document.querySelector(selector);
      if (!panel) return { selector, state: "absent" };
      const open = panel.className.includes("-open");
      const reachable = [...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null && !el.closest("[inert]")).length;
      return { selector, open, display: getComputedStyle(panel).display, reachable };
    }));

    const assertPanelsKeepSelection = async () => {
      for (const label of [/the project panel/, /properties/]) {
        await studio.getByRole("button", { name: label }).click();
        const closed = (await hiddenPanelFocus()).filter((panel) => panel.open === false);
        for (const panel of closed) assert.equal(panel.reachable, 0, `a hidden panel must hold no reachable focus: ${panel.selector} offers ${panel.reachable}`);
        assert.deepEqual(await selected(studio), ["Button"], `hiding a panel must not change the selection (${label})`);
        await studio.getByRole("button", { name: label }).click();
        assert.deepEqual(await selected(studio), ["Button"], `showing a panel must not change the selection (${label})`);
      }
      await studio.locator("#studio-viewport-width").selectOption("390");
      assert.deepEqual(await selected(studio), ["Button"], "changing the viewport must not change the selection");
      await studio.locator("#studio-viewport-width").selectOption("960");
    };
    await assertPanelsKeepSelection();
    readings.panelContinuity = await hiddenPanelFocus();
    await control(
      "the selection reading cannot tell a kept selection from a lost one",
      "reading-control",
      () => page.evaluate(() => document.querySelectorAll('[role="treeitem"][aria-selected="true"]').forEach((el) => el.setAttribute("aria-selected", "false"))),
      async () => assert.deepEqual(await selected(studio), ["Button"], "hiding a panel must not change the selection (reading)"),
      "must not change the selection",
      // Selecting another layer and coming back is a real state change, so React re-renders the
      // attribute the control overwrote. Re-clicking the same layer would not: the component's own
      // state never changed, so the DOM poke would survive the restore.
      async () => {
        await studio.getByRole("treeitem", { name: "Badge", exact: true }).click();
        await studio.getByRole("treeitem", { name: "Button", exact: true }).click();
      },
    );
    pass("hiding or showing either panel, and changing the viewport, keeps the selection, and a hidden panel holds no reachable focus");

    // ---------- 5. Leaving with unsaved work and coming back still offers it ----------
    await studio.getByRole("button", { name: "Library", exact: true }).click();
    await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
    const state = await studio.locator(".studio-save-state").innerText();
    assert.match(state, /Unsaved changes/, `the editor must report unsaved work before leaving, read: ${state}`);
    await page.goto(base + "/create");
    const marketing = await siteChrome(page);
    assert.ok(marketing.headers.length >= 1, "the marketing route must keep the site header");
    await page.goBack();
    await studio.getByRole("button", { name: "Start local workspace" }).waitFor();
    const returned = await siteChrome(page);
    assert.deepEqual(returned.footers, [], "coming back to the editor must not restore the site footer");
    assert.ok(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("kinetix-studio:"))), "leaving the editor must not discard the stored draft");
    await startWorkspace(page, studio);
    await studio.locator("#studio-open-product").selectOption({ index: 1 });
    await page.waitForFunction(() => /draft from this browser/i.test(document.querySelector(".studio-announcement")?.textContent ?? ""), { timeout: 15_000 });
    assert.ok(await studio.getByRole("button", { name: "Recover draft" }).isEnabled(), "the draft left behind must be recoverable");
    await studio.getByRole("button", { name: "Recover draft" }).click();
    await page.waitForFunction(() => /Recovered draft/.test(document.querySelector(".studio-save-state")?.textContent ?? ""), { timeout: 15_000 });
    await studio.getByRole("button", { name: "Layers", exact: true }).click();
    const recovered = await studio.locator('[role="treeitem"]').allInnerTexts();
    assert.ok(recovered.includes("Badge"), `the recovered draft must contain the unsaved layer, read: ${recovered.join(", ")}`);
    readings.recovery = { layers: recovered };
    pass("leaving the editor with unsaved work and coming back recovers that work, inside the application shell");
    await page.screenshot({ path: resolve(out, "resilience-recovered-draft.png") });
    await context.close();
  }

  await writeFile(resolve(out, "resilience.json"), JSON.stringify({ readings, results, controls }, null, 2));
  console.log(JSON.stringify({ passed: results.length, controls: controls.length, out }));
} catch (error) {
  await writeFile(resolve(out, "resilience-failure.json"), JSON.stringify({ message: String(error), readings, results, controls }, null, 2));
  throw error;
} finally { await browser.close(); }
