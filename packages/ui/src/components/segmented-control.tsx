"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../lib/utils";

/**
 * SegmentedControl — an iOS-style single-select strip. Functionally
 * `ToggleGroup type="single"`: a thin, documented preset over the same
 * Radix primitive with the segmented look (`Tabs`' `TabsList`/
 * `TabsTrigger` visual treatment — filled track, raised active segment)
 * instead of `Toggle`'s individually-outlined-button look. `type="single"`
 * is fixed, not exposed — a segmented control that could go fully
 * unselected or multi-select isn't the pattern. Gap-fill addition (not in
 * the original Figma source).
 */
export type SegmentedControlProps = Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, "type">;

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlProps
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    className={cn("inline-flex items-center rounded-lg bg-muted p-1 font-sans", className)}
    {...props}
  />
));
SegmentedControl.displayName = "SegmentedControl";

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-label-md font-medium text-muted-foreground transition-all",
      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-disabled",
      "data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
      className,
    )}
    {...props}
  />
));
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControl, SegmentedControlItem };
