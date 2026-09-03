"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TableOfContents — an anchor-link nav list with indent levels and an
 * active-item state (drive `active` from your own scroll-spy).
 */
export interface TocItem {
  id: string;
  label: React.ReactNode;
  level?: number;
}

export interface TableOfContentsProps extends React.HTMLAttributes<HTMLElement> {
  items: TocItem[];
  active?: string;
}

const TableOfContents = React.forwardRef<HTMLElement, TableOfContentsProps>(
  ({ className, items, active, ...props }, ref) => (
    <nav ref={ref} aria-label="Table of contents" className={cn("flex flex-col gap-0.5 font-sans", className)} {...props}>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            style={{ paddingInlineStart: `${((item.level ?? 1) - 1) * 12 + 12}px` }}
            className={cn(
              "-ms-px border-s py-1.5 text-body-sm outline-none transition-colors",
              isActive ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  ),
);
TableOfContents.displayName = "TableOfContents";

export { TableOfContents };
