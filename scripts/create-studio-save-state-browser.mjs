#!/usr/bin/env node
//
// Create Studio save-acknowledgement gate (M5.22).
//
// What this gate is for. The editor's status chip used to carry one boolean: a save either
// succeeded or "failed". That is not enough information to be truthful, because the local route
// awaits `service().save(...)` and `FileStore.transaction` renames the new file into place BEFORE
// the response is built. A connection lost after that rename leaves the write DONE and only the
// acknowledgement lost — and the chip read "Save failed · Unsaved changes", a false statement
// about the user's own data. (Measured in M5.21: stored revision 1 → 2 while the chip said the
// save had failed.)
//
// So the editor now distinguishes three outcomes, and this gate holds it to all three:
//
//   * CONFIRMED  — the server answered. "Saved locally".
//   * REJECTED   — the server declined with a code. Those rejections are raised inside the
//                  transaction body, before the write, so the stored document is untouched and
//                  "Save failed · Unsaved changes" is true.
//   * UNCONFIRMED — the request may or may not have committed: any transport failure, an
//                  unreadable reply, or the route's `SAVE_FAILED` catch-all, which can be returned
//                  after the rename has committed (proved in
//                  apps/web/src/lib/create-studio/commit-ordering.test.ts).
//
// The two claims the editor must never make are the two this gate asserts against on every
// uncertain path: not "definitely saved", and not "definitely not saved". Each is backed by its
// own reading-control, because before M5.22 a control existed for the first and the second shipped
// anyway.
//
// Eight cases, in the order the owner named them:
//   1. a failure before the server commits            (a real ORIGIN_REJECTED from the real route)
//   2. a successful commit with a lost acknowledgement (the server really commits; the reply is cut)
//   3. an unreadable success response                  (the server commits; the body is truncated)
//   4. a retry after an uncertain commit               (must not overwrite the newer revision)
//   5. a revision conflict                             (a real conflict, written behind the editor)
//   6. browser storage unavailable                     (localStorage refuses every write)
//   7. the in-memory draft is preserved                (the only copy on screen survives)
//   8. reconciliation against the actual stored revision (both answers, each proved)
//
// Nothing here fabricates a server reply except case 3's deliberate truncation, which is the
// defect under test. Cases 1, 4 and 5 are answered by the real local route.
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

const chip = (page) => page.locator(".studio-save-state").innerText();
// The editor's own error region, by class rather than by role: the page can hold more than one
// `role="alert"` and `.first()` would be a guess about their order.
const alertText = async (studio) => (await studio.locator(".studio-error").innerText()).replace(/\s+/g, " ");

/** The stored state, read through the real route — never through the editor's own state. */
const stored = (page) => page.evaluate(async () => {
  const list = await (await fetch("/api/create-studio", { cache: "no-store" })).json();
  const summary = list.products?.[0];
  if (!summary) return { revision: list.code ?? "unknown", name: null, bytes: 0 };
  const product = await (await fetch("/api/create-studio?id=" + encodeURIComponent(summary.id), { cache: "no-store" })).json();
  return { id: summary.id, revision: product.revision, name: product.doc?.name ?? null, bytes: JSON.stringify(product.doc ?? {}).length };
});

/**
 * The verdict of a reconciliation, wherever the editor chooses to put it.
 *
 * Deliberately not pinned to one class. The requirement is not "render it in this element", it is
 * that the answer the user just asked for stays on screen — and reading only one region would turn
 * a control that moves the verdict into a locator timeout, which names the wait instead of the
 * behaviour. So: prefer the dedicated region, fall back to the status bar's announcement, and let
 * the persistence assertion below be the thing that fails.
 */
async function verdictText(studio) {
  const dedicated = studio.locator(".studio-checked");
  if (await dedicated.count()) return (await dedicated.innerText()).replace(/\s+/g, " ");
  return (await studio.locator(".studio-announcement").innerText()).replace(/\s+/g, " ");
}

