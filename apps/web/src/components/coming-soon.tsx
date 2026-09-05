import { cn } from "@/lib/utils";

/**
 * Spec-sheet "coming soon" pill — a mono, uppercase, hairline-bordered
 * chip with a pulsing dot. Reuse it wherever a feature is scoped but not
 * shipped.
 */
export function ComingSoon({
  label = "Coming soon",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-border px-3 py-1.5",
        "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
      {label}
    </span>
  );
}
