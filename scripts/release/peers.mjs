/**
 * Peer-dependency compatibility across independently versioned cohorts.
 *
 * A `dependencies` entry is a resolved edge: the package manager picks one version and Changesets
 * owns the range, rewriting it on every internal bump. A `peerDependencies` entry is not that. It is
 * a *claim* — "bring me a @kinetixui/tokens in this range and I will work" — and the package cannot
 * resolve it, only assert it. So there is exactly one question worth asking about it:
 *
 *   does the range this package already declares accept the version the release is about to publish?
 *
 * If yes, nothing needs to change and nothing should: rewriting `^0.23.0` to `^0.23.3` on a package
 * that is not being released narrows a claim for no reason and makes the repository disagree with an
 * artifact that can no longer be changed. If no, the claim has become false, and that is not
 * something to compute — someone has to decide what the package is compatible with and say so.
 *
 * Both halves live here. `plannedVersions` says what the release will publish; `auditPeerCompatibility`
 * checks every claim against it. Both are pure, take manifests they were handed, and never touch the
 * network — which is what lets `release:check` run this on an ordinary pull request, before the
 * Version Packages PR exists.
 *
 * See RELEASING.md → "Peer ranges across cohorts".
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import semver from "semver";

/** The only dependency field that carries a compatibility claim rather than a resolved edge. */
export const PEER_FIELD = "peerDependencies";

/** Bump types, weakest first. `changeset version` uses the strongest one named for a package. */
const BUMP_ORDER = ["none", "patch", "minor", "major"];

const higher = (a, b) => (BUMP_ORDER.indexOf(b) > BUMP_ORDER.indexOf(a) ? b : a);

/**
 * Parse one changeset's frontmatter into the releases it names.
 *
 * The body is prose and is deliberately ignored. Quoted and unquoted package names are both valid
 * YAML and both appear in the wild, so both are accepted.
 *
 * @param {string} text the file's contents
 * @returns {{name: string, type: "patch"|"minor"|"major"}[]}
 */
export function parseChangeset(text) {
  const frontmatter = text.split(/^---\s*$/m)[1] ?? "";
  return [...frontmatter.matchAll(/^\s*"?([^"\s:]+)"?\s*:\s*(patch|minor|major)\s*$/gm)].map(([, name, type]) => ({
    name,
    type,
  }));
}

/**
 * Every pending changeset in the repository. The filesystem half; everything downstream is pure.
 *
 * @param {string} root repository root
 * @returns {{id: string, releases: {name: string, type: string}[]}[]}
 */
export function readPendingChangesets(root) {
  const dir = path.join(root, ".changeset");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort()
    .map((name) => ({
      id: name.replace(/\.md$/, ""),
      releases: parseChangeset(readFileSync(path.join(dir, name), "utf8")),
    }));
}

/**
 * The version each directly named package will carry once `changeset version` runs.
 *
 * This mirrors Changesets' own arithmetic for the packages a changeset names: the strongest bump
 * type wins, `semver.inc` applies it, and a `fixed` or `linked` group moves as one — every member to
 * the same version, derived from the highest version in the group. That is enough, because the only
 * thing a peer claim is measured against is the version of the package being *depended on*, and a
 * package only reaches a new version by being named (directly or through its cohort).
 *
 * Deliberately *not* modelled: bumps a package receives purely for depending on something else.
 * Those never change the depended-on version, so they cannot make a peer claim false — and
 * predicting them would mean re-implementing the dependent graph rather than checking a claim.
 * `version-generation.test.mjs` runs the real `changeset version` and asserts this agrees with it.
 *
 * @param {object} input
 * @param {{name: string, version: string}[]} input.packages every workspace package
 * @param {{releases: {name: string, type: string}[]}[]} input.changesets pending changesets
 * @param {string[][]} [input.fixed] `.changeset/config.json` → `fixed`
 * @param {string[][]} [input.linked] `.changeset/config.json` → `linked`
 * @param {string[]} [input.ignore] `.changeset/config.json` → `ignore`
 * @returns {Map<string, string>} name → planned version, for the packages that will move
 */
