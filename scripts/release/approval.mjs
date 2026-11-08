/**
 * approval.mjs — prove a human approved THIS run for the publishing environment, or stop.
 *
 *   node scripts/release/approval.mjs --environment=publish-npm
 *
 * `environment:` on the publish job is the control: GitHub withholds the environment's secrets
 * until a required reviewer approves, so a job awaiting approval cannot publish even if every
 * other guard in the workflow were wrong. That property is worth having and this script does not
 * replace it.
 *
 * What it closes is the hole underneath it. An `environment:` naming an environment that does not
 * exist does not fail — GitHub creates it, with no protection rules, and the job runs immediately.
 * The same is true of an environment whose required reviewers were removed. Either way the
 * workflow file still says `environment: publish-npm` and the publish proceeds with nobody having
 * said yes: a silent fall-through, invisible to every gate in this repository, because the
 * configuration it depends on lives in GitHub settings rather than in the tree.
 *
 * So the approval itself is asserted, from the run's own review history, before anything
 * irreversible happens. An unprotected environment produces a run with no approvals, which fails
 * here. The failure mode is a release that stalls and says why — the correct direction for an
 * error in a publication gate to fall.
 *
 * Fail-closed throughout: no network, a non-zero `gh`, unparseable JSON, an unexpected shape and an
 * empty history are all failures. There is no override flag and no environment variable that skips
 * this, because one would be the first thing reached for during a stalled release.
 */
import { spawnSync } from "node:child_process";

/**
 * Decide, from a run's review history, whether this environment was approved by a person.
 *
 * Pure and exported: the whole point of this file is a decision that must not be able to drift to
 * "yes" by accident, and the only way to show it cannot is to test it against the histories that
 * must mean no. Returns `{ ok, reason, approvers }`.
 */
export const assertApproved = (reviews, { environment }) => {
  if (!Array.isArray(reviews)) {
    return { ok: false, reason: `the review history is not a list (got ${reviews === null ? "null" : typeof reviews}). Nothing is concluded from a response this script cannot read`, approvers: [] };
  }
  if (reviews.length === 0) {
    return { ok: false, reason: `this run has no environment approvals at all. Either \`${environment}\` has no required reviewers configured — in which case GitHub never asked anyone, and the gate is not in place — or the run reached this job another way`, approvers: [] };
  }

  const forThisEnvironment = reviews.filter((review) =>
    Array.isArray(review?.environments) && review.environments.some((candidate) => candidate?.name === environment),
  );
  if (forThisEnvironment.length === 0) {
    const seen = [...new Set(reviews.flatMap((review) => (Array.isArray(review?.environments) ? review.environments.map((candidate) => candidate?.name) : [])))].filter(Boolean);
    return { ok: false, reason: `this run was reviewed, but not for \`${environment}\`${seen.length ? ` (reviewed: ${seen.join(", ")})` : ""}. An approval of one environment is not an approval of another — that is why each registry has an environment of its own`, approvers: [] };
  }

  const rejected = forThisEnvironment.filter((review) => review.state === "rejected");
  const approved = forThisEnvironment.filter((review) => review.state === "approved" && typeof review?.user?.login === "string" && review.user.login.length > 0);

  if (approved.length === 0) {
    const states = [...new Set(forThisEnvironment.map((review) => review?.state ?? "<no state>"))];
    return { ok: false, reason: `no approval of \`${environment}\` by a named user. Reviews present for it: ${states.join(", ")}`, approvers: [] };
  }
  if (rejected.length > 0) {
    // Both an approval and a rejection in one history is not a state to interpret on a publication
    // path. It stops.
    return { ok: false, reason: `\`${environment}\` carries both an approval and a rejection for this run. A publication is not the place to guess which is current`, approvers: approved.map((review) => review.user.login) };
  }
  return { ok: true, reason: null, approvers: [...new Set(approved.map((review) => review.user.login))] };
};

const main = () => {
  const environment = process.argv.find((arg) => arg.startsWith("--environment="))?.slice("--environment=".length);
  if (!environment) {
    console.error("::error::approval.mjs needs --environment=<name>, the environment whose approval it must find.");
    process.exit(1);
  }
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!repository || !runId) {
    console.error("::error::GITHUB_REPOSITORY and GITHUB_RUN_ID must both be set. Without them this script cannot identify the run it is meant to be checking, and an unidentified run is not an approved one.");
    process.exit(1);
  }

  const result = spawnSync("gh", ["api", `repos/${repository}/actions/runs/${runId}/approvals`], { encoding: "utf8", windowsHide: true, shell: false });
  if (result.error) {
    console.error(`::error::Could not run \`gh\`: ${result.error.message}. The approval could not be read, so it is not treated as given.`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`::error::\`gh api repos/${repository}/actions/runs/${runId}/approvals\` exited ${result.status}: ${(result.stderr || "").trim()}. Reading the approval needs \`actions: read\` on the job's token.`);
    process.exit(1);
  }

  let reviews;
  try {
    reviews = JSON.parse(result.stdout);
  } catch (error) {
    console.error(`::error::The review history did not parse as JSON (${error.message}).`);
    process.exit(1);
  }

  const verdict = assertApproved(reviews, { environment });
  if (!verdict.ok) {
    console.error(`::error::Refusing to publish: ${verdict.reason}.`);
    console.error(`Fix the gate rather than this check: \`${environment}\` must exist with required reviewers configured, and this run must have been approved for it. See the "Publication needs a person" section of RELEASING.md.`);
    process.exit(1);
  }
  console.log(`PASS: run ${runId} was approved for \`${environment}\` by ${verdict.approvers.join(", ")}.`);
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
