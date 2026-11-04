/** Fail a pull request whose changesets would publish a core version that has no curated note yet.
 *
 * `scripts/version-release-meta.mjs` refuses to build the Version PR unless
 * `release/notes/<core-version>.json` already exists and describes that exact version. That check
 * runs only on push to `main`, so it is invisible to the pull request that introduces the changeset
 * and fails after the merge, leaving `main` red on every later push. 0.26.0 and 0.26.1 both went
 * red exactly that way.
 *
 * This asks the same question one step earlier, from the changesets the merge would produce. It is
 * an early warning, not a replacement: the post-merge throw is untouched.
 *
 * The decision is a pure function of a checkout so it can be tested against throwaway workspaces;
 * running the file reports on this repository.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plannedVersions, readPendingChangesets } from "./peers.mjs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Every workspace package manifest, as `plannedVersions` wants them. */
function workspacePackages(dir) {
  const out = [];
  for (const base of ["packages", "apps"]) {
    const abs = path.join(dir, base);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const manifest = path.join(abs, name, "package.json");
      if (existsSync(manifest)) out.push(read(manifest));
    }
  }
  return out;
}

/**
 * Decide whether `root` carries the curated note its pending changesets will need.
 *
 * Returns `{ ok, version, file, reason }`. `version` is the planned `@kinetixui/ui` version, or
 * null when no pending changeset moves it — that is the package `version-release-meta.mjs` reads to
 * decide which note it needs, so it is the only one that matters here.
 */
export function releaseNoteStatus(root) {
  const config = read(path.join(root, ".changeset/config.json"));
  const planned = plannedVersions({
    packages: workspacePackages(root),
    changesets: readPendingChangesets(root),
    fixed: config.fixed ?? [],
    linked: config.linked ?? [],
    ignore: config.ignore ?? [],
  });

  const version = planned.get("@kinetixui/ui") ?? null;
  if (!version) {
    return { ok: true, version: null, file: null, reason: "no-core-move" };
  }

  // version-release-meta.mjs reads the note only when releases.ts does not already carry the entry
  // for that version. Mirror that condition exactly, or this gate fails a pull request that the
  // real step would wave through.
  const releases = readFileSync(path.join(root, "apps/web/src/lib/releases.ts"), "utf8");
  if (releases.includes(`version: "${version}"`)) {
    return { ok: true, version, file: null, reason: "already-in-releases" };
  }

  const file = path.join(root, "release/notes", `${version}.json`);
  const rel = path.relative(root, file);
  if (!existsSync(file)) {
    return { ok: false, version, file: rel, reason: "missing" };
  }

  const note = read(file);
  if (note.version !== version) {
    return { ok: false, version, file: rel, reason: "wrong-version", declared: note.version };
  }

  return { ok: true, version, file: rel, reason: "present" };
}

/** The human-readable report for a status, so the CLI and any caller word it the same way. */
export function formatStatus(status) {
  switch (status.reason) {
    case "no-core-move":
      return "check:release-note — no pending changeset moves @kinetixui/ui; no curated note needed.";
    case "already-in-releases":
      return `check:release-note — ok, apps/web/src/lib/releases.ts already carries ${status.version}; version-release-meta.mjs needs no curated note for it.`;
    case "present":
      return `check:release-note — ok, ${status.file} is present and describes ${status.version}.`;
    case "missing":
      return `check:release-note — FAIL

  The pending changesets would publish @kinetixui/ui ${status.version}, but ${status.file} does not exist.

  Merging this would leave main red on every push: scripts/version-release-meta.mjs throws
  "Missing curated release notes" and no Version PR can be built until the note is authored.

  Author ${status.file} (and have its public copy approved) before merging a changeset for ${status.version}.`;
    case "wrong-version":
      return `check:release-note — FAIL

  ${status.file} exists but describes version "${status.declared}", not ${status.version}.

  version-release-meta.mjs asserts these match and will throw after the merge.`;
    default:
      throw new Error(`Unknown release-note status: ${status.reason}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const status = releaseNoteStatus(fileURLToPath(new URL("../../", import.meta.url)));
  const report = formatStatus(status);
  if (status.ok) console.log(report);
  else console.error(report);
  process.exit(status.ok ? 0 : 1);
}
