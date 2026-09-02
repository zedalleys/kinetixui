"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { demoRegistry } from "@/registry/demos";

export function ComponentPreview({
  name,
  align = "center",
  className,
}: {
  name: string;
  align?: "center" | "start";
  className?: string;
}) {
  const entry = demoRegistry[name];

  if (!entry) {
    return (
      <div className="my-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Demo <code className="text-foreground">{name}</code> not found.
      </div>
    );
  }

  const Demo = entry.component;

  return (
    <div className={cn("my-6", className)}>
      <Tabs.Root defaultValue="preview">
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
              "flex min-h-[350px] w-full rounded-b-lg border-x border-b border-border p-10",
              align === "center" ? "items-center justify-center" : "items-start justify-start",
            )}
          >
            <Demo />
          </div>
        </Tabs.Content>

        <Tabs.Content value="code">
          <div className="relative rounded-b-lg border-x border-b border-border bg-muted/40">
            <CopyButton value={entry.source} className="absolute right-3 top-3" />
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
              <code>{entry.source}</code>
            </pre>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
