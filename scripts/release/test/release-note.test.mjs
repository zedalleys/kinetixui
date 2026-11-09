import assert from "node:assert/strict";
import { it } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { noteErrors, linkErrors, allNoteErrors, manifestSlugs } from "../check-release-note.mjs";
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
  assert.deepEqual(
    noteErrors({ ...good(), newComponents: [{ group: "Forms", slugs: ["input"] }] }, "0.27.0", "r", new Set(["input"])),
    [],
  );
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
      n.newComponents = [{ group: "Forms", slugs: [] }];
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

// This test USED to assert that every destination `links.mjs` calls off-site is accepted here, and
// that was the right shape while this gate had no policy of its own. It is now deliberately reversed
// by owner decision: a curated note may carry only a site-absolute route or an https: URL.
//
// The reversal is not a return to the divergence that earlier made this gate reject a legitimate
// `mailto:`. `offSite` is still the single answer to "does this name a route here?" — the question
// `check:release-links` asks. This gate asks a second, different question of the off-site ones: may a
// note carry it? So the two gates still cannot disagree about what they both decide.
it("asks links.mjs what is off-site, then applies its own narrower policy to those", () => {
  for (const href of ["https://x.test/a", "http://x.test/a", "mailto:security@example.com", "tel:+15551234", "#anchor"]) {
    assert.ok(offSite(href), `${href} is not off-site by links.mjs, so this case tests nothing`);
  }
  // Permitted off-site: https only.
  assert.deepEqual(linkErrors("https://x.test/a", "where"), []);
  // Refused, each naming its scheme, though links.mjs calls them all off-site.
  for (const href of ["http://x.test/a", "mailto:security@example.com", "tel:+15551234", "ftp://x.test/a", "data:text/html,x"]) {
    const e = linkErrors(href, "where");
    assert.equal(e.length, 1, `${href} should be refused`);
    assert.match(e[0], /may not carry/);
  }
  // A bare fragment is off-site to links.mjs but names no destination a note can link to.
  assert.equal(linkErrors("#anchor", "where").length, 1);
});

// The one that matters most, and the reason an allowlist beats a denylist: these are executable or
// unencrypted in the anchor `changelog-view.tsx:100,146` renders.
it("refuses javascript:, data: and http:, and names why", () => {
  for (const href of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html;base64,PHNjcmlwdD4="]) {
    const e = linkErrors(href, "where");
    assert.equal(e.length, 1, `${href} must be refused`);
    assert.match(e[0], /may not carry/);
  }
  assert.match(linkErrors("http://x.test/a", "where")[0], /not encrypted/);
  // An unknown future scheme is refused by default rather than accepted by default.
  assert.equal(linkErrors("wss://x.test", "where").length, 1);
});

// A protocol-relative URL begins with "/" but is another origin. The previous policy read it as a
// site-absolute route on the first branch, so it was classified LOCAL and never reached `offSite`.
it("refuses a protocol-relative URL instead of reading it as a site route", () => {
  const e = linkErrors("//evil.test/x", "where");
  assert.equal(e.length, 1);
  assert.match(e[0], /protocol-relative/);
  assert.ok(offSite("//evil.test/x"), "links.mjs calls it off-site; this gate must not call it a route");
});

// Codex finding, 2026-10-31: the protocol-relative ban above is not the whole of it. A browser reads
// "\\" as "/" and DELETES embedded tab, LF and CR characters before resolving, so spellings that begin
// with a single "/" still reach another origin. Measured against
// `new URL(href, "https://kinetixui.com/docs/changelog")` on the previous policy, every case below
// resolved to https://evil.test/x and this gate accepted all five.
it("refuses a site-absolute route a browser would normalise onto another origin", () => {
  const B = String.fromCharCode(92);
  for (const href of [`/${B}evil.test/x`, `/${B}/evil.test/x`, "/\t/evil.test/x", "/\n/evil.test/x", "/\r/evil.test/x"]) {
    // The destination the reader's browser actually reaches, which is the thing that matters.
    assert.equal(new URL(href, "https://kinetixui.com/docs/changelog").origin, "https://evil.test",
      `fixture is wrong: ${JSON.stringify(href)} does not resolve cross-origin`);
    const e = linkErrors(href, "where");
    assert.equal(e.length, 1, `${JSON.stringify(href)} was accepted as a route on this site`);
    assert.match(e[0], /another origin|does not say where the link goes/);
  }
});

