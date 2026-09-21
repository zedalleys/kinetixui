import type { MetadataRoute } from "next";
import { absoluteUrl, publicRoutes } from "@/lib/seo";

/**
 * https://kinetixui.com/sitemap.xml
 *
 * Derived from the navigation in `site.ts` (see `publicRoutes`), so adding a component or a docs page to the
 * nav puts it in the sitemap — there is no parallel list to keep in step.
 *
 * `lastModified`, `changeFrequency` and `priority` are deliberately omitted. The build has no trustworthy
 * per-page modification date (a fresh checkout gives every file the same mtime), and the other two are hints
 * Google has said it ignores. A URL list that is accurate beats fields that look precise and are not.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes().map((path) => ({ url: absoluteUrl(path) }));
}
