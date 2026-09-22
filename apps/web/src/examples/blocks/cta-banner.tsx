import { Button } from "@kinetixui/ui";
import { ArrowUpRight } from "lucide-react";

// kx-block:start
export function CtaBannerBlock() {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-lg border border-border bg-muted/40 p-8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Ship with one token architecture</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Built from the same design-token contract on every supported platform.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button>
          Get started <ArrowUpRight className="size-4" />
        </Button>
        <Button variant="Outline">Read the docs</Button>
      </div>
    </div>
  );
}
// kx-block:end
