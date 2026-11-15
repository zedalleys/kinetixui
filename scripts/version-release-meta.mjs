/** Finish the Changesets Version PR with curated notes and canonical package indicators.
 * Keep upcoming notes in release/notes/<core-version>.json on main; activate them only after
 * Changesets versions the packages. Never run publication or invent a package version here.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const version = JSON.parse(readFileSync(`${root}/packages/ui/package.json`, "utf8")).version;
const file = `${root}/apps/web/src/lib/releases.ts`;
const source = readFileSync(file, "utf8");
const marker = "export const RELEASES: Release[] = [\n";
const history = source.slice(source.indexOf(marker));
if (!history.includes(`version: "${version}"`)) {
  const noteFile = `${root}/release/notes/${version}.json`;
  if (!existsSync(noteFile)) throw new Error(`Missing curated release notes: ${noteFile}`);
  // `coverage` maps the note to the changesets it describes — release process metadata, checked by
  // `check:release-note-coverage` before the merge (see scripts/release/note-coverage.mjs). It is not
  // a field of `Release`, so serializing it here would be an excess property on a typed object
  // literal and `tsc` would reject the Version PR. Dropped on activation, deliberately; the note file
  // keeps it as the reviewable record. The key is written literally rather than imported so that this
  // script keeps no dependencies at all — it runs inside the Version PR, where every import is one
  // more thing that can fail after the versions have already been bumped. `note-coverage.test.mjs`
  // asserts the literal and `COVERAGE_KEY` are the same string.
  const { coverage: _coverage, ...entry } = JSON.parse(readFileSync(noteFile, "utf8"));
  entry.date = new Date().toISOString().slice(0, 10);
  if (entry.version !== version) throw new Error(`Curated release notes must describe ${version}`);
  if (!source.includes(marker)) throw new Error("Cannot locate RELEASES insertion point");
  // JSON is valid TypeScript; retain unquoted property names for the release tools' parser.
  const block = JSON.stringify(entry, null, 2).replace(/^  /gm, "    ").replace(/^}/m, "  }")
    .replace(/^\{/m, "  {").replace(/^(\s*)"([A-Za-z]+)":/gm, "$1$2:");
  writeFileSync(file, source.replace(marker, `${marker}${block},\n`));
}
for (const script of ["gen-release-meta.mjs", "check-releases.mjs"]) {
  const result = spawnSync(process.execPath, [`${root}/scripts/${script}`], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
