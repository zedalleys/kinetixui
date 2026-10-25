/**
 * check:native-publish-preflight — the three native packages can survive their own publish.
 *
 *   node scripts/check-native-publish-preflight.mjs
 *   node scripts/check-native-publish-preflight.mjs --version=0.1.0   validate one dispatch version
 *   node scripts/check-native-publish-preflight.mjs --negative=<id>   require one check to fail
 *   node scripts/check-native-publish-preflight.mjs --list-negatives
 *
 * SwiftUI, Compose and Flutter publish through three `workflow_dispatch` workflows that have never
 * run for real. Every one of them ends at a door that only opens outwards: a Maven Central
 * coordinate is immutable, a pub.dev package name is permanent, and a pushed git tag is what
 * `from:` resolves against forever. The npm side of the house has `release:check` and a curated
 * note standing in front of that door. The native side had nothing, so the first real publish
 * would also have been the first time the publish path was exercised.
 *
 * This runs on Linux with the rest of the guardrails and needs no Swift, Gradle, Android SDK or
 * Flutter toolchain: everything here is a property of the committed manifests and the publish
 * workflows, which is exactly the part that cannot be checked after the fact. The toolchain halves
 * — `swift build`, `gradle :ui:publishReleasePublicationToMavenLocal`, `flutter pub publish
 * --dry-run` — run in native-*.yml and in the publish workflows themselves, and this check does
 * not duplicate them.
 *
 * Two things this deliberately does NOT check, because something else already does:
 *
 *   vendored token drift   ci.yml re-runs the three vendor generators and diffs (see its
 *                          "Generated output is stale" step). What this adds is VENDOR-CURRENT,
 *                          because a `workflow_dispatch` publish from an arbitrary ref never
 *                          passes through that step.
 *   the Compose API        check:compose-api owns the snapshot.
 *
 * Every check is named, and the name is what the negative control uses. A check that stops being
 * true is either a defect to fix or a decision to record — not a line to delete here.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf8");

/** Mutations applied to the in-memory copies below, each naming the check it must break. */
const NEGATIVES = {
  "manifest-no-library": { file: "packages/ui-swiftui/Package.swift", from: '.library(name: "KinetixUI", targets: ["KinetixUI"])', to: '.executable(name: "KinetixUI", targets: ["KinetixUI"])', breaks: "SW-MANIFEST-AT-ROOT" },
  "manifest-escapes-package": { file: "packages/ui-swiftui/Package.swift", from: '.target(name: "KinetixUI"),', to: '.target(name: "KinetixUI", path: "../ui-shared"),', breaks: "SW-SELF-CONTAINED" },
  "pom-drops-scm": { file: "packages/ui-compose/ui/build.gradle.kts", from: "                scm {", to: "                ignoredScm {", breaks: "MVN-POM-COMPLETE" },
  "pom-drops-javadoc": { file: "packages/ui-compose/ui/build.gradle.kts", from: "withJavadocJar()", to: "// withJavadocJar()", breaks: "MVN-SOURCES-JAVADOC" },
  "pom-drops-signing": { file: "packages/ui-compose/ui/build.gradle.kts", from: "sign(publishing.publications)", to: "// sign(publishing.publications)", breaks: "MVN-SIGNING" },
  "pubspec-version-reformatted": { file: "packages/ui-flutter/pubspec.yaml", from: "version: 0.0.0", to: "version:0.0.0", breaks: "PUB-STAGING-PATTERNS" },
  "pubspec-publish-to-removed": { file: "packages/ui-flutter/pubspec.yaml", from: "publish_to: none", to: "# publish_to: none", breaks: "PUB-UNPUBLISHABLE-AS-COMMITTED" },
  "pubspec-claims-status": { file: "packages/ui-flutter/pubspec.yaml", from: "carrying the same semantics", to: "not published to pub.dev, carrying the same semantics", breaks: "PUB-DESCRIPTION-IS-STATUS-FREE" },
  "pubspec-description-too-short": { file: "packages/ui-flutter/pubspec.yaml", from: /^description: >-\n(?:  .*\n)+/m, to: "description: A Flutter port.\n", breaks: "PUB-DESCRIPTION-LENGTH" },
  "swiftui-publish-always-live": { file: ".github/workflows/publish-swiftui.yml", from: /^      dry_run:\n(?:        .*\n)+/m, to: "", breaks: "WF-DRY-RUN-DEFAULT" },
  "compose-publish-unserialised": { file: ".github/workflows/publish-compose.yml", from: /^concurrency:\n(?:  .*\n)+/m, to: "", breaks: "WF-CONCURRENCY" },
  "flutter-publish-skips-tests": { file: ".github/workflows/publish-flutter.yml", from: "flutter test", to: "flutter --version" , breaks: "WF-TESTS-BEFORE-PUBLISH" },
  "swiftui-publish-unvalidated-version": { file: ".github/workflows/publish-swiftui.yml", from: "--version=", to: "--ignored-version=", breaks: "WF-VERSION-VALIDATED" },
  // A vendored copy drifting from its canonical source, which is what a publish from an
  // arbitrary ref can ship and ci.yml's pull-request-only drift step would never see.
  "vendored-token-drift": { file: "packages/ui-flutter/lib/src/kinetix_motion.dart", from: /^/, to: "// drifted\n", breaks: "VENDOR-CURRENT" },
};

