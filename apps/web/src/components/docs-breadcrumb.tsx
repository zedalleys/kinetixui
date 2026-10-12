"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsBreadcrumbTrail } from "@/lib/docs-trail";
import { breadcrumbJsonLd } from "@/lib/seo";

/**
 * Docs / <Group> / <Page> — mono, spec-sheet style.
 *
 * Also emits the page's BreadcrumbList JSON-LD, from the same trail. This is a client component, but it is
 * prerendered like every page on this static site, so the <script> is in the HTML a crawler receives — no
 * hydration needed. Rendering it here rather than per page is what keeps the two from disagreeing.
 */
export function DocsBreadcrumb() {
  const pathname = usePathname();
  const { crumbs, group } = docsBreadcrumbTrail(pathname);

  if (crumbs.length === 1) {
    return (
      <nav
        aria-label="Docs breadcrumb"
        className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground"
      >
        <span data-crumb>Docs</span>
      </nav>
    );
  }

  const [docs, ...rest] = crumbs;
  const current = rest.at(-1)?.href ? undefined : rest.at(-1);
  const middle = current ? rest.slice(0, -1) : rest;

  return (
    <nav
      aria-label="Docs breadcrumb"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
    >
      <Link href={docs!.href!} className="transition-colors hover:text-foreground">
        {docs!.name}
      </Link>

      {/* middle crumbs collapse below sm so the trail stays one line on phones */}
      {(middle.length > 0 || group) && (
        <span className="hidden items-center gap-2 sm:inline-flex">
          {middle.map((c) => (
            <span key={c.href} className="inline-flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link href={c.href!} className="transition-colors hover:text-foreground">
                {c.name}
              </Link>
            </span>
          ))}
          {group && (
            <>
              <span aria-hidden>/</span>
              <span>{group}</span>
            </>
          )}
        </span>
      )}

      {current && (
        <>
          <span aria-hidden>/</span>
          <span data-crumb className="text-foreground">
            {current.name}
          </span>
        </>
      )}
      <script
        type="application/ld+json"
        // built from the static nav config and the route — no user input reaches it
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </nav>
  );
}
