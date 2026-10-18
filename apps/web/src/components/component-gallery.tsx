"use client";

import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Toggle } from "@kinetixui/ui";
import { PlatformLogo } from "./platform-logo";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@kinetixui/ui";
import { cn } from "@/lib/utils";
import { componentDocs } from "@/lib/site";
import { CATEGORY_ORDER, PRIMITIVE, categoryOf } from "@/lib/component-registry";
import {
  NATIVE_PLATFORMS,
  PLATFORMS,
  PLATFORM_ABBR,
  PLATFORM_DEFINITIONS,
  isOnPlatform,
  countOnPlatform,
} from "@/lib/platform-parity";
import { componentCount, componentTotal, recipes } from "@/lib/platform-support";
import { fullCoverageCount } from "@/lib/project-stats";
import { STATUS } from "@/lib/component-status";
import { PlatformBadges } from "@/components/platform-badges";
import { SectionHead } from "@/components/section-head";
import { demoRegistry } from "@/registry/demos";
import { THUMBNAIL_MOCKS } from "@/components/component-thumbnails";
import type { CatalogueFacets, FacetOption } from "@/lib/business-discovery";
import { platformChipLabel, resolveFacetParam, resolvePlatformParam } from "@/lib/catalogue-filters";

// re-exported: the filter helpers moved to lib/catalogue-filters.ts so /blocks can share them without this module
export { platformChipLabel, resolveFacetParam, resolvePlatformParam };

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

type Item = (typeof componentDocs)[number] & {
  slug: string;
  category: string;
  primitive?: string;
  status?: "beta" | "deprecated";
};

const ITEMS: Item[] = componentDocs.map((item) => {
  const slug = slugOf(item.href);
  return { ...item, slug, category: categoryOf(slug), primitive: PRIMITIVE[slug], status: STATUS[slug] };
});

const BETA_COUNT = ITEMS.filter((it) => it.status === "beta").length;

const CATEGORY_COUNT: Record<string, number> = ITEMS.reduce(
  (acc, it) => ((acc[it.category] = (acc[it.category] ?? 0) + 1), acc),
  {} as Record<string, number>,
);

const ALL_SLUGS = ITEMS.map((it) => it.slug);
const PLATFORM_COUNT: Record<string, number> = Object.fromEntries(
  PLATFORMS.map((p) => [p, countOnPlatform(ALL_SLUGS, p)]),
);

/**
 * Coverage wording for the intro, read from the generated platform data rather than typed: which native libraries
 * exist, and the tag row exactly as the cards draw it. Not every entry is on every platform, so the intro says how
 * many are (`fullCoverageCount`) instead of promising snippets "with every one".
 */
const NATIVE_LABELS = NATIVE_PLATFORMS.map((p) => PLATFORM_DEFINITIONS[p].label);
const NATIVE_SENTENCE =
  NATIVE_LABELS.length > 1
    ? `${NATIVE_LABELS.slice(0, -1).join(", ")} and ${NATIVE_LABELS.at(-1)}`
    : NATIVE_LABELS.join("");
const ABBR_ROW = PLATFORMS.map((p) => PLATFORM_ABBR[p]).join(" ");
/** "Angular (preview) implements 64 so far" — the platforms still rolling out, named rather than left to a tag. */
const ROLLING_OUT = PLATFORMS.filter((p) => !PLATFORM_DEFINITIONS[p].catalogComplete).map(
  (p) =>
    `${PLATFORM_DEFINITIONS[p].label} (${PLATFORM_DEFINITIONS[p].maturity}) implements ${countOnPlatform(ALL_SLUGS, p)} so far`,
);

