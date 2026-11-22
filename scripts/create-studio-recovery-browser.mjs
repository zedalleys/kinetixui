/**
 * M5.21 — the Create Studio recovery surface's exits must actually exit.
 *
 * M5.20 added the route boundary and proved what it SHOWS. What nothing proved is what its three
 * controls DO. Measured at 9c322466: "Try the editor again" and "Back to the theme creator" work,
 * and "Reload Create Studio" did not — it was a `next/link` to the route the user is already on,
 * so the App Router kept the error boundary mounted and the label promised a reload that never
 * happened. This gate is the thing that would have caught that.
 *
 * It needs a real render exception, which no doctored server reply can produce: the client
 * validates every document it loads (`readProduct` → `migrateDocument`), and an unknown component
 * `ref` is rejected by `validateProps` before it can reach a render. So the crash trigger is
 * injected into the source by `scripts/create-studio-recovery-exit-controls.sh`, which also
 * restores it. Run through that script, not directly.
 *
 *   CREATE_BASE=http://127.0.0.1:3137 bash scripts/create-studio-recovery-exit-controls.sh
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.CREATE_BASE ?? "http://127.0.0.1:3137";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|$)/.test(base)) throw new Error(`refusing a non-local base: ${base}`);
const artifacts = process.env.CREATE_ARTIFACTS ?? ".impeccable/review/create-studio";
mkdirSync(artifacts, { recursive: true });

const STACK_LEAKS = [/\.tsx?:\d+/, /\bat \w+ \(/, /TypeError/, /Cannot read properties/i, /deliberate adapter render failure/];
const readings = [];
let passed = 0;
const pass = (label, detail) => { passed += 1; readings.push({ label, detail }); console.log(`PASS ${label}`); };

async function startWorkspace(page, studio) {
  const start = studio.getByRole("button", { name: "Start local workspace" });
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await start.count()) await start.click({ timeout: 10_000 }).catch(() => {});
    try { await studio.locator("#studio-open-product").waitFor({ timeout: 4_000 }); return; } catch { /* not yet */ }
  }
  throw new Error("the local workspace did not open after five attempts");
}

/** Open the editor, save a product, then crash the render by giving a Badge the trigger text. */
async function crash(context, name) {
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(180_000);
  const studio = page.locator(".create-studio");
  await page.goto(base + "/create/studio");
  await startWorkspace(page, studio);
  await studio.getByLabel("New product name").fill(name);
  await studio.getByRole("button", { name: "New product", exact: true }).click();
  await studio.getByRole("button", { name: "Add Badge", exact: true }).waitFor();
  await studio.getByRole("button", { name: "Add Badge", exact: true }).click();
  await studio.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally");
  const id = await page.evaluate(async () => (await (await fetch("/api/create-studio", { cache: "no-store" })).json()).products.at(-1).id);
  const before = await stored(page, id);
  await studio.locator("#studio-prop-text").fill("CRASH-NOW");
  await studio.locator("#studio-prop-text").press("Enter").catch(() => {});
  await page.waitForTimeout(2_500);
  assert.equal(
    await page.locator(".studio-recovery-surface").count(), 1,
    "the crash trigger is not installed, so this gate proves nothing — run it through scripts/create-studio-recovery-exit-controls.sh",
  );
  return { page, studio, id, before };
}
const stored = (page, id) => page.evaluate(async (pid) => {
  const body = await (await fetch("/api/create-studio?id=" + encodeURIComponent(pid), { cache: "no-store" })).json();
  return { revision: body.revision, bytes: JSON.stringify(body.doc ?? null).length };
}, id);
const onSurface = (page) => page.locator(".studio-recovery-surface").count().then((n) => n > 0);

const browser = await chromium.launch();
try {
  // 1 · what the surface shows, and what it must not show.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio, id, before } = await crash(context, "recovery-shows");
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    assert.equal(await page.locator("header").count(), 0, "the recovery surface must render inside the application shell, with no site header");
    assert.equal(await page.locator("footer").count(), 0, "the recovery surface must render inside the application shell, with no site footer");
    for (const leak of STACK_LEAKS) assert.doesNotMatch(text, leak, `the recovery surface must not expose internals, matched ${leak}`);
    const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName.toLowerCase(), tabindex: document.activeElement?.getAttribute("tabindex") }));
    assert.equal(focus.tag, "h1", `the recovery surface must take focus on its heading, focus was on ${focus.tag}`);
    const after = await stored(page, id);
    assert.deepEqual(after, before, "a render crash must not change the persisted document");
    await page.screenshot({ path: `${artifacts}/m521-recovery-surface.png` });
    pass("the recovery surface explains the failure inside the app shell, takes focus, leaks nothing and leaves the saved product alone", { focus, before, after });
    await context.close();
    void studio;
  }

  // 2 · "Try the editor again" — reset() must put the editor back.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await crash(context, "recovery-retry");
    const retry = page.getByRole("button", { name: "Try the editor again" });
    assert.equal(await retry.count(), 1, "the recovery surface must offer a retry that is a button, not a link");
    await retry.click();
    await page.waitForTimeout(3_000);
    assert.equal(await onSurface(page), false, "Try the editor again must leave the recovery surface");
    assert.ok(await studio.count(), "Try the editor again must bring the editor back");
    pass("Try the editor again returns to the editor", { shell: await studio.getAttribute("data-shell") });
    await context.close();
  }

  // 3 · "Reload Create Studio" — the defect this gate exists for. A soft navigation to the route
  //     you are already on does not remount past the boundary, so the control must be a document
  //     navigation. Nothing about the DOM distinguishes the two: only the OUTCOME does.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page, studio } = await crash(context, "recovery-reload");
    await page.getByRole("link", { name: "Reload Create Studio" }).click();
    await page.waitForTimeout(3_500);
    assert.equal(await onSurface(page), false, "Reload Create Studio must leave the recovery surface");
    assert.ok(await studio.count(), "Reload Create Studio must bring the editor back");
    pass("Reload Create Studio leaves the recovery surface", { url: page.url(), shell: await studio.getAttribute("data-shell") });
    await context.close();
  }

  // 4 · the way out of Create Studio entirely.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const { page } = await crash(context, "recovery-exit");
    await page.getByRole("link", { name: "Back to the theme creator" }).click();
    await page.waitForTimeout(3_500);
    assert.equal(await onSurface(page), false, "Back to the theme creator must leave the recovery surface");
    assert.match(new URL(page.url()).pathname, /^\/create$/, `Back to the theme creator must land on /create, landed on ${page.url()}`);
    pass("Back to the theme creator leaves Create Studio", { url: page.url() });
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${artifacts}/m521-recovery.json`, JSON.stringify({ passed, readings }, null, 2));
console.log(JSON.stringify({ passed, out: artifacts }));
