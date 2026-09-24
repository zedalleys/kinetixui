"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import Link from "next/link";
import { PreferencesPanel } from "@/examples/flagship-preferences";
import { flagshipExampleSource } from "@/registry/flagship-example.generated";
import { analytics } from "@/lib/analytics";
import { PLATFORM_FROM_CODE_TAB } from "@/lib/analytics-surfaces";
import { catalogPlatformCount, documentedExceptionCount, fullCoverageCount } from "@/lib/project-stats";
import { componentTotal } from "@/lib/platform-support";
import { PLATFORM_TABS, type CodeTab } from "@/lib/platform-tabs";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

/** The recipe's identifier in analytics — not a real registry component, so it's not `componentSlugFor`-derived. */
const FLAGSHIP_COMPONENT = "flagship-preferences";

/**
 * Tab key → the source this recipe actually ships and is CI-verified against.
 *
 * Partial on purpose, and the tab list below is derived from it rather than from the platform list: this
 * recipe exists in four languages, and a fifth tab would have to mean a fifth real, compiled file. When an
 * Angular copy is written, adding it here is what makes the tab appear — not the other way round.
 */
const SOURCE_KEY: Partial<Record<CodeTab, keyof typeof flagshipExampleSource>> = {
  react: "react",
  swift: "swiftui",
  kotlin: "compose",
  dart: "flutter",
};

/** What actually verifies each platform's copy of this recipe — stated precisely, not a uniform green check. */
const VERIFICATION: Partial<Record<CodeTab, string>> = {
  react: "Typechecked, linted and built with this site",
  swift: "Compiled by swift build + swift test in CI",
  kotlin: "Compiled and behaviour-tested by Gradle in CI",
  dart: "Analyzed and widget-tested by flutter test in CI",
};

/** The tabs, in manifest order, restricted to the platforms this recipe really has a source file for. */
const FLAGSHIP_TABS = PLATFORM_TABS.filter((t) => SOURCE_KEY[t.tab]);

const tabTrigger = cn(
  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "data-[state=active]:border-primary data-[state=active]:text-foreground",
);

export function CrossPlatformFlagship() {
  const [platform, setPlatform] = React.useState<CodeTab>("react");

  const onPlatformChange = (value: string) => {
    const next = value as CodeTab;
    if (next === platform) return; // an explicit change only — the default React tab rendering is not a selection
    setPlatform(next);
    analytics.track("platform_selected", {
      platform: PLATFORM_FROM_CODE_TAB[next],
      component: FLAGSHIP_COMPONENT,
      source: "homepage_flagship",
      location: "platform_tabs",
    });
  };

  // NOTE: copying this recipe's source is deliberately NOT tracked. It is tempting to reuse
  // `component_code_copied` here, but that event is one of the three Developer Activation signals and its
  // `component` property is what the "Top Components Copied" breakdown groups by. `flagship-preferences` is a
  // composed example, not an entry in components.manifest.json, so emitting it would both pollute that
  // breakdown with a non-component and inflate activation with a homepage interaction. If we ever want this
  // measured, it needs its own event and its own deliberate decision about whether it counts as activation —
  // not a borrowed one. `cross-platform-flagship.test.tsx` asserts the silence.

  return (
    <div className="mt-10">
      <div className="grid gap-0 overflow-hidden rounded-xl border border-border md:grid-cols-2">
        {/* preview — the same rendered UI, following the site's own light/dark theme */}
        <div className="flex flex-col border-b border-border bg-muted/30 p-8 md:border-b-0 md:border-r">
          <div className="flex flex-1 items-center justify-center py-6">
            <PreferencesPanel />
          </div>
          <ul className="mt-6 space-y-2 border-t border-border pt-4">
            {FLAGSHIP_TABS.map((t) => (
              <li key={t.tab} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">{t.label}</span> — {VERIFICATION[t.tab]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* platform tabs + real, CI-compiled source */}
        <Tabs.Root value={platform} onValueChange={onPlatformChange} className="flex flex-col bg-background">
          <Tabs.List aria-label="Implementation platform" className="flex items-center gap-1 border-b border-border px-4">
            {FLAGSHIP_TABS.map((t) => (
              <Tabs.Trigger key={t.tab} value={t.tab} className={tabTrigger}>
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {FLAGSHIP_TABS.map((t) => {
            const source = flagshipExampleSource[SOURCE_KEY[t.tab]!];
            return (
              <Tabs.Content key={t.tab} value={t.tab} className="relative flex-1">
                {/* copies fine; intentionally reports nothing — see the note above */}
                <CopyButton value={source} className="absolute right-3 top-3 z-10" />
                <pre
                  // a code block scrolls sideways/vertically when it overflows, so the keyboard must be able to reach it
                  tabIndex={0}
                  aria-label={`${t.label} source`}
                  className="h-full max-h-[420px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <code>{source}</code>
                </pre>
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      </div>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        <Link href="/docs/platforms" className="underline-offset-4 hover:text-foreground hover:underline">
          {fullCoverageCount}/{componentTotal} components on all {catalogPlatformCount} platforms · {documentedExceptionCount} documented
          exceptions
        </Link>
      </p>
    </div>
  );
}
