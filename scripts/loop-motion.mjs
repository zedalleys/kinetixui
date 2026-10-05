/**
 * loop-motion.mjs — what a continuous loop does under `prefers-reduced-motion`, read off a real browser.
 *
 *   node scripts/loop-motion.mjs
 *
 * ── Why this is its own gate ───────────────────────────────────────────────
 *
 * `scripts/motion.mjs` proves transitions: it clicks something, seeks the animation to its midpoint and
 * reads a property halfway. A loop has no destination to arrive at and nothing to click, so that shape
 * cannot express it, and bolting a second kind of claim onto it would have blurred both. This asks the
 * only two questions a loop raises:
 *
 *   normal motion   is it actually running? (an infinite animation is playing on the element)
 *   reduced motion  is it actually stopped, AND does the element still say what the motion said?
 *
 * The second half is the part that was wrong. `@kinetixui/ui` collapses every animation to 0.01ms and
 * one iteration under the reduced-motion floor, which turns a loop into a single frozen frame. The
 * Spinner carried `motion-reduce:animate-[spin_3s_linear_infinite]` as if it slowed down; the floor
 * outranks it, so the class was dead and the "slowed" spinner simply never moved, with nothing in CI
 * noticing. Reading `getAnimations()` is what makes that visible.
 *
 * ── What it deliberately does not do ──────────────────────────────────────
 *
 * It does not assert that a stopped spinner is "enough" in the abstract. It asserts the concrete
 * contract this repository chose: the ring is drawn at rest (three sides in the current colour, one
 * open side), it is still a `role=status` with an accessible name, and it survives forced colours,
 * where `border-current` must still resolve to a visible system colour.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
assertUiDistMatchesSource("loop-motion");

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

const known = new Set(Object.values(JSON.parse(readFileSync(join(staticDir, "index.json"), "utf8")).entries).map((e) => e.id));

/** The loops under contract. `find` runs in the page and returns the element that moves. */
const LOOPS = [
  { name: "spinner", story: "foundations-spinner--default", find: `document.querySelector('#storybook-root [role="status"]')`, kind: "ring" },
  { name: "skeleton", story: "foundations-skeleton--default", find: `document.querySelector('#storybook-root [class*="bg-muted"]')`, kind: "block" },
];

function sample(page, loop) {
  return page.evaluate(
    ({ find }) => {
      const el = eval(find);
      if (!el) return { missing: true };
      const cs = getComputedStyle(el);
      const anims = el.getAnimations({ subtree: false }).map((a) => ({
        name: a.animationName ?? null,
        iterations: a.effect.getComputedTiming().iterations,
        state: a.playState,
      }));
      const transparent = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
      return {
        anims,
        animationName: cs.animationName,
        opacity: Number(cs.opacity),
        role: el.getAttribute("role"),
        name: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "",
        borderWidth: cs.borderTopWidth,
        sides: {
          top: !transparent(cs.borderTopColor),
          right: !transparent(cs.borderRightColor),
          bottom: !transparent(cs.borderBottomColor),
          left: !transparent(cs.borderLeftColor),
        },
        ringColor: cs.borderLeftColor,
        topColor: cs.borderTopColor,
        background: cs.backgroundColor,
        width: el.getBoundingClientRect().width,
      };
    },
    { find: loop.find },
  );
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const failures = [];
const lines = [];

for (const mode of [
  { label: "normal", reducedMotion: "no-preference" },
  { label: "reduced", reducedMotion: "reduce" },
  { label: "reduced + dark", reducedMotion: "reduce", colorScheme: "dark" },
  { label: "reduced + forced-colors", reducedMotion: "reduce", forcedColors: "active" },
]) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, reducedMotion: mode.reducedMotion, colorScheme: mode.colorScheme ?? "light", forcedColors: mode.forcedColors ?? "none" });
  const page = await ctx.newPage();
  for (const loop of LOOPS) {
    const where = `${loop.name} [${mode.label}]`;
    if (!known.has(loop.story)) {
      failures.push(`${where}: story ${loop.story} is not in the built index`);
      continue;
    }
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(loop.story)}&viewMode=story&globals=theme:${mode.colorScheme ?? "light"}`, { waitUntil: "load" });
    await page.waitForSelector("#storybook-root *", { timeout: 15000 });
    await page.waitForTimeout(150);
    const s = await sample(page, loop);
    if (s.missing) {
      failures.push(`${where}: the element was not found`);
      continue;
    }
    const running = s.anims.filter((a) => a.iterations === Infinity && a.state === "running");

    if (mode.reducedMotion === "no-preference") {
      if (running.length === 0) failures.push(`${where}: no infinite animation is running. A loading indicator that does not move reads as broken.`);
      else lines.push(`  ${where.padEnd(34)} ${running[0].name} running, infinite`);
      continue;
    }

    // REDUCED — nothing runs, not even a slowed loop (a spinner at 3s is still a continuous rotation)…
    if (s.anims.length > 0 || s.animationName !== "none") {
      failures.push(`${where}: still animating (${JSON.stringify(s.anims)}, animation-name ${s.animationName}). Reduced motion must stop a loop, not shorten it.`);
    }
    // …and the information survives.
    if (loop.kind === "ring") {
      // Forced colours replace every border colour with a system colour, `transparent` included, which
      // would close the ring into a plain circle. The open side is then expressed as `Canvas`, so there
      // "open" means the top differs from the other three rather than being transparent.
      const open = mode.forcedColors ? s.topColor !== s.ringColor : !s.sides.top;
      const drawn = [s.sides.right, s.sides.bottom, s.sides.left].filter(Boolean).length;
      if (!open || drawn !== 3) failures.push(`${where}: the resting ring should have three sides drawn and the top open, got ${JSON.stringify(s.sides)} (top ${s.topColor}, left ${s.ringColor}).`);
      if (s.borderWidth !== "2px") failures.push(`${where}: the ring lost its 2px stroke (${s.borderWidth}).`);
      if (s.role !== "status" || !s.name) failures.push(`${where}: lost its role=status or accessible name (role=${s.role}, name="${s.name}").`);
      if (mode.forcedColors && (s.ringColor === "rgba(0, 0, 0, 0)" || s.ringColor === s.background)) {
        failures.push(`${where}: under forced colours the ring resolves to ${s.ringColor}, which is not a visible system colour.`);
      }
    } else if (s.opacity !== 1 || s.background === "rgba(0, 0, 0, 0)") {
      failures.push(`${where}: the placeholder should rest at full opacity with its fill intact (opacity ${s.opacity}, background ${s.background}).`);
    }
    if (failures.every((f) => !f.startsWith(where))) lines.push(`  ${where.padEnd(34)} stopped; ${loop.kind === "ring" ? `ring at rest (${s.ringColor}), role=${s.role}, name="${s.name}"` : `block at rest, opacity ${s.opacity}`}`);
  }
  await ctx.close();
}
await browser.close();
server.close();

if (failures.length) {
  console.error(`check:loop-motion — ${failures.length} problem(s)\n` + failures.map((f) => "  ✗ " + f).join("\n"));
  process.exit(1);
}
console.log("check:loop-motion — loops run normally and stop, with their information intact, under reduced motion\n" + lines.join("\n"));
