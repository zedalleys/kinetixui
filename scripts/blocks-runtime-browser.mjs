/**
 * blocks-runtime-browser.mjs — the React blocks, running on the built site in real Chromium.
 *
 *   pnpm build:web && pnpm --filter @kinetixui/web start &
 *   node scripts/blocks-runtime-browser.mjs --base http://127.0.0.1:3000
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * Every block had a source file and a CI build, and nothing that ran it the way a reader meets it. The live
 * previews on /blocks ARE the React blocks (registry/block-previews.tsx renders the same fixture the snippet
 * is extracted from), so this drives those previews: what it proves is true of the code a reader copies.
 *
 * ── How evidence is attributed ──────────────────────────────────────────────
 * Each pass is a marked passage (`kx-verify-block: <kind>`, read by gen-verification.mjs). A passage covers
 * the blocks it names with `block("<slug>")`, or every block in blocks.manifest.json when it says
 * `kx-verify-covers: blocks.manifest.json` — and then it must really reach every one, which it checks. The
 * environment (Chromium) is a fact about this file, recorded by the generator, not claimed here.
 *
 * Only what a passage asserts counts. The accessibility pass runs axe over each block's own preview in light
 * and dark, left-to-right and right-to-left. The interaction passes drive one block each and assert what changed:
 * order summary by keyboard and by pointer, receipt and the boarding pass by keyboard. A block with no interaction passage here stays Build verified on React.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { createFailureLog } from "./blocks-runtime-console.mjs";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../blocks.manifest.json", import.meta.url), "utf8")).blocks;
const PUBLISHED = new Set(["beta", "stable", "deprecated"]);
const SLUGS = Object.keys(manifest).filter((s) => manifest[s].sources?.React && PUBLISHED.has(manifest[s].status));

const failures = [];
const fail = (msg) => failures.push(msg);
const passed = [];
const ok = (msg) => passed.push(msg);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
// Whose failure each browser event was, decided by the origin of the request that failed rather than by
// how the console happened to word it. See blocks-runtime-console.mjs for why that distinction exists.
const browserLog = createFailureLog(base);

/**
 * Attach the four event streams to a page. Named and shared on purpose: the controls at the end of this
 * file drive real responses through *this* function rather than through a copy, so they prove the wiring
 * and not just the classifier the unit tests already cover.
 */
function watch(page, log) {
  page.on("pageerror", (e) => log.pageError({ url: page.url(), message: e.message }));
  page.on("console", (m) => (m.type() === "error" ? log.consoleError({ url: page.url(), text: m.text() }) : null));
  page.on("response", (r) => log.response({ url: r.url(), status: r.status() }));
  page.on("requestfailed", (r) => log.requestFailed({ url: r.url(), errorText: r.failure()?.errorText ?? "" }));
}

