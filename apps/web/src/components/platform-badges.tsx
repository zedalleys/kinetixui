import { cn } from "@/lib/utils";
import { CATALOG_PLATFORMS, PLATFORMS, PLATFORM_ABBR, PLATFORM_DEFINITIONS, platformsFor } from "@/lib/platform-parity";
import { GUIDANCE_LABEL, WAVE_LABEL, platformStateFor } from "@/lib/platform-tabs";

/**
 * Row of platform tags. Solid where a library carries the component; quieter where it does not — but
 * *how* much quieter depends on why, because the manifest distinguishes three reasons and only one of
 * them means "coming".
 *
 * This row used to strike through every platform a component was not on and title all of them
 * "— not yet". That was true for the 65 `planned` cells and wrong for the other 26: a `composition`
 * is a recipe that was never going to be a component on that platform, and a `native-equivalent`
 * means the platform already has the concept. Both are finished decisions, and promising a port for
 * them is the same class of over-claim the manifest exists to prevent — it just happened in a tooltip
 * rather than in prose. `platformStateFor` is the same source the component detail tabs read, so the
 * card and the page can no longer disagree.
 *
 * Strikethrough now means absence and nothing else. A deliberate non-port is dimmed and dashed, which
 * reads as "different", not "missing", and keeps the row quiet at card size.
 */
export function PlatformBadges({ slug, className }: { slug: string; className?: string }) {
  const on = new Set(platformsFor(slug));

  const states = PLATFORMS.map((p) => {
    const state = platformStateFor(slug, p);
    const implemented = on.has(p);
    // A slug the manifest does not know has no guidance to show; treat it as plain absence rather than
    // inventing a reason for it.
    const guidance = !implemented && state && state !== "implementation" ? state : null;
    return { platform: p, implemented, guidance };
  });

  /**
   * One spoken sentence for the row: what carries it, then each platform that does not and why. The
   * tags themselves stay out of the accessibility tree — five abbreviations read one at a time say
   * less than this does, and the reason is the part that was missing before.
   */
  const carried = states.filter((s) => s.implemented).map((s) => PLATFORM_DEFINITIONS[s.platform].label);
  const absent = states
    .filter((s) => !s.implemented)
    .map((s) => {
      const label = PLATFORM_DEFINITIONS[s.platform].label;
      if (!s.guidance) return `${label}: not available`;
      return `${label}: ${GUIDANCE_LABEL[s.guidance.type].toLowerCase()}`;
    });
  const complete = CATALOG_PLATFORMS.every((p) => on.has(p));
  const carriedSentence = complete
    ? `On all ${CATALOG_PLATFORMS.length} catalogue-complete platforms${
        carried.length > CATALOG_PLATFORMS.length
          ? `, and ${carried.filter((l) => !CATALOG_PLATFORMS.some((p) => PLATFORM_DEFINITIONS[p].label === l)).join(", ")}`
          : ""
      }`
    : `On ${carried.join(", ")}`;
  const label = [carriedSentence, ...absent].join(". ");

  return (
    <span className={cn("flex flex-wrap gap-1", className)} role="img" aria-label={label}>
      {states.map(({ platform, implemented, guidance }) => {
        // The tooltip says the same thing the label does, with the Angular wave where there is one —
        // detail that earns its place on hover but would bloat a spoken sentence.
        const title = implemented
          ? platform
          : guidance
            ? `${platform} — ${GUIDANCE_LABEL[guidance.type]}${
                guidance.wave && WAVE_LABEL[guidance.wave] ? `: ${WAVE_LABEL[guidance.wave]} wave` : ""
              }`
            : `${platform} — not available`;
        // Only `planned` is an absence. A composition or a native equivalent is a decision, so it is
        // dimmed and dashed rather than struck through.
        const deliberate = guidance?.type === "composition" || guidance?.type === "native-equivalent";
        return (
          <span
            key={platform}
            aria-hidden
            title={title}
            className={cn(
              "rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]",
              // every state stays legible (AA): available = foreground text in a bordered tag; the rest are
              // muted, which is still 4.5:1. Not faded with opacity, which pushed the text far below it.
              implemented && "border-border text-foreground",
              !implemented && deliberate && "border-dashed border-border/60 text-muted-foreground",
              !implemented && !deliberate && "border-transparent text-muted-foreground line-through",
            )}
          >
            {PLATFORM_ABBR[platform]}
          </span>
        );
      })}
    </span>
  );
}
