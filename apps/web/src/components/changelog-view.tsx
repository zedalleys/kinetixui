"use client";

import * as React from "react";
import type { ChangeArea, ChangeKind, ReleaseChange, ReleaseType } from "@/lib/releases";

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
  tagHref: string;
};

type FilterId = "all" | "components" | "tokens" | "cli" | "accessibility" | "platforms" | "breaking";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "components", label: "Components" },
  { id: "tokens", label: "Tokens" },
  { id: "cli", label: "CLI" },
  { id: "accessibility", label: "Accessibility" },
  { id: "platforms", label: "Platforms" },
  { id: "breaking", label: "Breaking" },
];

const AREA_OF: Partial<Record<FilterId, ChangeArea>> = { components: "components", tokens: "tokens", cli: "cli", platforms: "platforms" };

function changeMatches(filter: FilterId, c: ReleaseChange) {
  if (filter === "all") return true;
  if (filter === "accessibility") return c.kind === "accessibility";
  if (filter === "breaking") return c.kind === "breaking";
  const want = AREA_OF[filter];
  return want !== undefined && (Array.isArray(c.area) ? c.area.includes(want) : c.area === want);
}

function releaseMatches(filter: FilterId, r: ViewRelease) {
  if (filter === "all") return true;
  if (filter === "breaking") return (r.breaking?.length ?? 0) > 0;
  if (filter === "components" && r.groups?.length) return true;
  return r.changes.some((c) => changeMatches(filter, c));
}

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
        <a href={release.tagHref} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
          Tag on GitHub
        </a>
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

export function ChangelogView({ releases }: { releases: ViewRelease[] }) {
  const [filter, setFilter] = React.useState<FilterId>("all");
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, releases.filter((r) => releaseMatches(f.id, r)).length])) as Record<FilterId, number>;
  const visible = releases.filter((r) => releaseMatches(filter, r));

  // jump list, grouped by year
  const years = [...new Set(releases.map((r) => r.date.slice(0, 4)))];

  return (
    <div>
      <div role="group" aria-label="Filter releases" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-accent"
            }`}
          >
            {f.label} <span className={filter === f.id ? "opacity-80" : "text-muted-foreground"}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {filter === "all" ? (
        <nav aria-label="Jump to a version" className="mt-6 space-y-2">
          {years.map((y) => (
            <div key={y} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="w-10 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{y}</span>
              {releases
                .filter((r) => r.date.startsWith(y))
                .map((r) => (
                  <a key={r.version} href={`#${r.version}`} className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {r.version}
                  </a>
                ))}
            </div>
          ))}
        </nav>
      ) : null}

      {visible.length === 0 ? <p className="mt-12 text-muted-foreground">No releases match this filter.</p> : null}

      <div className="mt-12 space-y-12">
        {visible.map((release) => {
          const changes = release.changes.filter((c) => filter === "all" || changeMatches(filter, c));
          const compact = !release.notable && filter === "all";
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
    </div>
  );
}
