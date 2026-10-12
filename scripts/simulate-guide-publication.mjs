/**
 * Simulated publication of the guides cluster: what publishing all four guides would change, proved on a real
 * production build, then reverted byte for byte. Nothing here is committed or deployed.
 *
 *   node scripts/simulate-guide-publication.mjs [--date YYYY-MM-DD] [--browser] [--controls] [--a11y] [--json out.json]
 *
 * Steps:
 *   1. read the current build (it must exist and be green): indexable pages, sitemap URLs, guides with
 *      TechArticle, guides in the sitemap, "Further reading" links on docs pages
 *   2. set every guide to `status: "published"` with `datePublished` (--date; the simulation date is a placeholder,
 *      never the real one, and never committed) in apps/web/src/lib/guides-data.ts
 *   3. rebuild the web app, read the same numbers, run check:seo, check:editorial and the guides unit test;
 *      --browser also starts `next start` on :3100 and runs check:seo-browser against it; --a11y runs the a11y-site
 *      sweep on the guides and the docs pages that link them; --controls runs the published-state negative controls
 *   4. restore guides-data.ts, verify its SHA-256, rebuild, and confirm the numbers are back to step 1
 *
 * When the registry is already published (the cluster has gone live), there is nothing to simulate: the script
 * reports the live numbers and exits; run the gates directly instead (marketing/seo/GUIDE-PUBLISH-RUNBOOK.md).
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const has = (flag) => process.argv.includes(flag);
const DATE = arg("--date", "2099-01-01"); // an obviously-not-real date, so a leaked simulation can never pass for real
const jsonOut = arg("--json");

const REGISTRY = resolve("apps/web/src/lib/guides-data.ts");
const APP = resolve("apps/web/.next/server/app");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const run = (cmd, args, opts = {}) => {
  try {
    return { code: 0, out: execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26, ...opts }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};
const log = (s) => console.log(s);

async function guides() {
  // a fresh import each time: the registry file changes between the reads
  return (await import(`${pathToFileURL(REGISTRY).href}?t=${Date.now()}`)).GUIDES;
}

/** The numbers publication is supposed to move, read from the build the gates read. */
async function measure() {
  if (!existsSync(APP)) throw new Error("no build: run `pnpm --filter @kinetixui/web build` first");
  const seo = run("node", ["scripts/check-seo.mjs"]);
  const m = seo.out.match(/(\d+) built pages, (\d+) indexable, (\d+) sitemap URLs/);
  const sitemap = readFileSync(join(APP, "sitemap.xml.body"), "utf8");
  const G = await guides();
  const guideHtml = (slug) => readFileSync(join(APP, "guides", `${slug}.html`), "utf8");
  const furtherReading = ["platforms", "tokens", "accessibility", "installation"].reduce((n, p) => {
    const line = readFileSync(join(APP, "docs", `${p}.html`), "utf8").match(/<p[^>]*data-further-reading[^>]*>[\s\S]*?<\/p>/)?.[0] ?? "";
    return n + [...line.matchAll(/href="\/guides\//g)].length;
  }, 0);
  return {
    built: Number(m?.[1]),
    indexable: Number(m?.[2]),
    sitemapUrls: Number(m?.[3]),
    guidesInSitemap: G.filter((g) => sitemap.includes(`<loc>https://kinetixui.com/guides/${g.slug}</loc>`)).length,
    guidesWithTechArticle: G.filter((g) => guideHtml(g.slug).includes('"@type":"TechArticle"')).length,
    guidesNoindex: G.filter((g) => /<meta name="robots" content="noindex/.test(guideHtml(g.slug))).length,
    furtherReadingLinks: furtherReading,
    statuses: [...new Set(G.map((g) => g.status))].join(","),
  };
}

function gates(label) {
  const results = {
    "check:seo": run("node", ["scripts/check-seo.mjs"]),
    "check:editorial": run("node", ["scripts/check-editorial.mjs"]),
    "guides.test": run("npx", ["vitest", "run", "src/lib/guides.test.ts"], { cwd: resolve("apps/web") }),
  };
  for (const [name, r] of Object.entries(results)) log(`  ${r.code === 0 ? "✓" : "✗"} ${label} ${name}${r.code === 0 ? "" : `\n${r.out.split("\n").slice(-25).join("\n")}`}`);
  return Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.code]));
}

