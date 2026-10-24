/**
 * The internal links a release makes, and whether they lead anywhere.
 *
 * A release note is the one piece of release content written by hand and read by everyone: it is on
 * /docs/changelog, in the GitHub Release body, and in the marketing posts generated from it. Its links
 * are plain strings — `"href": "/docs/motion"` in `release/notes/<version>.json`, carried verbatim into
 * the generated `apps/web/src/lib/releases.ts` and concatenated onto the site origin by
 * `scripts/release-notes.mjs`. Nothing in that path can tell a route that exists from one that does not:
 *
 *   - `next build` does not resolve the hrefs it renders, so a `<Link href="/docs/motion">` builds
 *   - `check:seo` does check internal links, but it reads them out of the BUILT pages, and a curated note
 *     is not on any page until `version-release-meta.mjs` activates it during the Version PR — and it
 *     strips the fragment before resolving, so no `#anchor` has ever been checked
 *   - `check:releases` validates versions, dates, `breaking` and component slugs, and no link at all
 *
 * So this module answers the two questions the pipeline never asked: does the path exist, and does the
 * fragment name something on it. It is pure — the caller supplies `pathUnresolved` and `idsFor`, which
 * `check-release-links.mjs` takes from the built site (see scripts/site-inventory.mjs) — so the rules
 * can be tested against fixtures, including the cases that must fail.
 */
import { existsSync, readdirSync } from "node:fs";
import { SITE_ORIGIN, fragmentOf, pathOf, sitePath } from "../site-inventory.mjs";

/**
 * Markdown inline links: `[text](/docs/tokens)`, and the absolute form of the same link.
 *
 * CommonMark lets the destination carry a title (`[text](/docs/tokens "Tokens")`) and lets it be wrapped
 * in angle brackets (`[text](</docs/tokens>)`). Both render as the same clickable link, so both have to
 * be read here; matching only the bare form would have let a dead link through in a spelling an author
 * can reach by hand. The title's quotes are matched with an optional backslash before them, because in
 * `release/notes/<version>.json` the prose is a JSON string and the quotes arrive escaped.
 */
