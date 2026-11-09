/**
 * changesets.mjs — reading the pending changesets, with no dependencies at all.
 *
 * Extracted from peers.mjs, which re-exports both of these so there is still exactly one rule for
 * "what counts as a pending changeset" and every existing caller is unchanged.
 *
 * The extraction is not tidying. `release.yml`'s `plan` job decides which release path runs and
 * holds nothing while doing it — no credentials, and no `pnpm install`, because it reads a directory
 * listing. Importing this through peers.mjs made it import `semver` transitively, so the job died
 * with ERR_MODULE_NOT_FOUND on a dependency-free checkout: `plan` failing skips both the Version PR
 * job and the publish job, so *every* release run would have done nothing. Found by review on
 * PR #536 and reproduced in a fresh clone before this was written.
 *
 * So the rule is: anything a workflow job runs before (or without) installing dependencies may
 * import `node:` builtins and relative paths, and nothing else. That is asserted by
 * check:release-approval-gate → REL-SCRIPTS-RESOLVE-WITHOUT-INSTALL, over the real import closure,
 * because the next person to add a convenient import here would otherwise break a release rather
 * than a test.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Parse one changeset's frontmatter into the releases it names.
 *
 * The body is prose and is deliberately ignored. Quoted and unquoted package names are both valid
 * YAML and both appear in the wild, so both are accepted.
 *
 * @param {string} text the file's contents
 * @returns {{name: string, type: "patch"|"minor"|"major"}[]}
 */
export function parseChangeset(text) {
  const frontmatter = text.split(/^---\s*$/m)[1] ?? "";
  return [...frontmatter.matchAll(/^\s*"?([^"\s:]+)"?\s*:\s*(patch|minor|major)\s*$/gm)].map(([, name, type]) => ({
    name,
    type,
  }));
}

/**
 * Every pending changeset in the repository. The filesystem half; everything downstream is pure.
 *
 * @param {string} root repository root
 * @returns {{id: string, releases: {name: string, type: string}[]}[]}
 */
export function readPendingChangesets(root) {
  const dir = path.join(root, ".changeset");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort()
    .map((name) => ({
      id: name.replace(/\.md$/, ""),
      releases: parseChangeset(readFileSync(path.join(dir, name), "utf8")),
    }));
}
