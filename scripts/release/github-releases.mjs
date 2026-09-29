/**
 * GitHub Releases for the tags a release actually created.
 *
 *   KINETIXUI_RELEASE_SUMMARY=… node scripts/release/github-releases.mjs <summary.json>
 *
 * ## Why this is a separate step
 *
 * npm and git tags are the release. A GitHub Release is a *view* of it — release notes, the "Releases"
 * sidebar, the feed people subscribe to. The two had diverged completely: 94 tags existed, two Releases
 * did, and the newest Release (`v0.5.0`) was five months of development behind what npm was serving. A
 * developer arriving from a search result read the repository as dormant.
 *
 * The cause was structural rather than neglect. `changesets/action` creates Releases by parsing the
 * `New tag:` lines the Changesets CLI prints, and this repository publishes with its own `pnpm release`,
 * which prints its own report. The action had nothing to parse and so created nothing, silently, forever.
 *
 * ## The rules this follows
 *
 * **Cosmetic, so never fatal.** A failure here must not fail a release that has already published to npm
 * and pushed its tags. Those are irreversible; a missing Release can be created later by hand. The caller
 * runs this with `continue-on-error`, and `main()` exits 0 on a `gh` failure after saying what happened.
 *
 * **Idempotent.** A Release that already exists is left exactly as it is — never edited, never replaced.
 * Re-running after a partial failure creates only what is missing.
 *
 * **Only tags this run pushed.** Historical tags are not backfilled. Creating 92 Releases dated today for
 * versions that shipped over five months would be a fabricated history, and a subscriber feed would fire
 * 92 notifications for nothing. Backfill, if it is ever wanted, is a deliberate manual act — see
 * RELEASING.md.
 *
 * **Notes point at the changelog rather than inventing prose.** The per-package CHANGELOG.md is generated
 * by Changesets from the changesets themselves, which is the release's own account of itself.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * The Releases owed for a summary, in the order they should be created.
 *
 * Pure, and exported for the test: every judgement about *what* to create is here, and the only thing
 * `main()` adds is the subprocess.
 *
 * A tag is turned into a Release only when this run pushed it AND a published package matches it, so a
 * tag reconciled from an earlier release — which `reconcileReleaseTags` also pushes, by design, to repair
 * a failed tag step — does not produce a Release dated today for an old version.
 *
 * @param {{published: {name: string, version: string, releaseGroup: string}[],
 *          cohorts: {group: string, pushed: string[], releaseCommit: string|null}[]}} summary
 */
export function releasesOwed(summary) {
  const publishedByTag = new Map(summary.published.map((p) => [`${p.name}@${p.version}`, p]));
  const owed = [];
  for (const cohort of summary.cohorts ?? []) {
    for (const tag of cohort.pushed ?? []) {
      const pkg = publishedByTag.get(tag);
      if (!pkg) continue;
      owed.push({
        tag,
        name: pkg.name,
        version: pkg.version,
        cohort: cohort.group,
        title: tag,
        notes: notesFor(pkg),
      });
    }
  }
  return owed;
}

/** Short notes that point at the two places the real detail lives, rather than restating it badly. */
function notesFor({ name, version }) {
  const slug = name.replace("@", "").replace("/", "-");
  return [
    `\`${name}@${version}\``,
    "",
    `- Changelog: https://kinetixui.com/docs/changelog`,
    `- Package: https://www.npmjs.com/package/${name}/v/${version}`,
    `- Published with npm provenance; the tag was created only after the registry confirmed this version.`,
    "",
    `<!-- created by scripts/release/github-releases.mjs from the release summary (${slug}) -->`,
  ].join("\n");
}

/** Does a Release already exist for this tag? Anything other than a clean exit means "assume yes". */
function releaseExists(tag, run) {
  const probe = run(["release", "view", tag, "--json", "tagName"]);
  return probe.status === 0;
}

export function createReleases(owed, { run, log = console.log }) {
  const created = [];
  const skipped = [];
  const failed = [];
  for (const release of owed) {
    if (releaseExists(release.tag, run)) {
      skipped.push(release.tag);
      log(`  release: ${release.tag} already exists — left untouched`);
      continue;
    }
    const result = run([
      "release",
      "create",
      release.tag,
      "--title",
      release.title,
      "--notes",
      release.notes,
      // The tag is already on the remote, pushed by the release itself. --verify-tag makes gh refuse
      // rather than quietly create a tag of its own if that is somehow not true.
      "--verify-tag",
    ]);
    if (result.status === 0) {
      created.push(release.tag);
      log(`  release: created ${release.tag}`);
    } else {
      failed.push({ tag: release.tag, detail: String(result.stderr ?? "").trim() });
      log(`  release: could NOT create ${release.tag} — ${String(result.stderr ?? "").trim()}`);
    }
  }
  return { created, skipped, failed };
}

function ghRunner() {
  return (args) => spawnSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
}

function main() {
  const path = process.argv[2] ?? process.env.KINETIXUI_RELEASE_SUMMARY;
  if (!path) {
    console.log("No release summary given; nothing to do.");
    return;
  }
  let summary;
  try {
    summary = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    // Not fatal: see the header. The release itself already succeeded.
    console.log(`Could not read the release summary at ${path}: ${error.message}`);
    return;
  }
  const owed = releasesOwed(summary);
  if (owed.length === 0) {
    console.log("This run published nothing, so no GitHub Release is owed.");
    return;
  }
  console.log(`GitHub Releases owed: ${owed.map((r) => r.tag).join(", ")}`);
  const { created, skipped, failed } = createReleases(owed, { run: ghRunner() });
  console.log(`created ${created.length}, already present ${skipped.length}, failed ${failed.length}`);
  if (failed.length > 0) {
    console.log("A GitHub Release is a view of a release, not the release. npm and the tags are already correct;");
    console.log("create the missing ones by hand, or re-run this step — it only creates what is absent.");
  }
}

// Only when run directly, so the test can import the pure half.
if (process.argv[1] && process.argv[1].endsWith("github-releases.mjs")) main();
