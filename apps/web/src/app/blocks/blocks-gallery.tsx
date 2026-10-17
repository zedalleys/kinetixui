"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Badge,
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  NativeSelect,
  NativeSelectOption,
} from "@kinetixui/ui";
import { BLOCK_CATEGORIES, blocks, type BlockMeta } from "@/lib/blocks";
import type { BlockFacets, FacetOption } from "@/lib/business-discovery";
import {
  FACET_KEYS,
  NO_FILTERS,
  countOptions,
  filterBlocks,
  isFiltered,
  parseBlockFilters,
  serializeBlockFilters,
  type BlockFilterState,
  type FacetKey,
  type FilterOptions,
  type FilterableBlock,
} from "@/lib/block-filters";
import { platformChipLabel } from "@/lib/catalogue-filters";
import { PLATFORMS } from "@/lib/platform-parity";
import { BlocksContent } from "./blocks-content";

type Props = { components: Record<string, string[]>; facets: BlockFacets };
type Item = BlockMeta & FilterableBlock;

const LABEL: Record<FacetKey, string> = {
  cat: "Category",
  capability: "Capability",
  domain: "Business domain",
  workflow: "Workflow",
  platform: "Platform",
};
const ANY: Record<FacetKey, string> = {
  cat: "All categories",
  capability: "Any capability",
  domain: "Any business domain",
  workflow: "Any workflow",
  platform: "Any platform",
};

function useModel({ components, facets }: Props) {
  return React.useMemo(() => {
    // drafts are never published (check:block-source, gen-block-examples), so they are never counted either
    const items: Item[] = blocks
      .filter((b) => (b.status as string) !== "draft")
      .map((b) => {
        const biz = facets.bySlug[b.slug] ?? { capabilities: [], domains: [], workflows: [], terms: "" };
        const uses = components[b.slug] ?? [];
        return {
          ...b,
          capabilities: biz.capabilities,
          domains: biz.domains,
          workflows: biz.workflows,
          terms: [b.title, b.slug, b.description, b.category, biz.terms, ...uses, ...uses.map((s) => s.replace(/-/g, " "))]
            .join(" · ")
            .toLowerCase(),
        };
      });
    const choices: Record<FacetKey, FacetOption[]> = {
      cat: BLOCK_CATEGORIES.map((c) => ({ id: c, label: c })),
      capability: facets.capabilities,
      domain: facets.domains,
      workflow: facets.workflows,
      platform: PLATFORMS.map((p) => ({ id: p, label: platformChipLabel(p) })),
    };
    const options = Object.fromEntries(FACET_KEYS.map((k) => [k, choices[k].map((o) => o.id)])) as unknown as FilterOptions;
    return { items, choices, options };
  }, [components, facets]);
}

/**
 * The filter bar and the blocks it keeps. Presentational: the URL wiring is in `BlocksGallery`, so the server can
 * render this with no filters as the Suspense fallback and the page's HTML still carries every block.
 */
