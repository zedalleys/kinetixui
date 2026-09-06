"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { componentDocs } from "@/lib/site";
import { CATEGORY_ORDER, PRIMITIVE, categoryOf } from "@/lib/component-registry";
import { SectionHead } from "@/components/section-head";
import { demoRegistry } from "@/registry/demos";

const slugOf = (href: string) => href.split("/").pop() ?? "";

/**
 * Demos that can't render as a decorative thumbnail inside this card's own
 * <Link>. Two different reasons land a slug here:
 *  - command / combobox / chart: their libraries move the viewport on mount
 *    (cmdk calls `scrollIntoView` on its first item; recharts'
 *    `accessibilityLayer` focuses its <svg>) — harmless in a real, in-view
 *    preview, but scrolls a below-the-fold card into view.
 *  - breadcrumb / pagination / footer: the demo itself renders real <a href>
 *    elements, which nest an <a> inside this card's <a> — invalid HTML that
 *    Chrome silently "fixes" by closing the outer anchor early, so the
 *    server-rendered markup no longer matches what React expects on the
 *    client → a hydration mismatch on every load of /components.
 * Render a plain label for these instead of the live demo.
 */
const NO_LIVE_THUMBNAIL = new Set([
  "command",
  "combobox",
  "chart",
  "breadcrumb",
  "pagination",
  "footer",
  "table-of-contents",
]);

type Item = (typeof componentDocs)[number] & { slug: string; category: string; primitive?: string };

const ITEMS: Item[] = componentDocs.map((item) => {
  const slug = slugOf(item.href);
  return { ...item, slug, category: categoryOf(slug), primitive: PRIMITIVE[slug] };
});

const CATEGORY_COUNT: Record<string, number> = ITEMS.reduce(
  (acc, it) => ((acc[it.category] = (acc[it.category] ?? 0) + 1), acc),
  {} as Record<string, number>,
);

function Thumbnail({ item }: { item: Item }) {
  const Demo = NO_LIVE_THUMBNAIL.has(item.slug)
    ? undefined
    : demoRegistry[`${item.slug}-demo`]?.component;

  return (
    <div className="relative h-[176px] overflow-hidden border-b border-border/60 bg-muted/20">
      {Demo ? (
        <div
          // decorative preview: keep it out of the a11y tree and make the whole
          // subtree non-focusable so nested widgets (e.g. a recharts
          // `accessibilityLayer` svg) can't grab focus and scroll the card into
          // view on mount.
          ref={(el) => {
            if (el) el.inert = true;
          }}
          aria-hidden
          className="pointer-events-none absolute inset-0 flex origin-center scale-[0.7] items-center justify-center px-4"
        >
          <Demo />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {item.title}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
      <span className="pointer-events-none absolute left-2 top-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/50">
        {item.slug}
      </span>
    </div>
  );
}

function Card({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors",
        "hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Thumbnail item={item} />
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.title}</span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            {item.primitive ?? item.category}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

const catButton = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );

export function ComponentGallery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = React.useState(params.get("q") ?? "");
  const activeCat = params.get("cat");

  // debounce the search term into the URL so a filtered view is shareable and
  // Back/Forward restore it, without a history entry per keystroke.
  const searchRef = React.useRef<HTMLInputElement>(null);

  // debounce the typed term into the URL (shareable, Back/Forward-restorable)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      const qs = next.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      if (target !== `${pathname}${window.location.search}`) {
        router.replace(target, { scroll: false });
      }
    }, 140);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // keep the input in sync when the URL changes from outside (Back/Forward,
  // a shared link, "Clear filters") — otherwise the field goes stale.
  const urlQuery = params.get("q") ?? "";
  React.useEffect(() => {
    setQuery((cur) => (cur.trim() === urlQuery.trim() ? cur : urlQuery));
  }, [urlQuery]);

  const setCat = (cat: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (cat) next.set("cat", cat);
    else next.delete("cat");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  };

  const q = query.trim().toLowerCase();
  const filtered = ITEMS.filter((it) => {
    if (activeCat && it.category !== activeCat) return false;
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      it.slug.includes(q) ||
      (it.primitive?.toLowerCase().includes(q) ?? false) ||
      it.category.toLowerCase().includes(q)
    );
  });

  const grouped = !q && !activeCat;
  const isFiltered = Boolean(q || activeCat);

  return (
    <>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {ITEMS.length} components across {CATEGORY_ORDER.length} categories — built from Figma,
        styled against the token contract, distributed through the kinetixui registry. React,
        SwiftUI, Jetpack Compose and Flutter snippets ship with every one.
      </p>

      {/* filter bar */}
      <div
        className={cn(
          "sticky top-12 z-30 -mx-4 mt-8 border-b border-border bg-background/95 px-4 py-3 backdrop-blur",
          "supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 md:top-[5.5rem] lg:-mx-8 lg:px-8",
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="component-search" className="sr-only">
              Filter components by name, primitive or category
            </label>
            <div
              className={cn(
                "group/search relative flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-background px-2.5 sm:max-w-xs",
                "transition-colors focus-within:border-primary focus-within:shadow-focus",
              )}
            >
              <Search
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within/search:text-primary"
              />
              <input
                id="component-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search components…"
                className={cn(
                  "peer h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                  "[&::-webkit-search-cancel-button]:appearance-none",
                )}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              )}
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={clearAll}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <X aria-hidden className="size-3.5" />
                Clear all
              </button>
            )}
          </div>

          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={!activeCat}
              onClick={() => setCat(null)}
              className={catButton(!activeCat)}
            >
              All <span className="opacity-60">{ITEMS.length}</span>
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={activeCat === cat}
                onClick={() => setCat(activeCat === cat ? null : cat)}
                className={catButton(activeCat === cat)}
              >
                {cat} <span className="opacity-60">{CATEGORY_COUNT[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-4 font-mono text-[11px] text-muted-foreground">
        {filtered.length === ITEMS.length
          ? `${ITEMS.length} components`
          : `${filtered.length} of ${ITEMS.length} components`}
        {activeCat ? ` · ${activeCat}` : ""}
        {q ? ` · “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No components match{q ? ` “${query.trim()}”` : ""}
            {activeCat ? ` in ${activeCat}` : ""}.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear filters
          </button>
        </div>
      ) : grouped ? (
        <div className="mt-6 space-y-12">
          {CATEGORY_ORDER.map((cat, i) => {
            const rows = filtered.filter((it) => it.category === cat);
            if (rows.length === 0) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${i}`}>
                <SectionHead
                  index={String(i + 1).padStart(2, "0")}
                  label={cat}
                  meta={`${rows.length} components`}
                />
                <h2 id={`cat-${i}`} className="sr-only">
                  {cat}
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((item) => (
                    <Card key={item.href} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.href} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
