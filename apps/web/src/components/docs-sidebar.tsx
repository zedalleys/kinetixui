"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNav } from "@/lib/site";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-14 -ml-2 h-[calc(100dvh-3.5rem)] overflow-y-auto py-8 pr-4">
        {docsNav.map((group) => (
          <div key={group.title} className="pb-6">
            <p className="mb-2 px-2 text-sm font-semibold">{group.title}</p>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      aria-disabled={item.disabled}
                      className={cn(
                        "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                        item.disabled
                          ? "cursor-not-allowed text-muted-foreground/50"
                          : active
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.title}
                      {item.label && (
                        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
