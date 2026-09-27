/**
 * Release cohorts.
 *
 * This file began as `cohort-assumption.test.mjs`, which pinned down the engine's old rule that
 * every allowlisted package shared one version and one release commit, and was written to fail once
 * cohort support arrived. It has. The assertions are inverted rather than deleted, so the
 * invariants they protected are still visible:
 *
 *   - within a `sameVersion` cohort, version equality is still enforced — `core` has not been
 *     loosened into three independently versioned packages
 *   - between cohorts, versions and historical release commits may legitimately differ
 *   - a cohort's release never puts another cohort's packages or tags in scope
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlan, cohortPlan } from "../plan.mjs";
import { validateAllowlist } from "../contract.mjs";
import { formatPlan, planToJson, planToMarkdown } from "../report.mjs";
import { reconcileReleaseTags, TagIntegrityError } from "../tags.mjs";
import { ROOT_SCRIPTS, TWO_COHORT_ALLOWLIST, privatePackage, publishable, registryStates, twoCohortWorkspace } from "./fixtures.mjs";

const CORE_COMMIT = "a".repeat(40); // where tokens/ui/cli@0.23.0 were released
const ANGULAR_COMMIT = "b".repeat(40); // where the Angular release happens
const includes = (haystack, needle) => assert.ok(haystack.includes(needle), `expected to find ${JSON.stringify(needle)} in:\n${haystack}`);

const base = { allowlistFile: TWO_COHORT_ALLOWLIST, rootScriptNames: ROOT_SCRIPTS };
const allPublishedButAngular = registryStates({
  "@kinetixui/tokens": "published",
  "@kinetixui/ui": "published",
  "@kinetixui/cli": "published",
  "@kinetixui/angular": "unpublished",
});

describe("cohort configuration", () => {
  it("reads the groups and assigns every package to one", () => {
    const result = validateAllowlist(TWO_COHORT_ALLOWLIST, ROOT_SCRIPTS);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(Object.keys(result.groups).sort(), ["angular", "core"]);
    assert.equal(result.packages.find((p) => p.name === "@kinetixui/angular").releaseGroup, "angular");
  });

  it("rejects a package in a group that does not exist", () => {
    const file = { ...TWO_COHORT_ALLOWLIST, packages: [{ ...TWO_COHORT_ALLOWLIST.packages[0], releaseGroup: "nope" }] };
    includes(validateAllowlist(file, ROOT_SCRIPTS).errors.join("\n"), 'is in release group "nope", which "releaseGroups" does not define');
  });

  it("rejects a package with no group, rather than defaulting one", () => {
    const { releaseGroup, ...noGroup } = TWO_COHORT_ALLOWLIST.packages[0];
    const file = { ...TWO_COHORT_ALLOWLIST, packages: [noGroup] };
    includes(validateAllowlist(file, ROOT_SCRIPTS).errors.join("\n"), 'needs a "releaseGroup"');
  });

  it("rejects a missing or malformed releaseGroups block", () => {
    const { releaseGroups, ...noGroups } = TWO_COHORT_ALLOWLIST;
    includes(validateAllowlist(noGroups, ROOT_SCRIPTS).errors.join("\n"), 'needs a "releaseGroups" object');
    includes(
      validateAllowlist({ ...TWO_COHORT_ALLOWLIST, releaseGroups: { core: {} } }, ROOT_SCRIPTS).errors.join("\n"),
      'needs a boolean "sameVersion"',
    );
  });

  it("rejects a group nothing belongs to", () => {
    const file = { ...TWO_COHORT_ALLOWLIST, releaseGroups: { ...TWO_COHORT_ALLOWLIST.releaseGroups, ghost: { sameVersion: true } } };
    includes(validateAllowlist(file, ROOT_SCRIPTS).errors.join("\n"), 'release group "ghost" has no packages');
  });

  it("still catches a package listed twice", () => {
    const file = { ...TWO_COHORT_ALLOWLIST, packages: [...TWO_COHORT_ALLOWLIST.packages, TWO_COHORT_ALLOWLIST.packages[0]] };
    includes(validateAllowlist(file, ROOT_SCRIPTS).errors.join("\n"), "listed twice");
  });
});

describe("the artifact directory", () => {
  const withArtifact = (value) => ({
    ...TWO_COHORT_ALLOWLIST,
    packages: [{ ...TWO_COHORT_ALLOWLIST.packages[3], artifactDirectory: value }],
  });

  it("packs from the artifact directory while the workspace directory stays the identity", () => {
    const entry = validateAllowlist(TWO_COHORT_ALLOWLIST, ROOT_SCRIPTS).packages.find((p) => p.name === "@kinetixui/angular");
    assert.equal(entry.directory, "packages/ui-angular", "workspace identity");
    assert.equal(entry.packDirectory, "packages/ui-angular/dist", "pack root");
    assert.notEqual(entry.directory, entry.packDirectory);
  });

  it("defaults the pack root to the workspace directory when no artifact directory is given", () => {
    const entry = validateAllowlist(TWO_COHORT_ALLOWLIST, ROOT_SCRIPTS).packages.find((p) => p.name === "@kinetixui/ui");
    assert.equal(entry.artifactDirectory, null);
    assert.equal(entry.packDirectory, "packages/ui");
  });

  it("refuses path traversal", () => {
    includes(validateAllowlist(withArtifact("packages/ui-angular/../../etc"), ROOT_SCRIPTS).errors.join("\n"), 'unusable "artifactDirectory"');
    includes(validateAllowlist(withArtifact("../outside"), ROOT_SCRIPTS).errors.join("\n"), 'unusable "artifactDirectory"');
  });

  it("refuses an absolute path", () => {
    for (const value of ["/etc/passwd", "C:/Windows", "/tmp/dist"]) {
      includes(validateAllowlist(withArtifact(value), ROOT_SCRIPTS).errors.join("\n"), 'unusable "artifactDirectory"');
    }
  });

  it("refuses an artifact belonging to a different package", () => {
    includes(
      validateAllowlist(withArtifact("packages/ui/dist"), ROOT_SCRIPTS).errors.join("\n"),
      'is not inside its package directory "packages/ui-angular"',
    );
  });
});

describe("the core cohort still releases in lockstep", () => {
  it("accepts core on one version", () => {
    const plan = buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular });
    assert.deepEqual(plan.errors, []);
    assert.equal(plan.cohorts.find((c) => c.group === "core").version, "0.23.0");
  });

  /** The invariant the old file protected, unchanged — it is now scoped, not removed. */
  it("rejects core drifting apart, and names the group", () => {
    const packages = twoCohortWorkspace().map((pkg) =>
      pkg.name === "@kinetixui/cli" ? publishable(pkg.name, pkg.directory, {}, "0.24.0") : pkg,
    );
    const plan = buildPlan({ ...base, packages, registryState: allPublishedButAngular });
    assert.equal(plan.ok, false);
    const text = plan.errors.join("\n");
    includes(text, '@kinetixui/cli@0.24.0 does not match release group "core", which releases at 0.23.0');
    includes(text, "release group: core");
    includes(text, "expected:      0.23.0");
    includes(text, "actual:        0.24.0");
  });
});