function Thumbnail({ item }: { item: Item }) {
  // A hand-built static mock wins over everything — portal components (dialog,
  // sheet, menus…) and near-empty demos (table, chart, image…) don't read as a
  // decorative thumbnail otherwise.
  const Mock = THUMBNAIL_MOCKS[item.slug];
  const Demo = Mock || NO_LIVE_THUMBNAIL.has(item.slug) ? undefined : demoRegistry[`${item.slug}-demo`]?.component;

  return (
    <div
      data-gallery-thumbnail={Mock ? "mock" : Demo ? "demo" : "label"}
      className="relative h-[184px] overflow-hidden border-b border-border/60 bg-muted/20 bg-[radial-gradient(hsl(var(--border)/0.45)_1px,transparent_1px)] [background-size:16px_16px]"
    >
      {Mock ? (
        <div
          aria-hidden
          data-gallery-thumbnail-body
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 transition-transform duration-300 motion-safe:group-hover:scale-[1.04]"
        >
          <Mock />
        </div>
      ) : Demo ? (
        <div
          // decorative preview: keep it out of the a11y tree and make the whole
          // subtree non-focusable so nested widgets (e.g. a recharts
          // `accessibilityLayer` svg) can't grab focus and scroll the card into
          // view on mount.
          ref={(el) => {
            if (el) el.inert = true;
          }}
          aria-hidden
          data-gallery-thumbnail-body
          className="pointer-events-none absolute inset-0 flex origin-center scale-[0.72] items-center justify-center px-4 transition-transform duration-300 motion-safe:group-hover:scale-[0.76]"
        >
          <Demo />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {item.title}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/80 to-transparent" />
      {/* The slug repeats the title printed under the thumbnail, so it stays out of the card link's name. */}
      <span
        aria-hidden
        className="pointer-events-none absolute start-2.5 top-2.5 max-w-[calc(100%-1.25rem)] truncate rounded bg-background px-1.5 py-0.5 font-mono text-label-md tracking-[0.14em] text-muted-foreground"
      >
        {item.slug}
      </span>
    </div>
  );
}

function Card({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      data-gallery-card={item.slug}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-1",
        "hover:border-primary/50 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {/* accent edge that wipes in on hover/focus */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 rtl:origin-right bg-primary transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
      <Thumbnail item={item} />
      {/* flex-wrap: at 320px and 200% text the arrow (2rem, so 64px) drops under the text instead of squeezing the
          title and the platform tags into a column one tag wide */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="block truncate font-medium">{item.title}</span>
            {item.status && (
              <span
                data-gallery-status
                className={cn(
                  "shrink-0 rounded border px-1 font-mono text-label-md uppercase tracking-[0.1em]",
                  item.status === "deprecated" ? "border-destructive/40 text-destructive" : "border-info/40 text-info",
                )}
              >
                {item.status}
              </span>
            )}
          </span>
          <span
            data-gallery-primitive
            className="mt-1 inline-block max-w-full truncate rounded border border-border/70 px-1.5 py-0.5 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground"
          >
            {item.primitive ?? item.category}
          </span>
          <PlatformBadges slug={item.slug} className="mt-2" />
        </span>
        <span
          aria-hidden
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground",
            "transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground",
          )}
        >
          <ArrowRight className="size-4 rtl:-scale-x-100 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

type BusinessKey = "capability" | "domain" | "layer";

/**
 * The /components catalogue.
 *
 * `facets` is the business-discovery projection the server page passes in (`catalogueFacets()`): which capability
 * groups, business domains and layers each entry belongs to, derived from docs/business-capabilities.json. It is a
 * prop rather than an import so the ~90 KB discovery index never ships to the browser.
 *
 * Filtering is progressive. Search, category, platform and status are always in view; capability, domain and layer
 * sit behind "Business filters", which opens by itself when a link arrives with one of them set. Every filter is a
 * query parameter on /components, whose canonical stays `/components` (check:seo `canonical-query`), so no filtered
 * view becomes a page of its own.
 */
export function ComponentGallery({ facets }: { facets: CatalogueFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = React.useState(params.get("q") ?? "");
  const BUSINESS_COUNT = React.useMemo(() => {
    const count = (pick: (b: CatalogueFacets["bySlug"][string]) => string[]) =>
      ITEMS.reduce(
        (acc, it) => {
          const b = facets.bySlug[it.slug];
          if (b) for (const id of pick(b)) acc[id] = (acc[id] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    return {
      capability: count((b) => b.capabilities),
      domain: count((b) => b.domains),
      layer: count((b) => [b.layer]),
    };
  }, [facets]);
  const activeCat = params.get("cat");
  const activePlatform = resolvePlatformParam(params.get("platform"));
  const activePlatformLabel = activePlatform ? PLATFORM_DEFINITIONS[activePlatform].label : null;
  const activeStatus = params.get("status") === "beta" ? "beta" : null;
  const activeCapability = resolveFacetParam(params.get("capability"), facets.capabilities);
  const activeDomain = resolveFacetParam(params.get("domain"), facets.domains);
  const activeLayer = resolveFacetParam(params.get("layer"), facets.layers);
  const businessActive = Boolean(activeCapability || activeDomain || activeLayer);
  const [businessOpen, setBusinessOpen] = React.useState(businessActive);
  // a link or Back/Forward that lands with a business filter set opens the group, so the active chip is in view
  React.useEffect(() => {
    if (businessActive) setBusinessOpen(true);
  }, [businessActive]);

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

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const setCat = (cat: string | null) => setParam("cat", cat);
  const setPlatform = (p: string | null) => setParam("platform", p);
  const setStatus = (s: "beta" | null) => setParam("status", s);
  const setBusiness = (key: BusinessKey, value: string | null) => setParam(key, value);

  const clearAll = () => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  };

  const q = query.trim().toLowerCase();
  const filtered = ITEMS.filter((it) => {
    const biz = facets.bySlug[it.slug];
    if (activeCat && it.category !== activeCat) return false;
    if (activePlatform && !isOnPlatform(it.slug, activePlatform)) return false;
    if (activeStatus && it.status !== activeStatus) return false;
    if (activeCapability && !biz?.capabilities.includes(activeCapability.id)) return false;
    if (activeDomain && !biz?.domains.includes(activeDomain.id)) return false;
    if (activeLayer && biz?.layer !== activeLayer.id) return false;
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      it.slug.includes(q) ||
      (it.primitive?.toLowerCase().includes(q) ?? false) ||
      it.category.toLowerCase().includes(q) ||
      // a reader who searches for the job ("checkout", "booking") rather than the part finds the parts
      (biz?.terms.includes(q) ?? false)
    );
  });

  const grouped = !q && !activeCat && !activePlatform && !activeStatus && !businessActive;
  const isFiltered = Boolean(q || activeCat || activePlatform || activeStatus || businessActive);
  // The chip filters (not the search box) are what fold into the phone sheet, so that is what the badge counts.
  const facetCount = [activeCat, activePlatform, activeStatus, activeCapability, activeDomain, activeLayer].filter(Boolean).length;

  /** The active filters, each with its own remove button, so the state is readable and undoable one at a time. */
  const activeChips: { key: string; group: string; label: string; clear: () => void }[] = [
    ...(activeCat ? [{ key: "cat", group: "Category", label: activeCat, clear: () => setCat(null) }] : []),
    ...(activePlatform
      ? [{ key: "platform", group: "Platform", label: activePlatformLabel!, clear: () => setPlatform(null) }]
      : []),
    ...(activeStatus ? [{ key: "status", group: "Status", label: "Beta", clear: () => setStatus(null) }] : []),
    ...(activeCapability
      ? [{ key: "capability", group: "Capability", label: activeCapability.label, clear: () => setBusiness("capability", null) }]
      : []),
    ...(activeDomain
      ? [{ key: "domain", group: "Business domain", label: activeDomain.label, clear: () => setBusiness("domain", null) }]
      : []),
    ...(activeLayer ? [{ key: "layer", group: "Layer", label: activeLayer.label, clear: () => setBusiness("layer", null) }] : []),
  ];

  const businessGroup = (key: BusinessKey, label: string, options: FacetOption[], active: FacetOption | null) => (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-1.5 coarse:gap-2">
      <span className="me-0.5 font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {options.map((o) => {
        const on = active?.id === o.id;
        return (
          <Toggle
            key={o.id}
            pressed={on}
            onClick={() => setBusiness(key, on ? null : o.id)}
            variant="pill"
            className="font-mono uppercase tracking-[0.12em]"
          >
            {o.label} <span className="tabular-nums">{BUSINESS_COUNT[key][o.id] ?? 0}</span>
          </Toggle>
        );
      })}
    </div>
  );
  const businessGroups = (
    <>
      {businessGroup("capability", "Capability", facets.capabilities, activeCapability)}
      {businessGroup("domain", "Business domain", facets.domains, activeDomain)}
      {businessGroup("layer", "Layer", facets.layers, activeLayer)}
    </>
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // One set of chips, rendered inline from md up and inside the sheet below it. The sheet's content only mounts
  // while it is open, and the inline copy is `display: none` on phones, so a screen reader never meets both.
  const facetGroups = (
    <>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5 coarse:gap-2">
        <Toggle
          pressed={!activeCat}
          onClick={() => setCat(null)}
          variant="pill"
          className="font-mono uppercase tracking-[0.12em]"
        >
          All <span className="tabular-nums">{ITEMS.length}</span>
        </Toggle>
        {CATEGORY_ORDER.map((cat) => (
          <Toggle
            key={cat}
            pressed={activeCat === cat}
            onClick={() => setCat(activeCat === cat ? null : cat)}
            variant="pill"
            className="font-mono uppercase tracking-[0.12em]"
          >
            {cat} <span className="tabular-nums">{CATEGORY_COUNT[cat] ?? 0}</span>
          </Toggle>
        ))}
      </div>

      <div role="group" aria-label="Filter by platform" className="flex flex-wrap items-center gap-1.5 coarse:gap-2">
        <span className="me-0.5 font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">
          Platform
        </span>
        {PLATFORMS.map((p) => {
          const on = activePlatform === p;
          return (
            <Toggle
              key={p}
              pressed={on}
              leadingIcon={<PlatformLogo platform={p} />}
              onClick={() => setPlatform(on ? null : p)}
              variant="pill"
              className="font-mono uppercase tracking-[0.12em]"
              title={`Components implemented in the ${PLATFORM_DEFINITIONS[p].label} library`}
            >
              {platformChipLabel(p)} <span className="tabular-nums">{PLATFORM_COUNT[p] ?? 0}</span>
            </Toggle>
          );
        })}
        {BETA_COUNT > 0 && (
          <Toggle
            pressed={activeStatus === "beta"}
            onClick={() => setStatus(activeStatus === "beta" ? null : "beta")}
            variant="pill"
            className="font-mono uppercase tracking-[0.12em]"
            title="Components new this release"
          >
            Beta <span className="tabular-nums">{BETA_COUNT}</span>
          </Toggle>
        )}
      </div>
    </>
  );

  return (
    <>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {componentTotal} catalogue entries — {componentCount} components and {recipes.length} documented{" "}
        {recipes.length === 1 ? "recipe" : "recipes"} — across {CATEGORY_ORDER.length} categories, built from Figma,
        styled against the token contract, distributed through the kinetixui registry. Each one ships React source;{" "}
        {fullCoverageCount} of {componentTotal} also have {NATIVE_SENTENCE} implementations, and their snippets appear
        on the component page.{" "}
        {ROLLING_OUT.length > 0 && <>{ROLLING_OUT.join("; ")}, and its catalogue is still rolling out. </>}
        The <span className="font-mono text-label-md uppercase tracking-[0.1em]">{ABBR_ROW}</span> tags on each card
        mark which libraries carry it today.
      </p>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Looking for a job rather than a part? Search for it (“checkout”, “booking”) or{" "}
        <Link href="/capabilities" className="text-foreground underline underline-offset-4 hover:text-primary">
          browse by business need
        </Link>
        .
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
            {/* 44px on a touch screen: the clear button lives inside this clipped box, so the box is its hit area's ceiling */}
            <InputGroup className="h-9 flex-1 coarse:h-11 sm:max-w-xs">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="component-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search components…"
                className="py-0 text-sm [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <InputGroupButton
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="kx-hit"
                >
                  <X aria-hidden />
                </InputGroupButton>
              )}
            </InputGroup>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="Outline"
                  aria-label={facetCount > 0 ? `Filters, ${facetCount} active` : "Filters"}
                  className={cn("kx-hit gap-1.5 md:hidden", facetCount > 0 && "border-primary")}
                >
                  <SlidersHorizontal aria-hidden className="size-4" />
                  <span>Filters</span>
                  {facetCount > 0 && (
                    <span
                      aria-hidden
                      className="grid min-w-5 place-items-center rounded-full bg-primary px-1 font-mono text-label-md tabular-nums text-primary-foreground"
                    >
                      {facetCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl md:hidden">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Category, platform and status, then capability, business domain and layer. Results update as you choose.
                </SheetDescription>
                <div className="mt-4 flex flex-col gap-4">{facetGroups}</div>
                <h3 className="mt-6 font-mono text-label-md uppercase tracking-[0.12em] text-foreground">Business filters</h3>
                <div className="mt-3 flex flex-col gap-4">{businessGroups}</div>
                <div className="mt-6 flex items-center gap-2">
                  <Button onClick={() => setSheetOpen(false)} className="flex-1">
                    Show {filtered.length} {filtered.length === 1 ? "component" : "components"}
                  </Button>
                  {isFiltered && (
                    <Button variant="Ghost" onClick={clearAll}>
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            {isFiltered && (
              <Button variant="Ghost" onClick={clearAll} className="hidden md:inline-flex">
                <X aria-hidden />
                Clear all
              </Button>
            )}
          </div>

          <div className="hidden flex-col gap-3 md:flex">{facetGroups}</div>
        </div>
      </div>

      {/* Below the sticky bar, not in it: opened, the three business groups are several rows of chips, and a sticky
          bar that tall would cover the results it filters. They scroll away with the intro; the active-filter chips
          and the status line below always say what is applied. */}
      <Collapsible open={businessOpen} onOpenChange={setBusinessOpen} className="mt-3 hidden md:block">
        <CollapsibleTrigger asChild>
          <Button variant="Ghost" className="font-mono uppercase tracking-[0.12em]">
            <ChevronDown aria-hidden className={cn("motion-safe:transition-transform", businessOpen && "rotate-180")} />
            Business filters
            {businessActive && (
              <span className="normal-case tracking-normal">
                ({[activeCapability, activeDomain, activeLayer].filter(Boolean).length} active)
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 flex flex-col gap-3">
          {businessGroups}
        </CollapsibleContent>
      </Collapsible>
      {activeChips.length > 0 && (
        <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <li key={c.key} className="min-w-0 max-w-full">
              {/* The whole chip is the remove button, as before: a Tag's separate dismiss icon is a far smaller target.
                  It wraps inside the row at large text instead of pushing the page sideways. */}
              <Button
                variant="Outline"
                onClick={c.clear}
                aria-label={`Remove filter ${c.group}: ${c.label}`}
                className="h-auto max-w-full flex-wrap justify-start whitespace-normal text-start"
              >
                <span className="text-muted-foreground">{c.group}:</span> {c.label}
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p role="status" aria-live="polite" className="mt-4 font-mono text-body-sm text-muted-foreground">
        {filtered.length === ITEMS.length ? `${ITEMS.length} entries` : `${filtered.length} of ${ITEMS.length} entries`}
        {activeCat ? ` · ${activeCat}` : ""}
        {activePlatformLabel ? ` · ${activePlatformLabel}` : ""}
        {activeStatus ? ` · ${activeStatus}` : ""}
        {activeCapability ? ` · ${activeCapability.label}` : ""}
        {activeDomain ? ` · ${activeDomain.label}` : ""}
        {activeLayer ? ` · ${activeLayer.label}` : ""}
        {q ? ` · “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No components match{q ? ` “${query.trim()}”` : ""}
            {activeCat ? ` in ${activeCat}` : ""}
            {activePlatformLabel ? ` on ${activePlatformLabel}` : ""}
            {activeCapability ? ` for ${activeCapability.label}` : ""}
            {activeDomain ? ` in ${activeDomain.label}` : ""}
            {activeLayer ? ` at the ${activeLayer.label} layer` : ""}.
          </p>
          <Button variant="Link" onClick={clearAll} className="mt-3 font-mono uppercase tracking-[0.12em]">
            Clear filters
          </Button>
        </div>
      ) : grouped ? (
        <div className="mt-6 space-y-12">
          {CATEGORY_ORDER.map((cat, i) => {
            const rows = filtered.filter((it) => it.category === cat);
            if (rows.length === 0) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${i}`}>
                <SectionHead index={String(i + 1).padStart(2, "0")} label={cat} meta={`${rows.length} components`} />
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
