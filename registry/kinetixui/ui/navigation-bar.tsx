"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NavigationBar — a mobile top app bar. Leading back button (or a custom
 * `leading` slot), title with optional info text, trailing actions.
 */
export interface NavigationBarProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  infoText?: React.ReactNode;
  onBack?: () => void;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

const NavigationBar = React.forwardRef<HTMLElement, NavigationBarProps>(
  ({ className, title, infoText, onBack, leading, actions, ...props }, ref) => (
    <header
      ref={ref}
      className={cn("flex h-14 w-full items-center gap-2 border-b border-border bg-background px-2 font-sans", className)}
      {...props}
    >
      <div className="flex min-w-9 shrink-0 items-center">
        {leading ??
          (onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex size-9 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-accent hover:ring-1 hover:ring-inset hover:ring-ring focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <ChevronLeft className="size-5" />
            </button>
          ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-lg font-medium text-foreground">{title}</p>
        {infoText && <p className="truncate text-body-sm text-muted-foreground">{infoText}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  ),
);
NavigationBar.displayName = "NavigationBar";

export { NavigationBar };
