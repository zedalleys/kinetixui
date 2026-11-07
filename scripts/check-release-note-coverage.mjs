/**
 * check-release-note-coverage.mjs — does the curated note cover every changeset the release carries?
 *
 *   node scripts/check-release-note-coverage.mjs
 *
 * `check:release-note` asks whether a note *exists* for the version a merge would publish, and
 * whether its fields are well formed. This asks the question that survives that one: of the
 * changesets this release consumes, how many does the note actually account for? Those are separate
 * gates on purpose — a note can be present, valid, linked and typechecked while describing three of
 * five changesets, and the two it misses publish with no curated description at all.
 *
 * No keyword matching. Coverage is declared as structured metadata in the note's `coverage` array,
 * and this compares two sets of changeset identifiers per release cohort. See
 * `scripts/release/note-coverage.mjs` for the model and why a version number is not a cohort
 * identity.
 *
 * WHAT IT DOES NOT DO.
 *
 *   - It does not require a note. A release-inert pull request moves no cohort and is passed with a
 *     one-line report; a cohort that moves with no note at all is `check:release-note`'s finding and
 *     `version-release-meta.mjs`'s post-merge throw, not this one's. One defect, one gate.
 *   - It does not fail a pull request for a gap its base branch already has. A gap on `main` reaches
 *     every open pull request through the merge commit. Those findings are reported and attributed
 *     to the base; only what this head introduces fails. Attribution is per changeset id, so a
 *     changeset added here is strict even when the cohort is already failing for another.
 *   - It does not check the only note a non-core cohort could have, because there is no such file:
 *     `release/notes/<version>.json` is keyed by the core version and activated from
 *     `packages/ui/package.json`. An Angular-only or IoT-only release therefore publishes with no
 *     curated note, and this says so rather than inventing a path. Stated, not fixed here.
 *
 * It runs on the merge checkout, which is `actions/checkout`'s default for `pull_request` — and that
 * matters for the same reason it does for `check:release-note`: on a raw head checkout, a branch
 * carrying changesets already consumed on `main` plans a long-published version, and the gate would
 * compare a historical note against a release that already happened.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseChangeset, readPendingChangesets } from "./release/peers.mjs";
import { discoverWorkspace, WORKSPACE_DIRS } from "./release/workspace.mjs";
import { attributeToBase, planCohorts, validateCoverage } from "./release/note-coverage.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const NAME = "check:release-note-coverage";

/* ------------------------------------------------------------------ the tree this gate runs on */

/** Everything the evaluation needs, from the working tree. */
function readWorkingTree() {
  return {
    label: "this tree",
    allowlistFile: readJson(path.join(root, "release/publish-packages.json")),
    changesetConfig: readJson(path.join(root, ".changeset/config.json")) ?? {},
    packages: discoverWorkspace(root),
    changesets: readPendingChangesets(root),
    coreVersion: readJson(path.join(root, "packages/ui/package.json"))?.version ?? null,
    note: (version) => readJson(path.join(root, `release/notes/${version}.json`)),
    noteExists: (version) => existsSync(path.join(root, `release/notes/${version}.json`)),
  };
}

/**
 * The same, read out of a git ref rather than the filesystem, so the base branch can be evaluated by
 * the identical code. Returns null when the ref is not available — a shallow clone, or a fork whose
 * base was never fetched — and the caller then stays strict and says why.
 */
