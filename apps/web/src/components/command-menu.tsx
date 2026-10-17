"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Kbd,
  KbdGroup,
} from "@kinetixui/ui";
import { Blocks, Circle, FileText, Laptop, Moon, Search, Sun, Workflow } from "lucide-react";
import { useTheme } from "next-themes";
import { analytics, type SearchResultType } from "@/lib/analytics";
import { describe, rankCommand } from "@/lib/command-search";
import type { SearchProjection } from "@/lib/search-projection";
import { docsNav, mainNav } from "@/lib/site";

/** "⌘" on Apple platforms, "Ctrl" everywhere else. Resolves after mount to keep
 *  SSR output stable; renders the neutral "Ctrl" until then. */
function useModKey() {
  const [mod, setMod] = React.useState<"⌘" | "Ctrl">("Ctrl");
  React.useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
      navigator.platform ||
      "";
    if (/mac|iphone|ipad|ipod/i.test(platform)) setMod("⌘");
  }, []);
  return mod;
}

/**
 * The library Kbd, at the site's 12px floor for readable compact text (`check:web-quality`'s type check). Kbd's
 * own size is the library's 11px label step, which is right inside a component preview but below what this
 * site holds its chrome to; `text-label-md` is the next step of the same scale.
 */
function Key(props: React.ComponentProps<typeof Kbd>) {
  return <Kbd {...props} className="text-label-md" />;
}

/**
 * The blocks, use cases and component business terms, from the static `/search-index.json` (lib/search-projection.ts),
 * fetched once — when the reader first reaches for the menu — so no page's JavaScript carries them. Until it arrives,
 * or if it never does, the menu is exactly what it was: navigation, docs and theme.
 */
let projection: Promise<SearchProjection | null> | null = null;
function loadProjection(): Promise<SearchProjection | null> {
  projection ??= fetch("/search-index.json")
    .then((r) => (r.ok ? (r.json() as Promise<SearchProjection>) : null))
    .catch(() => {
      projection = null; // let the next open try again
      return null;
    });
  return projection;
}
/** Test seam: forget a loaded projection. */
export function resetSearchProjectionForTests() {
  projection = null;
}

function useSearchProjection(open: boolean) {
  const [data, setData] = React.useState<SearchProjection | null>(null);
  React.useEffect(() => {
    if (!open || data) return;
    let live = true;
    void loadProjection().then((p) => {
      if (live && p) setData(p);
    });
    return () => {
      live = false;
    };
  }, [open, data]);
  return data;
}

type CommandItemData = {
  value: string;
  title: string;
  subtitle?: string;
  keywords: string[];
  icon: React.ReactNode;
  /** the kind of destination, for `search_result_selected` — never the title or URL */
  type: SearchResultType;
  run: () => void;
};
type CommandGroupData = { heading: string; items: CommandItemData[] };

/**
 * Keeps `aria-activedescendant` on the input and the listbox pointing at the highlighted result.
 *
 * cmdk 1.1 records the highlighted item's id one step late: after a query change the attribute was either missing
 * (the first result was never announced to a screen reader) or, once results remount as the menu reorders them, the
 * id of an element that no longer exists, which axe reports as `aria-valid-attr-value`. The highlight itself
 * (`aria-selected`) is right, so this follows it.
 */
