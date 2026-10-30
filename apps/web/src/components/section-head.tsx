import { cn } from "@/lib/utils";

/**
 * Labeled hairline that opens a page section — reads like a spec-sheet figure
 * caption: [index] on the rule, an uppercase label, an optional right-aligned note.
 */
export function SectionHead({
  index,
  label,
  meta,
  actions,
  className,
}: {
  index: string;
  label: string;
  meta?: string;
  /**
   * A control that belongs to this section, end-aligned on the rule. It is centred rather than
   * baseline-aligned: a 34px control has no text baseline worth sharing with a 12px label, and
   * aligning one to the other is what made the Create preview's head sit 11px below the
   * configuration column's heads while both rules started on the same line.
   */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    // `flex-wrap`: at the reader's doubled text size the index, label and trailing note together need more than a
    // phone has, and `ms-auto` still asks for whatever is left. Wrapping drops the note onto its own line instead;
    // `ms-auto` is kept so it stays end-aligned whenever the row does fit on one line. (The note used to be `px`,
    // which is how this first overflowed; all three are on the type scale now and grow together.)
    <div className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border pt-3", className)}>
      <span className="font-mono text-body-sm font-medium text-primary">[{index}]</span>
      <span className="eyebrow">{label}</span>
      {meta ? (
        <span data-section-meta className="ms-auto font-mono text-label-md lowercase tracking-wide text-muted-foreground">
          {meta}
        </span>
      ) : null}
      {actions ? (
        <div data-section-actions className="ms-auto self-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
