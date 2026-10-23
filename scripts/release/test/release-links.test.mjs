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
import { existsSync, readFileSync } from "node:fs";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { LINK_KEYS, auditLinks, internalLinksIn, releaseContentSources } from "../links.mjs";
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
  assert.ok(existsSync(`${root}scripts/check-release-links.mjs`));
});
