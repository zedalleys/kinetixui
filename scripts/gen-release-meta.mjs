/**
 * gen-release-meta.mjs — which packages actually changed in each release.
 *
 *   node scripts/gen-release-meta.mjs           write apps/web/src/lib/release-packages.json
 *   node scripts/gen-release-meta.mjs --check   fail if that file is stale
 *
 * The three npm packages share one version (a Changesets `fixed` group), so every release bumps
 * all of them — even when a package's only "change" is "No changes in this release" or a bump of
 * its dependency on @kinetixui/tokens. /docs/changelog shows a per-package indicator so users can
 * see where the change really was. This derives it from the Changesets-generated CHANGELOG.md
 * files, so it can't be hand-maintained wrong.
 *
 * A package counts as CHANGED in a version if its section has at least one bullet that is not
 * just "Updated dependencies…" or a bare `@kinetixui/x@1.2.3` dependency line.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const CHECK = process.argv.includes("--check");
const PACKAGES = ["cli", "tokens", "ui"];

const changedIn = {};
for (const pkg of PACKAGES) {
  const text = readFileSync(`${root}/packages/${pkg}/CHANGELOG.md`, "utf8");
  for (const block of text.split(/\n(?=## )/).slice(1)) {
    const version = block.match(/^## (\S+)/)[1];
    const bullets = [...block.matchAll(/^- (?:[0-9a-f]{7}: )?(.*)$/gm)].map((m) => m[1].trim());
    const real = bullets.filter((b) => !/^Updated dependencies/i.test(b) && !/^@kinetixui\/[\w-]+@[\d.]+$/.test(b));
    (changedIn[version] ??= {})[pkg] = real.length > 0;
  }
}

const versions = Object.keys(changedIn).sort((a, b) => {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
});
const out = {};
for (const v of versions) out[v] = Object.fromEntries(PACKAGES.map((p) => [p, Boolean(changedIn[v][p])]));

const text = JSON.stringify({ $generated: "scripts/gen-release-meta.mjs — from packages/*/CHANGELOG.md; do not edit", versions: out }, null, 2) + "\n";
const file = `${root}/apps/web/src/lib/release-packages.json`;
if (CHECK) {
  let current = "";
  try {
    current = readFileSync(file, "utf8");
  } catch {}
  if (current !== text) {
    console.error("  ✗ apps/web/src/lib/release-packages.json is stale — run `node scripts/gen-release-meta.mjs`");
    process.exit(1);
  }
  console.log(`check:release-meta ok — ${versions.length} versions.`);
} else {
  writeFileSync(file, text);
  console.log(`gen:release-meta — ${versions.length} versions`);
}
