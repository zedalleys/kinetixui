"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { docsNav } from "@/lib/site";
import { demoRegistry } from "@/registry/demos";

const slugOf = (href: string) => href.split("/").pop() ?? "";

export function ComponentGallery() {
  const items = docsNav.find((g) => g.title === "Components")!.items;

  return (
    <>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Built from Figma, styled against the token contract, distributed through the kinetixui
        registry. All {items.length} shipped.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Demo = demoRegistry[`${slugOf(item.href)}-demo`]?.component;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              <div className="relative h-[180px] overflow-hidden border-b border-border/60 bg-muted/20">
                {Demo ? (
                  <div className="pointer-events-none absolute inset-0 flex origin-top scale-[0.7] items-start justify-center px-4 pt-6">
                    <Demo />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {item.title}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="font-medium">{item.title}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
