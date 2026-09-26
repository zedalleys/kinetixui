import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { declaredTargets, validateAllowlist, validatePublishMetadata } from "../contract.mjs";
import { ALLOWLIST_FILE, ROOT_SCRIPTS, publishable } from "./fixtures.mjs";

const includes = (haystack, needle) => assert.ok(haystack.includes(needle), `expected to find ${JSON.stringify(needle)} in:\n${haystack}`);
const errorsOf = (file) => validateAllowlist(file, ROOT_SCRIPTS).errors.join("\n");

describe("the allowlist file", () => {
  it("accepts the real shape", () => {
    const result = validateAllowlist(ALLOWLIST_FILE, ROOT_SCRIPTS);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      result.packages.map((p) => p.name),
      ["@kinetixui/tokens", "@kinetixui/ui", "@kinetixui/cli"],
    );
    assert.equal(result.registry, "https://registry.npmjs.org/");
  });

  it("refuses an empty or missing package list rather than reading it as 'publish nothing'", () => {
    includes(errorsOf({ registry: "https://r/", packages: [] }), "non-empty");
    includes(errorsOf({ registry: "https://r/" }), "non-empty");
    includes(errorsOf([]), "must be a JSON object");
  });

  it("requires a registry", () => {
    includes(errorsOf({ packages: ALLOWLIST_FILE.packages }), 'needs a "registry"');
  });

  it("requires names in the @kinetixui scope", () => {
    includes(errorsOf({ ...ALLOWLIST_FILE, packages: [{ name: "lodash", directory: "packages/lodash" }] }), "@kinetixui scope");
  });

  it("catches a package listed twice", () => {
    includes(errorsOf({ ...ALLOWLIST_FILE, packages: [...ALLOWLIST_FILE.packages, ALLOWLIST_FILE.packages[0]] }), "listed twice");
  });

  it("refuses a build script the root package.json does not define", () => {
    const file = { ...ALLOWLIST_FILE, packages: [{ name: "@kinetixui/ui", directory: "packages/ui", build: ["build:nonexistent"] }] };
    includes(errorsOf(file), 'build script "build:nonexistent"');
  });

  it("refuses paths that traverse upward, and script names that are not script names", () => {
    includes(errorsOf({ ...ALLOWLIST_FILE, packages: [{ name: "@kinetixui/ui", directory: "../../etc" }] }), "repository-relative");
    includes(
      errorsOf({ ...ALLOWLIST_FILE, packages: [{ name: "@kinetixui/ui", directory: "packages/ui", build: ["build && curl evil.example"] }] }),
      "unusable build script name",
    );
    includes(
      errorsOf({ ...ALLOWLIST_FILE, packages: [{ name: "@kinetixui/ui", directory: "packages/ui", requireFiles: ["../secret"] }] }),
      "unusable requireFiles entry",
    );
  });
});

describe("publication metadata", () => {
  const ok = () => publishable("@kinetixui/ui", "packages/ui");
  const errorsFor = (pkg, options) => validatePublishMetadata(pkg, options).join("\n");

  it("passes a complete manifest", () => {
    assert.deepEqual(validatePublishMetadata(ok(), { expectedVersion: "0.24.0" }), []);
  });

  it("fails without publishConfig.access, which is how 0.23.0 reached npm and was rejected", () => {
    const pkg = ok();
    delete pkg.manifest.publishConfig.access;
    const errors = errorsFor(pkg);
    includes(errors, '"access": "public"');
    includes(errors, "402");
  });

  it("fails without provenance", () => {
    const pkg = ok();
    pkg.manifest.publishConfig.provenance = false;
    includes(errorsFor(pkg), '"provenance": true');
  });

  it("fails without a non-empty files list", () => {
    const missing = ok();
    delete missing.manifest.files;
    includes(errorsFor(missing), 'needs a non-empty "files" array');

    const empty = ok();
    empty.manifest.files = [];
    includes(errorsFor(empty), 'needs a non-empty "files" array');
  });

  it("fails without a license, a repository, or any entry point", () => {
    const pkg = ok();
    delete pkg.manifest.license;
    delete pkg.manifest.repository;
    delete pkg.manifest.exports;
    const errors = errorsFor(pkg);
    includes(errors, 'needs a "license"');
    includes(errors, 'needs a "repository"');
    includes(errors, "declares no entry point");
  });

  it("fails on a private package that reached the metadata check anyway", () => {
    const pkg = ok();
    pkg.manifest.private = true;
    includes(errorsFor(pkg), "but it is allowlisted for npm");
  });

  it("fails on a version that drifted from the rest of the published set", () => {
    const pkg = ok();
    pkg.manifest.version = "0.24.1";
    pkg.version = "0.24.1";
    includes(errorsFor(pkg, { expectedVersion: "0.24.0" }), "does not match the other allowlisted packages");
  });

  it("fails on a version that is not semver", () => {
    const pkg = ok();
    pkg.manifest.version = "next";
    includes(errorsFor(pkg), 'needs a semver "version"');
  });
});

describe("declared entry-point targets", () => {
  it("collects main, module, types, every exports leaf and every bin", () => {
    const targets = declaredTargets({
      main: "./dist/index.cjs",
      module: "./dist/index.js",
      types: "dist/index.d.ts",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./styles.css": "./dist/styles.css",
      },
      bin: { kinetixui: "./dist/cli.js" },
    });
    assert.deepEqual(targets.map((t) => t.path).sort(), [
      "dist/cli.js",
      "dist/index.cjs",
      "dist/index.d.ts",
      "dist/index.js",
      "dist/styles.css",
    ]);
  });

  it("ignores bare specifiers, which are re-exports rather than files in this tarball", () => {
    assert.deepEqual(
      declaredTargets({ exports: { ".": "react", "./x": "./dist/x.js" } }).map((t) => t.path),
      ["dist/x.js"],
    );
  });

  it("handles a string bin and a path written without the leading ./", () => {
    assert.deepEqual(
      declaredTargets({ bin: "dist/index.js" }).map((t) => t.path),
      ["dist/index.js"],
    );
  });
});
