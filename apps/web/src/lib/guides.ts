/**
 * Long-form guides on kinetixui.com: the first organic content cluster (SEO Phase 2B).
 *
 * One registry, so the things that must agree are typed once: each guide's title and description (its search
 * snippet), the one search intent it owns (marketing/seo/SEARCH-INTENT-MAP.md), its place in the cluster, its call
 * to action and its publication state. `pnpm check:editorial` reads this file and the built pages together.
 *
 * Publication is a field, not a deployment. A `draft` guide is built and reachable by URL so it can be reviewed on a
 * preview deployment, but it is `noindex`, out of the sitemap, carries no article structured data, and no indexable
 * page links to it (the gate fails if one does). Publishing is: set `status: "published"` and `datePublished` to the
 * real date it goes live. The date is never inferred from the build or from git: a fabricated date is worse than none.
 */
import type { Metadata } from "next";
import { absoluteUrl, pageMetadata } from "./seo";
import { siteConfig } from "./site";
import { GUIDES, PILLAR, type Guide } from "./guides-data";

export { GUIDES, PILLAR };
export type { Guide, GuideStatus } from "./guides-data";

export const guideHref = (slug: string) => `/guides/${slug}`;

export function guide(slug: string): Guide {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) throw new Error(`guide("${slug}"): not in GUIDES`);
  return g;
}

export const isPublished = (g: Guide) => g.status === "published";

/** Published guides only: what the sitemap lists and what other pages may link to. */
export const publishedGuides = () => GUIDES.filter(isPublished);

export function guideMetadata(slug: string): Metadata {
  const g = guide(slug);
  const base = pageMetadata({ path: guideHref(slug), title: g.searchTitle ?? g.title, description: g.description });
  if (isPublished(g)) return base;
  // a draft can be read on a preview, never indexed or followed into from search
  return { ...base, robots: { index: false, follow: false } };
}

/**
 * schema.org TechArticle for a PUBLISHED guide, from the registry. A draft gets none: an article that has not been
 * published has no `datePublished`, and structured data that omits it on purpose would still describe a page that
 * is not meant to be found. The author is the project, the same organisation the site describes, because the guides
 * are written and reviewed as project documentation, not as one person's byline.
 */
export function guideJsonLd(slug: string) {
  const g = guide(slug);
  if (!isPublished(g)) return null;
  if (!g.datePublished) throw new Error(`guide "${slug}" is published without a datePublished`);
  const url = absoluteUrl(guideHref(slug));
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: g.title,
    description: g.description,
    url,
    mainEntityOfPage: url,
    inLanguage: "en",
    datePublished: g.datePublished,
    ...(g.dateModified ? { dateModified: g.dateModified } : {}),
    author: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
}