function useActiveDescendant(list: HTMLElement | null) {
  React.useEffect(() => {
    const input = list?.closest("[cmdk-root]")?.querySelector<HTMLElement>("[cmdk-input]");
    if (!list || !input) return;
    const sync = () => {
      const id = list.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]')?.id;
      for (const el of [input, list]) {
        if (id && el.getAttribute("aria-activedescendant") !== id) el.setAttribute("aria-activedescendant", id);
        else if (!id && el.hasAttribute("aria-activedescendant")) el.removeAttribute("aria-activedescendant");
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-activedescendant"] });
    return () => observer.disconnect();
  }, [list]);
}

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(open);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);
  const mod = useModKey();
  const extra = useSearchProjection(open);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        // Not over another open dialog, such as the mobile menu: two stacked modals fight over focus, and closing
        // this one handed focus to its trigger in the header behind the other, which that dialog hides from AT.
        if (!openRef.current && document.querySelector('[role="dialog"][data-state="open"]')) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = React.useCallback((item: Pick<CommandItemData, "type" | "run">) => {
    setOpen(false);
    analytics.track("search_result_selected", { target: item.type, source: "header", location: "command_menu" });
    item.run();
  }, []);

  const [query, setQuery] = React.useState("");
  const [list, setList] = React.useState<HTMLDivElement | null>(null);
  useActiveDescendant(list);
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  /*
    Every destination as data, so the groups can be ordered by their best match. cmdk ranks the items inside a group
    with `rankCommand`, but its own group reordering does not take effect here (measured: an exact "Commerce" use case
    stayed below two blocks that only mention commerce), and the first item is the one Enter runs. So a group with an
    exact match moves up; with no query the order is the familiar one. Every item has a unique `value` (two groups may
    share a title) and its title as `keywords[0]`, which is what `rankCommand` ranks on.
  */
  const groups = React.useMemo((): CommandGroupData[] => {
    const go = (href: string) => () => router.push(href);
    const list: CommandGroupData[] = [
      { heading: "Links", items: mainNav.map((i) => ({ value: `link:${i.href}`, title: i.title, keywords: [i.title], icon: <Circle />, type: "link" as const, run: go(i.href) })) },
      ...docsNav.map((g) => ({
        heading: g.title,
        items: g.items.map((i) => ({
          value: `docs:${i.href}`,
          title: i.title,
          keywords: [i.title, ...(extra?.componentKeywords[i.href] ?? [])],
          icon: <FileText />,
          type: (i.href.startsWith("/docs/components/") ? "component" : "docs") as SearchResultType,
          run: go(i.href),
        })),
      })),
      ...(extra
        ? [
            { heading: "Blocks", entries: extra.blocks, icon: <Blocks /> },
            { heading: "Use cases", entries: extra.useCases, icon: <Workflow /> },
          ].map((g) => ({
            heading: g.heading,
            items: g.entries.map((e) => ({
              value: e.id,
              title: e.title,
              subtitle: `${e.context} · ${e.description}`,
              keywords: [e.title, e.context, ...e.keywords, describe(e.description)],
              icon: g.icon,
              type: (e.type === "use-case" ? "use_case" : e.type) as SearchResultType,
              run: go(e.href),
            })),
          }))
        : []),
      {
        heading: "Theme",
        items: (
          [
            ["light", "Light", <Sun key="i" />],
            ["dark", "Dark", <Moon key="i" />],
            ["system", "System", <Laptop key="i" />],
          ] as const
        ).map(([id, title, icon]) => ({ value: `theme:${id}`, title, keywords: [title, "theme"], icon, type: "theme" as const, run: () => setTheme(id) })),
      },
    ];
    const nonEmpty = list.filter((g) => g.items.length > 0);
    if (!query.trim()) return nonEmpty;
    const best = (g: CommandGroupData) => Math.max(...g.items.map((i) => rankCommand(i.value, query, i.keywords)));
    return nonEmpty
      .map((g, order) => ({ g, order, score: best(g) }))
      .sort((x, y) => y.score - x.score || x.order - y.order)
      .map((x) => x.g);
  }, [extra, query, router, setTheme]);

  // The library CommandDialog: a Radix modal that traps Tab, makes the page behind inert, closes on Esc (which the
  // footer below promises), carries the dialog's name and returns focus to the trigger on close — the trigger is
  // passed in so that it is the dialog's own, which is what focus returns to after ⌘K as well as after a click.
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search the docs"
      commandProps={{ label: "Command menu", filter: rankCommand }}
      trigger={
        /*
          One trigger at every width. Below `sm` it collapses to a square icon button rather than being hidden: phones
          had no site search at all, and a second trigger would have meant a second instance of this component and a
          second global ⌘K listener, which toggles the dialog twice. The visible text becomes `sr-only` instead of
          being removed, so the accessible name starts with the same "Search…" at every width (the shortcut keys join
          it where they are shown, so the name always contains the visible label).
        */
        <Button
          variant="Outline"
          size="sm"
          className="kx-hit size-9 p-0 text-body-md font-normal text-muted-foreground sm:h-9 sm:w-56 sm:justify-start sm:gap-2 sm:px-3"
          // start fetching the search projection as soon as the reader heads for the menu
          onPointerEnter={() => void loadProjection()}
          onFocus={() => void loadProjection()}
        >
          <Search aria-hidden />
          <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-start">Search…</span>
          <KbdGroup className="pointer-events-none hidden sm:inline-flex">
            <Key>{mod}</Key>
            <Key>K</Key>
          </KbdGroup>
        </Button>
      }
    >
      <CommandInput placeholder="Type a command or search…" value={query} onValueChange={setQuery} />
      <CommandList ref={setList}>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.heading} heading={g.heading}>
            {g.items.map((item) => (
              // cmdk reads `keywords` when an item mounts, so the key changes once when the projection's business
              // terms arrive, and the component items re-register with them
              <CommandItem key={`${item.value}${extra ? ":terms" : ""}`} value={item.value} keywords={item.keywords} onSelect={() => run(item)}>
                {item.icon}
                {item.subtitle ? (
                  <span className="flex min-w-0 flex-col">
                    <span>{item.title}</span>
                    <span className="text-body-sm text-muted-foreground">{item.subtitle}</span>
                  </span>
                ) : (
                  item.title
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-body-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <KbdGroup>
            <Key>↑</Key>
            <Key>↓</Key>
          </KbdGroup>
          to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Key>↵</Key>
          to select
        </span>
        <span className="flex items-center gap-1.5">
          <Key>Esc</Key>
          to close
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          <KbdGroup>
            <Key>{mod}</Key>
            <Key>K</Key>
          </KbdGroup>
          or
          <Key>/</Key>
        </span>
      </div>
    </CommandDialog>
  );
}