export function plannedVersions({ packages, changesets, fixed = [], linked = [], ignore = [] }) {
  const current = new Map(packages.filter((pkg) => typeof pkg.version === "string").map((pkg) => [pkg.name, pkg.version]));
  const ignored = new Set(ignore);

  const bump = new Map();
  for (const changeset of changesets) {
    for (const { name, type } of changeset.releases) {
      if (ignored.has(name) || !current.has(name)) continue;
      bump.set(name, higher(bump.get(name) ?? "none", type));
    }
  }

  // A cohort that shares a version shares a bump. The base is the highest version in the group, not
  // each member's own: that is how a group whose members have drifted converges rather than staying
  // split. `fixed` and `linked` differ in when they apply, not in what they produce here.
  const base = new Map();
  for (const group of [...fixed, ...linked]) {
    const members = group.filter((name) => current.has(name) && !ignored.has(name));
    const type = members.reduce((strongest, name) => higher(strongest, bump.get(name) ?? "none"), "none");
    if (type === "none") continue;
    const highest = members.map((name) => current.get(name)).sort(semver.rcompare)[0];
    for (const name of members) {
      bump.set(name, type);
      base.set(name, highest);
    }
  }

  const planned = new Map();
  for (const [name, type] of bump) {
    if (type === "none") continue;
    const from = base.get(name) ?? current.get(name);
    const next = semver.valid(from) ? semver.inc(from, type) : null;
    if (next) planned.set(name, next);
  }
  return planned;
}

/**
 * Check every peer claim an allowlisted package makes about another allowlisted package against the
 * version this release will publish.
 *
 * Scope is deliberate on three axes:
 *
 *   - **`peerDependencies` only.** `dependencies` are resolved edges Changesets is supposed to
 *     rewrite; flagging them would report the tool doing its job.
 *   - **Workspace packages only.** `react >=18` is a claim about somebody else's release train and
 *     nothing here can plan it.
 *   - **`workspace:` specs skipped.** They are rewritten to a concrete range at pack time, so the
 *     source text is not the claim a consumer ever sees.
 *
 * Nothing is exempted for being mid-release. A package that *is* being released still has to declare
 * a range that accepts what ships — the release is what makes the claim reach consumers, not what
 * excuses it.
 *
 * @param {object} input
 * @param {{name: string, version: string, directory: string, manifest: object}[]} input.packages
 * @param {{name: string}[]} input.allowlist validated `release/publish-packages.json` packages
 * @param {Map<string, string>} [input.planned] from `plannedVersions`
 * @returns {{ok: boolean, errors: string[], checked: object[]}}
 */
export function auditPeerCompatibility({ packages, allowlist, planned = new Map() }) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const allowlisted = new Set(allowlist.map((entry) => entry.name));
  const errors = [];
  const checked = [];

  for (const entry of allowlist) {
    const pkg = byName.get(entry.name);
    if (!pkg) continue; // `classify()` already reports an allowlist entry with no package

    const peers = pkg.manifest?.[PEER_FIELD] ?? {};
    for (const [dependency, range] of Object.entries(peers)) {
      if (typeof range !== "string") continue;
      if (!allowlisted.has(dependency) || !byName.has(dependency)) continue;
      if (range.startsWith("workspace:")) continue;

      const at = `${pkg.directory}/package.json`;
      if (semver.validRange(range) === null) {
        errors.push(
          `${pkg.name}: ${at} declares ${dependency} "${range}", which is not a valid semver range. ` +
            `A peer range a consumer's package manager cannot parse is not a compatibility claim.`,
        );
        continue;
      }

      const next = planned.get(dependency) ?? byName.get(dependency).version;
      const releasing = planned.has(pkg.name);
      const satisfied = semver.satisfies(next, range);
      checked.push({ dependent: pkg.name, dependentVersion: pkg.version, dependency, range, next, satisfied, releasing });
      if (!satisfied) errors.push(incompatible({ pkg, dependency, range, next, releasing, at }));
    }
  }

  return { ok: errors.length === 0, errors, checked };
}

/**
 * The diagnostic. Every value is read from the repository — no example versions, no package names
 * baked in — because the whole point is that the reader can act on it without going and looking
 * anything up.
 */
function incompatible({ pkg, dependency, range, next, releasing, at }) {
  const position = releasing
    ? `${pkg.name} is in this release, so that range is what consumers will resolve against.`
    : `${pkg.name} is not in this release. ${pkg.name}@${pkg.version} is already published\ndeclaring "${range}", and cannot be changed.`;

  return (
    `${pkg.name}@${pkg.version} declares ${dependency} "${range}",\n` +
    `but the planned ${dependency} version is ${next}.\n` +
    `\n` +
    `${position}\n` +
    `\n` +
    `Left alone, \`changeset version\` widens the range to cover ${next} and gives\n` +
    `${pkg.name} a patch bump to carry it — a compatibility claim nobody made.\n` +
    `\n` +
    `Decide it deliberately: widen ${dependency} in ${at}\n` +
    `to a range that accepts ${next}, and add a changeset for ${pkg.name} so the new\n` +
    `claim reaches npm. Or keep ${dependency} inside the range ${pkg.name}\n` +
    `already supports.`
  );
}

