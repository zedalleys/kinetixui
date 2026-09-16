"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * PageHeader — title + optional breadcrumb + description + action
 * cluster + optional tabs row. A recipe every docs/app screen re-lays
 * out by hand; `breadcrumb`/`actions`/`tabs` are plain slots so callers
 * compose their own `Breadcrumb`/`Button`/`Tabs` (or `SegmentedControl`)
 * into them rather than PageHeader re-implementing any of those. Gap-fill
 * addition (not in the original Figma source).
 */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, breadcrumb, actions, tabs, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-4 border-b border-border pb-6 font-sans", className)}
      {...props}
    >
      {breadcrumb && <div className="text-body-sm">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-headline-sm font-medium text-foreground">{title}</h1>
          {description && <p className="text-body-md text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="-mb-6">{tabs}</div>}
    </div>
  ),
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
