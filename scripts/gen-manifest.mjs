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
 * The platform list is NOT declared here or anywhere downstream — it is derived
 * from the manifest's `platformDefinitions`, which carries each platform's
 * family (web/native), label, abbreviation, maturity and whether its catalogue
 * is complete. Adding a platform means editing that one object.
 *
 * Validates that the manifest lists exactly the `registry:ui` components in
 * registry/registry.json (plus `registry: false` docs-page companions), each
 * with an allowed status and a platform list that includes React and only
 * known platforms. Whether the *source* behind each declared platform really
 * exists is a separate check — scripts/check-platform-source.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const CHECK = process.argv.includes("--check");

const manifest = read("components.manifest.json");
const registry = read("registry/registry.json");
const STATUSES = new Set(["beta", "stable", "deprecated"]);
const FAMILIES = new Set(["web", "native"]);

const defs = manifest.platformDefinitions;
const platforms = Object.keys(defs);
const known = new Set(platforms);
const byFamily = (f) => platforms.filter((p) => defs[p].family === f);
/**
 * Platforms whose catalogue is declared complete. Only these carry the "a component missing this platform
 * must say why" rule: a platform still rolling out (Angular) has gaps because it is new, not because anyone
 * decided against porting — calling those "documented exceptions" would be a lie in both directions.
 */
const catalogPlatforms = platforms.filter((p) => defs[p].catalogComplete);

const errors = [];
for (const [p, d] of Object.entries(defs)) {
  if (!FAMILIES.has(d.family)) errors.push(`platformDefinitions.${p}: family must be "web" or "native", not "${d.family}"`);
  for (const k of ["label", "abbr", "package", "dir"]) if (!d[k]) errors.push(`platformDefinitions.${p}: missing "${k}"`);
  if (typeof d.catalogComplete !== "boolean") errors.push(`platformDefinitions.${p}: catalogComplete must be a boolean`);
}

const slugs = registry.items.filter((i) => i.type === "registry:ui").map((i) => i.name);
for (const s of slugs) if (!(s in manifest.components)) errors.push(`${s}: missing from components.manifest.json`);
for (const [s, c] of Object.entries(manifest.components)) {
  if (c.registry === false) {
    if (slugs.includes(s)) errors.push(`${s}: marked registry:false but is a registry item`);
  } else if (!slugs.includes(s)) errors.push(`${s}: in manifest but not a registry component (set registry:false for a docs-only companion)`);
  if (!STATUSES.has(c.status)) errors.push(`${s}: invalid status "${c.status}"`);
  if (!/^\d+\.\d+\.\d+$/.test(c.since ?? "")) errors.push(`${s}: since must be a semver like "0.4.1" (the release it first shipped in)`);
  if (!Array.isArray(c.platforms) || !c.platforms.includes("React")) errors.push(`${s}: platforms must be a list including React`);
  else for (const p of c.platforms) if (!known.has(p)) errors.push(`${s}: unknown platform "${p}" (known: ${platforms.join(", ")})`);
  for (const p of Object.keys(c.platformNotes ?? {})) if (!known.has(p)) errors.push(`${s}: platformNotes has unknown platform "${p}"`);
  // a gap on a complete-catalogue platform is a decision, and a decision has to be written down
  const missing = catalogPlatforms.filter((p) => !c.platforms.includes(p));
  if (missing.length && !c.platformNote && !missing.every((p) => c.platformNotes?.[p])) {
    errors.push(`${s}: not on ${missing.join(", ")} — add a platformNote (or platformNotes per platform) saying why`);
  }
}
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

const entries = Object.entries(manifest.components).sort(([a], [b]) => a.localeCompare(b));
const GENERATED = "GENERATED from components.manifest.json by `pnpm gen:manifest` — edit the manifest, not this file.";
const inOrder = (list) => platforms.filter((p) => list.includes(p));

const status = {
  $schema: "https://kinetixui.com/schema/component-status.json",
  $description: `slug → lifecycle status ("beta" | "stable" | "deprecated"), one entry per component. ${GENERATED} Consumed by apps/web/src/lib/component-status.ts and scripts/gen-registry-index.mjs (which omits "stable").`,
  status: Object.fromEntries(entries.map(([s, c]) => [s, c.status])),
};

const parity = {
  $schema: "https://kinetixui.com/schema/platform-parity.json",
  $description: `Which platforms carry each component. \`components\` is explicit for every slug — there is no "absent means everywhere" rule, so a newly added platform can never be silently claimed for a component that does not have it. ${GENERATED} Consumed by apps/web/src/lib/platform-parity.ts and scripts/gen-registry-index.mjs.`,
  platforms,
  platformDefinitions: defs,
  webPlatforms: byFamily("web"),
  nativePlatforms: byFamily("native"),
  catalogPlatforms,
  platformAbbr: Object.fromEntries(platforms.map((p) => [p, defs[p].abbr])),
  coverage: Object.fromEntries(platforms.map((p) => [p, entries.filter(([, c]) => c.platforms.includes(p)).length])),
  components: Object.fromEntries(entries.map(([s, c]) => [s, inOrder(c.platforms)])),
  notes: Object.fromEntries(entries.filter(([, c]) => c.platformNote).map(([s, c]) => [s, c.platformNote])),
  platformNotes: Object.fromEntries(entries.filter(([, c]) => c.platformNotes).map(([s, c]) => [s, c.platformNotes])),
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
const coverage = platforms.map((p) => `${p} ${parity.coverage[p]}`).join(", ");
const full = entries.filter(([, c]) => catalogPlatforms.every((p) => c.platforms.includes(p))).length;
console.log(
  `${CHECK ? "check:manifest ok" : "gen:manifest"} — ${entries.length} components (${coverage}); ` +
    `${full} on all ${catalogPlatforms.length} complete-catalogue platforms.`,
);
