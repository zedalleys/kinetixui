"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { demoRegistry } from "@/registry/demos";
import { PLATFORM_LABEL, PLATFORM_ORDER, platformCode, type Platform } from "@/registry/platform-code";

const tabTrigger = cn(
  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
  "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
);

function CodePane({ code }: { code: string }) {
  return (
    <div className="relative">
      <CopyButton value={code} className="absolute right-3 top-3 z-10" />
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

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
      <div className="my-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Demo <code className="text-foreground">{name}</code> not found.
      </div>
    );
  }

  const Demo = entry.component;

  // React snippet is canonical (from the demo); other platforms come from platformCode.
  const native = platformCode[name] ?? {};
  const byPlatform: Partial<Record<Platform, string>> = { react: entry.source, ...native };
  const platforms = PLATFORM_ORDER.filter((p) => byPlatform[p]);
  const [platform, setPlatform] = React.useState<Platform>("react");

  return (
    <div
      data-cp
      className={cn("my-6 overflow-hidden rounded-xl border border-border", className)}
    >
      <Tabs.Root defaultValue="preview">
        <Tabs.List className="flex items-center gap-1 bg-muted/30 px-2">
          {["preview", "code"].map((v) => (
            <Tabs.Trigger key={v} value={v} className={tabTrigger}>
              {v}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="preview">
          <div
            className={cn(
              "flex min-h-[350px] w-full border-t border-border bg-background p-10",
              align === "center" ? "items-center justify-center" : "items-start justify-start",
            )}
          >
            <Demo />
          </div>
        </Tabs.Content>

        <Tabs.Content value="code">
          <div className="border-t border-border bg-muted/40">
            {platforms.length > 1 ? (
              <Tabs.Root value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <Tabs.List className="flex items-center gap-1 border-b border-border px-2">
                  {platforms.map((p) => (
                    <Tabs.Trigger
                      key={p}
                      value={p}
                      className={cn(
                        "-mb-px border-b-2 border-transparent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors",
                        "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
                      )}
                    >
                      {PLATFORM_LABEL[p]}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                {platforms.map((p) => (
                  <Tabs.Content key={p} value={p}>
                    <CodePane code={byPlatform[p]!} />
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            ) : (
              <CodePane code={entry.source} />
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
