/**
 * check-releases.mjs — /docs/changelog must not fall behind the packages.
 *
 *   node scripts/check-releases.mjs
 *
 * apps/web/src/lib/releases.ts is hand-curated, and it silently stopped at 0.6.0 while the
 * packages went on to 0.17.0 (the page even called 0.6.0 "Latest"). This makes that impossible:
 *
 *   - the three published packages share one version
 *   - the top entry in RELEASES is that version
 *   - every version in the package changelogs has an entry (no gaps)
 *   - versions are strictly descending and dates ISO and non-increasing
 *   - every entry after 0.6.0 states `breaking` explicitly (`[]` = none), so "none" is a claim
 *     someone made, not the absence of one
 *   - every newComponents slug is a real component in components.manifest.json
 *   - release-packages.json (which packages changed) is generated, so it must be current
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const json = (p) => JSON.parse(read(p));
const cmp = (a, b) => {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
const errors = [];

// 1. one version across the packages
const versions = Object.fromEntries(["cli", "tokens", "ui"].map((p) => [p, json(`packages/${p}/package.json`).version]));
if (new Set(Object.values(versions)).size !== 1) errors.push(`packages are not on one version: ${JSON.stringify(versions)}`);
const latest = versions.ui;

// parse the entries out of releases.ts
const src = read("apps/web/src/lib/releases.ts");
const body = src.slice(src.indexOf("export const RELEASES"));
const blocks = body.split(/\n  \{\n    version: "/).slice(1).map((b) => `    version: "${b}`);
const entries = blocks.map((b) => ({
  version: b.match(/version: "(\d+\.\d+\.\d+)"/)?.[1],
  date: b.match(/date: "([^"]+)"/)?.[1],
  hasBreaking: /\n    breaking:/.test(b),
  slugs: [...(b.match(/newComponents:[\s\S]*?\n    \],/)?.[0] ?? "").matchAll(/"([a-z][a-z0-9-]*)"/g)].map((m) => m[1]).filter((s) => s !== "group"),
}));
if (entries.length < 5 || entries.some((e) => !e.version || !e.date)) errors.push("could not parse RELEASES in apps/web/src/lib/releases.ts");

// 2. top entry is the published version
if (entries[0]?.version !== latest) errors.push(`top RELEASES entry is ${entries[0]?.version}, but the packages are at ${latest} — add an entry for ${latest}`);

// 3. no gaps against the package changelogs
const inChangelog = new Set();
for (const p of ["cli", "tokens", "ui"]) for (const m of read(`packages/${p}/CHANGELOG.md`).matchAll(/^## (\d+\.\d+\.\d+)$/gm)) inChangelog.add(m[1]);
const have = new Set(entries.map((e) => e.version));
const missing = [...inChangelog].filter((v) => !have.has(v) && cmp(v, "0.6.0") > 0).sort(cmp);
if (missing.length) errors.push(`versions in the package changelogs with no RELEASES entry: ${missing.join(", ")}`);

// 4. ordering and dates
for (let i = 1; i < entries.length; i++) {
  const [prev, cur] = [entries[i - 1], entries[i]];
  if (cmp(prev.version, cur.version) <= 0) errors.push(`versions not strictly descending: ${prev.version} then ${cur.version}`);
  if (prev.date < cur.date) errors.push(`${prev.version} (${prev.date}) is dated before ${cur.version} (${cur.date})`);
}
for (const e of entries) if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? "")) errors.push(`${e.version}: date "${e.date}" is not YYYY-MM-DD`);

// 5. breaking is explicit after 0.6.0
for (const e of entries) if (cmp(e.version ?? "0.0.0", "0.6.0") > 0 && !e.hasBreaking) errors.push(`${e.version}: missing \`breaking\` (use [] for none)`);

// 6. component slugs are real
const known = new Set(Object.keys(json("components.manifest.json").components));
for (const e of entries) for (const s of e.slugs) if (!known.has(s)) errors.push(`${e.version}: newComponents slug "${s}" is not in components.manifest.json`);

// 7. generated package indicators are current
const gen = spawnSync(process.execPath, [`${root}/scripts/gen-release-meta.mjs`, "--check"], { encoding: "utf8" });
if (gen.status !== 0) errors.push((gen.stderr || gen.stdout).trim());

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:releases failed (${errors.length}).`);
  process.exit(1);
}
console.log(`check:releases ok — ${entries.length} entries, latest ${latest}.`);
