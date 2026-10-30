import assert from "node:assert/strict";
import { it } from "node:test";
import { noteErrors, linkErrors, allNoteErrors } from "../check-release-note.mjs";

/** A note that is fit to be injected, so each case below changes exactly one thing. */
const good = () => ({
  version: "0.27.0",
  summary: "What this release is about.",
  breaking: [],
  changes: [{ kind: "accessibility", area: "components", title: "A title", body: "A body." }],
});
const errs = (mutate) => {
  const note = good();
  mutate(note);
  return noteErrors(note, "0.27.0", "release/notes/0.27.0.json");
};

it("accepts a well-formed note", () => {
  assert.deepEqual(errs(() => {}), []);
});

it("rejects a note describing another version", () => {
  // version-release-meta.mjs asserts this itself and throws after the merge; catching it here is
  // the whole point of the gate.
  assert.equal(errs((n) => (n.version = "0.26.9")).length, 1);
});

it("requires summary, breaking and a non-empty changes list", () => {
  assert.equal(errs((n) => delete n.breaking).length, 1);
  assert.equal(errs((n) => (n.summary = "   ")).length, 1);
  assert.equal(errs((n) => (n.changes = [])).length, 1);
  assert.equal(errs((n) => delete n.changes).length, 1);
});

it("rejects a hand-written date", () => {
  // The publishing run stamps entry.date with its own UTC day, and scripts/release/dates.mjs
  // refuses first publication unless it matches. A date written here is overwritten or misleading.
  assert.equal(errs((n) => (n.date = "2026-10-25")).length, 1);
});

it("holds changes to the vocabulary releases.ts declares", () => {
  assert.equal(errs((n) => (n.changes[0].kind = "tweak")).length, 1);
  assert.equal(errs((n) => (n.changes[0].area = "widgets")).length, 1);
  assert.equal(errs((n) => delete n.changes[0].title).length, 1);
  assert.deepEqual(errs((n) => (n.changes[0].area = ["components", "tokens"])), []);
});

it("preserves the supported optional metadata rather than rejecting what it does not know", () => {
  assert.deepEqual(
    errs((n) => {
      n.migration = "Replace x with y.";
      n.limitations = ["Still React-only."];
      n.newComponents = [{ group: "Forms", slugs: ["date-picker"] }];
      n.githubReleaseUrl = "https://github.com/zedalleys/kinetixui/releases/tag/v0.27.0";
      n.changes[0].href = "/docs/components/date-picker";
      n.someFutureField = 1;
    }),
    [],
  );
});

it("rejects a githubReleaseUrl that names a different version", () => {
  assert.equal(errs((n) => (n.githubReleaseUrl = "https://github.com/zedalleys/kinetixui/releases/tag/v0.26.0")).length, 1);
  assert.equal(errs((n) => (n.githubReleaseUrl = "https://example.com/v0.27.0")).length, 1);
});

it("accepts a site-absolute route or an absolute URL as a link, and nothing else", () => {
  // Resolving a route to a real page is check:release-links, which needs a built site.
  assert.deepEqual(linkErrors("/docs/components/date-picker", "href"), []);
  assert.deepEqual(linkErrors("https://kinetixui.com/docs", "href"), []);
  assert.equal(linkErrors("docs/date-picker", "href").length, 1);
  assert.equal(linkErrors("", "href").length, 1);
  assert.equal(linkErrors(undefined, "href").length, 1);
});

// --- the projection half -------------------------------------------------------------------
// `projectedCore` takes a tree reader, so the same function runs over the working tree and over a
// git ref. Both sides of the base-attribution comparison must therefore agree by construction;
// these exercise it over an in-memory tree. Cases contributed by #463's thread.
import { projectedCore } from "../check-release-note.mjs";

