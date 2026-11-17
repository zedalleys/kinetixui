/**
 * react-carousel-focus-negative-controls.mjs — proves `scripts/react-carousel-focus.mjs` can fail.
 *
 *   pnpm build:ui && pnpm build-storybook && node scripts/react-carousel-focus-negative-controls.mjs
 *
 * The gate it controls asserts that focus survives the activation that exhausts the carousel's track. A
 * gate that asserts focus retention is worth nothing unless it would notice focus being lost, and this
 * one is unusually easy to get wrong: the same assertion written in jsdom passes against the defect,
 * because jsdom keeps focus on a natively disabled button. So the instrument is driven twice.
 *
 *   positive   the page as shipped: the gate's own verdict must hold, in full
 *   negative   the removed line restored IN THE PAGE — `aria-disabled` mirrored onto the native
 *              `disabled` property as React sets it, which is what `disabled={!canScrollNext}` did — and
 *              the verdict must fail, naming focus on `BODY`
 *
 * The negative case insists on that word. "Some row failed" would pass for a mis-built page, a missing
 * story or a typo in a selector; only the defect puts the reader's focus on `BODY`, so only that reading
 * is accepted as proof the instrument sees the thing it was built for.
 *
 * Nothing is committed in the broken state: the mutation lives in the page for the length of one context
 * and the component on disk is never touched.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveStatic } from "./visual-harness.mjs";
import { journey, openStory, verdict } from "./react-carousel-focus.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}

/**
 * The pre-fix component, restored at runtime: whenever React marks a control unavailable, make it
 * natively disabled too. That is precisely what the removed `disabled={!canScrollNext}` did, and it is
 * applied by the same mechanism React used — a DOM mutation inside the activation — so the browser sees
 * the same sequence it saw before the fix.
 */
const RESTORE_THE_DEFECT = () => {
  const controls = [...document.querySelectorAll('[data-kx-probe="next"], [data-kx-probe="prev"]')];
  const mirror = () => {
    for (const el of controls) el.disabled = el.getAttribute("aria-disabled") === "true";
  };
  new MutationObserver(mirror).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-disabled"] });
  mirror();
};

const storybook = await serveStatic(staticDir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

const run = async (breakIt) => {
  const { ctx, page } = await openStory(browser, storybook.base);
  if (breakIt) await page.evaluate(RESTORE_THE_DEFECT);
  const rows = [];
  for (const which of ["next", "prev"]) rows.push(...verdict(which, await journey(page, which)));
  await ctx.close();
  return rows;
};

const failures = [];
const check = (ok, label, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(58)} ${detail}`);
  if (!ok) failures.push(`${label}: ${detail}`);
};

console.log("positive control — the page as shipped");
const shipped = await run(false);
const shippedFailed = shipped.filter((r) => !r.ok);
check(shippedFailed.length === 0, "the gate holds on the shipped component", shippedFailed.length ? shippedFailed.map((r) => r.label).join("; ") : `${shipped.length} assertions, all ok`);

console.log("\nnegative control — the native `disabled` restored in the page");
const broken = await run(true);
const brokenFailed = broken.filter((r) => !r.ok);
const namesBody = brokenFailed.filter((r) => /\bBODY\b/.test(r.detail));
check(brokenFailed.length > 0, "the gate fails once the defect is back", `${brokenFailed.length} of ${broken.length} assertions failed`);
check(namesBody.length > 0, "and it fails BECAUSE focus fell to BODY", namesBody.map((r) => `${r.label} — ${r.detail}`).join(" | ") || "no row named BODY");

await browser.close();
storybook.close();

if (failures.length) {
  console.error(`\nreact-carousel-focus-negative-controls: ${failures.length} control(s) did not behave as required\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nreact-carousel-focus-negative-controls: the gate passes what it should and fails what it should.");