if (process.argv.includes("--list-negatives")) {
  console.log(Object.keys(NEGATIVES).join("\n"));
  process.exit(0);
}

/**
 * Semantic versions a native registry will accept, and that the three workflows take as a dispatch
 * input. Deliberately stricter than semver.org: no build metadata, and a leading `v` is rejected
 * rather than stripped, because the SwiftUI mirror turns this string straight into a git tag and
 * `from: "v0.1.0"` is not the same requirement as `from: "0.1.0"`.
 */
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(?:[0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?$/;

const versionArg = process.argv.find((arg) => arg.startsWith("--version="))?.slice("--version=".length);
if (versionArg !== undefined) {
  if (!SEMVER.test(versionArg)) {
    console.error(`::error::"${versionArg}" is not a publishable version. Expected MAJOR.MINOR.PATCH with an optional -prerelease, no leading "v" and no +build metadata (e.g. 0.1.0, 0.1.0-preview.1).`);
    process.exit(1);
  }
  console.log(`PASS: "${versionArg}" is a publishable version.`);
  process.exit(0);
}

const negativeId = process.argv.find((arg) => arg.startsWith("--negative="))?.slice("--negative=".length);
const negative = negativeId ? NEGATIVES[negativeId] : undefined;
if (negativeId && !negative) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(1);
}

/**
 * Files are read through here so a negative control mutates what the checks see without touching
 * the working tree. A control whose `from` does not match exactly once is a broken control, not a
 * passing gate — that is how a mutation silently becoming a no-op is caught.
 */
const sources = new Map();
const source = (path) => {
  if (!sources.has(path)) {
    let text = read(path);
    if (negative?.file === path) {
      const { from, to } = negative;
      const occurrences = typeof from === "string" ? text.split(from).length - 1 : (text.match(new RegExp(from.source, `${from.flags.replace("g", "")}g`)) ?? []).length;
      if (occurrences !== 1) {
        console.error(`Negative control ${negativeId}: ${from} matches ${occurrences} times in ${path}, expected exactly 1.`);
        process.exit(1);
      }
      text = text.replace(from, to);
    }
    sources.set(path, text);
  }
  return sources.get(path);
};

const failures = [];
/** `detail` is what someone fixing this needs to read; it is printed only when the check fails. */
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
};

// ---------------------------------------------------------------------------
// SwiftUI — distributed as a `git subtree split` of packages/ui-swiftui pushed to a mirror repo,
// so the manifest has to work when it is the root of its own repository and nothing above it
// exists any more.
// ---------------------------------------------------------------------------
const packageSwift = source("packages/ui-swiftui/Package.swift");

