/**
 * The release plan.
 *
 * One function decides what npm publication may touch, and it is the only such function. The
 * preflight and the publish step both call it — the publish step does not re-derive anything, does
 * not re-read the workspace, and cannot reach a package the plan did not name. That is the
 * structural half of the 0.23.0 fix: the old pipeline validated nothing and then let
 * `pnpm -r publish` decide for itself what the workspace contained.
 *
 * `buildPlan` is pure. It takes manifests and registry answers that were gathered elsewhere, so
 * every case below — partial release, empty release, unreachable registry, an unapproved public
 * package — is a unit test rather than a rehearsal against npm.
 */
import { classify } from "./workspace.mjs";
import { validateAllowlist, validatePublishMetadata } from "./contract.mjs";

/**
 * @param {object} input
 * @param {unknown} input.allowlistFile parsed release/publish-packages.json
 * @param {{name: string, version: string, directory: string, manifest: object}[]} input.packages
 * @param {string[]} [input.rootScriptNames]
 * @param {Map<string, {state: string, detail: string}>} [input.registryState] omitted = not consulted
 */
export function buildPlan({ allowlistFile, packages, rootScriptNames = [], registryState = null }) {
  const errors = [];
  const allowlist = validateAllowlist(allowlistFile, rootScriptNames);
  errors.push(...allowlist.errors);

  const classified = classify(packages, allowlist.packages);
  errors.push(...classified.errors);

  // Packages belong to release cohorts. A cohort marked `sameVersion` releases in lockstep — that
  // is the rule for `core` (@kinetixui/{tokens,ui,cli}), where a mismatch means a manifest was
  // edited by hand. Cohorts are independent of one another: `angular` carrying a different version
  // from `core` is the design, not a defect, which is why this is no longer one version across the
  // whole allowlist.
  const byGroup = new Map();
  for (const pkg of classified.allowlisted) {
    const group = pkg.allowlist.releaseGroup;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(pkg);
  }

  const groupVersion = new Map();
  for (const [group, members] of byGroup) {
    const versions = members.map((pkg) => pkg.version).filter(Boolean);
    // The majority, so the error names the odd one out rather than every member of the cohort.
    groupVersion.set(group, versions.length > 0 ? mode(versions) : null);
  }

  for (const pkg of classified.allowlisted) {
    const group = pkg.allowlist.releaseGroup;
    errors.push(
      ...validatePublishMetadata(pkg, {
        expectedVersion: allowlist.groups[group]?.sameVersion ? groupVersion.get(group) : null,
        releaseGroup: group,
        packsFromArtifact: Boolean(pkg.allowlist.artifactDirectory),
        requireFiles: pkg.allowlist.requireFiles,
      }),
    );
  }

  const publish = [];
  const alreadyPublished = [];
  for (const pkg of classified.allowlisted) {
    const target = {
      name: pkg.name,
      version: pkg.version,
      directory: pkg.directory,
      releaseGroup: pkg.allowlist.releaseGroup,
      allowlist: pkg.allowlist,
    };
    if (!registryState) {
      publish.push({ ...target, registry: null });
      continue;
    }
    const state = registryState.get(pkg.name) ?? { state: "unknown", detail: "not looked up" };
    if (state.state === "published") {
      alreadyPublished.push({ ...target, registry: state });
    } else if (state.state === "unpublished") {
      publish.push({ ...target, registry: state });
    } else {
      errors.push(
        `Release preflight failed.\n` +
          `Could not determine whether ${pkg.name}@${pkg.version} is already on the registry ` +
          `(${state.detail}).\n` +
          `An unreachable registry is not the same as an unpublished version, so this stops here ` +
          `rather than guessing.\n` +
          `No package was published.`,
      );
    }
  }

  publish.sort(byName);
  alreadyPublished.sort(byName);

  /**
   * The same packages, split by cohort. Downstream stages use this rather than the flat lists
   * whenever "which release is this?" matters — most importantly tag reconciliation, which must
   * never be handed one cohort's tags while deriving another cohort's release commit.
   */
  const cohorts = [...byGroup.keys()].sort().map((group) => ({
    group,
    sameVersion: Boolean(allowlist.groups[group]?.sameVersion),
    version: groupVersion.get(group) ?? null,
    publish: publish.filter((target) => target.releaseGroup === group),
    alreadyPublished: alreadyPublished.filter((target) => target.releaseGroup === group),
  }));

  // Sorted by name and by group, so the plan — and everything rendered from it — is identical run
  // to run regardless of the order the workspace happened to be read in. A release plan that
  // reorders itself is a release plan nobody can diff.
  return {
    ok: errors.length === 0,
    errors,
    registryConsulted: Boolean(registryState),
    cohorts,
    publish,
    alreadyPublished,
    private: classified.private.map((pkg) => ({ name: pkg.name, version: pkg.version, directory: pkg.directory })).sort(byName),
    allowlist: allowlist.packages,
    groups: allowlist.groups,
    registryUrl: allowlist.registry,
  };
}

/**
 * One cohort's slice of a plan, in the shape the rest of the pipeline expects. This is what makes
 * tag reconciliation cohort-safe: it is handed a plan containing only the release it is
 * reconciling, so another cohort's historical tags are never in scope and its release commit is
 * never inferred from them.
 */
export function cohortPlan(plan, group) {
  const cohort = plan.cohorts.find((entry) => entry.group === group);
  if (!cohort) throw new Error(`no release cohort named ${JSON.stringify(group)}`);
  return { ...cohort, publish: cohort.publish, alreadyPublished: cohort.alreadyPublished };
}

const byName = (a, b) => a.name.localeCompare(b.name);

/** The most common value, ties broken by first appearance. */
function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = values[0];
  for (const [value, count] of counts) if (count > (counts.get(best) ?? 0)) best = value;
  return best;
}

/**
 * Nothing left to publish because every allowlisted version is already on the registry. A clean
 * no-op, not a failure: this is what an ordinary push to main looks like between releases, and
 * what the second half of a recovered partial release looks like once it has been completed.
 */
export function isNoOp(plan) {
  return plan.ok && plan.publish.length === 0;
}
