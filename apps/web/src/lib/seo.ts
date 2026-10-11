/**
 * Search/indexing helpers. One list of public routes, derived from the navigation that already exists
 * (`mainNav`, `docsNav`, `componentDocs` in site.ts), so a new component or docs page reaches the sitemap by
 * being added to the nav — there is no second list to remember.
 */
import { allDocsLinks, componentDocs, mainNav, siteConfig } from "./site";

/**
 * Public routes that are not in any nav: real pages a visitor can reach and a crawler should see, but that
 * are linked from page content rather than the header or sidebar. Keep this list short and justified.
 */
const UNLISTED_PUBLIC_ROUTES: readonly string[] = [
  // /create is in mainNav and /docs/colors is in docsNav, so both reach the sitemap through the navigation they
  // are actually in — which is the point of deriving this list.
  //
  // The Building Operations demo is a full-page composition reached from the /iot page's environments section,
  // not a docs page or a top-level product area, so it has no nav entry to inherit from.
  "/demos/building-operations",
];

/** Every indexable route, absolute-path form (`/docs/tokens`), deduped, in a stable order. */
export function publicRoutes(): string[] {
  const routes = [
    "/",
    ...mainNav.map((i) => i.href),
    ...allDocsLinks.map((i) => i.href),
    ...componentDocs.map((i) => i.href),
    ...UNLISTED_PUBLIC_ROUTES,
  ];
  // `soon` nav items point at pages that do not exist yet — never advertise them to a crawler.
  const comingSoon = new Set([...mainNav, ...allDocsLinks].filter((i) => i.soon).map((i) => i.href));
  return [...new Set(routes)].filter((href) => href.startsWith("/") && !comingSoon.has(href)).sort();
}

/** `/docs/tokens` → `https://kinetixui.com/docs/tokens` (the canonical host; no trailing slash). */
export function absoluteUrl(path: string): string {
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

/**
 * Self-referencing canonical for a page whose UI writes query parameters (`?filter=`, `?q=`) into the URL.
 * Without it, every filter combination a crawler follows looks like a separate document. Pages with no query
 * state don't need one: with no competing signal a search engine treats the crawled URL as canonical, and the
 * host already resolves to one form (http→https, www→apex, trailing slash stripped — all 308 at the edge).
 */
export function canonical(path: string) {
  return { alternates: { canonical: path } };
}
