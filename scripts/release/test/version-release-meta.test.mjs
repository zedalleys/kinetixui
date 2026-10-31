import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { it } from "node:test";

it("activates curated notes after versioning, regenerates metadata, and is idempotent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "kinetix-version-meta-"));
  try {
    for (const dir of ["scripts", "packages/ui", "apps/web/src/lib", "release/notes"]) mkdirSync(path.join(root, dir), { recursive: true });
    copyFileSync(new URL("../../version-release-meta.mjs", import.meta.url), path.join(root, "scripts/version-release-meta.mjs"));
    for (const script of ["gen-release-meta", "check-releases"]) writeFileSync(path.join(root, `scripts/${script}.mjs`), `import { appendFileSync } from "node:fs"; appendFileSync("steps", ${JSON.stringify(script + "\n")});`);
    const file = path.join(root, "apps/web/src/lib/releases.ts");
    const original = 'export const RELEASES: Release[] = [\n  {\n    version: "0.24.0",\n    date: "2026-10-06",\n  },\n];\n';
    writeFileSync(file, original);
    const manifest = path.join(root, "packages/ui/package.json");
    writeFileSync(manifest, JSON.stringify({ version: "0.24.0" }));
    writeFileSync(path.join(root, "release/notes/0.24.1.json"), JSON.stringify({ version: "0.24.1", breaking: [], changes: [] }));
    const run = () => spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(run().status, 0);
    assert.equal(readFileSync(file, "utf8"), original, "upcoming notes must not appear on main");
    writeFileSync(manifest, JSON.stringify({ version: "0.24.1" }));
    assert.equal(run().status, 0);
    const updated = readFileSync(file, "utf8");
    assert.ok(updated.includes(`date: "${new Date().toISOString().slice(0, 10)}"`));
    assert.ok(updated.indexOf('version: "0.24.1"') < updated.indexOf('version: "0.24.0"'));
    assert.equal(run().status, 0);
    assert.equal(readFileSync(file, "utf8"), updated);
    assert.equal(readFileSync(path.join(root, "steps"), "utf8"), "gen-release-meta\ncheck-releases\n".repeat(3));
    writeFileSync(manifest, JSON.stringify({ version: "0.24.2" }));
    assert.notEqual(run().status, 0, "missing curated notes must block the Version PR");
    assert.equal(readFileSync(file, "utf8"), updated);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// An integration control for the activation step, not for the note gate: accepted note text must reach
// `releases.ts` unchanged. `String.prototype.replace` interprets `$$`, `$&`, `$1` and `` $` `` in a
// STRING replacement, and the replacement here is the serialized note, so the note's own prose was
// being rewritten. Measured on the pre-fix script: `$$` became `$` (silent corruption of published
// text) and `$&` spliced the RELEASES marker into the string literal (`error TS1002: Unterminated
// string literal`) — while `check:releases` reported `ok — 44 entries` for both. Hence a control here
// rather than a restriction in `check-release-note.mjs`: the prose is legitimate; the writer was not.
it("writes note text through to releases.ts unchanged, including replacement-pattern characters", () => {
  const root = mkdtempSync(path.join(tmpdir(), "kinetix-version-meta-dollar-"));
  try {
    for (const dir of ["scripts", "packages/ui", "apps/web/src/lib", "release/notes"]) mkdirSync(path.join(root, dir), { recursive: true });
    copyFileSync(new URL("../../version-release-meta.mjs", import.meta.url), path.join(root, "scripts/version-release-meta.mjs"));
    for (const script of ["gen-release-meta", "check-releases"]) writeFileSync(path.join(root, `scripts/${script}.mjs`), "");
    const file = path.join(root, "apps/web/src/lib/releases.ts");
    writeFileSync(file, 'export const RELEASES: Release[] = [\n  {\n    version: "0.24.0",\n    date: "2026-10-06",\n  },\n];\n');
    writeFileSync(path.join(root, "packages/ui/package.json"), JSON.stringify({ version: "0.24.1" }));

    // Every replacement pattern `replace` recognises, in text an author could plausibly write about a
    // CLI flag, a price, a regex or a shell variable.
    const summary = "Costs $$5, matches $& and $1, quotes $` and $', and $$$& together.";
    writeFileSync(path.join(root, "release/notes/0.24.1.json"), JSON.stringify({ version: "0.24.1", summary, breaking: [], changes: [] }));

    assert.equal(spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: root, encoding: "utf8" }).status, 0);
    const updated = readFileSync(file, "utf8");
    assert.ok(updated.includes(`summary: ${JSON.stringify(summary)}`), `note text was rewritten during activation:\n${updated}`);
    // And the file is still one well-formed entry list: the marker appears once, where it started.
    assert.equal(updated.split("export const RELEASES: Release[] = [").length - 1, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
