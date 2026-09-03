"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TabBar — a mobile bottom navigation bar. A fixed row of icon + label
 * destinations; the active item is driven by `active` on `TabBarItem`.
 */
const TabBar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn("flex w-full items-stretch border-t border-border bg-background font-sans", className)}
      {...props}
    >
      {children}
    </nav>
  ),
);
TabBar.displayName = "TabBar";

export interface TabBarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
}

const TabBarItem = React.forwardRef<HTMLButtonElement, TabBarItemProps>(
  ({ className, icon, label, active, badge, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-label-sm outline-none transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        "focus-visible:bg-accent",
        className,
      )}
      {...props}
    >
      <span className="relative [&_svg]:size-6">
        {icon}
        {badge && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  ),
);
TabBarItem.displayName = "TabBarItem";

export { TabBar, TabBarItem };
