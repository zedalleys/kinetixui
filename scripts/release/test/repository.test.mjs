/**
 * The other files prove the rules; this one proves this repository obeys them, against the real
 * manifests rather than fixtures. No network and no subprocess, so it runs on any pull request.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateAllowlist } from "../contract.mjs";
import { buildPlan } from "../plan.mjs";
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
