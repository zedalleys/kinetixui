"use client";

import * as React from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent, SegmentedControl, SegmentedControlItem } from "@kinetixui/ui";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { PreviewEnvironment } from "./preview-environment";
import { analytics } from "@/lib/analytics";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { PLATFORM_FROM_CODE_TAB, componentSlugFor, ctaAttrs } from "@/lib/analytics-surfaces";
import { demoRegistry } from "@/registry/demos";
import { platformCode } from "@/registry/platform-code";
import {
  GUIDANCE_LABEL,
  PLATFORM_TABS,
  WAVE_LABEL,
  platformStateFor,
  type CodeTab,
  type PlatformTab,
} from "@/lib/platform-tabs";
import { usageExamples } from "@/registry/usage-examples.generated";
import {
  codeTabFor,
  platformIdForCodeTab,
  setPreferredPlatform,
  usePreferredPlatform,
} from "@/lib/platform-preference";

const setupHref: Record<CodeTab, string> = {
  react: "/docs/installation",
  angular: "/docs/angular",
  swift: "/docs/swiftui",
  kotlin: "/docs/compose",
  dart: "/docs/flutter",
};

function CodePane({ code, onCopy }: { code: string; onCopy?: () => void }) {
  return (
    <div className="relative">
      <CopyButton value={code} onCopy={onCopy} className="absolute right-3 top-3 z-10" />
      <pre dir="ltr" className="overflow-x-auto p-4 font-mono text-code leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * The line above a snippet that is NOT a KinetixUI component on this platform.
 *
 * It is deliberately not a subtle footnote. An unlabelled native tab reads as "we ship this here", which is
 * the claim the whole guidance model exists to stop being made by accident.
 */
function GuidanceNote({ kind, label, children }: { kind: string; label: string; children: React.ReactNode }) {
  return (
    <p className="border-b border-border bg-background/60 px-4 py-2.5 text-body-md text-muted-foreground">
      <span
        className="mr-2 rounded-sm border border-border px-1.5 py-0.5 font-mono text-label-md uppercase tracking-[0.1em] text-foreground"
        data-guidance={kind}
      >
        {label}
      </span>
      {children}
    </p>
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
  // hooks first: an early return below must not change how many hooks run
  // the reader's platform, shared with every other switcher on the site and remembered between pages
  const preferred = codeTabFor(usePreferredPlatform());
  const pathname = usePathname();
  // the preview / code strip follows the page (the stage below carries the same direction); source stays LTR
  const [mode, setMode] = React.useState("preview");
  const dir = useDocumentDirection();
  const entry = demoRegistry[name];
  // the component whose page this is — from the route, validated against the docs' own component list. A demo
  // shown anywhere else (no component page) has no known component, so it reports nothing.
  const component = componentSlugFor(pathname);

  if (!entry) {
    return (
      <div className="my-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Demo <code className="text-foreground">{name}</code> not found.
      </div>
    );
  }

  const Demo = entry.component;

  // React snippet is canonical (from the demo). The others come from a compiled example where one exists
  // (usage-examples.generated.ts, extracted from source each platform's CI builds) and otherwise from the
  // hand-written platformCode entry. A key never appears in both: check:platform-code fails on that, so
  // migrating a snippet means moving it, not copying it.
  const byTab: Partial<Record<CodeTab, string>> = {
    react: entry.source,
    ...(platformCode[name] ?? {}),
    ...(usageExamples[name] ?? {}),
  };

  /**
   * Which tabs this component shows. All five whenever the demo is on a component page, because a missing tab
   * is itself a claim — "there is nothing to say about Angular here" — and there always is something. Outside
   * a component page there is no slug to look guidance up by, so only the tabs that have code are shown.
   */
  const tabs = PLATFORM_TABS.filter((t) => byTab[t.tab] || (component && platformStateFor(component, t.platform)));
  // a demo outside a component page may not have the reader's platform; it shows its first tab and leaves the choice alone
  const platform: CodeTab = tabs.some((t) => t.tab === preferred) ? preferred : (tabs[0]?.tab ?? "react");

  // whether a platform tab puts code on screen; a planned port shows a sentence, not code
  const showsCode = (tab: CodeTab) => {
    const t = tabs.find((x) => x.tab === tab);
    const state = t ? platformStateFor(component, t.platform) : undefined;
    return Boolean(byTab[tab]) && !(state && state !== "implementation" && state.type === "planned");
  };
  // someone looked at the source: only from a click on Code or on another platform's tab, never on mount or restore
  const viewed = (tab: CodeTab, location: "code_tab" | "platform_tabs") => {
    if (component && showsCode(tab)) {
      analytics.track("component_code_viewed", {
        component,
        platform: PLATFORM_FROM_CODE_TAB[tab],
        location,
        source: "component_page",
      });
    }
  };

  // the code itself is never reported — only which component and which platform's snippet was copied
  const copied = (tab: CodeTab) => {
    if (component)
      analytics.track("component_code_copied", {
        component,
        platform: PLATFORM_FROM_CODE_TAB[tab],
        source: "component_page",
      });
  };

  const renderTab = ({ tab, platform: manifestPlatform, label }: PlatformTab) => {
    const code = byTab[tab];
    const state = platformStateFor(component, manifestPlatform);

    if (state && state !== "implementation" && state.type === "planned") {
      return (
        <p className="px-4 py-5 text-body-md text-muted-foreground">
          <span className="font-medium text-foreground">Not implemented in {label} yet.</span> {label} is in preview and
          rolling out in waves; this component is in the {WAVE_LABEL[state.wave ?? ""] ?? state.wave} wave. There is
          deliberately no example here — an invented one would be worse than none.
        </p>
      );
    }

    if (!code) return null;

    return (
      <>
        <p className="border-b border-border px-4 py-2 text-body-md text-muted-foreground">
          {`${label} source; the live preview uses React. `}
          {/* Only React's destination is /docs/installation, so only it carries the `installation` CTA: the event
              has no platform property, and tagging all five would merge five destinations into one count. */}
          <Link
            href={setupHref[tab]}
            {...(tab === "react" ? ctaAttrs("component_page", "installation") : {})}
            className="text-primary underline underline-offset-2"
          >
            {label} installation and setup
          </Link>
        </p>
        {state && state !== "implementation" && (
          <GuidanceNote kind={state.type} label={GUIDANCE_LABEL[state.type]}>
            {state.type === "native-equivalent"
              ? `${label} already provides this, so KinetixUI ships no component for it. `
              : `KinetixUI ships no ${label} component for this — compose it from the ones it does ship. `}
            {state.reason}
          </GuidanceNote>
        )}
        <CodePane code={code} onCopy={() => copied(tab)} />
      </>
    );
  };

  return (
    <div data-cp className={cn("my-6 overflow-hidden rounded-xl border border-border", className)}>
      <div dir={dir}>
        {/*
          The mode strip is the first rail of the preview's toolbar, and the environment strip below it
          (preview-environment.tsx) is the second. They were not written as one: this control sat flush
          against the card, inset only by the 1px border, while the environment row carries `px-3 py-2`
          — so two controls that read as one toolbar started 12px apart, and this one had no vertical
          rail padding at all. The rail here is the same inset and the same padding as that one, which
          is what makes the two read as a single component rather than two stacked ones. Changing
          either means changing both.
        */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
          <SegmentedControl
            value={mode}
            dir={dir}
            onValueChange={(next) => {
              if (!next) return;
              setMode(next);
              if (next === "code") viewed(tabs.length > 1 ? platform : "react", "code_tab");
            }}
            aria-label="View preview or code"
          >
            {["preview", "code"].map((v) => (
              <SegmentedControlItem key={v} value={v} className="capitalize">
                {v}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>

        {mode === "preview" && (
          <div role="group" aria-label={"Component preview"}>
            <PreviewEnvironment align={align}>
              <Demo />
            </PreviewEnvironment>
          </div>
        )}

        {mode === "code" && (
          <div role="group" aria-label={"Component code"}>
            <div className="border-t border-border bg-muted/40">
              {tabs.length > 1 ? (
                <Tabs
                  dir={dir}
                  value={platform}
                  onValueChange={(v) => {
                    const next = v as CodeTab;
                    // only an explicit change of platform; the default React tab rendering is not a selection
                    if (next === platform) return;
                    // a repeated callback for the same click changes nothing, so it reports nothing
                    if (!setPreferredPlatform(platformIdForCodeTab(next))) return;
                    if (component) {
                      analytics.track("platform_selected", {
                        platform: PLATFORM_FROM_CODE_TAB[next],
                        component,
                        source: "component_page",
                        location: "platform_tabs",
                      });
                    }
                    viewed(next, "platform_tabs");
                  }}
                >
                  <TabsList aria-label="Platform" className="px-2">
                    {tabs.map((t) => (
                      <TabsTrigger key={t.tab} value={t.tab}>
                        {t.label}
                        {/* a preview platform says so on the tab itself — the tab sitting beside four stable
                          ones would otherwise imply the same maturity */}
                        {t.maturity !== "stable" && (
                          <span className="ms-1.5 normal-case tracking-normal text-muted-foreground">
                            · {t.maturity}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {tabs.map((t) => (
                    <TabsContent key={t.tab} value={t.tab}>
                      {renderTab(t)}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <CodePane code={entry.source} onCopy={() => copied("react")} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