async function open({ scheme = "light", dir = "ltr", width = 1280, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
  if (permissions.length) await context.grantPermissions(permissions, { origin: base });
  const page = await context.newPage();
  watch(page, browserLog);
  await page.goto(`${base}/blocks`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    ({ s, d }) => {
      document.documentElement.classList.toggle("dark", s === "dark");
      document.documentElement.style.colorScheme = s;
      document.documentElement.dir = d;
    },
    { s: scheme, d: dir },
  );
  await page.waitForTimeout(150);
  return { context, page };
}

/** The live preview of one block: the fixture itself, inside its showcase. */
const block = (page, slug) => page.locator(`[id="${slug}"] [data-showcase-preview]`);

// kx-verify-block: accessibility
// kx-verify-covers: blocks.manifest.json
{
  // axe over each block's own preview, in every look a reader can switch to. Scoped per block, so a
  // violation names the block it belongs to rather than the page.
  const looks = [
    ["light", "ltr"],
    ["dark", "ltr"],
    ["light", "rtl"],
    ["dark", "rtl"],
  ];
  const reached = new Set();
  for (const [scheme, dir] of looks) {
    const { context, page } = await open({ scheme, dir });
    await page.addScriptTag({ content: axeSource });
    for (const slug of SLUGS) {
      if (!(await block(page, slug).count())) {
        fail(`a11y ${slug} ${scheme}/${dir}: no live preview on /blocks`);
        continue;
      }
      reached.add(slug);
      const result = await page.evaluate(
        async (sel) => window.axe.run({ include: [[sel]] }, { resultTypes: ["violations"] }),
        `[id="${slug}"] [data-showcase-preview]`,
      );
      for (const v of result.violations) fail(`a11y ${slug} ${scheme}/${dir}: ${v.id} — ${v.nodes.length} node(s): ${v.nodes[0]?.target}`);
    }
    await context.close();
  }
  const missed = SLUGS.filter((s) => !reached.has(s));
  if (missed.length) fail(`a11y: the pass claims every block but never reached ${missed.join(", ")}`);
  else ok(`a11y: axe finds no violations in any of ${SLUGS.length} block previews, light and dark, LTR and RTL`);
}

// kx-verify-block: interaction
{
  // order-summary: the steppers are the block's job. Driven by keyboard and by pointer; the totals and the
  // submit state are what must follow.
  const { context, page } = await open();
  const root = block(page, "order-summary");
  const text = async (term) => (await root.locator("dt", { hasText: new RegExp(`^${term}$`) }).locator("xpath=following-sibling::dd").textContent())?.trim();
  const tee = root.getByRole("spinbutton", { name: "Quantity, Kinetix T-shirt" });
  const stickers = root.getByRole("spinbutton", { name: "Quantity, Sticker pack" });
  const place = root.getByRole("button", { name: "Place order" });

  if ((await text("Subtotal")) !== "$62.00" || (await text("Shipping")) !== "Free") fail(`order-summary: starts at ${await text("Subtotal")} / ${await text("Shipping")}, expected $62.00 / Free`);

  // keyboard: Tab onto the sticker stepper and raise it with the arrow key
  // the field's indicator is drawn on its wrapper (an action-coloured edge and the focus shadow), so the wrapper is
  // what is compared, at rest and focused, after its transition has settled
  const wrapperLook = (el) => {
    const w = getComputedStyle(el.parentElement);
    return [w.boxShadow, w.borderColor].join("|");
  };
  const rest = await stickers.evaluate(wrapperLook);
  await stickers.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  const focused = await stickers.evaluate((el) => el === document.activeElement);
  const ring = await stickers.evaluate(wrapperLook);
  if (!focused) fail("order-summary: Tab does not land on the sticker stepper");
  if (ring === rest) fail("order-summary: the focused stepper shows no focus indicator");
  await page.keyboard.press("ArrowUp");
  if ((await stickers.inputValue()) !== "2") fail(`order-summary: ArrowUp left the sticker count at ${await stickers.inputValue()}`);
  if ((await text("Subtotal")) !== "$68.00") fail(`order-summary: after ArrowUp the subtotal reads ${await text("Subtotal")}, expected $68.00`);

  // pointer: the named Decrease buttons take the T-shirts to zero, under the free-shipping threshold
  const teeRow = root.locator("li", { has: page.getByRole("spinbutton", { name: "Quantity, Kinetix T-shirt" }) });
  for (let i = 0; i < 2; i++) await teeRow.getByRole("button", { name: "Decrease" }).click();
  if ((await tee.inputValue()) !== "0") fail(`order-summary: two Decrease clicks left ${await tee.inputValue()} T-shirts`);
  if ((await text("Subtotal")) !== "$12.00" || (await text("Shipping")) !== "$5.00" || (await text("Total")) !== "$17.00")
    fail(`order-summary: at 0 T-shirts and 2 stickers it reads ${await text("Subtotal")} / ${await text("Shipping")} / ${await text("Total")}, expected $12.00 / $5.00 / $17.00`);

  // nothing in the order: the submit must say so by being disabled, not by failing later
  const stickerRow = root.locator("li", { has: page.getByRole("spinbutton", { name: "Quantity, Sticker pack" }) });
  for (let i = 0; i < 2; i++) await stickerRow.getByRole("button", { name: "Decrease" }).click();
  if (!(await place.isDisabled())) fail("order-summary: an empty order can still be placed");
  if (!failures.some((f) => f.startsWith("order-summary"))) ok("order-summary: keyboard and pointer steppers update subtotal, shipping and total; an empty order cannot be placed");
  await context.close();
}

// kx-verify-block: interaction
{
  // receipt: the reference is what a reader quotes, so copying it must work and must say that it worked.
  const { context, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] });
  const root = block(page, "receipt");
  const copy = root.getByRole("button", { name: /copy/i });
  const status = root.locator('[role="status"]').first();
  if ((await copy.count()) !== 1) fail(`receipt: expected one copy button, found ${await copy.count()}`);
  else {
    await copy.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const said = (await status.textContent())?.trim();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    if (said !== "Copied") fail(`receipt: after Enter the status says "${said}", expected "Copied"`);
    if (clip !== "RCP-2026-004817") fail(`receipt: the clipboard holds "${clip}", expected the receipt number`);
    if (!failures.some((f) => f.startsWith("receipt"))) ok("receipt: Enter on the copy button puts the receipt number on the clipboard and announces it");
  }
  await context.close();
}
// kx-verify-block: interaction
{
  // boarding-pass: the confirmation code is the one value a traveller reads out or pastes, so copying it
  // must work from the keyboard and must say that it worked. The code image is decorative modules behind one
  // name, so the pass must still carry its facts as text when the code will not scan.
  const { context, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] });
  const root = block(page, "boarding-pass");
  const copy = root.getByRole("button", { name: /copy/i });
  const status = root.locator('[role="status"]').first();

  // the facts a traveller needs are text in the field grid, not pixels in the code
  const field = async (term) =>
    (await root.locator("dt", { hasText: new RegExp(`^${term}$`) }).locator("xpath=following-sibling::dd").textContent())?.trim();
  if ((await field("Gate")) !== "C21" || (await field("Seat")) !== "9A")
    fail(`boarding-pass: the grid reads Gate ${await field("Gate")} / Seat ${await field("Seat")}, expected C21 / 9A`);
  if ((await root.getByRole("img", { name: "Boarding pass QR code" }).count()) !== 1)
    fail("boarding-pass: the supplied code is not a single named image");

  if ((await copy.count()) !== 1) fail(`boarding-pass: expected one copy button, found ${await copy.count()}`);
  else {
    await copy.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const said = (await status.textContent())?.trim();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    if (said !== "Copied") fail(`boarding-pass: after Enter the status says "${said}", expected "Copied"`);
    if (clip !== "KX7F2Q9") fail(`boarding-pass: the clipboard holds "${clip}", expected the confirmation code`);
  }
  if (!failures.some((f) => f.startsWith("boarding-pass")))
    ok("boarding-pass: gate and seat are text, the code is one named image, and Enter on the copy button puts the confirmation code on the clipboard and announces it");
  await context.close();
}
// kx-verify-block: end

