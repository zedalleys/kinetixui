/**
 * global-search-reopen-control.mjs — the negative control for `check:global-search`'s reopen step.
 *
 *   pnpm --filter @kinetixui/web build && pnpm --filter @kinetixui/web start &
 *   node scripts/global-search-reopen-control.mjs [--base http://127.0.0.1:3000]
 *
 * `check:global-search` reopens the command menu after running a result. A dialog closed that way
 * stays in the DOM while Radix plays its exit animation, and a client navigation does not remove it.
 * Reopening over that node fails two ways — the menu's keydown guard ignores a press made while a
 * dialog is open, and a `getByRole("dialog")` locator binds the dying node — so the gate read it as
 * "no Blocks group", "nothing selected" or "the menu never opened". On an idle machine the node is
 * gone within ~35ms and the gate's 200ms settle hid it; under load it is not, and the gate failed
 * 4 times in 18 six-way-concurrent runs while passing 12 of 12 sequentially.
 *
 * A race is a poor control, so this does not race. Slowing the exit animation keeps the closing
 * dialog mounted for ~3s, which makes the condition the gate must survive deterministic:
 *
 *   part 1  the mechanism: with the animation slowed, the previous dialog IS still in the DOM at the
 *           reopen point, and a dialog locator binds that node rather than a fresh one
 *   part 2  the guard is load-bearing: the reopen sequence WITHOUT the precondition misbehaves every
 *           time under that condition, and WITH it succeeds
 *   part 3  the call site is pinned: the gate still carries the precondition, so deleting it fails
 *           this control rather than going quietly green
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs).
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const NAME = "Search the docs";
/** Radix keeps a closing dialog mounted for its exit animation; a long one makes that window certain. */
const SLOW_EXIT = `[data-state="closed"] { animation-duration: 3s !important; transition-duration: 3s !important; }`;

const findings = [];
const fail = (msg) => findings.push(msg);
const passed = [];
const ok = (msg) => passed.push(msg);

const dialog = (page) => page.getByRole("dialog", { name: NAME });
const input = (page) => dialog(page).getByRole("combobox");
const selected = (page) => dialog(page).locator('[cmdk-item][data-selected="true"]');

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Walks the gate's own route to /use-cases/commerce by running a result, leaving a closing dialog behind. */
async function runAResultAndNavigate(page) {
  await page.goto(`${base}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);
  await page.addStyleTag({ content: SLOW_EXIT });
  await page.keyboard.press("Control+k");
  await dialog(page).waitFor();
  await dialog(page).getByRole("group", { name: "Blocks" }).waitFor({ timeout: 10_000 });
  await input(page).fill("");
  await input(page).pressSequentially("commerce", { delay: 10 });
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForURL(`${base}/use-cases/commerce`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);
}

/* ── part 1: the mechanism ───────────────────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await runAResultAndNavigate(page);

  const state = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[role="dialog"]')];
    return { dialogs: all.length, states: all.map((d) => d.getAttribute("data-state")) };
  });
  if (state.dialogs < 1) fail(`part 1: the closing dialog was already gone (${JSON.stringify(state)}) — the slowed exit animation is not taking effect, so parts 2 and 3 would prove nothing`);
  else ok(`part 1: the previous dialog is still in the DOM at the reopen point — ${state.dialogs} dialog(s), data-state ${JSON.stringify(state.states)}`);

  // and the gate's own locator binds it: it resolves without any press having been made
  const boundBeforeAnyPress = await dialog(page).count();
  if (boundBeforeAnyPress < 1) fail("part 1: a dialog locator did not bind the closing node, so the mis-binding path is not what this control measures");
  else ok("part 1: a dialog locator binds the closing node before any key is pressed, which is the mis-binding");
  await context.close();
}

/* ── part 2: the guard is load-bearing ───────────────────────────────────────────────────────────── */
/** The reopen step, with the precondition under test switched on or off. Resolves to null on success. */
async function reopenAndPick(page, { precondition }) {
  try {
    if (precondition) await dialog(page).waitFor({ state: "detached", timeout: 10_000 });
    await page.keyboard.press("Control+k");
    await dialog(page).waitFor({ timeout: 5_000 });
    await dialog(page).getByRole("group", { name: "Blocks" }).waitFor({ timeout: 5_000 });
    await input(page).fill("");
    await input(page).pressSequentially("slider", { delay: 10 });
    await page.waitForTimeout(150);
    await selected(page).click({ timeout: 5_000 });
    await page.waitForURL(`${base}/docs/components/slider`, { timeout: 5_000 });
    return null;
  } catch (e) {
    return `${e.name}: ${String(e.message).split("\n")[0]}`;
  }
}

for (const precondition of [false, true]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await runAResultAndNavigate(page);
  const err = await reopenAndPick(page, { precondition });
  if (precondition && err) fail(`part 2: WITH the precondition the reopen still failed — ${err}`);
  else if (precondition) ok("part 2: with the precondition, the reopen and pointer selection succeed over a closing dialog");
  else if (!err) fail("part 2: WITHOUT the precondition the reopen succeeded anyway, so the precondition is not what makes the gate reliable — this control no longer proves its subject");
  else ok(`part 2: without the precondition the reopen fails over a closing dialog — ${err}`);
  await context.close();
}

/* ── part 3: the call site is pinned ────────────────────────────────────────────────────────────── */
{
  const src = readFileSync(new URL("./global-search-browser.mjs", import.meta.url), "utf8");
  const openMenu = src.slice(src.indexOf("async function openMenu"), src.indexOf("async function type"));
  if (!openMenu) fail("part 3: openMenu was not found in global-search-browser.mjs — this control cannot pin a call site that moved");
  else if (!/waitFor\(\{\s*state:\s*"detached"/.test(openMenu)) fail('part 3: openMenu no longer waits for state "detached" before pressing, so a closing dialog can be mis-bound again');
  else ok("part 3: openMenu still requires a detached dialog before pressing");

  if (!/waitForURL\(`\$\{base\}\/use-cases\/commerce`\);\s*\n\s*await dialog\(page\)\.waitFor\(\{ state: "detached" \}\);/.test(src))
    fail("part 3: the use-case Enter is no longer followed by a detached wait, the asymmetry with the block step that caused this");
  else ok("part 3: the use-case Enter is followed by a detached wait, as the block step already was");
}

await browser.close();
for (const p of passed) console.log(`  ✓ ${p}`);
if (findings.length) {
  console.log(`\ncheck:global-search-reopen-control — ${findings.length} finding(s):`);
  for (const f of findings) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:global-search-reopen-control ok — ${passed.length} checks`);