const MARKDOWN_LINK = /\]\(\s*(<[^<>\n]*>|[^()\s]+)(?:\s+(?:\\?"[^"]*\\?"|'[^']*'|\([^()]*\)))?\s*\)/g;

/** The angle-bracket form of a destination names the same target as the bare one. */
const unwrapped = (destination) =>
  destination.startsWith("<") && destination.endsWith(">") ? destination.slice(1, -1) : destination;

/** A href in a link position that deliberately names no route on this site. */
const offSite = (href) =>
  href.startsWith("#") ||
  href.startsWith("//") ||
  /^[a-z][a-z0-9+.-]*:/i.test(href);

/**
 * Whether a href `sitePath` could not resolve is nevertheless meant to be a route here.
 *
 * This is the line between a dead link and something that is not a link to this site at all, and it
 * has to be drawn structurally rather than by asking whether the route exists — a relative href that
 * names a route which does not exist is the worst case, not an exempt one.
 *
 * Two shapes in a link position are not route references, and both are reachable in real release prose:
 *
 *   - no slash at all. `handlers[kind](event)` in a sentence about an indexed dispatch map is matched by
 *     `MARKDOWN_LINK`, and `event` is not a path.
 *   - a file extension on the last segment. `[the package changelog](packages/ui/CHANGELOG.md)` resolves
 *     correctly in the GitHub Release body and the generated posts, which is where this prose is
 *     rendered; `release-notes.mjs` links the same file absolutely. Demanding `/docs/...` there would be
 *     telling the author to make a working link wrong.
 *
 * Everything else — `./docs/motion`, `docs/motion`, `../docs/motion`, a padded `/docs/tokens` — is read
 * as a route and reported, whether or not that route exists, because the browser resolves it against the
 * page the reader is on. The cost of drawing the line here is that a repo-relative link to a file with
 * no extension is reported; an absolute URL is the answer in that case.
 */
const meansARoute = (href) => {
  const [withoutFragment] = href.trim().split("#");
  if (!withoutFragment.includes("/")) return false;
  const last = withoutFragment.split("/").pop() ?? "";
  return !/\.[a-z0-9]{1,8}$/i.test(last);
};

/**
 * The characters a JSON or TypeScript string literal stands for.
 *
 * `keyed` and `MARKDOWN_LINK` read the raw literal, so an escape arrives verbatim. `"\/docs\/angular"`
 * is valid JSON for `/docs/angular` — some serializers emit it — and resolving the backslashes would
 * fail a working link.
 */
const unescaped = (raw) =>
  raw.replace(/\\(.)/g, (_, c) => ({ n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" })[c] ?? c);

/** The fields that carry a route. `href` is the only one on `ReleaseChange`; see the `Release` type. */
export const LINK_KEYS = ["href"];

/**
 * Every internal link in a release-content source.
 *
 * `text` is read as text rather than parsed, so one set of rules covers the curated
 * `release/notes/<version>.json`, the generated `apps/web/src/lib/releases.ts` (where the same JSON is
 * TypeScript with unquoted keys) and the Markdown `release:notes` renders from them.
 *
 * Two shapes count as a link, and nothing else does:
 *
 *   - a value of one of `LINK_KEYS` that points at this site (`"href": "/docs/cli#inspect"`)
 *   - a Markdown inline link that points at this site
 *
 * Either may be written relative or as an absolute URL on the production origin; both reach the reader
 * the same way, so both are normalised to a path and resolved. Each link keeps the href as written, for
 * the error message, and the path it resolves to.
 *
 * A path merely mentioned in prose is not a link. Release notes talk about routes — a breaking-change
 * line reads "`/colors` — azure ramp listed first" — and a reader cannot click those, so resolving them
 * would fail a release over a sentence rather than over a link. External URLs, `mailto:`, `tel:`,
 * protocol-relative `//host/path` and bare `#anchor` references name no route here and are left alone.
 *
 * A href in a link position that is neither of those nor a site path — `./docs/motion`, `docs/motion`,
 * a value with padding — is reported as an error rather than skipped. The browser resolves it against
 * the page the reader is on, so `./docs/motion` on /docs/changelog is a 404 in a different spelling,
 * and silently dropping it is the hole this gate exists to close.
 */
export function internalLinksIn(text, source, { keys = LINK_KEYS } = {}) {
  const keyed = keyedPattern(keys);
  const found = new Map();
  const add = (raw, line) => {
    const href = unescaped(raw);
    if (found.has(href)) return;
    const path = sitePath(href);
    // A href that is neither a site path nor deliberately off-site — `./docs/motion`, `docs/motion`,
    // a padded value — is not "not a link": the reader clicks it and the browser resolves it against
    // whatever page they are on. `changelog-view.tsx` renders it verbatim and `release-notes.mjs`
    // passes it through, so it has to be reported, not dropped. `meansARoute` is where prose and
    // repo-file links are separated from that.
    if (path === null && (offSite(href) || !meansARoute(href))) return;
    found.set(href, { source, href, path, line });
  };
  for (const [i, line] of text.split("\n").entries()) {
    for (const m of line.matchAll(keyed)) add(m[1] ?? m[2], i + 1);
    for (const m of line.matchAll(MARKDOWN_LINK)) add(unwrapped(m[1]), i + 1);
  }
  return [...found.values()];
}

/**
 * The pattern for a link-carrying field, in either quote.
 *
 * `apps/web/src/lib/releases.ts` is a checked-in TypeScript file that invites hand-editing, and the repo
 * pins no quote style, so `href: '/docs/motion'` is a spelling an author or a formatter can produce. With
 * the delimiter hard-coded to `"`, flipping that file to single quotes took its link count from 31 to 5
 * and the gate still reported success — the exact silence the floor in `check-release-links.mjs` is meant
 * to catch, in the file class where the original dead link was.
 */
function keyedPattern(keys) {
  return new RegExp(
    String.raw`["']?(?:${keys.join("|")})["']?\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')`,
    "g",
  );
}

/** Whether a source carries a link-bearing field at all, however its value is spelled. @see keyedPattern */
export function carriesLinkKey(text, { keys = LINK_KEYS } = {}) {
  return new RegExp(String.raw`["']?(?:${keys.join("|")})["']?\s*:`).test(text);
}

/**
 * Check each link against the site.
 *
 * `pathUnresolved(href)` returns a reason or null; `idsFor(href)` returns the set of element ids on the
 * target page, or null when no page can be read for it. A fragment pointing at a page whose ids cannot
 * be read is an error, not a pass: that is the shape of the defect this gate exists for.
 */
export function auditLinks(links, { pathUnresolved, idsFor }) {
  const errors = [];
  const at = (l) => `${l.source}:${l.line}`;
  for (const link of links) {
    if (link.path === null) {
      // A route reference that is not a site path: written relative, or padded. Name the route it would
      // be read as when that route exists, since that is the correction the author wants.
      const asRoute = `/${link.href.trim().replace(/^(?:\.{0,2}\/)+/, "")}`;
      const names = pathUnresolved(asRoute) === null ? ` It names ${asRoute}, which exists.` : "";
      errors.push(
        `${at(link)}: ${link.href} → not a path on this site; the reader's browser resolves it against the page they are on.${names} Write it \`/docs/...\` or as an absolute URL on ${SITE_ORIGIN}`,
      );
      continue;
    }
    const target = link.path ?? link.href;
    const reason = pathUnresolved(target);
    if (reason) {
      errors.push(`${at(link)}: ${link.href} → ${reason}`);
      continue;
    }
    const fragment = fragmentOf(target);
    if (fragment === null) continue;
    const ids = idsFor(target);
    if (ids === null) {
      errors.push(`${at(link)}: ${link.href} → ${pathOf(target)} resolves, but no page HTML could be read to check #${fragment}`);
      continue;
    }
    if (!ids.has(fragment)) {
      errors.push(`${at(link)}: ${link.href} → ${pathOf(target)} has no element with id "${fragment}"`);
    }
  }
  return errors;
}

/**
 * Every file in the repository that carries release content a reader can click through: each curated
 * note, and the activated history the changelog page renders. Both, deliberately — the curated file is
 * written and reviewed long before anything renders it, and that is where the dead link was.
 */
export function releaseContentSources(repoRoot) {
  const notesDir = `${repoRoot}release/notes`;
  const notes = existsSync(notesDir)
    ? readdirSync(notesDir)
        .filter((n) => n.endsWith(".json"))
        .sort()
        .map((n) => `release/notes/${n}`)
    : [];
  return [...notes, "apps/web/src/lib/releases.ts"];
}
