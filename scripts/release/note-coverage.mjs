/**
 * Does the curated release note account for every changeset the release consumes?
 *
 * `check:release-note` (the presence gate) asks whether a note exists for the version a merge would
 * publish. That is a different question from this one, and neither implies the other: a note can
 * exist, typecheck, link correctly and describe three of the five changesets the release carries.
 * The two missing ones are then published with no curated description at all, and nothing notices —
 * the Version PR is green, the changelog page renders, and the gap is only visible to whoever goes
 * and reads `.changeset/` afterwards, by which time the artifact is on npm.
 *
 * The temptation is to grep the note's prose for the changeset's words. That is not a gate: prose is
 * written for readers, a changeset id is `brave-pandas-dance`, and a keyword match that can be
 * satisfied by coincidence can also be defeated by a synonym. So coverage is *declared*, as
 * structured metadata, and the gate compares two sets of identifiers:
 *
 *   consumed(cohort)  — computed from `.changeset/` with the repository's own planner
 *   declared(cohort)  — read from the note's `coverage` array
 *
 * and requires equality. An author who deliberately leaves a changeset undescribed says so in
 * `exclusions`, with a reason, which is a sentence in review rather than a silent omission.
 *
 * COHORTS, AND WHY A VERSION NUMBER IS NOT AN IDENTITY. `release/publish-packages.json` defines
 * release groups: `core` (@kinetixui/{tokens,ui,cli}, lockstep), `angular` (Preview, its own line),
 * `iot` (experimental, its own line). They move independently and their numbers collide — core
 * reached 0.26.1 while Angular was already at 0.26.1, and core 0.27.0 ships beside Angular 0.26.2
 * today. So every coverage entry names a cohort *and* a version, and the gate matches on the pair.
 * A note that declares `0.27.0` and means "the core release" is not accepted, because the next
 * release where Angular also sits on 0.27.0 would read the same and be wrong.
 *
 * Everything in this file is pure: it takes manifests, changesets and a parsed note, and returns
 * errors. The filesystem and git halves live in `scripts/check-release-note-coverage.mjs`, which is
 * what lets the base-branch comparison run the identical evaluation against another tree.
 */
import semver from "semver";
import { plannedVersions } from "./peers.mjs";

/** The note key this gate reads. Deliberately not in `Release`: it is release process metadata, and
 *  `version-release-meta.mjs` strips it rather than publishing it to the changelog page. */
export const COVERAGE_KEY = "coverage";

/**
 * Which cohort each allowlisted package belongs to, and the cohort definitions.
 *
 * Fail-closed: an allowlist this cannot read is not an empty allowlist. A gate that passes because
 * it found nothing to check is the failure mode this whole file exists to prevent.
 *
 * @param {unknown} allowlistFile parsed release/publish-packages.json
 * @returns {{cohortOf: Map<string, string>, groups: Map<string, object>, errors: string[]}}
 */
export function readCohorts(allowlistFile) {
  const errors = [];
  const cohortOf = new Map();
  const groups = new Map();

  if (allowlistFile === null || typeof allowlistFile !== "object") {
    return { cohortOf, groups, errors: ["release/publish-packages.json is not an object, so no release cohort can be identified."] };
  }
  const declared = allowlistFile.releaseGroups;
  if (declared === null || typeof declared !== "object") {
    errors.push("release/publish-packages.json has no `releaseGroups` object, so no release cohort can be identified.");
  } else {
    for (const [name, definition] of Object.entries(declared)) groups.set(name, definition ?? {});
  }
  const packages = Array.isArray(allowlistFile.packages) ? allowlistFile.packages : null;
  if (!packages) {
    errors.push("release/publish-packages.json has no `packages` array, so no package can be mapped to a release cohort.");
    return { cohortOf, groups, errors };
  }
  for (const [index, entry] of packages.entries()) {
    if (entry === null || typeof entry !== "object" || typeof entry.name !== "string") {
      errors.push(`release/publish-packages.json packages[${index}] has no string \`name\`.`);
      continue;
    }
    if (typeof entry.releaseGroup !== "string") {
      errors.push(`release/publish-packages.json packages[${index}] (${entry.name}) has no string \`releaseGroup\`.`);
      continue;
    }
    if (declared && !groups.has(entry.releaseGroup)) {
      errors.push(`${entry.name} declares releaseGroup "${entry.releaseGroup}", which is not in \`releaseGroups\`.`);
    }
    cohortOf.set(entry.name, entry.releaseGroup);
  }
  return { cohortOf, groups, errors };
}