it("refuses a route whose text is not how a browser reads it", () => {
  // Not cross-origin, but the note still does not say where the link goes, and `check:release-links`
  // would look for the literal text as a route and find nothing. The two gates must not disagree.
  const e = linkErrors("/../../x", "where");
  assert.equal(e.length, 1);
  assert.match(e[0], /is read by a browser as "\/x"/);
});

// Codex finding, 2026-11-09, and the third instance of one shape: the gate deciding on the literal
// text while the browser decides on the resolution. The two commits before this closed it for an
// href beginning with "/"; this closes it for one beginning with "https:". A special scheme followed
// by fewer than two slashes parses as an authority ALONE and as a relative path IN A PAGE, so these
// passed as GitHub links and sent the reader to a local route that does not exist. `offSite` calls
// them off-site, so `check:release-links` never looked for that route either.
it("refuses an https spelling a browser resolves as a relative path", () => {
  for (const href of ["https:github.com/zedalleys/kinetixui/releases", "https:/github.com/zedalleys/kinetixui/releases"]) {
    // The fixture has to really be asymmetric, or this test proves nothing about the gate.
    const alone = new URL(href).href;
    const inPage = new URL(href, "https://kinetixui.com/docs/changelog").href;
    assert.notEqual(inPage, alone, `fixture is wrong: ${JSON.stringify(href)} reads alike both ways`);
    assert.equal(new URL(inPage).origin, "https://kinetixui.com",
      `fixture is wrong: ${JSON.stringify(href)} does not land on this site in a page`);
    assert.ok(offSite(href), "links.mjs calls it off-site, so check:release-links will not check that route");

    const e = linkErrors(href, "where");
    assert.equal(e.length, 1, `${JSON.stringify(href)} was accepted`);
    assert.match(e[0], /inside a page/);
  }
});

// The other half of that finding, and the reason the fix is an agreement check and not a test for a
// literal "https://": these spellings have fewer than two forward slashes and are still correct,
// because a browser reads "\" as "/" before resolving. Refusing them would be this gate rejecting
// content that works — the failure direction that costs a release day.
it("accepts an https spelling whose two readings agree, however it is punctuated", () => {
  const B = String.fromCharCode(92);
  for (const href of [`https:${B}${B}github.com/x`, `https:/${B}github.com/x`]) {
    assert.equal(new URL(href, "https://kinetixui.com/docs/changelog").href, new URL(href).href,
      `fixture is wrong: ${JSON.stringify(href)} is asymmetric and belongs in the test above`);
    assert.deepEqual(linkErrors(href, "where"), [], `${JSON.stringify(href)} reaches the right host and must be accepted`);
  }
  // And a host with no path, whose standalone href gains a trailing slash, is not a disagreement.
  assert.deepEqual(linkErrors("https://github.com", "where"), []);
});

// Compatibility, measured rather than asserted: every link the project has ever shipped must pass.
// This is what makes the narrowing safe to land, and it would fail loudly if the allowlist were cut
// further without checking.
it("accepts every link in the shipped notes and in the whole activated history", () => {
  const notes = new URL("../../../release/notes/", import.meta.url);
  const hrefs = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) (k === "href" ? hrefs.push(v) : walk(v));
  };
  for (const name of readdirSync(notes).filter((n) => n.endsWith(".json"))) walk(JSON.parse(readFileSync(new URL(name, notes), "utf8")));

  const history = readFileSync(new URL("../../../apps/web/src/lib/releases.ts", import.meta.url), "utf8");
  for (const m of history.matchAll(/\bhref: "([^"]*)"/g)) hrefs.push(m[1]);

  assert.ok(hrefs.length >= 30, `expected the shipped links to be found, saw ${hrefs.length}`);
  const refused = hrefs.filter((h) => linkErrors(h, "shipped").length > 0);
  assert.deepEqual(refused, [], `the narrowed policy refuses links already published:\n${refused.join("\n")}`);
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
  assert.deepEqual(errs((n) => (n.changes[0].href = "https://github.com/zedalleys/kinetixui")), []);
  assert.deepEqual(errs((n) => (n.changes[0].href = "/docs/motion")), []);
  assert.equal(errs((n) => (n.changes[0].href = "docs/motion")).length, 1);
  assert.equal(errs((n) => (n.changes[0].href = "javascript:alert(1)")).length, 1);
});

