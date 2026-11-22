/**
 * check-release-note-sync.mjs — an activated release note must still say what the curated note says.
 *
 *   node scripts/check-release-note-sync.mjs
 *
 * `release/notes/<version>.json` is the reviewable source of a release's prose.
 * `version-release-meta.mjs` copies it into `apps/web/src/lib/releases.ts` — the changelog page —
 * ONCE, guarded by `if (!history.includes('version: "<version>"'))`. After that the two copies are
 * independent, and nothing compared them. Measured on a rehearsal of the 0.28.0 route, on a tree
 * where the note had already been activated:
 *
 *   - the curated note's Progress paragraph was replaced with a sentinel
 *   - `check:releases`, `check:release-note` and `check:release-note-coverage` all exited 0
 *   - re-running `scripts/version-release-meta.mjs` ALSO exited 0 and changed nothing, because the
 *     version was already present — so the drift was not merely undetected, it was unrepairable by
 *     regeneration. The only repairs are editing the generated file by hand or deleting its entry.
 *
 * That is the shape of the defect this exists to catch: a note correction merged after activation
 * reads as applied in review and ships the superseded prose to readers. It is one direction of a
 * two-copy problem, so it is checked rather than argued about.
 *
 * WHY IT RE-RUNS THE WRITER INSTEAD OF COMPARING FIELDS
 *
 * The activated entry is TypeScript with unquoted keys whose string values are author prose — prose
 * that has already, in this repository, contained `]`, `"`, `newComponents:` and `$&` and broken
 * readers that matched it with patterns (see the notes in `check-releases.mjs` and
 * `release/test/version-release-meta.test.mjs`). Rather than add a fourth parser of that format, this
 * runs the real `version-release-meta.mjs` in a scratch directory against the real note and compares
 * its output to the file. The expectation is therefore produced by the same code that produced the
 * file, and cannot drift from it: if the writer's serialization changes, both sides change together.
 *
 * `date` is the one field the writer invents (it stamps the day of activation), so it is the one
 * field taken from the file rather than from the expectation.
 *
 * A note whose version has NOT been activated is not checked — an upcoming note is allowed to differ
 * from a page that does not mention it yet, which is the whole point of keeping notes on `main`.
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const MARKER = "export const RELEASES: Release[] = [\n";
const errors = [];

/**
 * The text of the top-level entry whose `version` is `version`, and everything after it.
 *
 * Scanned by brace depth with string literals consumed whole, so no character inside author prose is
 * ever read as syntax. Returns null when no entry opens for that version. The opener is recognised
 * only at depth 1 — directly inside the RELEASES array — so a `version:` key nested in some future
 * sub-object cannot be mistaken for an entry.
 */
function entrySpan(source, version) {
  const start = source.indexOf(MARKER);
  if (start < 0) return null;
  const body = source.slice(start + MARKER.length);
  let depth = 0;
  let open = -1;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"') {
      let j = i + 1;
      for (; j < body.length; j++) {
        if (body[j] === "\\") j++;
        else if (body[j] === '"') break;
      }
      i = j;
      continue;
    }
    if (c === "{") {
      if (depth === 0) open = i;
      depth++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth === 0 && open >= 0) {
        const text = body.slice(open, i + 1);
        // The version of THIS entry, read at its own top level only.
        const m = /^\s*version:\s*"([^"]+)"/m.exec(text);
        if (m && m[1] === version) return { text, after: body.slice(i + 1) };
        open = -1;
      }
      continue;
    }
  }
  return null;
}

const dateOf = (text) => /^\s*date:\s*"([^"]+)"/m.exec(text)?.[1] ?? null;

const releasesFile = `${root}/apps/web/src/lib/releases.ts`;
const releases = readFileSync(releasesFile, "utf8");

const notesDir = `${root}/release/notes`;
const notes = existsSync(notesDir) ? readdirSync(notesDir).filter((f) => f.endsWith(".json")).sort() : [];
if (notes.length === 0) errors.push("release/notes holds no curated notes — this check would pass by having nothing to compare");

// The writer activates only the version named in `packages/ui/package.json`, so that version is the
// ONLY one a regeneration can restore. Read it so the diagnostic prescribes a repair that works.
const writableVersion = JSON.parse(readFileSync(`${root}/packages/ui/package.json`, "utf8")).version;