/**
 * The release cohorts a merge of this tree would publish, each with its planned version and the
 * pending changesets that justify it.
 *
 * ATTRIBUTION. A changeset belongs to a cohort when it *names* a package in that cohort. It is not
 * attributed through a `fixed` group: naming `@kinetixui/ui` moves @kinetixui/tokens to the same
 * version, but it does not make the changeset a tokens change, and both are in `core` anyway. One
 * changeset naming packages in two cohorts is consumed by both and must be declared by both — that
 * is the shared Metric fix that went out as core 0.27.0 and angular 0.26.2 at once.
 *
 * A changeset that names nothing in any cohort (only an ignored package, or a package that no longer
 * exists) is `unattributed`: `changeset version` still deletes it, but no cohort's note can be said
 * to owe it a description. Those are reported, not required.
 *
 * @param {object} input
 * @param {unknown} input.allowlistFile parsed release/publish-packages.json
 * @param {{name: string, version: string}[]} input.packages every workspace package
 * @param {{id: string, releases: {name: string, type: string}[]}[]} input.changesets pending changesets
 * @param {object} [input.changesetConfig] parsed .changeset/config.json
 * @returns {{cohorts: {cohort: string, version: string, changesets: string[], packages: string[]}[],
 *            unattributed: string[], errors: string[]}}
 */
export function planCohorts({ allowlistFile, packages, changesets, changesetConfig = {} }) {
  const { cohortOf, groups, errors } = readCohorts(allowlistFile);

  // Guard the config shapes `plannedVersions` would otherwise read as "no groups at all". A missing
  // `fixed` is the difference between core moving as one cohort and three packages drifting apart.
  const arrayOfArrays = (value, key) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((group) => !Array.isArray(group))) {
      errors.push(`.changeset/config.json \`${key}\` is not an array of arrays, so release cohorts cannot be planned from it.`);
      return [];
    }
    return value;
  };
  const planned = plannedVersions({
    packages,
    changesets,
    fixed: arrayOfArrays(changesetConfig.fixed, "fixed"),
    linked: arrayOfArrays(changesetConfig.linked, "linked"),
    ignore: Array.isArray(changesetConfig.ignore) ? changesetConfig.ignore : [],
  });

  const moving = new Map(); // cohort -> { versions: Map<version, string[]>, packages: Set, changesets: Set }
  for (const [name, version] of planned) {
    const cohort = cohortOf.get(name);
    if (cohort === undefined) continue; // not an allowlisted package: it is not published, so no note owes it
    if (!moving.has(cohort)) moving.set(cohort, { versions: new Map(), packages: new Set(), changesets: new Set() });
    const entry = moving.get(cohort);
    entry.packages.add(name);
    if (!entry.versions.has(version)) entry.versions.set(version, []);
    entry.versions.get(version).push(name);
  }

  const unattributed = [];
  for (const changeset of changesets) {
    const touched = new Set();
    for (const { name } of changeset.releases) {
      const cohort = cohortOf.get(name);
      if (cohort !== undefined && planned.has(name) && moving.has(cohort)) touched.add(cohort);
    }
    if (touched.size === 0) unattributed.push(changeset.id);
    for (const cohort of touched) moving.get(cohort).changesets.add(changeset.id);
  }

  const cohorts = [];
  for (const [cohort, entry] of [...moving].sort(([a], [b]) => a.localeCompare(b))) {
    const versions = [...entry.versions.keys()];
    if (versions.length > 1 && groups.get(cohort)?.sameVersion) {
      const detail = [...entry.versions]
        .map(([version, names]) => `${version} (${names.sort().join(", ")})`)
        .sort()
        .join(" and ");
      errors.push(
        `Release cohort "${cohort}" declares sameVersion but its members plan different versions: ${detail}. ` +
          `A cohort with two versions has no single curated note to cover, so this stops here.`,
      );
    }
    cohorts.push({
      cohort,
      version: versions.sort(semver.rcompare)[0],
      changesets: [...entry.changesets].sort(),
      packages: [...entry.packages].sort(),
    });
  }
  return { cohorts, unattributed, errors };
}
/**
 * Validate the note's `coverage` metadata and compare it, cohort by cohort, with what the release
 * actually consumes.
 *
 * Findings are returned as objects, not strings, because the gate has to be able to tell a gap this
 * pull request introduced from one its base branch already has. A gap on `main` reaches every open
 * pull request through the merge commit; failing all of them says nothing about any of them. So each
 * finding carries the cohort it belongs to, a stable `kind`, and the changeset ids it is about, and
 * `scripts/check-release-note-coverage.mjs` excuses only those the base tree already produced —
 * **per id**, so a changeset added at this head is still strict even when the cohort is already
 * failing for someone else's.
 *
 * `pendingIds` is passed separately from `cohorts` so that a declared id that exists but belongs to
 * another cohort can be told apart from one that does not exist at all. Both are failures; they are
 * different mistakes and the reader needs to know which one they made.
 *
 * @param {object} input
 * @param {unknown} input.note the parsed release note
 * @param {{cohort: string, version: string, changesets: string[], packages: string[]}[]} input.cohorts from planCohorts
 * @param {Set<string>|string[]} [input.pendingIds] every pending changeset id in the tree
 * @param {string} [input.notePath] for diagnostics
 * @returns {{ok: boolean, errors: string[], findings: {cohort: string|null, kind: string, ids: string[], message: string}[], declaredCohorts: string[]}}
 */
