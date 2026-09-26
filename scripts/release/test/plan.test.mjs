import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlan, isNoOp } from "../plan.mjs";
import { formatPlan, planToJson, planToMarkdown } from "../report.mjs";
import { ALLOWLIST_FILE, ROOT_SCRIPTS, healthyWorkspace, privatePackage, registryStates } from "./fixtures.mjs";

const base = { allowlistFile: ALLOWLIST_FILE, rootScriptNames: ROOT_SCRIPTS };
const includes = (haystack, needle) => assert.ok(haystack.includes(needle), `expected to find ${JSON.stringify(needle)} in:\n${haystack}`);
const names = (targets) => targets.map((t) => t.name);

const allUnpublished = registryStates({
  "@kinetixui/cli": "unpublished",
  "@kinetixui/tokens": "unpublished",
  "@kinetixui/ui": "unpublished",
});
const partial = registryStates({
  "@kinetixui/tokens": "published",
  "@kinetixui/ui": "unpublished",
  "@kinetixui/cli": "unpublished",
});

describe("the publish set", () => {
  it("is every allowlisted package whose version is not yet on the registry", () => {
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: allUnpublished });
    assert.equal(plan.ok, true);
    assert.deepEqual(
      plan.publish.map((t) => `${t.name}@${t.version}`),
      ["@kinetixui/cli@0.24.0", "@kinetixui/tokens@0.24.0", "@kinetixui/ui@0.24.0"],
    );
    assert.equal(plan.version, "0.24.0");
  });

  it("never contains a private package", () => {
    const packages = [...healthyWorkspace(), privatePackage("@kinetixui/angular", "packages/ui-angular")];
    const plan = buildPlan({ ...base, packages, registryState: allUnpublished });
    assert.equal(plan.ok, true);
    assert.ok(!names(plan.publish).includes("@kinetixui/angular"));
    assert.ok(names(plan.private).includes("@kinetixui/angular"));
  });

  it("refuses to produce a plan at all when a public package is unapproved", () => {
    const angular = { name: "@kinetixui/angular", version: "0.24.0", directory: "packages/ui-angular", manifest: { name: "@kinetixui/angular", version: "0.24.0" } };
    const plan = buildPlan({ ...base, packages: [...healthyWorkspace(), angular], registryState: allUnpublished });
    assert.equal(plan.ok, false);
    includes(plan.errors.join("\n"), "@kinetixui/angular");
    assert.ok(!names(plan.publish).includes("@kinetixui/angular"));
  });
});

describe("recovery from a partial release", () => {
  /** 0.23.0, exactly: tokens went out, the publish then aborted, ui and cli never happened. */
  it("plans only the packages that are actually missing", () => {
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: partial });
    assert.equal(plan.ok, true);
    assert.deepEqual(names(plan.publish), ["@kinetixui/cli", "@kinetixui/ui"]);
    assert.deepEqual(names(plan.alreadyPublished), ["@kinetixui/tokens"]);
    assert.equal(isNoOp(plan), false);
  });

  it("says so in the human output, so completing a release is a deliberate act", () => {
    const text = formatPlan(buildPlan({ ...base, packages: healthyWorkspace(), registryState: partial }));
    includes(text, "@kinetixui/tokens@0.24.0 already published — skip");
    includes(text, "@kinetixui/ui@0.24.0 unpublished");
  });
});

describe("an empty release", () => {
  it("is a clean no-op, not a failure", () => {
    const allPublished = registryStates({ "@kinetixui/tokens": "published", "@kinetixui/ui": "published", "@kinetixui/cli": "published" });
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: allPublished });
    assert.equal(plan.ok, true);
    assert.deepEqual(plan.publish, []);
    assert.equal(isNoOp(plan), true);
    includes(formatPlan(plan), "every allowlisted version is already on the registry");
  });
});

describe("an unusable registry answer", () => {
  it("stops the release rather than treating it as unpublished", () => {
    const unknown = registryStates({ "@kinetixui/tokens": "unknown", "@kinetixui/ui": "unpublished", "@kinetixui/cli": "unpublished" });
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: unknown });
    assert.equal(plan.ok, false);
    includes(plan.errors.join("\n"), "Could not determine whether @kinetixui/tokens@0.24.0");
    includes(plan.errors.join("\n"), "No package was published.");
  });

  it("also stops when a package was never looked up", () => {
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: new Map() });
    assert.equal(plan.ok, false);
    includes(plan.errors.join("\n"), "not looked up");
  });
});

describe("planning without the registry", () => {
  it("validates the contract and lists the candidates, marked as not consulted", () => {
    const plan = buildPlan({ ...base, packages: healthyWorkspace() });
    assert.equal(plan.ok, true);
    assert.equal(plan.registryConsulted, false);
    assert.equal(plan.publish.length, 3);
    const text = formatPlan(plan);
    includes(text, "registry not consulted");
    includes(text, "@kinetixui/ui@0.24.0 unknown");
  });
});

describe("the machine-readable plan", () => {
  it("carries the three sets and nothing else", () => {
    const plan = buildPlan({ ...base, packages: healthyWorkspace(), registryState: partial });
    assert.deepEqual(planToJson(plan), {
      ok: true,
      version: "0.24.0",
      registry: "https://registry.npmjs.org/",
      registryConsulted: true,
      publish: [
        { name: "@kinetixui/cli", version: "0.24.0" },
        { name: "@kinetixui/ui", version: "0.24.0" },
      ],
      alreadyPublished: [{ name: "@kinetixui/tokens", version: "0.24.0" }],
      private: [{ name: "@kinetixui/web", version: "0.1.0" }],
      errors: [],
    });
  });

  it("is deterministic across runs", () => {
    const of = () => JSON.stringify(planToJson(buildPlan({ ...base, packages: healthyWorkspace(), registryState: allUnpublished })));
    assert.equal(of(), of());
  });

  it("orders the human output deterministically regardless of workspace order", () => {
    const a = formatPlan(buildPlan({ ...base, packages: healthyWorkspace(), registryState: allUnpublished }));
    const b = formatPlan(buildPlan({ ...base, packages: healthyWorkspace().reverse(), registryState: allUnpublished }));
    assert.equal(a, b);
  });
});

describe("the step summary", () => {
  it("names the publishing, already-published and private sets, and no credentials", () => {
    const packages = [...healthyWorkspace(), privatePackage("@kinetixui/angular", "packages/ui-angular")];
    const markdown = planToMarkdown(buildPlan({ ...base, packages, registryState: partial }));
    includes(markdown, "### Already published");
    includes(markdown, "`@kinetixui/tokens@0.24.0`");
    includes(markdown, "### Publishing");
    includes(markdown, "`@kinetixui/ui@0.24.0`");
    includes(markdown, "### Private / excluded");
    includes(markdown, "`@kinetixui/angular@0.24.0`");
    // Credential shapes, not the word "token" — @kinetixui/tokens is a package name.
    assert.doesNotMatch(markdown, /NPM_TOKEN|NODE_AUTH_TOKEN|authorization|npm_[A-Za-z0-9]{20}|\/\/.*:_authToken/i);
  });
});
