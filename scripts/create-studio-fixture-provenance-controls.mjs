#!/usr/bin/env node
//
// THE CONTROL FOR THE PROVENANCE CHECK ITSELF.
//
// Its job is not to show that a correct fixture passes — that proves nothing about the instrument.
// It is to show, for each way a fixture can be wrong, that the OLD presence-only predicate ACCEPTS
// it and the new one REJECTS it. Both halves are necessary: a control that only demonstrated the
// new rejection could not tell a real improvement from a check that was always there.
//
// `presenceOnlyAccepts` is kept in the production module for exactly this reason, rather than being
// deleted along with the behaviour it describes.
//
// Each arm says whether it REPRODUCES something that happened or CONSTRUCTS a case that has not yet
// been seen, because those are different kinds of evidence and collapsing them would overstate what
// this file proves. The arm that matters most — a complete, internally consistent fixture generated
// from a different commit — is a construction: the measured incident was a partial regeneration,
// and the other-commit case is what would happen if a fixture directory were reused across heads.
//
// Usage: node scripts/create-studio-fixture-provenance-controls.mjs
//   CREATE_PROVENANCE_FIXTURE   an already-generated fixture to copy from (otherwise one is built)
import { cp, mkdtemp, rm, writeFile, appendFile, readFile, unlink, symlink } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyFixture, presenceOnlyAccepts, headCommit, PROVENANCE_FILE } from "./create-studio-fixture-provenance.mjs";

const root = resolve(import.meta.dirname, "..");
const commit = headCommit(root);
if (!commit) { console.error("could not determine the head commit"); process.exit(2); }

let problems = 0;
const results = [];
const check = (name, kind, ok, detail) => {
  results.push({ name, kind, ok, detail });
  if (!ok) problems += 1;
  console.log(`${ok ? "CONTROL PASS" : "CONTROL FAILED"}  [${kind}] ${name}\n              ${detail}`);
};

// A clean fixture to work from. Generating one costs a vitest run, so an existing one is reused
// when the caller offers it — but it is verified first, because a control built on a fixture that
// was already broken would report its own setup as a finding.
const source = process.env.CREATE_PROVENANCE_FIXTURE;
let base = source;
if (!base) {
  base = await mkdtemp(join(tmpdir(), "kinetix-provenance-base-"));
  execFileSync("pnpm", ["--filter", "@kinetixui/web", "--fail-if-no-match", "exec", "vitest", "run", "src/lib/create-studio/consumer-fixture.test.ts"],
    { cwd: root, stdio: "inherit", env: { ...process.env, KINETIX_CREATE_EXPORT_FIXTURE: base } });
}
const baseProblems = verifyFixture(base, { root, expectedCommit: commit });
if (baseProblems.length) {
  console.error(`REFUSING: the fixture this control copies from is itself not verifiable:\n  - ${baseProblems.join("\n  - ")}`);
  process.exit(2);
}
console.log(`base fixture ${base} verifies at ${commit}\n`);

const arena = await mkdtemp(join(tmpdir(), "kinetix-provenance-arena-"));
const clone = async name => {
  const dir = join(arena, name);
  await cp(base, dir, { recursive: true, verbatimSymlinks: true });
  return dir;
};

// --- the positive arm, first, so a verifier that rejects EVERYTHING cannot look like a success ---
{
  const dir = await clone("untouched");
  const found = verifyFixture(dir, { root, expectedCommit: commit });
  check("an untouched copy of this commit's fixture is accepted", "positive", found.length === 0,
    found.length === 0 ? "0 problems" : `unexpected problems: ${found.join("; ")}`);
}

const arm = async (name, kind, mutate, expect) => {
  const dir = await clone(name);
  await mutate(dir);
  const accepted = presenceOnlyAccepts(dir);
  const found = verifyFixture(dir, { root, expectedCommit: commit });
  const matched = found.filter(problem => problem.includes(expect));
  check(name, kind, accepted && matched.length > 0,
    `presence-only ${accepted ? "ACCEPTS" : "rejects"} it; provenance reports ${found.length} problem(s)` +
    (matched.length ? `, including: ${matched[0]}` : `; none mentioning "${expect}": ${found.join("; ") || "none"}`));
  return dir;
};

// 1 · A complete, internally consistent fixture generated from a DIFFERENT commit. Every file is
//     present, every hash matches its record, every link resolves — the only thing wrong is which
//     commit it describes, which is precisely what a reused fixture directory across two heads
//     looks like, and precisely what presence cannot see.
await arm("a fixture generated from another commit", "construction", async dir => {
  const record = JSON.parse(await readFile(join(dir, PROVENANCE_FILE), "utf8"));
  record.commit = "0".repeat(39) + "1";
  await writeFile(join(dir, PROVENANCE_FILE), JSON.stringify(record, null, 2));
}, "is not evidence about this one");