/**
 * Wait for a verdict and return the text AS IT APPEARED.
 *
 * Capturing it inside the wait matters: when the verdict shared the status bar's announcement slot
 * it was overwritten faster than a second round-trip could read it, so a re-query returned the
 * clobbering notice and the first assertion failed with "no verdict" — which is true but names the
 * wrong defect. Reading it here lets that first assertion pass and leaves the PERSISTENCE check
 * below as the one that fails, which is the behaviour actually at stake.
 */
const verdictVisible = async (page) => {
  const handle = await page.waitForFunction(() => {
    const text = [".studio-checked", ".studio-announcement", ".studio-error"]
      .map((selector) => document.querySelector(selector)?.textContent ?? "")
      .join(" ").replace(/\s+/g, " ").trim();
    // Every verdict opens with "Checked:"; the one case that cannot reach a verdict says the store
    // could not be checked, and that one lives in the error region. All three regions are read so
    // that moving a verdict produces a behavioural failure rather than a locator timeout.
    return /Checked:|could not be checked/i.test(text) ? text : false;
  }, { timeout: 30_000 });
  return String(await handle.jsonValue());
};

async function startWorkspace(page, studio) {
  const start = studio.getByRole("button", { name: "Start local workspace" });
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await start.count()) await start.click({ timeout: 10_000 }).catch(() => {});
    try { await studio.locator("#studio-open-product").waitFor({ timeout: 4_000 }); return; } catch { /* not open yet */ }
  }
  throw new Error("the local workspace did not open after five attempts");
}

/** A product with two components, saved once, so every case starts from a known clean revision. */
async function openSaved(context, name) {
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(120_000);
  const studio = page.locator(".create-studio");
  await page.goto(base + "/create/studio");
  await startWorkspace(page, studio);
  await studio.getByLabel("New product name").fill(name);
  await studio.getByRole("button", { name: "New product", exact: true }).click();
  await studio.getByRole("button", { name: "Add Button", exact: true }).waitFor();
  await studio.getByRole("button", { name: "Add Button", exact: true }).click();
  await studio.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally", { timeout: 30_000 });
  return { page, studio };
}

/** Another writer, through the real route, behind the editor's back. */
const writeElsewhere = (page, suffix) => page.evaluate(async (mark) => {
  const list = await (await fetch("/api/create-studio", { cache: "no-store" })).json();
  const id = list.products[0].id;
  const product = await (await fetch("/api/create-studio?id=" + encodeURIComponent(id), { cache: "no-store" })).json();
  const doc = JSON.parse(JSON.stringify(product.doc));
  doc.name = doc.name + mark;
  const reply = await fetch("/api/create-studio", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "save", id, revision: product.revision, doc }),
  });
  const body = await reply.json();
  return { status: reply.status, revision: body.revision ?? body.code };
}, suffix);

/** Make one more edit, so there is something to save. */
const edit = (studio) => studio.getByRole("button", { name: "Add Badge", exact: true }).click();

/** Click Save and wait until the chip has left its transient states. */
async function saveAndSettle(studio, page) {
  await studio.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(
    () => !/^(Saving|Working)/.test(document.querySelector(".studio-save-state")?.textContent ?? "Saving"),
    { timeout: 30_000 },
  );
}

/** Runs `check`, requires it to throw, and requires the message to name `expect`. */
async function control(label, kind, defect, check, expect, restore) {
  await defect();
  let message = null;
  try { await check(); } catch (error) { message = String(error.message ?? error); }
  await restore();
  assert.ok(message, `negative control "${label}" did not fail at all`);
  assert.ok(message.includes(expect), `negative control "${label}" failed for the wrong reason:\n${message}\nexpected it to name: ${expect}`);
  await check();
  controls.push({ label, kind, expected: expect, failure: message.split("\n")[0].slice(0, 220) });
  console.log(`CONTROL (${kind}) ${label} → detected: ${message.split("\n")[0].slice(0, 140)}`);
}

