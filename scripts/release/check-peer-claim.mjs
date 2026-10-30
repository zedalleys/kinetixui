/** Fail a pull request that changes a published peer claim without publishing it.
 *
 * `auditPeerCompatibility` reads the **repository's** manifest (`peers.mjs`, `pkg.manifest[PEER_FIELD]`),
 * not the published one. So widening a peer range in the repository is enough to make
 * `release:check` pass — even when the package declaring it is not in the release, and the widened
 * claim therefore never reaches npm.
 *
 * Measured on `main` a92de6e9: with a core minor pending and `@kinetixui/angular`'s tokens peer
 * widened to `<0.28.0` but no `@kinetixui/angular` changeset, `release:check` reports ok, the plan
 * contains only ui/tokens/cli, and npm's `@kinetixui/angular@0.26.1` still declares `<0.27.0`. A
 * consumer installing tokens 0.27.0 beside it hits a peer conflict against a green CI.
 *
 * `release:check`'s own diagnostic already tells you to "add a changeset for @kinetixui/angular so
 * the new claim reaches npm". Nothing enforced it. This does.
 *
 * It is a change detector, not a compatibility checker: it says nothing about whether a range is
 * *correct*, only that a range the pull request **changed** will actually be published. Deciding
 * the range is still a human judgement, and `release:check` still tests it.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plannedVersions, readPendingChangesets } from "./peers.mjs";

const PEER_FIELD = "peerDependencies";
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => JSON.parse(readFileSync(path.join(root, p), "utf8"));

/** A file as the base branch has it, or null when it is absent there. */
function atBase(ref, file) {
  const r = spawnSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

/** Every package `changeset version` would publish, keyed by name. */
export function plannedFor(packages, config, changesets) {
  return plannedVersions({
    packages,
    changesets,
    fixed: config.fixed ?? [],
    linked: config.linked ?? [],
    ignore: config.ignore ?? [],
  });
}

/**
 * Peer ranges this tree changed against `base`, on packages that will not be published.
 *
 * @param {{name: string, directory: string}[]} allowlist packages that reach npm
 * @param {(file: string) => string|null} base reader for the base branch
 * @param {(file: string) => object} here reader for this tree
 * @param {Set<string>} publishing names in the planned release
 */
export function unpublishedClaimChanges({ allowlist, base, here, publishing }) {
  const out = [];
  for (const entry of allowlist) {
    const file = `${entry.directory}/package.json`;
    const before = base(file);
    if (before === null) continue; // a package new on this branch has no claim to contradict
    const was = JSON.parse(before)[PEER_FIELD] ?? {};
    const now = here(file)[PEER_FIELD] ?? {};
    if (publishing.has(entry.name)) continue; // the new claim ships with it

    for (const dependency of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (was[dependency] === now[dependency]) continue;
      out.push({ package: entry.name, file, dependency, was: was[dependency], now: now[dependency] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------

export function main() {
  const baseRef = process.env.PEER_CLAIM_BASE_REF || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main");
  if (spawnSync("git", ["rev-parse", "--verify", `${baseRef}^{commit}`], { cwd: root }).status !== 0) {
    // Nothing to compare against means no change can be detected. Say so rather than pass silently.
    console.log(`check:peer-claim — skipped: ${baseRef} could not be resolved, so no change could be detected.`);
    return 0;
  }

  const allowlist = read("release/publish-packages.json").packages;
  const packages = allowlist.map((e) => read(`${e.directory}/package.json`)).filter(Boolean);
  const planned = plannedFor(packages, read(".changeset/config.json"), readPendingChangesets(root));

  const changes = unpublishedClaimChanges({
    allowlist,
    base: (f) => atBase(baseRef, f),
    here: (f) => read(f),
    publishing: new Set(planned.keys()),
  });

  if (changes.length === 0) {
    console.log("check:peer-claim — ok, every changed peer range belongs to a package this release publishes.");
    return 0;
  }

  const lines = changes.map(
    (c) => `  ✗ ${c.file} changes ${c.dependency} from ${JSON.stringify(c.was ?? null)} to ${JSON.stringify(c.now ?? null)},\n` +
           `    but ${c.package} is not in this release, so the new claim never reaches npm.\n` +
           `    Add a changeset for ${c.package}, or revert the range.`,
  );
  console.error(`check:peer-claim — FAIL\n\n${lines.join("\n\n")}\n
  release:check reads this repository's manifest, not the published one, so it passes on a widened
  range that will not be published. npm keeps the old claim and a consumer hits a peer conflict
  against a green CI.\n`);
  return 1;
}

if (import.meta.url === new URL(`file://${process.argv[1] ?? ""}`).href || (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  process.exit(main());
}
