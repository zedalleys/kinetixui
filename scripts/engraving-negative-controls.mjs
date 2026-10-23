/**
 * Negative controls for `check:engraving`: prove the rendered gate fails on each defect it exists for.
 *
 * Follows scripts/seo-negative-controls.mjs: break ONE thing in the built output the gate reads
 * (apps/web/.next), run the gate, require it to fail with the named message, then restore the file
 * byte-for-byte and verify its SHA-256 before the next control. Nothing in the source tree is touched.
 *
 * Unlike check:seo, this gate reads a rendered page, so a mutated built file only counts if `next start`
 * serves it. Control 0 is a pre-flight that proves exactly that, and the suite refuses to run if it does
 * not hold: without it, every later control could "pass" because the browser never saw the mutation.
 *
 * The suite costs about eleven minutes for one pass, so it is NOT in CI on every pull request. It is
 * `pnpm check:engraving-controls`, to be run when the gate or this harness changes, with its output
 * recorded on the pull request that changed them.
 *
 *   pnpm build:web                       # the gate reads the production build
 *   pnpm check:engraving-controls [--repeat N] [--out results.json]
 *
 * It starts and stops `next start` on 127.0.0.1:3000 itself, or reuses a server already there.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CSS_DIR = join(ROOT, "apps/web/.next/static/css");
const APP = join(ROOT, "apps/web/.next/server/app");
const BASE = "http://127.0.0.1:3000";
const repeats = process.argv.includes("--repeat") ? Number(process.argv[process.argv.indexOf("--repeat") + 1]) : 1;
/** `--out <file>` writes the full per-run record as JSON; without it the table on stdout is the whole report. */
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;

const CHUNKS = join(ROOT, "apps/web/.next/server/chunks");
/* The chunk name is a build hash, so find the chunk that carries the footer's own markup. */
const FOOTER_CHUNK = join(
  CHUNKS,
  readdirSync(CHUNKS).filter((f) => f.endsWith(".js") && readFileSync(join(CHUNKS, f), "utf8").includes('className:"relative -mt-[5vw]'))[0] ?? "",
);
const cssFile = join(
  CSS_DIR,
  readdirSync(CSS_DIR).filter((f) => f.endsWith(".css") && readFileSync(join(CSS_DIR, f), "utf8").includes(".kx-paper"))[0],
);
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

/*
 * The harness owns `next start`, because two controls need it restarted.
 *
 * A mutated stylesheet is served straight from disk — the pre-flight below proves it. A mutated
 * `.next/server/**.js` chunk is not: `next start` requires each chunk once and Node caches the module,
 * so a chunk control only reaches the page if the server boots after the mutation. (The built
 * `.next/server/app/*.html` files are not served for these routes at all — measured, and recorded in the
 * report — so markup controls go through the chunk, not the HTML.)
 */
let server = null;
const up = async () => {
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function startServer() {
  server = spawn("pnpm", ["--filter", "@kinetixui/web", "start"], { cwd: ROOT, detached: true, stdio: ["ignore", "ignore", "ignore"] });
  for (let i = 0; i < 90; i++) {
    if (await up()) return true;
    await sleep(1000);
  }
  return false;
}
async function stopServer() {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
    server = null;
  }
  for (let i = 0; i < 30 && (await up()); i++) await sleep(500);
}

/** Append a rule to the built stylesheet. `!important` where it has to beat the real one. */
const appendCss = (rule) => (s) => s + "\n" + rule + "\n";

const CONTROLS = [
  {
    id: "ships-purged",
    row: "ships",
    what: "delete the .kx-paper rule from the built stylesheet",
    file: cssFile,
    // Deleting only the base rule leaves `.kx-paper::before`, and the row asks `css.includes(".kx-paper")`,
    // so the string would still be there. Renaming the class is the mutation that actually removes it.
    mutate: (s) => s.replaceAll(".kx-paper", ".kx-purged-by-control"),
    expect: "purged from the built stylesheet",
  },
  {
    id: "ships-print-surface",
    row: "ships",
    what: "bring .kx-print-surface back into the bundle",
    file: cssFile,
    mutate: appendCss(".kx-print-surface{color:inherit}"),
    expect: ".kx-print-surface is back",
  },
  {
    id: "paper-inverted",
    row: "paper",
    what: "make the dark sheet darker than the page behind it",
    file: cssFile,
    mutate: appendCss(".dark .kx-paper{background-color:#000!important}"),
    expect: "inverted",
  },
  {
    id: "grain-off",
    row: "grain",
    what: "stop the grain tile painting",
    file: cssFile,
    mutate: appendCss(".kx-paper::before{background-image:none!important}"),
    expect: "the tile is not painting",
  },
  {
    id: "text-contrast",
    row: "text",
    what: "drop a footer link's contrast below AA",
    file: cssFile,
    mutate: appendCss("footer ul a{color:hsl(var(--accent))!important}"),
    expect: "needs 4.5",
  },
  {
    id: "layout-overflow",
    row: "layout",
    what: "let a wide child escape the sheet's clip",
    file: cssFile,
    /*
     * One mutation would not do. `.kx-paper` carries `overflow-hidden`, so a wide child inside the
     * footer is clipped and the page never scrolls sideways — measured: a 1800px <ul> gives
     * scrollWidth - clientWidth = 0. So the regression this row can actually see is the sheet losing
     * its clip while something inside it is wider than the viewport, and the control is that pair.
     */
    mutate: appendCss(".kx-paper{overflow:visible!important}footer ul{min-width:1800px!important}"),
    expect: "of sideways scroll",
  },
  {
    id: "motion-animated",
    row: "motion",
    what: "animate the decorative grain",
    file: cssFile,
    mutate: appendCss("@keyframes kxctl{from{opacity:.2}to{opacity:.3}}.kx-paper::before{animation:kxctl 2s linear infinite!important}"),
    expect: "kxctl",
  },
  {
    id: "parity-changed",
    row: "parity",
    what: "paint the sheet a colour the inline declarations never painted",
    file: cssFile,
    mutate: appendCss(".kx-paper{background-color:#c0392b!important}"),
    expect: "changed the rendering",
  },
  /*
   * `tree` and `leak` are NOT here. Both assert something about markup, and no edit to the built output
   * reaches this route's markup: index.html, index.rsc and the one server chunk that renders the footer
   * were each mutated alone and together, on a verified-fresh server (200 on `/`, one next-server
   * process, the mutation still on disk mid-run), and the served HTML kept the original every time —
   * while a `throw` prepended to that chunk does make the route 500, so the chunk is loaded. Their
   * controls live in source-controls.mjs, which patches the source and rebuilds.
   */
];

