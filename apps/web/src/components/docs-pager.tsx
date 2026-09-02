"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docsNav } from "@/lib/site";

const flat = docsNav.flatMap((g) => g.items).filter((i) => !i.disabled);

export function DocsPager() {
  const pathname = usePathname();
  const idx = flat.findIndex((i) => i.href === pathname);
  if (idx === -1) return null;
  const prev = flat[idx - 1];
  const next = flat[idx + 1];

  return (
    <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          {next.title}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