/** A throwaway tree: `files` maps a path to its text, directories are inferred. */
const tree = (files) => ({
  show: (p) => files[p] ?? null,
  list: (dir) =>
    [...new Set(Object.keys(files).filter((p) => p.startsWith(`${dir}/`)).map((p) => p.slice(dir.length + 1).split("/")[0]))],
});
const CONFIG = JSON.stringify({ fixed: [["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]], ignore: ["@kinetixui/web"] });
const CORE = {
  "packages/ui/package.json": JSON.stringify({ name: "@kinetixui/ui", version: "0.26.1" }),
  "packages/tokens/package.json": JSON.stringify({ name: "@kinetixui/tokens", version: "0.26.1" }),
  "packages/cli/package.json": JSON.stringify({ name: "@kinetixui/cli", version: "0.26.1" }),
  "packages/ui-angular/package.json": JSON.stringify({ name: "@kinetixui/angular", version: "0.26.1" }),
  ".changeset/config.json": CONFIG,
};
const cs = (body) => `---\n${body}\n---\n\nprose\n`;

it("projects nothing when no changeset moves the core", () => {
  assert.equal(projectedCore(tree({ ...CORE })), undefined);
  assert.equal(projectedCore(tree({ ...CORE, ".changeset/README.md": "not a changeset" })), undefined);
  assert.equal(projectedCore(tree({ ...CORE, ".changeset/a.md": cs('"@kinetixui/angular": patch') })), undefined);
});

it("projects the fixed cohort's version from the strongest bump", () => {
  assert.equal(projectedCore(tree({ ...CORE, ".changeset/a.md": cs('"@kinetixui/ui": patch') })), "0.26.2");
  assert.equal(projectedCore(tree({ ...CORE, ".changeset/a.md": cs('"@kinetixui/ui": minor') })), "0.27.0");
  // two patches do not stack past one bump — this is why #455 and #456 share 0.26.1
  assert.equal(
    projectedCore(tree({ ...CORE, ".changeset/a.md": cs('"@kinetixui/ui": patch'), ".changeset/b.md": cs('"@kinetixui/ui": patch') })),
    "0.26.2",
  );
  // a minor anywhere in the cohort carries the whole cohort
  assert.equal(projectedCore(tree({ ...CORE, ".changeset/a.md": cs('"@kinetixui/tokens": minor') })), "0.27.0");
});

it("reads the same way over any tree, so the base comparison cannot disagree with itself", () => {
  const files = { ...CORE, ".changeset/a.md": cs('"@kinetixui/ui": minor') };
  // the working tree and a git ref differ only in how bytes are fetched
  assert.equal(projectedCore(tree(files)), projectedCore(tree({ ...files })));
});

// --- the sweep over every note, which is what covers a note-only pull request ----------------

/** A notes directory as the sweep sees it: a lister and a reader, same shape as the tree helpers. */
const notes = (files) => [
  (dir) => (dir === "release/notes" ? Object.keys(files) : []),
  (rel) => files[rel.replace("release/notes/", "")] ?? null,
];

it("sweeps every note and keys each one on its own filename", () => {
  const [list, read] = notes({
    "0.26.1.json": JSON.stringify({ ...good(), version: "0.26.1" }),
    "0.27.0.json": JSON.stringify(good()),
  });
  assert.deepEqual(allNoteErrors(list, read), []);
  // the filename is the authority, so a note under the wrong name is caught by the same assertion
  const [l2, r2] = notes({ "0.26.1.json": JSON.stringify(good()) });
  assert.equal(allNoteErrors(l2, r2).length, 1);
});

it("catches an out-of-union area or kind with nothing pending — the 0.27.0 note's own defect", () => {
  // Three changes classified `tooling`, `angular` and `website` reached main this way: inert JSON,
  // so main stayed green, and a build failure the moment the Version PR activated them.
  const note = good();
  note.changes = [
    { title: "a", area: ["tokens", "tooling"] },
    { title: "b", area: "angular" },
    { title: "c", area: "website" },
    { title: "d", kind: "tooling-change" },
  ];
  const [list, read] = notes({ "0.27.0.json": JSON.stringify(note) });
  const e = allNoteErrors(list, read);
  // each one is reported; the Next build stops at the first, which is how two of the three hid
  assert.equal(e.length, 4);
  for (const bad of ["tooling", "angular", "website", "tooling-change"]) {
    assert.ok(e.some((m) => m.includes(`"${bad}"`)), `${bad} not reported: ${e.join(" | ")}`);
  }
});

it("reports unparseable JSON rather than throwing", () => {
  const [list, read] = notes({ "0.27.0.json": "{ not json" });
  const e = allNoteErrors(list, read);
  assert.equal(e.length, 1);
  assert.match(e[0], /is not valid JSON/);
});

it("ignores non-JSON entries and an absent directory", () => {
  const [list, read] = notes({ "README.md": "prose", "0.27.0.json": JSON.stringify(good()) });
  assert.deepEqual(allNoteErrors(list, read), []);
  assert.deepEqual(allNoteErrors(() => [], () => null), []);
});
