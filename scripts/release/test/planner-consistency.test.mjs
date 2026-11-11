/**
 * #465 (`check:release-note`) and #538 (`check:release-note-coverage`) each ask "which version does
 * this tree's release carry?" with their own code path: #465 through `projectedCore`, #538 through
 * `planCohorts`. Both are meant to read the same answer from the same changesets. If they ever
 * disagree, one gate would demand a note for 0.27.0 while the other checks coverage for 0.26.2, and
 * a PR could pass both while the release is described by neither.
 *
 * Every scenario is built once and read through BOTH planners from the same in-memory tree. The
 * allowlist is the repository's real `release/publish-packages.json`, and the changeset config
 * carries the same `fixed` / `ignore` the repository declares, so a change to either that moves
 * the cohort shows up here.
 *
 * Also carries the "0.26.0 replay" from #463, the one assertion that PR holds and #465's own
 * tests do not: the shape of `main` the moment #442 merged.
 *
 * NEGATIVE CONTROL: the last test plans the same tree with the core packages ignored and requires
 * the two planners to disagree, which proves the comparison can fail rather than agree vacuously.
 */
import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";
import { projectedCore } from "../check-release-note.mjs";
import { planCohorts } from "../note-coverage.mjs";
import { parseChangeset } from "../peers.mjs";

const allowlist = JSON.parse(readFileSync(new URL("../../../release/publish-packages.json", import.meta.url), "utf8"));
const CONFIG = { fixed: [["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]], ignore: ["@kinetixui/web"] };
const V = (name, version) => [`packages/${name}/package.json`, JSON.stringify({ name: `@kinetixui/${name.replace("ui-", "")}`, version })];

/** A workspace at `core`/`angular`/`iot` versions plus the given changesets (id -> front-matter body). */
function workspace({ core = "0.26.1", angular = "0.26.1", iot = "0.5.0", changesets = {}, config = CONFIG }) {
  const files = Object.fromEntries([
    ["packages/ui/package.json", JSON.stringify({ name: "@kinetixui/ui", version: core })],
    ["packages/tokens/package.json", JSON.stringify({ name: "@kinetixui/tokens", version: core })],
    ["packages/cli/package.json", JSON.stringify({ name: "@kinetixui/cli", version: core })],
    ["packages/ui-angular/package.json", JSON.stringify({ name: "@kinetixui/angular", version: angular })],
    ["packages/iot/package.json", JSON.stringify({ name: "@kinetixui/iot", version: iot })],
    [".changeset/config.json", JSON.stringify(config)],
    ...Object.entries(changesets).map(([id, body]) => [`.changeset/${id}.md`, `---\n${body}\n---\n\nprose\n`]),
  ]);
  return files;
}
const reader = (files) => ({
  show: (p) => files[p] ?? null,
  list: (dir) => [...new Set(Object.keys(files).filter((p) => p.startsWith(`${dir}/`)).map((p) => p.slice(dir.length + 1).split("/")[0]))],
});

/** What #538's planner says the core cohort publishes, from the same tree. */
function cohortCore(files, configOverride) {
  const packages = Object.entries(files).filter(([p]) => /^packages\/[^/]+\/package\.json$/.test(p)).map(([, t]) => JSON.parse(t));
  const changesets = Object.entries(files)
    .filter(([p]) => p.startsWith(".changeset/") && p.endsWith(".md"))
    .map(([p, t]) => ({ id: p.slice(".changeset/".length, -3), releases: parseChangeset(t) }))
    .filter((c) => c.releases.length);
  const config = configOverride ?? JSON.parse(files[".changeset/config.json"]);
  const plan = planCohorts({ allowlistFile: allowlist, packages, changesets, changesetConfig: config });
  assert.deepEqual(plan.errors, []);
  return plan.cohorts.find((c) => c.cohort === "core")?.version;
}

const pair = (files) => [projectedCore(reader(files)), cohortCore(files)];
const ui = (bump) => `"@kinetixui/ui": ${bump}`;

const SCENARIOS = {
  "a release-inert tree": {},
  "only an Angular changeset": { changesets: { a: `"@kinetixui/angular": patch` } },
  "only an IoT changeset": { changesets: { a: `"@kinetixui/iot": minor` } },
  "a ui patch": { changesets: { a: ui("patch") } },
  "a ui minor": { changesets: { a: ui("minor") } },
  "a tokens minor, which moves ui through the fixed group": { changesets: { a: `"@kinetixui/tokens": minor` } },
  "a cli major": { changesets: { a: `"@kinetixui/cli": major` } },
  "two patches do not stack": { changesets: { a: ui("patch"), b: ui("patch") } },
  "a patch and a minor: the strongest bump carries the cohort": { changesets: { a: ui("patch"), b: `"@kinetixui/tokens": minor` } },
  "one changeset naming core and Angular (the shared Metric fix)": { changesets: { a: `${ui("patch")}\n"@kinetixui/angular": patch` } },
  "a changeset naming only an ignored package": { changesets: { a: `"@kinetixui/web": minor` } },
  // `ignore` only changes the answer when an ignored package would otherwise move the cohort: a cli major is ignored here, so
  // the ui patch decides alone. A planner that drops `ignore` reads 1.0.0 and the comparison below must catch it.
  "an ignored core package's major does not move the cohort": { config: { ...CONFIG, ignore: [...CONFIG.ignore, "@kinetixui/cli"] }, changesets: { a: `"@kinetixui/cli": major`, b: ui("patch") } },
  "core and Angular on the same number": { core: "0.26.1", angular: "0.26.1", changesets: { a: ui("patch"), b: `"@kinetixui/angular": patch` } },
};

for (const [name, spec] of Object.entries(SCENARIOS)) {
  it(`#465 and #538 agree on the core version for ${name}`, () => {
    const [fromNote, fromCoverage] = pair(workspace(spec));
    assert.equal(fromNote, fromCoverage);
  });
}

it("agree on the 0.26.0 replay: a 0.25.0 core with a minor and an Angular patch pending (from #463)", () => {
  // The shape of `main` the moment #442 merged, which left the release red on every later push.
  const files = workspace({ core: "0.25.0", angular: "0.25.0", changesets: { a: ui("minor"), b: `"@kinetixui/angular": patch` } });
  const [fromNote, fromCoverage] = pair(files);
  assert.equal(fromNote, "0.26.0");
  assert.equal(fromCoverage, "0.26.0");
});

it("NEGATIVE CONTROL: a planner that ignores the core packages disagrees, so this comparison can fail", () => {
  const files = workspace({ changesets: { a: ui("minor") } });
  const fromNote = projectedCore(reader(files));
  const ignoringCore = cohortCore(files, { ...CONFIG, ignore: [...CONFIG.ignore, "@kinetixui/ui", "@kinetixui/tokens", "@kinetixui/cli"] });
  assert.equal(fromNote, "0.27.0");
  assert.notEqual(ignoringCore, fromNote);
});
