/**
 * What a release run turns into GitHub Releases, decided without a network or a `gh` binary.
 *
 * The behaviour worth pinning is mostly about what must NOT happen: no Release for a tag this run only
 * repaired, no Release dated today for a version that shipped months ago, no edit to a Release that
 * already exists, and no failure loud enough to break a release that has already published.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReleases, releasesOwed } from "../github-releases.mjs";

const summary = {
  publishedAt: "2026-09-28T19:00:00.000Z",
  published: [
    { name: "@kinetixui/tokens", version: "0.24.0", releaseGroup: "core" },
    { name: "@kinetixui/ui", version: "0.24.0", releaseGroup: "core" },
  ],
  cohorts: [
    { group: "core", pushed: ["@kinetixui/tokens@0.24.0", "@kinetixui/ui@0.24.0"], releaseCommit: "abc1234567" },
    { group: "iot", pushed: [], releaseCommit: null },
  ],
};

/** A fake `gh`: records what it was asked, and answers however the test needs. */
function fakeGh({ existing = [], failOn = [] } = {}) {
  const calls = [];
  const run = (args) => {
    calls.push(args);
    if (args[1] === "view") return { status: existing.includes(args[2]) ? 0 : 1, stdout: "", stderr: "release not found" };
    if (args[1] === "create") return failOn.includes(args[2]) ? { status: 1, stderr: "HTTP 403" } : { status: 0, stdout: "" };
    return { status: 0 };
  };
  return { run, calls };
}

describe("which GitHub Releases a run owes", () => {
  it("creates one per package this run actually published", () => {
    assert.deepEqual(
      releasesOwed(summary).map((r) => r.tag),
      ["@kinetixui/tokens@0.24.0", "@kinetixui/ui@0.24.0"],
    );
  });

  it("owes nothing when the run published nothing, even if it pushed repair tags", () => {
    // reconcileReleaseTags pushes a missing tag for an EARLIER release on purpose — that is how a failed
    // tag step is repaired. Those tags must not become Releases dated today.
    const repairOnly = {
      published: [],
      cohorts: [{ group: "core", pushed: ["@kinetixui/ui@0.20.0"], releaseCommit: "deadbeef00" }],
    };
    assert.deepEqual(releasesOwed(repairOnly), []);
  });

  it("ignores a pushed tag with no matching published package", () => {
    const mixed = {
      published: [{ name: "@kinetixui/iot", version: "0.3.0", releaseGroup: "iot" }],
      cohorts: [{ group: "iot", pushed: ["@kinetixui/iot@0.3.0", "@kinetixui/angular@0.9.0"], releaseCommit: "c0ffee1234" }],
    };
    assert.deepEqual(releasesOwed(mixed).map((r) => r.tag), ["@kinetixui/iot@0.3.0"]);
  });

  it("writes notes that point at the changelog and the exact published version", () => {
    const [first] = releasesOwed(summary);
    assert.match(first.notes, /kinetixui\.com\/docs\/changelog/);
    assert.match(first.notes, /npmjs\.com\/package\/@kinetixui\/tokens\/v\/0\.24\.0/);
    assert.equal(first.title, "@kinetixui/tokens@0.24.0");
  });

  it("tolerates a summary with no cohorts at all", () => {
    assert.deepEqual(releasesOwed({ published: [], cohorts: undefined }), []);
  });
});

describe("creating them", () => {
  it("creates each missing one, verifying the tag rather than letting gh invent it", () => {
    const gh = fakeGh();
    const result = createReleases(releasesOwed(summary), { run: gh.run, log: () => {} });
    assert.deepEqual(result.created, ["@kinetixui/tokens@0.24.0", "@kinetixui/ui@0.24.0"]);
    assert.equal(result.failed.length, 0);
    for (const call of gh.calls.filter((c) => c[1] === "create")) {
      assert.ok(call.includes("--verify-tag"), "every create must verify the tag already exists");
    }
  });

  it("leaves an existing Release completely alone — no edit, no replace", () => {
    const gh = fakeGh({ existing: ["@kinetixui/tokens@0.24.0"] });
    const result = createReleases(releasesOwed(summary), { run: gh.run, log: () => {} });
    assert.deepEqual(result.skipped, ["@kinetixui/tokens@0.24.0"]);
    assert.deepEqual(result.created, ["@kinetixui/ui@0.24.0"]);
    const verbs = gh.calls.map((c) => c[1]);
    assert.ok(!verbs.includes("edit") && !verbs.includes("delete"), "an existing Release must not be touched");
  });

  it("reports a failure instead of throwing, so a published release is never failed by cosmetics", () => {
    const gh = fakeGh({ failOn: ["@kinetixui/ui@0.24.0"] });
    const result = createReleases(releasesOwed(summary), { run: gh.run, log: () => {} });
    assert.deepEqual(result.created, ["@kinetixui/tokens@0.24.0"]);
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0].detail, /403/);
  });

  it("treats an unreadable probe as 'already exists' rather than creating a duplicate", () => {
    // `gh release view` failing for a reason other than absence (rate limit, auth) must not be read as
    // "so create it" — a duplicate Release is worse than a missing one.
    const run = (args) => (args[1] === "view" ? { status: 0, stdout: "{}" } : { status: 0 });
    const result = createReleases(releasesOwed(summary), { run, log: () => {} });
    assert.equal(result.created.length, 0);
    assert.equal(result.skipped.length, 2);
  });
});