export function BlocksGalleryView({
  components,
  facets,
  state,
  onChange,
  query,
  onQuery,
}: Props & {
  state: BlockFilterState;
  /** The dimensions to change; the rest keep the latest requested value. */
  onChange: (patch: Partial<BlockFilterState>) => void;
  /** The search box's text, which runs ahead of `state.q` while the URL write is debounced. */
  query: string;
  onQuery: (q: string) => void;
}) {
  const { items, choices } = useModel({ components, facets });
  const searchRef = React.useRef<HTMLInputElement>(null);
  const shown = filterBlocks(items, state);
  const filtered = isFiltered(state);
  const labelOf = (key: FacetKey, id: string) => choices[key].find((o) => o.id === id)?.label ?? id;
  const active = FACET_KEYS.filter((k) => state[k]).map((k) => `${LABEL[k]}: ${labelOf(k, state[k]!)}`);
  const clearAll = () => {
    onQuery("");
    onChange(NO_FILTERS);
  };

  const select = (key: FacetKey) => {
    if (choices[key].length === 0) return null;
    const counts = countOptions(items, state, key);
    const id = `blocks-filter-${key}`;
    return (
      <div key={key} className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id} className="font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">
          {LABEL[key]}
        </Label>
        <NativeSelect
          id={id}
          value={state[key] ?? ""}
          onChange={(e) => onChange({ q: query, [key]: e.target.value || null })}
          className="h-11 py-0 text-body-sm"
        >
          <NativeSelectOption value="">{ANY[key]}</NativeSelectOption>
          {choices[key].map((o) => {
            const n = counts[o.id] ?? 0;
            return (
              // An option that would empty the page stays visible, so the reader can see it exists, but cannot be
              // chosen from here; the one already chosen stays selectable so the control never misreports.
              <NativeSelectOption key={o.id} value={o.id} disabled={n === 0 && state[key] !== o.id}>
                {o.label} ({n})
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
      </div>
    );
  };

  return (
    <>
      <div role="search" aria-label="Filter blocks" className="mt-10">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
            <Label htmlFor="block-search" className="font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">
              Search
            </Label>
            <InputGroup className="h-11 rounded-md">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="block-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Checkout, sign-in, slider…"
                className="py-0 text-sm [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <InputGroupButton
                  aria-label="Clear search"
                  onClick={() => {
                    onQuery("");
                    searchRef.current?.focus();
                  }}
                  className="kx-hit"
                >
                  <X aria-hidden />
                </InputGroupButton>
              )}
            </InputGroup>
          </div>
          {filtered && (
            <Button variant="Ghost" onClick={clearAll} className="h-11">
              <X aria-hidden />
              Clear all filters
            </Button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {FACET_KEYS.map(select)}
        </div>
      </div>

      <p role="status" aria-live="polite" data-blocks-status className="mt-4 font-mono text-body-sm text-muted-foreground">
        {shown.length === items.length ? `${items.length} blocks` : `${shown.length} of ${items.length} blocks`}
        {active.length > 0 ? ` · ${active.join(" · ")}` : ""}
        {state.q ? ` · “${state.q}”` : ""}
      </p>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <p className="font-medium">No blocks match all of these filters.</p>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            Every filter has to match{state.q ? `, and every word of “${state.q}” has to appear` : ""}. Change one of
            them, or start again from every block.
          </p>
          <Button variant="Outline" onClick={clearAll} className="mt-4">
            Clear all filters
          </Button>
        </div>
      ) : (
        <BlocksContent
          components={components}
          only={filtered ? new Set(shown.map((b) => b.slug)) : undefined}
          context={(slug) => <BlockContext item={items.find((i) => i.slug === slug)!} facets={facets} />}
        />
      )}
    </>
  );
}

/**
 * The business context under a block's title: its status when it is not stable, its category and capability, and
 * the workflow it is a step of. Nothing else — the platform line and the install hint are already there, and every
 * taxonomy field on every block would bury the preview.
 */
function BlockContext({ item, facets }: { item: Item; facets: BlockFacets }) {
  const caps = item.capabilities.map((id) => facets.capabilities.find((c) => c.id === id)?.label ?? id);
  const flows = item.workflows.map((id) => facets.workflows.find((w) => w.id === id)!).filter(Boolean);
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
      {item.status !== "stable" && (
        <Badge variant="outline" className="capitalize">
          {item.status}
        </Badge>
      )}
      <span>
        <span className="sr-only">Category: </span>
        {item.category}
      </span>
      {caps.length > 0 && (
        <span>
          <span aria-hidden>· </span>
          <span className="sr-only">Capability: </span>
          {caps.join(", ")}
        </span>
      )}
      {flows.map((w) => (
        <span key={w.id}>
          <span aria-hidden>· </span>
          {w.href ? (
            <Link href={w.href} className="text-foreground underline underline-offset-4 hover:text-primary">
              Part of the {w.label.toLowerCase()} workflow
            </Link>
          ) : (
            <>Part of the {w.label.toLowerCase()} workflow</>
          )}
        </span>
      ))}
    </p>
  );
}

/**
 * /blocks with its filters in the URL, the same way /components keeps them: `router.replace`, so a filter change is
 * shareable and survives a refresh without stacking a history entry per change, and the search is debounced so
 * typing does not write the URL per keystroke. Back and Forward land on whatever URL is current, because the state
 * is read from it on every render rather than copied into component state.
 */
export function BlocksGallery(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { options } = useModel(props);
  const state = parseBlockFilters(params, options);
  const [query, setQuery] = React.useState(state.q);

  // The state last asked for. A write lands in `params` only after the router re-renders, so two changes made before
  // that (two selects during a slow transition, a filter just before the search pause ends) must build on this, not
  // on the render-time `state`, or the second undoes the first. It follows the URL again once the URL is one this
  // page did not write (Back/Forward, a shared link).
  const urlKey = params.toString();
  const requested = React.useRef({ state, written: new Set<string>() });
  if (!requested.current.written.has(urlKey)) requested.current = { state, written: new Set() };

  // the search write waiting out its pause; any other write carries the typed term itself, so it cancels this one
  const pending = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const write = React.useCallback(
    (patch: Partial<BlockFilterState>) => {
      clearTimeout(pending.current);
      const next = { ...requested.current.state, ...patch };
      const qs = serializeBlockFilters(next, Array.from(params.entries()));
      requested.current.state = next;
      requested.current.written.add(qs);
      const target = qs ? `${pathname}?${qs}` : pathname;
      if (target !== `${pathname}${window.location.search}`) router.replace(target, { scroll: false });
    },
    [params, pathname, router],
  );
  const latestWrite = React.useRef(write);
  latestWrite.current = write;

  // the typed term reaches the URL after a pause, like /components
  React.useEffect(() => {
    if (query.trim() === requested.current.state.q.trim()) return;
    pending.current = setTimeout(() => latestWrite.current({ q: query }), 200);
    return () => clearTimeout(pending.current);
  }, [query]);

  // a URL change from outside (Back/Forward, a shared link, Clear all) refreshes the box
  React.useEffect(() => {
    setQuery((cur) => (cur.trim() === state.q ? cur : state.q));
  }, [state.q]);

  return (
    <BlocksGalleryView
      {...props}
      state={state}
      onChange={write}
      query={query}
      onQuery={setQuery}
    />
  );
}

const noop = () => {};

/** The gallery with no filters applied: the Suspense fallback, and therefore what the static HTML carries. */
export function BlocksGalleryFallback(props: Props) {
  return <BlocksGalleryView {...props} state={NO_FILTERS} onChange={noop} query="" onQuery={noop} />;
}
