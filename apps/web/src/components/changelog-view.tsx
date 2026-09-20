"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type { ChangeKind, ReleaseChange } from "@/lib/releases";
import {
  FILTERS,
  buildChangelogUrl,
  changeMatches,
  filterReleases,
  normalizeQuery,
  parseFilter,
  resultSummary,
  type FilterId,
  type ViewComponent,
  type ViewRelease,
} from "@/lib/changelog-filter";

export type { ViewComponent, ViewRelease };

const KIND_ORDER: ChangeKind[] = ["breaking", "security", "accessibility", "new", "improved", "fixed", "deprecated"];
const KIND_LABEL: Record<ChangeKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  security: "Security",
  accessibility: "Accessibility",
  breaking: "Breaking",
  deprecated: "Deprecated",
};
const KIND_STYLE: Record<ChangeKind, string> = {
  new: "border-primary/40 bg-primary/10 text-primary",
  improved: "border-border bg-muted text-foreground",
  fixed: "border-border bg-muted text-muted-foreground",
  security: "border-destructive/40 bg-destructive/10 text-destructive",
  accessibility: "border-info/50 bg-info/10 text-foreground",
  breaking: "border-warning/50 bg-warning/10 text-foreground",
  deprecated: "border-border bg-muted text-muted-foreground",
};

/** `code` spans in the curated text render as inline code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

const PILL = "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]";

function KindTag({ kind }: { kind?: ChangeKind }) {
  if (!kind) return null;
  return <span className={`${PILL} ${KIND_STYLE[kind]} mr-2 align-middle`}>{KIND_LABEL[kind]}</span>;
}

function Packages({ packages }: { packages: NonNullable<ViewRelease["packages"]> }) {
  const items: { key: keyof typeof packages; label: string }[] = [
    { key: "ui", label: "UI" },
    { key: "tokens", label: "Tokens" },
    { key: "cli", label: "CLI" },
  ];
  return (
    <ul aria-label="Packages changed in this release" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em]">
      <li className="text-muted-foreground">Packages</li>
      {items.map(({ key, label }) => (
        <li
          key={key}
          title={packages[key] ? `@kinetixui/${key} changed` : `@kinetixui/${key}: version bump only`}
          className={packages[key] ? "text-foreground" : "text-muted-foreground"}
        >
          <span aria-hidden>{packages[key] ? "●" : "○"}</span> {label}
          <span className="sr-only">{packages[key] ? " changed" : " unchanged"}</span>
        </li>
      ))}
    </ul>
  );
}

function ComponentGroups({ groups }: { groups: NonNullable<ViewRelease["groups"]> }) {
  return (
    <div className="mt-4 space-y-3">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{g.group}</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {g.items.map((c) => (
              <li key={c.slug} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-sm">
                {c.href ? (
                  <a href={c.href} className="font-medium text-primary underline-offset-4 hover:underline">
                    {c.name}
                  </a>
                ) : (
                  <span className="font-medium">{c.name}</span>
                )}
                <span role="img" className="flex gap-0.5 font-mono text-[10px]" aria-label={`Platforms: ${c.platforms.filter((p) => p.on).map((p) => p.name).join(", ")}`}>
                  {c.platforms.map((p) => (
                    <span
                      key={p.abbr}
                      title={`${p.name}${p.on ? "" : " — not available"}`}
                      className={p.on ? "rounded-sm bg-primary/10 px-1 text-primary" : "rounded-sm px-1 text-muted-foreground line-through"}
                    >
                      {p.abbr}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ChangeList({ changes }: { changes: ReleaseChange[] }) {
  const hasKinds = changes.some((c) => c.kind);
  const sorted = hasKinds
    ? [...changes].sort((a, b) => KIND_ORDER.indexOf(a.kind ?? "improved") - KIND_ORDER.indexOf(b.kind ?? "improved"))
    : changes;
  return (
    <ul className="mt-4 space-y-3 border-l border-border">
      {sorted.map((change) => (
        <li key={change.title} className="pl-4 text-sm leading-relaxed">
          <KindTag kind={change.kind} />
          <span className="font-medium text-foreground"><Inline text={change.title} /></span>
          {change.body ? (
            <span className="text-muted-foreground">
              {" — "}
              <Inline text={change.body} />
            </span>
          ) : null}
          {change.href ? (
            <>
              {" "}
              <a href={change.href} className="whitespace-nowrap text-primary underline underline-offset-4">
                Read more →
              </a>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FullEntry({ release, changes }: { release: ViewRelease; changes: ReleaseChange[] }) {
  const audited = release.breaking !== undefined;
  const hasBreaking = (release.breaking?.length ?? 0) > 0;
  return (
    <>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        <Inline text={release.summary} />
      </p>
      {release.packages ? <Packages packages={release.packages} /> : null}
      <ChangeList changes={changes} />
      {release.groups?.length ? <ComponentGroups groups={release.groups} /> : null}

      {release.limitations?.length ? (
        <div className="mt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Known limitations</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
            {release.limitations.map((l) => (
              <li key={l}>
                <Inline text={l} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {audited ? (
        <div className="mt-5 text-sm leading-relaxed">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Breaking changes </span>
          {hasBreaking ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-foreground">
              {release.breaking!.map((b) => (
                <li key={b}>
                  <Inline text={b} />
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-foreground">None.</span>
          )}
        </div>
      ) : null}

      {release.migration ? (
        <details className="mt-3 rounded-md border border-border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Migration</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            <Inline text={release.migration} />
          </p>
        </details>
      ) : null}

      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {/* A GitHub Release page exists only for some versions, so it is linked only when the data says so
            (`githubReleaseUrl`); every other version falls back to its git tag, which always exists. */}
        {release.githubReleaseUrl ? (
          <a href={release.githubReleaseUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
            View release on GitHub
          </a>
        ) : (
          <a href={release.tagHref} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
            Tag on GitHub
          </a>
        )}
      </p>
    </>
  );
}

