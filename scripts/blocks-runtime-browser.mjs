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
 * order summary by keyboard and by pointer, receipt by keyboard. A block with no interaction passage here stays Build verified on React.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

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
const errors = [];

async function open({ scheme = "light", dir = "ltr", width = 1280, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
  if (permissions.length) await context.grantPermissions(permissions, { origin: base });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => (m.type() === "error" && !/^Failed to load resource/.test(m.text()) ? errors.push(m.text()) : null));
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
// kx-verify-block: end

/* ── layout: the two interactive blocks at phone and desktop width (not block evidence; a page check) ── */
for (const width of [390, 1280])
  for (const dir of ["ltr", "rtl"]) {
    const { context, page } = await open({ width, dir });
    for (const slug of ["order-summary", "receipt"]) {
      const over = await block(page, slug).evaluate((el) => [...el.querySelectorAll("*")].filter((n) => n.getBoundingClientRect().right > innerWidth + 1 || n.getBoundingClientRect().left < -1).length);
      if (over) fail(`layout ${slug} ${width}/${dir}: ${over} element(s) outside the viewport`);
    }
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (scroll > 0) fail(`layout /blocks ${width}/${dir}: the page scrolls sideways by ${scroll}px`);
    await context.close();
  }
if (!failures.some((f) => f.startsWith("layout"))) ok("layout: order-summary and receipt stay inside the viewport at 390 and 1280, LTR and RTL");

if (errors.length) for (const e of [...new Set(errors)]) fail(`console: ${e}`);
await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
for (const f of failures) console.error(`  x ${f}`);
if (failures.length) {
  console.error(`\ncheck:blocks-runtime failed — ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`check:blocks-runtime ok — ${passed.length} checks`);
