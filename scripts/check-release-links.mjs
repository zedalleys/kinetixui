/**
 * check-release-links.mjs — a release note may not link to a page that does not exist.
 *
 *   pnpm --filter @kinetixui/web build && pnpm check:release-links
 *
 * 0.25.0's notes shipped `"href": "/docs/motion"`. There is no such route — the motion foundations are a
 * section of /docs/foundations — so the changelog entry would have sent every reader who clicked it to
 * the 404 page, and the Markdown release notes and the generated marketing post would have carried the
 * same dead URL. Nothing caught it: `next build` does not resolve the hrefs it renders, `check:releases`
 * never looked at a link, and `check:seo` reads links out of the built pages, where a curated note does
 * not appear until the Version PR activates it (and strips `#fragment` before resolving, so no anchor
 * has ever been checked anywhere).
 *
 * This checks both halves, against the built site rather than against a list of routes kept by hand:
 *
 *   - the path exists — a prerendered page, a file under public/, a route Next built, or a redirect source
 *   - the fragment exists — an element with that id in the target page's HTML
 *
 * Why the build: every route here is prerendered, so `.next/server/app` holds the site as a reader
 * receives it. Dynamic routes are already materialised (`/use-cases/commerce` exists, `/use-cases/finance`
 * is deliberately unpublished and does not), and every id is in the HTML whether rehype-slug made it from
 * a Markdown heading or a component computed it — so nothing here re-derives routes from a registry or
 * reimplements slugging. The inventory is the one `check:seo` uses (scripts/site-inventory.mjs).
 *
 * Both the curated notes and the activated history are read, which is the point: the curated file is
 * authored and reviewed long before anything renders it, and that is where the defect was.
 *
 * Exits 1 with no build. A gate that skips itself because it could not look is how this class of defect
 * survives; CI runs it in the job that has just built the site.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { auditLinks, carriesLinkKey, internalLinksIn, keyedDestinations, releaseContentSources } from "./release/links.mjs";
import { MissingBuildError, idsForHref, siteInventory, unresolvedPath } from "./site-inventory.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
/** `--dir` points at another build, as `check:seo` takes it — which is also how the no-build control is run. */
const nextDir = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : undefined;

let inventory;
try {
  inventory = await siteInventory(nextDir ? { nextDir } : undefined);
} catch (error) {
  if (!(error instanceof MissingBuildError)) throw error;
  console.error(`  ✗ ${error.message}`);
  console.error("\ncheck:release-links failed (no built site to resolve links against).");
  process.exit(1);
}

const sources = releaseContentSources(root).map((source) => ({ source, text: readFileSync(`${root}${source}`, "utf8") }));
const links = sources.flatMap(({ source, text }) => internalLinksIn(text, source));
const idCache = new Map();
const errors = auditLinks(links, {
  pathUnresolved: (href) => unresolvedPath(inventory, href),
  idsFor: (href) => idsForHref(inventory, href, idCache),
});

// A floor, because the failure mode of a text-scanning gate is quiet: if the release content stops
// matching the rules — a quote-style flip in the generated `releases.ts`, a renamed field — the audit has
// nothing to audit and every link passes. The one test that would notice needs a built site, which
// `test:release` does not have in CI, so the assertion belongs here, where the build is guaranteed.
//
// It is per source, not a total. `releases.ts` carries most of the links, so a total above zero is
// satisfied by that one file while every curated note matches nothing — and the curated note is where the
// dead link was.
//
// What it can see is a file that still carries an `href` field out of which no destination could be
// read: a value that is no longer a string, a spelling the reader stopped matching. What it cannot see is
// the field being renamed or removed, because at that point nothing in the text distinguishes it from a
// release that simply links nowhere — and failing that would block a legitimate release. `LINK_KEYS` is
// pinned by a test instead (scripts/release/test/release-links.test.mjs), so renaming the field is a
// deliberate change that fails there rather than going quiet here.
//
// It counts destinations read, not links audited. A note whose only `href` is an external URL, a bare
// `#anchor` or a repo file carries a working link field and nothing for this gate to resolve; failing it
// would be the gate blocking correct release content, which is the mistake this file has already made
// once.
const barren = sources.filter(({ source, text }) => carriesLinkKey(text, source) && !keyedDestinations(text, source).length);
if (barren.length) {
  for (const { source } of barren) {
    console.error(`  ✗ ${source} carries an \`href\` field but no destination could be read out of it — the rules have stopped matching this file`);
  }
  console.error(`\ncheck:release-links failed (${barren.length} release-content file(s) the rules no longer match).`);
  process.exit(1);
}
if (!links.length) {
  console.error(`  ✗ no internal links found in ${sources.length} release-content file(s): ${sources.map((s) => s.source).join(", ")}`);
  console.error("\ncheck:release-links failed (the release content carries no internal links at all, which means the rules stopped matching it).");
  process.exit(1);
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:release-links failed (${errors.length}).`);
  process.exit(1);
}
const fragments = links.filter((l) => l.href.includes("#")).length;
console.log(
  `check:release-links ok — ${links.length} internal link(s) in ${sources.length} release-content file(s), ` +
    `${fragments} with a fragment, resolved against ${inventory.pages.size} built pages.`,
);
