/**
 * Changelog filtering, search and URL-state helpers — pure functions, no React, so they are testable
 * on their own. The release data itself (`releases.ts`) stays human-curated and is never mutated here:
 * search and filters only decide which releases the page shows.
 */
import type { ChangeArea, ReleaseChange, ReleaseType } from "./releases";

export type ViewComponent = {
  slug: string;
  name: string;
  /** docs page, when there is one */
  href?: string;
  platforms: { abbr: string; name: string; on: boolean }[];
};

export type ViewRelease = {
  version: string;
  date: string;
  dateLabel: string;
  type: ReleaseType;
  summary: string;
  isLatest: boolean;
  /** feature releases and patches with security / accessibility / breaking changes get a full entry */
  notable: boolean;
  /** which of the version-locked packages actually changed (generated from the package changelogs) */
  packages?: { ui: boolean; tokens: boolean; cli: boolean };
  changes: ReleaseChange[];
  breaking?: string[];
  migration?: string;
  limitations?: string[];
  groups?: { group: string; items: ViewComponent[] }[];
  /** git tag for the release — always present, the fallback link */
  tagHref: string;
  /** a real GitHub Release page, only when the data says one exists (see `Release.githubReleaseUrl`) */
  githubReleaseUrl?: string;
};

export type FilterId = "all" | "components" | "tokens" | "cli" | "accessibility" | "platforms" | "breaking";

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "components", label: "Components" },
  { id: "tokens", label: "Tokens" },
  { id: "cli", label: "CLI" },
  { id: "accessibility", label: "Accessibility" },
  { id: "platforms", label: "Platforms" },
  { id: "breaking", label: "Breaking" },
];

const FILTER_IDS = new Set<string>(FILTERS.map((f) => f.id));

/** A `?filter=` value → a known filter; anything else (missing, unknown, repeated) falls back to "all". */
export function parseFilter(value: string | null | undefined): FilterId {
  return value && FILTER_IDS.has(value) ? (value as FilterId) : "all";
}

const AREA_OF: Partial<Record<FilterId, ChangeArea>> = { components: "components", tokens: "tokens", cli: "cli", platforms: "platforms" };

export function changeMatches(filter: FilterId, c: ReleaseChange) {
  if (filter === "all") return true;
  if (filter === "accessibility") return c.kind === "accessibility";
  if (filter === "breaking") return c.kind === "breaking";
  const want = AREA_OF[filter];
  return want !== undefined && (Array.isArray(c.area) ? c.area.includes(want) : c.area === want);
}

export function releaseMatches(filter: FilterId, r: ViewRelease) {
  if (filter === "all") return true;
  if (filter === "breaking") return (r.breaking?.length ?? 0) > 0;
  if (filter === "components" && r.groups?.length) return true;
  return r.changes.some((c) => changeMatches(filter, c));
}

/** Everything a release says, lower-cased, for substring search. */
function haystack(r: ViewRelease): string {
  const parts: (string | undefined)[] = [r.version, r.summary, r.migration];
  for (const c of r.changes) parts.push(c.title, c.body);
  parts.push(...(r.breaking ?? []), ...(r.limitations ?? []));
  for (const g of r.groups ?? []) {
    parts.push(g.group);
    for (const item of g.items) parts.push(item.name, item.slug);
  }
  return parts.filter(Boolean).join("\n").toLowerCase();
}

/** Normalise what the user typed: trimmed, and empty means "no search". */
export function normalizeQuery(q: string | null | undefined): string {
  return (q ?? "").trim();
}

/**
 * Case-insensitive search. Whitespace-separated words must all appear somewhere in the release
 * ("grid selection" finds a release mentioning both), so a longer query only ever narrows the results.
 */
export function searchMatches(r: ViewRelease, query: string): boolean {
  const words = normalizeQuery(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(r);
  return words.every((w) => text.includes(w));
}

/** The releases to show for a category filter and a search, in their original order. */
export function filterReleases(releases: ViewRelease[], filter: FilterId, query: string): ViewRelease[] {
  return releases.filter((r) => releaseMatches(filter, r) && searchMatches(r, query));
}

/** Concise feedback for the live region, e.g. `3 releases matching “grid” in Components`. Empty when nothing is active. */
export function resultSummary(count: number, filter: FilterId, query: string): string {
  const q = normalizeQuery(query);
  if (filter === "all" && !q) return "";
  const noun = count === 1 ? "release" : "releases";
  const label = FILTERS.find((f) => f.id === filter)?.label;
  let out = `${count} ${noun}`;
  if (q) out += ` matching “${q}”`;
  if (q && filter !== "all" && label) out += ` in ${label}`;
  return out;
}

/**
 * The page URL for a filter + search, keeping the pathname, any unrelated query parameters and the
 * hash (so `?filter=accessibility#0.18.0` keeps working). `filter=all` and an empty search are omitted.
 */
export function buildChangelogUrl(
  base: { pathname: string; search: string; hash: string },
  state: { filter: FilterId; q: string },
): string {
  // canonical order — filter, then q, then anything unrelated — so the same view is always the same URL
  const params = new URLSearchParams();
  if (state.filter !== "all") params.set("filter", state.filter);
  const q = normalizeQuery(state.q);
  if (q) params.set("q", q);
  for (const [key, value] of new URLSearchParams(base.search)) if (key !== "filter" && key !== "q") params.append(key, value);
  const qs = params.toString();
  return `${base.pathname}${qs ? `?${qs}` : ""}${base.hash}`;
}
