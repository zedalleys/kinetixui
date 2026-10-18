import type { Crumb } from "./seo";
import { docsNav } from "./site";

/**
 * The docs breadcrumb as data: what `DocsBreadcrumb` renders and what its BreadcrumbList JSON-LD describes.
 * One function feeds both, so the structured data cannot drift from the trail a reader sees.
 *
 * `group` is the sidebar group ("Overlays", "Getting Started"). It is shown as context but is not a page —
 * there is no /docs/overlays — so it is not a crumb: it has no URL to give a search engine, and the visible
 * trail does not link it either.
 */
export type DocsTrail = { crumbs: Crumb[]; group?: string };

export function docsBreadcrumbTrail(pathname: string): DocsTrail {
  if (pathname === "/docs") return { crumbs: [{ name: "Docs" }] };

  let group: string | undefined;
  let title: string | undefined;
  for (const g of docsNav) {
    const item = g.items.find((i) => i.href === pathname);
    if (item) {
      group = g.title;
      title = item.title;
      break;
    }
  }

  const crumbs: Crumb[] = [{ name: "Docs", href: "/docs" }];
  if (pathname.startsWith("/docs/components/")) crumbs.push({ name: "Components", href: "/components" });
  if (title) crumbs.push({ name: title });
  return { crumbs, group };
}
