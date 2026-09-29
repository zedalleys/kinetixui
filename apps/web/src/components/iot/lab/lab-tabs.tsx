"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { preloadPreview } from "@/components/iot/lazy-preview";
import { cn } from "@/lib/utils";

/**
 * Accessible tabs for the lab: one panel rendered at a time, deep-linkable by `#<tab id>`.
 *
 * Radix `Tabs` supplies the roles, roving tabindex, arrow-key handling and `aria-controls` wiring; this
 * component supplies the parts Radix does not:
 *
 * - **One at a time.** An inactive panel is not mounted, so an interactive example does not hydrate or run its
 *   timers until its tab is opened. The panels arrive as already-rendered nodes from the server page, so a
 *   static example costs no client JavaScript at all.
 * - **Deep links.** `#agritech` selects that tab on load and on `hashchange`, and choosing a tab rewrites the
 *   hash with `replaceState` so the back button is not filled with tab presses. No hash means the first tab.
 * - **Direction.** Radix reads `dir` to decide which arrow key moves which way. The document's direction is read
 *   after mount, so a right-to-left page gets arrows that follow the reading order rather than fighting it.
 * - **Prefetch on intent.** A tab with `preload` starts fetching its example's chunk on hover or focus, so the
 *   click usually finds it already in cache. The example itself still mounts only when the panel opens.
 * - **An optional disclosure per panel.** `disclosure` renders inside every panel. The environments do not use
 *   it: each example carries its own SIMULATION notice (and its placeholder does before it mounts), so a second
 *   box in the panel header would say the same thing twice.
 */
export type LabTab = {
  id: string;
  label: string;
  /** One line at the top of the panel. */
  summary?: string;
  /** Small mono line, e.g. the hierarchy the environment uses. */
  meta?: string;
  /** An example slug whose chunk to start fetching when the tab is hovered or focused. */
  preload?: string;
  panel: React.ReactNode;
};

export function LabTabs({
  tabs,
  label,
  disclosure,
  className,
}: {
  tabs: readonly LabTab[];
  /** Names the tab list for assistive technology. */
  label: string;
  disclosure?: string;
  className?: string;
}) {
  const ids = React.useMemo(() => tabs.map((t) => t.id), [tabs]);
  const [value, setValue] = React.useState(ids[0]!);
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDir(document.documentElement.dir === "rtl" ? "rtl" : "ltr");
    const fromHash = (scroll: boolean) => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!ids.includes(id)) return;
      setValue(id);
      if (scroll) root.current?.scrollIntoView({ block: "start" });
    };
    fromHash(true);
    const onHash = () => fromHash(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [ids]);

  const select = (next: string) => {
    setValue(next);
    try {
      window.history.replaceState(null, "", `#${next}`);
    } catch {
      /* a sandboxed frame can refuse; the tab still changes */
    }
  };

  return (
    <Tabs.Root ref={root} value={value} onValueChange={select} dir={dir} className={cn("scroll-mt-20", className)}>
      <Tabs.List aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            onPointerEnter={tab.preload ? () => preloadPreview(tab.preload!) : undefined}
            onFocus={tab.preload ? () => preloadPreview(tab.preload!) : undefined}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((tab) => (
        <Tabs.Content
          key={tab.id}
          value={tab.id}
          className="mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          {tab.meta || tab.summary ? (
            <div className="flex flex-col gap-1">
              {tab.meta ? <p className="font-mono text-xs text-muted-foreground">{tab.meta}</p> : null}
              {tab.summary ? <p className="max-w-2xl text-sm text-muted-foreground">{tab.summary}</p> : null}
            </div>
          ) : null}
          {disclosure ? (
            <p
              data-simulation-disclosure=""
              className="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            >
              <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-px text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
                Simulation
              </span>
              <span>{disclosure}</span>
            </p>
          ) : null}
          <div className={tab.meta || tab.summary || disclosure ? "mt-4" : undefined}>{tab.panel}</div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
