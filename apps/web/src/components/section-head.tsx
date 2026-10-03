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
    // `flex-wrap`: the label is `rem` and the trailing note is `px`, so at the reader's doubled text size the
    // label grows, the note does not, and `ml-auto` still asks for whatever is left — which was more than the
    // viewport had. Wrapping drops the note onto its own line instead. `ml-auto` is kept so it stays
    // right-aligned whenever the row does fit on one line.
    <div className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border pt-3", className)}>
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
