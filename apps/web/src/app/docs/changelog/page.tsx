import * as React from "react";
import type { Metadata } from "next";
import { LATEST_VERSION, PACKAGE_CHANGELOGS, RELEASES, isNotable, packagesChanged, releaseTypeAt } from "@/lib/releases";
import { PLATFORMS, PLATFORM_ABBR, platformsFor } from "@/lib/platform-parity";
import { componentDocs } from "@/lib/site";
import { ChangelogView, ReleaseList, type ViewComponent, type ViewRelease } from "@/components/changelog-view";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "New components, platform support, token updates, CLI improvements, accessibility fixes, and breaking changes across KinetixUI.",
  // the filter + search write ?filter= / ?q= into the URL; without this every combination a crawler
  // follows would look like a separate document
  ...canonical("/docs/changelog"),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-06" → "Sep 6, 2026" without touching the runtime locale/timezone. */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m! - 1]} ${d}, ${y}`;
}

/** slug → docs page + title, from the same list that powers /components */
const DOCS = new Map(componentDocs.map((c) => [c.href.split("/").pop() ?? "", c]));
const titleCase = (slug: string) => slug.split("-").map((s) => s[0]!.toUpperCase() + s.slice(1)).join(" ");

function componentFor(slug: string): ViewComponent {
  const doc = DOCS.get(slug);
  const on = new Set(platformsFor(slug));
  return {
    slug,
    name: doc?.title ?? titleCase(slug),
    href: doc?.href,
    platforms: PLATFORMS.map((p) => ({ abbr: PLATFORM_ABBR[p], name: p, on: on.has(p) })),
  };
}

const releases: ViewRelease[] = RELEASES.map((r, i) => ({
  version: r.version,
  date: r.date,
  dateLabel: formatDate(r.date),
  type: releaseTypeAt(i),
  summary: r.summary,
  isLatest: r.version === LATEST_VERSION,
  notable: isNotable(i),
  packages: packagesChanged(r.version),
  changes: r.changes,
  breaking: r.breaking,
  migration: r.migration,
  limitations: r.limitations,
  groups: r.newComponents?.map((g) => ({ group: g.group, items: g.slugs.map(componentFor) })),
  // a Changesets fixed group tags all three packages; the UI tag is the canonical one (there are no GitHub Releases after v0.5.0)
  tagHref: `https://github.com/zedalleys/kinetixui/tree/@kinetixui/ui@${r.version}`,
  githubReleaseUrl: r.githubReleaseUrl,
}));

export default function ChangelogPage() {
  const latest = releases.find((r) => r.isLatest) ?? releases[0]!;
  return (
    <div>
      <h1 className="mb-3 mt-2 scroll-mt-28 font-display text-4xl font-bold tracking-[-0.02em]">Changelog</h1>
      <p className="leading-relaxed text-muted-foreground">
        New components, platform support, token updates, CLI improvements, accessibility fixes, and breaking changes
        across KinetixUI. Each entry is distilled from the Changesets-generated per-package changelogs; the exhaustive,
        commit-level record is linked at the bottom.
      </p>

      <p className="mt-5 text-sm">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Latest </span>
        <a href={`#${latest.version}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          v{latest.version}
        </a>
        <span className="text-muted-foreground">
          {" "}
          · {latest.type} · {latest.dateLabel}
        </span>
      </p>

      <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
        KinetixUI is pre-1.0. A minor version may change an API while the component and token contracts stabilise. Any
        change that needs action from you is listed under <strong className="font-medium text-foreground">Breaking
        changes</strong>, with a migration note where there is one. The three npm packages always share a version;
        the indicators on each release show which ones actually changed.
      </p>

      {/* ChangelogView reads the URL (?filter=…&q=…) with useSearchParams, which needs a Suspense boundary on a
          statically rendered page. The fallback is the full, unfiltered list, so the prerendered HTML (and
          no-JS readers) still get every release. */}
      <React.Suspense fallback={<ReleaseList releases={releases} filter="all" query="" />}>
        <ChangelogView releases={releases} />
      </React.Suspense>

      <div className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        Full commit-level history:{" "}
        {PACKAGE_CHANGELOGS.map((pkg, i) => (
          <span key={pkg.name}>
            {i > 0 && " · "}
            <a href={pkg.href} className="font-medium text-primary underline underline-offset-4" target="_blank" rel="noreferrer">
              {pkg.name}
            </a>
          </span>
        ))}
        <p className="mt-2">
          The SwiftUI, Compose and Flutter libraries are not versioned with the npm packages; the platform badges show
          today&apos;s coverage from the same data as <a href="/components" className="text-primary underline underline-offset-4">/components</a>.
        </p>
      </div>
    </div>
  );
}
