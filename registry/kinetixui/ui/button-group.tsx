"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ButtonGroup — visually joins adjacent buttons into a connected cluster
 * (segmented-control style): inner corners squared off, shared borders
 * overlapped by 1px so they don't double up, the focused child raised
 * above its neighbours so its ring isn't clipped. Gap-fill addition (not
 * in the original Figma source) — matches the shadcn/ui ButtonGroup API
 * shape. Works with any child that renders its own border/radius (Button,
 * ButtonGroupText, a Select trigger, …), not just `<Button>`.
 */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-orientation={orientation}
      className={cn(
        "flex w-fit items-stretch [&>*]:relative [&>*]:focus-visible:z-10",
        orientation === "horizontal"
          ? "flex-row [&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none"
          : "flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
        className,
      )}
      {...props}
    />
  ),
);
ButtonGroup.displayName = "ButtonGroup";

export interface ButtonGroupSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

/** A thin divider between segments — useful between non-outline buttons, where the group's own overlap trick has no shared border to lean on. */
const ButtonGroupSeparator = React.forwardRef<HTMLDivElement, ButtonGroupSeparatorProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn("shrink-0 self-stretch bg-border", orientation === "vertical" ? "my-1.5 w-px" : "mx-1.5 h-px", className)}
      {...props}
    />
  ),
);
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";

/** A static, non-interactive label segment inside a group — e.g. a unit or a prefix next to steppers. */
const ButtonGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-input bg-muted px-3 text-label-md text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
ButtonGroupText.displayName = "ButtonGroupText";

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
