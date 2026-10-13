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
    writeFileSync(path.join(root, "release/notes/0.24.1.json"), JSON.stringify({ version: "0.24.1", date: "2026-10-13", breaking: [], changes: [] }));
    const run = () => spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(run().status, 0);
    assert.equal(readFileSync(file, "utf8"), original, "upcoming notes must not appear on main");
    writeFileSync(manifest, JSON.stringify({ version: "0.24.1" }));
    assert.equal(run().status, 0);
    const updated = readFileSync(file, "utf8");
    assert.ok(updated.indexOf('version: "0.24.1"') < updated.indexOf('version: "0.24.0"'));
    assert.equal(run().status, 0);
    assert.equal(readFileSync(file, "utf8"), updated);
    assert.equal(readFileSync(path.join(root, "steps"), "utf8"), "gen-release-meta\ncheck-releases\n".repeat(3));
    writeFileSync(manifest, JSON.stringify({ version: "0.24.2" }));
    assert.notEqual(run().status, 0, "missing curated notes must block the Version PR");
    assert.equal(readFileSync(file, "utf8"), updated);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
