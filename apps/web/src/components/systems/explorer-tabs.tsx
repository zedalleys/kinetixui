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
 *
 * THE HEIGHT. One panel is mounted at a time and the panels are not the same height, so changing tabs used to
 * change the height of the card and move the rest of the page: 217px of it at 1280px, and 714px at 200% text,
 * measured across the five widths `check:a11y-site` sweeps. The panel area is therefore a single grid cell with
 * the open panel and `reserve` — the tallest panel, from the same renderer — stacked in it, so the cell is as
 * tall as the taller of the two and that is the tallest panel whichever tab is open.
 *
 * A reserve rather than a height: a `min-height` would have to be a number somebody keeps in step with the file
 * paths and evidence lines that wrap differently at every width and text size, and would clip whatever outgrew
 * it. This reserves by laying out the real thing. It costs one extra panel in the HTML — not four, and none when
 * the tallest panel is itself the open one — and that panel takes no part in the page: `aria-hidden` and `inert`
 * for the accessibility tree and the keyboard, `invisible` so nothing of it is painted, and it renders neither
 * the copy button nor the focusable scroller. `check:home-systems` measures the card on every tab and fails on
 * a difference, so the claim is the gate's rather than this comment's.
 */
export type ExplorerTab = { tab: CodeTab; platform: Platform; label: string; maturity: string };


export function ExplorerTabs({
  component,
  tabs,
  initial,
  later,
  reserve,
  footer,
}: {
  component: string;
  tabs: ExplorerTab[];
  /** the first tab's panel, server-rendered */
  initial: React.ReactNode;
  /** every other tab's panel, as data */
  later: Partial<Record<CodeTab, PanelData>>;
  /** the tallest panel, laid out under the open one so the card keeps its height; skipped when it is the open one */
  reserve: { tab: CodeTab; panel: React.ReactNode };
  footer: React.ReactNode;
}) {
  const dir = useDocumentDirection();
  const preferred = codeTabFor(usePreferredPlatform());
  const value: CodeTab = tabs.some((t) => t.tab === preferred) ? preferred : tabs[0]!.tab;

  const onChange = (next: string) => {
    if (next === value) return; // a real choice only; the default tab rendering is not a selection
    const tab = next as CodeTab;
    if (!setPreferredPlatform(platformIdForCodeTab(tab))) return; // a repeated callback for the same click
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
      {/*
        One cell: the open panel and the reserve are laid over each other, so the cell takes the taller of the
        two. The column is `minmax(0,1fr)` and the items `min-w-0` rather than the implicit `auto`, which would
        be sized by the widest source line (882px against a 718px card here) and push the excerpt out under the
        card's `overflow-hidden`. The excerpt scrolls sideways inside `.kx-code-scroll`; the panel itself does
        not grow to it.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] [&>*]:[grid-area:1/1] [&>*]:min-w-0">
        {tabs.map((t) => (
          <TabsContent key={t.tab} value={t.tab} >
            {t.tab === tabs[0]!.tab ? initial : <ExplorerPanel component={component} data={later[t.tab]!} />}
          </TabsContent>
        ))}
        {value === reserve.tab ? null : (
          <div data-explorer-reserve="" aria-hidden="true" inert className="invisible mt-2">
            {reserve.panel}
          </div>
        )}
      </div>
      {footer}
    </Tabs>
  );
}
