"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { docsNav, mainNav } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-12 z-40 max-h-[calc(100dvh-3rem)] overflow-y-auto border-b border-border bg-background p-4">
          <nav className="flex flex-col gap-1 text-sm">
            {mainNav.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="rounded px-2 py-2 hover:bg-muted">
                {i.title}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {docsNav.map((g) => (
              <div key={g.title} className="py-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{g.title}</p>
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className="block rounded px-2 py-1.5 hover:bg-muted"
                  >
                    {i.title}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
