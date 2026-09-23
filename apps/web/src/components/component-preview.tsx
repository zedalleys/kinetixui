"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { analytics } from "@/lib/analytics";
import { PLATFORM_FROM_CODE_TAB, componentSlugFor } from "@/lib/analytics-surfaces";
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

const tabTrigger = cn(
  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
  "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
);

function CodePane({ code, onCopy }: { code: string; onCopy?: () => void }) {
  return (
    <div className="relative">
      <CopyButton value={code} onCopy={onCopy} className="absolute right-3 top-3 z-10" />
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
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
    <p className="border-b border-border bg-background/60 px-4 py-2.5 text-[13px] text-muted-foreground">
      <span
        className="mr-2 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground"
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
  const [platform, setPlatform] = React.useState<CodeTab>("react");
  const pathname = usePathname();
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

  // the code itself is never reported — only which component and which platform's snippet was copied
  const copied = (tab: CodeTab) => {
    if (component) analytics.track("component_code_copied", { component, platform: PLATFORM_FROM_CODE_TAB[tab], source: "component_page" });
  };

  const renderTab = ({ tab, platform: manifestPlatform, label }: PlatformTab) => {
    const code = byTab[tab];
    const state = platformStateFor(component, manifestPlatform);

    if (state && state !== "implementation" && state.type === "planned") {
      return (
        <p className="px-4 py-5 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Not implemented in {label} yet.</span>{" "}
          {label} is in preview and rolling out in waves; this component is in the{" "}
          {WAVE_LABEL[state.wave ?? ""] ?? state.wave} wave. There is deliberately no example here — an
          invented one would be worse than none.
        </p>
      );
    }

    if (!code) return null;

    return (
      <>
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
    <div
      data-cp
      className={cn("my-6 overflow-hidden rounded-xl border border-border", className)}
    >
      <Tabs.Root defaultValue="preview">
        <Tabs.List aria-label="View preview or code" className="flex items-center gap-1 bg-muted/30 px-2">
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
            {tabs.length > 1 ? (
              <Tabs.Root
                value={platform}
                onValueChange={(v) => {
                  const next = v as CodeTab;
                  // only an explicit change of platform; the default React tab rendering is not a selection
                  if (next === platform) return;
                  setPlatform(next);
                  if (component) {
                    analytics.track("platform_selected", { platform: PLATFORM_FROM_CODE_TAB[next], component, source: "component_page", location: "platform_tabs" });
                  }
                }}
              >
                <Tabs.List aria-label="Platform" className="flex flex-wrap items-center gap-1 border-b border-border px-2">
                  {tabs.map((t) => (
                    <Tabs.Trigger
                      key={t.tab}
                      value={t.tab}
                      className={cn(
                        "-mb-px border-b-2 border-transparent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors",
                        "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
                      )}
                    >
                      {t.label}
                      {/* a preview platform says so on the tab itself — the tab sitting beside four stable
                          ones would otherwise imply the same maturity */}
                      {t.maturity !== "stable" && (
                        <span className="ml-1.5 normal-case tracking-normal text-muted-foreground">· {t.maturity}</span>
                      )}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                {tabs.map((t) => (
                  <Tabs.Content key={t.tab} value={t.tab}>
                    {renderTab(t)}
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            ) : (
              <CodePane code={entry.source} onCopy={() => copied("react")} />
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
