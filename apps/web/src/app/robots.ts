import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * https://kinetixui.com/robots.txt
 *
 * Everything public is crawlable — this is a documentation site, and the docs are the point. `/r/*` (the
 * component registry JSON the CLI fetches) is machine-readable data, not pages, so it is excluded from
 * crawling to keep it out of search results; it stays reachable for the CLI and for other tools, which do
 * not read robots.txt.
 *
 * Preview deployments are deliberately NOT handled here: Vercel already serves `X-Robots-Tag: noindex` on
 * *.vercel.app preview URLs, which is a stronger signal than robots.txt (it prevents indexing, not just
 * crawling) and does not depend on an environment variable being set correctly at build time.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/r/" }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
