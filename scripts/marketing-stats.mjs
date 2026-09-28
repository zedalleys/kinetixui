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
 *
 * ## Why the package list is derived
 *
 * It used to be a four-name array written out here. `@kinetixui/iot` was published
 * and this script kept printing four packages — the anti-drift tool drifting, which
 * is the one failure it cannot afford. The list now comes from
 * `release/publish-packages.json`, the same file the release pipeline publishes
 * from, so a package that can be published is a package this reports on. There is
 * no second registry of package names, and adding one would recreate the bug.
 *
 * `scripts/release/test/marketing-stats.test.mjs` fails if the two ever diverge.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(path.join(root, p), "utf8"));

/**
 * The publishable packages, from the release allowlist.
 *
 * Exported so the test can compare it against the allowlist without running the
 * network half of this script.
 */
export function releasePackages(rootDir = root) {
  const allowlist = JSON.parse(readFileSync(path.join(rootDir, "release/publish-packages.json"), "utf8"));
  return allowlist.packages.map((p) => {
    const manifest = JSON.parse(readFileSync(path.join(rootDir, p.directory, "package.json"), "utf8"));
    return {
      name: p.name,
      cohort: p.releaseGroup,
      directory: p.directory,
      /** What the workspace says it is, which is what the next release would publish. */
      version: manifest.version,
      license: manifest.license,
    };
  });
}

/**
 * Ask npm. Three outcomes, kept distinct on purpose: a version string, "unpublished" (npm answered 404), or
 * "unknown" (we could not ask). Collapsing the last two into "not published" is how a real package gets
 * described as unavailable — which is the same class of false claim this script exists to prevent.
 *
 * Runs through a shell so the Windows npm.cmd shim resolves. The package names come from the release
 * allowlist, a repository file, never from user input, so there is nothing here to escape.
 */
export function publishedVersion(pkg) {
  try {
    const out = execSync(`npm view ${pkg} version`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    const v = out.trim().split(String.fromCharCode(10)).pop().trim();
    return /^\d+\.\d+\.\d+/.test(v) ? v : "unknown";
  } catch (err) {
    const text = String(err.stderr ?? err.message ?? "");
    return /E404|404 Not Found/.test(text) ? "unpublished" : "unknown";
  }
}

const manifest = read("components.manifest.json");
const parity = read("platform-parity.json");
const blocks = read("block-parity.json");

const defs = manifest.platformDefinitions;
const componentTotal = Object.keys(manifest.components).length;
const catalogPlatforms = parity.catalogPlatforms;
const fullCoverage = Object.values(parity.components).filter((ps) => catalogPlatforms.every((p) => ps.includes(p))).length;
const exceptions = componentTotal - fullCoverage;

/**
 * Catalogue entries that the manifest itself says are not components.
 *
 * `combobox` carries `"not a component — a documented composition of Command"`. Counting it as a
 * component overstates the catalogue by one, on a project whose pitch is that it does not overstate.
 * Derived from the note rather than named here, so a second recipe is handled without an edit.
 */
const recipes = Object.entries(manifest.components).filter(([, c]) => /not a component/i.test(c.platformNote ?? "")).map(([slug]) => slug);

/** Component LIFECYCLE — is each component's API settled? Not verification, and not package maturity. */
const status = read("component-status.json").status;
const lifecycle = Object.values(status).reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
for (const level of ["stable", "beta", "deprecated"]) lifecycle[level] ??= 0;

const packages = releasePackages();
const publication = Object.fromEntries(packages.map((p) => [p.name, publishedVersion(p.name)]));

const stats = {
  /** Per package, because there is no longer one product version: three cohorts move independently. */
  packages,
  cohorts: [...new Set(packages.map((p) => p.cohort))],
  componentTotal,
  componentsExcludingRecipes: componentTotal - recipes.length,
  recipes,
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
        channel: d.distribution?.channel ?? null,
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

const JSON_OUT = process.argv.includes("--json");

if (JSON_OUT) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  const licenses = [...new Set(packages.map((p) => p.license))];
  console.log(`\nKinetixUI — verified numbers (${licenses.length === 1 ? licenses[0] : licenses.join(" / ")})\n`);
  console.log("There is no single product version. Each cohort releases on its own line:");
  for (const p of packages) {
    console.log(`  ${p.name.padEnd(22)} ${String(p.version).padEnd(10)} cohort ${p.cohort}`);
  }
  console.log(`\nComponents: ${componentTotal} catalogue entries`);
  if (recipes.length > 0) {
    console.log(
      `  ${componentTotal - recipes.length} components + ${recipes.length} documented recipe${recipes.length === 1 ? "" : "s"} ` +
        `(${recipes.join(", ")}) — the manifest says these are not components, so "${componentTotal} components" overstates by ${recipes.length}`,
    );
  }
  console.log(
    `  lifecycle: ${lifecycle.stable} stable, ${lifecycle.beta} beta, ${lifecycle.deprecated} deprecated` +
      `  (is the API settled — not the same question as verification below)`,
  );
  for (const [, p] of Object.entries(stats.platforms)) {
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
  // Maturity says nothing about whether anyone can install it, and every native port is "stable" and
  // undistributed. A campaign sentence that names platforms has to carry this line's answer too.
  console.log("\nInstallable today versus source you compile — NOT the same as maturity above:");
  for (const [, p] of Object.entries(stats.platforms)) {
    console.log(
      `  ${p.label.padEnd(16)} ${p.published ? "installable" : "SOURCE ONLY "}  via ${p.channel ?? "-"}` +
        `${p.published ? "" : "  — never show an install command for this"}`,
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
  console.log("\nOn the npm registry now (asked, not assumed):");
  for (const [pkg, v] of Object.entries(publication)) {
    const declared = packages.find((p) => p.name === pkg)?.version;
    const note =
      v === "unpublished"
        ? "NOT PUBLISHED — never show an install command for this"
        : v === "unknown"
          ? "could not check — verify before claiming anything"
          : v === declared
            ? `${v}`
            : `${v}  (workspace is at ${declared} — a release is pending)`;
    console.log(`  ${pkg.padEnd(22)} ${note}`);
  }
  console.log("\nAny number not printed above needs a source before it goes in a post.\n");
}
