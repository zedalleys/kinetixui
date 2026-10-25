/**
 * The release-note link rules, and the controls that prove the gate can fail.
 *
 * The rules are pure (scripts/release/links.mjs), so a fake inventory stands in for the built site and
 * every case — including the three that must be rejected — runs here in milliseconds, with no build.
 * The last two tests go to the real repository: one resolves its release content against a real build
 * when there is one, and one holds `check:seo` and `check:release-links` to a single route inventory,
 * because two lists of routes maintained separately is the defect this gate exists to prevent.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { LINK_KEYS, auditLinks, carriesLinkKey, internalLinksIn, keyedDestinations, releaseContentSources } from "../links.mjs";
import { MissingBuildError, SITE_ORIGIN, fragmentOf, idsForHref, isInternalHref, pathOf, siteInventory, sitePath, unresolvedPath } from "../../site-inventory.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** A built site with two pages, one public file, one built asset and one redirect. */
const inventory = {
  pages: new Map([
    ["/docs/foundations", "foundations.html"],
    ["/create", "create.html"],
    ["/use-cases/commerce", "commerce.html"],
    ["/_not-found", "404.html"],
  ]),
  publicFiles: new Set(["/brand/logo.svg"]),
  builtAssets: new Set(["/sitemap.xml"]),
  redirects: new Map([["/colors", "/create"]]),
};
const ids = { "/docs/foundations": new Set(["motion", "the-8-unit-grid"]), "/create": new Set(["palette"]), "/use-cases/commerce": new Set() };
const check = (href) =>
  auditLinks(internalLinksIn(`{ "href": "${href}" }`, "note.json"), {
    pathUnresolved: (h) => unresolvedPath(inventory, h),
    idsFor: (h) => ids[pathOf(inventory.redirects.get(pathOf(h)) ?? h)] ?? null,
  });

it("reads a link out of an href field and out of a Markdown link, in JSON and in TypeScript", () => {
  const text = ['{ "href": "/docs/tokens" }', '  href: "/docs/cli#inspect",', "see [the grid](/docs/foundations#the-8-unit-grid)"].join("\n");
  assert.deepEqual(
    internalLinksIn(text, "src").map((l) => [l.href, l.line]),
    [
      ["/docs/tokens", 1],
      ["/docs/cli#inspect", 2],
      ["/docs/foundations#the-8-unit-grid", 3],
    ],
  );
});

it("leaves alone everything that names no route in this repository", () => {
  const text = [
    '{ "href": "https://example.com/docs/tokens" }',
    '{ "href": "mailto:hi@example.com" }',
    '{ "href": "//cdn.example.com/x" }',
    '{ "href": "#motion" }',
    '{ "title": "`/colors` — azure ramp listed first" }',
    '{ "body": "the breaking change is in /docs/tokens" }',
  ].join("\n");
  assert.deepEqual(internalLinksIn(text, "src"), []);
});

it("accepts a page, a public file, a built route and a redirect source", () => {
  for (const href of ["/docs/foundations", "/brand/logo.svg", "/sitemap.xml", "/colors"]) assert.deepEqual(check(href), [], href);
});

it("resolves an absolute URL on the production origin as the path it is", () => {
  // `scripts/release-notes.mjs` passes an already absolute href through unchanged and the changelog
  // page renders it verbatim, so https://kinetixui.com/docs/motion is as dead as /docs/motion.
  assert.equal(sitePath(`${SITE_ORIGIN}/docs/foundations#motion`), "/docs/foundations#motion");
  assert.equal(sitePath(`${SITE_ORIGIN}`), "/");
  assert.equal(sitePath("https://kinetixui.com.evil.example/docs/foundations"), null, "the origin is parsed, not prefix-matched");
  assert.equal(sitePath("https://example.com/docs/foundations"), null);
  assert.deepEqual(check(`${SITE_ORIGIN}/docs/foundations#motion`), []);
  const errors = check(`${SITE_ORIGIN}/docs/motion`);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no built page, public file or redirect for \/docs\/motion/);
  assert.match(errors[0], /https:\/\/kinetixui\.com\/docs\/motion/, "the error names the href as written");
});

it("accepts a fragment that names an element on the page", () => {
  assert.deepEqual(check("/docs/foundations#motion"), []);
});

