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
  it("is the core cohort plus the Angular cohort", () => {
    const { packages: allowed, errors } = validateAllowlist(allowlistFile, rootScriptNames);
    assert.deepEqual(errors, []);
    assert.deepEqual(allowed.map((p) => p.name).sort(), ["@kinetixui/angular", "@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
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

  // Version equality is a cohort rule now, not an allowlist-wide one — see "release cohorts in
  // this repository" below. Asserting it across the whole allowlist here would fail the moment
  // Angular versions independently, which is the point of the cohort.
});

describe("@kinetixui/angular", () => {
  const angular = packages.find((p) => p.name === "@kinetixui/angular");
  const entry = allowlistFile.packages.find((p) => p.name === "@kinetixui/angular");

  it("is publication-ready: public, with the metadata npm requires", () => {
    assert.ok(angular, "@kinetixui/angular should be a workspace package");
    assert.notEqual(angular.manifest.private, true);
    assert.deepEqual(angular.manifest.publishConfig, { access: "public", provenance: true });
  });

  it("is allowlisted, in its own release cohort", () => {
    assert.ok(entry, "@kinetixui/angular should be in release/publish-packages.json");
    assert.equal(entry.releaseGroup, "angular");
    assert.notEqual(entry.releaseGroup, "core", "Angular must not share the core cohort's lockstep");
  });

  /** ng-packagr generates the publishable Angular Package Format manifest into `dist/`. */
  it("packs from its built artifact, not its workspace root", () => {
    assert.equal(entry.directory, "packages/ui-angular");
    assert.equal(entry.artifactDirectory, "packages/ui-angular/dist");
    const resolved = planIt().allowlist.find((p) => p.name === "@kinetixui/angular");
    assert.equal(resolved.packDirectory, "packages/ui-angular/dist");
  });

  it("builds before it can be packed", () => {
    assert.ok(entry.build.includes("build:angular"), "the allowlist must build Angular before packing its dist");
    for (const script of entry.build) assert.ok(script in rootManifest.scripts, `root script ${script} must exist`);
  });

  it("requires the files a consumer actually needs", () => {
    for (const file of ["styles.css", "fesm2022/kinetixui-angular.mjs", "types/kinetixui-angular.d.ts"]) {
      assert.ok(entry.requireFiles.includes(file), `requireFiles should name ${file}`);
    }
  });

  /**
   * Publication readiness is not maturity. Angular stays Preview, and its version stays whatever
   * Changesets last set — the transition to 0.24.0 happens in the Version Packages PR, not here.
   */
  it("is still Preview, and still not on npm at this commit", () => {
    const manifest = read("components.manifest.json");
    assert.equal(manifest.platformDefinitions.Angular.maturity, "preview");
    assert.equal(angular.version, "0.23.0", "the version transition belongs to the Version Packages PR");
  });

  it("appears in the angular cohort of the plan, never in core", () => {
    const plan = planIt();
    const cohort = plan.cohorts.find((c) => c.group === "angular");
    assert.deepEqual([...cohort.publish, ...cohort.alreadyPublished].map((t) => t.name), ["@kinetixui/angular"]);
    const core = plan.cohorts.find((c) => c.group === "core");
    assert.ok(![...core.publish, ...core.alreadyPublished].some((t) => t.name === "@kinetixui/angular"));
  });
});

describe("release cohorts in this repository", () => {
  it("keeps tokens, ui and cli together in core", () => {
    const core = allowlistFile.packages.filter((p) => p.releaseGroup === "core").map((p) => p.name).sort();
    assert.deepEqual(core, ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
    assert.equal(allowlistFile.releaseGroups.core.sameVersion, true, "core releases in lockstep");
  });

  it("keeps the core cohort on one version", () => {
    const plan = planIt();
    const core = plan.cohorts.find((c) => c.group === "core");
    const versions = new Set([...core.publish, ...core.alreadyPublished].map((t) => t.version));
    assert.equal(versions.size, 1, `core must share one version, found ${[...versions].join(", ")}`);
  });

  it("matches the Changesets fixed group, which owns core and not Angular", () => {
    const config = read(".changeset/config.json");
    const fixed = config.fixed[0].sort();
    assert.deepEqual(fixed, ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
    assert.ok(!fixed.includes("@kinetixui/angular"), "Angular versions independently");
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

/**
 * The two-stage release flow.
 *
 * A pending changeset means the versions in this tree are the ones about to be superseded. The
 * `changesets/action` the Release workflow pins reaches its publish branch only under
 * `!hasChangesets` — with a changeset present it runs the version step and opens the Version
 * Packages PR instead — so merging an activation PR cannot publish the outgoing version.
 *
 * That guarantee lives in someone else's action, so `scripts/release-publish.mjs` enforces the same
 * rule itself. These assert both halves are still in place.
 */
describe("a release cannot run while changesets are pending", () => {
  const publishScript = readFileSync(`${root}scripts/release-publish.mjs`, "utf8");

  it("refuses to publish when .changeset holds an unapplied changeset", () => {
    assert.match(publishScript, /Refusing to publish: .*changeset\(s\) are pending/);
    assert.match(publishScript, /No package was published\./);
  });

  it("reads the changeset directory rather than trusting the caller", () => {
    assert.match(publishScript, /readdirSync\(dir\)[\s\S]{0,120}endsWith\("\.md"\)/);
  });

  it("keeps the workflow's two-stage inputs, which is what routes a changeset to the Version PR", () => {
    const workflow = readFileSync(`${root}.github/workflows/release.yml`, "utf8");
    assert.match(workflow, /uses: changesets\/action@[0-9a-f]{40}/, "the action must stay pinned to the audited commit");
    assert.match(workflow, /version: pnpm changeset version/);
    assert.match(workflow, /publish: pnpm release/);
  });

  it("has exactly one pending changeset, for Angular's first public release", () => {
    const pending = readdirSync(`${root}.changeset`).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
    assert.deepEqual(pending, ["angular-first-public-release.md"]);
    const body = readFileSync(`${root}.changeset/${pending[0]}`, "utf8");
    assert.match(body, /"@kinetixui\/angular": minor/);
    assert.ok(!/"@kinetixui\/(ui|cli|tokens)"/.test(body), "the core cohort must not be dragged into this release");
  });
});
