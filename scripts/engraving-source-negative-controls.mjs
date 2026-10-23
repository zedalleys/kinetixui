/**
 * Source-level negative controls for the two rows that cannot be controlled from the built output.
 *
 * `tree` and `leak` assert things about markup, and `next start` serves this route's markup from a
 * prerendered payload that no built-file edit reached (measured: index.html, index.rsc and the one server
 * chunk that renders the footer, each alone and together, on a verified-fresh server). So these two
 * controls break the source and rebuild, which is slower but unambiguous.
 *
 * Each control: patch the source, `pnpm build:web`, serve, run the gate, require the named row to fail,
 * restore the source. A final rebuild leaves the tree and the build as they were.
 *
 * Seven rebuilds for three passes, so this is **on demand only** — never in CI, and not part of
 * `check:engraving-controls`. Run it when `site-footer.tsx`'s decorative markup or the gate's `tree` or
 * `leak` rows change, and record its output on the pull request that changed them.
 *
 *   node scripts/engraving-source-negative-controls.mjs [--repeat N]
 *
 * Nothing may be listening on 127.0.0.1:3000 when it starts; it refuses to run rather than measure a
 * server it did not build.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const B = "http://127.0.0.1:3000";
const FOOTER = `${ROOT}/apps/web/src/components/site-footer.tsx`;
const CHARTS = `${ROOT}/apps/web/src/app/charts/page.tsx`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

let srv = null;
const ready = async () => {
  try {
    return (await fetch(`${B}/`, { signal: AbortSignal.timeout(3000) })).status === 200;
  } catch {
    return false;
  }
};
const answering = async () => {
  try {
    await fetch(`${B}/`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};
async function start() {
  srv = spawn("pnpm", ["--filter", "@kinetixui/web", "start"], { cwd: ROOT, detached: true, stdio: "ignore" });
  for (let i = 0; i < 120; i++) {
    if (await ready()) return true;
    await sleep(1000);
  }
  return false;
}
async function stop() {
  if (srv) {
    try {
      process.kill(-srv.pid, "SIGTERM");
    } catch {}
    srv = null;
  }
  for (let i = 0; i < 40 && (await answering()); i++) await sleep(500);
}
function build() {
  const t = Date.now();
  execFileSync("pnpm", ["build:web"], { cwd: ROOT, stdio: "ignore", timeout: 1_800_000 });
  return Math.round((Date.now() - t) / 1000);
}
function gate() {
  try {
    const out = execFileSync("node", ["scripts/engraving-visual.mjs", "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 900_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, failures: JSON.parse(out.slice(0, out.lastIndexOf("}") + 1)).failures };
  } catch (e) {
    const out = (e.stdout ?? "").toString();
    try {
      return { code: e.status ?? -1, failures: JSON.parse(out.slice(0, out.lastIndexOf("}") + 1)).failures };
    } catch {
      return { code: e.status ?? -1, failures: null, error: (e.stderr ?? e.message ?? "").toString().slice(0, 300) };
    }
  }
}

const CONTROLS = [
  {
    id: "tree-exposed (source)",
    row: "tree",
    file: FOOTER,
    what: "drop aria-hidden from the decorative plate's wrapper",
    mutate: (s) => s.replace("      <div\n        aria-hidden\n", "      <div\n"),
    expect: "in the accessibility tree",
  },
  {
    id: "leak-charts (source)",
    row: "leak",
    file: CHARTS,
    what: "print the charts page on the sheet",
    mutate: (s) => s.replace('<div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">', '<div className="kx-paper mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">'),
    expect: "leaked onto",
  },
];

if (await answering()) {
  console.log("a server is already on 3000; refusing to run");
  process.exit(2);
}

const repeats = process.argv.includes("--repeat") ? Number(process.argv[process.argv.indexOf("--repeat") + 1]) : 1;
for (let pass = 1; pass <= repeats; pass++)
for (const c of CONTROLS) {
  const original = readFileSync(c.file, "utf8");
  const originalSha = sha(c.file);
  const mutated = c.mutate(original);
  if (mutated === original) {
    console.log(`${c.id}\tMUTATION-NO-OP`);
    continue;
  }
  writeFileSync(c.file, mutated);
  let line;
  try {
    const secs = build();
    if (!(await start())) throw new Error("server would not start");
    const r = gate();
    const hit = (r.failures ?? []).filter((f) => f.startsWith(`${c.row}:`) && f.includes(c.expect));
    const collateral = [...new Set((r.failures ?? []).map((f) => f.split(":")[0]))].filter((x) => x !== c.row);
    line = `${c.id}\t${!r.failures ? "GATE-DID-NOT-REPORT" : hit.length ? "detected" : "MISSED"}\tbuild=${secs}s\texit=${r.code}\tfailures=${r.failures?.length ?? "?"}\tcollateral=${collateral.join(",") || "none"}`;
    if (hit.length) line += `\n   ${hit.join("\n   ")}`;
  } catch (e) {
    line = `${c.id}\tERROR\t${e.message.slice(0, 200)}`;
  } finally {
    await stop();
    writeFileSync(c.file, original);
  }
  console.log(`pass${pass}\t` + line, `\trestored=${sha(c.file) === originalSha}`);
}

console.log(`restoring the build from clean source: ${build()}s`);
