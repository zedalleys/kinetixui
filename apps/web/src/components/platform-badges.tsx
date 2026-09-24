import { cn } from "@/lib/utils";
import { CATALOG_PLATFORMS, PLATFORMS, PLATFORM_ABBR, PLATFORM_DEFINITIONS, platformsFor } from "@/lib/platform-parity";

/**
 * Row of platform tags — solid where a library carries the component, dimmed + struck through where it
 * doesn't. Decorative; the group carries one summary label for assistive tech.
 *
 * The summary used to read "On all four platforms" when a component was on every declared platform. That
 * sentence was a hard-coded count AND a hard-coded meaning, and both broke when Angular was declared: the
 * number was wrong, and "every platform" started requiring a preview platform still rolling out. It now says
 * how many of the catalogue-complete platforms carry the component, and names the rest.
 */
export function PlatformBadges({ slug, className }: { slug: string; className?: string }) {
  const on = new Set(platformsFor(slug));
  const complete = CATALOG_PLATFORMS.filter((p) => on.has(p)).length === CATALOG_PLATFORMS.length;
  const extra = [...on].filter((p) => !CATALOG_PLATFORMS.includes(p));
  const label = complete
    ? `On all ${CATALOG_PLATFORMS.length} catalogue-complete platforms${extra.length ? `, and ${extra.map((p) => PLATFORM_DEFINITIONS[p].label).join(", ")}` : ""}`
    : `On ${[...on].join(", ")}`;
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
              // both states stay legible (AA): available = foreground text in a bordered tag; unavailable = muted,
              // struck through, no border. Not faded with opacity, which pushed the text far below 4.5:1.
              has
                ? "border-border text-foreground"
                : "border-transparent text-muted-foreground line-through",
            )}
          >
            {PLATFORM_ABBR[p]}
          </span>
        );
      })}
    </span>
  );
}
