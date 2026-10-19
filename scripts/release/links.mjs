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
import { fragmentOf, isInternalHref, pathOf } from "../site-inventory.mjs";

/** Markdown inline links: `[text](/docs/tokens)`. */
const MARKDOWN_LINK = /\]\((\/[^)\s]*)\)/g;

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
 *   - a value of one of `LINK_KEYS` that is a site-relative path (`"href": "/docs/cli#inspect"`)
 *   - a Markdown inline link to a site-relative path
 *
 * A path merely mentioned in prose is not a link. Release notes talk about routes — a breaking-change
 * line reads "`/colors` — azure ramp listed first" — and a reader cannot click those, so resolving them
 * would fail a release over a sentence rather than over a link. External URLs, `mailto:`,
 * protocol-relative `//host/path` and bare `#anchor` references name no route here and are left alone.
 */
export function internalLinksIn(text, source, { keys = LINK_KEYS } = {}) {
  const keyed = new RegExp(String.raw`"?(?:${keys.join("|")})"?\s*:\s*"((?:\\.|[^"\\])*)"`, "g");
  const found = new Map();
  const add = (href, line) => {
    if (!isInternalHref(href) || found.has(href)) return;
    found.set(href, { source, href, line });
  };
  for (const [i, line] of text.split("\n").entries()) {
    for (const m of line.matchAll(keyed)) add(m[1], i + 1);
    for (const m of line.matchAll(MARKDOWN_LINK)) add(m[1], i + 1);
  }
  return [...found.values()];
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
    const reason = pathUnresolved(link.href);
    if (reason) {
      errors.push(`${at(link)}: ${link.href} → ${reason}`);
      continue;
    }
    const fragment = fragmentOf(link.href);
    if (fragment === null) continue;
    const ids = idsFor(link.href);
    if (ids === null) {
      errors.push(`${at(link)}: ${link.href} → ${pathOf(link.href)} resolves, but no page HTML could be read to check #${fragment}`);
      continue;
    }
    if (!ids.has(fragment)) {
      errors.push(`${at(link)}: ${link.href} → ${pathOf(link.href)} has no element with id "${fragment}"`);
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
