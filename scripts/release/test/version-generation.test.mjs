/**
 * What `changeset version` actually does to a peer range, run for real.
 *
 * `peers.test.mjs` asserts the invariant the repository wants. This file asserts that the tool
 * generating the Version Packages PR agrees — by building a throwaway workspace, running the
 * installed `@changesets/cli` in it, and reading the manifests back.
 *
 * It exists because of the shape of the fix. The behaviour is governed by
 * `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange`, whose
 * name is a promise that it can change in a patch release. A config key that might quietly change
 * meaning is only dangerous while the change would be quiet, so the fixtures below are built from
 * the repository's *own* `.changeset/config.json`: remove the option and these tests fail, and a
 * Changesets upgrade that redefines it fails them too — on the pull request that does it.
 *
 * Nothing here touches the repository, the network or the registry. Each case is a fresh temporary
 * directory with four manifests in it.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plannedVersions } from "../peers.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const config = JSON.parse(readFileSync(path.join(root, ".changeset/config.json"), "utf8"));
const changesetsBin = path.join(root, "node_modules/@changesets/cli/bin.js");

/** The fixture's cohort, standing in for the repository's `fixed` core group. */
const FIXED = ["@fx/tokens", "@fx/ui"];

/**
 * A workspace shaped like this one: a lockstep cohort, and an independently versioned package that
 * declares a literal peer range on the cohort's token package and builds against it through a
 * `workspace:*` devDependency.
 *
 * The Changesets options that decide dependency rewriting are copied from the repository's config
 * rather than restated, so the fixture cannot drift from what a real release would do.
 */
function fixture({ dir, tokens, dependent, peer, bump }) {
  for (const name of ["tokens", "ui", "dependent"]) mkdirSync(path.join(dir, "packages", name), { recursive: true });
  mkdirSync(path.join(dir, ".changeset"), { recursive: true });

  const write = (file, value) => writeFileSync(path.join(dir, file), `${JSON.stringify(value, null, 2)}\n`);
  write("package.json", { name: "fixture-root", private: true, version: "0.0.0" });
  writeFileSync(path.join(dir, "pnpm-workspace.yaml"), 'packages:\n  - "packages/*"\n');
  write(".changeset/config.json", {
    // `false` because the fixture has no node_modules for a changelog module to be resolved from.
    // It changes what gets written to CHANGELOG.md, not how dependency ranges are computed.
    changelog: false,
    commit: false,
    fixed: [FIXED],
    linked: [],
    access: "public",
    baseBranch: "main",
    ignore: [],
    updateInternalDependencies: config.updateInternalDependencies,
    ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: config.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
  });
  write("packages/tokens/package.json", { name: "@fx/tokens", version: tokens });
  write("packages/ui/package.json", { name: "@fx/ui", version: tokens, dependencies: { "@fx/tokens": "workspace:*" } });
  write("packages/dependent/package.json", {
    name: "@fx/dependent",
    version: dependent,
    peerDependencies: { "@fx/tokens": peer },
    devDependencies: { "@fx/tokens": "workspace:*" },
  });
  writeFileSync(path.join(dir, ".changeset/bump.md"), `---\n"@fx/tokens": ${bump}\n---\n\na change\n`);

  const read = (name) => JSON.parse(readFileSync(path.join(dir, "packages", name, "package.json"), "utf8"));
  // What the dependent's published artifact says, captured before generation. Comparing against this
  // is the parity check: no tag, no registry, no network — the state that shipped is right here.
  const shipped = read("dependent");

  execFileSync(process.execPath, [changesetsBin, "version"], { cwd: dir, stdio: "pipe", windowsHide: true });

  const after = { tokens: read("tokens"), ui: read("ui"), dependent: read("dependent") };
  return {
    tokens: after.tokens.version,
    ui: after.ui.version,
    dependent: after.dependent.version,
    peer: after.dependent.peerDependencies["@fx/tokens"],
    shipped,
    regenerated: after.dependent,
    /** The same release, as `peers.mjs` predicted it before the tool ran. */
    predicted: plannedVersions({
      packages: [
        { name: "@fx/tokens", version: tokens },
        { name: "@fx/ui", version: tokens },
        { name: "@fx/dependent", version: dependent },
      ],
      changesets: [{ id: "bump", releases: [{ name: "@fx/tokens", type: bump }] }],
      fixed: [FIXED],
    }),
  };
}

let workdir;
const cases = new Map();

/** One temporary root for the whole file, one subdirectory per case. */
const generate = (name, options) => {
  const dir = path.join(workdir, name);
  mkdirSync(dir, { recursive: true });
  const result = fixture({ dir, ...options });
  cases.set(name, result);
  return result;
};

