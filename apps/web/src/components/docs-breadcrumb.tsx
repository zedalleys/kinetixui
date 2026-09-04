"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "@/lib/site";

/** Docs / <Group> / <Page> — mono, spec-sheet style. */
export function DocsBreadcrumb() {
  const pathname = usePathname();

  if (pathname === "/docs") {
    return (
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground"
      >
        Docs
      </nav>
    );
  }

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

  const isComponent = pathname.startsWith("/docs/components/");

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
    >
      <Link href="/docs" className="transition-colors hover:text-foreground">
        Docs
      </Link>
      {isComponent && (
        <>
          <span aria-hidden>/</span>
          <Link href="/components" className="transition-colors hover:text-foreground">
            Components
          </Link>
        </>
      )}
      {group && (
        <>
          <span aria-hidden>/</span>
          <span>{group}</span>
        </>
      )}
      {title && (
        <>
          <span aria-hidden>/</span>
          <span className="text-foreground">{title}</span>
        </>
      )}
    </nav>
  );
}