function build(label) {
  log(`… building (${label})`);
  const r = run("pnpm", ["--filter", "@kinetixui/web", "build"]);
  if (r.code !== 0) {
    log(r.out.split("\n").slice(-40).join("\n"));
    throw new Error(`build failed (${label})`);
  }
}

async function withServer(fn) {
  const server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: resolve("apps/web"), stdio: "ignore", detached: true });
  try {
    for (let i = 0; i < 120; i++) {
      const ok = await fetch("http://127.0.0.1:3100/").then((r) => r.ok, () => false);
      if (ok) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    return await fn("http://127.0.0.1:3100");
  } finally {
    try {
      process.kill(-server.pid);
    } catch {}
  }
}

const original = readFileSync(REGISTRY);
const originalSha = sha(REGISTRY);
const G0 = await guides();
if (G0.every((g) => g.status === "published")) {
  log("The guides cluster is already published; there is nothing to simulate. Live numbers:");
  log(JSON.stringify(await measure(), null, 2));
  process.exit(0);
}
if (!G0.every((g) => g.status === "draft")) {
  log("The guides cluster is partly published; fix that first (check:editorial cluster-partial).");
  process.exit(1);
}

const report = { date: DATE, registrySha256: originalSha };
log(`registry ${REGISTRY} sha256 ${originalSha}`);
report.before = await measure();
log(`before: ${JSON.stringify(report.before)}`);

let failed = false;
try {
  const published = original
    .toString("utf8")
    .replaceAll(/\n(\s*)status: "draft",/g, `\n$1status: "published",\n$1datePublished: "${DATE}",`);
  writeFileSync(REGISTRY, published);
  const G1 = await guides();
  if (!G1.every((g) => g.status === "published" && g.datePublished === DATE)) throw new Error("the registry rewrite did not publish all four guides");
  build("simulated publication");
  report.after = await measure();
  log(`after:  ${JSON.stringify(report.after)}`);
  report.gates = gates("published");
  if (has("--browser") || has("--a11y")) {
    await withServer(async (base) => {
      const env = { ...process.env };
      if (has("--browser")) {
        const r = run("node", ["scripts/seo-browser.mjs", "--base", base], { env });
        log(`  ${r.code === 0 ? "✓" : "✗"} published check:seo-browser\n${r.out.split("\n").slice(-8).join("\n")}`);
        report.gates["check:seo-browser"] = r.code;
      }
      if (has("--a11y")) {
        const routes = [...G1.map((g) => `/guides/${g.slug}`), "/docs/platforms", "/docs/tokens", "/docs/accessibility", "/docs/installation"];
        const r = run("node", ["scripts/a11y-site.mjs", "--base", base, ...routes.flatMap((x) => ["--page", x])], { env });
        log(`  ${r.code === 0 ? "✓" : "✗"} published a11y-site (${routes.length} routes)\n${r.out.split("\n").slice(-6).join("\n")}`);
        report.gates["a11y-site"] = r.code;
      }
    });
  }
  if (has("--controls")) {
    const r = run("node", ["scripts/editorial-negative-controls.mjs", "--state", "published"]);
    log(r.out);
    report.gates["negative-controls(published)"] = r.code;
  }
  failed = Object.values(report.gates).some((c) => c !== 0);
} catch (e) {
  failed = true;
  log(`✗ ${e.message}`);
} finally {
  writeFileSync(REGISTRY, original);
  report.restored = sha(REGISTRY) === originalSha;
  log(`restored ${REGISTRY}: sha256 ${report.restored ? "matches" : "MISMATCH"}`);
}

if (!has("--no-rebuild")) {
  build("restored drafts");
  report.restoredMeasure = await measure();
  log(`restored: ${JSON.stringify(report.restoredMeasure)}`);
  report.restoredGates = gates("restored");
  const same = JSON.stringify(report.restoredMeasure) === JSON.stringify(report.before);
  log(`build numbers back to the starting state: ${same ? "yes" : "NO"}`);
  if (!same) failed = true;
  if (Object.values(report.restoredGates).some((c) => c !== 0)) failed = true;
}
if (!report.restored) failed = true;
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
log(failed ? "simulated publication: FAILED" : "simulated publication: all checks pass, state restored");
process.exit(failed ? 1 : 0);
