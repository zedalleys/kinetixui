/**
 * A read-only code sample for /iot.
 *
 * Deliberately not copyable and deliberately not a client component. The docs are where someone goes to copy an
 * import; on the landing page these exist to be *read*, and every copyable surface is one more thing that has to
 * be instrumented, announced and kept out of the activation metric. The install command is the one exception,
 * because copying it is the actual call to action.
 *
 * `dir="ltr"` because code is code: in an RTL locale the surrounding prose flips and the sample must not.
 */
import { cn } from "@/lib/utils";

export function CodeSample({
  code,
  language,
  className,
}: {
  code: string;
  language: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-muted/40", className)}>
      <div className="border-b border-border px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {language}
      </div>
      <pre dir="ltr" className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
