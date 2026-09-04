"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

export function DocsToc() {
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const article = document.querySelector("[data-docs-content]");
    if (!article) return;
    const nodes = Array.from(article.querySelectorAll("h2, h3")) as HTMLElement[];
    const hs = nodes
      .filter((n) => n.id)
      .map((n) => ({ id: n.id, text: n.textContent ?? "", level: Number(n.tagName[1]) }));
    setHeadings(hs);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: "0% 0% -70% 0%", threshold: 1 },
    );
    nodes.forEach((n) => n.id && observer.observe(n));
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return <div className="hidden xl:block xl:w-56" />;

  return (
    <div className="hidden xl:block xl:w-56 xl:shrink-0">
      <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto py-10 pl-4">
        <p className="eyebrow mb-3">On this page</p>
        <ul className="grid gap-0.5 border-l border-border text-sm">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={cn(
                  "-ml-px block border-l-2 py-1 transition-colors",
                  h.level === 3 ? "pl-6" : "pl-3",
                  activeId === h.id
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
