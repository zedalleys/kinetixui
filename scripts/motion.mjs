/**
 * motion.mjs — proves that declared motion actually renders, and that reduced motion suppresses it.
 *
 *   node scripts/motion.mjs            # both passes
 *   node scripts/motion.mjs --list     # what would be exercised, no browser
 *
 * For every entry in `scripts/motion-states.mjs` the same interaction runs twice:
 *
 *   normal motion   STATE A → a rendered midpoint → STATE B, over a duration a person can see
 *   reduced motion  STATE A → STATE B, over a duration nobody can see, same STATE B
 *
 * Both halves matter and neither implies the other. A component with no motion passes the reduced
 * pass trivially while failing the normal one — the defect `collapsible` had. A component that
 * ignores `prefers-reduced-motion` passes the normal one and fails the reduced one.
 *
 * Why both a midpoint and a duration are asserted, rather than either alone, is explained in the
 * header of motion-states.mjs: seeking to 50% of a 0.01ms animation produces a midpoint too.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { MOTION_STATES, coverageErrors, isIntermediate, MOTION_REQUIRED, PERCEPTIBLE_MS, SUPPRESSED_MS } from "./motion-states.mjs";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");

if (process.argv.includes("--list")) {
  for (const s of MOTION_STATES) console.log(`${s.slug.padEnd(14)} ${s.interaction.padEnd(18)} ${s.classification}`);
  process.exit(0);
}

const coverage = coverageErrors();
if (coverage.length) {
  console.error("motion: coverage gaps\n" + coverage.map((e) => "  ✗ " + e).join("\n"));
  process.exit(1);
}

if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
// Stories import the built package; measuring against a stale dist describes code that is gone.
assertUiDistMatchesSource("motion");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(staticDir, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const index = JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8"));
const known = new Set(
  Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id),
);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

/**
 * Run one interaction and report what rendered.
 *
 * `{ a, mid, b, animations, durationMs }`, or `{ error }`. `animations: 0` is the honest signal that
 * nothing was set up to move, reported separately from "moved, but not perceptibly".
 */
async function sample(page, state) {
  // STATE A. Disclosure content is unmounted while closed, so when the target only exists once open
  // the pre-state is read from `targetBefore` if one is declared, and is otherwise the collapsed 0.
  const beforeSel = state.targetBefore ?? (state.target === "@aria-controls" ? null : state.target);
  const beforeEl = beforeSel ? await page.$(beforeSel) : null;
  const a = beforeEl ? await beforeEl.evaluate((el, p) => getComputedStyle(el)[p], state.property) : "0px";

  const triggerEl = await page.$(state.trigger.selector);
  if (!triggerEl) return { error: `trigger not found: ${state.trigger.selector}` };

  /**
   * Trigger and measure inside ONE browser task.
   *
   * An earlier version clicked from Node, waited a macrotask, then came back for the animations.
   * That is a race against a 200ms animation across a WebSocket, and it lost once on a cold first
   * navigation: the accordion was reported as "nothing animates" in a run where it demonstrably did.
   * A gate that fails one run in four is worse than no gate, so the round-trip is removed rather
   * than padded with a longer sleep — the click, the two frames React needs to commit and mount the
   * content, and the read all happen in the page.
   *
   * Two `requestAnimationFrame`s rather than a timer: they are tied to rendered frames, so this
   * samples ~32ms into a 200ms animation regardless of how fast the machine is, instead of hoping a
   * wall-clock delay lands inside the window.
   */
  const measured = await page.evaluate(
    ({ triggerSel, action, key, wantsAriaControls, targetSel, property }) => {
      const trigger = document.querySelector(triggerSel);
      if (!trigger) return { error: `trigger vanished: ${triggerSel}` };
      if (action === "press") {
        trigger.focus();
        for (const type of ["keydown", "keyup"]) trigger.dispatchEvent(new KeyboardEvent(type, { key: key ?? "Enter", bubbles: true }));
      } else {
        trigger.click();
      }
      return new Promise((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            // Radix only points a disclosure trigger at its content once that content is mounted,
            // so aria-controls is read here rather than before the trigger.
            const id = wantsAriaControls ? trigger.getAttribute("aria-controls") : null;
            if (wantsAriaControls && !id) return resolve({ error: `trigger has no aria-controls after opening: ${triggerSel}` });
            const el = document.querySelector(id ? `[id="${id}"]` : targetSel);
            if (!el) return resolve({ error: `target not found after trigger: ${id ? `#${id}` : targetSel}` });

            const running = el.getAnimations({ subtree: false }).filter((x) => Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
            if (running.length === 0) return resolve({ animations: 0, mid: null, b: getComputedStyle(el)[property], durationMs: 0 });

            let longest = 0;
            for (const x of running) longest = Math.max(longest, Number(x.effect.getComputedTiming().activeDuration) || 0);
            for (const x of running) x.pause();
            for (const x of running) {
              try {
                x.currentTime = longest / 2;
              } catch {
                /* a finished animation refuses a seek and contributes no midpoint */
              }
            }
            const mid = getComputedStyle(el)[property];
            for (const x of running) {
              try {
                x.finish();
              } catch {
                /* an infinite animation cannot finish; it is not a disclosure transition */
              }
            }
            resolve({ animations: running.length, mid, b: getComputedStyle(el)[property], durationMs: longest });
          }),
        );
      });
    },
    {
      triggerSel: state.trigger.selector,
      action: state.trigger.action,
      key: state.trigger.key ?? null,
      wantsAriaControls: state.target === "@aria-controls",
      targetSel: state.target,
      property: state.property,
    },
  );

  return measured.error ? measured : { a, ...measured };
}