function runGate() {
  try {
    const out = execFileSync("node", ["scripts/engraving-visual.mjs", "--json", "--base", BASE], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 900_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, json: JSON.parse(out.slice(0, out.lastIndexOf("}") + 1)) };
  } catch (e) {
    const out = (e.stdout ?? "").toString();
    let json = null;
    try {
      json = JSON.parse(out.slice(0, out.lastIndexOf("}") + 1));
    } catch {}
    return { code: e.status ?? -1, json, error: json ? null : (e.stderr ?? e.message ?? "").toString().slice(0, 400) };
  }
}

/* ── the server ────────────────────────────────────────────────────────────────────────────── */
if (!(await up())) {
  if (!(await startServer())) {
    console.error("could not start `next start` on 3000");
    process.exit(2);
  }
  console.log("started next start on 3000");
} else {
  console.log("using the server already on 3000");
}

/* ── pre-flight: does `next start` serve a mutated built file to the browser? ───────────────── */
const before = readFileSync(cssFile, "utf8");
const beforeSha = sha(cssFile);
writeFileSync(cssFile, before + "\n.kx-preflight-probe{color:#123456}\n");
const served = execFileSync("curl", ["-s", `${BASE}/_next/static/css/${cssFile.split("/").pop()}`], { encoding: "utf8" });
writeFileSync(cssFile, before);
if (sha(cssFile) !== beforeSha) {
  console.error("pre-flight: could not restore the stylesheet byte-for-byte; refusing to run");
  process.exit(2);
}
if (!served.includes("kx-preflight-probe")) {
  console.error("pre-flight FAILED: the running server did not serve the mutated stylesheet, so every control below would be vacuous");
  process.exit(2);
}
console.log("pre-flight ok: the server serves the mutated built stylesheet, and it restored byte-for-byte\n");

/* ── the unmodified tree must pass first, or a control proves nothing ──────────────────────── */
const clean = runGate();
console.log(`clean\texit=${clean.code}\tfailures=${clean.json ? clean.json.failures.length : "unreadable"}`);
if (clean.code !== 0) {
  console.error("the gate does not pass on the unmodified build; fix that before reading any control");
  process.exit(2);
}

/* ── the controls ──────────────────────────────────────────────────────────────────────────── */
const results = [];
for (let pass = 1; pass <= repeats; pass++) {
  for (const c of CONTROLS) {
    const original = readFileSync(c.file, "utf8");
    const originalSha = sha(c.file);
    const mutated = c.mutate(original);
    if (mutated === original) {
      results.push({ pass, ...c, verdict: "MUTATION-NO-OP", detected: false, failures: [] });
      console.log(`pass${pass}\t${c.id}\tMUTATION-NO-OP — the control changed nothing`);
      continue;
    }
    if (c.restart) await stopServer();
    writeFileSync(c.file, mutated);
    if (c.restart && !(await startServer())) {
      writeFileSync(c.file, original);
      await startServer();
      results.push({ pass, id: c.id, row: c.row, verdict: "SERVER-WOULD-NOT-START", failures: [] });
      console.log(`pass${pass}\t${c.id}\tSERVER-WOULD-NOT-START`);
      continue;
    }
    const r = runGate();
    if (c.restart) await stopServer();
    writeFileSync(c.file, original);
    if (c.restart && !(await startServer())) {
      console.error("could not restart the server after restoring; stopping");
      process.exit(2);
    }
    const restored = sha(c.file) === originalSha;

    const failures = r.json ? r.json.failures : [];
    const hit = failures.filter((f) => f.startsWith(`${c.row}:`) && f.includes(c.expect));
    const collateral = [...new Set(failures.map((f) => f.split(":")[0]))].filter((row) => row !== c.row);
    const verdict = !r.json ? "GATE-DID-NOT-REPORT" : hit.length ? "detected" : "MISSED";
    results.push({ pass, id: c.id, row: c.row, what: c.what, verdict, exit: r.code, hit, collateral, failures, restored, error: r.error });
    console.log(
      `pass${pass}\t${c.id}\t${verdict}\texit=${r.code}\tfailures=${failures.length}\tcollateral=${collateral.join(",") || "none"}\trestored=${restored}${r.error ? `\terr=${r.error.split("\n")[0]}` : ""}`,
    );
  }
}

if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2));
await stopServer();

const missed = results.filter((r) => r.verdict !== "detected");
console.log(`\n${results.length - missed.length}/${results.length} control runs detected. ${missed.length ? "NOT RELIABLE YET:" : "All detected."}`);
for (const m of missed) console.log(`  ${m.id} pass${m.pass}: ${m.verdict}`);
process.exit(missed.length ? 1 : 0);