it("follows a redirect before resolving the fragment, because the reader lands on the destination", () => {
  assert.deepEqual(check("/colors#palette"), []);
  assert.equal(check("/colors#motion").length, 1);
});

/* ------------------------------------------------------------------------------- negative controls */

it("rejects a path with no page — the 0.25.0 defect", () => {
  const errors = check("/docs/motion");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\/docs\/motion → no built page, public file or redirect/);
});

it("rejects a fragment the page does not carry", () => {
  const errors = check("/docs/foundations#no-such-anchor");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /has no element with id "no-such-anchor"/);
});

it("rejects a dynamic route that was not prerendered, rather than wildcarding the segment", () => {
  assert.deepEqual(check("/use-cases/commerce"), []);
  assert.equal(check("/use-cases/finance").length, 1);
});

it("rejects a fragment on a page whose HTML cannot be read, rather than passing it", () => {
  const errors = auditLinks([{ source: "note.json", line: 1, href: "/docs/foundations#motion" }], {
    pathUnresolved: () => null,
    idsFor: () => null,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no page HTML could be read/);
});

it("never accepts Next's own 404 route", () => {
  assert.equal(check("/_not-found").length, 1);
});

it("reads a Markdown destination that carries a title, or is wrapped in angle brackets", () => {
  // CommonMark renders all three identically, so a dead link in any of them reaches the reader.
  const text = [
    "see [the grid](/docs/foundations#the-8-unit-grid)",
    'see [tokens](/docs/motion "Motion")',
    "see [tokens](</docs/motion>)",
    "see [tokens]( /docs/motion )",
  ].join("\n");
  assert.deepEqual(
    internalLinksIn(text, "src").map((l) => l.href),
    ["/docs/foundations#the-8-unit-grid", "/docs/motion"],
  );
  const errors = auditLinks(internalLinksIn('[tokens](/docs/motion "Motion")', "note.json"), {
    pathUnresolved: (h) => unresolvedPath(inventory, h),
    idsFor: () => null,
  });
  assert.equal(errors.length, 1, "a titled Markdown link to a dead route must fail");
  assert.match(errors[0], /no built page, public file or redirect/);
});

it("reads an href written in either quote, because releases.ts is hand-edited and no quote style is pinned", () => {
  // Flipping that file to single quotes took the link count from 31 to 5 while the gate still reported
  // success: the rules stopped matching the file class where the original dead link was.
  assert.deepEqual(
    internalLinksIn(["{ \"href\": \"/docs/tokens\" }", "  href: '/docs/motion',"].join("\n"), "src").map((l) => l.href),
    ["/docs/tokens", "/docs/motion"],
  );
  assert.equal(check("/docs/motion").length, 1);
  const single = auditLinks(internalLinksIn("  href: '/docs/motion',", "releases.ts"), {
    pathUnresolved: (h) => unresolvedPath(inventory, h),
    idsFor: () => null,
  });
  assert.equal(single.length, 1, "a dead link in single quotes must fail exactly as in double");
});

it("resolves the characters a string literal stands for, not the literal", () => {
  // `"\/docs\/foundations"` is valid JSON for /docs/foundations; some serializers emit it, and the
  // backslashes reached `sitePath` before, failing a working link.
  // Built by splitting rather than with an inline regexp escape, which `regexp.test.mjs` forbids here.
  const json = JSON.stringify({ href: "/docs/foundations" }).split("/").join("\\/");
  assert.equal(JSON.parse(json).href, "/docs/foundations", "the fixture is valid JSON for the real path");
  assert.deepEqual(internalLinksIn(json, "note.json").map((l) => l.href), ["/docs/foundations"]);
  assert.deepEqual(
    auditLinks(internalLinksIn(json, "note.json"), { pathUnresolved: (h) => unresolvedPath(inventory, h), idsFor: () => null }),
    [],
  );
});

it("leaves prose and repo-file links alone, because a gate that fails a correct release is worse than the hole", () => {
  // Both of these were reproduced failing the gate on the real release content. `handlers[kind](event)`
  // is matched by MARKDOWN_LINK, and `packages/ui/CHANGELOG.md` resolves correctly in the GitHub Release
  // body — `release-notes.mjs` links the same file absolutely.
  const text = [
    '{ "body": "the handler is resolved as handlers[kind](event) at render time" }',
    '{ "body": "the full record is in [the package changelog](packages/ui/CHANGELOG.md)" }',
    '{ "body": "see [the release checklist](./RELEASING.md)" }',
  ].join("\n");
  assert.deepEqual(internalLinksIn(text, "note.json"), []);
});

it("reports a link-field value whatever it looks like, because that position is unambiguously a link", () => {
  // The prose exemption belongs only to Markdown candidates. `"href": "motion"` is rendered verbatim
  // into an anchor by `changelog-view.tsx`, so dropping it for looking slashless would hand the reader a
  // dead link — the defect this gate exists for, in the field it was found in.
  for (const href of ["motion", "packages/ui/CHANGELOG.md", "release-notes"]) {
    const errors = check(href);
    assert.equal(errors.length, 1, href);
    assert.match(errors[0], /not a path on this site/, href);
  }
  // The same spellings in prose are left alone, which is the whole point of the distinction.
  assert.deepEqual(internalLinksIn('{ "body": "see [c](packages/ui/CHANGELOG.md) and handlers[kind](event)" }', "note.json"), []);
});

it("decodes a numeric escape instead of dropping its backslash", () => {
  // `"/docs/\u0061ngular"` is valid JSON for /docs/angular, which is what `version-release-meta.mjs`
  // activates. Dropping the backslash would audit `/docs/u0061ngular` and fail a correct release.
  const unicode = '{ "href": "/docs/\\u0066oundations" }';
  assert.equal(JSON.parse(unicode).href, "/docs/foundations", "the fixture is valid JSON for the real path");
  assert.deepEqual(internalLinksIn(unicode, "note.json").map((l) => l.href), ["/docs/foundations"]);
  assert.deepEqual(internalLinksIn('{ "href": "/docs/\\x66oundations" }', "note.json").map((l) => l.href), ["/docs/foundations"]);
  assert.deepEqual(internalLinksIn('{ "href": "/docs/\\u{66}oundations" }', "note.json").map((l) => l.href), ["/docs/foundations"]);
  assert.deepEqual(internalLinksIn('{ "href": "/docs/m\\otion" }', "note.json").map((l) => l.href), ["/docs/motion"], "an unrecognised escape stands for the character");
});

it("reads a .json source by parsing it, so no spelling of the field can hide a link", () => {
  // `"\u0068ref"` is a valid JSON spelling of `href`. It defeats any text scan — `carriesLinkKey` sees
  // nothing either — while `JSON.parse` in `version-release-meta.mjs` restores the ordinary field and
  // activates the destination. A parser cannot be spelled around.
  const hidden = '{ "changes": [{ "\\u0068ref": "/docs/motion" }] }';
  assert.equal(Object.keys(JSON.parse(hidden).changes[0])[0], "href", "the fixture really is an href field");
  assert.equal(carriesLinkKey(hidden, "hidden.ts"), false, "a text scan cannot see it, which is why a .json source is parsed");
  assert.equal(carriesLinkKey(hidden, "release/notes/0.0.0.json"), true, "parsed, the field is there and the floor can hold the file to it");
  assert.deepEqual(internalLinksIn(hidden, "release/notes/0.0.0.json").map((l) => l.href), ["/docs/motion"]);
  assert.equal(internalLinksIn(hidden, "release/notes/0.0.0.json").length, 1);
  // Nested shapes are walked, and a non-string value yields no destination, which is what the floor sees.
  assert.deepEqual(
    keyedDestinations('{ "changes": [{ "href": "/docs/a" }, { "nested": { "href": "/docs/b" } }] }', "x.json").map((d) => d.href),
    ["/docs/a", "/docs/b"],
  );
  assert.deepEqual(keyedDestinations('{ "href": ["/docs/a"] }', "x.json"), [], "a value that is not a string is not a destination");
});

it("reads a field name only in a field position outside a string, so prose is not mistaken for one", () => {
  // Unanchored, the scan found a field name inside a sentence. This is release prose about this gate,
  // and it was reported as a dead link — the mistake this module had already made twice.
  const prose = '{ "changes": [{ "body": "a change entry now sets href: \'docs/motion\' only when it points at a built route" }] }';
  assert.deepEqual(internalLinksIn(prose, "release/notes/0.0.0.json"), []);
  assert.equal(carriesLinkKey(prose, "release/notes/0.0.0.json"), false, "the file carries no href field, and the floor must not say it does");
  assert.deepEqual(internalLinksIn('  body: "it now sets href: \'docs/motion\' at render",', "releases.ts"), [], "the same in TypeScript, where the value really is single-quoted");
  // Nor the tail of another name.
  for (const line of ['  xhref: "/docs/motion",', '  data-href: "/docs/motion",', '  lastHref: "/docs/motion",']) {
    assert.deepEqual(internalLinksIn(line, "releases.ts"), [], line);
    assert.equal(carriesLinkKey(line, "releases.ts"), false, line);
  }
  // Nor a field name inside a quoted object literal, which is how a component library documents a prop
  // in prose. Anchoring to `{`, `,` or `[` admits exactly those positions, so the anchor alone read
  // `items={[{ label: 'Docs', href: '/docs/intro' }]}` in a release body as a dead link.
  const proseLiteral = "Breadcrumb now accepts items={[{ label: 'Docs', href: '/docs/intro' }]}.";
  for (const [source, line] of [
    ["releases.ts", `        body: ${JSON.stringify(proseLiteral)},`],
    ["release/notes/0.0.0.json", JSON.stringify({ changes: [{ body: proseLiteral }] })],
  ]) {
    assert.deepEqual(internalLinksIn(line, source), [], source);
    assert.equal(carriesLinkKey(line, source), false, source);
  }
  // The two files have to answer alike: `version-release-meta.mjs` copies a note's body verbatim into
  // `releases.ts`, so prose that passes on the authoring PR and fails on the Version PR is a release day
  // lost to a sentence.
  const body = "A nav entry is { title: 'Docs', href: '/docs/intro' } now.";
  assert.deepEqual(
    internalLinksIn(`        body: ${JSON.stringify(body)},`, "apps/web/src/lib/releases.ts"),
    internalLinksIn(JSON.stringify({ changes: [{ body }] }), "release/notes/0.0.0.json"),
    "the generated TypeScript and the curated note must read the same prose the same way",
  );
  // And the shapes a formatter does produce are all still read.
  for (const line of ['  href: "/docs/tokens",', '{ "href": "/docs/tokens" }', '[{ "href": "/docs/tokens" }]', '{ "a": 1, "href": "/docs/tokens" }']) {
    assert.deepEqual(internalLinksIn(line, "src").map((l) => l.href), ["/docs/tokens"], line);
  }
  // What the masking guarantees, as narrowly as it actually holds. A span begins at least one character
  // into a line, so a field at the start of its line cannot be masked — and `version-release-meta.mjs`
  // serialises with `JSON.stringify(entry, null, 2)`, so every href it writes is at the start of one.
  const generated = ['        "href": "/docs/tokens"', '  href: "/docs/tokens",'];
  for (const line of generated) assert.deepEqual(internalLinksIn(line, "releases.ts").map((l) => l.href), ["/docs/tokens"], line);
  // Comment text is blanked, so an apostrophe in a comment cannot pair with a later quote and swallow
  // the field after it — the shape that did: `title: "the reader's size" /* isn't */, href: "…", /* ' */`.
  const commented = [
    `        title: "the reader's size" /* isn't pinned */, href: "/docs/tokens", /* ' */`,
    '        title: "x", /* note */ href: "/docs/tokens",',
    `        // the reader's size\n        href: "/docs/tokens",`,
  ];
  for (const line of commented) assert.deepEqual(internalLinksIn(line, "releases.ts").map((l) => l.href), ["/docs/tokens"], line);
  // And the case the guarantee deliberately does not cover, asserted so it is a known limitation rather
  // than a surprise: an unbalanced quote outside both a string and a comment still masks what follows.
  assert.deepEqual(internalLinksIn('        reX: /["]/.source, href: "/docs/tokens",', "releases.ts"), [], "a lone quote in a regexp literal masks the field after it");
});

it("names what is wrong with a destination, because the author reads the message and not the rules", () => {
  // Four different mistakes, four corrections. `""` and `"TODO"` are the routine authoring slips — an
  // entry stubbed and its link never filled — and both reach the reader through `changelog-view.tsx`.
  const reasonFor = (href) => check(href)[0] ?? "";
  assert.match(reasonFor(""), /it is empty, so it points at whatever page the reader is already on/);
  assert.match(reasonFor("TODO"), /it is resolved against the page the reader is on/);
  assert.match(reasonFor(" /docs/foundations "), /it is \/docs\/foundations with whitespace around it/);
  assert.match(reasonFor("../../docs/foundations"), /it walks up from the page the reader is on/);
  assert.doesNotMatch(reasonFor("../../docs/foundations"), /which exists/, "a `..` walk's destination depends on the reader's page, so naming one would be a guess");
  assert.match(reasonFor("docs/foundations"), /you may have meant \/docs\/foundations/);
  // A padded href that is also dead says both halves, so trimming it is not a second round of feedback —
  // and it asks the site the same way a link does, so the fragment is included and a padded href whose
  // trimmed form is fine says only that it is padded. Telling an author that `/docs/foundations` is no
  // page on this site, in the sentence that tells them to write a full URL to it, was the bug here.
  assert.match(reasonFor(" /docs/motion "), /with whitespace around it, and no built page, public file or redirect for \/docs\/motion/);
  assert.match(reasonFor(" /docs/foundations#nope "), /with whitespace around it, and \/docs\/foundations has no element with id "nope"/);
  assert.doesNotMatch(reasonFor(" https:\/\/kinetixui.com\/docs\/foundations "), /is no page|no built page/, "the trimmed form resolves, so only the padding is wrong");
  assert.doesNotMatch(reasonFor(" /docs/foundations "), /is no page|no built page/);
  // And the correction offered for a repo-relative path names the repository, not only the site: told to
  // write `packages/tokens` as "an absolute URL on the site", an author produces another 404.
  assert.match(reasonFor("packages/tokens"), /github\.com\/zedalleys\/kinetixui\/blob\/main/);
  // The href is quoted in the message, so padding and emptiness are visible rather than invisible.
  assert.match(reasonFor(" /docs/foundations "), /" \/docs\/foundations "/);
  for (const href of ["", "TODO", "changelog", "docs/foundations"]) assert.equal(check(href).length, 1, href);
});

it("resolves a link on this site's host however its scheme and port are written", () => {
  // Comparing origins made the scheme part of the question, so `http://` on our own host read as a
  // deliberately external link and was dropped unaudited. It is the same dead route either way.
  for (const href of ["http://kinetixui.com/docs/motion", "HTTPS://kinetixui.com/docs/motion", "https://kinetixui.com:443/docs/motion"]) {
    assert.equal(check(href).length, 1, href);
  }
  assert.equal(sitePath("https://kinetixui.com.evil.example/docs"), null, "a different host is a different site");
  assert.equal(sitePath("http://kinetixui.com:8080/docs"), null, "and so is a different port");
});

it("counts destinations read, not links audited, so an off-site-only note is not failed", () => {
  // The floor asks whether the rules still match the file, not whether it has internal links. A note
  // whose only link is external carries a working field and nothing here to resolve.
  const external = '{ "href": "https://github.com/zedalleys/kinetixui/issues/1" }';
  assert.deepEqual(internalLinksIn(external, "note.json"), [], "an external URL is not this gate's business");
  assert.equal(keyedDestinations(external, "note.json").length, 1, "but the field was read, so the floor must not fire");
  assert.equal(keyedDestinations('{ "href": "#motion" }', "note.json").length, 1, "nor for a bare fragment");
});

it("rejects a relative href rather than skipping it, because the browser resolves it against the reader's page", () => {
  // `./docs/motion` in a note rendered on /docs/changelog lands the reader on /docs/docs/motion.
  for (const href of ["./docs/motion", "docs/motion", "../docs/motion", " /docs/foundations "]) {
    const errors = check(href);
    assert.equal(errors.length, 1, href);
    assert.match(errors[0], /not a path on this site/, href);
  }
  assert.deepEqual(check("/docs/foundations"), [], "a site path is still resolved normally");
});

it("fires the coverage floor on a file whose fields no longer yield a destination, and only then", () => {
  // The floor the gate enforces is `carriesLinkKey(text, source) && !keyedDestinations(...).length`.
  // It was pinned only by matching that expression in the gate's source, which says nothing about
  // whether it fires, so here is the behaviour on both sides of it.
  const fires = (text, source) => carriesLinkKey(text, source) && !keyedDestinations(text, source).length;
  assert.equal(fires('{ "changes": [{ "href": ["/docs/tokens"] }] }', "note.json"), true, "a value that is no longer a string");
  assert.equal(fires('        hrefX: "/docs/tokens",', "releases.ts"), false, "a renamed field is indistinguishable from a note that links nowhere");
  assert.equal(fires('{ "changes": [{ "href": "/docs/tokens" }] }', "note.json"), false, "a file that still reads must not be failed");
  assert.equal(fires('{ "href": "https://example.com/x" }', "note.json"), false, "an external destination was still read");
  assert.equal(fires('{ "title": "no link here" }', "note.json"), false, "a release that links nowhere is legitimate");
  // What it cannot see, stated as a test rather than only as a comment: a partial loss leaves one
  // destination behind and passes. Both readers are structural now, which is what makes that unlikely.
  const partial = '{ "changes": [{ "href": ["/docs/a"] }, { "href": "/docs/b" }] }';
  assert.equal(fires(partial, "note.json"), false);
  assert.deepEqual(keyedDestinations(partial, "note.json").map((d) => d.href), ["/docs/b"], "and it audits only what it read");
  // The gate is where the floor runs, because only it is guaranteed a build.
  const gate = readFileSync(`${root}scripts/check-release-links.mjs`, "utf8");
  assert.match(gate, /carriesLinkKey\(text, source\) && !keyedDestinations\(text, source\)\.length/, "the floor is no longer wired into the gate");
  assert.match(gate, /if \(!links\.length\)/, "the gate no longer fails when the rules match nothing at all");
});

/* ------------------------------------------------------------------------------------- the real repo */

it("resolves every internal link in this repository's release content", async (t) => {
  let site;
  try {
    site = await siteInventory();
  } catch (error) {
    if (!(error instanceof MissingBuildError)) throw error;
    // No site build in this job (`test:release` does not build one). `check:release-links` is the gate;
    // it runs in CI right after the build and fails there rather than skipping.
    return t.skip(error.message);
  }
  const sources = releaseContentSources(root);
  const links = sources.flatMap((s) => internalLinksIn(readFileSync(`${root}${s}`, "utf8"), s));
  // The same floor the gate enforces in `check-release-links.mjs`, where a build is guaranteed; this
  // half of it only runs when a build happens to be present, which in CI it is not.
  assert.ok(links.length > 0, "release content carries no internal links at all, which is itself suspicious");
  const cache = new Map();
  assert.deepEqual(
    auditLinks(links, { pathUnresolved: (h) => unresolvedPath(site, h), idsFor: (h) => idsForHref(site, h, cache) }),
    [],
  );
});

it("uses the origin the site itself declares", () => {
  const site = readFileSync(`${root}apps/web/src/lib/site.ts`, "utf8");
  assert.match(site, new RegExp(`url:\\s*"${SITE_ORIGIN}"`), "SITE_ORIGIN has drifted from siteConfig.url");
});

it("keeps one route inventory: check:seo resolves links through the same module", () => {
  const seo = readFileSync(`${root}scripts/check-seo.mjs`, "utf8");
  assert.match(seo, /from "\.\/site-inventory\.mjs"/);
  assert.match(seo, /unresolvedPath\(inventory, href\)/);
  assert.doesNotMatch(seo, /const redirectSources/, "check:seo is resolving redirects from its own list again");
});

it("states which fields carry a route, so a new one is a deliberate change", () => {
  assert.deepEqual(LINK_KEYS, ["href"]);
  assert.equal(pathOf("/docs/tokens#motion"), "/docs/tokens");
  assert.equal(fragmentOf("/docs/tokens#motion"), "motion");
  assert.equal(fragmentOf("/docs/tokens#"), null);
  assert.equal(fragmentOf("/docs/tokens"), null);
  assert.equal(isInternalHref("//evil.example/x"), false);
  assert.equal(sitePath("//evil.example/x"), null);
  assert.equal(sitePath("mailto:hi@example.com"), null);
  assert.equal(carriesLinkKey('{ "href": "/docs/tokens" }'), true);
  assert.equal(carriesLinkKey("  href: '/docs/tokens',"), true, "a quote-style flip must still be seen as a link-bearing file");
  assert.equal(carriesLinkKey('{ "title": "no link here" }'), false, "a release that links nowhere must not be failed for it");
});