function readRef(ref) {
  const resolved = git(["rev-parse", "--verify", `${ref}^{commit}`]);
  if (resolved === null) return null;
  const listing = git(["ls-tree", "-r", "--name-only", resolved]);
  if (listing === null) return null;
  const files = new Set(listing.split("\n").filter(Boolean));
  const show = (file) => (files.has(file) ? git(["show", `${resolved}:${file}`]) : null);
  const showJson = (file) => {
    const text = show(file);
    if (text === null) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const manifestPattern = new RegExp(`^(${WORKSPACE_DIRS.join("|")})/[^/]+/package\\.json$`);
  const packages = [];
  for (const file of [...files].filter((file) => manifestPattern.test(file)).sort()) {
    const manifest = showJson(file);
    if (manifest === null) continue;
    packages.push({
      name: manifest.name ?? `(unnamed: ${path.dirname(file)})`,
      version: manifest.version ?? null,
      directory: path.dirname(file),
      manifest,
    });
  }

  const changesets = [...files]
    .filter((file) => file.startsWith(".changeset/") && file.endsWith(".md") && path.basename(file).toLowerCase() !== "readme.md")
    .sort()
    .map((file) => ({ id: path.basename(file).replace(/\.md$/, ""), releases: parseChangeset(show(file) ?? "") }));

  return {
    label: `${ref} (${resolved.slice(0, 10)})`,
    allowlistFile: showJson("release/publish-packages.json"),
    changesetConfig: showJson(".changeset/config.json") ?? {},
    packages,
    changesets,
    coreVersion: showJson("packages/ui/package.json")?.version ?? null,
    note: (version) => showJson(`release/notes/${version}.json`),
    noteExists: (version) => files.has(`release/notes/${version}.json`),
  };
}

/* ------------------------------------------------------------------------------ the evaluation */

/**
 * Plan the tree's cohorts and check the projected note against them.
 *
 * `state` is one of:
 *   inert       no cohort moves, so no note is owed
 *   no-note     a cohort moves but `release/notes/<core>.json` does not exist (another gate's)
 *   uncurated   a cohort moves but core does not, so no note file is keyed by this release
 *   checked     the note was read and compared; `findings` says what came of it
 *   broken      the tree could not be planned at all
 */
function evaluate(tree) {
  if (tree.allowlistFile === null) {
    return { state: "broken", errors: [`${tree.label}: release/publish-packages.json is missing or not valid JSON, so no release cohort can be identified.`], findings: [] };
  }
  const plan = planCohorts({
    allowlistFile: tree.allowlistFile,
    packages: tree.packages,
    changesets: tree.changesets,
    changesetConfig: tree.changesetConfig,
  });
  if (plan.errors.length > 0) return { state: "broken", errors: plan.errors, findings: [], plan };
  if (plan.cohorts.length === 0) return { state: "inert", errors: [], findings: [], plan };

  const core = plan.cohorts.find((entry) => entry.cohort === "core");
  if (!core) return { state: "uncurated", errors: [], findings: [], plan };
  if (!tree.noteExists(core.version)) return { state: "no-note", errors: [], findings: [], plan, core };

  const note = tree.note(core.version);
  const notePath = `release/notes/${core.version}.json`;
  if (note === null) {
    return { state: "broken", errors: [`${tree.label}: ${notePath} is not valid JSON.`], findings: [], plan, core };
  }
  const result = validateCoverage({
    note,
    cohorts: plan.cohorts,
    pendingIds: tree.changesets.map((changeset) => changeset.id),
    notePath,
  });
  return { state: "checked", errors: result.errors, findings: result.findings, plan, core, notePath };
}

/* ------------------------------------------------------------------------------------ the gate */

const head = readWorkingTree();
const result = evaluate(head);
const summarize = (plan) => plan.cohorts.map((entry) => `${entry.cohort}@${entry.version} (${entry.changesets.length} changeset(s))`).join(", ");

if (result.state === "broken") {
  fail(result.errors);
}

if (result.state === "inert") {
  pass(
    `no pending changeset moves a published release cohort, so no curated note is owed` +
      (result.plan.unattributed.length > 0
        ? `. ${result.plan.unattributed.length} pending changeset(s) name no published package: ${result.plan.unattributed.join(", ")}`
        : ""),
  );
}

if (result.state === "uncurated") {
  pass(
    `this release publishes ${summarize(result.plan)} but not the core cohort, and ` +
      `release/notes/<version>.json is keyed by the core version — so no curated note file exists for it to cover.\n` +
      `That is a gap in the note model, not in this release: a non-core cohort has nowhere to declare coverage. ` +
      `Recorded here rather than enforced against a file that cannot exist.`,
  );
}

if (result.state === "no-note") {
  pass(
    `this release publishes ${summarize(result.plan)} and release/notes/${result.core.version}.json does not exist.\n` +
      `A missing note is \`check:release-note\`'s finding and \`version-release-meta.mjs\`'s post-merge throw. ` +
      `Coverage is only answerable once there is a note to read, so this reports and stands aside.`,
  );
}

if (result.findings.length === 0) {
  const declared = result.plan.cohorts
    .map((entry) => `${entry.cohort}@${entry.version}: ${entry.changesets.length === 0 ? "no changesets" : entry.changesets.join(", ")}`)
    .join("; ");
  pass(`${result.notePath} covers every changeset this release consumes — ${declared}`);
}

// Something is wrong. Before failing, ask whether the base branch is already in this state.
const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main";
const base = readRef(baseRef);

if (base === null) {
  fail([
    ...result.errors,
    `The base branch (${baseRef}) could not be read, so this could not check whether the gap is already there. ` +
      `Staying strict: an unreadable base is not an absent one.`,
  ]);
}

const baseResult = evaluate(base);
const comparable = baseResult.state === "checked" && baseResult.core?.version === result.core.version;
const { attributed, introduced } = comparable ? attributeToBase(result.findings, baseResult.findings) : { attributed: [], introduced: result.findings };

if (introduced.length === 0) {
  pass(
    `${base.label} already projects ${result.core.cohort}@${result.core.version} with the same coverage gap, so this ` +
      `pull request did not introduce it:\n\n${attributed.map((finding) => indent(finding.message)).join("\n\n")}\n\n` +
      `Failing every open pull request for a gap on the base branch would say nothing about any of them. ` +
      `The gap is real and belongs to whoever authors ${result.notePath}.`,
  );
}

fail(
  introduced.map((finding) => finding.message),
  attributed.length > 0
    ? `\n${attributed.length} further finding(s) are already present on ${base.label} and are not counted against this head.`
    : "",
);

/* ---------------------------------------------------------------------------------- plumbing */

function pass(message) {
  console.log(`${NAME} ok — ${message}`);
  process.exit(0);
}

function fail(errors, trailer = "") {
  console.error(errors.join("\n\n"));
  if (trailer) console.error(trailer);
  console.error(`\n${NAME} failed. Nothing was published.`);
  process.exit(1);
}

/** Declared, not assigned to a const: it is called from `pass()` above this point in the file. */
function indent(text) {
  return text.replace(/^/gm, "  ");
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function git(args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trimEnd();
}