function CompactEntry({ release, changes }: { release: ViewRelease; changes: ReleaseChange[] }) {
  return (
    <>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <Inline text={release.summary} />{" "}
        {changes.map((c) => (
          <KindTag key={c.title} kind={c.kind} />
        ))}
      </p>
      {release.packages ? <Packages packages={release.packages} /> : null}
    </>
  );
}

/**
 * The jump list and the release sections for a given filter + search. Presentational only (no URL or
 * router access), so the page can also render it as the static Suspense fallback before hydration.
 */
export function ReleaseList({
  releases,
  filter,
  query,
  onClear,
}: {
  releases: ViewRelease[];
  filter: FilterId;
  query: string;
  onClear?: () => void;
}) {
  const visible = filterReleases(releases, filter, query);
  const searching = normalizeQuery(query) !== "";
  const filterLabel = FILTERS.find((f) => f.id === filter)?.label;

  // jump list, grouped by year — only when everything is listed, so every link has a target
  const years = [...new Set(releases.map((r) => r.date.slice(0, 4)))];

  return (
    <>
      {filter === "all" && !searching ? (
        <nav aria-label="Jump to a version" className="mt-6 space-y-2">
          {years.map((y) => (
            <div key={y} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="w-10 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{y}</span>
              {releases
                .filter((r) => r.date.startsWith(y))
                .map((r) => (
                  <a key={r.version} href={`#${r.version}`} className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {r.version}
                  </a>
                ))}
            </div>
          ))}
        </nav>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-12 text-muted-foreground">
          <p>
            No releases match
            {searching ? <> “{normalizeQuery(query)}”</> : null}
            {filter !== "all" && filterLabel ? <> in {filterLabel}</> : null}.
          </p>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Clear search and filters
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-12 space-y-12">
        {visible.map((release) => {
          const changes = release.changes.filter((c) => filter === "all" || changeMatches(filter, c));
          // a search shows full entries so the text that matched is visible
          const compact = !release.notable && filter === "all" && !searching;
          return (
            <section key={release.version} id={release.version} className="scroll-mt-28">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
                <h2 className="font-display text-2xl font-semibold">{release.version}</h2>
                {release.isLatest ? (
                  <span data-cp className={`${PILL} border-primary/40 bg-primary/10 text-primary`}>
                    Latest
                  </span>
                ) : null}
                <span className={`${PILL} border-border text-muted-foreground`}>{release.type}</span>
                <time dateTime={release.date} className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {release.dateLabel}
                </time>
              </div>
              {compact ? <CompactEntry release={release} changes={changes} /> : <FullEntry release={release} changes={changes} />}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Wait this long after the last keystroke before filtering, announcing and updating the URL. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * The interactive changelog: a search box and category filters whose state lives in the URL
 * (`?filter=accessibility&q=grid`), so any view is shareable. The filter is read straight from the URL
 * (so Back/Forward just work); the search is typed into local state and written to the URL once typing
 * settles. URL writes use the native History API, which the App Router syncs into `useSearchParams` —
 * no reload and no server round-trip. The hash is preserved, so `?filter=accessibility#0.18.0` works.
 *
 * Must render inside a <Suspense> boundary (it reads `useSearchParams`).
 */
export function ChangelogView({ releases }: { releases: ViewRelease[] }) {
  const params = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  const urlQuery = normalizeQuery(params.get("q"));

  const [draft, setDraft] = React.useState(urlQuery); // what is in the box
  const [query, setQuery] = React.useState(urlQuery); // what the results (and the announcement) reflect
  const committed = React.useRef(urlQuery); // the search last written to, or read from, the URL
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const filterRef = React.useRef(filter);
  filterRef.current = filter;

  // URL → UI: Back/Forward, or arriving on a shared link, changes the search from outside
  React.useEffect(() => {
    if (urlQuery === committed.current) return;
    clearTimeout(timer.current);
    committed.current = urlQuery;
    setDraft(urlQuery);
    setQuery(urlQuery);
  }, [urlQuery]);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  // A link like `?filter=accessibility#0.18.0` first scrolls to the anchor in the full prerendered list;
  // once this view mounts and the list is filtered, that position is wrong. Scroll to the anchor again
  // (once) if it is still on the page.
  React.useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView?.();
  }, []);

  function writeUrl(state: { filter: FilterId; q: string }, mode: "push" | "replace") {
    const { pathname, search, hash } = window.location;
    const url = buildChangelogUrl({ pathname, search, hash }, state);
    if (url === `${pathname}${search}${hash}`) return;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  function commitSearch(value: string) {
    clearTimeout(timer.current);
    const q = normalizeQuery(value);
    setQuery(q);
    committed.current = q;
    writeUrl({ filter: filterRef.current, q }, "replace"); // typing shouldn't fill the history
  }

  function onSearchChange(value: string) {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commitSearch(value), SEARCH_DEBOUNCE_MS);
  }

  function selectFilter(id: FilterId) {
    if (id === filter) return;
    clearTimeout(timer.current);
    const q = normalizeQuery(draft);
    setQuery(q);
    committed.current = q;
    writeUrl({ filter: id, q }, "push"); // a filter is a view worth going Back to
  }

  function clearAll() {
    clearTimeout(timer.current);
    setDraft("");
    setQuery("");
    committed.current = "";
    writeUrl({ filter: "all", q: "" }, "push");
  }

  const visibleCount = filterReleases(releases, filter, query).length;
  const summary = resultSummary(visibleCount, filter, query);

  return (
    <div>
      <div className="mt-6 space-y-3">
        <div className="w-full sm:max-w-sm">
          <label htmlFor="changelog-search" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Search releases
          </label>
          <input
            id="changelog-search"
            type="search"
            value={draft}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSearch(draft);
            }}
            placeholder="Version, component, keyword…"
            autoComplete="off"
            spellCheck={false}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-action focus-visible:shadow-focus"
          />
        </div>

        <div role="group" aria-label="Filter releases" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active ? "border-primary bg-primary font-medium text-primary-foreground" : "border-border text-foreground hover:bg-accent"
                }`}
              >
                {active ? <span aria-hidden>✓ </span> : null}
                {f.label}{" "}
                <span className={active ? "opacity-80" : "text-muted-foreground"}>{filterReleases(releases, f.id, query).length}</span>
              </button>
            );
          })}
        </div>

        {/* announced politely after typing settles or a filter changes; empty when nothing is active */}
        <p role="status" aria-live="polite" aria-atomic="true" className="min-h-5 text-sm text-muted-foreground">
          {summary}
        </p>
      </div>

      <ReleaseList releases={releases} filter={filter} query={query} onClear={clearAll} />
    </div>
  );
}
