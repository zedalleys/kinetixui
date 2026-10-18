/**
 * The /blocks filter: what the URL says, which blocks it keeps, and how to write it back.
 *
 * Pure functions only, so the contract can be tested without a browser and the page cannot drift from it.
 *
 *   ?q=           free text; every word must appear in the block's name, description, category, business context
 *                 or the components it uses
 *   ?cat=         a block category from blocks.manifest.json `categories` (the label, as /components does)
 *   ?capability=  a capability group id from the discovery index
 *   ?domain=      a business domain id
 *   ?workflow=    a workflow id
 *   ?platform=    a manifest platform key (React, Angular, SwiftUI, Compose, Flutter), as /components does
 *
 * Semantics: one value per dimension; dimensions combine with AND; search combines with all of them. A value the
 * page does not offer (a typo, an id that was renamed, a hand-edited link) resolves to no filter for that dimension,
 * never to an error or an empty page, and is dropped the next time the URL is written. Parameters this page does not
 * own (`utm_*` and the like) are kept, after the ones it does, in the order they arrived. The owned ones are always
 * written in the order above, so one filter state has exactly one URL.
 */
import type { Platform } from "./platform-parity";

export const BLOCK_FILTER_KEYS = ["q", "cat", "capability", "domain", "workflow", "platform"] as const;
export type BlockFilterKey = (typeof BLOCK_FILTER_KEYS)[number];
export type FacetKey = Exclude<BlockFilterKey, "q">;
export const FACET_KEYS: readonly FacetKey[] = ["cat", "capability", "domain", "workflow", "platform"];

export type BlockFilterState = { q: string } & Record<FacetKey, string | null>;
export const NO_FILTERS: BlockFilterState = { q: "", cat: null, capability: null, domain: null, workflow: null, platform: null };

/** What one block offers each dimension. `terms` is lower-cased search text. */
export type FilterableBlock = {
  slug: string;
  category: string;
  capabilities: string[];
  domains: string[];
  workflows: string[];
  platforms: Platform[];
  terms: string;
};

/** The values a dimension accepts: anything else is no filter. */
export type FilterOptions = Record<FacetKey, readonly string[]>;

type ParamsLike = { get(key: string): string | null };

/** Read the filter state from the URL, keeping only values the page offers. */
export function parseBlockFilters(params: ParamsLike, options: FilterOptions): BlockFilterState {
  const state: BlockFilterState = { ...NO_FILTERS, q: (params.get("q") ?? "").trim() };
  for (const key of FACET_KEYS) {
    const value = params.get(key);
    state[key] = value !== null && options[key].includes(value) ? value : null;
  }
  return state;
}

/**
 * The query string for a state: owned keys in their fixed order, then everything else from `current` unchanged.
 * Returns "" for no filters, so the caller can link to the bare path.
 */
export function serializeBlockFilters(state: BlockFilterState, current: Iterable<[string, string]> = []): string {
  const next = new URLSearchParams();
  if (state.q.trim()) next.set("q", state.q.trim());
  for (const key of FACET_KEYS) if (state[key]) next.set(key, state[key]!);
  const owned = new Set<string>(BLOCK_FILTER_KEYS);
  for (const [key, value] of current) if (!owned.has(key)) next.append(key, value);
  return next.toString();
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

function facetValues(block: FilterableBlock, key: FacetKey): readonly string[] {
  switch (key) {
    case "cat":
      return [block.category];
    case "capability":
      return block.capabilities;
    case "domain":
      return block.domains;
    case "workflow":
      return block.workflows;
    case "platform":
      return block.platforms;
  }
}

/** True when the block passes every active filter except `skip` (used to count a dimension's own options). */
function passes(block: FilterableBlock, state: BlockFilterState, skip?: FacetKey): boolean {
  for (const key of FACET_KEYS) {
    if (key === skip || !state[key]) continue;
    if (!facetValues(block, key).includes(state[key]!)) return false;
  }
  return words(state.q).every((w) => block.terms.includes(w));
}

export function filterBlocks<T extends FilterableBlock>(blocks: readonly T[], state: BlockFilterState): T[] {
  return blocks.filter((b) => passes(b, state));
}

/**
 * How many blocks each option would show, given every other active filter and the search. Choosing an option
 * replaces the dimension's current value, so its own value is left out of the count.
 */
export function countOptions(blocks: readonly FilterableBlock[], state: BlockFilterState, key: FacetKey): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of blocks) if (passes(b, state, key)) for (const v of facetValues(b, key)) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

export const isFiltered = (state: BlockFilterState) => Boolean(state.q.trim()) || FACET_KEYS.some((k) => state[k]);