/**
 * The two statements the editor is never entitled to make while the outcome is unknown. The
 * `doesNotMatch` assertions come FIRST and in this order, because each reading-control perturbs the
 * chip into exactly one of them and the assertion naming that one has to be the one that fires.
 */
async function assertUnconfirmed(page, label) {
  const state = await chip(page);
  assert.doesNotMatch(state, /^Saved/, `${label}: an unconfirmed save must never read as saved, read: ${state}`);
  assert.doesNotMatch(state, /Save failed/, `${label}: an unconfirmed save must not be reported as a definite failure, read: ${state}`);
  assert.match(state, /unconfirmed/i, `${label}: the save state must report the save as unconfirmed, read: ${state}`);
}

try {
  // ---------- 1. A failure BEFORE the server commits is a definite failure ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Rejected before commit");
    const before = await stored(page);
    await edit(studio);
    // A real rejection from the real route. The request body is padded past the route's 1,050,000
    // byte ceiling, so the route answers 413 REQUEST_TOO_LARGE on its own, before `service().save`
    // is ever called and therefore before `FileStore.transaction` can write anything. No reply is
    // fabricated: this is the server declining, which is exactly the case where "Save failed" is
    // the truthful reading.
    //
    // Measured alternative, recorded so nobody repeats it: removing the `Origin` header with
    // `route.continue({ headers })` does NOT reach the route's origin check — the browser's network
    // stack puts the header back, the save succeeds, and the case silently tests nothing.
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postData() ?? "{}";
      await route.continue({ postData: body.slice(0, -1) + ',"pad":"' + "x".repeat(1_100_000) + '"}' });
    });
    await saveAndSettle(studio, page);
    const state = await chip(page);
    const alert = await alertText(studio);
    assert.match(state, /Save failed/, `a rejection raised before the write must read as a failure, read: ${state}`);
    assert.doesNotMatch(state, /unconfirmed/i, `a coded rejection is not unconfirmed — the write provably did not happen, read: ${state}`);
    assert.match(alert, /too large/i, `the rejection's own message must reach the user, read: ${alert.slice(0, 160)}`);
    const after = await stored(page);
    assert.equal(after.revision, before.revision, "a rejected save must leave the stored revision alone");
    readings.rejectedBeforeCommit = { state, alert: alert.slice(0, 200), revision: after.revision };
    await context.unroute("**/api/create-studio");
    pass("a rejection raised before the write is reported as a definite failure, and the store is untouched");
    await context.close();
  }

  // ---------- 2. A commit whose acknowledgement is lost ----------
  // ---------- 8a. and reconciliation then proves it DID commit ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Lost acknowledgement");
    const before = await stored(page);
    await edit(studio);
    // The request is really performed against the real server — which commits — and only then is
    // the page's connection cut. This is the case the old chip lied about.
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("connectionreset");
    });
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    const after = await stored(page);
    assert.equal(after.revision, before.revision + 1, `the server must really have committed for this case to mean anything: ${before.revision} → ${after.revision}`);
    assert.ok(after.bytes > before.bytes, `the committed document must have grown, read ${before.bytes} → ${after.bytes} bytes`);
    await assertUnconfirmed(page, "lost acknowledgement");
    const alert = await alertText(studio);
    assert.match(alert, /could not be confirmed/i, `the sentence must say the save could not be confirmed, read: ${alert.slice(0, 160)}`);
    assert.doesNotMatch(alert, /Nothing was saved/i, "the sentence must not claim nothing was saved");
    readings.lostAcknowledgement = { revisionBefore: before.revision, revisionAfter: after.revision, bytes: [before.bytes, after.bytes], state: await chip(page), alert: alert.slice(0, 220) };

    // Both false readings, each with its own control.
    const recheck = () => assertUnconfirmed(page, "lost acknowledgement");
    await control(
      "the chip reading cannot tell an unconfirmed save from a success",
      "reading-control",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.dataset.prev = el.textContent; el.textContent = "Saved locally"; }),
      recheck,
      "must never read as saved",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.textContent = el.dataset.prev; delete el.dataset.prev; }),
    );
    await control(
      "the chip reading cannot tell an unconfirmed save from a failure",
      "reading-control",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.dataset.prev = el.textContent; el.textContent = "Save failed · Unsaved changes"; }),
      recheck,
      "must not be reported as a definite failure",
      () => page.evaluate(() => { const el = document.querySelector(".studio-save-state"); el.textContent = el.dataset.prev; delete el.dataset.prev; }),
    );
    pass("a commit whose acknowledgement is lost is reported as unconfirmed, and the server really did commit");

    // 8a. Reconciliation must now settle it the right way, by READING the stored document.
    const check = studio.getByRole("button", { name: "Check the stored version" });
    assert.equal(await check.count(), 1, "an unconfirmed save must offer a way to check the stored version");
    await check.click();
    // The verdict has a region of its own. It deliberately does NOT live in the status bar's
    // announcement slot: measured here first, the draft-storage effect wrote over it within
    // seconds and the answer the user had just asked for vanished by itself.
    const verdict = await verdictVisible(page);
    assert.match(verdict, /did commit/i, `reconciliation must report that this save committed, read: ${verdict.slice(0, 200)}`);
    assert.doesNotMatch(verdict, /did not commit/i, "reconciliation must not report the opposite of what the store holds");
    const settled = await chip(page);
    assert.doesNotMatch(settled, /unconfirmed/i, `once checked, the save is no longer unconfirmed, read: ${settled}`);
    assert.doesNotMatch(settled, /Save failed/, `a save proved to have committed must never read as failed, read: ${settled}`);
    assert.equal((await stored(page)).revision, after.revision, "checking the stored version must not write anything");
    readings.reconciledCommitted = { verdict: verdict.slice(0, 220), state: settled, revision: after.revision };
    pass("reconciliation against the stored document proves a lost acknowledgement was a real commit, and writes nothing");
    await context.close();
  }

  // ---------- 3. An unreadable success response ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Unreadable reply");
    const before = await stored(page);
    await edit(studio);
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch(); // the server commits
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"id":"trunc' }); // the body does not parse
    });
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    const after = await stored(page);
    assert.equal(after.revision, before.revision + 1, `the server must have committed: ${before.revision} → ${after.revision}`);
    await assertUnconfirmed(page, "unreadable reply");
    const alert = await alertText(studio);
    assert.match(alert, /could not be read/i, `the sentence must say the reply could not be read, read: ${alert.slice(0, 160)}`);
    readings.unreadableReply = { revisionBefore: before.revision, revisionAfter: after.revision, state: await chip(page), alert: alert.slice(0, 220) };
    pass("a success reply the editor cannot read is reported as unconfirmed, not as a failure");
    await context.close();
  }

  // ---------- 4. A retry after an uncertain commit must not overwrite the newer revision ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Retry after uncertainty");
    const before = await stored(page);
    await edit(studio);
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("connectionreset");
    });
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    const committed = await stored(page);
    assert.equal(committed.revision, before.revision + 1, "the first attempt must really have committed");
    await assertUnconfirmed(page, "before the retry");

    // 4a. The retry is the user's own action — nothing retries by itself. It carries the revision
    // the editor still believes in, which is now stale by exactly one, and the SAME document the
    // lost attempt committed. The service recognises that as the save it already performed and
    // answers with the stored product instead of conflicting (`service.ts`: `revision ===
    // product.revision - 1 && digest(input) === digest(current.doc)`). So the uncertainty resolves
    // to the truth — the work IS stored — and the chip is entitled to say so. Nothing is written a
    // second time, which is what makes this safe to allow.
    await saveAndSettle(studio, page);
    const afterReplay = await stored(page);
    assert.equal(afterReplay.revision, committed.revision, `an idempotent replay must not advance the stored revision, read ${committed.revision} → ${afterReplay.revision}`);
    assert.equal(afterReplay.bytes, committed.bytes, "an idempotent replay must leave the stored document byte-identical");
    const replayState = await chip(page);
    assert.equal(replayState, "Saved locally", `a replay the server recognises resolves the uncertainty to the truth, read: ${replayState}`);
    assert.equal(await studio.getByRole("button", { name: "Check the stored version" }).count(), 0, "a settled save must not still offer to check the stored version");

    // 4b. The other retry shape: the user keeps editing first, so the document no longer matches
    // what the store holds. Now the stale revision must be REFUSED — this is the
    // "do not overwrite a newer revision" rule — and the refusal must not be mistaken for proof
    // that the first attempt failed.
    await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
    // Put the editor back into the uncertain state the same way, so 4b tests a retry and not a
    // first attempt: commit, lose the reply, then retry with a document that has moved on.
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("connectionreset");
    });
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    const committed2 = await stored(page);
    assert.equal(committed2.revision, afterReplay.revision + 1, "the second attempt must really have committed");
    await assertUnconfirmed(page, "before the diverging retry");
    await studio.getByRole("button", { name: "Add Badge", exact: true }).click(); // the document diverges
    await saveAndSettle(studio, page);
    const afterRetry = await stored(page);
    assert.equal(afterRetry.revision, committed2.revision, `a diverging retry must not overwrite the newer stored revision, read ${committed2.revision} → ${afterRetry.revision}`);
    assert.equal(afterRetry.bytes, committed2.bytes, "a refused retry must leave the stored document byte-identical");
    await assertUnconfirmed(page, "after the diverging retry");
    const alert = await alertText(studio);
    assert.match(alert, /moved on|newer revision/i, `the refusal must be explained, read: ${alert.slice(0, 200)}`);
    // 4c. A SECOND open question, before anything is checked. The user edits again and tries
    // again, and this attempt never reaches the server at all — so now two attempts are
    // outstanding and it is the EARLIER one that is stored.
    //
    // This is why the editor keeps a list rather than the last attempt. With only the latest, the
    // check compares the store against the attempt that never arrived, finds a mismatch and a
    // revision that has moved, and reports that something else has written to the product — with
    // nobody else involved and the earlier payload sitting in the store.
    await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
    await context.route("**/api/create-studio", (route) => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue()));
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    await assertUnconfirmed(page, "with two attempts outstanding");
    assert.equal((await stored(page)).revision, committed2.revision, "the second attempt never reached the server");

    // 4d. The check must now recognise OUR earlier save among the open attempts.
    await studio.getByRole("button", { name: "Check the stored version" }).click();
    const retryVerdict = await verdictVisible(page);
    assert.match(retryVerdict, /did commit/i, `the check must report that the earlier save committed, read: ${retryVerdict.slice(0, 220)}`);
    assert.doesNotMatch(retryVerdict, /did not commit/i, "the check must not report the opposite of what the store holds");
    const afterCheck = await stored(page);
    assert.equal(afterCheck.revision, committed2.revision, "checking must not write");
    readings.retryAfterUncertainty = {
      revisions: [before.revision, committed.revision, afterReplay.revision, committed2.revision, afterRetry.revision],
      replayState, divergingState: alert.slice(0, 120), retryVerdict: retryVerdict.slice(0, 220),
    };
    pass("a replay the server recognises resolves an uncertain save to the truth, a diverging retry is refused rather than overwriting, and the check still recognises the earlier save");
    await context.close();
  }

  // ---------- 5. A real revision conflict, with no prior uncertainty, is a definite failure ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Conflict");
    const before = await stored(page);
    // Another writer, through the real route, behind the editor's back.
    const elsewhere = await writeElsewhere(page, " (written elsewhere)");
    assert.equal(elsewhere.status, 200, `the behind-the-back save must succeed for this case to mean anything, read: ${JSON.stringify(elsewhere)}`);
    assert.equal(elsewhere.revision, before.revision + 1, `the other writer must have advanced the revision, read: ${JSON.stringify(elsewhere)}`);
    await edit(studio);
    await saveAndSettle(studio, page);
    const state = await chip(page);
    assert.match(state, /Save failed/, `a conflict with no prior uncertainty is a definite failure, read: ${state}`);
    assert.doesNotMatch(state, /unconfirmed/i, `a conflict raised before the write is not unconfirmed, read: ${state}`);
    const after = await stored(page);
    assert.equal(after.revision, elsewhere.revision, "a conflicted save must not write");
    assert.match(after.name ?? "", /written elsewhere/, "the other writer's document must survive the conflicted save");
    readings.revisionConflict = { revisions: [before.revision, elsewhere.revision, after.revision], state, storedName: after.name };
    pass("a real revision conflict is reported as a definite failure and the other writer's document survives");
    await context.close();
  }

  // ---------- 6. Browser storage unavailable, and 7. the in-memory draft survives ----------
  // ---------- 8b. reconciliation proves a save that did NOT commit ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Every localStorage write refuses, before any application code runs. This is the supported
    // case in which the only current copy of the user's work is the one on screen — so nothing may
    // promise browser persistence, and nothing may tell the user to reopen the product.
    await context.addInitScript(() => {
      const proto = Object.getPrototypeOf(window.localStorage);
      Object.defineProperty(proto, "setItem", { value: () => { throw new DOMException("QuotaExceededError", "QuotaExceededError"); }, configurable: true });
    });
    const { page, studio } = await openSaved(context, "Storage unavailable");
    const before = await stored(page);
    await edit(studio);
    // Nothing reaches the server at all this time, so the write provably did not happen — but the
    // browser cannot know that, so the editor must still say unconfirmed.
    await context.route("**/api/create-studio", (route) => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue()));
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    await assertUnconfirmed(page, "storage unavailable");
    const alert = await alertText(studio);
    assert.doesNotMatch(alert, /draft is still in this browser/i, `nothing may promise browser persistence here, read: ${alert.slice(0, 200)}`);
    assert.match(alert, /still open in this editor/i, `the sentence must name the copy that exists, read: ${alert.slice(0, 200)}`);
    assert.ok(await page.evaluate(() => { try { localStorage.setItem("probe", "1"); return false; } catch { return true; } }), "the control itself must hold: storage must really be refusing writes");

    // 7. The in-memory draft: the only copy is on screen, and it is intact and downloadable.
    await studio.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = await studio.locator('[role="treeitem"]').allInnerTexts();
    assert.ok(layers.includes("Badge"), `the unsaved component must still be on screen, read: ${layers.join(", ")}`);
    assert.ok(layers.includes("Button"), `the saved component must still be on screen, read: ${layers.join(", ")}`);
    assert.ok(await studio.getByRole("button", { name: "Download draft" }).first().isEnabled(), "the only copy of the work must be downloadable");
    assert.equal(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("kinetix-studio:")).length), 0, "the control must leave no browser draft, or case 7 is not testing the in-memory copy");
    readings.storageUnavailable = { state: await chip(page), alert: alert.slice(0, 220), layers };
    pass("with browser storage refusing every write, the save is unconfirmed, nothing promises persistence, and the on-screen copy is intact and downloadable");

    // 8b. Reconciliation must report the other answer, and it must be the true one.
    const before8 = await stored(page);
    assert.equal(before8.revision, before.revision, "nothing reached the server in this case");
    await studio.getByRole("button", { name: "Check the stored version" }).click();
    const verdict = await verdictVisible(page);
    assert.match(verdict, /did not commit/i, `reconciliation must report that this save did not commit, read: ${verdict.slice(0, 200)}`);
    const settled = await chip(page);
    assert.match(settled, /Save failed/, `once PROVED not to have committed, the save may be called a failure, read: ${settled}`);
    assert.doesNotMatch(settled, /unconfirmed/i, `a settled question must not still read as unconfirmed, read: ${settled}`);
    const layersAfter = await studio.locator('[role="treeitem"]').allInnerTexts();
    assert.deepEqual(layersAfter, layers, "checking the stored version must not disturb what is on screen");
    assert.equal((await stored(page)).revision, before.revision, "checking the stored version must not write anything");
    // The verdict must still be on screen after the editor's other notices have had their turn.
    // This is the case where that is actually contested: with browser storage refusing writes the
    // draft effect announces itself repeatedly, and when the verdict shared that slot it was gone
    // within seconds — the user asked a question and the answer removed itself.
    await page.waitForTimeout(3_000);
    const held = await verdictText(studio);
    assert.match(held, /did not commit/i, `the verdict must not be overwritten by an unrelated notice, read: ${held.slice(0, 200)}`);
    readings.reconciledNotCommitted = { verdict: verdict.slice(0, 220), state: settled, revision: before.revision };
    pass("reconciliation proves a save that did not commit, and only then is it called a failure");
    await context.close();
  }

  // ---------- 9. A foreign write during uncertainty must never become a licence to overwrite ----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await openSaved(context, "Foreign write");
    const before = await stored(page);
    await edit(studio);
    await context.route("**/api/create-studio", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("connectionreset");
    });
    await saveAndSettle(studio, page);
    await context.unroute("**/api/create-studio");
    await assertUnconfirmed(page, "foreign write");
    // Now somebody else stores something different, so the store holds neither the editor's
    // document nor the revision the uncertainty began at.
    const elsewhere = await writeElsewhere(page, " (foreign writer)");
    assert.equal(elsewhere.status, 200, `the foreign write must succeed for this case to mean anything: ${JSON.stringify(elsewhere)}`);
    const foreign = await stored(page);
    assert.match(foreign.name ?? "", /foreign writer/, "the store must hold the other writer's document");

    await studio.getByRole("button", { name: "Check the stored version" }).click();
    const verdict = await verdictVisible(page);
    assert.doesNotMatch(verdict, /did commit/i, `the check must not claim a commit when the store holds someone else's document, read: ${verdict.slice(0, 200)}`);

    // The point of the case. Adopting the foreign revision while keeping the local document on
    // screen would re-enable Save against a revision this work was never based on, and the next
    // save would overwrite that writer silently. So saving must be unavailable, and a click must
    // leave the store alone.
    // The behavioural assertion first: whether the editor CAN overwrite is the question, and the
    // chip's wording is a symptom of the answer.
    const save = studio.getByRole("button", { name: "Save", exact: true });
    assert.ok(await save.isDisabled(), "saving over a foreign write must be unavailable, not merely discouraged");
    const state = await chip(page);
    assert.match(state, /Draft revision conflict/, `work based on a superseded revision must say so, read: ${state}`);
    // Forced, so that a handler reachable past the disabled attribute would still be caught.
    await save.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2_000);
    const afterSave = await stored(page);
    assert.equal(afterSave.revision, foreign.revision, `a save after a foreign write must not advance the revision, read ${foreign.revision} → ${afterSave.revision}`);
    assert.match(afterSave.name ?? "", /foreign writer/, "a save after a foreign write must not overwrite the other writer's document");
    assert.ok(await studio.getByRole("button", { name: "Download draft" }).first().isEnabled(), "the local work must still be downloadable");
    readings.foreignWrite = { revisions: [before.revision, foreign.revision, afterSave.revision], verdict: verdict.slice(0, 220), state, storedName: afterSave.name };
    pass("a foreign write during uncertainty blocks saving over it, and a save attempt leaves the other writer's document intact");
    await context.close();
  }

  await writeFile(resolve(out, "save-state.json"), JSON.stringify({ readings, results, controls }, null, 2));
  console.log(JSON.stringify({ passed: results.length, controls: controls.length, out }));
} catch (error) {
  await writeFile(resolve(out, "save-state-failure.json"), JSON.stringify({ message: String(error), readings, results, controls }, null, 2));
  throw error;
} finally { await browser.close(); }
