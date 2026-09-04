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
    <section className={cn("scroll-mt-20", className)}>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      <Tabs.Root defaultValue="preview" className="mt-3">
        <Tabs.List className="flex items-center gap-1 border-b border-border">
          {["preview", "code"].map((v) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className={cn(
                "-mb-px border-b-2 border-transparent px-3 py-2 text-sm capitalize text-muted-foreground transition-colors",
                "data-[state=active]:border-primary data-[state=active]:text-foreground",
              )}
            >
              {v}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="preview">
          <div
            className={cn(
              "flex min-h-[280px] w-full items-center justify-center rounded-b-lg border-x border-b border-border bg-background p-8",
              contentClassName,
            )}
          >
            {children}
          </div>
        </Tabs.Content>

        <Tabs.Content value="code">
          <div className="relative rounded-b-lg border-x border-b border-border bg-muted/40">
            <CopyButton value={code} className="absolute right-3 top-3 z-10" />
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
