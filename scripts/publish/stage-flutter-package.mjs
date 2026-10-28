#!/usr/bin/env node
/**
 * Turn the committed packages/ui-flutter into the thing `pub publish` will accept.
 *
 *   node scripts/publish/stage-flutter-package.mjs <version> [--package-dir=<dir>]
 *
 * Two things are deliberately wrong in the committed package, and both have to be fixed at publish
 * time rather than in git:
 *
 *   - `publish_to: none` — the guard that makes an accidental `pub publish` from a working copy
 *     impossible. `pub publish` refuses to run while it is there, which is the point.
 *   - `version: 0.0.0` — a placeholder. The real version is a release decision, and committing a
 *     number would mean the repo claims a version pub.dev has never seen.
 *
 * This used to be a few `sed -i` lines inside publish-flutter.yml. `sed` exits 0 when it matches
 * nothing, so a reformatted `version:` line would have published the committed placeholder under
 * the version the operator asked for — a silently wrong, permanent version. Every edit here is
 * therefore asserted after the fact, against the file as it ends up on disk, and the exit code is
 * the answer. It lives in a script so that CI can run the real staging on a throwaway copy on
 * every pull request instead of only when someone dispatches a publish.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

const version = process.argv[2];
const packageDir = resolve(
  process.argv.find((arg) => arg.startsWith("--package-dir="))?.slice("--package-dir=".length) ??
    join(root, "packages/ui-flutter"),
);

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(?:[0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?$/;

const die = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

if (!version) die("usage: stage-flutter-package.mjs <version> [--package-dir=<dir>]");
// The same shape check the publish workflows apply to their dispatch input. Repeated here because
// this script is also called directly by CI, where no dispatch input exists to have been checked.
if (!SEMVER.test(version)) {
  die(`"${version}" is not a publishable version. Expected MAJOR.MINOR.PATCH with an optional -prerelease, no leading "v" and no +build metadata.`);
}

const pubspecPath = join(packageDir, "pubspec.yaml");
if (!existsSync(pubspecPath)) die(`${pubspecPath} does not exist, so there is nothing to stage.`);

const before = readFileSync(pubspecPath, "utf8");

// Anchored at the start of a line: a `version:` inside the description or an example must not be
// what gets rewritten.
if (!/^version: .*$/m.test(before)) {
  die(`${pubspecPath} has no top-level \`version:\` line to rewrite. Staging would otherwise leave whatever version is already there, which is how a placeholder gets published under someone else's version number.`);
}
if (!/^publish_to:\s*none\s*$/m.test(before)) {
  die(`${pubspecPath} does not carry \`publish_to: none\`. That line is the guard against an accidental publish from a working copy; if it is gone, find out why before publishing.`);
}

const after = before
  .replace(/^publish_to:.*\n/m, "")
  .replace(/^version: .*$/m, `version: ${version}`);
writeFileSync(pubspecPath, after);

// pub.dev scores a package without a recognised licence file, and the licence lives at the
// repository root rather than in the package.
const license = join(root, "LICENSE");
if (!existsSync(license)) die(`${license} does not exist; pub.dev scores a package with no recognised licence file.`);
copyFileSync(license, join(packageDir, "LICENSE"));

// Assert against the file on disk, not against the string this process just built: a failed write
// or a concurrent edit should fail the publish, not pass it.
const staged = readFileSync(pubspecPath, "utf8");
const lines = staged.split("\n");
if (!lines.includes(`version: ${version}`)) {
  die(`Staging did not set \`version: ${version}\` in ${pubspecPath}. Found ${JSON.stringify(lines.find((line) => line.startsWith("version:")) ?? "no version line at all")}.`);
}
if (lines.some((line) => /^publish_to:/.test(line))) {
  die(`Staging did not remove \`publish_to:\` from ${pubspecPath}; \`pub publish\` would refuse.`);
}
if (!existsSync(join(packageDir, "LICENSE"))) {
  die(`LICENSE was not copied into ${packageDir}.`);
}

/*
 * `pub publish` warns when CHANGELOG.md does not mention the version being published, and a
 * warning is enough to make it exit non-zero. More to the point, a published version whose
 * changelog never mentions it is a package page that cannot say what the release contained — and
 * the entry cannot be added afterwards, because the version is immutable. So the warning becomes a
 * refusal here, before anything is uploaded, rather than a surprise mid-publish.
 */
const changelogPath = join(packageDir, "CHANGELOG.md");
if (!existsSync(changelogPath)) {
  die(`${changelogPath} does not exist. pub.dev renders it as the Changelog tab and scores its absence.`);
}
if (!readFileSync(changelogPath, "utf8").includes(version)) {
  die(`${changelogPath} does not mention ${version}. \`pub publish\` warns about this and exits non-zero, and the entry cannot be added after the version is published. Add the section for ${version} first.`);
}

console.log(`PASS: ${packageDir} staged for publish as ${version} (publish_to removed, LICENSE copied, CHANGELOG mentions the version).`);
