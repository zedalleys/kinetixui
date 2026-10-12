"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { PlatformLogo } from "@/components/platform-logo";
import { analytics } from "@/lib/analytics";
import { PLATFORM_FROM_CODE_TAB } from "@/lib/analytics-surfaces";
import type { Token } from "@/lib/highlight";
import type { Platform } from "@/lib/platform-parity";
import { TAB_OF, type CodeTab } from "@/lib/platform-tabs";
import { codeTabFor, platformIdForCodeTab, setPreferredPlatform, usePreferredPlatform } from "@/lib/platform-preference";
import { cn } from "@/lib/utils";

/**
 * "Same contract. Different platform." — the real `Switch` source on every platform, side by side.
 *
 * Not an example and not a snippet: each tab is the implementation file in that platform's own package, read
 * at build time by `lib/systems-in-motion.ts` (Angular's is two excerpts, the component and its stylesheet,
 * because that is how the Angular package is built). The line in each file that reads `action` is marked, so
 * the token the hero follows is visible again here, consumed natively in five languages.
 *
 * The selected platform is the reader's remembered platform, shared with the docs, and choosing one is
 * reported the same way the docs report it. Nothing is reported on render.
 */

export type ExplorerFile = {
  file: string;
  firstLine: number;
  lastLine: number;
  language: string;
  text: string;
  lines: Token[][];
  readsToken: number[];
};
export type ExplorerPlatform = {
  platform: Platform;
  label: string;
  maturity: string;
  distribution: string;
  files: ExplorerFile[];
  verification: string | null;
  evidence: string[];
};

const EVIDENCE_LABEL: Record<string, string> = {
  build: "build",
  interaction: "interaction",
  accessibility: "accessibility",
  rtl: "RTL",
  largeText: "large text",
  reducedMotion: "reduced motion",
  visual: "visual",
  published: "published",
};

const TOKEN_CLASS: Record<Token[0], string | undefined> = {
  comment: "kx-tok-comment",
  string: "kx-tok-string",
  keyword: "kx-tok-keyword",
  type: "kx-tok-type",
  plain: undefined,
};

const tabTrigger = cn(
  "relative inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 font-display text-sm text-muted-foreground transition-colors duration-fast",
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  "data-[state=active]:border-primary data-[state=active]:text-foreground",
);

export function ImplementationExplorer({
  component,
  componentHref,
  platforms,
}: {
  component: string;
  componentHref: string;
  platforms: ExplorerPlatform[];
}) {
  const preferred = codeTabFor(usePreferredPlatform());
  const tabs = platforms.map((p) => ({ ...p, tab: TAB_OF[p.platform] as CodeTab }));
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
    <Tabs.Root
      value={value}
      onValueChange={onChange}
      className="kx-chapter-dark dark overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/20"
    >
      <Tabs.List aria-label="Implementation platform" className="flex flex-wrap items-stretch gap-x-1 border-b border-border px-2 sm:px-3">
        {tabs.map((t) => (
          <Tabs.Trigger key={t.tab} value={t.tab} className={tabTrigger}>
            <PlatformLogo platform={t.platform} className="size-4 shrink-0" />
            {t.label}
            {t.maturity !== "stable" ? <span className="font-mono text-xs text-primary">{t.maturity}</span> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((t) => (
        <Tabs.Content key={t.tab} value={t.tab} className="focus-visible:outline-none">
          <div className="relative">
            <CopyButton
              value={t.files.map((f) => f.text).join("\n\n")}
              label={`Copy the ${t.label} ${component} source`}
              className="absolute end-3 top-2.5 z-10"
            />
            <div
              // a code region scrolls when it overflows, so the keyboard has to be able to reach it
              tabIndex={0}
              role="region"
              aria-label={`${t.label} ${component} source`}
              className="max-h-[30rem] overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {t.files.map((f) => (
                <div key={f.file}>
                  <p className="sticky top-0 z-[1] flex flex-wrap items-baseline gap-x-3 border-b border-border bg-card/95 py-2.5 pe-14 ps-4 font-mono text-xs text-muted-foreground">
                    <span className="text-foreground" dir="ltr">
                      {f.file}
                    </span>
                    <span>
                      lines {f.firstLine}–{f.lastLine}
                    </span>
                  </p>
                  <pre dir="ltr" className="py-3 font-mono text-[0.78rem] leading-relaxed">
                    <code className="grid min-w-max">
                      {f.lines.map((line, i) => (
                        <span
                          key={i}
                          className="kx-code-line grid grid-cols-[3.25rem_1fr] pe-6"
                          {...(f.readsToken.includes(i) ? { "data-reads": "" } : {})}
                        >
                          <span aria-hidden="true" className="select-none pe-4 text-end text-muted-foreground/60">
                            {f.firstLine + i}
                          </span>
                          <span>
                            {line.length === 0
                              ? " "
                              : line.map(([kind, text], j) => (
                                  <span key={j} className={TOKEN_CLASS[kind]}>
                                    {text}
                                  </span>
                                ))}
                          </span>
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* what is true of THIS implementation: three separate facts, never one badge */}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border bg-card/60 px-4 py-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="font-mono text-xs text-muted-foreground">Package</dt>
              <dd className="mt-0.5 text-foreground">
                {t.maturity} · {t.distribution}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-xs text-muted-foreground">{component} verification</dt>
              <dd className="mt-0.5 text-foreground">{t.verification ?? "none recorded"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-xs text-muted-foreground">Evidence on file</dt>
              <dd className="mt-0.5 text-foreground">{t.evidence.map((e) => EVIDENCE_LABEL[e] ?? e).join(" · ") || "none"}</dd>
            </div>
          </dl>
        </Tabs.Content>
      ))}

      <p className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          <span aria-hidden="true" className="me-2 inline-block size-2 rounded-[2px] bg-primary align-middle" />
          Marked lines read the <code className="text-foreground">action</code> token.
        </span>
        <Link href={componentHref} className="inline-flex min-h-9 items-center gap-1 font-medium text-primary underline underline-offset-4">
          {component} on every platform <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </p>
    </Tabs.Root>
  );
}
