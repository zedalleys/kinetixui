/**
 * gen-manifest.mjs — derive component-status.json and platform-parity.json
 * from components.manifest.json, the single source of truth for per-component
 * metadata. Those two files stay as generated, committed output so the web app
 * (apps/web/src/lib/*.ts) and the registry scripts keep reading the shapes
 * they already know.
 *
 *   node scripts/gen-manifest.mjs           write both files
 *   node scripts/gen-manifest.mjs --check   fail if the manifest is invalid or
 *                                           the generated files are stale
 *
 * Validates that the manifest lists exactly the `registry:ui` components in
 * registry/registry.json, (plus `registry: false` docs-page companions), each with an allowed status and a platform list that
 * includes React and only known platforms.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const CHECK = process.argv.includes("--check");

const manifest = read("components.manifest.json");
const registry = read("registry/registry.json");
const STATUSES = new Set(["beta", "stable", "deprecated"]);
const known = new Set(manifest.platforms);

const slugs = registry.items.filter((i) => i.type === "registry:ui").map((i) => i.name);
const errors = [];
for (const s of slugs) if (!(s in manifest.components)) errors.push(`${s}: missing from components.manifest.json`);
for (const [s, c] of Object.entries(manifest.components)) {
  if (c.registry === false) {
    if (slugs.includes(s)) errors.push(`${s}: marked registry:false but is a registry item`);
  } else if (!slugs.includes(s)) errors.push(`${s}: in manifest but not a registry component (set registry:false for a docs-only companion)`);
  if (!STATUSES.has(c.status)) errors.push(`${s}: invalid status "${c.status}"`);
  if (!/^\d+\.\d+\.\d+$/.test(c.since ?? "")) errors.push(`${s}: since must be a semver like "0.4.1" (the release it first shipped in)`);
  if (!Array.isArray(c.platforms) || !c.platforms.includes("React")) errors.push(`${s}: platforms must be a list including React`);
  else for (const p of c.platforms) if (!known.has(p)) errors.push(`${s}: unknown platform "${p}"`);
  const partial = c.platforms.length < manifest.platforms.length;
  if (partial && !c.platformNote) errors.push(`${s}: not on every platform — add a platformNote saying why`);
}
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

const entries = Object.entries(manifest.components).sort(([a], [b]) => a.localeCompare(b));
const GENERATED = "GENERATED from components.manifest.json by `pnpm gen:manifest` — edit the manifest, not this file.";

const status = {
  $schema: "https://kinetixui.com/schema/component-status.json",
  $description: `slug → lifecycle status ("beta" | "stable" | "deprecated"), one entry per component. ${GENERATED} Consumed by apps/web/src/lib/component-status.ts and scripts/gen-registry-index.mjs (which omits "stable").`,
  status: Object.fromEntries(entries.map(([s, c]) => [s, c.status])),
};

const exceptions = Object.fromEntries(
  entries.filter(([, c]) => c.platforms.length < manifest.platforms.length).map(([s, c]) => [s, c.platforms]),
);
const parity = {
  $schema: "https://kinetixui.com/schema/platform-parity.json",
  $description: `Which platforms carry each component; \`exceptions\` lists only those not on all four (an absent slug is on all four). ${GENERATED} Consumed by apps/web/src/lib/platform-parity.ts and scripts/gen-registry-index.mjs.`,
  platforms: manifest.platforms,
  nativePlatforms: manifest.nativePlatforms,
  platformAbbr: manifest.platformAbbr,
  exceptions,
  notes: Object.fromEntries(entries.filter(([, c]) => c.platformNote).map(([s, c]) => [s, c.platformNote])),
};

let stale = false;
for (const [file, data] of [["component-status.json", status], ["platform-parity.json", parity]]) {
  const out = JSON.stringify(data, null, 2) + "\n";
  if (CHECK) {
    if (readFileSync(`${root}/${file}`, "utf8") !== out) {
      console.error(`  ✗ ${file} is stale — run \`pnpm gen:manifest\``);
      stale = true;
    }
  } else writeFileSync(`${root}/${file}`, out);
}
if (stale) process.exit(1);
console.log(`${CHECK ? "check:manifest ok" : "gen:manifest"} — ${entries.length} components, ${Object.keys(exceptions).length} platform exceptions.`);
