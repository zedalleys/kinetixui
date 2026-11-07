/**
 * Release-note coverage: the model, and the five ways it has to be able to fail.
 *
 * Every negative control here is paired with the positive control it is a mutation of — one tree,
 * one edit, two verdicts. A control that fails for its own reason (a SyntaxError, a missing file, a
 * cohort that was never in the release) proves nothing about the gate, so each assertion names the
 * finding `kind` it expects rather than only checking a non-zero exit.
 *
 * The pure half is exercised directly. The end-to-end half builds a throwaway git repository and
 * runs the real CLI in it, because base-branch attribution cannot be tested any other way: it reads
 * another commit's tree.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERAGE_KEY, attributeToBase, planCohorts, readCohorts, validateCoverage } from "../note-coverage.mjs";

const repo = fileURLToPath(new URL("../../../", import.meta.url));

/* ------------------------------------------------------------------ a workspace to plan against */

/** The real cohort definitions, trimmed to what this file needs, with the real group names. */
const ALLOWLIST = {
  releaseGroups: { core: { sameVersion: true }, angular: { sameVersion: true }, iot: { sameVersion: true } },
  packages: [
    { name: "@kinetixui/tokens", releaseGroup: "core", directory: "packages/tokens" },
    { name: "@kinetixui/ui", releaseGroup: "core", directory: "packages/ui" },
    { name: "@kinetixui/cli", releaseGroup: "core", directory: "packages/cli" },
    { name: "@kinetixui/angular", releaseGroup: "angular", directory: "packages/ui-angular" },
    { name: "@kinetixui/iot", releaseGroup: "iot", directory: "packages/iot" },
  ],
};

