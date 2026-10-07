"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * The /iot "Explore by task" navigator: one category on screen at a time, with the category bar kept in reach.
 *
 * The page used to be fourteen full-height sections in a row, reached from one list of anchors at the top. A
 * reader who jumped to Pairing was 12,000px from that list and had to scroll back up to change topic. Here the
 * categories are tabs, and the tab list is `position: sticky` under the site header, so changing category is one
 * press from anywhere inside the explorer.
 *
 * What this does and deliberately does not do:
 *
 * - **Tabs, not anchors.** Radix supplies `tablist`/`tab`/`tabpanel`, `aria-selected`, roving focus and arrow
 *   keys (in reading order: `dir` is read after mount, as `LabTabs` does). The active category is the selected
 *   tab, programmatically and visually.
 * - **Every panel is server-rendered.** Panels are `forceMount`ed and the inactive ones carry `hidden`, so the
 *   content is in the HTML for search and for no-JS readers, and a hidden panel's interactive example never
 *   mounts: `LazyPreview` waits for an intersection a hidden element cannot have.
 * - **No scroll hijacking.** Choosing a category moves the page only when the reader is already inside the
 *   explorer, below the start of the panel: the new panel would otherwise open mid-way down. Then the page moves
 *   once, to the panel's first line under the bar. CSS `scroll-behavior` decides how that move looks, and the
 *   site already turns it to instant under `prefers-reduced-motion`.
 * - **Links.** `#<category>` selects a category on load and on `hashchange`, and the section anchors this content
 *   used to have (`#telemetry`, `#pairing`, …) are aliases. Choosing a tab rewrites the hash with `replaceState`,
 *   like `LabTabs`, so Back leaves the page instead of replaying tab presses.
 * - **Header height is measured**, not assumed: the site header wraps to two rows at 200% text, and a bar stuck
 *   at a fixed offset would slide under it.
 */
export type ExplorerCategory = {
  id: string;
  label: string;
  /** Older anchors that should open this category. */
  aliases?: readonly string[];
  panel: React.ReactNode;
};

/** Input that means the reader is scrolling the page themselves. */
const USER_SCROLL = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

