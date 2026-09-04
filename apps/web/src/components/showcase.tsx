"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * Live example + copyable source, used by /blocks and /charts.
 * Simpler than <ComponentPreview> — one code string, no demo registry.
 */
export function Showcase({
  title,
  description,
  code,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  code: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("scroll-mt-28", className)}>
      <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <Tabs.Root defaultValue="preview">
          <Tabs.List className="flex items-center gap-1 bg-muted/30 px-2">
            {["preview", "code"].map((v) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className={cn(
                  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
                  "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
                )}
              >
                {v}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="preview">
            <div
              className={cn(
                "flex min-h-[280px] w-full items-center justify-center border-t border-border bg-background p-8",
                contentClassName,
              )}
            >
              {children}
            </div>
          </Tabs.Content>

          <Tabs.Content value="code">
            <div className="relative border-t border-border bg-muted/40">
              <CopyButton value={code} className="absolute right-3 top-3 z-10" />
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  );
}
