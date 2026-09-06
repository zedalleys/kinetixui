"use client";

import * as React from "react";
import { Github, Star } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

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
      <Github className="size-4 shrink-0" />
      {stats && (
        <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
          <Star aria-hidden className="size-3 fill-current opacity-70" />
          {fmt(stats.stars)}
        </span>
      )}
    </a>
  );
}
