import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language = "bash",
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-border bg-muted/40", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{language}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
