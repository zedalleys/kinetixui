import { cn } from "@/lib/utils";
import { PLATFORMS, PLATFORM_ABBR, platformsFor } from "@/lib/platform-parity";

/**
 * Row of platform tags — solid where a native library carries the component,
 * dimmed + struck through where it doesn't. Decorative; the group carries one
 * summary label for assistive tech.
 */
export function PlatformBadges({ slug, className }: { slug: string; className?: string }) {
  const on = new Set(platformsFor(slug));
  const label =
    on.size === PLATFORMS.length ? "On all four platforms" : `On ${[...on].join(", ")}`;
  return (
    <span className={cn("flex flex-wrap gap-1", className)} role="img" aria-label={label}>
      {PLATFORMS.map((p) => {
        const has = on.has(p);
        return (
          <span
            key={p}
            aria-hidden
            title={has ? p : `${p} — not yet`}
            className={cn(
              "rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]",
              has
                ? "border-border/70 text-muted-foreground"
                : "border-transparent text-muted-foreground/35 line-through",
            )}
          >
            {PLATFORM_ABBR[p]}
          </span>
        );
      })}
    </span>
  );
}
