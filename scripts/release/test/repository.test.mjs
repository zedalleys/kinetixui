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
import semver from "semver";
import { validateAllowlist } from "../contract.mjs";
import { buildPlan } from "../plan.mjs";
import { readPendingChangesets } from "../peers.mjs";
import { releaseTagName } from "../tags.mjs";
import { discoverWorkspace } from "../workspace.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (relative) => JSON.parse(readFileSync(`${root}${relative}`, "utf8"));

const allowlistFile = read("release/publish-packages.json");
const rootManifest = read("package.json");
const rootScriptNames = Object.keys(rootManifest.scripts);
const packages = discoverWorkspace(root);
const changesetConfig = read(".changeset/config.json");
const pendingChangesets = readPendingChangesets(root);
// The same inputs `release:check` builds its plan from, so what this file asserts is what the
// release gate decides — including the peer-compatibility audit, which needs the pending changesets.
const planIt = () => buildPlan({ allowlistFile, packages, rootScriptNames, pendingChangesets, changesetConfig });

describe("this repository's publish allowlist", () => {
  it("is the core cohort, the Angular cohort and the IoT cohort", () => {
    const { packages: allowed, errors } = validateAllowlist(allowlistFile, rootScriptNames);
    assert.deepEqual(errors, []);
    assert.deepEqual(allowed.map((p) => p.name).sort(), [
      "@kinetixui/angular",
      "@kinetixui/cli",
      "@kinetixui/iot",
      "@kinetixui/tokens",
      "@kinetixui/ui",
    ]);
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
   * Publication is distribution, not maturity. Angular is being published and stays Preview — the
   * two are deliberately independent, and this is the assertion that keeps them that way.
   */
  it("is Preview regardless of being published", () => {
    const manifest = read("components.manifest.json");
    assert.equal(manifest.platformDefinitions.Angular.maturity, "preview");
    assert.equal(manifest.platformDefinitions.Angular.catalogComplete, false);
  });

  /** The version is whatever Changesets set, checked against the changelog rather than hardcoded. */
  it("carries the version its changelog most recently recorded", () => {
    const changelog = readFileSync(`${root}packages/ui-angular/CHANGELOG.md`, "utf8");
    const latest = changelog.match(/^## (\d+\.\d+\.\d+)/m)?.[1];
    assert.ok(latest, "the Angular changelog should have a version heading");
    assert.equal(angular.version, latest, "package.json and CHANGELOG.md must agree");
  });

  it("appears in the angular cohort of the plan, never in core", () => {
    const plan = planIt();
    const cohort = plan.cohorts.find((c) => c.group === "angular");
    assert.deepEqual([...cohort.publish, ...cohort.alreadyPublished].map((t) => t.name), ["@kinetixui/angular"]);
    const core = plan.cohorts.find((c) => c.group === "core");
    assert.ok(![...core.publish, ...core.alreadyPublished].some((t) => t.name === "@kinetixui/angular"));
  });
});

describe("@kinetixui/iot", () => {
  const iot = packages.find((p) => p.name === "@kinetixui/iot");
  const entry = allowlistFile.packages.find((p) => p.name === "@kinetixui/iot");

  it("is publication-ready: public, with the metadata npm requires", () => {
    assert.ok(iot, "@kinetixui/iot should be a workspace package");
    assert.notEqual(iot.manifest.private, true);
    assert.deepEqual(iot.manifest.publishConfig, { access: "public", provenance: true });
  });

  it("is allowlisted, in its own release cohort", () => {
    assert.ok(entry, "@kinetixui/iot should be in release/publish-packages.json");
    assert.equal(entry.releaseGroup, "iot");
    assert.notEqual(entry.releaseGroup, "core", "a new experimental module must not join the core lockstep");
  });

  it("packs from its workspace root, unlike Angular", () => {
    assert.equal(entry.directory, "packages/iot");
    assert.equal(entry.artifactDirectory, undefined);
  });

  it("builds before it can be packed", () => {
    assert.ok(entry.build.includes("build:iot"), "the allowlist must build IoT before packing it");
    for (const script of entry.build) assert.ok(script in rootManifest.scripts, `root script ${script} must exist`);
  });

  /** All three entry points, both halves of each: the module is useless if a subpath does not resolve. */
  it("requires every file its exports map promises", () => {
    for (const file of [
      "dist/index.js",
      "dist/index.d.ts",
      "dist/functions/index.js",
      "dist/functions/index.d.ts",
      "dist/react/index.js",
      "dist/react/index.d.ts",
    ]) {
      assert.ok(entry.requireFiles.includes(file), `requireFiles should name ${file}`);
    }
  });

  /**
   * The reason this module has no workspace dependencies. Changesets rewrites a peer range on every
   * release of the package it points at, in range or not — the behaviour "Angular's token peer is a
   * compatibility range" below exists to revert. Declaring one here would enlist this package in the
   * same recurring correction, so the token contract is a documented prerequisite instead.
   */
  it("depends on no workspace package, in any dependency field", () => {
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"]) {
      for (const name of Object.keys(iot.manifest[field] ?? {})) {
        assert.ok(
          !name.startsWith("@kinetixui/"),
          `${field}.${name}: @kinetixui/iot is deliberately free of workspace dependencies — see its README`,
        );
      }
    }
  });

  it("appears in the iot cohort of the plan, never in core or angular", () => {
    const plan = planIt();
    const cohort = plan.cohorts.find((c) => c.group === "iot");
    assert.deepEqual([...cohort.publish, ...cohort.alreadyPublished].map((t) => t.name), ["@kinetixui/iot"]);
    for (const group of ["core", "angular"]) {
      const other = plan.cohorts.find((c) => c.group === group);
      assert.ok(![...other.publish, ...other.alreadyPublished].some((t) => t.name === "@kinetixui/iot"));
    }
  });

  /**
   * Publication is distribution, not maturity — the same separation Angular's block asserts. IoT is
   * experimental and being published; neither implies the other.
   */
  it("is not counted as a core cross-platform component set", () => {
    const manifest = read("components.manifest.json");
    assert.equal(manifest.platformDefinitions.IoT, undefined, "IoT is a module, not a platform");
    for (const [slug, component] of Object.entries(manifest.components)) {
      assert.ok(
        !/^(device-status-badge|battery-indicator|signal-strength|last-sync|sensor-reading)$/.test(slug),
        `${slug} is an IoT module primitive and must not inflate the core component count`,
      );
      assert.ok(!("IoT" in (component.platforms ?? {})), `${slug} must not claim an IoT platform`);
    }
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

  /**
   * The wiring, not the logic. `assertAllConfirmed` is unit-tested; this is the line that makes it
   * run at all. Dropping the registry argument would restore the old behaviour — tags created on the
   * strength of an exit code — and every unit test would still pass.
   */
  it("confirms the upload against the registry before anything is tagged", () => {
    const entry = readFileSync(`${root}scripts/release-publish.mjs`, "utf8");
    const publishCall = entry.slice(entry.indexOf("await publish("));
    assert.ok(publishCall.startsWith("await publish("), "could not find the publish call");
    assert.match(
      publishCall.slice(0, publishCall.indexOf(")") + 1),
      /registry:\s*result\.plan\.registryUrl/,
      "release-publish.mjs must pass the registry to publish(), or the upload is never confirmed",
    );
    // And the confirmation happens before tags: an unconfirmed release must leave nothing behind.
    // Compared against the call site, not the import at the top of the file.
    const tagCall = entry.indexOf("await reconcileReleaseTags(");
    assert.ok(tagCall > 0, "could not find the reconcileReleaseTags call");
    assert.ok(
      entry.indexOf("await publish(") < tagCall,
      "publish (and its confirmation) must run before tag reconciliation",
    );

    const preflightSource = readFileSync(`${root}scripts/release/preflight.mjs`, "utf8");
    assert.match(preflightSource, /assertAllConfirmed\(/, "publish() must act on the confirmation result");
  });

  /** Both release jobs need tags: one creates them, the other asserts against them. */
  it("checks out full history in every job that depends on tags", () => {
    const workflow = readFileSync(`${root}.github/workflows/release.yml`, "utf8");
    const checkouts = workflow.split("actions/checkout@v4").slice(1);
    assert.equal(checkouts.length, 2, "release.yml should have exactly two checkouts");
    for (const [index, block] of checkouts.entries()) {
      assert.match(block.slice(0, 200), /fetch-depth:\s*0/, `release.yml checkout ${index + 1} is shallow`);
    }
    const ci = readFileSync(`${root}.github/workflows/ci.yml`, "utf8");
    assert.match(ci.slice(ci.indexOf("actions/checkout@v4"), ci.indexOf("actions/checkout@v4") + 200), /fetch-depth:\s*0/);
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

  /**
   * Versions sort numerically, not as text.
   *
   * This used to take `.sort().at(-1)` over every version string, which makes `0.9.0` the "newest"
   * release because `"9" > "2"`. It was therefore asserting against 0.9.0's tags while reading as
   * though it tracked the latest release, and it passed for a reason unrelated to what it claimed.
   */
  const newestVersionOf = (name) =>
    kinetixTags
      .filter((tag) => tag.startsWith(`${name}@`))
      .map((tag) => tag.slice(tag.lastIndexOf("@") + 1))
      .sort((a, b) => {
        const [x, y] = [a.split(".").map(Number), b.split(".").map(Number)];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
      })
      .at(-1);

  const CORE = ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"];

  it("matches the tags a real release produced, where the checkout has them", { skip: kinetixTags.length === 0 && "shallow checkout: no tags fetched" }, () => {
    // The core three are a lockstep cohort, so their newest tags are one version — and that version
    // has a tag for each of them. That is the cohort's own guarantee, checked against real tags
    // rather than against whichever version happens to sort last as a string.
    const newest = CORE.map((name) => newestVersionOf(name));
    assert.equal(new Set(newest).size, 1, `the core cohort's newest tags disagree: ${CORE.map((n, i) => `${n}@${newest[i]}`).join(", ")}`);
    for (const name of CORE) {
      assert.ok(localTags.has(releaseTagName(name, newest[0])), `expected the real tag ${releaseTagName(name, newest[0])} to exist`);
    }
  });

  /** Angular versions on its own, and its newest tag is allowed — expected — to differ from core's. */
  it("lets the Angular cohort sit at its own version", { skip: kinetixTags.length === 0 && "shallow checkout: no tags fetched" }, () => {
    const angular = newestVersionOf("@kinetixui/angular");
    if (!angular) return; // not yet released in this checkout
    assert.equal(angular, read("packages/ui-angular/package.json").version);
    assert.notEqual(angular, newestVersionOf("@kinetixui/cli"), "this assertion is only meaningful while the cohorts differ");
  });

  /**
   * Written when `@kinetixui/angular` was the private package and said so by name. It is public and
   * released now, so the name-specific form had become a false claim that only stayed green because
   * CI does not fetch tags. The rule it was reaching for is not about Angular: a tag is a claim that
   * a version was published, so no package that cannot be published may carry one.
   */
  it("has never tagged a package that cannot be published", { skip: kinetixTags.length === 0 && "shallow checkout: no tags fetched" }, () => {
    const unpublishable = packages.filter((pkg) => pkg.manifest.private === true).map((pkg) => pkg.name);
    for (const name of unpublishable) {
      assert.deepEqual(
        kinetixTags.filter((tag) => tag.startsWith(`${name}@`)),
        [],
        `${name} is private and must never get a release tag`,
      );
    }
    // And every tag that does exist names a package this repository still knows about, so a rename
    // shows up here rather than as an orphaned claim about something that no longer exists.
    const known = new Set(packages.map((pkg) => pkg.name));
    for (const tag of kinetixTags) {
      const name = tag.slice(0, tag.lastIndexOf("@"));
      assert.ok(known.has(name), `tag ${tag} names a package this workspace does not have`);
    }
  });

  /** The positive half, now that Angular is allowlisted: the activation really did tag its release. */
  it("tagged Angular's release once it became publishable", { skip: kinetixTags.length === 0 && "shallow checkout: no tags fetched" }, () => {
    const angular = read("packages/ui-angular/package.json");
    assert.notEqual(angular.private, true, "this assertion assumes Angular is publishable");
    assert.ok(
      localTags.has(releaseTagName("@kinetixui/angular", angular.version)),
      `expected ${releaseTagName("@kinetixui/angular", angular.version)} to exist`,
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

  /**
   * The other side of the gate, restated.
   *
   * This asserted that `.changeset` was empty, which was true at the 0.24.0 release boundary and is
   * not an invariant of the repository: between releases, pending changesets are the normal state of
   * `main`. As written it would have failed every pull request that carried one — the guard above is
   * what forbids a release while they are pending, and it reads the directory at release time.
   *
   * What is always true is that a pending changeset must name a package the release engine can
   * actually act on. A changeset naming an ignored, private or misspelled package is silently
   * dropped by `changeset version`, so the work ships with no version bump and no changelog entry —
   * a failure with no error message, which is the kind worth catching on the pull request.
   */
  it("keeps every pending changeset pointed at a package a release can act on", () => {
    const pending = readdirSync(`${root}.changeset`).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
    const config = read(".changeset/config.json");
    const ignored = new Set(config.ignore ?? []);
    const versionable = new Set(
      packages.filter((pkg) => pkg.manifest.private !== true && !ignored.has(pkg.name)).map((pkg) => pkg.name),
    );

    for (const file of pending) {
      const text = readFileSync(`${root}.changeset/${file}`, "utf8");
      const front = text.split(/^---\s*$/m)[1];
      assert.ok(front, `${file} has no frontmatter`);
      const named = [...front.matchAll(/^\s*"([^"]+)":\s*(patch|minor|major)\s*$/gm)].map((m) => m[1]);
      assert.ok(named.length > 0, `${file} names no package`);
      for (const name of named) {
        assert.ok(versionable.has(name), `${file} names ${name}, which \`changeset version\` would ignore`);
      }
    }
  });

  it("consumed the Angular changeset into a changelog entry rather than losing it", () => {
    // Compared as whole lines rather than by a regex built from the version. Escaping a value into
    // a pattern by hand is the kind of thing that is wrong more often than it is right — and a
    // heading is an exact string, so there is nothing a pattern would buy here.
    const headingsOf = (markdown) =>
      markdown
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("## "));

    const angularPkg = read("packages/ui-angular/package.json");
    const heading = `## ${angularPkg.version}`;
    const angularHeadings = headingsOf(readFileSync(`${root}packages/ui-angular/CHANGELOG.md`, "utf8"));
    assert.ok(angularHeadings.includes(heading), `the Angular changelog has no "${heading}" entry`);

    // The core cohort was not dragged along: its changelogs have no entry at Angular's version.
    for (const name of ["tokens", "ui", "cli"]) {
      const core = headingsOf(readFileSync(`${root}packages/${name}/CHANGELOG.md`, "utf8"));
      assert.ok(
        !core.includes(heading),
        `packages/${name}/CHANGELOG.md has an entry at Angular's version — the cohorts got coupled`,
      );
    }
  });
});

/**
 * Angular's version and the token contract it depends on are independent numbers.
 *
 * `@kinetixui/angular@0.24.0` peering on `@kinetixui/tokens@^0.23.0` looks like drift and is not:
 * the cohorts release separately, and Angular's compatibility is with the token contract it was
 * built and verified against, not with its own version string. Bumping the peer to match the
 * package version would quietly reintroduce the lockstep the cohorts exist to remove.
 */
describe("Angular's token peer is a compatibility range, not a mirror of its own version", () => {
  const angular = read("packages/ui-angular/package.json");
  const tokens = read("packages/tokens/package.json");
  const peer = angular.peerDependencies["@kinetixui/tokens"];

  it("declares a range the workspace's token version actually satisfies", () => {
    // Asked of semver rather than of a pattern. The old form matched `^<major>.<minor>.` and checked
    // the captures against the token version, which answers "does the range look like the version"
    // — a different and narrower question than whether it accepts it, and one that rejects every
    // range that is not a caret. `>=0.23.0 <0.25.0` is a perfectly good peer range.
    assert.ok(peer, "@kinetixui/tokens should be a peer dependency");
    assert.notEqual(semver.validRange(peer), null, `the token peer ${peer} is not a semver range`);
    assert.ok(
      semver.satisfies(tokens.version, peer),
      `the token peer ${peer} does not accept @kinetixui/tokens@${tokens.version}, which is the version ` +
        `this workspace builds @kinetixui/angular against`,
    );
  });

  it("does not mirror Angular's own version", () => {
    if (angular.version === tokens.version) return; // nothing to prove while they coincide
    assert.ok(
      !peer.includes(angular.version.split(".").slice(0, 2).join(".")),
      `the token peer (${peer}) was bumped to follow @kinetixui/angular@${angular.version} rather than the token contract`,
    );
  });

  /**
   * The audit has to be looking at this repository, not at nothing.
   *
   * A guard that checks zero claims passes every release, which is the failure mode worth asserting
   * against directly: the one thing it must be able to see is the claim that has already drifted
   * twice. The range and the version are read from the manifests, so a release moves this test rather
   * than breaking it.
   */
  it("is the claim the release gate actually checks", () => {
    const plan = planIt();
    const claim = plan.peers.checked.find(
      (entry) => entry.dependent === "@kinetixui/angular" && entry.dependency === "@kinetixui/tokens",
    );
    assert.ok(
      claim,
      `the release plan checked ${plan.peers.checked.length} peer claim(s) and none of them was ` +
        `@kinetixui/angular → @kinetixui/tokens. An audit that cannot see the claim that drifted is vacuous.`,
    );
    assert.equal(claim.range, peer);
    assert.equal(claim.next, tokens.version, "no release is pending, so the planned version is the current one");
    assert.equal(claim.satisfied, true);
  });

  it("keeps Angular out of the core cohort's version, which is the point", () => {
    const allowlistEntry = allowlistFile.packages.find((p) => p.name === "@kinetixui/angular");
    assert.equal(allowlistEntry.releaseGroup, "angular");
    const core = allowlistFile.packages.filter((p) => p.releaseGroup === "core");
    for (const entry of core) {
      const pkg = read(`${entry.directory}/package.json`);
      assert.equal(pkg.version, tokens.version, "the core cohort stays in lockstep");
    }
  });
});

/**
 * A version that has shipped cannot be changed, so the repository must stop describing it differently.
 *
 * The 0.23.1 Version Packages PR rewrote `@kinetixui/angular`'s token peer from `^0.23.0` to
 * `^0.23.1` without versioning Angular. `@kinetixui/angular@0.24.0` was already on npm declaring
 * `^0.23.0`, and it must not be republished, so the new range could never reach a consumer — it only
 * made this repository disagree with the artifact. It was also pointless: `^0.23.0` already accepts
 * `0.23.1`, and the core patch carried no token-contract change.
 *
 * That rewrite no longer happens. `.changeset/config.json` sets
 * `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange`, which
 * turns the peer branch of `shouldUpdateDependencyBasedOnConfig` back into a semver question, and
 * `scripts/release/peers.mjs` fails the release when a planned version genuinely leaves a declared
 * range. `version-generation.test.mjs` proves both halves against the real `changeset version`, and
 * RELEASING.md → *Peer ranges across cohorts* is the whole story.
 *
 * This suite is the backstop underneath all of that, and it is wider than the one bug: a package with
 * no pending version bump, already published at the version in its manifest, must still describe what
 * was published — whatever moved it. On a feature branch the same assertion means a consumer-facing
 * manifest change needs a changeset, which is correct, because without one the change never reaches
 * npm. It is also what stops "widen the peer range" from being done quietly: the edit fails here until
 * a changeset accompanies it.
 */
describe("a published package still describes what was published", () => {
  /**
   * Fields that end up in the tarball and that a consumer resolves against. `devDependencies` and
   * `scripts` are deliberately absent: they change between releases as ordinary maintenance and
   * nothing downstream resolves them.
   */
  const PUBLISHED_FIELDS = [
    "name",
    "version",
    "dependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "optionalDependencies",
    "exports",
    "main",
    "module",
    "types",
    "typings",
    "bin",
    "files",
    "engines",
    "sideEffects",
    "publishConfig",
  ];

  const tags = new Set(
    execFileSync("git", ["tag", "--list"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  /**
   * Packages a pending changeset will bump, expanded through the `fixed` cohorts. Anything here is
   * mid-release and exempt — its manifest is *supposed* to be moving.
   *
   * Read from `.changeset` rather than assembled through the Changesets API: this needs to hold with
   * no extra dependency and no network, and naming a cohort member is enough because the cohort moves
   * together. A package bumped only as a transitive dependent would be missed, which would show up as
   * a failure asking for a changeset rather than as silence.
   */
  const pending = () => {
    const config = read(".changeset/config.json");
    const groups = (config.fixed ?? []).concat(config.linked ?? []);
    const named = new Set();
    for (const file of readdirSync(`${root}.changeset`).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")) {
      const front = readFileSync(`${root}.changeset/${file}`, "utf8").split(/^---\s*$/m)[1] ?? "";
      for (const [, name] of front.matchAll(/^\s*"([^"]+)":\s*(?:patch|minor|major)\s*$/gm)) named.add(name);
    }
    for (const group of groups) if (group.some((name) => named.has(name))) for (const name of group) named.add(name);
    return named;
  };

  const publishedShape = (manifest) =>
    Object.fromEntries(PUBLISHED_FIELDS.filter((key) => manifest[key] !== undefined).map((key) => [key, manifest[key]]));

  const subjects = packages.filter((pkg) => pkg.manifest.private !== true);

  it("has publishable packages to check", () => {
    assert.ok(subjects.length > 0);
  });

  for (const pkg of subjects) {
    const tag = releaseTagName(pkg.name, pkg.manifest.version);
    const bumping = pending().has(pkg.name);
    const why =
      tags.size === 0
        ? "shallow checkout: no tags fetched"
        : bumping
          ? `${pkg.name} has a pending changeset — its manifest is meant to move`
          : !tags.has(tag)
            ? `${pkg.name}@${pkg.manifest.version} is not published yet`
            : false;

    it(`${pkg.name} matches ${tag}`, { skip: why }, () => {
      // `discoverWorkspace` already reports a repo-relative, forward-slash directory, which is what
      // `git show tag:path` wants on Windows as well.
      const shipped = JSON.parse(
        execFileSync("git", ["show", `${tag}:${pkg.directory}/package.json`], { cwd: root, encoding: "utf8" }),
      );
      assert.deepEqual(
        publishedShape(pkg.manifest),
        publishedShape(shipped),
        `${pkg.name}@${pkg.manifest.version} is already on npm and cannot be republished, so this change ` +
          `can never reach a consumer — it only makes the repository disagree with the artifact. Either ` +
          `revert it, or add a changeset so the change ships under a new version.`,
      );
    });
  }
});
