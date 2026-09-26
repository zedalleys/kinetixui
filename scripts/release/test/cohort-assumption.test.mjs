/**
 * The release engine assumes every allowlisted package is one release cohort.
 *
 * That is true today and deliberately so: `@kinetixui/{tokens,ui,cli}` are one Changesets `fixed`
 * group, share a version, and are released from one commit. These tests pin that assumption down
 * rather than test around it, because it is the thing publishing `@kinetixui/angular`
 * independently will have to change.
 *
 * `@kinetixui/angular` is Preview and unpublished, and the recommended strategy (RELEASING.md) is
 * to version it outside the core group. The moment that happens the allowlist holds two versions
 * and two release commits, and both assertions below start failing. They are meant to: a failure
 * here is the signal that cohort support is now required, not that something regressed.
 *
 * Nothing here is a bug report against the current engine. Within one cohort the assumption is
 * exactly right, and the second test shows the engine refusing to do damage when the assumption is
 * violated — it does not move, recreate or force-push anything.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlan } from "../plan.mjs";
import { reconcileReleaseTags, TagIntegrityError } from "../tags.mjs";

const CORE_COMMIT = "a".repeat(40); // where tokens/ui/cli@0.23.0 were released
const ANGULAR_COMMIT = "b".repeat(40); // where an Angular-only release would happen

const allowlistFile = {
  registry: "https://registry.npmjs.org/",
  packages: [
    { name: "@kinetixui/tokens", directory: "packages/tokens", build: [], requireFiles: [] },
    { name: "@kinetixui/ui", directory: "packages/ui", build: [], requireFiles: [] },
    { name: "@kinetixui/cli", directory: "packages/cli", build: [], requireFiles: [] },
    { name: "@kinetixui/angular", directory: "packages/ui-angular", build: [], requireFiles: [] },
  ],
};

const publishable = (name, directory, version) => ({
  name,
  version,
  directory,
  manifest: {
    name,
    version,
    license: "MIT",
    repository: { type: "git", url: "git+https://github.com/zedalleys/kinetixui.git", directory },
    files: ["dist"],
    exports: { ".": "./dist/index.js" },
    publishConfig: { access: "public", provenance: true },
  },
});

/** Strategy B's shape: the core cohort at 0.23.0, Angular independently at 0.24.0. */
const mixedCohorts = () => [
  publishable("@kinetixui/tokens", "packages/tokens", "0.23.0"),
  publishable("@kinetixui/ui", "packages/ui", "0.23.0"),
  publishable("@kinetixui/cli", "packages/cli", "0.23.0"),
  publishable("@kinetixui/angular", "packages/ui-angular", "0.24.0"),
];

describe("the release engine treats the whole allowlist as one cohort", () => {
  it("accepts an allowlist where every package shares a version", () => {
    const packages = mixedCohorts().map((pkg) => (pkg.name === "@kinetixui/angular" ? publishable(pkg.name, pkg.directory, "0.23.0") : pkg));
    const plan = buildPlan({ allowlistFile, packages, rootScriptNames: [] });
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.version, "0.23.0");
  });

  /**
   * Publishing Angular on its own version is a deliberate future change, not a mistake, and this
   * is the check that will refuse it. Making it pass is part of the cohort work, not something to
   * work around by forcing Angular back onto the core version.
   */
  it("rejects an allowlist holding two versions, which is what independent versioning produces", () => {
    const plan = buildPlan({ allowlistFile, packages: mixedCohorts(), rootScriptNames: [] });
    assert.equal(plan.ok, false);
    assert.ok(
      plan.errors.some((error) => error.includes("@kinetixui/angular@0.24.0 does not match the other allowlisted packages at 0.23.0")),
      `expected a version-cohort error, got: ${plan.errors.join(" | ")}`,
    );
  });
});

describe("tag reconciliation assumes one release commit for the whole allowlist", () => {
  /**
   * An Angular-only release at its own commit still has the core packages in
   * `alreadyPublished`, so their tags are considered owed — at the Angular commit, because the
   * engine derives exactly one. Their real tags point at the core release commit, so every one of
   * them reads as divergent.
   *
   * What matters is what it does about that: nothing. No tag is created, pushed, moved or forced.
   * The safety property from the tag-integrity work holds; the release simply cannot proceed until
   * the planner knows the two cohorts were released separately.
   */
  it("refuses an Angular-only release rather than re-pointing the core cohort's historical tags", async () => {
    const released = {
      publish: [{ name: "@kinetixui/angular", version: "0.24.0" }],
      alreadyPublished: [
        { name: "@kinetixui/tokens", version: "0.23.0" },
        { name: "@kinetixui/ui", version: "0.23.0" },
        { name: "@kinetixui/cli", version: "0.23.0" },
      ],
    };
    const created = [];
    const pushed = [];

    await assert.rejects(
      () =>
        reconcileReleaseTags({
          root: "/repo",
          plan: released,
          published: [{ name: "@kinetixui/angular", version: "0.24.0" }],
          git: {
            headCommit: async () => ANGULAR_COMMIT,
            listLocalTags: async () => new Map(),
            listRemoteTags: async () =>
              new Map([
                ["@kinetixui/tokens@0.23.0", CORE_COMMIT],
                ["@kinetixui/ui@0.23.0", CORE_COMMIT],
                ["@kinetixui/cli@0.23.0", CORE_COMMIT],
              ]),
            isAncestorOfHead: async () => true,
            createTag: async ({ tag }) => created.push(tag),
            pushTags: async ({ tags }) => pushed.push(...tags),
          },
        }),
      (error) => {
        assert.ok(error instanceof TagIntegrityError);
        // The core cohort's tags are the ones reported, and they are reported as *divergent* —
        // which is the planner asking the wrong question, not a real integrity problem.
        assert.deepEqual(
          error.divergent.map((entry) => entry.tag).sort(),
          ["@kinetixui/cli@0.23.0", "@kinetixui/tokens@0.23.0", "@kinetixui/ui@0.23.0"],
        );
        for (const entry of error.divergent) assert.equal(entry.actual, CORE_COMMIT);
        return true;
      },
    );

    assert.deepEqual(created, [], "no tag may be created when the cohorts disagree");
    assert.deepEqual(pushed, [], "no tag may be pushed when the cohorts disagree");
  });

  it("is untroubled by an Angular-only release once the core tags are not in scope", async () => {
    // The shape cohort support has to produce: only the cohort being released is considered.
    const angularOnly = { publish: [{ name: "@kinetixui/angular", version: "0.24.0" }], alreadyPublished: [] };
    const pushed = [];
    const result = await reconcileReleaseTags({
      root: "/repo",
      plan: angularOnly,
      published: [{ name: "@kinetixui/angular", version: "0.24.0" }],
      git: {
        headCommit: async () => ANGULAR_COMMIT,
        listLocalTags: async () => new Map(),
        listRemoteTags: async () =>
          new Map([
            ["@kinetixui/tokens@0.23.0", CORE_COMMIT],
            ["@kinetixui/ui@0.23.0", CORE_COMMIT],
            ["@kinetixui/cli@0.23.0", CORE_COMMIT],
          ]),
        isAncestorOfHead: async () => true,
        createTag: async () => {},
        pushTags: async ({ tags }) => pushed.push(...tags),
      },
    });

    assert.deepEqual(result.expected, ["@kinetixui/angular@0.24.0"]);
    assert.deepEqual(pushed, ["@kinetixui/angular@0.24.0"]);
    assert.deepEqual(result.divergentRemote, [], "the core cohort's tags are none of this release's business");
  });
});
