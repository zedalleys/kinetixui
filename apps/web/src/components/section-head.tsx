import { cn } from "@/lib/utils";

/**
 * Labeled hairline that opens a page section — reads like a spec-sheet figure
 * caption: [index] on the rule, an uppercase label, an optional right-aligned note.
 */
export function SectionHead({
  index,
  label,
  meta,
  className,
}: {
  index: string;
  label: string;
  meta?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-4 border-t border-border pt-3", className)}>
      <span className="font-mono text-[11px] font-medium text-primary">[{index}]</span>
      <span className="eyebrow">{label}</span>
      {meta ? (
        <span className="ml-auto font-mono text-[11px] lowercase tracking-wide text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