/* ── layout: the three interactive blocks at phone and desktop width (not block evidence; a page check) ── */
for (const width of [390, 1280])
  for (const dir of ["ltr", "rtl"]) {
    const { context, page } = await open({ width, dir });
    for (const slug of ["order-summary", "receipt", "boarding-pass"]) {
      const over = await block(page, slug).evaluate((el) => [...el.querySelectorAll("*")].filter((n) => n.getBoundingClientRect().right > innerWidth + 1 || n.getBoundingClientRect().left < -1).length);
      if (over) fail(`layout ${slug} ${width}/${dir}: ${over} element(s) outside the viewport`);
    }
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (scroll > 0) fail(`layout /blocks ${width}/${dir}: the page scrolls sideways by ${scroll}px`);
    await context.close();
  }
if (!failures.some((f) => f.startsWith("layout"))) ok("layout: order-summary, receipt and boarding-pass stay inside the viewport at 390 and 1280, LTR and RTL");

/* ── controls: real responses through the same `watch` wiring, into a throwaway log ───────────────────
 * The unit tests in scripts/release/test/blocks-runtime-console.test.mjs drive the classifier with
 * synthetic events, so they prove the rule but not that Chromium hands this script the event the rule
 * needs. These two drive real responses through `watch` instead. Ported from #546, which proved the
 * first-party half is the one that was invisible: before a response listener existed, a block preview
 * answering 404 left nothing in this gate at all.
 *
 * The third-party origin has to be api.github.com. `apps/web/next.config.mjs` sets
 * `connect-src 'self' https://api.github.com`, so any other host is refused by our own policy and the
 * fetch never reaches a response at all — which the classifier would rightly read as this site's defect.
 */
{
  const probe = createFailureLog(base);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  watch(page, probe);
  await page.goto(base);

  // Positive: one of our own routes answering 404 is this site's, and Chromium logs it as the bare
  // "Failed to load resource" with no URL — exactly the message the replaced rule discarded.
  const ours = `/__kx-origin-control-${Date.now()}`;
  const status = await page.evaluate(async (u) => (await fetch(u)).status, ours);
  if (status !== 404) fail(`control: expected ${ours} to answer 404, got ${status}`);
  let seen = probe.report();
  if (!seen.failures.includes(`404 for ${ours}`))
    fail(`control: a same-origin 404 was not attributed to this site (${seen.failures.length} first-party entr${seen.failures.length === 1 ? "y" : "ies"})`);
  const first = seen.failures.length;

  // Negative: another origin failing is listed and must not join the tally, or the positive control
  // above would also pass an implementation that simply blames everything on this site.
  //
  // Matched and asserted on the parsed host and the whole expected entry, never on a substring of a URL:
  // `url.includes("api.github.com")` is also true of `https://evil.example/?x=api.github.com`, and a
  // control that imprecise is the same defect this gate exists to fix.
  const theirs = new URL("https://api.github.com/__kx-origin-control/probe");
  await context.route((u) => u.hostname === theirs.hostname, (r) => r.fulfill({ status: 503, body: "" }));
  await page.evaluate((u) => fetch(u).catch(() => {}), theirs.href);
  await page.waitForTimeout(250);
  seen = probe.report();
  if (!seen.thirdParty.includes(`503 ${theirs.origin}${theirs.pathname}`)) fail(`control: a third-party 503 was not listed as someone else's (listed: ${seen.thirdParty.join("; ") || "nothing"})`);
  if (seen.failures.length !== first) fail(`control: a third-party 503 joined this site's failures (${seen.failures.slice(first).join("; ")})`);

  await context.close();
  if (!failures.some((f) => f.startsWith("control")))
    ok("controls: through the same listeners the run uses, one of our own 404s is this site's and another origin's 503 is listed without failing the gate");
}

const { failures: browserFailures, thirdParty } = browserLog.report();
for (const e of browserFailures) fail(`console: ${e}`);
// Reported, deliberately not failed: this site cannot answer for another host being down, and a product
// gate that goes red when one is teaches its reader to re-run it rather than read it.
if (thirdParty.length) ok(`(not this site's) third-party requests failed: ${thirdParty.join(", ")}`);
await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
for (const f of failures) console.error(`  x ${f}`);
if (failures.length) {
  console.error(`\ncheck:blocks-runtime failed — ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`check:blocks-runtime ok — ${passed.length} checks`);
