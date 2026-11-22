/**
 * release-note-sync.test.mjs — controls for `scripts/check-release-note-sync.mjs`.
 *
 * The gate exists because of a drift measured on a rehearsal of the 0.28.0 route: a curated note
 * corrected AFTER `version-release-meta.mjs` had activated it left the changelog page carrying the
 * superseded prose, and `check:releases`, `check:release-note` and `check:release-note-coverage` all
 * exited 0 — as did re-running the generator, which changes nothing once the version is present.
 *
 * Each control below was run against the real gate and produced the asserted outcome. The two PASS
 * cases matter as much as the FAIL ones: a check that refuses an upcoming note, or that reads the
 * writer's own `date` stamp as drift, would be reverted within a release and protect nothing.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../", import.meta.url));

const NOTE = {
  version: "0.28.0",
  summary: "A summary with no replacement patterns in it.",
  breaking: [],
  changes: [
    { kind: "accessibility", area: "components", title: "Progress announces the value it paints", body: "The value reaches the primitive. The fill is painted by a nested span.", href: "/docs/components/progress" },
  ],
};

/** A scratch repository holding the gate, the writer, one note and one activated page. */
function sandbox({ note = NOTE, activate = true, advanceTo = null } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "kinetix-note-sync-control-"));
  for (const sub of ["scripts/release", "packages/ui", "apps/web/src/lib", "release/notes"]) mkdirSync(path.join(dir, sub), { recursive: true });
  for (const f of ["check-release-note-sync.mjs", "version-release-meta.mjs"]) cpSync(path.join(repo, "scripts", f), path.join(dir, "scripts", f));
  for (const stub of ["gen-release-meta", "check-releases"]) writeFileSync(path.join(dir, `scripts/${stub}.mjs`), "");
  try {
    symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"), "dir");
  } catch {}
  writeFileSync(path.join(dir, "packages/ui/package.json"), JSON.stringify({ version: note.version }));
  writeFileSync(path.join(dir, `release/notes/${note.version}.json`), JSON.stringify(note, null, 2) + "\n");
  const page = path.join(dir, "apps/web/src/lib/releases.ts");
  writeFileSync(page, 'export const RELEASES: Release[] = [\n  {\n    version: "0.27.0",\n    date: "2026-10-31",\n  },\n];\n');
  if (activate) {
    const activated = spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(activated.status, 0, `could not activate the fixture: ${activated.stdout}${activated.stderr}`);
    assert.match(readFileSync(page, "utf8"), /version: "0\.28\.0"/);
  }
  // Activation happens while the note's version IS the package version. `advanceTo` then moves the
  // package on, which is what makes the activated note HISTORICAL — the state in which the writer
  // can no longer restore its entry.
  if (advanceTo) writeFileSync(path.join(dir, "packages/ui/package.json"), JSON.stringify({ version: advanceTo }));
  return { dir, page, noteFile: path.join(dir, `release/notes/${note.version}.json`) };
}

const check = (dir) => spawnSync(process.execPath, ["scripts/check-release-note-sync.mjs"], { cwd: dir, encoding: "utf8" });
const edit = (file, from, to) => {
  const before = readFileSync(file, "utf8");
  assert.ok(before.includes(from), `the control did not apply: ${JSON.stringify(from)} is not in ${path.basename(file)}`);
  writeFileSync(file, before.replace(from, to));
};

