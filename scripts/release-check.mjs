/**
 * release-check.mjs — the offline half of the release contract.
 *
 *   node scripts/release-check.mjs
 *
 * Every workspace package is either allowlisted for npm in release/publish-packages.json or
 * carries `private: true`, and every allowlisted package has publication-ready metadata. No
 * network, no build, no registry: this is the part that must pass on an ordinary pull request,
 * including one whose version is already on npm.
 *
 * This is the check that would have stopped 0.23.0. `@kinetixui/angular` was neither private nor
 * approved, and it had no `publishConfig.access`, so a workspace-wide publish reached it and npm
 * rejected it with 402 — after @kinetixui/tokens had already gone out.
 */
import { plan } from "./release/preflight.mjs";
import { formatPlan } from "./release/report.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const result = await plan({ root, consultRegistry: false });

if (!result.ok) {
  console.error(formatPlan(result));
  console.error("\nrelease:check failed. No package was published.");
  process.exit(1);
}

const names = result.publish.map((target) => `${target.name}@${target.version}`).join(", ");
console.log(
  `release:check ok — ${result.publish.length} allowlisted package(s) publication-ready (${names}); ` +
    `${result.private.length} private and excluded.`,
);
