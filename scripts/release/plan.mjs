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

  // One version across the published set is a repository rule (the Changesets `fixed` group), so a
  // mismatch means something edited a manifest by hand. Take the majority as expected so the error
  // names the odd one out rather than all three.
  const versions = classified.allowlisted.map((pkg) => pkg.version).filter(Boolean);
  const expectedVersion = versions.length > 0 ? mode(versions) : null;

  for (const pkg of classified.allowlisted) {
    errors.push(...validatePublishMetadata(pkg, { expectedVersion }));
  }

  const publish = [];
  const alreadyPublished = [];
  for (const pkg of classified.allowlisted) {
    const target = { name: pkg.name, version: pkg.version, directory: pkg.directory, allowlist: pkg.allowlist };
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

  // Sorted by name, so the plan — and everything rendered from it — is identical run to run
  // regardless of the order the workspace happened to be read in. A release plan that reorders
  // itself is a release plan nobody can diff.
  return {
    ok: errors.length === 0,
    errors,
    registryConsulted: Boolean(registryState),
    version: expectedVersion,
    publish: publish.sort(byName),
    alreadyPublished: alreadyPublished.sort(byName),
    private: classified.private.map((pkg) => ({ name: pkg.name, version: pkg.version, directory: pkg.directory })).sort(byName),
    allowlist: allowlist.packages,
    registryUrl: allowlist.registry,
  };
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
