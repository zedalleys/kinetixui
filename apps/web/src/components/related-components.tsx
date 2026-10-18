"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { relatedComponents } from "@/lib/related-components";

/**
 * "Related components" at the foot of a component page. Plain links to canonical component URLs, server-rendered
 * with the page (the pathname is known at build time), so crawlers and readers without JavaScript get them too.
 * Renders nothing outside `/docs/components/*`.
 */
export function RelatedComponents() {
  const pathname = usePathname();
  if (!pathname.startsWith("/docs/components/")) return null;
  const related = relatedComponents(pathname.split("/").pop()!);
  if (!related.length) return null;
  return (
    <nav aria-labelledby="related-components" data-related-components className="mt-12 border-t border-border pt-6">
      <h2 id="related-components" className="text-base font-semibold tracking-tight">
        Related components
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {related.map((c) => (
          <li key={c.slug}>
            <Link
              href={c.href}
              className="inline-flex min-h-9 items-center rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
