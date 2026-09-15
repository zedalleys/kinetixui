"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

// lucide-react dropped brand/logo icons (including this one) — inlined at
// lucide's own icon size/stroke convention so it drops into the same
// `size-*` className usage as every other icon here.
export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.17.69-3.84-1.34-3.84-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 2.86-.39c.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55C20.24 21.29 23.5 17.04 23.5 12.02 23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

const SLUG = siteConfig.repo.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
const CACHE_KEY = "kx:gh-stats";
const TTL = 6 * 60 * 60 * 1000; // 6h

type Stats = { stars: number; forks: number };

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`.replace(".0k", "k") : String(n);

function readCache(): Stats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, stars, forks } = JSON.parse(raw);
    if (Date.now() - ts > TTL || typeof stars !== "number") return null;
    return { stars, forks };
  } catch {
    return null;
  }
}

/**
 * GitHub link with a live star count. Count comes from the public repo API,
 * cached in localStorage for 6h; if it's unavailable the button degrades to
 * the plain icon.
 */
export function GitHubButton() {
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    const cached = readCache();
    if (cached) {
      setStats(cached);
      return;
    }
    let live = true;
    fetch(`https://api.github.com/repos/${SLUG}`, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        const next = { stars: d.stargazers_count ?? 0, forks: d.forks_count ?? 0 };
        setStats(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, ts: Date.now() }));
        } catch {
          /* private window / storage disabled — fine, we just refetch next load */
        }
      })
      .catch(() => {
        /* rate-limited or offline — keep the plain icon */
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <a
      href={siteConfig.repo}
      target="_blank"
      rel="noreferrer"
      aria-label={
        stats ? `GitHub — ${stats.stars} stars, ${stats.forks} forks` : "GitHub repository"
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <GithubIcon className="size-4 shrink-0" />
      {stats && (
        <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
          <Star aria-hidden className="size-3 fill-current opacity-70" />
          {fmt(stats.stars)}
        </span>
      )}
    </a>
  );
}