describe("cohorts may hold different versions", () => {
  it("accepts core at 0.23.0 and angular at 0.24.0", () => {
    const plan = buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular });
    assert.equal(plan.ok, true);
    assert.deepEqual(
      plan.cohorts.map((c) => [c.group, c.version]),
      [
        ["angular", "0.24.0"],
        ["core", "0.23.0"],
      ],
    );
  });

  it("plans only the Angular upload, leaving core alone", () => {
    const plan = buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular });
    assert.deepEqual(
      plan.publish.map((t) => `${t.name}@${t.version}`),
      ["@kinetixui/angular@0.24.0"],
    );
    assert.deepEqual(plan.alreadyPublished.map((t) => t.name), ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
  });

  it("shows both cohorts, their versions and the artifact source", () => {
    const text = formatPlan(buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular }));
    includes(text, "ANGULAR");
    includes(text, "version: 0.24.0");
    includes(text, "@kinetixui/angular@0.24.0  \u2190 packages/ui-angular/dist");
    includes(text, "CORE");
    includes(text, "version: 0.23.0");
    includes(text, "publish:\n    none");
  });

  it("carries the cohorts into the JSON plan and the step summary", () => {
    const plan = buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular });
    const json = planToJson(plan);
    assert.deepEqual(
      json.cohorts.map((c) => ({ group: c.group, version: c.version, publish: c.publish.map((p) => p.name) })),
      [
        { group: "angular", version: "0.24.0", publish: ["@kinetixui/angular"] },
        { group: "core", version: "0.23.0", publish: [] },
      ],
    );
    const markdown = planToMarkdown(plan);
    includes(markdown, "### angular — 0.24.0");
    includes(markdown, "### core — 0.23.0");
    includes(markdown, "`packages/ui-angular/dist`");
    assert.doesNotMatch(markdown, /NPM_TOKEN|NODE_AUTH_TOKEN|npm_[A-Za-z0-9]{20}/i);
  });

  it("is deterministic", () => {
    const of = () => JSON.stringify(planToJson(buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular })));
    assert.equal(of(), of());
  });

  it("never puts a private package in a cohort", () => {
    const packages = [...twoCohortWorkspace(), privatePackage("@kinetixui/create-theme", "packages/create-theme", "0.0.0")];
    const plan = buildPlan({ ...base, packages, registryState: allPublishedButAngular });
    assert.equal(plan.ok, true);
    assert.ok(plan.cohorts.every((c) => ![...c.publish, ...c.alreadyPublished].some((t) => t.name === "@kinetixui/create-theme")));
  });
});

