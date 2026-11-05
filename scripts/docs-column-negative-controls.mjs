/**
 * Negative controls for the docs reading-column contract in `scripts/a11y-site.mjs`.
 *
 * The contract and the `laptop` sweep width both exist because of one defect: with px breakpoints deciding
 * whether the rem-sized rails show, a reader at 200% text got a 128px reading column between two 448px rails
 * at 1280px, and 37px of horizontal page scroll at 1024px. A gate that holds a layout has to be shown failing
 * on the layout it was written for, or it is a comment with a test runner attached.
 *
 * Each control restores ONE piece of the defective behaviour in the source tree, rebuilds the site, runs the
 * sweep over a docs page, and requires the named failure. It then puts back the exact bytes it read before
 * mutating, verifies every file's SHA-256 against the original, rebuilds, and requires the same run to pass.
 * A control the gate does not catch fails this script, and so does a restore that does not come back
 * byte-for-byte.
 *
 * Restoring from bytes rather than from `git checkout --` matters: these are source files someone may be
 * editing. `git checkout` would replace their unstaged work with the index version, and the hash check would
 * then report the mismatch it had just caused. Every mutation is also wrapped in `try/finally`, so a build
 * that fails or a server that never starts cannot leave the defective classes behind.
 *
 * The mutation is a Tailwind class, so it changes both the prerendered markup and the generated stylesheet:
 * every control pays a full `pnpm build:web` (~90s) and a fresh `next start`. There is no cheaper honest
 * version — a mutated `.next` stylesheet is served live, but the class names in the prerendered HTML are not.
 *
 *   node scripts/docs-column-negative-controls.mjs [--port 3101] [--page /docs/components/button]
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = arg("--port", "3101");
const PAGE = arg("--page", "/docs/components/button");
const BASE = `http://127.0.0.1:${PORT}`;

const FILES = [
  "apps/web/src/app/docs/layout.tsx",
  "apps/web/src/components/docs-sidebar.tsx",
  "apps/web/src/components/docs-toc.tsx",
  "apps/web/src/components/mobile-nav.tsx",
];
const sha = (f) => createHash("sha256").update(readFileSync(resolve(f))).digest("hex");
/** The tree exactly as found, bytes and all — the only thing a restore is allowed to put back. */
const ORIGINAL_BYTES = Object.fromEntries(FILES.map((f) => [f, readFileSync(resolve(f))]));
const ORIGINAL = Object.fromEntries(FILES.map((f) => [f, sha(f)]));

const log = (s) => console.log(s);

/**
 * The two halves of the fix, as separate controls. Half one is the breakpoint conversion — the defect the
 * audit found. Half two is the container, which only Codex's review surfaced: three rem columns dividing a
 * flat 1536px container starve the middle one even when all three correctly appear.
 */
const CONTROLS = [
  {
    id: 1,
    name: "restore the px breakpoints (lg-rem/xl-rem -> lg/xl)",
    mutate: (f, s) => (f.endsWith("mobile-nav.tsx") ? s.replace('"lg-rem:hidden"', '"lg:hidden"') : s.replace(/\b(lg|xl)-rem:/g, "$1:")),
    // The defect this is named for: a px query cannot see that the reader enlarged their text, so the rails
    // show at a width that can no longer afford them.
    expect: /scrolls sideways|reading column/,
  },
  {
    id: 2,
    name: "restore the flat container (max-w-[96rem] -> max-w-screen-2xl)",
    mutate: (_f, s) => s.replace("max-w-[96rem]", "max-w-screen-2xl"),
    expect: /reading column/,
  },
];

function build() {
  execFileSync("pnpm", ["build:web"], { stdio: "ignore" });
}

async function withServer(fn) {
  const server = spawn("npx", ["next", "start", "-p", PORT], { cwd: resolve("apps/web"), stdio: "ignore", detached: true });
  try {
    let up = false;
    for (let i = 0; i < 120; i++) {
      // `.ok`, not merely a response: a server that 500s every route would otherwise read as ready and every
      // control after it would be measuring the wrong thing.
      if (await fetch(`${BASE}${PAGE}`).then((r) => r.ok, () => false)) {
        up = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!up) throw new Error(`server never served ${PAGE} on ${BASE}`);
    return await fn();
  } finally {
    try {
      process.kill(-server.pid);
    } catch {}
    for (let i = 0; i < 60; i++) {
      if (!(await fetch(`${BASE}${PAGE}`).then(() => true, () => false))) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

function sweep() {
  try {
    const out = execFileSync("node", ["scripts/a11y-site.mjs", "--base", BASE, "--page", PAGE], { encoding: "utf8" });
    return { passed: true, out };
  } catch (e) {
    return { passed: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function restore() {
  for (const f of FILES) writeFileSync(resolve(f), ORIGINAL_BYTES[f]);
  for (const f of FILES) {
    if (sha(f) !== ORIGINAL[f]) throw new Error(`restore of ${f} did not match its original SHA-256`);
  }
}

// A clean tree has to pass first, or a control's failure proves nothing about the control.
log(`pre-flight: building and sweeping ${PAGE} on a clean tree`);
build();
const pre = await withServer(sweep);
if (!pre.passed) {
  log(pre.out);
  log("FAIL: the clean tree does not pass. Fix that before reading any control below.");
  process.exit(1);
}
log(`  clean tree passes — ${pre.out.trim().split("\n").pop()}`);

const results = [];
for (const c of CONTROLS) {
  log(`control ${c.id}: ${c.name}`);
  let r;
  try {
    for (const f of FILES) {
      const before = readFileSync(resolve(f), "utf8");
      const after = c.mutate(f, before);
      if (after !== before) writeFileSync(resolve(f), after);
    }
    build();
    r = await withServer(sweep);
  } finally {
    // Not only on the happy path: a failed build or a server that never comes up must not leave the
    // deliberately defective classes in someone's working tree.
    restore();
  }
  const caught = !r.passed && c.expect.test(r.out);
  const lines = r.out.split("\n").filter((l) => c.expect.test(l));
  results.push({ id: c.id, name: c.name, caught, findings: lines.length, sample: lines.slice(0, 3) });
  log(`  ${caught ? "DETECTED" : "MISSED"} — ${lines.length} matching finding(s)`);
  for (const l of lines.slice(0, 3)) log(`    ${l.trim()}`);
}

log("\nrebuilding the restored tree and confirming it passes again");
build();
const post = await withServer(sweep);
log(`  restored tree ${post.passed ? "passes" : "FAILS"}`);

const missed = results.filter((r) => !r.caught);
log(`\n${results.length - missed.length}/${results.length} controls detected; restore verified by SHA-256`);
if (missed.length || !post.passed) process.exit(1);
