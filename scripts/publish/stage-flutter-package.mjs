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
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString as mdastToString } from "mdast-util-to-string";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

const version = process.argv[2];
const packageDir = resolve(
  process.argv.find((arg) => arg.startsWith("--package-dir="))?.slice("--package-dir=".length) ??
    join(root, "packages/ui-flutter"),
);

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(?:[0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?$/;

/*
 * The name this package publishes under, pinned by value. pub.dev takes the name from the staged
 * pubspec, not from anything the operator types, and a published name is permanent — a package can
 * be discontinued but never renamed. So the identity is asserted here for the same reason the
 * version is: this script produces the file that is uploaded, and it is the last place anything
 * reads it before `pub publish` does. check:native-publish-preflight pins the same value against
 * the committed pubspec (ID-PUB-NAME) and requires this assertion to exist.
 */
const CANONICAL_NAME = "kinetix_ui";

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
if (!lines.includes(`name: ${CANONICAL_NAME}`)) {
  die(`${pubspecPath} does not declare \`name: ${CANONICAL_NAME}\`. Found ${JSON.stringify(lines.find((line) => line.startsWith("name:")) ?? "no name line at all")}. pub.dev would publish under that name and the coordinate would be taken permanently; a published package can be discontinued but never renamed.`);
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
 *
 * WHAT IS REQUIRED IS A RELEASE HEADING, NOT A MENTION. This check used to be
 * `changelog.includes(version)`, a substring test, and it was measurably wrong: the committed
 * CHANGELOG.md had no release section at all — its only heading was `## Unreleased` — and said in
 * prose that the first version was undecided. Because that sentence contained the characters
 * `0.1.0`, staging 0.1.0 passed. The most likely first release would have published with no
 * changelog entry, permanently, which is exactly the outcome this check exists to prevent.
 *
 * So the contract is an exact level-2 heading whose version is the one being published:
 *
 *   PASS  ## 0.1.0                     a release section for this version
 *   PASS  ## 0.1.0 - 2026-11-09        a title or date after it, separated from the version
 *   FAIL  Preparing for 0.1.0          prose; renders as a paragraph, not a section
 *   FAIL  ### 0.1.0                    a subsection of some other release, not this release
 *   FAIL  ## 0.1.0-beta.1              a different version that merely starts with this one
 *   FAIL  <!-- ## 0.1.0 -->            commented out, so pub.dev renders nothing
 *   FAIL  ## 0.1.0 inside a code fence an example of a heading, not a heading
 *
 * Comments and fences are stripped and skipped rather than matched, because both are text that
 * looks like a heading and renders as something else — which is the whole class of defect here.
 */
const changelogPath = join(packageDir, "CHANGELOG.md");
if (!existsSync(changelogPath)) {
  die(`${changelogPath} does not exist. pub.dev renders it as the Changelog tab and scores its absence.`);
}

/*
 * WHAT COUNTS AS A HEADING IS A MARKDOWN QUESTION, SO A MARKDOWN PARSER ANSWERS IT.
 *
 * Three hand-written versions of this check were defeated in review, each by a different piece of
 * CommonMark, and every failure was in the same direction — a heading that renders as code or as
 * literal HTML was counted, so a permanent publish would have gone out with no changelog entry:
 *
 *   - a substring test accepted the version appearing in a sentence;
 *   - toggling fence state on any ``` ignored the delimiter's character and length, so a heading
 *     still inside a four-backtick block counted;
 *   - stripping `<!-- … -->` and scanning what was left deleted fence boundaries, manufactured a
 *     `##` prefix out of two fragments (`#<!-- x -->#  0.1.0`), opened phantom fences, and read a
 *     `` ```foo` `` line as an opener although a backtick fence's info string may not contain
 *     backticks;
 *   - and none of them knew about raw HTML blocks, so `<pre>` around a heading counted too.
 *
 * `js-yaml` replaced a hand-written workflow reader in check-native-publish-preflight.mjs for
 * exactly this reason. The same answer applies here: `mdast-util-from-markdown` is the CommonMark
 * reference block parser, so fences, info strings, HTML blocks, comments, indented code and
 * blockquotes are its problem rather than this file's.
 *
 * The contract, which RELEASING.md documents:
 *
 *   - a heading node, at depth 2, among the document's TOP-LEVEL children. A heading inside a
 *     blockquote or a list item is not a release section.
 *   - written as ATX — the line it starts on begins with `##`. A setext heading (`0.1.0` over
 *     `-----`) is depth 2 to the parser but is not the `## X.Y.Z` spelling the release process
 *     documents, so it is refused. That is deliberate and it fails closed.
 *   - whose text begins with exactly this version, ended by whitespace or the end of the text, so
 *     `## 0.1.0-beta.1` cannot satisfy a publish of 0.1.0 while `## 0.1.0 - 2026-11-09` can.
 */
const changelogSource = readFileSync(changelogPath, "utf8");
const changelogLines = changelogSource.split(/\r?\n/);
const versionHeading = new RegExp(
  String.raw`^${version.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)}(?=\s|$)`,
  "u",
);
const hasVersionHeading = fromMarkdown(changelogSource).children.some(
  (node) =>
    node.type === "heading" &&
    node.depth === 2 &&
    /^ {0,3}##[ \t]/u.test(changelogLines[node.position.start.line - 1] ?? "") &&
    versionHeading.test(mdastToString(node)),
);

if (!hasVersionHeading) {
  die(`${changelogPath} has no \`## ${version}\` release heading. A mention of ${version} in prose, a \`### ${version}\` subsection, a longer version that starts with it, a commented-out heading and an example inside a code fence all read like an entry and render as nothing, so none of them counts. \`pub publish\` warns when the changelog does not cover the version and exits non-zero, and the entry cannot be added after the version is published. Add a \`## ${version}\` section first.`);
}

console.log(`PASS: ${packageDir} staged for publish as ${version} (publish_to removed, LICENSE copied, CHANGELOG carries a \`## ${version}\` release heading).`);