describe("tag reconciliation is scoped to one cohort", () => {
  const plan = () => buildPlan({ ...base, packages: twoCohortWorkspace(), registryState: allPublishedButAngular });
  const coreTags = () =>
    new Map([
      ["@kinetixui/tokens@0.23.0", CORE_COMMIT],
      ["@kinetixui/ui@0.23.0", CORE_COMMIT],
      ["@kinetixui/cli@0.23.0", CORE_COMMIT],
    ]);

  it("owes only the Angular tag for an Angular release", () => {
    const angular = cohortPlan(plan(), "angular");
    assert.deepEqual(
      [...angular.publish, ...angular.alreadyPublished].map((t) => t.name),
      ["@kinetixui/angular"],
    );
  });

  /**
   * The case the old file proved was broken. An Angular release at its own commit used to pull the
   * core cohort's tags into scope and read all three as divergent; scoped to its cohort, they are
   * simply not this release's business.
   */
  it("pushes the Angular tag and leaves the core cohort's historical tags untouched", async () => {
    const pushed = [];
    const created = [];
    const result = await reconcileReleaseTags({
      root: "/repo",
      plan: cohortPlan(plan(), "angular"),
      published: [{ name: "@kinetixui/angular", version: "0.24.0" }],
      git: {
        headCommit: async () => ANGULAR_COMMIT,
        listLocalTags: async () => new Map(),
        listRemoteTags: async () => coreTags(),
        isAncestorOfHead: async () => true,
        createTag: async ({ tag, commit }) => created.push([tag, commit]),
        pushTags: async ({ tags }) => pushed.push(...tags),
      },
    });

    assert.deepEqual(result.expected, ["@kinetixui/angular@0.24.0"]);
    assert.deepEqual(created, [["@kinetixui/angular@0.24.0", ANGULAR_COMMIT]]);
    assert.deepEqual(pushed, ["@kinetixui/angular@0.24.0"]);
    assert.deepEqual(result.divergentRemote, [], "core tags at another commit are not a divergence here");
  });

  it("reconciles the core cohort against its own release commit, not Angular's", async () => {
    const pushed = [];
    const result = await reconcileReleaseTags({
      root: "/repo",
      plan: cohortPlan(plan(), "core"),
      published: [], // core published nothing in this run
      git: {
        headCommit: async () => ANGULAR_COMMIT,
        listLocalTags: async () => new Map(),
        listRemoteTags: async () => coreTags(),
        isAncestorOfHead: async () => true,
        createTag: async () => assert.fail("core has nothing to create"),
        pushTags: async ({ tags }) => pushed.push(...tags),
      },
    });

    assert.equal(result.releaseCommit, CORE_COMMIT, "derived from core's own sibling tags, not HEAD");
    assert.deepEqual(pushed, []);
    assert.deepEqual(result.correctRemote.sort(), ["@kinetixui/cli@0.23.0", "@kinetixui/tokens@0.23.0", "@kinetixui/ui@0.23.0"]);
  });

  it("does not report the other cohort's tags as unowned noise", async () => {
    const logged = [];
    await reconcileReleaseTags({
      root: "/repo",
      plan: cohortPlan(plan(), "angular"),
      published: [{ name: "@kinetixui/angular", version: "0.24.0" }],
      log: (message) => logged.push(message),
      git: {
        headCommit: async () => ANGULAR_COMMIT,
        listLocalTags: async () => new Map(),
        listRemoteTags: async () => coreTags(),
        isAncestorOfHead: async () => true,
        createTag: async () => {},
        pushTags: async () => {},
      },
    });
    assert.deepEqual(logged.filter((line) => line.includes("ignoring")), [], "core tags were never in scope, so there is nothing to ignore");
  });

  it("still fails on a genuinely divergent Angular tag", async () => {
    const pushed = [];
    const created = [];
    await assert.rejects(
      () =>
        reconcileReleaseTags({
          root: "/repo",
          plan: cohortPlan(plan(), "angular"),
          published: [{ name: "@kinetixui/angular", version: "0.24.0" }],
          git: {
            headCommit: async () => ANGULAR_COMMIT,
            listLocalTags: async () => new Map(),
            listRemoteTags: async () => new Map([...coreTags(), ["@kinetixui/angular@0.24.0", CORE_COMMIT]]),
            isAncestorOfHead: async () => true,
            createTag: async ({ tag }) => created.push(tag),
            pushTags: async ({ tags }) => pushed.push(...tags),
          },
        }),
      (error) => {
        assert.ok(error instanceof TagIntegrityError);
        assert.deepEqual(error.divergent.map((d) => d.tag), ["@kinetixui/angular@0.24.0"]);
        assert.equal(error.divergent[0].expected, ANGULAR_COMMIT);
        assert.equal(error.divergent[0].actual, CORE_COMMIT);
        assert.doesNotMatch(error.message, /--force/);
        return true;
      },
    );
    assert.deepEqual(created, []);
    assert.deepEqual(pushed, []);
  });
});

