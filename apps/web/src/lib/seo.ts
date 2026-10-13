/**
 * Search/indexing helpers. One list of public routes, derived from the navigation that already exists
 * (`mainNav`, `docsNav`, `componentDocs` in site.ts), so a new component or docs page reaches the sitemap by
 * being added to the nav — there is no second list to remember.
 */
import type { Metadata } from "next";
import { PLATFORMS, PLATFORM_DEFINITIONS, platformsFor, type Platform } from "./platform-parity";
import { COMPONENT_EDITORIAL } from "./component-editorial";
import { list } from "./platform-prose";
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

/* ------------------------------------------------------------------------------------------ page metadata */

/**
 * The one way a page declares its search and sharing metadata.
 *
 * Why a helper and not per-page objects: Next.js merges `metadata` SHALLOWLY by top-level key, so a page that
 * set `openGraph: { title }` silently dropped the root layout's `siteName`, `type` and — through the
 * file-based `opengraph-image` — its image (that is how `/iot` lost its share card). And the root layout's
 * `openGraph.url` was inherited by every page that set nothing, so 120-odd pages told LinkedIn, Slack and X
 * that they *were* the homepage. A page now passes its path once and gets a canonical, an `og:url` and a
 * share card that all agree, from one origin (`siteConfig.url`).
 *
 * `title` is the page's own part; the root layout's template appends " — KinetixUI". `absoluteTitle` opts
 * out of the template (the homepage, whose title leads with the brand).
 */
export type PageSeo = {
  path: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  /** A different, usually shorter, title/description for share cards. Defaults to the search ones. */
  social?: { title?: string; description?: string };
  /** `website` for the homepage and hubs, `article` for documentation pages. */
  type?: "website" | "article";
};

/** The share card every page uses: the build-time image at /opengraph-image (1200×630, see app/opengraph-image.tsx). */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.tagline}` };

export function pageMetadata({ path, title, description, absoluteTitle, social, type = "article" }: PageSeo): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} — ${siteConfig.name}`;
  const url = absoluteUrl(path);
  const shareTitle = social?.title ?? fullTitle;
  const shareDescription = social?.description ?? description;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: siteConfig.name,
      locale: "en",
      url,
      title: shareTitle,
      description: shareDescription,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription, images: [OG_IMAGE.url] },
  };
}

/* ------------------------------------------------------------------------------------- component pages */

/** "React, Angular, SwiftUI, Compose & Flutter" — short labels, so a title stays readable in a results page. */
const SHORT_LABEL: Record<Platform, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p, PLATFORM_DEFINITIONS[p].label.replace(/^Jetpack /, "")]),
) as Record<Platform, string>;

const ampersandList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;

/** The component's display name, from the same nav list the sidebar and gallery use. */
export function componentName(slug: string): string {
  const item = componentDocs.find((c) => c.href === `/docs/components/${slug}`);
  if (!item) throw new Error(`componentMetadata: "${slug}" is not in componentDocs`);
  return item.title;
}

/**
 * "Button component for React, Angular, SwiftUI, Compose & Flutter".
 *
 * The platform list is READ from the manifest (`platformsFor`), never typed, so a component that is not on
 * Angular yet does not claim it in a search result — the title is a coverage claim like any other.
 */
export function componentTitle(slug: string): string {
  return `${componentName(slug)} component for ${ampersandList(platformsFor(slug).map((p) => SHORT_LABEL[p]))}`;
}

/**
 * The search snippet for a component page: what it is (the page's own one-line summary), then which platforms
 * implement it and which of those install from a registry — both derived. Every component therefore gets a
 * distinct description that a reader can act on, without anyone writing 98 paragraphs.
 */
export function componentDescription(slug: string, summary: string): string {
  const platforms = platformsFor(slug);
  const installable = platforms.filter((p) => PLATFORM_DEFINITIONS[p].distribution.published);
  const source = platforms.filter((p) => !PLATFORM_DEFINITIONS[p].distribution.published);
  const named = (ps: Platform[]) =>
    list(ps.map((p) => (PLATFORM_DEFINITIONS[p].maturity === "stable" ? PLATFORM_DEFINITIONS[p].label : `${PLATFORM_DEFINITIONS[p].label} (${PLATFORM_DEFINITIONS[p].maturity})`)));
  const parts = [
    installable.length ? `${named(installable)} from npm` : "",
    source.length ? `${list(source.map((p) => PLATFORM_DEFINITIONS[p].label))} as source you build` : "",
  ].filter(Boolean);
  // a snippet is plain text: MDX inline code (`<audio>`) would show its backticks and brackets in results and cards
  const lead = summary
    .replace(/`([^`]*)`/g, "$1")
    .replace(/<\/?([a-z][\w-]*)\s*\/?>/gi, "$1")
    .trim()
    .replace(/\s+/g, " ");
  const end = /[.!?]$/.test(lead) ? "" : ".";
  // a lead that opens with the component's own name ("Popover opens a small panel…") reads on from the brand
  // instead of repeating the name after a colon, which spent the start of the visible snippet on a stutter
  const name = componentName(slug);
  const opening = lead.toLowerCase().startsWith(`${name.toLowerCase()} `) ? `KinetixUI ${lead}` : `KinetixUI ${name}: ${lead}`;
  return `${opening}${end} Implemented for ${parts.join("; ")}.`;
}

/**
 * A component page's metadata. Pages with editorial copy (`COMPONENT_EDITORIAL`) omit `summary` and get their
 * entry's summary, which is also the lead paragraph `<ComponentIntro>` renders, so snippet and page agree. Passing
 * a summary for a page that has an entry is refused: the two would drift.
 */
export function componentMetadata(slug: string, summary?: string): Metadata {
  const editorial = COMPONENT_EDITORIAL[slug]?.summary;
  if (editorial && summary) throw new Error(`componentMetadata("${slug}"): has editorial copy; drop the summary argument`);
  const lead = editorial ?? summary;
  if (!lead) throw new Error(`componentMetadata("${slug}"): no summary and no COMPONENT_EDITORIAL entry`);
  return pageMetadata({
    path: `/docs/components/${slug}`,
    title: componentTitle(slug),
    description: componentDescription(slug, lead),
  });
}

/* --------------------------------------------------------------------------------------- structured data */

/** A crumb a reader sees. `href` is absent on the current page, which the visible trail does not link. */
export type Crumb = { name: string; href?: string };

/**
 * schema.org BreadcrumbList for a trail a reader can SEE. It is built from the same crumbs the visible
 * breadcrumb renders (see `docsBreadcrumbTrail`), and only from the linked ones plus the current page, so the
 * markup can never describe a hierarchy the page does not show.
 */
export function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      // Google accepts the last item without a URL; the visible trail does not link the page you are on either.
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
}
