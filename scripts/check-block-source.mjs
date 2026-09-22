/**
 * check-block-source.mjs — a Block may only advertise a platform it really implements.
 *
 *   node scripts/check-block-source.mjs
 *
 * The component equivalent (check-platform-source.mjs) infers a component's source file from its slug. Blocks
 * deliberately do not: `blocks.manifest.json` writes each path out, because block file naming differs per
 * platform and a fuzzy guess that missed would quietly drop a real implementation — or, worse, match the wrong
 * file and claim one that isn't there. Explicit paths make this check exact rather than heuristic.
 *
 * Verification strength, stated plainly rather than implied:
 *
 *   React    STRUCTURAL — the file exists, carries the markers, and is compiled by the web app's own
 *                         typecheck and tests (the same fixture renders the live preview, so a broken block
 *                         breaks the page).
 *   Angular  STRUCTURAL — same, compiled by ng-packagr, when any block ever declares Angular.
 *   SwiftUI  FILE + CI  — the file exists and carries markers here; it is compiled by native-swiftui.yml.
 *   Compose  FILE + CI  — likewise, by native-compose.yml.
 *   Flutter  FILE + CI  — likewise, by native-flutter.yml.
 *
 * This script does not compile anything. File existence is not compilation, and it never claims otherwise —
 * the native workflows are what prove those sources build.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");

const manifest = JSON.parse(read("blocks.manifest.json"));
const platformDefs = JSON.parse(read("components.manifest.json")).platformDefinitions;
const KNOWN = new Set(Object.keys(platformDefs));
const STATUSES = new Set(["beta", "stable", "deprecated"]);

/** Where a platform's block source is allowed to live, and what it must look like. */
const EXPECTED = {
  React: { dir: "apps/web/src/examples/blocks/", ext: ".tsx" },
  Angular: { dir: "packages/ui-angular/src/examples/blocks/", ext: ".ts" },
  SwiftUI: { dir: "packages/ui-swiftui/Tests/KinetixUITests/Blocks/", ext: ".swift" },
  Compose: { dir: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/blocks/", ext: ".kt" },
  Flutter: { dir: "packages/ui-flutter/test/blocks/", ext: ".dart" },
};

const errors = [];
const slugs = Object.keys(manifest.blocks);
if (slugs.length === 0) errors.push("blocks.manifest.json declares no blocks");

for (const slug of slugs) {
  const b = manifest.blocks[slug];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push(`${slug}: slug must be kebab-case (it is a public URL fragment)`);
  for (const field of ["title", "description", "category"]) if (!b[field]) errors.push(`${slug}: missing "${field}"`);
  if (!STATUSES.has(b.status)) errors.push(`${slug}: invalid status "${b.status}"`);
  if (!b.sources || typeof b.sources !== "object" || Object.keys(b.sources).length === 0) {
    errors.push(`${slug}: needs a "sources" map with at least one real platform implementation`);
    continue;
  }

  for (const [platform, path] of Object.entries(b.sources)) {
    // A platform name is only valid if the ONE authoritative definition site knows it. HTML/CSS and friends
    // are token outputs, not implementation platforms, and cannot sneak in through the block layer either.
    if (!KNOWN.has(platform)) {
      errors.push(`${slug}: unknown platform "${platform}" — valid platforms come from components.manifest.json platformDefinitions (${[...KNOWN].join(", ")})`);
      continue;
    }
    if (!existsSync(`${root}/${path}`)) {
      errors.push(`${slug}: declares ${platform} at ${path}, but that file does not exist`);
      continue;
    }
    const expected = EXPECTED[platform];
    if (!expected) {
      errors.push(`${slug}: ${platform} is a known platform but check-block-source.mjs has no expected location for it — add one before advertising blocks for it`);
      continue;
    }
    if (!path.startsWith(expected.dir)) errors.push(`${slug}: ${platform} source must live under ${expected.dir} (found ${path})`);
    if (!path.endsWith(expected.ext)) errors.push(`${slug}: ${platform} source must be a ${expected.ext} file (found ${path})`);
    const text = read(path);
    if (!text.includes("kx-block:start") || !text.includes("kx-block:end")) {
      errors.push(`${slug}: ${path} has no kx-block:start / kx-block:end markers, so nothing can be extracted from it`);
    }
  }
}

// Source sitting in a block directory that no block claims is either a forgotten manifest entry or a stale
// file left behind by a deleted block. Both are worth failing on: the first hides a real implementation, the
// second leaves dead code that looks live.
for (const [platform, { dir, ext }] of Object.entries(EXPECTED)) {
  if (!existsSync(`${root}/${dir}`)) continue;
  const declared = new Set(slugs.map((s) => manifest.blocks[s].sources[platform]).filter(Boolean));
  for (const file of readdirSync(`${root}/${dir}`).filter((f) => f.endsWith(ext))) {
    if (!declared.has(`${dir}${file}`)) errors.push(`${dir}${file} exists but no block declares it — add it to blocks.manifest.json or delete it`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:block-source failed — ${errors.length} problem(s).`);
  process.exit(1);
}

const counts = Object.keys(platformDefs)
  .map((p) => `${p} ${slugs.filter((s) => manifest.blocks[s].sources[p]).length}`)
  .join(", ");
console.log(`  ${slugs.length} blocks — ${counts}`);
console.log("check:block-source ok — every declared platform is backed by a real source file.");
