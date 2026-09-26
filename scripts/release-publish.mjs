/**
 * release-publish.mjs — the one place that mutates the registry.
 *
 *   node scripts/release-publish.mjs
 *
 * Runs the preflight and then publishes exactly the artifacts it returned. The publish step is
 * handed tarball paths; it does not look at the workspace, so it cannot reach a package the plan
 * did not name. That is deliberate — the 0.23.0 release published a package nobody had approved
 * because `pnpm -r publish` decided for itself what the workspace contained.
 *
 * Tags are created only after every publish in the run has succeeded, and only the tags this run
 * created are pushed. `git push --tags` would push every local tag, including ones that have
 * nothing to do with this release.
 *
 * npm publication is still not transactional: see RELEASING.md.
 */
import { preflight, publish, ReleaseError } from "./release/preflight.mjs";
import { formatPlan, planToMarkdown } from "./release/report.mjs";
import { run } from "./release/exec.mjs";
import { appendFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const log = (message) => console.log(`  ${message}`);

/** Tags that exist locally right now. */
async function localTags() {
  const { stdout } = await run("git", ["tag", "--list"], { cwd: root });
  return new Set(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

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

  if (result.packed.length === 0) {
    console.log("release ok — nothing to publish; every allowlisted version is already on the registry.");
    process.exit(0);
  }

  const before = await localTags();
  const published = await publish({ root, packed: result.packed, log });

  // Changesets 3.0.3 `git-tag` skips private packages (so @kinetixui/angular is not tagged) and
  // skips tags that already exist locally or on the remote, so re-running it after a recovered
  // partial release adds only what is missing. It creates tags; it does not push them.
  log("tag: changeset git-tag");
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  await run(pnpmBin, ["exec", "changeset", "git-tag"], { cwd: root });

  const after = await localTags();
  const created = [...after].filter((tag) => !before.has(tag));
  if (created.length === 0) {
    log("tag: nothing new to push (every tag for this version already exists)");
  } else {
    log(`tag: pushing ${created.join(", ")}`);
    await run("git", ["push", "origin", ...created.map((tag) => `refs/tags/${tag}`)], { cwd: root });
  }

  console.log("");
  console.log(`release ok — published ${published.map((a) => `${a.name}@${a.version}`).join(", ")}.`);
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(error.errors.join("\n\n"));
    process.exit(1);
  }
  throw error;
} finally {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
}
