//
// WHAT A REQUIRED FIXTURE DOES NOT PROVE, AND WHY THIS FILE EXISTS.
//
// `CREATE_REQUIRE_FIXTURE=1` closed one hole: a fixture that is ABSENT can no longer make the M1
// browser gate skip four assertions and still exit 0. It left the adjacent hole wide open, because
// it tests only that a directory is named and holds an `index.html`. On 2026-11-22 that was
// measured, not reasoned about: a batch whose `tsc` step threw before `esbuild` ran left a
// `bundle.js` from an earlier commit in place, and the gate reported
// `{"passed":21,"skipped":0,"axeViolations":0}` with `PASS clean consumer bundle renders` — full
// assertion count, nothing skipped, every word of it about code that was not the code under test.
//
// That is the project's own rule ("never use a result from an earlier head as proof of the final
// head") being broken by the harness rather than by a person, which is the harder case to see: no
// output says anything is wrong, because from the gate's point of view nothing is.
//
// So a fixture now carries its PROVENANCE, and every consumer verifies it:
//
//   commit        the exact SHA the generator ran at, compared against the head under test
//   artifacts     sha256 per file, so a partial regeneration (fresh source, stale bundle) is caught
//   links         the symlink targets, so a directory reused across disposable worktrees is caught
//   packages      a content signature of the built library output the bundle was produced against
//
// The last two are not hypothetical either. A reused fixture directory keeps `node_modules`
// symlinks pointing into a `/tmp/kinetix-dw.*` worktree that has since been destroyed, and the
// generator's `link()` helper swallows `EEXIST`, so nothing refreshes them: `tsc` then fails with
// `Cannot find module 'react'` for a reason that has nothing to do with the candidate.
//
// A note on what this is NOT. It does not re-verify the fixture's CONTENT against the document —
// that is `create-studio-consumer-build.mjs`'s job, and it still runs in full. This answers one
// question only: is this fixture the output of THIS commit, whole and intact? A wrong answer there
// makes every later assertion meaningless, which is why it is checked first and refuses loudly.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync, readdirSync, readlinkSync, lstatSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";

export const PROVENANCE_FILE = "provenance.json";
export const SCHEMA = 1;

// Every file the generator writes. Listed here, not discovered, so a fixture that is MISSING one of
// them is a failure rather than a smaller manifest that still matches itself.
export const REQUIRED_ARTIFACTS = [
  "design.tsx",
  "theme.css",
  "README.md",
  "source-document.json",
  "package.json",
  "tsconfig.json",
  "main.tsx",
  "bundle.js",
  // esbuild emits this from the imported theme and token styles, and index.html loads it. It was
  // missing from this list, so neither generation nor verification hashed it: a stale or partly
  // regenerated stylesheet could be certified as an intact fixture, and the page the gate measures
  // is the one this file paints. Found in review.
  "bundle.css",
  "index.html",
  "input.css",
  "utilities.css",
  "tailwind.config.cjs",
  "inter-latin.woff2",
];

// The symlinks the generator creates, relative to the fixture's node_modules.
export const REQUIRED_LINKS = ["react", "react-dom", "@types/react", "@types/react-dom", "@kinetixui/ui", "@kinetixui/tokens"];

// The built library output the bundle is produced against. A rebuild of either changes the bundle's
// contents, so a fixture built against a different dist is not evidence about this one.
export const SIGNED_PACKAGES = ["packages/ui/dist", "packages/tokens/dist"];

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");

export const hashFile = path => sha256(readFileSync(path));

// A directory signature that hashes CONTENTS, not names and sizes. 31 files, ~900 KB, 15 ms — there
// is no reason to settle for a cheaper signature that a same-size change would slip through.
export const signDirectory = dir => {
  if (!existsSync(dir)) return null;
  const walk = current => readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
  const files = walk(dir).sort();
  const manifest = files.map(path => `${path.slice(dir.length + 1)} ${hashFile(path)}`).join("\n");
  return { files: files.length, signature: sha256(Buffer.from(manifest, "utf8")) };
};

