"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@kinetixui/ui";
import { ExplorerPanel, type PanelData } from "./explorer-panel";
import { PlatformMark } from "./platform-marks";
import { analytics } from "@/lib/analytics";
import { PLATFORM_FROM_CODE_TAB } from "@/lib/analytics-surfaces";
import type { Platform } from "@/lib/platform-parity";
import { codeTabFor, platformIdForCodeTab, setPreferredPlatform, usePreferredPlatform } from "@/lib/platform-preference";
import type { CodeTab } from "@/lib/platform-tabs";
import { useDocumentDirection } from "@/lib/use-document-direction";

/**
 * The implementation explorer's interactive part, and only that: which platform is showing.
 *
 * The first panel arrives already rendered on the server (`implementation-explorer.tsx`) as `initial`. The other
 * panels arrive as `later` — compact data, no markup — and are drawn with the shared renderer only while their
 * tab is the selected one (Radix mounts only the active panel), so nothing is rendered for a tab the reader never
 * opens and nothing has to load when they do. The shell owns the selection (the reader's remembered platform,
 * shared with the docs), reports a real choice the way the docs do, and follows the page's direction live so
 * Left/Right move in reading order on an RTL page.
 */
export type ExplorerTab = { tab: CodeTab; platform: Platform; label: string; maturity: string };


export function ExplorerTabs({
  component,
  tabs,
  initial,
  later,
  footer,
}: {
  component: string;
  tabs: ExplorerTab[];
  /** the first tab's panel, server-rendered */
  initial: React.ReactNode;
  /** every other tab's panel, as data */
  later: Partial<Record<CodeTab, PanelData>>;
  footer: React.ReactNode;
}) {
  const dir = useDocumentDirection();
  const preferred = codeTabFor(usePreferredPlatform());
  const value: CodeTab = tabs.some((t) => t.tab === preferred) ? preferred : tabs[0]!.tab;

  const onChange = (next: string) => {
    if (next === value) return; // a real choice only; the default tab rendering is not a selection
    const tab = next as CodeTab;
    setPreferredPlatform(platformIdForCodeTab(tab));
    analytics.track("platform_selected", {
      platform: PLATFORM_FROM_CODE_TAB[tab],
      component: component.toLowerCase(),
      source: "homepage_flagship",
      location: "platform_tabs",
    });
  };

  return (
    <Tabs
      value={value}
      onValueChange={onChange}
      dir={dir}
      data-implementation-explorer=""
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10"
    >
      <TabsList aria-label="Implementation platform" className="px-2 sm:px-3">
        {tabs.map((t) => (
          <TabsTrigger key={t.tab} value={t.tab} data-platform={t.platform} >
            <PlatformMark platform={t.platform} className="size-4 shrink-0" />
            {t.label}
            {t.maturity !== "stable" ? <span className="font-mono text-label-md text-primary">{t.maturity}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.tab} value={t.tab} >
          {t.tab === tabs[0]!.tab ? initial : <ExplorerPanel component={component} data={later[t.tab]!} />}
        </TabsContent>
      ))}
      {footer}
    </Tabs>
  );
}
