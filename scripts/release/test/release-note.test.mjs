import assert from "node:assert/strict";
import { it } from "node:test";
import { noteErrors, linkErrors, allNoteErrors } from "../check-release-note.mjs";
import { offSite } from "../links.mjs";

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

// --- metadata array ELEMENTS, not only the arrays -------------------------------------------------
//
// `Release` in apps/web/src/lib/releases.ts types `breaking` and `limitations` as `string[]` and
// `newComponents` as `{ group: string; slugs: string[] }[]`. version-release-meta.mjs copies them
// verbatim, so a malformed element fails the generated TypeScript exactly as a bad `area` does.
// Measured on the real path: splicing `breaking: [42]`, `limitations: [{}]` and
// `newComponents: [{ group: "Forms" }]` into releases.ts produces three distinct `error TS` under
// the site's own tsconfig — TS2322, TS2322 and TS2741 — one per value.

it("rejects a non-string element of breaking or limitations", () => {
  assert.equal(errs((n) => (n.breaking = [42])).length, 1);
  assert.equal(errs((n) => (n.breaking = [null])).length, 1);
  assert.equal(errs((n) => (n.limitations = [{}])).length, 1);
  assert.match(errs((n) => (n.breaking = ["ok", 7]))[0], /breaking\[1\]/);
  // the outer-shape rules still hold
  assert.equal(errs((n) => (n.limitations = "not an array")).length, 1);
});

it("requires group and slugs on every newComponents entry", () => {
  assert.match(errs((n) => (n.newComponents = [{ group: "Forms" }]))[0], /slugs/);
  assert.match(errs((n) => (n.newComponents = ["x"]))[0], /must be an object/);
  assert.match(errs((n) => (n.newComponents = [{ group: "Forms", slugs: [7] }]))[0], /slugs\[0\]/);
  assert.equal(errs((n) => (n.newComponents = [{ slugs: ["input"] }])).length, 1);
  assert.deepEqual(errs((n) => (n.newComponents = [{ group: "Forms", slugs: ["input"] }])), []);
});

it("reports a malformed change element instead of throwing on it", () => {
  // `"body" in 42` is a TypeError. A gate that dies with a stack trace naming its own source tells
  // the author nothing about their note, so the element is reported like any other error.
  for (const bad of [42, null, "a string", ["an", "array"]]) {
    const e = errs((n) => (n.changes = [bad]));
    assert.equal(e.length, 1, `${JSON.stringify(bad)} gave ${e.length} errors`);
    assert.match(e[0], /changes\[0\]/);
  }
});

it("still accepts a note using every optional field correctly", () => {
  assert.deepEqual(
    errs((n) => {
      n.breaking = ["a breaking change"];
      n.limitations = ["what it does not do"];
      n.newComponents = [{ group: "Forms", slugs: ["input", "select"] }];
      n.migration = "what to do about it";
      n.changes[0].href = "/docs/forms#input";
    }),
    [],
  );
});

// --- the two readers of a href must answer alike ---------------------------------------------------
//
// A note's hrefs are scanned twice: here at authoring time, and by check:release-links against the
// built site. A destination one accepts and the other rejects is a release lost to a sentence. An
// earlier version of linkErrors allowed only http(s), which rejected `mailto:` and `tel:` —
// destinations changelog-view.tsx renders straight into an anchor and check:release-links
// deliberately leaves alone. This asserts the two agree rather than restating the policy.

it("accepts every destination check:release-links treats as off-site", () => {
  for (const href of ["https://x.test/a", "http://x.test/a", "mailto:security@example.com", "tel:+15551234", "//cdn.test/a.png", "#anchor"]) {
    assert.ok(offSite(href), `${href} is not off-site by links.mjs, so this case tests nothing`);
    assert.deepEqual(linkErrors(href, "where"), [], `${href} should be accepted`);
  }
});

it("accepts a site-absolute route, fragment and all", () => {
  assert.deepEqual(linkErrors("/docs/forms#input", "where"), []);
  assert.deepEqual(linkErrors("/", "where"), []);
});

it("rejects a relative href rather than resolving it, and says why", () => {
  // root-relative is the required spelling: the browser resolves a relative href against the page
  // the reader is on, so `./docs/motion` on /docs/changelog is a 404 in a different spelling.
  for (const href of ["./docs/motion", "docs/motion", "../motion"]) {
    assert.ok(!offSite(href) && !href.startsWith("/"), `${href} would not reach the relative branch`);
    assert.equal(linkErrors(href, "where").length, 1);
    assert.match(linkErrors(href, "where")[0], /relative href/);
  }
});

it("rejects a padded or empty href", () => {
  assert.match(linkErrors(" /docs/forms", "where")[0], /whitespace/);
  assert.match(linkErrors("", "where")[0], /non-empty string/);
  assert.match(linkErrors(undefined, "where")[0], /non-empty string/);
});

it("carries the href rules into a note's changes", () => {
  assert.deepEqual(errs((n) => (n.changes[0].href = "mailto:security@example.com")), []);
  assert.equal(errs((n) => (n.changes[0].href = "docs/motion")).length, 1);
});