const CONFIG = { fixed: [["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]], linked: [], ignore: ["@kinetixui/web", "@kinetixui/docs"] };

const workspace = (versions = {}) =>
  [
    { name: "@kinetixui/tokens", version: versions.core ?? "0.27.0" },
    { name: "@kinetixui/ui", version: versions.core ?? "0.27.0" },
    { name: "@kinetixui/cli", version: versions.core ?? "0.27.0" },
    { name: "@kinetixui/angular", version: versions.angular ?? "0.26.2" },
    { name: "@kinetixui/iot", version: versions.iot ?? "0.5.0" },
    { name: "@kinetixui/web", version: "0.0.0" },
  ].map((pkg) => ({ ...pkg, directory: `packages/${pkg.name.split("/")[1]}`, manifest: {} }));

const changeset = (id, releases) => ({ id, releases });
const plan = (changesets, versions) =>
  planCohorts({ allowlistFile: ALLOWLIST, packages: workspace(versions), changesets, changesetConfig: CONFIG });

const kinds = (result) => result.findings.map((finding) => finding.kind).sort();
const finding = (result, kind) => result.findings.find((entry) => entry.kind === kind);

describe("release cohorts, planned from the changesets a merge would carry", () => {
  it("attributes a changeset to the cohort of the package it names, and moves the fixed group as one", () => {
    const result = plan([changeset("tidy-metric", [{ name: "@kinetixui/ui", type: "minor" }])]);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      result.cohorts.map(({ cohort, version, changesets }) => ({ cohort, version, changesets })),
      [{ cohort: "core", version: "0.28.0", changesets: ["tidy-metric"] }],
    );
    assert.deepEqual(result.cohorts[0].packages, ["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"], "the fixed group moves together");
  });

  it("consumes one changeset into two cohorts when it names a package in each", () => {
    const result = plan([
      changeset("shared-metric-fix", [
        { name: "@kinetixui/ui", type: "patch" },
        { name: "@kinetixui/angular", type: "patch" },
      ]),
    ]);
    assert.deepEqual(
      result.cohorts.map(({ cohort, version, changesets }) => ({ cohort, version, changesets })),
      [
        { cohort: "angular", version: "0.26.3", changesets: ["shared-metric-fix"] },
        { cohort: "core", version: "0.27.1", changesets: ["shared-metric-fix"] },
      ],
      "a change that ships on two release lines is owed a description by both",
    );
  });

  it("reports a changeset that names no published package rather than requiring coverage for it", () => {
    const result = plan([
      changeset("site-only", [{ name: "@kinetixui/web", type: "patch" }]),
      changeset("real", [{ name: "@kinetixui/iot", type: "minor" }]),
    ]);
    assert.deepEqual(result.unattributed, ["site-only"]);
    assert.deepEqual(result.cohorts.map((entry) => entry.cohort), ["iot"]);
  });

  it("refuses to plan a sameVersion cohort whose members disagree", () => {
    const drifted = workspace().map((pkg) => (pkg.name === "@kinetixui/cli" ? { ...pkg, version: "0.26.0" } : pkg));
    const result = planCohorts({
      allowlistFile: ALLOWLIST,
      packages: drifted,
      // No `fixed` group, so nothing converges the drifted member and the cohort plans two versions.
      changesetConfig: { ...CONFIG, fixed: [] },
      changesets: [
        changeset("a", [{ name: "@kinetixui/ui", type: "patch" }]),
        changeset("b", [{ name: "@kinetixui/cli", type: "patch" }]),
      ],
    });
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /sameVersion but its members plan different versions/);
    assert.match(result.errors[0], /0\.26\.1 \(@kinetixui\/cli\)/);
  });

  it("fails closed on an allowlist it cannot map to cohorts", () => {
    assert.match(readCohorts(null).errors[0], /is not an object/);
    assert.match(readCohorts({ releaseGroups: {} }).errors[0], /no `packages` array/);
    assert.match(readCohorts({ releaseGroups: { core: {} }, packages: [{ name: "x" }] }).errors[0], /no string `releaseGroup`/);
    assert.match(
      readCohorts({ releaseGroups: { core: {} }, packages: [{ name: "x", releaseGroup: "nope" }] }).errors[0],
      /not in `releaseGroups`/,
    );
  });
});

/* ------------------------------------------------------------------- the gate, and its controls */

/** A release with two cohorts and three changesets — the shape the controls below mutate. */
const RELEASE = plan([
  changeset("rating-radio", [{ name: "@kinetixui/ui", type: "minor" }]),
  changeset("metric-wrap", [
    { name: "@kinetixui/ui", type: "patch" },
    { name: "@kinetixui/angular", type: "patch" },
  ]),
  changeset("tokens-preset", [{ name: "@kinetixui/tokens", type: "patch" }]),
]);

const PENDING = ["metric-wrap", "rating-radio", "tokens-preset"];

/** The note that covers it exactly. Every control is this object with one field changed. */
const covering = () => ({
  version: "0.28.0",
  summary: "two cohorts",
  breaking: [],
  changes: [],
  coverage: [
    { cohort: "core", version: "0.28.0", changesets: ["metric-wrap", "rating-radio", "tokens-preset"] },
    { cohort: "angular", version: "0.26.3", changesets: ["metric-wrap"] },
  ],
});

const check = (note, cohorts = RELEASE.cohorts) =>
  validateCoverage({ note, cohorts, pendingIds: PENDING, notePath: "release/notes/0.28.0.json" });

describe("curated release-note coverage", () => {
  it("plans the release the controls are about", () => {
    assert.deepEqual(RELEASE.errors, []);
    assert.deepEqual(
      RELEASE.cohorts.map(({ cohort, version, changesets }) => ({ cohort, version, changesets })),
      [
        { cohort: "angular", version: "0.26.3", changesets: ["metric-wrap"] },
        { cohort: "core", version: "0.28.0", changesets: ["metric-wrap", "rating-radio", "tokens-preset"] },
      ],
    );
  });

  it("POSITIVE CONTROL — a note whose declared set equals the consumed set passes", () => {
    const result = check(covering());
    assert.deepEqual(result.errors, [], result.errors.join("\n"));
    assert.ok(result.ok);
    assert.deepEqual(result.declaredCohorts.sort(), ["angular", "core"]);
  });

  it("NC-1 — one consumed changeset omitted", () => {
    const note = covering();
    note.coverage[0].changesets = ["metric-wrap", "tokens-preset"]; // rating-radio dropped
    const result = check(note);
    assert.equal(result.ok, false);
    assert.deepEqual(kinds(result), ["changesets-missing"]);
    assert.deepEqual(finding(result, "changesets-missing").ids, ["rating-radio"]);
    assert.equal(finding(result, "changesets-missing").cohort, "core");
    assert.match(result.errors[0], /"rating-radio"/);
  });

  it("NC-2 — a stale id, and an id that belongs to the other cohort, are both extraneous and told apart", () => {
    const note = covering();
    note.coverage[0].changesets.push("deleted-last-release");
    note.coverage[1].changesets.push("rating-radio"); // pending, but core's, not angular's
    const result = check(note);
    assert.equal(result.ok, false);
    assert.deepEqual(kinds(result), ["changesets-extraneous", "changesets-extraneous"]);
    const core = result.findings.find((entry) => entry.cohort === "core");
    const angular = result.findings.find((entry) => entry.cohort === "angular");
    assert.deepEqual(core.ids, ["deleted-last-release"]);
    assert.match(core.message, /"deleted-last-release" \(no such pending changeset\)/);
    assert.deepEqual(angular.ids, ["rating-radio"]);
    assert.match(angular.message, /"rating-radio" \(pending, but not consumed by "angular"\)/);
  });

  it("NC-3 — the wrong release cohort is covered", () => {
    const note = covering();
    note.coverage[1].cohort = "iot"; // iot is not in this release at all
    const result = check(note);
    assert.equal(result.ok, false);
    assert.deepEqual(kinds(result), ["cohort-not-in-release", "cohort-uncovered"]);
    assert.match(finding(result, "cohort-not-in-release").message, /this release does not publish "iot"/);
    assert.match(finding(result, "cohort-not-in-release").message, /It publishes: angular@0\.26\.3, core@0\.28\.0/);
    assert.equal(finding(result, "cohort-uncovered").cohort, "angular");
  });

  it("NC-4 — the note exists and is otherwise valid, but carries no coverage metadata", () => {
    const { coverage, ...note } = covering();
    assert.ok(coverage, "the control must start from a note that did have coverage");
    const result = check(note);
    assert.equal(result.ok, false);
    assert.deepEqual(kinds(result), ["coverage-absent"]);
    // The diagnostic has to be actionable: it prints the block the author needs, per cohort.
    assert.match(result.errors[0], /"cohort": "core", "version": "0\.28\.0", "changesets": \["metric-wrap", "rating-radio", "tokens-preset"\]/);
    assert.match(result.errors[0], /"cohort": "angular", "version": "0\.26\.3", "changesets": \["metric-wrap"\]/);
    assert.match(result.errors[0], /check:release-note/, "it must point at the presence gate rather than duplicate it");
  });

  it("NC-5 — two cohorts on the same number, swapped", () => {
    // Core and Angular both land on 0.27.0: the case where a note keyed by a version number alone
    // cannot tell which release line it describes.
    const collided = plan(
      [
        changeset("core-change", [{ name: "@kinetixui/ui", type: "patch" }]),
        changeset("angular-change", [{ name: "@kinetixui/angular", type: "minor" }]),
      ],
      { core: "0.27.0", angular: "0.26.9" },
    );
    assert.deepEqual(
      collided.cohorts.map(({ cohort, version }) => `${cohort}@${version}`),
      ["angular@0.27.0", "core@0.27.1"],
      "the planner must put both cohorts on a number the other also uses or has used",
    );

    const right = {
      version: "0.27.1",
      coverage: [
        { cohort: "core", version: "0.27.1", changesets: ["core-change"] },
        { cohort: "angular", version: "0.27.0", changesets: ["angular-change"] },
      ],
    };
    const ok = validateCoverage({ note: right, cohorts: collided.cohorts, pendingIds: ["angular-change", "core-change"] });
    assert.deepEqual(ok.errors, [], "the gate must accept two cohorts whose numbers are adjacent and confusable");

    const swapped = {
      version: "0.27.1",
      coverage: [
        { cohort: "core", version: "0.27.1", changesets: ["angular-change"] },
        { cohort: "angular", version: "0.27.0", changesets: ["core-change"] },
      ],
    };
    const bad = validateCoverage({ note: swapped, cohorts: collided.cohorts, pendingIds: ["angular-change", "core-change"] });
    assert.equal(bad.ok, false);
    assert.deepEqual(kinds(bad), ["changesets-extraneous", "changesets-extraneous", "changesets-missing", "changesets-missing"]);

    // And the other half of the same confusion: the right ids under the right cohort, but the
    // version taken from the cohort next door.
    const misversioned = {
      version: "0.27.1",
      coverage: [
        { cohort: "core", version: "0.27.0", changesets: ["core-change"] },
        { cohort: "angular", version: "0.27.0", changesets: ["angular-change"] },
      ],
    };
    const mismatch = validateCoverage({ note: misversioned, cohorts: collided.cohorts, pendingIds: ["angular-change", "core-change"] });
    assert.equal(mismatch.ok, false);
    assert.deepEqual(kinds(mismatch), ["cohort-version-mismatch"]);
    assert.match(finding(mismatch, "cohort-version-mismatch").message, /covers cohort "core" at 0\.27\.0, but "core" publishes 0\.27\.1/);
  });

  it("a moving cohort left out of coverage entirely is named, with the changesets it would publish undescribed", () => {
    const note = covering();
    note.coverage = [note.coverage[0]];
    const result = check(note);
    assert.deepEqual(kinds(result), ["cohort-uncovered"]);
    assert.deepEqual(finding(result, "cohort-uncovered").ids, ["metric-wrap"]);
    assert.match(result.errors[0], /would publish with no curated description/);
  });

  it("accepts a documented exclusion, and refuses an undocumented one", () => {
    const excluded = covering();
    excluded.coverage[0].changesets = ["metric-wrap", "rating-radio"];
    excluded.coverage[0].exclusions = [{ changeset: "tokens-preset", reason: "internal preset plumbing, no consumer-visible change" }];
    assert.deepEqual(check(excluded).errors, [], "an exclusion with a reason completes the set");

    const unreasoned = structuredClone(excluded);
    unreasoned.coverage[0].exclusions = [{ changeset: "tokens-preset", reason: "   " }];
    // The entry is refused, so core also reports as uncovered — the same pairing as the shape
    // controls below, and the reason the assertions name kinds rather than counting findings.
    assert.deepEqual(kinds(check(unreasoned)), ["cohort-uncovered", "exclusion-reason-missing"]);

    const both = structuredClone(excluded);
    both.coverage[0].changesets.push("tokens-preset");
    assert.deepEqual(kinds(check(both)), ["covered-and-excluded"]);

    const stale = structuredClone(excluded);
    stale.coverage[0].exclusions = [{ changeset: "gone", reason: "why" }, { changeset: "tokens-preset", reason: "why" }];
    assert.deepEqual(kinds(check(stale)), ["changesets-extraneous"], "an excluded id must still be one the release consumes");
  });

  it("validates the shape of coverage element by element, naming the index, without throwing", () => {
    const shape = (coverage) => kinds(check({ version: "0.28.0", coverage }));
    // A rejected entry is a *dropped* entry, so its cohort then also reports as uncovered. Both
    // findings are wanted: one says the metadata is malformed, the other says the release line is
    // consequently undescribed. Neither is a throw — `changesets: [42]` used to be able to crash a
    // gate of this shape, so the element types are asserted rather than assumed.
    assert.deepEqual(shape("core"), ["coverage-not-an-array"]);
    assert.deepEqual(shape([42]), ["cohort-uncovered", "cohort-uncovered", "entry-not-an-object"]);
    assert.deepEqual(shape([null]), ["cohort-uncovered", "cohort-uncovered", "entry-not-an-object"]);
    assert.deepEqual(shape([{ version: "0.28.0" }]), ["cohort-uncovered", "cohort-uncovered", "entry-cohort-missing"]);
    assert.deepEqual(shape([{ cohort: "core" }]), ["cohort-uncovered", "cohort-uncovered", "entry-version-invalid"]);
    assert.deepEqual(shape([{ cohort: "core", version: "nope" }]), ["cohort-uncovered", "cohort-uncovered", "entry-version-invalid"]);
    assert.deepEqual(shape([{ cohort: "core", version: "0.28.0", changesets: [42] }]), [
      "cohort-uncovered",
      "cohort-uncovered",
      "entry-changesets-invalid",
    ]);
    assert.deepEqual(
      shape([
        { cohort: "core", version: "0.28.0", changesets: [] },
        { cohort: "core", version: "0.28.0", changesets: [] },
      ]),
      ["changesets-missing", "cohort-uncovered", "entry-duplicate-cohort"],
      "the first entry is kept and checked; the duplicate is refused rather than silently winning",
    );
    assert.deepEqual(shape([{ cohort: "core", version: "0.28.0", changesets: [], exclusions: [{ changeset: "metric-wrap" }] }]), [
      "cohort-uncovered",
      "cohort-uncovered",
      "exclusion-reason-missing",
    ]);
    assert.deepEqual(shape([{ cohort: "core", version: "0.28.0", changesets: [], exclusions: "all" }]), [
      "cohort-uncovered",
      "cohort-uncovered",
      "entry-exclusions-invalid",
    ]);
    assert.deepEqual(shape([{ cohort: "core", version: "0.28.0", changesets: [], exclusions: [42] }]), [
      "cohort-uncovered",
      "cohort-uncovered",
      "exclusion-not-an-object",
    ]);
  });

  it("does not sweep historical notes — every note on main predates coverage and stays valid", () => {
    // The gate reads exactly one note: the one the release would activate. A tree with no moving
    // cohort reads none, which is why landing this does not require back-filling five old files.
    const inert = plan([]);
    assert.deepEqual(inert.cohorts, []);
    for (const file of ["0.24.1", "0.25.0", "0.26.0", "0.26.1", "0.27.0"]) {
      const note = JSON.parse(readFileSync(path.join(repo, `release/notes/${file}.json`), "utf8"));
      assert.equal(note.coverage, undefined, `${file} is historical and must not be expected to carry coverage`);
    }
  });
});

describe("attributing a finding to the base branch", () => {
  const f = (cohort, kind, ids) => ({ cohort, kind, ids, message: `${cohort}:${kind}` });

  it("excuses a finding the base already has", () => {
    const { attributed, introduced } = attributeToBase([f("core", "changesets-missing", ["a"])], [f("core", "changesets-missing", ["a"])]);
    assert.equal(attributed.length, 1);
    assert.deepEqual(introduced, []);
  });

  it("does NOT excuse a changeset added at this head, even when the cohort is already failing", () => {
    const { attributed, introduced } = attributeToBase(
      [f("core", "changesets-missing", ["a", "b"])],
      [f("core", "changesets-missing", ["a"])],
    );
    assert.deepEqual(attributed, []);
    assert.equal(introduced.length, 1, "b is this head's and must fail");
  });

  /**
   * The property, not the call sites. Codex P2 on head `07874ee5`: a finding that stops the
   * comparison used to carry `ids: []`, which is vacuously a subset of anything the base produced,
   * so a base note with (say) `"coverage": "core"` excused the whole finding — and a changeset added
   * afterwards went unenforced while the projected version stayed put. `coverage-absent` had been
   * given its ids; its three siblings had not.
   *
   * Reproduced below against each short-circuit before the fix, and asserted as a general rule so a
   * fifth short-circuit added later fails here rather than shipping the same hole.
   */
  it("no short-circuit finding can excuse a changeset the head newly consumes", () => {
    const base = plan([changeset("rating-radio", [{ name: "@kinetixui/ui", type: "minor" }])]);
    // A patch on top of a minor keeps the projected version at 0.28.0, so the versions match and
    // only the per-id rule stands between the new changeset and a silent pass.
    const head = plan([
      changeset("rating-radio", [{ name: "@kinetixui/ui", type: "minor" }]),
      changeset("metric-wrap", [{ name: "@kinetixui/ui", type: "patch" }]),
    ]);
    assert.equal(base.cohorts[0].version, "0.28.0");
    assert.equal(head.cohorts[0].version, "0.28.0", "the projected version must NOT move, or the test proves nothing");

    const notes = {
      "coverage is not an array": { version: "0.28.0", coverage: "core" },
      "the note is not an object": [],
      "the declared version is another cohort's": {
        version: "0.28.0",
        coverage: [{ cohort: "core", version: "0.27.9", changesets: ["rating-radio"] }],
      },
      "coverage is absent": { version: "0.28.0" },
      "an entry is malformed": { version: "0.28.0", coverage: [{ cohort: "core", version: "0.28.0", changesets: [42] }] },
      "an exclusion has no reason": {
        version: "0.28.0",
        coverage: [{ cohort: "core", version: "0.28.0", changesets: [], exclusions: [{ changeset: "rating-radio" }] }],
      },
    };

    for (const [label, note] of Object.entries(notes)) {
      const onBase = validateCoverage({ note, cohorts: base.cohorts, pendingIds: ["rating-radio"] });
      const onHead = validateCoverage({ note, cohorts: head.cohorts, pendingIds: ["metric-wrap", "rating-radio"] });
      assert.equal(onBase.ok, false, `${label}: the base must already be failing, or this case is not the one described`);
      assert.equal(onHead.ok, false, `${label}: the head must fail too`);

      const { introduced } = attributeToBase(onHead.findings, onBase.findings);
      assert.ok(
        introduced.length > 0,
        `${label}: every finding was attributed to the base, so "metric-wrap" would publish uncovered`,
      );
      assert.ok(
        introduced.some((f) => f.ids.includes("metric-wrap")),
        `${label}: something must name "metric-wrap" specifically, not merely fail for another reason`,
      );
    }
  });

  it("does not cross cohorts or kinds", () => {
    assert.equal(attributeToBase([f("angular", "changesets-missing", [])], [f("core", "changesets-missing", [])]).introduced.length, 1);
    assert.equal(attributeToBase([f("core", "changesets-extraneous", [])], [f("core", "changesets-missing", [])]).introduced.length, 1);
  });
});

/* ------------------------------------------------------- the CLI, against real git repositories */

const SCRIPT = "scripts/check-release-note-coverage.mjs";

/** A throwaway repository carrying only what the gate reads. */
function sandbox() {
  const dir = mkdtempSync(path.join(tmpdir(), "kinetix-note-coverage-"));
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  cpSync(path.join(repo, "scripts/release"), path.join(dir, "scripts/release"), { recursive: true });
  cpSync(path.join(repo, SCRIPT), path.join(dir, SCRIPT));
  // The gate imports `semver` through the release modules; the real install is reused rather than
  // reinstalled, which also proves the CLI resolves its dependencies from the repository root.
  symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"), "dir");
  mkdirSync(path.join(dir, ".changeset"), { recursive: true });
  mkdirSync(path.join(dir, "release/notes"), { recursive: true });
  write(dir, "release/publish-packages.json", ALLOWLIST);
  write(dir, ".changeset/config.json", CONFIG);
  for (const pkg of workspace()) {
    mkdirSync(path.join(dir, pkg.directory), { recursive: true });
    write(dir, `${pkg.directory}/package.json`, { name: pkg.name, version: pkg.version });
  }
  const run = (...args) => spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  run("init", "-q", "-b", "main");
  run("config", "user.email", "test@example.invalid");
  run("config", "user.name", "test");
  return { dir, git: run };
}

const write = (dir, file, value) => writeFileSync(path.join(dir, file), `${JSON.stringify(value, null, 2)}\n`);
const addChangeset = (dir, id, body) => writeFileSync(path.join(dir, `.changeset/${id}.md`), `---\n${body}\n---\n\nprose\n`);
const commit = (sandbox, message) => {
  sandbox.git("add", "-A");
  sandbox.git("commit", "-q", "-m", message);
};
/** `origin/main` without a network: a remote pointing at the repository itself. */
const publishBase = (sandbox) => {
  sandbox.git("remote", "remove", "origin");
  sandbox.git("remote", "add", "origin", sandbox.dir);
  sandbox.git("fetch", "-q", "origin", "main");
};
const gate = (dir) => {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8", env: { ...process.env, GITHUB_BASE_REF: "" } });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
};

describe("check:release-note-coverage end to end", () => {
  it("passes a release-inert tree, and the tree it runs on today is one", () => {
    const box = sandbox();
    try {
      commit(box, "base");
      publishBase(box);
      const result = gate(box.dir);
      assert.equal(result.status, 0, result.out);
      assert.match(result.out, /no pending changeset moves a published release cohort/);
    } finally {
      rmSync(box.dir, { recursive: true, force: true });
    }

    // The repository as it stands: zero changesets, so the gate is a no-op and landing it changes
    // no other pull request's verdict.
    const live = spawnSync(process.execPath, [SCRIPT], { cwd: repo, encoding: "utf8" });
    assert.equal(live.status, 0, `${live.stdout}${live.stderr}`);
  });

  it("stands aside when a cohort moves and no note exists, naming the gate that owns that", () => {
    const box = sandbox();
    try {
      commit(box, "base");
      publishBase(box);
      addChangeset(box.dir, "rating-radio", '"@kinetixui/ui": minor');
      const result = gate(box.dir);
      assert.equal(result.status, 0, result.out);
      assert.match(result.out, /release\/notes\/0\.28\.0\.json does not exist/);
      assert.match(result.out, /check:release-note/);
    } finally {
      rmSync(box.dir, { recursive: true, force: true });
    }
  });

  it("reports a non-core cohort that has nowhere to declare coverage", () => {
    const box = sandbox();
    try {
      commit(box, "base");
      publishBase(box);
      addChangeset(box.dir, "iot-sensors", '"@kinetixui/iot": minor');
      const result = gate(box.dir);
      assert.equal(result.status, 0, result.out);
      assert.match(result.out, /iot@0\.6\.0/);
      assert.match(result.out, /not the core cohort/);
    } finally {
      rmSync(box.dir, { recursive: true, force: true });
    }
  });

  it("fails a head that introduces the gap, and passes one whose base already has it", () => {
    const box = sandbox();
    try {
      // The base already carries a changeset and a note with no coverage for it.
      addChangeset(box.dir, "rating-radio", '"@kinetixui/ui": minor');
      write(box.dir, "release/notes/0.28.0.json", { version: "0.28.0", summary: "s", breaking: [], changes: [] });
      commit(box, "base with the gap");
      publishBase(box);

      const inherited = gate(box.dir);
      assert.equal(inherited.status, 0, inherited.out);
      assert.match(inherited.out, /already projects core@0\.28\.0 with the same coverage gap/);

      // This head adds a second changeset. The cohort was already failing; the new id is still ours.
      addChangeset(box.dir, "metric-wrap", '"@kinetixui/ui": patch');
      const introduced = gate(box.dir);
      assert.equal(introduced.status, 1, introduced.out);
      assert.match(introduced.out, /metric-wrap/);

      // Declaring both closes it.
      write(box.dir, "release/notes/0.28.0.json", {
        version: "0.28.0",
        summary: "s",
        breaking: [],
        changes: [],
        coverage: [{ cohort: "core", version: "0.28.0", changesets: ["metric-wrap", "rating-radio"] }],
      });
      const fixed = gate(box.dir);
      assert.equal(fixed.status, 0, fixed.out);
      assert.match(fixed.out, /covers every changeset this release consumes/);
    } finally {
      rmSync(box.dir, { recursive: true, force: true });
    }
  });

  it("fails strictly when the base cannot be read, rather than passing for want of a comparison", () => {
    const box = sandbox();
    try {
      addChangeset(box.dir, "rating-radio", '"@kinetixui/ui": minor');
      write(box.dir, "release/notes/0.28.0.json", { version: "0.28.0", summary: "s", breaking: [], changes: [] });
      commit(box, "base");
      // No `origin` remote at all: there is no base tree to compare against.
      const result = gate(box.dir);
      assert.equal(result.status, 1, result.out);
      assert.match(result.out, /could not be read/);
      assert.match(result.out, /Staying strict/);
    } finally {
      rmSync(box.dir, { recursive: true, force: true });
    }
  });
});

describe("activation does not publish coverage metadata to the changelog page", () => {
  it("strips `coverage` and leaves every other field byte-for-byte", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kinetix-coverage-activate-"));
    try {
      for (const sub of ["scripts/release", "packages/ui", "apps/web/src/lib", "release/notes"]) mkdirSync(path.join(dir, sub), { recursive: true });
      cpSync(path.join(repo, "scripts/version-release-meta.mjs"), path.join(dir, "scripts/version-release-meta.mjs"));
      cpSync(path.join(repo, "scripts/release/note-coverage.mjs"), path.join(dir, "scripts/release/note-coverage.mjs"));
      cpSync(path.join(repo, "scripts/release/peers.mjs"), path.join(dir, "scripts/release/peers.mjs"));
      symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"), "dir");
      for (const script of ["gen-release-meta", "check-releases"]) writeFileSync(path.join(dir, `scripts/${script}.mjs`), "");
      const file = path.join(dir, "apps/web/src/lib/releases.ts");
      writeFileSync(file, 'export const RELEASES: Release[] = [\n  {\n    version: "0.27.0",\n    date: "2026-10-31",\n  },\n];\n');
      writeFileSync(path.join(dir, "packages/ui/package.json"), JSON.stringify({ version: "0.28.0" }));
      writeFileSync(
        path.join(dir, "release/notes/0.28.0.json"),
        JSON.stringify({
          version: "0.28.0",
          summary: "Prose with no replacement patterns in it.",
          breaking: [],
          changes: [{ kind: "fixed", title: "t" }],
          // Keyed through the constant: if `COVERAGE_KEY` ever changes and the writer's literal does
          // not, this control fails rather than quietly publishing the metadata to the page.
          [COVERAGE_KEY]: [{ cohort: "core", version: "0.28.0", changesets: ["rating-radio"] }],
        }),
      );
      const result = spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: dir, encoding: "utf8" });
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
      const activated = readFileSync(file, "utf8");
      assert.equal(COVERAGE_KEY, "coverage", "the writer strips this key as a literal; they must agree");
      assert.ok(!activated.includes(COVERAGE_KEY), "coverage must not reach releases.ts — it is not a field of `Release`");
      assert.ok(!activated.includes("rating-radio"));
      assert.match(activated, /version: "0\.28\.0"/);
      assert.match(activated, /Prose with no replacement patterns in it\./);
      // Deliberately not asserted here: that prose containing `$$` or `$&` survives activation. It
      // does not — `version-release-meta.mjs` passes the serialized note as a string replacement, so
      // `String.prototype.replace` reads the author's prose as patterns. That defect is this
      // control's incidental discovery, is older than this change, and is already fixed on #465's
      // branch. Asserting it here would make this test fail for someone else's defect; recorded in
      // the pull request instead.
      assert.ok(activated.indexOf('version: "0.28.0"') < activated.indexOf('version: "0.27.0"'));
      assert.ok(existsSync(path.join(dir, "release/notes/0.28.0.json")), "the note file keeps the coverage record");
      assert.match(readFileSync(path.join(dir, "release/notes/0.28.0.json"), "utf8"), /rating-radio/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
