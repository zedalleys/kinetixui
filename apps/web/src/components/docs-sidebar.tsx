"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsNav } from "@/lib/site";

export function DocsSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const groups = React.useMemo(() => {
    if (!q) return docsNav;
    return docsNav
      .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-[5.5rem] -ml-2 flex h-[calc(100dvh-5.5rem)] flex-col py-10 pr-4">
        <div className="relative mb-6 ml-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Filter…"
            aria-label="Filter documentation"
            className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-7 font-mono text-[12px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear filter"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto">
          {groups.length === 0 && (
            <p className="px-3 text-sm text-muted-foreground">No matches.</p>
          )}
          {groups.map((group) => (
            <div key={group.title} className="pb-7">
              <p className="eyebrow mb-2.5 px-3">{group.title}</p>
              <ul className="grid gap-0.5 border-l border-border">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "-ml-px flex items-center border-l-2 px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "border-primary font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