async function runPass({ reduced }) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const out = [];
  for (const state of MOTION_STATES) {
    if (!known.has(state.story)) {
      out.push({ error: `story not in the built index: ${state.story}` });
      continue;
    }
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(state.story)}&viewMode=story`, { waitUntil: "load" });
    await page.waitForSelector("#storybook-root *", { timeout: 15000 });
    out.push(await sample(page, state));
  }
  await context.close();
  return out;
}

/** The end state under reduced motion must be the one normal motion reaches, within rounding. */
function sameEndState(a, b) {
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) <= 1;
  return String(a) === String(b);
}

const normal = await runPass({ reduced: false });
const reduced = await runPass({ reduced: true });
await browser.close();
server.close();

const failures = [];
const lines = [];

for (let i = 0; i < MOTION_STATES.length; i++) {
  const state = MOTION_STATES[i];
  const n = normal[i];
  const r = reduced[i];
  const label = `${state.slug}/${state.interaction}`;

  if (n.error) failures.push(`${label} normal: ${n.error}`);
  if (r.error) failures.push(`${label} reduced: ${r.error}`);
  if (n.error || r.error) continue;
  if (state.classification !== MOTION_REQUIRED) continue;

  // NORMAL — something animates, it lasts long enough to see, and the property really interpolates.
  if (n.animations === 0) {
    failures.push(
      `${label} normal: nothing animates. ${state.property} goes ${n.a} -> ${n.b} in one frame.\n` +
        `      Declared MOTION_REQUIRED: this change is meant to be perceptible, not instant.`,
    );
  } else if (n.durationMs < PERCEPTIBLE_MS) {
    failures.push(
      `${label} normal: animates for ${n.durationMs}ms, below the ${PERCEPTIBLE_MS}ms perceptibility floor.\n` +
        `      A transition given no time to happen is a jump with extra steps.`,
    );
  } else if (!isIntermediate(n.a, n.mid, n.b)) {
    failures.push(
      `${label} normal: ${n.animations} animation(s) ran for ${Math.round(n.durationMs)}ms, but no rendered midpoint lies between the ends.\n` +
        `      ${state.property}: A=${n.a} mid=${n.mid} B=${n.b}\n` +
        `      An animation that does not move the measured property is not evidence of motion.`,
    );
  } else {
    lines.push(`  ${label.padEnd(30)} ${state.property}: ${n.a} → ${n.mid} → ${n.b}   ${Math.round(n.durationMs)}ms`);
  }

  // REDUCED — the movement is gone, and the state change is not.
  if (r.durationMs > SUPPRESSED_MS) {
    failures.push(
      `${label} reduced: still animates for ${r.durationMs}ms (limit ${SUPPRESSED_MS}ms).\n` +
        `      prefers-reduced-motion must remove the movement.`,
    );
  }
  if (!sameEndState(n.b, r.b)) {
    failures.push(
      `${label} reduced: final ${state.property} is ${r.b}, but normal motion lands on ${n.b}.\n` +
        `      Reduced motion removes the movement, never the state change.`,
    );
  }
}

const required = MOTION_STATES.filter((s) => s.classification === MOTION_REQUIRED).length;
if (lines.length) {
  console.log("motion — rendered intermediate states (normal motion)\n");
  console.log(lines.join("\n"));
  console.log("");
}
if (failures.length) {
  console.error(`motion FAILED — ${failures.length} problem(s):`);
  console.error(failures.map((f) => "  ✗ " + f).join("\n"));
  process.exit(1);
}
console.log(
  `motion ok — ${required} motion-required interaction(s): each rendered a midpoint over at least ${PERCEPTIBLE_MS}ms, ` +
    `and under prefers-reduced-motion each collapsed to ≤${SUPPRESSED_MS}ms while landing on the same end state.`,
);