// 2 · A PARTIAL regeneration: fresh source beside a bundle that is not the one this source
//     produces. This is the shape of the measured incident — `tsc` threw before `esbuild` ran, so
//     `design.tsx` was rewritten and `bundle.js` was left behind from an earlier commit.
await arm("a bundle that is not the one this source produces", "reproduction", async dir => {
  await appendFile(join(dir, "bundle.js"), "\n// left behind by an earlier generation\n");
}, "regenerated in part");

// 3 · A reused fixture directory whose symlinks point into a destroyed disposable worktree. The
//     generator's link() swallows EEXIST, so nothing refreshes them and `tsc` fails with
//     `Cannot find module 'react'` for a reason unrelated to the candidate.
await arm("a dangling symlink into a destroyed worktree", "reproduction", async dir => {
  await unlink(join(dir, "node_modules/react"));
  await symlink("/tmp/kinetix-dw.destroyed/node_modules/react", join(dir, "node_modules/react"));
}, "dangling symlink");

// 4 · A missing artifact. The fixture still serves and still holds an index.html.
await arm("a missing artifact", "reproduction", async dir => {
  await unlink(join(dir, "utilities.css"));
}, "missing artifact utilities.css");

// 4b · The emitted stylesheet. index.html loads bundle.css, and it was in no manifest: neither
//      generation nor verification hashed it, so a stale stylesheet could be certified as intact.
//      Found in review, which is why this arm exists at all.
await arm("a stale emitted stylesheet", "reproduction", async dir => {
  await appendFile(join(dir, "bundle.css"), "\n/* left behind by an earlier generation */\n");
}, "bundle.css does not match its recorded hash");

// 4c · A package link into ANOTHER workspace. The generator's link() swallows EEXIST, so a reused
//      fixture directory keeps the old links while the signature attests this workspace's dist:
//      both halves agree with their records, and the fixture describes output nobody built here.
//      The link is repointed at a copy outside the root, which is what a previous worktree is.
await arm("a package link into another workspace", "construction", async dir => {
  const foreign = await mkdtemp(join(tmpdir(), "kinetix-foreign-workspace-"));
  await cp(join(root, "packages/ui"), join(foreign, "ui"), { recursive: true, verbatimSymlinks: true });
  await unlink(join(dir, "node_modules/@kinetixui/ui"));
  await symlink(join(foreign, "ui"), join(dir, "node_modules/@kinetixui/ui"));
}, "outside the workspace this fixture is signed against");

// 5 · The built library output has changed since the fixture was bundled, so the bundle embeds the
//     earlier output. Run inside a disposable copy of the dist directory, never the workspace's.
{
  const dir = await clone("changed-package-output");
  const record = JSON.parse(await readFile(join(dir, PROVENANCE_FILE), "utf8"));
  record.packages["packages/ui/dist"].signature = "f".repeat(64);
  await writeFile(join(dir, PROVENANCE_FILE), JSON.stringify(record, null, 2));
  const accepted = presenceOnlyAccepts(dir);
  const found = verifyFixture(dir, { root, expectedCommit: commit });
  const matched = found.filter(p => p.includes("has changed since the fixture was built"));
  check("a fixture built against different package output", "construction", accepted && matched.length > 0,
    `presence-only ${accepted ? "ACCEPTS" : "rejects"} it; ${matched[0] ?? found.join("; ")}`);
}

// 6 · No provenance at all — a fixture written by a generator that predates this work. Presence
//     accepts it; the verifier must say what is missing rather than treating absence as consent.
await arm("a fixture with no provenance record", "reproduction", async dir => {
  await unlink(join(dir, PROVENANCE_FILE));
}, "carries no provenance.json");

// 7 · And the head itself must be known. A verifier that silently skipped the commit comparison
//     when it could not determine the head would be the original fail-open in a new place.
{
  const dir = await clone("unknown-head");
  const found = verifyFixture(dir, { root, expectedCommit: null });
  const matched = found.filter(p => p.includes("could not be determined"));
  check("an unknown head under test is itself a problem", "construction", matched.length > 0,
    matched[0] ?? `expected a complaint about the unknown head, got: ${found.join("; ") || "none"}`);
}

await rm(arena, { recursive: true, force: true });
if (!source) await rm(base, { recursive: true, force: true });

console.log(`\nprovenance controls — ${results.length} arms, ${problems} problem(s)`);
console.log(`  positive ${results.filter(r => r.kind === "positive").length}` +
  `, reproductions ${results.filter(r => r.kind === "reproduction").length}` +
  `, constructions ${results.filter(r => r.kind === "construction").length}`);
process.exit(problems > 0 ? 1 : 0);
