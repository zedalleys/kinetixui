import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Callout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "my-6 flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm [&>p]:m-0",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>{children}</div>
    </div>
  );
}
