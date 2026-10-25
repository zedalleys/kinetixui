/**
 * The pull-request-side half of the curated-release-note prerequisite.
 *
 * `scripts/version-release-meta.mjs` throws `Missing curated release notes` when
 * `release/notes/<core-version>.json` is absent, and it runs only on push to `main`. These cases
 * assert that `releaseNoteStatus` answers the same question from a checkout, so the requirement is
 * visible on the pull request instead of after the merge.
 *
 * Every case is a fresh temporary workspace: nothing here reads or writes this repository, and
 * nothing touches the network or the registry. The Changesets options that decide which packages
 * move are copied from the repository's own `.changeset/config.json`, so a config change that
 * altered the cohort would fail these tests rather than pass them quietly.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { releaseNoteStatus, formatStatus } from "../check-release-note.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const repoConfig = JSON.parse(readFileSync(path.join(repoRoot, ".changeset/config.json"), "utf8"));

/**
 * A workspace shaped like this one: the core cohort in lockstep, Angular versioned independently.
 *
 * @param {object} options
 * @param {string} options.ui            the current `@kinetixui/ui` version
 * @param {string[]} options.changesets  raw changeset bodies, without front-matter fences
 * @param {string[]} options.releases    versions already listed in releases.ts
 * @param {Record<string,object>} options.notes  curated notes, keyed by file basename
 */
function workspace({ ui, changesets = [], releases = [], notes = {} }) {
  const root = mkdtempSync(path.join(tmpdir(), "release-note-"));
  const write = (rel, body) => {
    mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  };

  for (const [name, version] of [
    ["ui", ui],
    ["tokens", ui],
    ["cli", ui],
  ]) {
    write(`packages/${name}/package.json`, JSON.stringify({ name: `@kinetixui/${name}`, version }));
  }
  write("packages/angular/package.json", JSON.stringify({ name: "@kinetixui/angular", version: "0.26.1" }));

  write(
    ".changeset/config.json",
    JSON.stringify({
      fixed: repoConfig.fixed,
      linked: repoConfig.linked,
      ignore: repoConfig.ignore,
    }),
  );
  changesets.forEach((body, i) => write(`.changeset/case-${i}.md`, body));

  write(
    "apps/web/src/lib/releases.ts",
    `export const RELEASES: Release[] = [\n${releases.map((v) => `  {\n    version: "${v}",\n  },`).join("\n")}\n];\n`,
  );
  for (const [name, note] of Object.entries(notes)) {
    write(`release/notes/${name}`, JSON.stringify(note));
  }
  return root;
}

/** A changeset body bumping one package. */
const bump = (pkg, kind) => `---\n"${pkg}": ${kind}\n---\n\na change\n`;

function check(options) {
  const root = workspace(options);
  try {
    const status = releaseNoteStatus(root);
    // Every status must have a report; a reason with no wording is a half-finished branch.
    assert.equal(typeof formatStatus(status), "string");
    return status;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("releaseNoteStatus", () => {
  it("asks for nothing when no changeset is pending", () => {
    const status = check({ ui: "0.26.0", releases: ["0.26.0"] });
    assert.deepEqual([status.ok, status.version, status.reason], [true, null, "no-core-move"]);
  });

  it("asks for nothing when the only changeset is Angular's", () => {
    const status = check({
      ui: "0.26.0",
      changesets: [bump("@kinetixui/angular", "patch")],
      releases: ["0.26.0"],
    });
    assert.deepEqual([status.ok, status.version, status.reason], [true, null, "no-core-move"]);
  });

  it("names the patch version a core patch would publish, and fails when its note is absent", () => {
    const status = check({ ui: "0.26.0", changesets: [bump("@kinetixui/ui", "patch")], releases: ["0.26.0"] });
    assert.deepEqual(
      [status.ok, status.version, status.file, status.reason],
      [false, "0.26.1", "release/notes/0.26.1.json", "missing"],
    );
  });

  it("names the minor version a core minor would publish", () => {
    const status = check({ ui: "0.26.0", changesets: [bump("@kinetixui/ui", "minor")], releases: ["0.26.0"] });
    assert.deepEqual([status.ok, status.version, status.reason], [false, "0.27.0", "missing"]);
  });

  it("takes the highest bump when several changesets are pending", () => {
    const status = check({
      ui: "0.26.0",
      changesets: [bump("@kinetixui/ui", "patch"), bump("@kinetixui/ui", "minor"), bump("@kinetixui/tokens", "patch")],
      releases: ["0.26.0"],
    });
    assert.equal(status.version, "0.27.0");
  });

  it("passes when the curated note is present and describes that version", () => {
    const status = check({
      ui: "0.26.0",
      changesets: [bump("@kinetixui/ui", "patch")],
      releases: ["0.26.0"],
      notes: { "0.26.1.json": { version: "0.26.1", title: "a release" } },
    });
    assert.deepEqual([status.ok, status.reason], [true, "present"]);
  });

  it("fails when the note describes a different version than the one planned", () => {
    const status = check({
      ui: "0.26.0",
      changesets: [bump("@kinetixui/ui", "patch")],
      releases: ["0.26.0"],
      notes: { "0.26.1.json": { version: "0.26.2", title: "a release" } },
    });
    assert.deepEqual([status.ok, status.reason, status.declared], [false, "wrong-version", "0.26.2"]);
  });

  it("asks for no note when releases.ts already carries the planned version, as version-release-meta.mjs does not", () => {
    const status = check({
      ui: "0.26.0",
      changesets: [bump("@kinetixui/ui", "patch")],
      releases: ["0.26.1", "0.26.0"],
    });
    assert.deepEqual([status.ok, status.reason], [true, "already-in-releases"]);
  });

  it("would have caught 0.26.0: a 0.25.0 core with two pending changesets and no note", () => {
    // The shape of `main` the moment #442 merged, which left the release red on every later push.
    const status = check({
      ui: "0.25.0",
      changesets: [bump("@kinetixui/ui", "minor"), bump("@kinetixui/angular", "patch")],
      releases: ["0.25.0"],
    });
    assert.deepEqual(
      [status.ok, status.version, status.file],
      [false, "0.26.0", "release/notes/0.26.0.json"],
    );
  });
});