export function CategoryExplorer({ categories, label }: { categories: readonly ExplorerCategory[]; label: string }) {
  const ids = React.useMemo(() => categories.map((c) => c.id), [categories]);
  const aliasOf = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) for (const alias of c.aliases ?? []) map.set(alias, c.id);
    return map;
  }, [categories]);
  const [value, setValue] = React.useState(ids[0]!);
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  const [headerHeight, setHeaderHeight] = React.useState<number | null>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const bar = React.useRef<HTMLDivElement>(null);

  /** Bring the start of `id`'s panel to just under the sticky bar, if the reader is past it. */
  const alignPanel = React.useCallback((id: string, always: boolean) => {
    // Measured against where the bar sits once stuck, not where it is now: above the explorer the bar scrolls
    // with the page and the panel is always right under it, so "panel minus bar" would read as already aligned.
    const offsetOf = () => {
      const panel = root.current?.querySelector<HTMLElement>(`[data-category-panel="${id}"]`);
      const el = bar.current;
      if (!panel || !el) return 0;
      const stuckBottom = (parseFloat(getComputedStyle(el).top) || 0) + el.getBoundingClientRect().height;
      return panel.getBoundingClientRect().top - stuckBottom;
    };
    const offset = offsetOf();
    // Inside the explorer and below the panel's start (offset < 0), or arriving from a link: move once.
    if (!(offset < -1 || (always && Math.abs(offset) > 1))) return;
    const target = window.scrollY + offset;
    window.scrollTo({ top: target });
    // An example above the explorer that had not been reached yet (a reader who arrived by a link) mounts while
    // the page scrolls past it and changes height, so the target computed at the start can end up short —
    // measured at 222px. When the scroll ends, finish the same move without animation. No-op otherwise.
    // If the reader takes over the scroll in the meantime, the correction is dropped: it never fights them. Input
    // events catch most of that; a page that ended up far from where this move was going (a scrollbar drag, a
    // script, a find-in-page jump) is the reader's too.
    let done = false;
    const stop = () => {
      done = true;
      window.removeEventListener("scrollend", settle);
      for (const type of USER_SCROLL) window.removeEventListener(type, stop);
    };
    const settle = () => {
      if (done) return;
      stop();
      if (Math.abs(window.scrollY - target) > window.innerHeight / 2) return;
      const rest = offsetOf();
      if (Math.abs(rest) > 2) window.scrollTo({ top: window.scrollY + rest, behavior: "instant" });
    };
    window.addEventListener("scrollend", settle);
    for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true });
    window.setTimeout(settle, 1500);
  }, []);

  /**
   * Keep the chosen tab visible in a list that scrolls sideways on a phone. Scrolls the list only: an element's
   * `scrollIntoView` also starts a scroll on the page, and that new scroll cancels the page's own smooth move to
   * the panel (measured: the page stopped 14px into a 1,300px move).
   */
  const revealTab = React.useCallback((id: string) => {
    const list = bar.current?.querySelector<HTMLElement>('[role="tablist"]');
    const tab = bar.current?.querySelector<HTMLElement>(`[data-category-tab="${id}"]`);
    if (!list || !tab) return;
    const l = list.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const delta = t.left < l.left ? t.left - l.left : t.right > l.right ? t.right - l.right : 0;
    if (delta !== 0) list.scrollBy({ left: delta });
  }, []);

  React.useEffect(() => {
    setDir(document.documentElement.dir === "rtl" ? "rtl" : "ltr");
    const header = document.querySelector<HTMLElement>("body header.sticky, body > div header.sticky, header.sticky");
    let observer: ResizeObserver | undefined;
    if (header && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => setHeaderHeight(header.getBoundingClientRect().height));
      observer.observe(header);
    }
    const fromHash = () => {
      const raw = decodeURIComponent(window.location.hash.slice(1));
      const id = ids.includes(raw) ? raw : aliasOf.get(raw);
      if (!id) return;
      setValue(id);
      // After the panel is visible, so its position is real.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          revealTab(id);
          alignPanel(id, true);
        }),
      );
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      observer?.disconnect();
    };
  }, [ids, aliasOf, alignPanel, revealTab]);

  const select = (next: string) => {
    setValue(next);
    try {
      window.history.replaceState(null, "", `#${next}`);
    } catch {
      /* a sandboxed frame can refuse; the category still changes */
    }
    requestAnimationFrame(() => {
      revealTab(next);
      alignPanel(next, false);
    });
  };

  return (
    <Tabs.Root ref={root} value={value} onValueChange={select} dir={dir}>
      <div
        ref={bar}
        data-category-bar=""
        style={headerHeight === null ? undefined : { top: headerHeight }}
        className={cn(
          "sticky z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
          headerHeight === null && "top-12 md:top-[5.5rem]",
        )}
      >
        <Tabs.List aria-label={label} className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
          {categories.map((category) => (
            <Tabs.Trigger
              key={category.id}
              value={category.id}
              data-category-tab={category.id}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-label-lg text-muted-foreground",
                "transition-colors duration-fast hover:bg-muted hover:text-foreground motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                "data-[state=active]:bg-foreground data-[state=active]:text-background",
              )}
            >
              {category.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {categories.map((category) => (
        <Tabs.Content
          key={category.id}
          value={category.id}
          forceMount
          hidden={value !== category.id}
          data-category-panel={category.id}
          className="pt-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          {/* The stable hook lives inside: the panel's own id is Radix's, and each tab's aria-controls points at it. */}
          <div id={`explore-${category.id}`}>{category.panel}</div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

/**
 * Secondary examples for a category, closed until asked for. A native `<details>`, so it works without
 * JavaScript and needs no ARIA of its own. It opens itself when the URL points at one of its tabs, so an old
 * `#layout-dashboard` link still shows that layout.
 */
export function MoreExamples({
  summary,
  tabIds = [],
  flush = false,
  children,
}: {
  summary: string;
  tabIds?: readonly string[];
  /**
   * Content at the full width of the column, outside the frame: the frame is the summary alone. For content that
   * lays itself out by its own width (a whole environment), where a padded frame would take 34-50px from it.
   */
  flush?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const check = () => {
      if (tabIds.includes(decodeURIComponent(window.location.hash.slice(1)))) setOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [tabIds]);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn("group", !flush && "rounded-xl border border-border bg-card/40")}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
          flush && "border border-border bg-card/40",
        )}
      >
        <span>{summary}</span>
        <span aria-hidden className="text-muted-foreground transition-transform duration-fast group-open:rotate-180 motion-reduce:transition-none">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className={flush ? "pt-6" : "border-t border-border p-4 sm:p-6"}>{children}</div>
    </details>
  );
}
