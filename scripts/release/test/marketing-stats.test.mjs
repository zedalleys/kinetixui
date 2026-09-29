/**
 * The marketing numbers must cover every package the release pipeline can publish.
 *
 * `scripts/marketing-stats.mjs` used to carry a four-name array. `@kinetixui/iot` was published and the
 * script kept reporting four packages — the tool whose entire job is preventing stale marketing numbers
 * was itself stale, silently, for as long as nobody re-read it. A hardcoded list cannot fail; it can only
 * be wrong, so the fix was to derive the list and the guard is that the derivation stays tied to the
 * release allowlist.
 *
 * It lives with the release tests because the contract it checks is the release allowlist's, and because
 * `pnpm test:release` is what CI runs as "Test (release tooling)" — a guard in a suite nobody runs is not
 * a guard. Nothing here touches the network: `releasePackages()` is the pure half of that module, split
 * out from the `npm view` half precisely so this can import it.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { releasePackages } from "../../marketing-stats.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const allowlist = JSON.parse(readFileSync(path.join(root, "release/publish-packages.json"), "utf8"));
const source = readFileSync(path.join(root, "scripts/marketing-stats.mjs"), "utf8");

describe("marketing stats cover every publishable package", () => {
  it("reports exactly the allowlist's packages, in its order", () => {
    assert.deepEqual(
      releasePackages().map((p) => p.name),
      allowlist.packages.map((p) => p.name),
      "marketing:stats and release/publish-packages.json disagree about which packages exist. Add the " +
        "package to the allowlist and both follow; never list it in the stats script.",
    );
  });

  it("covers more than one release cohort, so a single-cohort assumption cannot creep back", () => {
    const cohorts = new Set(releasePackages().map((p) => p.cohort));
    assert.ok(
      cohorts.size > 1,
      `expected several release cohorts, got ${[...cohorts].join(", ")} — if this ever shrinks to one, the ` +
        `"there is no single product version" wording in the stats output needs revisiting`,
    );
  });

  it("carries each package's real workspace version and licence", () => {
    for (const pkg of releasePackages()) {
      const manifest = JSON.parse(readFileSync(path.join(root, pkg.directory, "package.json"), "utf8"));
      assert.equal(pkg.version, manifest.version, `${pkg.name}: reported version is not the manifest's`);
      assert.equal(pkg.license, manifest.license, `${pkg.name}: reported licence is not the manifest's`);
      assert.match(pkg.version, /^\d+\.\d+\.\d+/, `${pkg.name}: version is not a version`);
    }
  });

  /**
   * The specific regression, asserted on the source text rather than the behaviour.
   *
   * The behavioural tests above would pass a script that derived the list and then, say, filtered it
   * against a hardcoded set. This makes the *shape* of the old bug fail: no package name may be written
   * out as a literal in this script at all.
   */
  it("hardcodes no package name", () => {
    // Comments are stripped first: the doc comment explains the bug by naming the package that hit it,
    // and a guard that cannot tell an explanation from the thing it warns against is the reason
    // `marketing-claims.test.ts` had to stop pointing phrase rules at documents about bad phrases.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const literals = code.match(/["'`]@kinetixui\/[a-z-]+["'`]/g) ?? [];
    assert.deepEqual(
      literals,
      [],
      `scripts/marketing-stats.mjs names ${literals.join(", ")} as a literal. Package identity belongs to ` +
        `release/publish-packages.json; a name written here is a second list that will drift from it.`,
    );
  });

  it("does not reach the network when only the package list is wanted", () => {
    // `releasePackages` is called above; if it shelled out to npm this suite would be slow and
    // offline-fragile. Assert the split directly so the two halves are not re-merged later.
    const fn = releasePackages.toString();
    assert.ok(!/execSync|fetch\(/.test(fn), "releasePackages() must stay pure — the npm lookup is publishedVersion()");
  });
});
