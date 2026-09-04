"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docsNav } from "@/lib/site";

const flat = docsNav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));

export function DocsPager() {
  const pathname = usePathname();
  const idx = flat.findIndex((i) => i.href === pathname);
  if (idx === -1) return null;
  const prev = flat[idx - 1];
  const next = flat[idx + 1];

  return (
    <div
      data-docs-chrome
      className="mt-12 flex items-stretch justify-between gap-4 border-t border-border pt-6"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col items-start gap-1 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <span className="eyebrow">{prev.group}</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-md border border-border px-3 py-2 text-right text-sm transition-colors hover:bg-muted"
        >
          <span className="eyebrow">{next.group}</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            {next.title}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </div>
  );
}
