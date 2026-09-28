/**
 * The peer-compatibility invariant, on synthetic workspaces.
 *
 * Every case is expressed as "a range, and a version that is about to be published" rather than as
 * a fixed pair of numbers. `0.23.x` appears only where the historical bug is being reproduced
 * verbatim; the semantics are asserted at several unrelated version lines so that a future release
 * cannot quietly turn this file into a museum piece.
 *
 * The companion file is `version-generation.test.mjs`, which runs the real `changeset version` and
 * checks that these predictions match what the tool actually does.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditPeerCompatibility, parseChangeset, plannedVersions } from "../peers.mjs";
import { buildPlan } from "../plan.mjs";
import { ROOT_SCRIPTS, TWO_COHORT_ALLOWLIST, twoCohortWorkspace } from "./fixtures.mjs";

const includes = (haystack, needle) =>
  assert.ok(haystack.includes(needle), `expected to find ${JSON.stringify(needle)} in:\n${haystack}`);

/**
 * The real shape: a lockstep `core` cohort, and `@kinetixui/angular` independently versioned with a
 * literal peer range on the token package plus the `workspace:*` devDependency it builds against.
 */
function workspace({ core = "0.23.2", angular = "0.24.0", peer = "^0.23.0" } = {}) {
  const packages = twoCohortWorkspace({ core, angular });
  for (const pkg of packages) {
    if (pkg.name !== "@kinetixui/angular") continue;
    pkg.manifest.peerDependencies = { "@angular/core": "^21.0.0", "@kinetixui/tokens": peer };
    pkg.manifest.devDependencies = { "@kinetixui/tokens": "workspace:*" };
  }
  return packages;
}

const CORE = ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"];
const changeset = (name, type) => ({ id: `cs-${name}-${type}`, releases: [{ name, type }] });

const audit = (packages, changesets = []) =>
  auditPeerCompatibility({
    packages,
    allowlist: TWO_COHORT_ALLOWLIST.packages,
    planned: plannedVersions({ packages, changesets, fixed: [CORE] }),
  });

describe("planning what a release will publish", () => {
  it("applies the strongest bump a changeset names", () => {
    const packages = workspace({ core: "1.4.7" });
    const planned = plannedVersions({ packages, changesets: [changeset("@kinetixui/tokens", "patch"), changeset("@kinetixui/tokens", "minor")], fixed: [CORE] });
    assert.equal(planned.get("@kinetixui/tokens"), "1.5.0");
  });

  it("moves a fixed cohort together, from the highest version in it", () => {
    const packages = workspace({ core: "2.1.0" });
    // One member left behind by a hand edit: the cohort converges upward rather than splitting.
    packages.find((pkg) => pkg.name === "@kinetixui/cli").version = "2.0.9";
    packages.find((pkg) => pkg.name === "@kinetixui/cli").manifest.version = "2.0.9";
    const planned = plannedVersions({ packages, changesets: [changeset("@kinetixui/cli", "patch")], fixed: [CORE] });
    for (const name of CORE) assert.equal(planned.get(name), "2.1.1", `${name} should move with its cohort`);
  });

  it("leaves a package alone when no changeset names it", () => {
    const packages = workspace();
    const planned = plannedVersions({ packages, changesets: [changeset("@kinetixui/tokens", "patch")], fixed: [CORE] });
    assert.equal(planned.has("@kinetixui/angular"), false);
  });

  it("ignores packages the Changesets `ignore` list excludes", () => {
    const packages = workspace();
    const planned = plannedVersions({
      packages,
      changesets: [changeset("@kinetixui/tokens", "patch")],
      fixed: [CORE],
      ignore: ["@kinetixui/tokens", "@kinetixui/ui", "@kinetixui/cli"],
    });
    assert.equal(planned.size, 0);
  });

  it("reads quoted and unquoted names out of changeset frontmatter", () => {
    assert.deepEqual(parseChangeset('---\n"@kinetixui/tokens": minor\n---\n\nbody\n'), [
      { name: "@kinetixui/tokens", type: "minor" },
    ]);
    assert.deepEqual(parseChangeset("---\n@kinetixui/tokens: patch\n---\n\nbody\n"), [
      { name: "@kinetixui/tokens", type: "patch" },
    ]);
    assert.deepEqual(parseChangeset("no frontmatter here"), []);
  });
});

