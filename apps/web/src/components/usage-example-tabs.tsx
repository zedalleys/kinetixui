"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@kinetixui/ui";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { PLATFORM_TABS } from "@/lib/platform-tabs";
import { usageExamples } from "@/registry/usage-examples.generated";


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
      <Tabs dir={dir} defaultValue={tabs[0].tab}>
        <TabsList aria-label="Platform" className="px-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.tab} value={t.tab} >
              {t.label}
              {t.maturity !== "stable" && (
                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground">· {t.maturity}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.tab} value={t.tab}>
            <div className="relative">
              <CopyButton value={byTab[t.tab]!} className="absolute right-3 top-3 z-10" />
              <pre dir="ltr" className="overflow-x-auto p-4 font-mono text-code leading-relaxed">
                <code>{byTab[t.tab]}</code>
              </pre>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
