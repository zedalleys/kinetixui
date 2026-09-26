import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classify } from "../workspace.mjs";
import { ALLOWLIST_FILE, healthyWorkspace, privatePackage, publishable } from "./fixtures.mjs";

const allowlist = ALLOWLIST_FILE.packages;
const includes = (haystack, needle, message) => assert.ok(haystack.includes(needle), message ?? `expected to find ${JSON.stringify(needle)} in:\n${haystack}`);

describe("publication classification", () => {
  it("splits the workspace into the allowlisted set and the private set", () => {
    const result = classify(healthyWorkspace(), allowlist);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      result.allowlisted.map((p) => p.name),
      ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"],
    );
    assert.deepEqual(
      result.private.map((p) => p.name),
      ["@kinetixui/web"],
    );
  });

  /**
   * The 0.23.0 incident, as a fixture.
   *
   * `@kinetixui/angular` was a repository Preview implementation. Nobody had approved it for npm,
   * but nobody had set `private: true` either, and the Changesets fixed group gave it a version —
   * so a workspace-wide publish picked it up and npm rejected it mid-release, after another
   * package had already gone out. An unapproved public package is treated as suspicious, not as
   * something to quietly leave out.
   */
  it("rejects a non-private scoped workspace package outside the publish allowlist", () => {
    const angular = {
      name: "@kinetixui/angular",
      version: "0.23.0",
      directory: "packages/ui-angular",
      manifest: { name: "@kinetixui/angular", version: "0.23.0" },
    };

    const result = classify([...healthyWorkspace(), angular], allowlist);

    assert.ok(!result.allowlisted.some((p) => p.name === "@kinetixui/angular"), "must not be publishable");
    assert.ok(!result.private.some((p) => p.name === "@kinetixui/angular"), "must not be silently excluded either");
    assert.equal(result.errors.length, 1);
    includes(result.errors[0], "@kinetixui/angular");
    includes(result.errors[0], "publish-capable but is not present in release/publish-packages.json");
    includes(result.errors[0], 'set "private": true');
    includes(result.errors[0], "No package was published.");
  });

  it("accepts the same package once it is private", () => {
    const packages = [...healthyWorkspace(), privatePackage("@kinetixui/angular", "packages/ui-angular", "0.23.0")];
    const result = classify(packages, allowlist);
    assert.deepEqual(result.errors, []);
    assert.ok(result.private.some((p) => p.name === "@kinetixui/angular"));
  });

  it("fails when an allowlisted package is private, because the two statements contradict", () => {
    const packages = healthyWorkspace().map((p) => (p.name === "@kinetixui/ui" ? privatePackage(p.name, p.directory) : p));
    includes(classify(packages, allowlist).errors.join("\n"), '@kinetixui/ui is allowlisted for npm but its package.json sets "private": true');
  });

  it("fails when the allowlist names a package the workspace does not have", () => {
    const result = classify(healthyWorkspace(), [...allowlist, { name: "@kinetixui/ghost", directory: "packages/ghost" }]);
    includes(result.errors.join("\n"), "@kinetixui/ghost is in release/publish-packages.json but is not a workspace package");
  });

  it("fails when the allowlist points at the wrong directory, because build and pack act on it", () => {
    const moved = allowlist.map((entry) => (entry.name === "@kinetixui/ui" ? { ...entry, directory: "packages/user-interface" } : entry));
    includes(classify(healthyWorkspace(), moved).errors.join("\n"), "@kinetixui/ui is at packages/ui");
  });

  it("does not care about a package's contents, only its approval and its private flag", () => {
    // A package missing every piece of publication metadata still classifies as allowlisted — the
    // metadata contract is a separate check, so its failures are reported as themselves.
    const packages = [
      publishable("@kinetixui/cli", "packages/cli"),
      { name: "@kinetixui/ui", version: "0.24.0", directory: "packages/ui", manifest: { name: "@kinetixui/ui", version: "0.24.0" } },
      publishable("@kinetixui/tokens", "packages/tokens"),
    ];
    const result = classify(packages, allowlist);
    assert.deepEqual(result.errors, []);
    assert.equal(result.allowlisted.length, 3);
  });
});