/**
 * Case A. The exact bug: a core patch inside Angular's declared range.
 *
 * `^0.23.0` accepts `0.23.3`, Angular is not being released, and `@kinetixui/angular@0.24.0` is on
 * npm declaring the old range. Nothing about the claim has become false, so nothing is owed.
 */
describe("a compatible patch to the depended-on package", () => {
  it("is not a compatibility problem", () => {
    const result = audit(workspace({ core: "0.23.2", angular: "0.24.0", peer: "^0.23.0" }), [
      changeset("@kinetixui/tokens", "patch"),
    ]);
    assert.deepEqual(result.errors, []);
    const claim = result.checked.find((entry) => entry.dependency === "@kinetixui/tokens");
    assert.deepEqual(
      { range: claim.range, next: claim.next, satisfied: claim.satisfied, releasing: claim.releasing },
      { range: "^0.23.0", next: "0.23.3", satisfied: true, releasing: false },
    );
  });

  it("does not depend on the numbers being 0.23.x", () => {
    for (const [core, peer, expected] of [
      ["1.4.7", "^1.4.0", "1.4.8"],
      ["3.0.0", ">=3.0.0 <4.0.0", "3.0.1"],
      ["0.9.9", "~0.9.0", "0.9.10"],
    ]) {
      const result = audit(workspace({ core, peer }), [changeset("@kinetixui/tokens", "patch")]);
      assert.deepEqual(result.errors, [], `${peer} should accept ${expected}`);
      assert.equal(result.checked.find((e) => e.dependency === "@kinetixui/tokens").next, expected);
    }
  });
});

/**
 * Case B. A minor the declared range already covers.
 *
 * A caret on a 0.x version pins the minor, so `^0.23.0` does *not* accept `0.24.0` — that is Case C.
 * A range written to span minors does, and then the minor is as uneventful as a patch. This is the
 * assertion that keeps the rule semantic rather than "patches are fine, minors are not".
 */
describe("a minor the declared range already accepts", () => {
  it("passes, because the range says so", () => {
    const result = audit(workspace({ core: "0.23.2", peer: ">=0.23.0 <0.25.0" }), [changeset("@kinetixui/tokens", "minor")]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checked.find((e) => e.dependency === "@kinetixui/tokens").next, "0.24.0");
  });

  it("passes for a caret on a 1.x line, where a minor is in range", () => {
    const result = audit(workspace({ core: "1.4.7", peer: "^1.0.0" }), [changeset("@kinetixui/tokens", "minor")]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checked.find((e) => e.dependency === "@kinetixui/tokens").next, "1.5.0");
  });

  it("is computed from the range, not from the bump type", () => {
    // One minor bump, two ranges. `^1.4.0` spans minors and accepts 1.5.0; `~1.4.0` pins the minor
    // and does not. Nothing about "minor" decides this — the range does.
    const bump = [changeset("@kinetixui/tokens", "minor")];
    assert.equal(audit(workspace({ core: "1.4.7", peer: "^1.4.0" }), bump).ok, true);
    assert.equal(audit(workspace({ core: "1.4.7", peer: "~1.4.0" }), bump).ok, false);
    // And the mirror image on a 0.x line, where the caret is the one that pins.
    assert.equal(audit(workspace({ core: "0.23.2", peer: "^0.23.0" }), bump).ok, false);
    assert.equal(audit(workspace({ core: "0.23.2", peer: "^0.23.0 || ^0.24.0" }), bump).ok, true);
  });
});

/**
 * Case C. The planned version falls outside the declared range.
 *
 * This is the case that must never be preserved silently. Changesets would widen the range and give
 * the dependent a patch bump; the release has to stop and ask instead.
 */
