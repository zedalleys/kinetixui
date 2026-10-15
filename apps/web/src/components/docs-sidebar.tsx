"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@kinetixui/ui";
import { cn } from "@/lib/utils";
import { docsNav } from "@/lib/site";

export function DocsSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();

  const groups = React.useMemo(() => {
    if (!q) return docsNav;
    return docsNav
      .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [q]);
  const matches = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-[5.5rem] -ml-2 flex h-[calc(100dvh-5.5rem)] flex-col py-10 pr-4">
        {/* The library InputGroup: one field shell (edge, hover, focus and RTL-aware add-ons) around the input, its
            search icon and the clear button. The clear button gets its own focus ring from InputGroupButton. */}
        <InputGroup className="mb-6 ml-2 w-auto rounded-md bg-muted/40">
          <InputGroupAddon className="ps-2.5">
            <Search className="!size-3.5" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Filter…"
            aria-label="Filter documentation"
            className="h-8 px-2 py-0 font-mono text-body-sm"
          />
          {query && (
            <InputGroupButton
              // The button removes itself, so focus goes back to the field rather than falling to <body>.
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear filter"
              className="px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="!size-3.5" aria-hidden />
            </InputGroupButton>
          )}
        </InputGroup>

        {/* Sighted readers see the list shrink; this is the same news for a screen reader. */}
        <p role="status" className="sr-only">
          {q ? (matches === 1 ? "1 page matches" : `${matches} pages match`) : ""}
        </p>

        <nav aria-label="Documentation" className="min-h-0 flex-1 overflow-y-auto">
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
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "-ml-px flex items-center border-l-2 px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "border-primary font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {item.title}
                        {item.badge && <span className="ml-2 rounded-[3px] border border-border px-1 font-mono text-label-md uppercase tracking-wider text-muted-foreground">{item.badge}</span>}
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