export function validateCoverage({ note, cohorts, pendingIds = [], notePath = "the release note" }) {
  const pending = new Set(pendingIds);
  const declaredCohorts = [];
  const findings = [];
  const add = (cohort, kind, ids, message) => findings.push({ cohort, kind, ids: [...ids].sort(), message });

  // THE INVARIANT THAT MAKES BASE ATTRIBUTION SAFE. `attributeToBase` excuses a finding the base
  // already produced, per id. A finding that *stops* the comparison — a malformed note, malformed
  // `coverage`, a cohort whose declared version does not match the release — must therefore name the
  // changesets whose coverage it has just stopped checking. Otherwise its `ids: []` is vacuously a
  // subset of the base's, the whole finding is excused, and a pre-existing metadata error silently
  // disables enforcement for every changeset added afterwards. Codex found exactly that on this
  // branch: `coverage-absent` had been given its ids and its three siblings had not.
  //
  // A finding that leaves the cohort undeclared does not need them, because `cohort-uncovered` then
  // reports that cohort with its full consumed set. `note-coverage.test.mjs` asserts the property
  // itself — that no short-circuit can excuse a newly consumed changeset — rather than these four
  // call sites, so a fifth short-circuit added later is caught by the same test.
  const stoppedChecking = cohorts.flatMap((entry) => entry.changesets);
  const done = () => ({ ok: findings.length === 0, errors: findings.map((finding) => finding.message), findings, declaredCohorts });

  if (note === null || typeof note !== "object" || Array.isArray(note)) {
    add(null, "note-not-an-object", stoppedChecking, `${notePath} is not a JSON object.`);
    return done();
  }

  const coverage = note[COVERAGE_KEY];
  if (coverage === undefined) {
    add(
      null,
      "coverage-absent",
      stoppedChecking,
      `${notePath} has no \`${COVERAGE_KEY}\` array, so nothing says which changesets it describes.\n` +
        `A note that exists is not a note that covers the release — that is what \`check:release-note\` already proves.\n` +
        `Add, for each cohort this release publishes:\n` +
        `  "${COVERAGE_KEY}": [\n` +
        cohorts
          .map(
            (entry) =>
              `    { "cohort": "${entry.cohort}", "version": "${entry.version}", "changesets": [${entry.changesets
                .map((id) => `"${id}"`)
                .join(", ")}] }`,
          )
          .join(",\n") +
        `\n  ]\n` +
        `Listing an id does not describe it — the prose still has to. This only makes the omission visible.`,
    );
    return done();
  }
  if (!Array.isArray(coverage)) {
    add(
      null,
      "coverage-not-an-array",
      stoppedChecking,
      `${notePath} \`${COVERAGE_KEY}\` must be an array of cohort entries, not ${typeOf(coverage)}.`,
    );
    return done();
  }

  const byCohort = new Map();
  for (const [index, entry] of coverage.entries()) {
    const at = `${notePath} ${COVERAGE_KEY}[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      add(null, "entry-not-an-object", [], `${at} must be an object with \`cohort\`, \`version\` and \`changesets\`, not ${typeOf(entry)}.`);
      continue;
    }
    if (typeof entry.cohort !== "string" || entry.cohort === "") {
      add(null, "entry-cohort-missing", [], `${at} has no non-empty string \`cohort\`. Name the release cohort from release/publish-packages.json.`);
      continue;
    }
    if (typeof entry.version !== "string" || semver.valid(entry.version) === null) {
      add(
        entry.cohort,
        "entry-version-invalid",
        [],
        `${at} (cohort "${entry.cohort}") has no valid semver \`version\`. A cohort without a version cannot be matched to a release.`,
      );
      continue;
    }
    if (byCohort.has(entry.cohort)) {
      add(
        entry.cohort,
        "entry-duplicate-cohort",
        [],
        `${at} declares cohort "${entry.cohort}" a second time. One entry per cohort, or the two disagree and nothing says which wins.`,
      );
      continue;
    }
    const ids = entry.changesets;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || id === "")) {
      add(entry.cohort, "entry-changesets-invalid", [], `${at} (cohort "${entry.cohort}") \`changesets\` must be an array of non-empty changeset ids.`);
      continue;
    }
    const exclusions = [];
    if (entry.exclusions !== undefined) {
      if (!Array.isArray(entry.exclusions)) {
        add(
          entry.cohort,
          "entry-exclusions-invalid",
          [],
          `${at} (cohort "${entry.cohort}") \`exclusions\` must be an array of { changeset, reason } objects.`,
        );
        continue;
      }
      let malformed = false;
      for (const [slot, exclusion] of entry.exclusions.entries()) {
        const where = `${at}.exclusions[${slot}]`;
        if (exclusion === null || typeof exclusion !== "object" || Array.isArray(exclusion)) {
          add(entry.cohort, "exclusion-not-an-object", [], `${where} must be an object with \`changeset\` and \`reason\`, not ${typeOf(exclusion)}.`);
          malformed = true;
          continue;
        }
        if (typeof exclusion.changeset !== "string" || exclusion.changeset === "") {
          add(entry.cohort, "exclusion-changeset-missing", [], `${where} has no non-empty string \`changeset\`.`);
          malformed = true;
          continue;
        }
        if (typeof exclusion.reason !== "string" || exclusion.reason.trim() === "") {
          add(
            entry.cohort,
            "exclusion-reason-missing",
            [exclusion.changeset],
            `${where} excludes "${exclusion.changeset}" with no \`reason\`. An exclusion without a reason is an omission with extra steps.`,
          );
          malformed = true;
          continue;
        }
        exclusions.push(exclusion.changeset);
      }
      if (malformed) continue;
    }
    byCohort.set(entry.cohort, { ...entry, ids, exclusions, at });
    declaredCohorts.push(entry.cohort);
  }

  const planByCohort = new Map(cohorts.map((entry) => [entry.cohort, entry]));

  for (const [cohort, declared] of byCohort) {
    const plan = planByCohort.get(cohort);
    if (!plan) {
      add(
        cohort,
        "cohort-not-in-release",
        [],
        `${declared.at} covers release cohort "${cohort}" at ${declared.version}, but this release does not publish "${cohort}".\n` +
          `It publishes: ${cohorts.length === 0 ? "nothing" : cohorts.map((entry) => `${entry.cohort}@${entry.version}`).join(", ")}.\n` +
          `Covering a cohort that is not in the release describes a release that is not happening.`,
      );
      continue;
    }
    if (declared.version !== plan.version) {
      add(
        cohort,
        "cohort-version-mismatch",
        // This cohort IS in `byCohort`, so no `cohort-uncovered` will report it; its consumed set
        // has to travel with this finding or nothing does.
        plan.changesets,
        `${declared.at} covers cohort "${cohort}" at ${declared.version}, but "${cohort}" publishes ${plan.version} ` +
          `(${plan.packages.join(", ")}).\n` +
          `Cohorts share version numbers — matching on the number alone is how a note for one release line ends up on another.`,
      );
      continue;
    }

    const consumed = new Set(plan.changesets);
    const claimed = [...declared.ids, ...declared.exclusions];
    const both = [...new Set(declared.ids.filter((id) => declared.exclusions.includes(id)))];
    if (both.length > 0) {
      add(
        cohort,
        "covered-and-excluded",
        both,
        `${declared.at} lists ${quoteList(both)} as both covered and excluded. ` +
          `A changeset is either described by this note or deliberately not; it cannot be both.`,
      );
    }

    const missing = plan.changesets.filter((id) => !claimed.includes(id));
    if (missing.length > 0) {
      add(
        cohort,
        "changesets-missing",
        missing,
        `${declared.at} does not account for ${missing.length} changeset(s) that cohort "${cohort}"@${plan.version} consumes: ` +
          `${quoteList(missing)}.\n` +
          `Describe each one in this note and list its id, or exclude it with a reason. These changes publish either way.`,
      );
    }

    const extraneous = claimed.filter((id) => !consumed.has(id));
    if (extraneous.length > 0) {
      const detail = extraneous.map((id) =>
        pending.has(id) ? `"${id}" (pending, but not consumed by "${cohort}")` : `"${id}" (no such pending changeset)`,
      );
      add(
        cohort,
        "changesets-extraneous",
        extraneous,
        `${declared.at} claims ${extraneous.length} changeset(s) cohort "${cohort}"@${plan.version} does not consume: ${detail.join(", ")}.\n` +
          `A stale id makes the coverage set look complete while the real one is not.`,
      );
    }
  }

  for (const plan of cohorts) {
    if (byCohort.has(plan.cohort)) continue;
    add(
      plan.cohort,
      "cohort-uncovered",
      plan.changesets,
      `This release publishes cohort "${plan.cohort}"@${plan.version} (${plan.packages.join(", ")}), ` +
        `and ${notePath} declares no coverage for it.\n` +
        `Its ${plan.changesets.length} changeset(s) — ${plan.changesets.length === 0 ? "none pending" : quoteList(plan.changesets)} — ` +
        `would publish with no curated description.`,
    );
  }

  return done();
}

/**
 * Which of this tree's findings the base branch already produces.
 *
 * Matched on cohort and kind, and then **per changeset id**: a base finding excuses a head finding
 * only for the ids it already named. `missing: [a]` on the base and `missing: [a, b]` at this head
 * leaves `b` strict, which is the case that matters — otherwise one pre-existing gap would make a
 * cohort permanently unguarded.
 *
 * @param {{cohort: string|null, kind: string, ids: string[], message: string}[]} findings this tree
 * @param {{cohort: string|null, kind: string, ids: string[]}[]} baseFindings the base tree
 * @returns {{attributed: object[], introduced: object[]}}
 */
export function attributeToBase(findings, baseFindings) {
  const attributed = [];
  const introduced = [];
  for (const finding of findings) {
    const match = baseFindings.find((other) => other.cohort === finding.cohort && other.kind === finding.kind);
    const excused = match !== undefined && finding.ids.every((id) => match.ids.includes(id));
    (excused ? attributed : introduced).push(finding);
  }
  return { attributed, introduced };
}

const quoteList = (ids) => ids.map((id) => `"${id}"`).join(", ");
const typeOf = (value) => (value === null ? "null" : Array.isArray(value) ? "an array" : typeof value);
