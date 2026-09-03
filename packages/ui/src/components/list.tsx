"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * List — a composable list of rows: leading icon/avatar, title, optional
 * description, trailing content. Distinct from `Table` (tabular data): List
 * is single-column, built for mobile menus, settings screens and search
 * results.
 */
const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} role="list" className={cn("flex flex-col divide-y divide-border", className)} {...props} />
  ),
);
List.displayName = "List";

export interface ListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
  /** render as a pressable row */
  onSelect?: () => void;
}

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, leading, title, description, trailing, disabled, onSelect, ...props }, ref) => {
    const interactive = !!onSelect && !disabled;
    return (
      <div
        ref={ref}
        role={interactive ? "button" : "listitem"}
        tabIndex={interactive ? 0 : undefined}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onSelect}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.();
                }
              }
            : undefined
        }
        className={cn(
          "flex items-center gap-3 px-3 py-3 font-sans outline-none",
          interactive && "cursor-pointer hover:bg-accent focus-visible:bg-accent",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
        {...props}
      >
        {leading && <div className="flex shrink-0 items-center justify-center">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-body-md text-foreground">{title}</div>
          {description && <div className="truncate text-body-sm text-muted-foreground">{description}</div>}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
      </div>
    );
  },
);
ListItem.displayName = "ListItem";

export { List, ListItem };
