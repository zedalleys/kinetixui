/**
 * release-plan.mjs — what a release would publish, and why.
 *
 *   node scripts/release-plan.mjs            human-readable
 *   node scripts/release-plan.mjs --json     machine-readable
 *
 * The offline contract from release:check, plus the registry: which allowlisted versions already
 * exist, and therefore which ones this release would actually upload. An already-published version
 * is reported as skipped rather than treated as a failure, which is what makes recovering a partial
 * release an explicit, readable operation instead of an accident.
 *
 * Reading the registry needs no credentials — these are public packages — so this runs anywhere.
 */
import { plan } from "./release/preflight.mjs";
import { formatPlan, planToJson } from "./release/report.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const asJson = process.argv.includes("--json");
const result = await plan({ root });

if (asJson) {
  const json = JSON.stringify(planToJson(result), null, 2);
  if (result.ok) console.log(json);
  else console.error(json);
} else {
  const text = formatPlan(result);
  if (result.ok) console.log(text);
  else console.error(text);
}

if (!result.ok) {
  if (!asJson) console.error("\nrelease:plan failed. No package was published.");
  process.exit(1);
}