describe("`changeset version` and peer ranges", () => {
  before(() => {
    assert.ok(
      existsSync(changesetsBin),
      `@changesets/cli is not installed at ${changesetsBin}. This suite asserts what the real tool does, ` +
        `so it cannot be skipped into a pass — run \`pnpm install\`.`,
    );
    workdir = mkdtempSync(path.join(tmpdir(), "kinetixui-changesets-"));
    generate("compatible-patch", { tokens: "0.23.2", dependent: "0.24.0", peer: "^0.23.0", bump: "patch" });
    generate("compatible-minor", { tokens: "0.23.2", dependent: "0.24.0", peer: ">=0.23.0 <0.25.0", bump: "minor" });
    generate("out-of-range-minor", { tokens: "0.23.2", dependent: "0.24.0", peer: "^0.23.0", bump: "minor" });
    generate("out-of-range-major", { tokens: "1.4.7", dependent: "2.0.0", peer: "~1.4.0", bump: "minor" });
  });

  after(() => {
    if (workdir) rmSync(workdir, { recursive: true, force: true });
  });

  it("is configured to leave in-range peer ranges alone", () => {
    // Asserted directly as well as behaviourally, so a failure below has a legible cause.
    assert.equal(
      config.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH?.onlyUpdatePeerDependentsWhenOutOfRange,
      true,
      ".changeset/config.json must set onlyUpdatePeerDependentsWhenOutOfRange — without it, every core " +
        "patch rewrites @kinetixui/angular's token peer on a package it is not releasing.",
    );
  });

  /** Case A, end to end: the bug this fix exists for, in the tool that caused it. */
  it("leaves a compatible patch's peer range exactly as declared", () => {
    const result = cases.get("compatible-patch");
    assert.equal(result.tokens, "0.23.3", "the token package should take the patch");
    assert.equal(result.peer, "^0.23.0", "the peer range accepted 0.23.3 already and must not be rewritten");
    assert.equal(result.dependent, "0.24.0", "the dependent is not being released and must not move");
  });

  /** Case B: a minor a wider range already covers is no different from a patch. */
  it("leaves a compatible minor's peer range exactly as declared", () => {
    const result = cases.get("compatible-minor");
    assert.equal(result.tokens, "0.24.0");
    assert.equal(result.peer, ">=0.23.0 <0.25.0", "the range spans the new minor, so nothing is owed");
    assert.equal(result.dependent, "0.24.0");
  });

  /**
   * Case C: the range is *not* frozen when it stops being true.
   *
   * This is the counter-assertion that keeps the fix honest. If the configuration merely preserved
   * peer ranges, this would still read `^0.23.0` — a package silently claiming compatibility with a
   * token version nobody checked it against. Changesets rewrites it, and `release:check` fails
   * before that happens (see peers.test.mjs), which is the deliberate-action requirement.
   */
  it("still rewrites a peer range the new version falls outside of", () => {
    const result = cases.get("out-of-range-minor");
    assert.equal(result.tokens, "0.24.0");
    assert.equal(result.peer, "^0.24.0", "out of range, so the range must move — nothing here is frozen");
    assert.notEqual(result.dependent, "0.24.0", "and the dependent is bumped to carry the new claim");
  });

  it("does the same on a 1.x line, where the tilde is what pins", () => {
    const result = cases.get("out-of-range-major");
    assert.equal(result.tokens, "1.5.0");
    assert.equal(result.peer, "~1.5.0");
    assert.notEqual(result.dependent, "2.0.0");
  });

  /**
   * Published-artifact parity, without a registry or a git tag.
   *
   * A package that is not part of a release has an artifact on npm that can no longer be changed, so
   * an unrelated core release must leave its manifest exactly as that artifact describes it. The
   * fixture holds both states — the manifest as it was before generation *is* the shipped one — so
   * this compares them directly rather than inferring parity from a tag that a shallow checkout would
   * make it skip.
   */
  it("leaves the manifest of a package outside the release byte-identical", () => {
    for (const name of ["compatible-patch", "compatible-minor"]) {
      const result = cases.get(name);
      assert.deepEqual(
        result.regenerated,
        result.shipped,
        `${name}: version generation changed a package it is not releasing — the repository would then ` +
          `describe an artifact that is already on npm and cannot be republished`,
      );
    }
  });

  /** The two halves of the fix have to agree about what a release publishes. */
  it("agrees with the version `peers.mjs` planned, in every case", () => {
    assert.ok(cases.size >= 4, "the fixtures must actually have run");
    for (const [name, result] of cases) {
      assert.equal(result.predicted.get("@fx/tokens"), result.tokens, `${name}: planned token version`);
      assert.equal(result.predicted.get("@fx/ui"), result.ui, `${name}: the cohort moves together`);
      assert.equal(result.predicted.has("@fx/dependent"), false, `${name}: a dependent-only bump is not planned here`);
    }
  });
});