// --- component slugs are real -------------------------------------------------------------------
//
// check-releases.mjs rule 6 rejects a newComponents slug absent from components.manifest.json, and
// version-release-meta.mjs:27 runs that script right after generating releases.ts — so a misspelled
// slug fails Version PR *generation*, after the merge. Neither PR-side gate saw it: measured on a
// notes-only tree carrying slugs: ["date-pikcer"], both check:release-note and check:releases
// reported ok. Defensive rather than an observed save: no note on main uses newComponents today.

const withSlugs = (slugs, known) =>
  noteErrors({ ...good(), newComponents: [{ group: "Forms", slugs }] }, "0.27.0", "r", known);

it("rejects a newComponents slug the manifest does not declare", () => {
  const known = new Set(["date-picker", "input"]);
  assert.deepEqual(withSlugs(["date-picker"], known), []);
  assert.equal(withSlugs(["date-pikcer"], known).length, 1);
  assert.match(withSlugs(["date-pikcer"], known)[0], /components\.manifest\.json/);
  // the index names the offender, so a long list is actionable
  assert.match(withSlugs(["input", "date-pikcer"], known)[1 - 1] ?? "", /slugs\[1\]/);
});

it("fails rather than skips when the manifest cannot be read", () => {
  // A gate that cannot reach its input has to fail. Passing here would make the check vanish
  // silently on any tree where the manifest moved or was unparseable.
  const e = withSlugs(["date-picker"], null);
  assert.equal(e.length, 1);
  assert.match(e[0], /could not be read/);
  assert.equal(manifestSlugs(() => null), null);
  assert.equal(manifestSlugs(() => "{ not json"), null);
  assert.equal(manifestSlugs(() => '{"components": "not an object"}'), null);
});

it("reads the real manifest, so the fail-closed path is not silently active", () => {
  // If this ever returns null in CI, every slug error above becomes a "could not be read" error and
  // the real check is gone. Asserting it here is what makes the rest of these cases meaningful.
  const known = manifestSlugs();
  assert.ok(known instanceof Set, "components.manifest.json was not readable from the repo root");
  assert.ok(known.size > 50, `manifest declared only ${known.size} slugs, which is not a real read`);
  assert.ok(known.has("date-picker"));
});

// --- `version` first, because downstream discovery depends on it ---------------------------------
//
// version-release-meta.mjs serializes the note with JSON.stringify, preserving its key order, and
// check-releases.mjs discovers entries by splitting releases.ts on the literal `\n  {\n    version: "`.
// Measured end to end on the real scripts, the only difference being the note's key order:
//   version first  → check:releases ok — 44 entries, latest 0.27.0
//   summary first  → ✗ top RELEASES entry is 0.26.1, but the packages are at 0.27.0
// So an accepted note can be invisible to the very step that activates it.

it("requires `version` to be the note's first key", () => {
  const reordered = { summary: "s", version: "0.27.0", breaking: [], changes: [{ title: "t" }] };
  const e = noteErrors(reordered, "0.27.0", "r");
  assert.equal(e.length, 1);
  assert.match(e[0], /must be the first key/);
  // and the version assertion itself still passes, so this is the ONLY thing wrong with it
  assert.ok(!e[0].includes("describes version"));
});

it("accepts the key order every note on main already uses", () => {
  assert.deepEqual(errs(() => {}), []);
  assert.deepEqual(
    noteErrors({ version: "0.27.0", summary: "s", breaking: [], changes: [{ title: "t" }], migration: "m" }, "0.27.0", "r"),
    [],
  );
});

// --- the shipped notes themselves ----------------------------------------------------------------
//
// The sweep above runs over a fabricated tree, which proves the mechanism and nothing about the data.
// This runs the gate over the repository's REAL notes. It is the control for the failure mode that
// costs a release day: a gate that rejects content already published. It also pins the shapes those
// notes actually use — an `area` that is an array, `newComponents`, `migration`, `githubReleaseUrl` —
// so a future tightening cannot quietly outlaw them.
it("accepts every curated note the repository ships", () => {
  const dir = new URL("../../../release/notes/", import.meta.url);
  const names = readdirSync(dir).filter((n) => n.endsWith(".json")).sort();
  assert.ok(names.length >= 5, `expected the shipped notes to be found, saw ${names.length}`);
  const failures = [];
  for (const name of names) {
    const note = JSON.parse(readFileSync(new URL(name, dir), "utf8"));
    const e = noteErrors(note, name.replace(/\.json$/, ""), `release/notes/${name}`);
    if (e.length) failures.push(...e);
  }
  assert.deepEqual(failures, [], `the gate rejects notes that are already on main:\n${failures.join("\n")}`);
});
