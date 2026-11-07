/**
 * pending.mjs — is there a changeset waiting to be consumed?
 *
 *   node scripts/release/pending.mjs            prints `changesets_pending=true|false`
 *
 * `release.yml` used to do two different things through one `changesets/action` call: with
 * changesets pending it opened the Version PR, with none pending it published. One job, one set of
 * credentials, one absence of a gate — so merging the Version PR *was* the publication, because the
 * merge is the push that finds nothing pending.
 *
 * Splitting that job in two needs one fact decided before either runs, by something holding no
 * credentials: whether a changeset is pending. This is that fact, and it is deliberately read
 * through `readPendingChangesets`, the same function the release plan and the peer-range checks
 * already use. A second rule for "what counts as a changeset" could disagree with the first, and a
 * disagreement here either stalls a release or lets both paths run.
 *
 * It is imported from changesets.mjs rather than peers.mjs, which re-exports it: peers.mjs imports
 * `semver`, and the `plan` job runs this on a checkout with no dependencies installed, so going
 * through it died with ERR_MODULE_NOT_FOUND and skipped both release paths. Nothing here, or in
 * anything it imports, may reach outside `node:` —
 * check:release-approval-gate → REL-SCRIPTS-RESOLVE-WITHOUT-INSTALL holds that.
 *
 * Note what this does NOT decide: it does not decide whether to publish. The publish job is gated
 * by a protected environment and asserts its own approval (scripts/release/approval.mjs). This only
 * decides which of the two jobs is the relevant one for this push.
 */
import { fileURLToPath } from "node:url";
import { readPendingChangesets } from "./changesets.mjs";

export const main = (root) => {
  let pending;
  try {
    pending = readPendingChangesets(root);
  } catch (error) {
    // Fail loudly rather than reporting "none pending", which is the answer that selects the
    // publishing job. An unreadable `.changeset/` is a broken checkout.
    console.error(`::error::Could not read the changesets in ${root}: ${error.message}. The release path cannot be decided without them.`);
    process.exit(1);
  }
  console.log(`changesets_pending=${pending.length > 0}`);
  console.error(pending.length ? `${pending.length} pending changeset(s): ${pending.map((entry) => entry.id).join(", ")}` : "No pending changesets.");
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main(fileURLToPath(new URL("../../", import.meta.url)));
