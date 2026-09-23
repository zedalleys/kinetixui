"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "@/lib/platform-parity";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * The real source for the same example on each platform that implements it, keyed by platform name. Only
 * platforms with a verified source file appear — there is no placeholder tab and no inferred support.
 */
export type PlatformSources = Partial<Record<Platform, string>>;

/**
 * Live example + copyable source, used by /blocks and /charts.
 * Simpler than <ComponentPreview> — no demo registry.
 *
 * `sources` adds a tab per platform that really implements the example; tab order comes from the central
 * platform definition rather than a list kept here, so a new platform slots into place everywhere at once. A
 * platform with no source gets no tab, because an empty or "coming soon" tab is a claim of its own.
 * `code` is the single-snippet form for pages that only have React.
 */
export function Showcase({
  id,
  title,
  description,
  code,
  sources,
  platforms,
  children,
  className,
  contentClassName,
}: {
  /** Anchor target, so a single block can be linked to directly. */
  id?: string;
  title: string;
  description?: string;
  code?: string;
  sources?: PlatformSources;
  /** Platform labels to show as a coverage line — derived by the caller, never counted here. */
  platforms?: string[];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const langs = React.useMemo(() => {
    if (sources) {
      return PLATFORMS.filter((p) => sources[p]).map((p) => ({ key: p as string, label: PLATFORM_DEFINITIONS[p].label, value: sources[p]! }));
    }
    return code ? [{ key: "React", label: PLATFORM_DEFINITIONS.React.label, value: code }] : [];
  }, [code, sources]);

  const [lang, setLang] = React.useState<string>(langs[0]?.key ?? "React");
  const active = langs.find((l) => l.key === lang) ?? langs[0];
  const multi = langs.length > 1;

  return (
    // min-w-0: this is a grid item, and grid items default to min-width:auto — a wide demo would otherwise stretch
    // its track past the viewport and make the whole page scroll sideways on a phone
    <section id={id} className={cn("min-w-0 scroll-mt-28", className)}>
      <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {/*
        The platforms this example really has source for, named one by one. Deliberately not "all platforms":
        KinetixUI has five, and a block with three of them is not on all of them — the precise list is both
        more useful and the only honest phrasing.
      */}
      {platforms && platforms.length > 0 && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="sr-only">Available for: </span>
          {platforms.join(" · ")}
        </p>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <Tabs.Root defaultValue="preview">
          <Tabs.List className="flex items-center gap-1 bg-muted/30 px-2" aria-label={`${title} — preview or source`}>
            {["preview", "code"].map((v) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className={cn(
                  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "data-[state=active]:border-primary data-[state=active]:text-foreground",
                )}
              >
                {v}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="preview">
            <div
              className={cn(
                // wide demos scroll inside their frame; `safe center` keeps overflowing content reachable (plain center
                // would clip its start edge), with `center` as the fallback for browsers without it
                "flex min-h-[280px] w-full items-center justify-center overflow-x-auto border-t border-border bg-background p-8 supports-[justify-content:safe_center]:[justify-content:safe_center]",
                contentClassName,
              )}
            >
              {children}
            </div>
          </Tabs.Content>

          <Tabs.Content value="code">
            <div className="relative border-t border-border bg-muted/40">
              {/*
                A real nested tablist, not a row of plain buttons. The platform switcher used to be bare
                <button>s: no role, no selected state for assistive technology, no arrow-key movement. Radix
                gives all three, and the code panel below is labelled by the selected tab.
              */}
              {multi && (
                <Tabs.Root value={lang} onValueChange={setLang}>
                  <Tabs.List className="flex items-center gap-1 border-b border-border/60 px-3 pt-1.5" aria-label={`${title} — implementation platform`}>
                    {langs.map((l) => (
                      <Tabs.Trigger
                        key={l.key}
                        value={l.key}
                        className={cn(
                          "-mb-px border-b-2 border-transparent px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
                          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          "data-[state=active]:border-primary data-[state=active]:text-foreground",
                        )}
                      >
                        {l.label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </Tabs.Root>
              )}
              {active && (
                <>
                  <CopyButton value={active.value} className={cn("absolute right-3 z-10", multi ? "top-11" : "top-3")} />
                  <pre
                    // a code block scrolls sideways when a long Kotlin or Dart line overflows, so the keyboard
                    // must be able to reach it (WCAG 2.1.1 / axe scrollable-region-focusable)
                    tabIndex={0}
                    aria-label={`${title} — ${active.label} source`}
                    className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <code>{active.value}</code>
                  </pre>
                </>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  );
}
