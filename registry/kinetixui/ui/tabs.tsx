"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Tabs — one navigation group, following the navigation state contract (TOKENS.md, "Text entry and
 * navigation") and the surface model:
 *
 *   list       an inset well, `--surface-grouped` — below a Card in both themes; at large text sizes the tabs
 *              wrap inside it rather than running off the page
 *   rest       unselected tabs in `--muted-foreground`
 *   hover      an unselected tab gets the selection controls' `--foreground` state layer at 8% and
 *              `--foreground` text
 *   selected   a small raised surface on the well — `--card`, the Card's half-strength `--border` edge and
 *              `sm` depth — and `--foreground` text, so it is surface + edge + depth, never colour alone. The
 *              list used to be `--muted` with a `--background` tab, which in dark mode put the selected tab
 *              BELOW its well (measured: tab L 0.0031, well L 0.0167) — the inversion SegmentedControl had
 *   focus      the 2px `--ring`, `!important` so the selected tab's edge cannot cover it; the selected
 *              surface stays under it
 *   disabled   `--opacity-disabled`, inert
 *
 * There is no pressed state: Radix selects a tab on pointer-down, so pressing IS selecting.
 * Motion: colour, background and box-shadow over `duration-fast` with `ease-standard`; nothing moves.
 */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // `min-h-9` and `flex-wrap`, not `h-9`: identical at the default text size, but at 200% text three
      // tabs need 440px and a phone gives them 358 — the strip ran 82px off the page (large-text pass), and a
      // fixed-height well would have clipped a second row. Now the tabs wrap inside the well and it grows.
      "inline-flex min-h-9 max-w-full flex-wrap items-center justify-center rounded-lg bg-surface-grouped p-1 text-muted-foreground font-sans",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium",
      "transition-[color,background-color,box-shadow] duration-fast ease-standard",
      "[@media(hover:hover)]:enabled:hover:data-[state=inactive]:bg-foreground/[0.08] [@media(hover:hover)]:enabled:hover:data-[state=inactive]:text-foreground",
      "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:[box-shadow:inset_0_0_0_1px_hsl(var(--border)/0.5),var(--shadow-sm)]",
      "focus-visible:outline-none focus-visible:!ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-disabled",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
