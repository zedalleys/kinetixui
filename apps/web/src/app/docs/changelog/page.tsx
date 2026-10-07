import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LATEST_VERSION, PACKAGE_CHANGELOGS, RELEASES, isNotable, packagesChanged, releaseTypeAt } from "@/lib/releases";
import { PLATFORMS, PLATFORM_ABBR, platformsFor } from "@/lib/platform-parity";
import { componentDocs } from "@/lib/site";
import { ChangelogView, ReleaseList, type ViewComponent, type ViewRelease } from "@/components/changelog-view";
import { canonical } from "@/lib/seo";
import { packageLines, type PackageLine } from "@/lib/package-lines";

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
  // a Changesets fixed group tags all three packages; the UI tag is the canonical one, and many versions have
  // only that tag rather than a GitHub Release — see `githubReleaseUrl` in releases.ts
  tagHref: `https://github.com/zedalleys/kinetixui/tree/@kinetixui/ui@${r.version}`,
  githubReleaseUrl: r.githubReleaseUrl,
}));

/**
 * The packages that are not on the core train, each with its current version and its release history, read from
 * its own Changesets changelog (`lib/package-lines.ts`). Listed, not merged into the core history: a version
 * number here means something different from one in the list below, so each line keeps its package's name.
 */
function PackageLines({ lines }: { lines: PackageLine[] }) {
  return (
    <section aria-labelledby="package-lines-title" id="package-lines" className="mt-8 scroll-mt-28">
      <h2 id="package-lines-title" className="font-display text-xl font-semibold tracking-[-0.01em]">
        Other packages, on their own version lines
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
        {lines.map((line) => (
          <li key={line.group} id={line.group} data-package-line={line.name} className="min-w-0 scroll-mt-28 rounded-lg border border-border p-4">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link href={line.docs} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {line.label}
              </Link>
              <code className="break-all text-sm text-muted-foreground">
                {line.name}@{line.version}
              </code>
            </p>
            {line.releases.length > 0 ? (
              <ol aria-label={`${line.name} releases`} className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {line.releases.map((release) => (
                  <li key={release.version}>
                    <a href={release.href} className="text-primary underline underline-offset-4" target="_blank" rel="noreferrer">
                      {release.version}
                    </a>
                    {release.type !== "Unclassified" ? <span className="text-muted-foreground"> · {release.type.toLowerCase()}</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            <p className="mt-3 text-sm">
              <a href={line.changelog} className="font-medium text-primary underline underline-offset-4" target="_blank" rel="noreferrer">
                Full {line.label} changelog
              </a>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ChangelogPage() {
  const latest = releases.find((r) => r.isLatest) ?? releases[0]!;
  const lines = packageLines();
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
        changes</strong>, with a migration note where there is one. This page is the release train for{" "}
        <code className="text-foreground">@kinetixui/tokens</code>, <code className="text-foreground">@kinetixui/ui</code>{" "}
        and <code className="text-foreground">@kinetixui/cli</code>, which always share a version; the indicators on
        each release show which ones actually changed.{" "}
        {lines.map((line, i) => (
          <React.Fragment key={line.group}>
            {i > 0 ? (i === lines.length - 1 ? " and " : ", ") : null}
            <code className="text-foreground">{line.name}</code>
          </React.Fragment>
        ))}{" "}
        release on their own version lines — see{" "}
        <a href="#package-lines" className="underline underline-offset-4 hover:text-foreground">
          other packages
        </a>
        .
      </p>

      <PackageLines lines={lines} />

      {/* ChangelogView reads the URL (?filter=…&q=…) with useSearchParams, which needs a Suspense boundary on a
          statically rendered page. The fallback is the full, unfiltered list, so the prerendered HTML (and
          no-JS readers) still get every release. */}
      <React.Suspense fallback={<ReleaseList releases={releases} filter="all" query="" />}>
        <ChangelogView releases={releases} />
      </React.Suspense>

      <div className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        Full commit-level history:{" "}
        {[...PACKAGE_CHANGELOGS, ...lines.map((line) => ({ name: line.name, href: line.changelog }))].map((pkg, i) => (
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