let compared = 0;
for (const file of notes) {
  const version = file.replace(/\.json$/, "");
  const span = entrySpan(releases, version);
  if (!span) continue; // not activated yet; an upcoming note is free to differ
  compared++;
  const date = dateOf(span.text);
  if (!date) {
    errors.push(`apps/web/src/lib/releases.ts entry for ${version} has no \`date\``);
    continue;
  }

  const dir = mkdtempSync(path.join(tmpdir(), "kinetix-note-sync-"));
  try {
    for (const sub of ["scripts/release", "packages/ui", "apps/web/src/lib", "release/notes"]) mkdirSync(path.join(dir, sub), { recursive: true });
    for (const dep of ["version-release-meta.mjs"]) writeFileSync(path.join(dir, `scripts/${dep}`), readFileSync(`${root}/scripts/${dep}`, "utf8"));
    // The writer shells out to these two after it writes; they are not part of what is compared.
    for (const stub of ["gen-release-meta", "check-releases"]) writeFileSync(path.join(dir, `scripts/${stub}.mjs`), "");
    try {
      symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
    } catch {}
    writeFileSync(path.join(dir, "packages/ui/package.json"), JSON.stringify({ version }));
    writeFileSync(path.join(dir, `release/notes/${version}.json`), readFileSync(`${notesDir}/${file}`, "utf8"));
    // Only the history BELOW this entry, so the writer's guard does not see the version and activates.
    const scratch = path.join(dir, "apps/web/src/lib/releases.ts");
    writeFileSync(scratch, `${MARKER}${span.after}`);

    const run = spawnSync(process.execPath, ["scripts/version-release-meta.mjs"], { cwd: dir, encoding: "utf8" });
    if (run.status !== 0) {
      errors.push(`${version}: could not re-activate release/notes/${file} to compare it — ${(run.stderr || run.stdout || "").trim().split("\n").pop()}`);
      continue;
    }
    const expected = entrySpan(readFileSync(scratch, "utf8"), version);
    if (!expected) {
      errors.push(`${version}: re-activation produced no entry to compare against`);
      continue;
    }
    // The writer stamps today; the file keeps the day it was activated. Compare everything else.
    const normalise = (t) => t.replace(/^(\s*date:\s*)"[^"]*"/m, `$1"${date}"`);
    if (normalise(expected.text) !== normalise(span.text)) {
      // Reported as a window around the first differing CHARACTER, not the first differing line.
      // These entries hold paragraphs on one line each, so a line number alone pointed at two
      // openings that read identically for 150 characters and said nothing about what moved.
      const page = normalise(span.text);
      const note = normalise(expected.text);
      let at = 0;
      while (at < page.length && at < note.length && page[at] === note[at]) at++;
      const line = page.slice(0, at).split("\n").length;
      const window = (t) => JSON.stringify(t.slice(Math.max(0, at - 40), at + 110)).slice(1, -1);
      errors.push(
        `${version}: apps/web/src/lib/releases.ts no longer matches release/notes/${file}.\n` +
          `      The note was corrected after it was activated, and the changelog page still carries the\n` +
          `      superseded text. Re-running the generator over the file as it stands will NOT repair this,\n` +
          `      because the writer only ever writes a version that is MISSING from the history.\n` +
          (version === writableVersion
            ? `      ${version} is the version in packages/ui/package.json, so it is regenerable: delete the\n` +
              `      ${version} entry from releases.ts and re-run \`node scripts/version-release-meta.mjs\`.\n`
            : `      ${version} is NOT the version in packages/ui/package.json (${writableVersion}), which is the\n` +
              `      only version the writer will ever write — so deleting this entry would remove it\n` +
              `      permanently AND leave this check skipping ${version} altogether. Edit the entry in\n` +
              `      releases.ts to match the note instead; the expectation printed below is that text.\n`) +
          `      they agree for ${at} characters, then diverge at line ${line} of the entry (… marks the point):\n` +
          `        page: …${window(page)}\n` +
          `        note: …${window(note)}`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:release-note-sync failed (${errors.length}).`);
  process.exit(1);
}
console.log(`check:release-note-sync ok — ${compared} activated note${compared === 1 ? "" : "s"} of ${notes.length} match the changelog page.`);