describe("a planned version outside the declared range", () => {
  const result = audit(workspace({ core: "0.23.2", angular: "0.24.0", peer: "^0.23.0" }), [
    changeset("@kinetixui/tokens", "minor"),
  ]);

  it("fails", () => {
    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 1);
  });

  it("names the packages, the declared range and the planned version", () => {
    const [error] = result.errors;
    includes(error, "@kinetixui/angular@0.24.0");
    includes(error, '@kinetixui/tokens "^0.23.0"');
    includes(error, "planned @kinetixui/tokens version is 0.24.0");
    includes(error, "packages/ui-angular/package.json");
  });

  it("says the dependent is not in this release, and what to do about it", () => {
    const [error] = result.errors;
    includes(error, "@kinetixui/angular is not in this release");
    includes(error, "add a changeset for @kinetixui/angular");
  });

  it("does not rewrite or revert anything — it only reports", () => {
    const packages = workspace({ core: "0.23.2", peer: "^0.23.0" });
    audit(packages, [changeset("@kinetixui/tokens", "minor")]);
    assert.equal(packages.find((p) => p.name === "@kinetixui/angular").manifest.peerDependencies["@kinetixui/tokens"], "^0.23.0");
  });

  it("fails on a major too, where the dependent would get only a patch", () => {
    const outOfRange = audit(workspace({ core: "0.23.2", peer: "^0.23.0" }), [changeset("@kinetixui/tokens", "major")]);
    assert.equal(outOfRange.ok, false);
    includes(outOfRange.errors[0], "planned @kinetixui/tokens version is 1.0.0");
  });
});

/**
 * The dependent is deliberately part of the release.
 *
 * Being released is not an exemption — the claim still has to be true of what ships — but the
 * diagnostic has to describe the right situation, and a widened range plus a changeset has to pass.
 */
describe("when the dependent is released on purpose", () => {
  it("passes once its declared range covers the new version", () => {
    const result = audit(workspace({ core: "0.23.2", angular: "0.24.0", peer: "^0.24.0 || ^0.23.0" }), [
      changeset("@kinetixui/tokens", "minor"),
      changeset("@kinetixui/angular", "minor"),
    ]);
    assert.deepEqual(result.errors, []);
    const claim = result.checked.find((e) => e.dependency === "@kinetixui/tokens");
    assert.equal(claim.releasing, true);
    assert.equal(claim.next, "0.24.0");
  });

  it("leaves an intentional Angular-only release untouched", () => {
    const packages = workspace({ core: "0.23.3", angular: "0.24.0", peer: "^0.23.0" });
    const result = audit(packages, [changeset("@kinetixui/angular", "minor")]);
    assert.deepEqual(result.errors, []);
    // The edit the changeset was written for is still there, and the core cohort did not move.
    assert.equal(packages.find((p) => p.name === "@kinetixui/angular").manifest.peerDependencies["@kinetixui/tokens"], "^0.23.0");
    const planned = plannedVersions({ packages, changesets: [changeset("@kinetixui/angular", "minor")], fixed: [CORE] });
    assert.equal(planned.get("@kinetixui/angular"), "0.25.0");
    for (const name of CORE) assert.equal(planned.has(name), false, `${name} should not move`);
  });

  it("still reports an out-of-range claim, and says the dependent is in the release", () => {
    const result = audit(workspace({ core: "0.23.2", peer: "^0.23.0" }), [
      changeset("@kinetixui/tokens", "minor"),
      changeset("@kinetixui/angular", "minor"),
    ]);
    assert.equal(result.ok, false);
    includes(result.errors[0], "@kinetixui/angular is in this release");
  });
});

