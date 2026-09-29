/**
 * Every published package must ship a README, and the tarball is where that is decided.
 *
 * Four of the five packages reached npm with no README at all — `@kinetixui/ui`, the flagship, rendered a
 * blank page on npmjs.com for every visitor a campaign would send there. Writing four files fixed the
 * instance; this fixes the class, because "someone will notice" is what failed the first time.
 *
 * `requireFiles` is checked against the real packed tarball by `validatePackedArtifact`, so a README that
 * exists in the repository but is excluded by `files`, or lost by a build that packs from `dist/`, fails the
 * release rather than shipping. The Angular package is exactly that case: it packs from
 * `packages/ui-angular/dist`, so its README has to be copied there by ng-packagr, and only the tarball
 * check can tell whether that actually happened.
 *
 * Note this suite cannot rely on `release:preflight` to catch it: when every allowlisted version is already
 * published the plan is empty, nothing is packed, and the tarball checks never run. So the requirement is
 * asserted here, where it runs on every commit.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { escapeRegExp } from "./regexp.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validatePackedArtifact } from "../artifacts.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const allowlist = JSON.parse(readFileSync(path.join(root, "release/publish-packages.json"), "utf8"));

describe("every publishable package ships a README", () => {
  it("requires README.md in the tarball, for all of them", () => {
    for (const pkg of allowlist.packages) {
      assert.ok(
        pkg.requireFiles.includes("README.md"),
        `${pkg.name}: "README.md" is not in requireFiles, so a release could ship a blank npm page again`,
      );
    }
  });

  it("has a README on disk to ship", () => {
    for (const pkg of allowlist.packages) {
      const file = path.join(root, pkg.directory, "README.md");
      assert.ok(existsSync(file), `${pkg.name}: no README.md at ${pkg.directory}`);
      const text = readFileSync(file, "utf8");
      // A stub is the same blank page with extra steps.
      assert.ok(text.length > 400, `${pkg.name}: README.md is ${text.length} bytes — too short to be useful`);
      assert.match(text, new RegExp(`^# ${escapeRegExp(pkg.name)}|^# `), `${pkg.name}: README has no heading`);
      assert.match(text, /## /, `${pkg.name}: README has no sections`);
    }
  });

  it("says what the package is for, and how to get it, without claiming an unpublished channel", () => {
    for (const pkg of allowlist.packages) {
      const text = readFileSync(path.join(root, pkg.directory, "README.md"), "utf8");
      assert.match(text, /npm install|npx /, `${pkg.name}: README shows no way to install or run it`);
      assert.match(text, /## License|MIT/, `${pkg.name}: README does not state the licence`);
    }
  });

  /** The gate itself, exercised rather than trusted: a tarball without the README must fail. */
  it("fails a tarball that is missing it", () => {
    const manifest = {
      name: "@kinetixui/example",
      version: "1.0.0",
      publishConfig: { access: "public" },
      exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
    };
    const args = { name: "@kinetixui/example", version: "1.0.0", requireFiles: ["README.md", "dist/index.js"], manifest, manifestError: null };

    const present = validatePackedArtifact({ ...args, paths: ["README.md", "dist/index.js", "dist/index.d.ts", "package.json"] });
    assert.deepEqual(present, [], `a complete tarball should pass, got: ${present.join(" | ")}`);

    const missing = validatePackedArtifact({ ...args, paths: ["dist/index.js", "dist/index.d.ts", "package.json"] });
    assert.equal(missing.length, 1, `expected exactly one error, got: ${missing.join(" | ")}`);
    assert.match(missing[0], /requires "README\.md", which is not in the tarball/);
  });
});

/**
 * The security policy has to cover every package a release can publish.
 *
 * `SECURITY.md` listed `@kinetixui/{tokens,ui,cli}` as the in-scope packages and said nothing about
 * `@kinetixui/angular` or `@kinetixui/iot`, both of which have been published for a while. By that text, a
 * vulnerability in either was out of scope — which is the kind of gap a reporter reads as "they do not want
 * to hear about it", and the kind nobody notices because it is an absence.
 *
 * The file now says its scope follows the allowlist. This is what makes that true rather than aspirational:
 * the names in the prose are checked against the allowlist, so a sixth package cannot be published into an
 * unstated security scope.
 */
describe("the security policy covers every publishable package", () => {
  const policy = readFileSync(path.join(root, "SECURITY.md"), "utf8");

  it("names each one", () => {
    for (const pkg of allowlist.packages) {
      assert.ok(
        policy.includes(pkg.name),
        `SECURITY.md does not mention ${pkg.name}, so its scope does not cover a package that can be published`,
      );
    }
  });

  it("points at the allowlist as the source, rather than being a second list", () => {
    assert.match(
      policy,
      /release\/publish-packages\.json/,
      "SECURITY.md should name the allowlist as what defines its scope, so the prose is a restatement and not an authority",
    );
  });

  it("still says how to report privately", () => {
    assert.match(policy, /security\/advisories\/new/, "the private reporting route must stay in the policy");
  });
});
