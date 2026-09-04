"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNav } from "@/lib/site";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-16 -ml-2 h-[calc(100dvh-4rem)] overflow-y-auto py-10 pr-4">
        {docsNav.map((group) => (
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
      </div>
    </aside>
  );
}
