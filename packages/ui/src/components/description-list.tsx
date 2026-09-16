"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * DescriptionList — `<dl>` term/detail rows with the site's own spec-sheet
 * skin (mono, uppercase, tracked term labels; a divided rounded shell).
 * Lifted out of two hand-rolled call sites — `ComponentMeta`'s doc-page
 * spec strip and the homepage's "spec" card — into a reusable component.
 * Gap-fill addition (not in the original Figma source).
 */
const DescriptionList = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => (
    <dl
      ref={ref}
      className={cn("divide-y divide-border rounded-lg border border-border bg-muted/20", className)}
      {...props}
    />
  ),
);
DescriptionList.displayName = "DescriptionList";

export interface DescriptionListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  term: React.ReactNode;
  children: React.ReactNode;
  /** `row` (default) puts the term and value side by side; `stacked` puts the value below a full-width term — better for long values. */
  layout?: "row" | "stacked";
}

const DescriptionListItem = React.forwardRef<HTMLDivElement, DescriptionListItemProps>(
  ({ className, term, children, layout = "row", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("gap-3 px-3.5 py-2.5", layout === "row" ? "flex items-baseline" : "flex flex-col", className)}
      {...props}
    >
      <dt
        className={cn(
          "shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
          layout === "row" && "w-24",
        )}
      >
        {term}
      </dt>
      <dd className="min-w-0 text-body-sm text-foreground">{children}</dd>
    </div>
  ),
);
DescriptionListItem.displayName = "DescriptionListItem";

export { DescriptionList, DescriptionListItem };
