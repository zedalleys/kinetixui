"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { PLATFORM_TABS } from "@/lib/platform-tabs";
import { usageExamples } from "@/registry/usage-examples.generated";

const tabTrigger = cn(
  "-mb-px border-b-2 border-transparent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors",
  "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
);

/**
 * One compiled usage example per platform, as tabs — for a guide page that is not about one component
 * (/docs/icons). Every snippet comes from a `kx-usage:<name>` region in a file that platform's CI compiles
 * and tests (usage-examples.generated.ts), so the page cannot show an API that does not exist. A platform
 * with no region for `name` gets no tab; a name with no regions at all renders nothing rather than an
 * empty frame.
 */
export function UsageExampleTabs({ name, className }: { name: string; className?: string }) {
  const dir = useDocumentDirection();
  const byTab = usageExamples[name] ?? {};
  const tabs = PLATFORM_TABS.filter((t) => byTab[t.tab]);
  if (tabs.length === 0) return null;

  return (
    <div data-usage-example={name} className={cn("my-6 overflow-hidden rounded-xl border border-border bg-muted/40", className)}>
      <Tabs.Root dir={dir} defaultValue={tabs[0].tab}>
        <Tabs.List aria-label="Platform" className="flex flex-wrap items-center gap-1 border-b border-border px-2">
          {tabs.map((t) => (
            <Tabs.Trigger key={t.tab} value={t.tab} className={tabTrigger}>
              {t.label}
              {t.maturity !== "stable" && (
                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground">· {t.maturity}</span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map((t) => (
          <Tabs.Content key={t.tab} value={t.tab}>
            <div className="relative">
              <CopyButton value={byTab[t.tab]!} className="absolute right-3 top-3 z-10" />
              <pre dir="ltr" className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                <code>{byTab[t.tab]}</code>
              </pre>
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}
