"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { componentDocs } from "@/lib/site";
import { demoRegistry } from "@/registry/demos";

const slugOf = (href: string) => href.split("/").pop() ?? "";

/**
 * Demos whose libraries move the viewport on mount (cmdk calls
 * `scrollIntoView` on its first item; recharts' `accessibilityLayer` focuses
 * its <svg>). Harmless in a real, in-view preview, but in a below-the-fold
 * gallery thumbnail it scrolls the page down to the card. Render a plain
 * label for these instead of the live demo.
 */
const NO_LIVE_THUMBNAIL = new Set(["command", "combobox", "chart"]);

export function ComponentGallery() {
  const items = componentDocs;

  return (
    <>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Built from Figma, styled against the token contract, distributed through the kinetixui
        registry. All {items.length} shipped.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const slug = slugOf(item.href);
          const Demo = NO_LIVE_THUMBNAIL.has(slug)
            ? undefined
            : demoRegistry[`${slug}-demo`]?.component;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              <div className="relative h-[180px] overflow-hidden border-b border-border/60 bg-muted/20">
                {Demo ? (
                  <div
                    // decorative preview: keep it out of the a11y tree and make
                    // the whole subtree non-focusable so nested widgets (e.g. a
                    // recharts `accessibilityLayer` svg) can't grab focus and
                    // scroll the card into view on mount.
                    ref={(el) => {
                      if (el) el.inert = true;
                    }}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex origin-center scale-[0.7] items-center justify-center px-4"
                  >
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