describe("cross-cohort recovery", () => {
  /**
   * Angular is a one-package cohort, so a delayed tag recovery has no sibling tag to prove where
   * the release happened — and HEAD is not evidence once other work has landed. This is the case
   * that must fail closed rather than guess.
   */
  it("fails closed when Angular's tag is missing, HEAD has advanced and no sibling exists", async () => {
    const created = [];
    const pushed = [];
    await assert.rejects(
      () =>
        reconcileReleaseTags({
          root: "/repo",
          plan: { publish: [], alreadyPublished: [{ name: "@kinetixui/angular", version: "0.24.0" }] },
          published: [], // nothing published in this run: npm is already complete
          git: {
            headCommit: async () => "c".repeat(40), // a later, unrelated commit
            listLocalTags: async () => new Map(),
            // Core's tags exist but belong to another cohort — they must not be borrowed.
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
        assert.match(error.message, /Cannot safely determine the commit/);
        assert.match(error.message, /No tag was created or force-pushed/);
        assert.match(error.message, /Do not bump the version, and do not tag HEAD/);
        return true;
      },
    );
    assert.deepEqual(created, [], "HEAD must not be used as evidence");
    assert.deepEqual(pushed, []);
  });

  /** Both cohorts releasing from the same merge is legitimate, and does not make them one cohort. */
  it("lets two cohorts share a release commit without merging their identities", async () => {
    const shared = "d".repeat(40);
    const twoReleases = buildPlan({
      ...base,
      packages: twoCohortWorkspace({ core: "0.24.0", angular: "0.25.0" }),
      registryState: registryStates({
        "@kinetixui/tokens": "unpublished",
        "@kinetixui/ui": "unpublished",
        "@kinetixui/cli": "unpublished",
        "@kinetixui/angular": "unpublished",
      }),
    });
    assert.equal(twoReleases.ok, true);

    const pushedBy = {};
    for (const group of ["angular", "core"]) {
      const pushed = [];
      await reconcileReleaseTags({
        root: "/repo",
        plan: cohortPlan(twoReleases, group),
        published: cohortPlan(twoReleases, group).publish,
        git: {
          headCommit: async () => shared,
          listLocalTags: async () => new Map(),
          listRemoteTags: async () => new Map(),
          isAncestorOfHead: async () => true,
          createTag: async () => {},
          pushTags: async ({ tags }) => pushed.push(...tags),
        },
      });
      pushedBy[group] = pushed.sort();
    }

    assert.deepEqual(pushedBy.angular, ["@kinetixui/angular@0.25.0"]);
    assert.deepEqual(pushedBy.core, ["@kinetixui/cli@0.24.0", "@kinetixui/tokens@0.24.0", "@kinetixui/ui@0.24.0"]);
  });

  it("is a clean no-op when both cohorts are fully published and tagged", async () => {
    const plan = buildPlan({
      ...base,
      packages: twoCohortWorkspace(),
      registryState: registryStates({
        "@kinetixui/tokens": "published",
        "@kinetixui/ui": "published",
        "@kinetixui/cli": "published",
        "@kinetixui/angular": "published",
      }),
    });
    assert.deepEqual(plan.publish, []);

    for (const group of ["angular", "core"]) {
      const pushed = [];
      const result = await reconcileReleaseTags({
        root: "/repo",
        plan: cohortPlan(plan, group),
        published: [],
        git: {
          headCommit: async () => "e".repeat(40),
          listLocalTags: async () => new Map(),
          listRemoteTags: async () =>
            new Map([
              ["@kinetixui/tokens@0.23.0", CORE_COMMIT],
              ["@kinetixui/ui@0.23.0", CORE_COMMIT],
              ["@kinetixui/cli@0.23.0", CORE_COMMIT],
              ["@kinetixui/angular@0.24.0", ANGULAR_COMMIT],
            ]),
          isAncestorOfHead: async () => true,
          createTag: async () => assert.fail("nothing to create"),
          pushTags: async ({ tags }) => pushed.push(...tags),
        },
      });
      assert.deepEqual(pushed, [], `${group}: an ordinary push must not mutate tags`);
      assert.deepEqual(result.divergentRemote, []);
    }
  });
});