/**
 * Check that no peer claim has stopped accepting a version it was already published accepting.
 *
 * `auditPeerCompatibility` above asks one question — does this range accept what is about to ship —
 * and a range can satisfy it while having become *narrower*. That is not hypothetical: when
 * @kinetixui/tokens crossed @kinetixui/angular's `<0.27.0` ceiling, `changeset version` rewrote the
 * range to `>=0.27.0 <0.28.0`. It accepts the new tokens, so the audit above passes, and the floor
 * silently rose from 0.24.0 — a *patch* release of @kinetixui/angular telling every consumer on
 * tokens 0.24–0.26 that it no longer supports them.
 *
 * So the floor is a declared value, not an inferred one. `peerFloor` in
 * `release/publish-packages.json` names the oldest version of each workspace peer a package is
 * published as supporting, and this asserts the manifest's range still accepts that version.
 * Raising a floor then means editing two files that each say so in plain text, which is the point:
 * the decision is visible in review rather than computed into a Version PR.
 *
 * What it checks is the lower bound, not the whole shape of the range: a range that kept 0.24.0 and
 * excluded something in the middle would pass. That case has never occurred here and inventing a
 * guard for it would mean declaring the full supported set of every peer; the bound that actually
 * moved is the one asserted.
 *
 * Deliberately NOT read from git. A baseline recovered from the base branch would be unavailable in
 * a shallow CI checkout, and a gate that skips itself when it cannot find its input is a gate that
 * cannot fail. A committed datum is available everywhere or absent loudly.
 *
 * Deliberately NOT escapable. There is no per-package waiver, because no release has needed to drop
 * peer support yet; when one does, the floor is what it edits, with a changeset saying why.
 *
 * @param {object} input
 * @param {{name: string, version: string, directory: string, manifest: object}[]} input.packages
 * @param {{name: string, peerFloor?: Record<string, string>}[]} input.allowlist
 * @returns {{ok: boolean, errors: string[], checked: object[]}}
 */
export function auditPeerFloors({ packages, allowlist }) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const errors = [];
  const checked = [];

  for (const entry of allowlist) {
    const floors = entry.peerFloor;
    if (!floors || typeof floors !== "object") continue;
    const pkg = byName.get(entry.name);
    if (!pkg) continue; // `classify()` already reports an allowlist entry with no package

    const at = `${pkg.directory}/package.json`;
    for (const [dependency, floor] of Object.entries(floors)) {
      if (semver.valid(floor) === null) {
        errors.push(
          `${entry.name}: release/publish-packages.json declares a peerFloor for ${dependency} of ` +
            `"${floor}", which is not a single semver version. The floor is one version — the oldest ` +
            `one still supported — not a range.`,
        );
        continue;
      }

      const range = pkg.manifest?.[PEER_FIELD]?.[dependency];
      if (typeof range !== "string") {
        errors.push(
          `${entry.name}: release/publish-packages.json declares a peerFloor for ${dependency}, ` +
            `but ${at} declares no ${dependency} peer range at all. Either the peer was removed — ` +
            `which drops support for the version the floor names — or the floor is stale.`,
        );
        continue;
      }
      if (semver.validRange(range) === null) continue; // auditPeerCompatibility reports the parse failure

      const keeps = semver.satisfies(floor, range);
      checked.push({ dependent: entry.name, dependency, floor, range, keeps });
      if (!keeps) {
        errors.push(
          `${entry.name}@${pkg.version} declares ${dependency} "${range}",\n` +
            `which no longer accepts ${dependency}@${floor} — the oldest version this package is\n` +
            `published as supporting.\n` +
            `\n` +
            `Narrowing a peer range drops support a published artifact already claimed. A consumer on\n` +
            `an older ${dependency} that takes this release gets an unmet peer, and if this package is\n` +
            `releasing as a patch, nothing in its version tells them so.\n` +
            `\n` +
            `Widening the ceiling is the usual fix: keep the lower bound and raise the upper one in\n` +
            `${at}. If support really is being dropped, say so — raise peerFloor for\n` +
            `${dependency} in release/publish-packages.json and add a changeset explaining it.`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, checked };
}