describe("check:release-note-sync", () => {
  it("passes on an activated note that still matches the page", () => {
    const { dir } = sandbox();
    try {
      const run = check(dir);
      assert.equal(run.status, 0, run.stdout + run.stderr);
      assert.match(run.stdout, /1 activated note of 1/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("fails when the curated note is corrected after activation", () => {
    const { dir, noteFile } = sandbox();
    try {
      edit(noteFile, "painted by a nested span", "painted by the indicator itself");
      const run = check(dir);
      assert.equal(run.status, 1, run.stdout + run.stderr);
      assert.match(run.stderr, /no longer matches/);
      // 0.28.0 is still the package version here, so the regenerable branch must be the one printed.
      assert.match(run.stderr, /0\.28\.0 is the version in packages\/ui\/package\.json, so it is regenerable/);
      assert.match(run.stderr, /delete the\s+0\.28\.0 entry from releases\.ts/s);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  // The diagnostic used to prescribe delete-and-regenerate for EVERY version. `version-release-meta.mjs`
  // reads its version from `packages/ui/package.json` and writes only when that version is missing from
  // the history, so on any other version that advice removes a published entry and cannot put it back —
  // and the gate then skips the note as 'not activated yet' and goes green. Both halves are asserted.
  it("tells a historical note to be edited, not deleted and regenerated", () => {
    const { dir, noteFile } = sandbox({ advanceTo: "0.29.0" });
    try {
      edit(noteFile, "painted by a nested span", "painted by the indicator itself");
      const run = check(dir);
      assert.equal(run.status, 1, run.stdout + run.stderr);
      assert.match(run.stderr, /0\.28\.0 is NOT the version in packages\/ui\/package\.json \(0\.29\.0\)/);
      assert.match(run.stderr, /deleting this entry would remove it\s+permanently/s);
      assert.match(run.stderr, /Edit the entry in\s+releases\.ts to match the note instead/s);
      assert.doesNotMatch(run.stderr, /so it is regenerable/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("the repair it prescribes for a historical note is the only one that works", () => {
    const { dir, page, noteFile } = sandbox({ advanceTo: "0.29.0" });
    try {
      edit(noteFile, "painted by a nested span", "painted by the indicator itself");
      assert.equal(check(dir).status, 1, "the fixture must start red");

      // The repair the OLD diagnostic prescribed: delete the entry, re-run the writer.
      const before = readFileSync(page, "utf8");
      const start = before.indexOf('  {\n    version: "0.28.0"');
      assert.ok(start > 0, "the activated 0.28.0 entry is not where this control expects it");
      const end = before.indexOf("\n  },\n", start) + "\n  },\n".length;
      writeFileSync(page, before.slice(0, start) + before.slice(end));
      const regen = spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: dir, encoding: "utf8" });

      assert.doesNotMatch(
        readFileSync(page, "utf8"),
        /version: "0\.28\.0"/,
        `the writer restored a historical entry, which would make the old advice sound (status ${regen.status})`,
      );
      const after = check(dir);
      assert.equal(after.status, 0, "and the gate goes GREEN on the loss, which is why the advice was dangerous");
      assert.match(after.stdout, /0 activated notes of 1/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("fails when the generated page is edited by hand and the note is untouched", () => {
    const { dir, page } = sandbox();
    try {
      edit(page, "painted by a nested span", "painted by the indicator itself");
      assert.equal(check(dir).status, 1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("tolerates the writer's own date stamp, which the note does not carry", () => {
    const { dir, page } = sandbox();
    try {
      const today = new Date().toISOString().slice(0, 10);
      edit(page, `date: "${today}"`, 'date: "2026-01-01"');
      const run = check(dir);
      assert.equal(run.status, 0, `a date difference is not drift — it is the activation day\n${run.stdout}${run.stderr}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("ignores a note whose version the page has not activated", () => {
    const { dir, noteFile } = sandbox({ activate: false });
    try {
      edit(noteFile, "A summary with no replacement patterns in it.", "Rewritten freely while still upcoming.");
      const run = check(dir);
      assert.equal(run.status, 0, run.stdout + run.stderr);
      assert.match(run.stdout, /0 activated notes of 1/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("refuses a tree with no curated notes rather than passing on an empty comparison", () => {
    const { dir, noteFile } = sandbox();
    try {
      rmSync(noteFile);
      const run = check(dir);
      assert.equal(run.status, 1, "nothing to compare must not read as agreement");
      assert.match(run.stderr, /no curated notes/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  // The gate's own load-bearing line. With the comparison removed, the first control above passes —
  // so that control is testing the comparison and not some incidental side effect of the sandbox.
  it("is the comparison, and not the setup, that catches the drift", () => {
    const { dir, noteFile } = sandbox();
    try {
      const gate = path.join(dir, "scripts/check-release-note-sync.mjs");
      edit(gate, "if (normalise(expected.text) !== normalise(span.text)) {", "if (false) {");
      edit(noteFile, "painted by a nested span", "painted by the indicator itself");
      assert.equal(check(dir).status, 0, "blinding the comparison must be what makes the drift invisible");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