/** What is deliberately out of scope, so the audit cannot report a package doing nothing wrong. */
describe("what is not a peer compatibility claim", () => {
  it("skips a `workspace:` spec, which is rewritten at pack time", () => {
    const packages = workspace();
    packages.find((p) => p.name === "@kinetixui/angular").manifest.peerDependencies["@kinetixui/tokens"] = "workspace:*";
    const result = audit(packages, [changeset("@kinetixui/tokens", "major")]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checked.length, 0);
  });

  it("skips a peer on a package this repository does not release", () => {
    const packages = workspace();
    packages.find((p) => p.name === "@kinetixui/angular").manifest.peerDependencies = { react: ">=18" };
    const result = audit(packages, [changeset("@kinetixui/tokens", "major")]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checked.length, 0);
  });

  it("skips `dependencies`, which Changesets owns and is meant to rewrite", () => {
    const packages = workspace();
    const angular = packages.find((p) => p.name === "@kinetixui/angular");
    delete angular.manifest.peerDependencies;
    angular.manifest.dependencies = { "@kinetixui/tokens": "^0.23.0" };
    const result = audit(packages, [changeset("@kinetixui/tokens", "major")]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checked.length, 0);
  });

  it("reports a peer range no package manager could parse", () => {
    const packages = workspace({ peer: "not-a-range" });
    const result = audit(packages, [changeset("@kinetixui/tokens", "patch")]);
    assert.equal(result.ok, false);
    includes(result.errors[0], "not a valid semver range");
  });
});

/** The rule is about independently versioned cohorts, not about Angular. */
describe("the rule is generic", () => {
  it("applies to any allowlisted package that peers on another", () => {
    const allowlist = {
      ...TWO_COHORT_ALLOWLIST,
      releaseGroups: { ...TWO_COHORT_ALLOWLIST.releaseGroups, iot: { sameVersion: true } },
      packages: [
        ...TWO_COHORT_ALLOWLIST.packages,
        { name: "@kinetixui/iot", releaseGroup: "iot", directory: "packages/iot", build: [], requireFiles: [] },
      ],
    };
    const packages = workspace({ core: "0.23.2" });
    packages.push({
      name: "@kinetixui/iot",
      version: "0.1.0",
      directory: "packages/iot",
      manifest: { name: "@kinetixui/iot", version: "0.1.0", peerDependencies: { "@kinetixui/tokens": "^0.23.0", react: ">=18" } },
    });
    const result = auditPeerCompatibility({
      packages,
      allowlist: allowlist.packages,
      planned: plannedVersions({ packages, changesets: [changeset("@kinetixui/tokens", "minor")], fixed: [CORE] }),
    });
    assert.equal(result.errors.length, 2, "both dependents' claims are checked");
    assert.deepEqual(
      result.checked.map((e) => `${e.dependent} -> ${e.dependency}`).sort(),
      ["@kinetixui/angular -> @kinetixui/tokens", "@kinetixui/iot -> @kinetixui/tokens"],
    );
  });
});

/** The gate is reached through the release plan, which is what `release:check` and `pnpm release` run. */
describe("the release plan carries the verdict", () => {
  const base = { allowlistFile: TWO_COHORT_ALLOWLIST, rootScriptNames: ROOT_SCRIPTS, changesetConfig: { fixed: [CORE] } };

  it("fails the plan on an out-of-range claim", () => {
    const plan = buildPlan({
      ...base,
      packages: workspace({ core: "0.23.2", peer: "^0.23.0" }),
      pendingChangesets: [changeset("@kinetixui/tokens", "minor")],
    });
    assert.equal(plan.ok, false);
    includes(plan.errors.join("\n"), "planned @kinetixui/tokens version is 0.24.0");
    assert.deepEqual(plan.peers.planned.map((p) => `${p.name}@${p.version}`).sort(), [
      "@kinetixui/cli@0.24.0",
      "@kinetixui/tokens@0.24.0",
      "@kinetixui/ui@0.24.0",
    ]);
  });

  it("passes the plan on a compatible patch, having actually checked something", () => {
    const plan = buildPlan({
      ...base,
      packages: workspace({ core: "0.23.2", peer: "^0.23.0" }),
      pendingChangesets: [changeset("@kinetixui/tokens", "patch")],
    });
    assert.equal(plan.ok, true, plan.errors.join("\n"));
    assert.ok(
      plan.peers.checked.some((e) => e.dependent === "@kinetixui/angular" && e.dependency === "@kinetixui/tokens"),
      "the plan must have checked Angular's token peer — an empty audit is not a pass",
    );
  });
});
