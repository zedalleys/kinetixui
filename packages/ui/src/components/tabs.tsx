"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../lib/utils";

/** Peer content navigation. Text-first tabs share a base rail and a foreground indicator.
 * Stable weight avoids layout shifts. Radix retains selection, focus, keyboard and direction behavior.
 * Horizontal lists scroll locally at narrow widths/large text; vertical lists use the inline-end rail.
 */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, onFocusCapture, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-kx-tabs-list=""
    onFocusCapture={(event) => {
      onFocusCapture?.(event);
      if (event.defaultPrevented) return;
      const list = event.currentTarget;
      const tab = event.target as HTMLElement;
      const l = list.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      // Scroll this list only, without moving the page. Physical geometry works in either direction.
      const delta = t.left < l.left ? t.left - l.left : t.right > l.right ? t.right - l.right : 0;
      if (delta && typeof list.scrollBy === "function") list.scrollBy({ left: delta, behavior: "instant" });
    }}
    className={cn(
      "inline-flex min-h-11 w-full min-w-0 max-w-full items-stretch justify-start gap-1 overflow-x-auto overscroll-x-contain border-b border-border text-muted-foreground font-sans [scrollbar-width:thin]",
      "data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:[border-inline-end-width:1px]",
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
      "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:[border-inline-end-width:2px]",
      "transition-colors duration-fast ease-standard motion-reduce:transition-none",
      "[@media(hover:hover)]:enabled:hover:data-[state=inactive]:bg-foreground/[0.08] [@media(hover:hover)]:enabled:hover:data-[state=inactive]:text-foreground",
      "data-[state=active]:border-foreground data-[state=active]:text-foreground",
      "focus-visible:outline-none focus-visible:!ring-2 focus-visible:ring-inset focus-visible:ring-ring forced-colors:focus-visible:[outline:2px_solid_Highlight] forced-colors:focus-visible:outline-offset-[-2px]",
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
    className={cn("mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring forced-colors:focus-visible:[outline:2px_solid_Highlight] forced-colors:focus-visible:outline-offset-[-2px]", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
