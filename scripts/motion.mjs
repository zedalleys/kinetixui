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

// This suite is what earns React its `reducedMotion` evidence: every declared interaction is driven
// in both directions, under normal motion and under prefers-reduced-motion, and the end state is
// compared across the two.
//
// kx-verify: reducedMotion
// Subjects, named so the claim resolves to exactly what is proven rather than to every story:
// <Accordion> and <Collapsible>. Adding an interaction to motion-states.mjs for another component
// means naming it here too, which is the point — the evidence should not widen silently.
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
  return page.evaluate(
    async ({ preludeSel, preludeAction, triggerSel, action, key, wantsAriaControls, targetSel, targetBeforeSel, property }) => {
      const fire = (el, how, k) => {
        if (how === "press") {
          el.focus();
          for (const type of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(type, { key: k ?? "Enter", bubbles: true }));
        } else {
          el.click();
        }
      };
      const settle = async () => {
        for (let i = 0; i < 180; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          if (document.getAnimations().every((x) => x.playState !== "running")) return;
        }
      };
      const byId = (id) => (id ? document.querySelector(`[id="${id}"]`) : null);

      // A collapse has to start from an open disclosure, and every story here loads closed. The
      // prelude opens it and is then allowed to SETTLE — without waiting out the opening animation
      // the collapse would be measured against a height still on its way up, so STATE A would be
      // wrong and the midpoint test meaningless.
      if (preludeSel) {
        const pre = document.querySelector(preludeSel);
        if (!pre) return { error: `prelude trigger not found: ${preludeSel}` };
        fire(pre, preludeAction, null);
        await settle();
      }

      const trigger = document.querySelector(triggerSel);
      if (!trigger) return { error: `trigger not found: ${triggerSel}` };

      // STATE A, read after the prelude. On an expand the content is not mounted yet, so the
      // starting height is the collapsed 0; on a collapse it is the settled open height.
      const idBefore = wantsAriaControls ? trigger.getAttribute("aria-controls") : null;
      const beforeEl = targetBeforeSel ? document.querySelector(targetBeforeSel) : wantsAriaControls ? byId(idBefore) : document.querySelector(targetSel);
      const a = beforeEl ? getComputedStyle(beforeEl)[property] : "0px";

      fire(trigger, action, key);

      return new Promise((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            // Radix points a disclosure trigger at its content only while that content is mounted:
            // on an expand the attribute appears after the click, on a collapse it is on its way
            // out. Take whichever of the two reads produced one.
            const id = wantsAriaControls ? (trigger.getAttribute("aria-controls") ?? idBefore) : null;
            if (wantsAriaControls && !id) return resolve({ error: `trigger has no aria-controls: ${triggerSel}` });
            const el = wantsAriaControls ? byId(id) : document.querySelector(targetSel);
            if (!el) return resolve({ error: `target not found after trigger: ${id ? `#${id}` : targetSel}` });

            // The rendered end state of a CLOSING disclosure is the content being gone, and the DOM
            // says that three different ways: the node is detached, or it is still attached but
            // `hidden` so it generates no layout box (height computes to "auto"), or it is detached
            // mid-read and every property comes back "". All three are height 0 on screen, and
            // reporting the natural height the element would have had if it were visible — which is
            // what getComputedStyle gives once the animation stops applying — would be describing a
            // box nobody can see.
            const read = (node) => {
              if (!node.isConnected || node.getClientRects().length === 0) return "0px";
              const v = getComputedStyle(node)[property];
              return v === "" ? "0px" : v;
            };

            const running = el.getAnimations({ subtree: false }).filter((x) => Number(x.effect?.getComputedTiming?.().activeDuration) > 0);
            if (running.length === 0) {
              return requestAnimationFrame(() => requestAnimationFrame(() => resolve({ a, animations: 0, mid: null, b: read(el), durationMs: 0 })));
            }

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
            const mid = read(el);
            for (const x of running) {
              try {
                x.finish();
              } catch {
                /* an infinite animation cannot finish; it is not a disclosure transition */
              }
            }
            // Finishing an exit animation does not remove the content: Radix unmounts it on
            // `animationend`, which is queued rather than synchronous. Give it two frames to land
            // before reading STATE B, or a collapse would be measured while its content is still
            // on screen at full height.
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve({ a, animations: running.length, mid, b: read(el), durationMs: longest })),
            );
          }),
        );
      });
    },
    {
      preludeSel: state.prelude?.selector ?? null,
      preludeAction: state.prelude?.action ?? "click",
      triggerSel: state.trigger.selector,
      action: state.trigger.action,
      key: state.trigger.key ?? null,
      wantsAriaControls: state.target === "@aria-controls",
      targetSel: state.target,
      targetBeforeSel: state.targetBefore ?? null,
      property: state.property,
    },
  );
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