// The commit the fixture belongs to. An explicit value wins, so a caller that already knows the
// head under test (CI, the isolated orchestrator) does not depend on git being runnable; otherwise
// it is read from the repository. A failure to determine it is reported, never defaulted — a
// provenance record whose commit is a guess would be worse than none.
export const headCommit = (root, explicit = process.env.KINETIX_CREATE_FIXTURE_COMMIT) => {
  if (explicit) return explicit.trim();
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

// EVERY EMITTED FILE MUST BE ACCOUNTED FOR, and this is the half the list alone cannot give.
// `REQUIRED_ARTIFACTS` says what must be PRESENT; it cannot say whether something the generator
// emits is missing FROM IT. `bundle.css` was exactly that: emitted, loaded by `index.html`, in no
// manifest, so neither generation nor verification hashed it and a stale copy verified as intact.
// The repair for that finding was to add one name to the list, which leaves the next unlisted asset
// in the same position. So the list is now a FIXED POINT over the generator's own output: every
// file in the fixture is either required, or excluded here by name with a reason. Adding an emitted
// asset without listing it is a failure, not a smaller manifest that still matches itself.
export const NOT_ARTIFACTS = {
  "provenance.json": "the record itself — it cannot contain its own hash",
};

// Relative paths of every file the fixture holds, except `node_modules`, which is links to packages
// the `links` and `packages` fields cover by identity rather than by content.
const emittedFiles = (fixtureDir, prefix = "") => {
  const out = [];
  let entries;
  try { entries = readdirSync(join(fixtureDir, prefix), { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) out.push(...emittedFiles(fixtureDir, relative));
    else out.push(relative);
  }
  return out;
};

// The gaps, as prose problems. Empty means the manifest covers the output exactly.
export const manifestGaps = fixtureDir => {
  const known = new Set([...REQUIRED_ARTIFACTS, ...Object.keys(NOT_ARTIFACTS)]);
  return emittedFiles(fixtureDir)
    .filter(name => !known.has(name))
    .map(name => `${name} is emitted into the fixture but is in neither REQUIRED_ARTIFACTS nor NOT_ARTIFACTS: nothing hashes it, so a stale or altered copy of it would verify as intact (add it to the manifest, or exclude it there by name with a reason)`);
};

export const buildProvenance = (fixtureDir, root, commit) => ({
  schema: SCHEMA,
  commit,
  generatedAt: new Date().toISOString(),
  artifacts: Object.fromEntries(REQUIRED_ARTIFACTS
    .filter(name => existsSync(join(fixtureDir, name)))
    .map(name => [name, hashFile(join(fixtureDir, name))])),
  links: Object.fromEntries(REQUIRED_LINKS.map(name => {
    const path = join(fixtureDir, "node_modules", name);
    let target = null;
    try { target = readlinkSync(path); } catch { target = null; }
    return [name, target];
  })),
  packages: Object.fromEntries(SIGNED_PACKAGES.map(relative => [relative, signDirectory(join(root, relative))])),
});

// Returns a list of problems. An empty list is the only thing a caller may treat as "verified"; a
// caller that merely checks for a thrown error would miss every one of these.
export const verifyFixture = (fixtureDir, { root, expectedCommit }) => {
  // The workspace every link must point into, resolved once, so a symlinked root does not
  // make a legitimate link look foreign.
  const rootDir = realpathSync(resolve(root));
  const problems = [];
  const dir = resolve(fixtureDir);
  const file = join(dir, PROVENANCE_FILE);
  if (!existsSync(file)) {
    problems.push(`${dir} carries no ${PROVENANCE_FILE}: it was written by a generator that does not record provenance, so nothing here can say which commit it belongs to`);
    return problems;
  }
  let record;
  try {
    record = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    problems.push(`${file} is not readable JSON: ${error.message}`);
    return problems;
  }
  if (record.schema !== SCHEMA) problems.push(`${PROVENANCE_FILE} has schema ${record.schema}, this gate understands ${SCHEMA}`);
  if (!record.commit) problems.push(`${PROVENANCE_FILE} records no commit`);
  else if (expectedCommit && record.commit !== expectedCommit) {
    problems.push(`the fixture was generated at ${record.commit} but the head under test is ${expectedCommit}: a fixture from another commit is not evidence about this one`);
  }
  if (!expectedCommit) problems.push("the head under test could not be determined, so the fixture's commit cannot be checked; set KINETIX_CREATE_FIXTURE_COMMIT");

  // An unlisted emitted file is a hole in the manifest, so it is reported against the fixture
  // rather than left for whoever next edits the generator.
  problems.push(...manifestGaps(fixtureDir));
  for (const name of REQUIRED_ARTIFACTS) {
    const path = join(dir, name);
    if (!existsSync(path)) { problems.push(`missing artifact ${name}`); continue; }
    const recorded = record.artifacts?.[name];
    if (!recorded) { problems.push(`${name} is present but carries no recorded hash`); continue; }
    const actual = hashFile(path);
    // A PARTIAL regeneration is the case this catches: the generator rewrote design.tsx and then
    // threw before esbuild, leaving an earlier bundle.js beside it. Both files exist, the directory
    // looks complete, and only the hashes disagree.
    if (actual !== recorded) problems.push(`${name} does not match its recorded hash (recorded ${recorded.slice(0, 12)}, found ${actual.slice(0, 12)}): the fixture was regenerated in part`);
  }

  for (const name of REQUIRED_LINKS) {
    const path = join(dir, "node_modules", name);
    let link = null;
    try { link = lstatSync(path); } catch { problems.push(`node_modules/${name} is absent`); continue; }
    if (!link.isSymbolicLink()) { problems.push(`node_modules/${name} is not a symlink`); continue; }
    const target = readlinkSync(path);
    if (record.links?.[name] && record.links[name] !== target) problems.push(`node_modules/${name} points at ${target}, recorded ${record.links[name]}`);
    // AND IT MUST POINT INTO THE WORKSPACE BEING SIGNED. The generator's `link()` swallows EEXIST,
    // so a fixture directory reused while its previous workspace still exists keeps the OLD links —
    // and the packages esbuild actually consumed are then the old workspace's, while the signature
    // below attests `root/packages/*/dist`. Both halves agree with their records, and the fixture
    // passes while describing output no one built here. Found in review, reproduced: verifyFixture
    // returned no problems with the package links pointing at different output than was signed.
    try {
      const resolved = realpathSync(path);
      const inside = resolved === rootDir || resolved.startsWith(rootDir + sep);
      if (!inside) {
        problems.push(`node_modules/${name} resolves to ${resolved}, which is outside the workspace this fixture is signed against (${rootDir}): the packages it was built from are not the packages described here`);
      }
    } catch {
      /* unresolvable: already reported as dangling or unresolvable above */
    }
    // The stale-symlink case: the target was inside a disposable worktree that has been destroyed.
    if (!existsSync(path)) problems.push(`node_modules/${name} is a dangling symlink to ${target}: this fixture directory was reused across worktrees`);
    else {
      try { statSync(path); } catch { problems.push(`node_modules/${name} cannot be resolved: ${target}`); }
    }
  }

  for (const relative of SIGNED_PACKAGES) {
    const recorded = record.packages?.[relative];
    const actual = signDirectory(join(root, relative));
    if (!recorded) { problems.push(`${relative} carries no recorded signature`); continue; }
    if (!actual) { problems.push(`${relative} is absent from the workspace, but the fixture was built against it`); continue; }
    if (actual.signature !== recorded.signature) {
      problems.push(`${relative} has changed since the fixture was built (recorded ${recorded.files} files ${recorded.signature.slice(0, 12)}, found ${actual.files} files ${actual.signature.slice(0, 12)}): the bundle embeds the earlier output`);
    }
  }
  return problems;
};

// The presence-only predicate this work replaces, kept as a NAMED function rather than deleted,
// because the negative control's whole job is to demonstrate that it accepts a fixture the new one
// rejects. A control that cannot run the old behaviour cannot prove the new behaviour differs.
export const presenceOnlyAccepts = fixtureDir => existsSync(join(resolve(fixtureDir), "index.html"));
