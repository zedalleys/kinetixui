"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import Link from "next/link";
import { PreferencesPanel } from "@/examples/flagship-preferences";
import { flagshipExampleSource } from "@/registry/flagship-example.generated";
import { analytics } from "@/lib/analytics";
import { PLATFORM_FROM_CODE_TAB } from "@/lib/analytics-surfaces";
import { documentedExceptionCount, fullFourPlatformCount } from "@/lib/project-stats";
import { componentTotal } from "@/lib/platform-support";
import { PLATFORM_ORDER, type Platform } from "@/registry/platform-code";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

/** The recipe's identifier in analytics — not a real registry component, so it's not `componentSlugFor`-derived. */
const FLAGSHIP_COMPONENT = "flagship-preferences";

// Elsewhere on the site (ComponentPreview) these tabs read "iOS" / "Android", matching how a developer thinks
// about the target device. Here the point IS the technology — SwiftUI and Jetpack Compose by name — so this
// section spells them out rather than reusing the shorter device-oriented label.
const FLAGSHIP_PLATFORM_LABEL: Record<Platform, string> = {
  react: "React",
  swift: "SwiftUI",
  kotlin: "Jetpack Compose",
  dart: "Flutter",
};

/** platform-code.ts tab key → the source this recipe actually ships and is CI-verified against. */
const SOURCE_KEY: Record<Platform, keyof typeof flagshipExampleSource> = {
  react: "react",
  swift: "swiftui",
  kotlin: "compose",
  dart: "flutter",
};

/** What actually verifies each platform's copy of this recipe — stated precisely, not a uniform green check. */
const VERIFICATION: Record<Platform, string> = {
  react: "Typechecked, linted and built with this site",
  swift: "Compiled by swift build + swift test in CI",
  kotlin: "Compiled and behaviour-tested by Gradle in CI",
  dart: "Analyzed and widget-tested by flutter test in CI",
};

const tabTrigger = cn(
  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "data-[state=active]:border-primary data-[state=active]:text-foreground",
);

export function CrossPlatformFlagship() {
  const [platform, setPlatform] = React.useState<Platform>("react");

  const onPlatformChange = (value: string) => {
    const next = value as Platform;
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
            {PLATFORM_ORDER.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">{FLAGSHIP_PLATFORM_LABEL[p]}</span> — {VERIFICATION[p]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* platform tabs + real, CI-compiled source */}
        <Tabs.Root value={platform} onValueChange={onPlatformChange} className="flex flex-col bg-background">
          <Tabs.List aria-label="Implementation platform" className="flex items-center gap-1 border-b border-border px-4">
            {PLATFORM_ORDER.map((p) => (
              <Tabs.Trigger key={p} value={p} className={tabTrigger}>
                {FLAGSHIP_PLATFORM_LABEL[p]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {PLATFORM_ORDER.map((p) => (
            <Tabs.Content key={p} value={p} className="relative flex-1">
              {/* copies fine; intentionally reports nothing — see the note above */}
              <CopyButton value={flagshipExampleSource[SOURCE_KEY[p]]} className="absolute right-3 top-3 z-10" />
              <pre
                // a code block scrolls sideways/vertically when it overflows, so the keyboard must be able to reach it
                tabIndex={0}
                aria-label={`${FLAGSHIP_PLATFORM_LABEL[p]} source`}
                className="h-full max-h-[420px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <code>{flagshipExampleSource[SOURCE_KEY[p]]}</code>
              </pre>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        <Link href="/docs/platforms" className="underline-offset-4 hover:text-foreground hover:underline">
          {fullFourPlatformCount}/{componentTotal} components on all four platforms · {documentedExceptionCount} documented
          exceptions
        </Link>
      </p>
    </div>
  );
}