check(
  "SW-MANIFEST-AT-ROOT",
  existsSync(`${root}packages/ui-swiftui/Package.swift`) && /\.library\(\s*name:\s*"KinetixUI"/.test(packageSwift),
  'packages/ui-swiftui/Package.swift must sit at the package root and expose `.library(name: "KinetixUI", …)`. The subtree split makes this file the mirror root, and `.package(url:)` consumers can only depend on a library product.',
);

check(
  "SW-SELF-CONTAINED",
  !/\.package\(\s*path:/.test(packageSwift) && !/path:\s*"(?:\.\.|\/)/.test(packageSwift),
  "packages/ui-swiftui/Package.swift must not reference a path outside its own directory. The subtree split discards everything above packages/ui-swiftui, so such a path resolves in this repo and breaks in the mirror — after the tag is pushed.",
);

// ---------------------------------------------------------------------------
// Compose — com.kinetixui:ui-compose to Maven Central. Central validates the POM on upload and
// rejects a deployment outright when any of these is missing, which is a wasted staging round
// trip rather than a bad publish; the sources/javadoc jars and the signature are the same story.
// ---------------------------------------------------------------------------
/**
 * Whole-line comments are stripped before the Kotlin DSL is inspected: commenting a call out is
 * how this config actually gets disabled, and `includes("withJavadocJar()")` happily matched the
 * commented-out line until a negative control proved it. Only whole-line comments go, so the
 * `https://` in the staging repository URL survives.
 */
const stripLineComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
const composeGradle = stripLineComments(source("packages/ui-compose/ui/build.gradle.kts"));

const POM_REQUIRED = ["groupId", "artifactId", "name.set(", "description.set(", "url.set(", "licenses {", "developers {", "scm {"];
const missingPom = POM_REQUIRED.filter((field) => !composeGradle.includes(field));
check(
  "MVN-POM-COMPLETE",
  missingPom.length === 0,
  `packages/ui-compose/ui/build.gradle.kts is missing POM fields Maven Central requires: ${missingPom.join(", ")}. Central rejects the deployment rather than publishing an incomplete POM.`,
);

check(
  "MVN-SOURCES-JAVADOC",
  composeGradle.includes("withSourcesJar()") && composeGradle.includes("withJavadocJar()"),
  "packages/ui-compose/ui/build.gradle.kts must configure withSourcesJar() and withJavadocJar(). Maven Central requires a sources jar and a javadoc jar alongside the AAR.",
);

check(
  "MVN-SIGNING",
  /signing\s*\{[\s\S]*sign\(publishing\.publications\)/.test(composeGradle),
  "packages/ui-compose/ui/build.gradle.kts must still sign its publications when a key is present. Maven Central requires a detached GPG signature for every artifact.",
);

// ---------------------------------------------------------------------------
// Flutter — kinetix_ui to pub.dev. The committed pubspec is deliberately unpublishable
// (`version: 0.0.0`, `publish_to: none`) and publish-flutter.yml edits it in place at publish
// time, so what reaches pub.dev is not what is committed. That makes the staging transformation
// itself the thing to check: two `sed` expressions that silently do nothing if the lines they
// match are ever reformatted, and would publish 0.0.0, or fail, with no earlier warning.
// ---------------------------------------------------------------------------
const pubspec = source("packages/ui-flutter/pubspec.yaml");
const flutterWorkflow = source(".github/workflows/publish-flutter.yml");

/** The `sed` expressions publish-flutter.yml applies, each paired with what it must still match. */
const STAGING = [
  { sed: "/^publish_to:/d", matches: /^publish_to:/m, what: "the publish_to line it deletes" },
  { sed: 's/^version: .*/version: ${{ inputs.version }}/', matches: /^version: .*/m, what: "the version line it rewrites" },
];
const brokenStaging = STAGING.filter(({ sed, matches }) => !flutterWorkflow.includes(sed) || (pubspec.match(new RegExp(matches.source, "gm")) ?? []).length !== 1);
check(
  "PUB-STAGING-PATTERNS",
  brokenStaging.length === 0,
  `publish-flutter.yml stages pubspec.yaml with sed, and ${brokenStaging.map((s) => s.what).join(" and ")} no longer matches exactly one line. A sed that matches nothing exits 0, so the publish would continue with the committed version. Keep the pubspec lines in the plain \`key: value\` form, or update both together.`,
);

check(
  "PUB-UNPUBLISHABLE-AS-COMMITTED",
  /^publish_to:\s*none$/m.test(pubspec) && /^version:\s*0\.0\.0$/m.test(pubspec),
  "packages/ui-flutter/pubspec.yaml must stay `version: 0.0.0` and `publish_to: none` while the package is unpublished. Both are what make a stray local `flutter pub publish` refuse, and the staging step in publish-flutter.yml is written to remove them.",
);

/**
 * pub.dev shows the description on the package page and scores it between 60 and 180 characters.
 * It is also immutable per version, so a description that states publication status is wrong the
 * moment it is published — status belongs in the docs, which can be corrected.
 */
const description = pubspec.match(/^description: >-\n((?:  .*\n)+)/m)?.[1]?.split("\n").map((line) => line.trim()).filter(Boolean).join(" ") ?? "";
check(
  "PUB-DESCRIPTION-LENGTH",
  description.length >= 60 && description.length <= 180,
  `packages/ui-flutter/pubspec.yaml description is ${description.length} characters; pub.dev scores 60–180.`,
);
check(
  "PUB-DESCRIPTION-IS-STATUS-FREE",
  !/\b(not published|unpublished|not on pub\.dev|coming soon|pre-release|not yet)\b/i.test(description),
  `packages/ui-flutter/pubspec.yaml description states a publication status (${JSON.stringify(description)}). pub.dev renders it verbatim and a published version's description cannot be edited, so it would contradict itself on the package page. Describe the package; leave status to the docs.`,
);

check(
  "PUB-CHANGELOG",
  existsSync(`${root}packages/ui-flutter/CHANGELOG.md`),
  "packages/ui-flutter/CHANGELOG.md must exist. pub.dev looks for it next to the pubspec and deducts from the package score when it is missing; it is not reconstructable after the fact.",
);

check(
  "PUB-LICENSE-SOURCE",
  existsSync(`${root}LICENSE`),
  "The repository root LICENSE must exist: publish-flutter.yml copies it into the package directory at publish time, because pub.dev scores a package without a recognised licence file.",
);

// ---------------------------------------------------------------------------
// The three publish workflows — a one-way door should be hard to open by accident, should refuse a
// version it cannot undo, and should not publish code whose own tests were never run.
// ---------------------------------------------------------------------------
const PUBLISH_WORKFLOWS = [
  { path: ".github/workflows/publish-swiftui.yml", test: "swift test" },
  { path: ".github/workflows/publish-compose.yml", test: ":ui:testDebugUnitTest" },
  { path: ".github/workflows/publish-flutter.yml", test: "flutter test" },
];
const workflows = PUBLISH_WORKFLOWS.map((w) => ({ ...w, text: source(w.path) }));

const liveByDefault = workflows.filter((w) => !/^      dry_run:\n(?:        .*\n)+/m.test(w.text) || !/default:\s*true/.test(w.text));
check(
  "WF-DRY-RUN-DEFAULT",
  liveByDefault.length === 0,
  `${liveByDefault.map((w) => w.path).join(", ")} must offer a \`dry_run\` input defaulting to true, so the default dispatch rehearses rather than publishes.`,
);

const unserialised = workflows.filter((w) => !/^concurrency:\n(?:  .*\n)+/m.test(w.text));
check(
  "WF-CONCURRENCY",
  unserialised.length === 0,
  `${unserialised.map((w) => w.path).join(", ")} must declare a concurrency group. Two dispatches of a publish must not run at once: for Compose and Flutter they would race for the same registry coordinate, and for SwiftUI they would force-push the same mirror branch.`,
);

const untested = workflows.filter((w) => !w.text.includes(w.test));
check(
  "WF-TESTS-BEFORE-PUBLISH",
  untested.length === 0,
  `${untested.map((w) => `${w.path} (expected \`${w.test}\`)`).join(", ")} must run the package's own test suite before publishing. Building proves it compiles; only the suite proves the artifact is the one the native workflows went green on.`,
);

const unvalidated = workflows.filter((w) => !w.text.includes("check-native-publish-preflight.mjs --version="));
check(
  "WF-VERSION-VALIDATED",
  unvalidated.length === 0,
  `${unvalidated.map((w) => w.path).join(", ")} must validate its \`version\` input with \`node scripts/check-native-publish-preflight.mjs --version=…\` before anything is uploaded. A typo becomes a permanent tag, an immutable Central coordinate or a burnt pub.dev version.`,
);

// ---------------------------------------------------------------------------
// The natives vendor copies of packages/tokens/dist. ci.yml catches drift on pull requests, but a
// publish is a workflow_dispatch against whatever ref it was given and never passes through that
// step, so a publish could ship token values that are no longer the canonical ones.
// ---------------------------------------------------------------------------
/**
 * The three generators are plain file copies out of packages/tokens/dist, so currency is a
 * byte comparison between each canonical file and its vendored copy. Compared directly rather
 * than by re-running the generators and diffing the tree: that would also report any unrelated
 * uncommitted edit in a native package as token drift, which is a different thing entirely.
 * These lists mirror the generators' own; a file added there and not here is vendored but
 * unchecked, which is what NEGATIVES does not and cannot catch.
 */
const VENDORED = [
  ...["KinetixColorsSwiftUI.swift", "KinetixColorsSwiftUI.dark.swift", "KinetixType.swift", "KinetixMotion.swift"]
    .map((file) => [`packages/tokens/dist/ios/${file}`, `packages/ui-swiftui/Sources/KinetixUI/${file}`]),
  ...["kinetix_color_scheme.dart", "kinetix_color_scheme.dark.dart", "app_text.dart", "kinetix_motion.dart", "kinetix_shadow.dart", "kinetix_shadow.dark.dart"]
    .map((file) => [`packages/tokens/dist/flutter/${file}`, `packages/ui-flutter/lib/src/${file}`]),
  ...["Color.kt", "Theme.kt", "Theme.dark.kt", "KinetixType.kt", "KinetixMotion.kt"]
    .map((file) => [`packages/tokens/dist/android/${file}`, `packages/ui-compose/ui/src/main/kotlin/com/kinetixui/tokens/${file}`]),
  ...["colors.xml", "dimens.xml"]
    .map((file) => [`packages/tokens/dist/android/res/values/${file}`, `packages/ui-compose/ui/src/main/res/values/${file}`]),
];

const stale = VENDORED.filter(([canonical, vendored]) => {
  if (!existsSync(`${root}${canonical}`)) return false; // tokens/dist is a build output; absent means nothing to compare.
  return !existsSync(`${root}${vendored}`) || source(canonical) !== source(vendored);
});
check(
  "VENDOR-CURRENT",
  stale.length === 0,
  `the native packages carry vendored token copies that differ from packages/tokens/dist: ${stale.map(([, vendored]) => vendored).join(", ")}. Run \`pnpm build:tokens && pnpm vendor:swiftui && pnpm vendor:compose && pnpm vendor:flutter\` and commit the result. ci.yml catches this on pull requests, but a publish is a workflow_dispatch against an arbitrary ref and never passes through that step.`,
);

// ---------------------------------------------------------------------------
if (negative) {
  const broke = failures.some((failure) => failure.startsWith(`${negative.breaks}:`));
  if (!broke) {
    console.error(`FAIL: negative control ${negativeId} did not break ${negative.breaks}. The gate reported: ${failures.length ? failures.join(" | ") : "no failures at all"}`);
    process.exit(1);
  }
  console.log(`PASS: negative control ${negativeId} breaks ${negative.breaks} as expected.`);
  process.exit(0);
}

if (failures.length) {
  for (const failure of failures) console.error(`::error::${failure}`);
  console.error(`\n${failures.length} native publish preflight check(s) failed.`);
  process.exit(1);
}
console.log("PASS: native publish preflight — SwiftUI mirror layout, Maven Central POM requirements, pub.dev metadata, publish-workflow safety and vendored token currency. Source and workflow properties only; no toolchain ran and nothing was published.");
