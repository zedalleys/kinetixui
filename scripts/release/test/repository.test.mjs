/**
 * The other files prove the rules; this one proves this repository obeys them, against the real
 * manifests and the real tag history rather than fixtures. No network, so it runs on any pull
 * request.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateAllowlist } from "../contract.mjs";
import { buildPlan } from "../plan.mjs";
import { releaseTagName } from "../tags.mjs";
import { discoverWorkspace } from "../workspace.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (relative) => JSON.parse(readFileSync(`${root}${relative}`, "utf8"));

const allowlistFile = read("release/publish-packages.json");
const rootManifest = read("package.json");
const rootScriptNames = Object.keys(rootManifest.scripts);
const packages = discoverWorkspace(root);
const planIt = () => buildPlan({ allowlistFile, packages, rootScriptNames });

describe("this repository's publish allowlist", () => {
  it("is the three packages that are actually on npm", () => {
    const { packages: allowed, errors } = validateAllowlist(allowlistFile, rootScriptNames);
    assert.deepEqual(errors, []);
    assert.deepEqual(allowed.map((p) => p.name).sort(), ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
  });

  it("produces a clean plan over the real workspace", () => {
    const plan = planIt();
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.ok, true);
  });

  it("puts every workspace package on exactly one side of the line", () => {
    const plan = planIt();
    const accounted = new Set([...plan.publish, ...plan.private].map((p) => p.name));
    for (const pkg of packages) assert.ok(accounted.has(pkg.name), `${pkg.name} is neither allowlisted nor private`);
    assert.equal(accounted.size, packages.length);
  });

  it("keeps the published packages on one version", () => {
    assert.equal(new Set(planIt().publish.map((p) => p.version)).size, 1);
  });
});

describe("@kinetixui/angular", () => {
  const angular = packages.find((p) => p.name === "@kinetixui/angular");

  /**
   * This work does not make Angular publishable — that is its own piece of work. What it must do
   * is make it impossible for Angular to reach npm by accident, which `private: true` plus the
   * allowlist does twice over.
   */
  it("is private, which is the mechanism that keeps it off npm", () => {
    assert.ok(angular, "@kinetixui/angular should still be a workspace package");
    assert.equal(angular.manifest.private, true);
  });

  it("is not in the publish allowlist", () => {
    assert.ok(!allowlistFile.packages.map((p) => p.name).includes("@kinetixui/angular"));
  });

  it("never appears in the publish plan", () => {
    const plan = planIt();
    assert.ok(!plan.publish.map((p) => p.name).includes("@kinetixui/angular"));
    assert.ok(plan.private.map((p) => p.name).includes("@kinetixui/angular"));
  });

  it("has not quietly acquired publication metadata", () => {
    assert.equal(angular.manifest.publishConfig, undefined);
  });
});

describe("the release scripts", () => {
  it("are the only release entry points, and none of them publishes by workspace discovery", () => {
    for (const [name, script] of Object.entries(rootManifest.scripts)) {
      if (!name.startsWith("release")) continue;
      assert.doesNotMatch(script, /-r\s+publish|--recursive\s+publish/, `${name} still publishes by workspace discovery`);
    }
    assert.equal(rootManifest.scripts.release, "node scripts/release-publish.mjs");
  });

  it("declares every build the allowlist asks for", () => {
    for (const entry of allowlistFile.packages) {
      for (const script of entry.build) assert.ok(script in rootManifest.scripts, `${entry.name} needs a root "${script}" script`);
    }
  });

  it("ships the deterministic preset the CLI smoke test uses", () => {
    const preset = readFileSync(`${root}release/smoke-preset.txt`, "utf8").trim();
    assert.match(preset, /^KX1_[A-Za-z0-9_-]+$/);
  });
});

/**
 * `releaseTagName` restates what Changesets does rather than importing an internal alias out of a
 * bundled file, so it is checked against the installed implementation — which is the authority, and
 * is present wherever the tests run.
 *
 * It is deliberately not checked against `git tag` alone: `actions/checkout` does not fetch tags at
 * the default depth, so on CI the local tag list is empty. (That is also why the release reads the
 * remote tag list explicitly instead of trusting the local one.) The history check below therefore
 * only runs where history is available.
 */
describe("release tag names", () => {
  it("matches what the installed Changesets builds a tag from", () => {
    const require = createRequire(`${root}package.json`);
    const dist = path.join(path.dirname(require.resolve("@changesets/cli/package.json")), "dist");
    const sources = readdirSync(dist)
      .filter((name) => name.endsWith(".mjs"))
      .map((name) => readFileSync(path.join(dist, name), "utf8"));
    const buildGitTag = sources.find((source) => source.includes("function buildGitTag"));

    assert.ok(
      buildGitTag,
      "could not find buildGitTag in the installed @changesets/cli — re-verify releaseTagName against it",
    );
    // `tool.type !== "root" ? `${name}@${version}` : `v${version}`` — this is a pnpm workspace, so
    // the first branch is the one that applies.
    assert.match(
      buildGitTag,
      /\$\{name\}@\$\{version\}/,
      "Changesets no longer builds a tag as `${name}@${version}` — re-verify releaseTagName",
    );
    assert.equal(releaseTagName("@kinetixui/ui", "0.24.0"), "@kinetixui/ui@0.24.0");
  });

  const localTags = new Set(
    execFileSync("git", ["tag", "--list"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const kinetixTags = [...localTags].filter((tag) => tag.startsWith("@kinetixui/"));

  it("matches the tags a real release produced, where the checkout has them", { skip: kinetixTags.length === 0 && "shallow checkout: no tags fetched" }, () => {
    // The newest version that has tags, so this keeps working as releases go by.
    const version = kinetixTags
      .map((tag) => tag.slice(tag.lastIndexOf("@") + 1))
      .sort()
      .at(-1);
    for (const name of ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]) {
      assert.ok(localTags.has(releaseTagName(name, version)), `expected the real tag ${releaseTagName(name, version)} to exist`);
    }
  });

  it("has never tagged the private Angular package", () => {
    assert.deepEqual(
      [...localTags].filter((tag) => tag.startsWith("@kinetixui/angular@")),
      [],
      "a private package must never get a release tag",
    );
  });
});
