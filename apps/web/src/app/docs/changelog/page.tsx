import type { Metadata } from "next";
import { RELEASES, PACKAGE_CHANGELOGS } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every KinetixUI release, newest first — distilled from the per-package changelogs.",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09-06" → "Sep 6, 2026" without touching the runtime locale/timezone. */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function ChangelogPage() {
  return (
    <div>
      <h1 className="mb-3 mt-2 scroll-mt-28 font-display text-4xl font-bold tracking-[-0.02em]">
        Changelog
      </h1>
      <p className="leading-relaxed text-muted-foreground">
        Every release, newest first. Each entry is distilled from the Changesets-generated
        per-package changelogs; the exhaustive, commit-level record is linked at the bottom.
      </p>

      <div className="mt-12 space-y-14">
        {RELEASES.map((release, i) => (
          <section key={release.version} id={release.version} className="scroll-mt-28">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
              <h2 className="font-display text-2xl font-semibold">{release.version}</h2>
              {i === 0 && (
                <span
                  data-cp
                  className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary"
                >
                  Latest
                </span>
              )}
              <time
                dateTime={release.date}
                className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {formatDate(release.date)}
              </time>
            </div>

            <p className="mt-3 leading-relaxed text-muted-foreground">{release.summary}</p>

            <ul className="mt-4 space-y-3 border-l border-border">
              {release.changes.map((change) => (
                <li key={change.title} className="pl-4 text-sm leading-relaxed">
                  <span className="font-medium text-foreground">{change.title}</span>
                  {change.body ? (
                    <span className="text-muted-foreground"> — {change.body}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        Full commit-level history:{" "}
        {PACKAGE_CHANGELOGS.map((pkg, i) => (
          <span key={pkg.name}>
            {i > 0 && " · "}
            <a
              href={pkg.href}
              className="font-medium text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {pkg.name}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
