/**
 * release-publish.mjs — the one place that mutates anything.
 *
 *   node scripts/release-publish.mjs
 *
 * Runs the preflight and then publishes exactly the artifacts it returned. The publish step is
 * handed tarball paths; it does not look at the workspace, so it cannot reach a package the plan
 * did not name. That is deliberate — the 0.23.0 release published a package nobody had approved
 * because `pnpm -r publish` decided for itself what the workspace contained.
 *
 * The lifecycle is:
 *
 *   preflight → publish whatever is missing → reconcile tags per release cohort → push what is owed
 *
 * Cohorts survive to the end on purpose. `@kinetixui/{tokens,ui,cli}` release in lockstep and
 * `@kinetixui/angular` releases on its own, so their tags belong to different commits; flattening
 * them before reconciliation would make one cohort's release look like a claim about the other's
 * history.
 *
 * It is not "if there is nothing to publish, stop". A release has two states that fail separately:
 * what is on the registry, and what is tagged. A run that published everything and then failed to
 * push its tags leaves an empty publish plan behind it, so treating an empty plan as a finished
 * release would make those tags unrepairable. Tag reconciliation therefore runs every time.
 *
 * npm publication is still not transactional: see RELEASING.md.
 */
import { preflight, publish, ReleaseError } from "./release/preflight.mjs";
import { cohortPlan } from "./release/plan.mjs";
import { formatPlan, planToMarkdown } from "./release/report.mjs";
import {
  reconcileReleaseTags,
  ReleaseCommitUnknownError,
  TagCreationError,
  TagIntegrityError,
  TagPushError,
} from "./release/tags.mjs";
import { appendFileSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const log = (message) => console.log(`  ${message}`);

function writeStepSummary(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  try {
    appendFileSync(target, `${markdown}\n`);
  } catch (error) {
    console.warn(`  (could not write the step summary: ${error.message})`);
  }
}

/**
 * A release must never run while changesets are pending: those changesets are the versions that
 * have not been applied yet, so publishing now would put the *old* version on npm permanently.
 *
 * `changesets/action` already guarantees this — its `switch (true)` reaches the publish branch only
 * under `!hasChangesets`, so a pending changeset routes to the Version Packages PR instead. This is
 * the same rule enforced here, so it holds however `pnpm release` is invoked.
 */
function pendingChangesets() {
  const dir = new URL("../.changeset/", import.meta.url);
  try {
    return readdirSync(dir).filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md");
  } catch {
    return [];
  }
}

let outDir = null;
try {
  const pending = pendingChangesets();
  if (pending.length > 0) {
    console.error(
      [
        `Refusing to publish: ${pending.length} changeset(s) are pending.`,
        `  ${pending.join(", ")}`,
        "",
        "A pending changeset means the versions in this tree are the ones about to be superseded.",
        "Publishing now would put the outgoing version on npm, where it cannot be replaced.",
        "Merge the Version Packages pull request first; the release runs from that merge.",
        "",
        "No package was published.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const result = await preflight({ root, log });
  outDir = result.outDir;

  console.log("");
  console.log(formatPlan(result.plan));
  console.log("");
  writeStepSummary(planToMarkdown(result.plan));

  const published = result.packed.length === 0 ? [] : await publish({ root, packed: result.packed, log });

  /**
   * Tags, one release cohort at a time.
   *
   * `reconcileReleaseTags` derives a single release commit for everything it is given, which is
   * correct for one cohort and wrong across several: `core`'s tags belong to the commit `core` was
   * released from, and an `angular` release happening today says nothing about them. So the
   * cohort boundary is kept all the way down here and each one is reconciled against its own plan.
   *
   * Every cohort is reconciled, including one that published nothing — a cohort whose npm side is
   * complete can still be missing a tag, which is exactly the state a failed tag push leaves.
   */
  const tagResults = [];
  for (const cohort of result.plan.cohorts) {
    const publishedHere = published.filter((artifact) => artifact.releaseGroup === cohort.group);
    log(`tag: reconciling release group "${cohort.group}"`);
    tagResults.push([
      cohort.group,
      await reconcileReleaseTags({ root, plan: cohortPlan(result.plan, cohort.group), published: publishedHere, log }),
    ]);
  }

  console.log("");
  const npmLine =
    published.length === 0
      ? "npm: nothing to publish; every allowlisted version was already on the registry"
      : `npm: published ${published.map((a) => `${a.name}@${a.version}`).join(", ")}`;
  const tagLines = tagResults.map(([group, tags]) =>
    tags.pushed.length === 0
      ? `tags[${group}]: nothing to push; ${tags.correctRemote.length} of ${tags.expected.length} release tag(s) already correct on the remote`
      : `tags[${group}]: pushed ${tags.pushed.join(", ")} at ${tags.releaseCommit.slice(0, 10)}`,
  );

  // Every owed tag is now either correct on the remote or was just pushed there: reconciliation
  // throws rather than returning with something outstanding.
  console.log([`release ok`, `  ${npmLine}`, ...tagLines.map((line) => `  ${line}`)].join("\n"));
} catch (error) {
  if (
    error instanceof TagIntegrityError ||
    error instanceof ReleaseCommitUnknownError ||
    error instanceof TagCreationError ||
    error instanceof TagPushError
  ) {
    console.error(`\n${error.message}`);
    process.exit(1);
  }
  if (error instanceof ReleaseError) {
    console.error(error.errors.join("\n\n"));
    process.exit(1);
  }
  throw error;
} finally {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
}
