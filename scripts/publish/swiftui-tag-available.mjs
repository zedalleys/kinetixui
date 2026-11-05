#!/usr/bin/env node
/**
 * Is this version still available to publish on the SwiftUI mirror?
 *
 *   node scripts/publish/swiftui-tag-available.mjs <mirror-url> <version>
 *
 * SwiftPM has no version field: the git tag *is* the published version, and `from:` resolves
 * against it forever. So a version is published exactly once, and re-tagging it would hand every
 * existing consumer different code under a version they have already resolved and locked.
 *
 * Git would refuse the second tag push on its own — but publish-swiftui.yml force-pushes the
 * mirror's `main` *before* it pushes the tag. Without this check the sequence half-succeeds: the
 * mirror's default branch moves to new code while the last tag still points at the old code, which
 * is a worse state than either publishing or not. Hence a check that runs first, against the
 * remote, and is shared with the rehearsal in scripts/adoption/swiftui-mirror-consumer.mjs so the
 * thing CI exercises is the thing the publish workflow runs.
 *
 * Reads the remote and nothing else; it never writes, pushes or fetches objects.
 */
import { spawnSync } from "node:child_process";

const [mirror, version] = process.argv.slice(2);

if (!mirror || !version) {
  console.error("usage: swiftui-tag-available.mjs <mirror-url> <version>");
  process.exit(2);
}

const result = spawnSync("git", ["ls-remote", "--tags", "--exit-code", mirror, `refs/tags/${version}`], {
  encoding: "utf8",
});

// --exit-code: 0 when the ref matched, 2 when nothing matched. Anything else (128, a network
// failure, a bad URL) is not an answer to the question and must not read as "available".
if (result.status === 0) {
  const sha = result.stdout.trim().split(/\s+/)[0] ?? "unknown";
  console.error(
    `::error::${version} is already published on the mirror (tag points at ${sha.slice(0, 12)}). ` +
      "A SwiftPM version is immutable in practice: consumers have already resolved and locked it, " +
      "so re-tagging would serve them different code under the same version. Publish the next " +
      "version instead.",
  );
  process.exit(1);
}

if (result.status !== 2) {
  console.error(
    `::error::Could not determine whether ${version} is already published: \`git ls-remote\` exited ` +
      `${result.status}. Refusing rather than guessing, because the next step force-pushes the ` +
      `mirror's main branch.\n${(result.stderr || "").trim()}`,
  );
  process.exit(1);
}

console.log(`PASS: ${version} is not yet a tag on the mirror.`);
