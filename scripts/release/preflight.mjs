/**
 * The preflight, and the publish that consumes it.
 *
 * `preflight()` is the whole validation pipeline and it returns the packed artifacts it proved.
 * `publish()` takes those artifacts and uploads them. There is no path from `publish()` back to the
 * workspace: it cannot discover a package, cannot re-read a manifest, and cannot reach anything
 * `preflight()` did not hand it. `pnpm release` is literally `publish(await preflight(...))`, which
 * is what makes "preflight and publish agree" a property of the code rather than a convention.
 *
 * What this does NOT buy:
 *
 *   npm publication is not transactional. Publishing N packages is N uploads, and a registry, auth
 *   or network failure between two of them still leaves a partial release. What preflight removes
 *   is the deterministic half — every packaging, metadata, entry-point and publish-set failure the
 *   repository can decide for itself now happens before the first upload. 0.23.0 failed on a
 *   deterministic one.
 */
import { readFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { discoverWorkspace } from "./workspace.mjs";
import { buildPlan, isNoOp } from "./plan.mjs";
import { readPendingChangesets } from "./peers.mjs";
import { confirmPublished, lookupRegistryState } from "./registry.mjs";
import { buildPlanned, packPlanned, smokeTest, validatePackedArtifact } from "./artifacts.mjs";
import { run, packageManagerCommand, resolveInside } from "./exec.mjs";

export class ReleaseError extends Error {
  constructor(errors) {
    super(errors.join("\n\n"));
    this.name = "ReleaseError";
    this.errors = errors;
  }
}

/** Read the allowlist and the workspace, and decide the publish set. No building, no network unless asked. */
export async function plan({ root, consultRegistry = true, fetchImpl }) {
  const allowlistFile = JSON.parse(readFileSync(resolveInside(root, "release/publish-packages.json"), "utf8"));
  const rootManifest = JSON.parse(readFileSync(resolveInside(root, "package.json"), "utf8"));
  const changesetConfig = JSON.parse(readFileSync(resolveInside(root, ".changeset/config.json"), "utf8"));
  const packages = discoverWorkspace(root);
  // Read once and passed down, so the peer audit sees the same pending release the plan does.
  const pendingChangesets = readPendingChangesets(root);
  const common = {
    allowlistFile,
    packages,
    rootScriptNames: Object.keys(rootManifest.scripts ?? {}),
    pendingChangesets,
    changesetConfig,
  };

  // The registry is only worth asking about packages that survived the local contract, so a first
  // pass without it decides who the candidates are.
  const offline = buildPlan(common);
  if (!consultRegistry || offline.errors.length > 0) return offline;

  const registryState = await lookupRegistryState(
    offline.publish.map((target) => ({ name: target.name, version: target.version })),
    { registry: offline.registryUrl, fetchImpl },
  );
  return buildPlan({ ...common, registryState });
}

/**
 * Plan, build, pack, validate every tarball, and prove each one in a clean consumer. Nothing here
 * mutates the registry.
 *
 * @returns {Promise<{plan: object, packed: object[], outDir: string|null, builds: string[]}>}
 */
export async function preflight({ root, log = () => {}, fetchImpl, skipSmokeTests = false }) {
  const releasePlan = await plan({ root, fetchImpl });
  if (!releasePlan.ok) throw new ReleaseError(releasePlan.errors);

  if (isNoOp(releasePlan)) {
    log("Nothing to publish — every allowlisted version is already on the registry.");
    return { plan: releasePlan, packed: [], outDir: null, builds: [] };
  }

  const builds = await buildPlanned(releasePlan, { root, log });
  const { outDir, packed } = await packPlanned(releasePlan, { root, log });

  const errors = [];
  for (const artifact of packed) {
    errors.push(
      ...validatePackedArtifact({
        name: artifact.name,
        version: artifact.version,
        requireFiles: artifact.allowlist.requireFiles,
        paths: artifact.paths,
        manifest: artifact.manifest,
        manifestError: artifact.manifestError,
      }),
    );
  }
  if (errors.length > 0) {
    rmSync(outDir, { recursive: true, force: true });
    throw new ReleaseError([...errors, "No package was published."]);
  }

  if (!skipSmokeTests) {
    const smokeErrors = await smokeTest(packed, { root, log, extraDependencies: consumerPeers(packed) });
    if (smokeErrors.length > 0) {
      rmSync(outDir, { recursive: true, force: true });
      throw new ReleaseError([...smokeErrors, "No package was published."]);
    }
  }

  // The publish rehearsal the package manager itself offers, run last and treated as a
  // corroboration rather than the guarantee — everything above is the repository's own answer.
  const { file, prefix } = packageManagerCommand();
  for (const artifact of packed) {
    log(`dry-run: ${artifact.name}@${artifact.version}`);
    await run(file, [...prefix, "publish", artifact.tarball, "--dry-run", "--no-git-checks", "--access", "public"], { cwd: root });
  }

  return { plan: releasePlan, packed, outDir, builds };
}

/** React and react-dom are peers of @kinetixui/ui; the consumer needs them to resolve the import. */
function consumerPeers(packed) {
  return packed.some((artifact) => artifact.name === "@kinetixui/ui") ? ["react@19", "react-dom@19"] : [];
}

/**
 * Publish exactly the artifacts preflight produced.
 *
 * Each upload is the tarball that was validated, not a fresh pack, so nothing can differ between
 * what was proved and what is sent. Uploads are sequential and the first failure stops the rest:
 * with a partial release already possible, the useful thing is to stop somewhere describable.
 *
 * An upload exiting 0 is the package manager's claim, and this function used to end there — which is
 * the same kind of evidence that let 0.23.0 report a release it had not finished. So when a registry
 * is given, every version is confirmed against the registry itself before the caller goes on to
 * create tags. Nothing is tagged on the strength of an exit code.
 */
export async function publish({ root, packed, log = () => {}, dryRun = false, registry, confirm = confirmPublished, confirmOptions = {} }) {
  const { file, prefix } = packageManagerCommand();
  const published = [];
  for (const artifact of packed) {
    const args = [
      ...prefix,
      "publish",
      artifact.tarball,
      "--access",
      "public",
      "--provenance",
      "--no-git-checks",
      ...(dryRun ? ["--dry-run"] : []),
    ];
    log(`publish: ${artifact.name}@${artifact.version}`);
    try {
      await run(file, args, { cwd: root });
    } catch (error) {
      throw new ReleaseError([
        `Publishing ${artifact.name}@${artifact.version} failed after ${published.length} package(s) had already been published.`,
        published.length > 0
          ? `Published in this run: ${published.map((a) => `${a.name}@${a.version}`).join(", ")}. ` +
            `This is a partial release. Do not bump the version to retry — re-run the release and the ` +
            `plan will skip what is already on the registry. See RELEASING.md.`
          : "No package was published.",
        String(error.stderr || error.message).trim(),
      ]);
    }
    published.push(artifact);
  }

  /**
   * A dry run uploads nothing, so there is nothing to confirm and looking would only find the
   * previous version. Callers without a registry (the unit tests for the upload loop itself) opt out
   * the same way.
   */
  if (!dryRun && registry && published.length > 0) {
    assertAllConfirmed(
      published,
      await confirm(
        published.map(({ name, version }) => ({ name, version })),
        { registry, log, ...confirmOptions },
      ),
    );
  }

  return published;
}

/**
 * Turn a confirmation result into either nothing or a stop, and say which.
 *
 * Separate from `publish` so the decision is testable without a registry or a package manager — the
 * upload loop needs a subprocess, this does not, and this is the part with a judgement in it.
 *
 * The judgement: an unconfirmed version is *not* asserted to have failed. npm is not
 * read-your-writes, and in the 0.23.1 release the three core packages became visible 3, 4 and 7
 * minutes after their uploads. What the message has to convey is an unfinished release with a known
 * recovery, not a diagnosis nobody can support.
 *
 * @param {{name: string, version: string}[]} published
 * @param {{confirmed: {name: string, version: string}[],
 *          unconfirmed: {name: string, version: string, detail: string}[]}} result
 */
export function assertAllConfirmed(published, { confirmed, unconfirmed }) {
  if (unconfirmed.length === 0) return;
  const show = (list) => list.map((t) => `${t.name}@${t.version}`).join(", ");
  throw new ReleaseError([
    `Uploaded ${published.length} package(s), but the registry could not confirm ${show(unconfirmed)} ` +
      `within the wait window.`,
    confirmed.length > 0 ? `Confirmed on the registry: ${show(confirmed)}.` : "No version was confirmed on the registry.",
    ...unconfirmed.map((t) => `  ${t.name}@${t.version}: ${t.detail}`),
    "This is not proof the upload failed. npm is not read-your-writes, and a version can take minutes " +
      "to become visible; in the 0.23.1 release the three core packages appeared 3, 4 and 7 minutes " +
      "after their uploads.",
    "No release tag was created, which is the recoverable state: re-run the release once the registry " +
      "has caught up. The plan skips whatever is already published and the tag step then creates what " +
      "is owed. Do not bump the version to retry. See RELEASING.md.",
  ]);
}
