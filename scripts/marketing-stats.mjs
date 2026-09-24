/**
 * marketing-stats.mjs — the numbers marketing is allowed to use, read from source.
 *
 *   pnpm marketing:stats
 *   pnpm marketing:stats --json
 *
 * Every platform count, coverage figure and version in a post, a landing page or
 * a release note should come from here rather than from memory or from an older
 * document. The whole positioning is "we verify our claims"; quoting a stale
 * number in a post that argues for verification is the worst available own goal.
 *
 * Prints only what the repository can prove. Publication state is checked over
 * the network when possible, and reported as unknown when not — never guessed.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const JSON_OUT = process.argv.includes("--json");

const manifest = read("components.manifest.json");
const parity = read("platform-parity.json");
const blocks = read("block-parity.json");
const ui = read("packages/ui/package.json");

const defs = manifest.platformDefinitions;
const componentTotal = Object.keys(manifest.components).length;
const catalogPlatforms = parity.catalogPlatforms;
const fullCoverage = Object.values(parity.components).filter((ps) => catalogPlatforms.every((p) => ps.includes(p))).length;
const exceptions = componentTotal - fullCoverage;

/**
 * Ask npm. Three outcomes, kept distinct on purpose: a version string, "unpublished" (npm answered 404), or
 * "unknown" (we could not ask). Collapsing the last two into "not published" is how a real package gets
 * described as unavailable — which is the same class of false claim this script exists to prevent.
 *
 * Runs through a shell so the Windows npm.cmd shim resolves. The package names are hard-coded constants a
 * few lines below, never user input, so there is nothing here to escape.
 */
function publishedVersion(pkg) {
  try {
    const out = execSync(`npm view ${pkg} version`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    const v = out.trim().split(String.fromCharCode(10)).pop().trim();
    return /^\d+\.\d+\.\d+/.test(v) ? v : "unknown";
  } catch (err) {
    const text = String(err.stderr ?? err.message ?? "");
    return /E404|404 Not Found/.test(text) ? "unpublished" : "unknown";
  }
}

const packages = ["@kinetixui/ui", "@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/angular"];
const publication = Object.fromEntries(packages.map((p) => [p, publishedVersion(p)]));

/** Component LIFECYCLE — is each component's API settled? Not verification, and not package maturity. */
const status = read("component-status.json").status;
const lifecycle = Object.values(status).reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
for (const level of ["stable", "beta", "deprecated"]) lifecycle[level] ??= 0;

const stats = {
  version: ui.version,
  license: ui.license,
  componentTotal,
  lifecycle,
  platforms: Object.fromEntries(
    Object.entries(defs).map(([name, d]) => [
      name,
      {
        label: d.label,
        family: d.family,
        // PACKAGE maturity — a product decision. Not the same claim as verification below, and a campaign
        // that prints one where it means the other is exactly the drift this script exists to prevent.
        packageMaturity: d.maturity,
        catalogComplete: d.catalogComplete,
        components: parity.coverage[name],
        published: d.distribution?.published ?? false,
        /** The weakest verification level in this platform's catalogue — a floor, never an average. */
        catalogueVerification: parity.catalogueVerification?.[name] ?? null,
        /** How many components hold each evidence kind. Always a fraction of `components`, never a tick. */
        evidence: parity.evidenceCounts?.[name] ?? {},
      },
    ]),
  ),
  catalogPlatforms,
  fullCoverage,
  documentedExceptions: exceptions,
  blocks: { total: blocks.total, coverage: blocks.coverage },
  publication,
};

if (JSON_OUT) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  console.log(`\nKinetixUI — verified numbers (v${stats.version}, ${stats.license})\n`);
  console.log(`Components: ${componentTotal}`);
  console.log(
    `  lifecycle: ${lifecycle.stable} stable, ${lifecycle.beta} beta, ${lifecycle.deprecated} deprecated` +
      `  (is the API settled — not the same question as verification below)`,
  );
  for (const [name, p] of Object.entries(stats.platforms)) {
    const tag = p.packageMaturity === "stable" ? "" : `  [package ${p.packageMaturity}]`;
    console.log(`  ${p.label.padEnd(16)} ${String(p.components).padStart(3)} / ${componentTotal}  (${p.family})${tag}`);
  }
  // Availability and verification are different claims. Marketing may say "KinetixUI verifies platform
  // coverage against source"; it may NOT say "every implementation is fully verified".
  console.log("\nPackage maturity vs. catalogue verification (never the same sentence):");
  for (const [, p] of Object.entries(stats.platforms)) {
    console.log(
      `  ${p.label.padEnd(16)} package ${String(p.packageMaturity).padEnd(13)} verification ${String(p.catalogueVerification ?? "-").padEnd(13)}` +
        `${p.published ? "published" : "NOT PUBLISHED"}`,
    );
  }
  console.log("\nEvidence, as fractions of each platform's implementations — a partial count is not a tick:");
  for (const [, p] of Object.entries(stats.platforms)) {
    const line = Object.entries(p.evidence)
      .map(([k, n]) => `${k} ${n}/${p.components}`)
      .join("  ");
    console.log(`  ${p.label.padEnd(16)} ${line}`);
  }
  console.log(`\n${fullCoverage} of ${componentTotal} on all ${catalogPlatforms.length} complete-catalogue platforms (${catalogPlatforms.join(", ")})`);
  console.log(`${exceptions} documented exceptions\n`);
  console.log(`Blocks: ${blocks.total}`);
  for (const [name, n] of Object.entries(blocks.coverage)) console.log(`  ${name.padEnd(16)} ${String(n).padStart(3)} / ${blocks.total}`);
  console.log("\nPublished on npm:");
  for (const [pkg, v] of Object.entries(publication)) {
    const note = v === "unpublished" ? "NOT PUBLISHED — never show an install command for this" : v === "unknown" ? "could not check — verify before claiming anything" : v;
    console.log(`  ${pkg.padEnd(22)} ${note}`);
  }
  console.log("\nAny number not printed above needs a source before it goes in a post.\n");
}
