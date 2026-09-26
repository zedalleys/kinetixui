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
 *   preflight → publish whatever is missing → reconcile tags → push the tags this run owes
 *
 * and not "if there is nothing to publish, stop". A release has two states that fail separately:
 * what is on the registry, and what is tagged. A run that published everything and then failed to
 * push its tags leaves an empty publish plan behind it, so treating an empty plan as a finished
 * release would make those tags unrepairable. Tag reconciliation therefore runs every time.
 *
 * npm publication is still not transactional: see RELEASING.md.
 */
import { preflight, publish, ReleaseError } from "./release/preflight.mjs";
import { formatPlan, planToMarkdown } from "./release/report.mjs";
import { packageManagerCommand } from "./release/exec.mjs";
import { reconcileReleaseTags, TagCreationError, TagPushError } from "./release/tags.mjs";
import { appendFileSync, rmSync } from "node:fs";
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

let outDir = null;
try {
  const result = await preflight({ root, log });
  outDir = result.outDir;

  console.log("");
  console.log(formatPlan(result.plan));
  console.log("");
  writeStepSummary(planToMarkdown(result.plan));

  const published = result.packed.length === 0 ? [] : await publish({ root, packed: result.packed, log });

  // Always — including when nothing was published, because that is exactly the state a failed tag
  // push leaves behind.
  const tags = await reconcileReleaseTags({
    root,
    plan: result.plan,
    published,
    packageManager: packageManagerCommand(),
    log,
  });

  console.log("");
  const npmLine =
    published.length === 0
      ? "npm: nothing to publish; every allowlisted version was already on the registry"
      : `npm: published ${published.map((a) => `${a.name}@${a.version}`).join(", ")}`;
  const tagLine =
    tags.pushed.length === 0
      ? `tags: nothing to push; ${tags.alreadyOnRemote.length} of ${tags.expected.length} release tag(s) already on the remote`
      : `tags: pushed ${tags.pushed.join(", ")}`;
  console.log(`release ok\n  ${npmLine}\n  ${tagLine}`);

  if (tags.unreconciled.length > 0) {
    console.error(`\nrelease incomplete: no tag could be created or found for ${tags.unreconciled.join(", ")}.`);
    process.exit(1);
  }
} catch (error) {
  if (error instanceof TagCreationError || error instanceof TagPushError) {
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
