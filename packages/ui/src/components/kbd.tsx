"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils";

/**
 * Kbd — a single keyboard key glyph, e.g. `<Kbd>⌘</Kbd>`. Wrap several in
 * `KbdGroup` for a shortcut combo (`⌘` `K`). Gap-fill addition (not in the
 * original Figma source) — matches the shadcn/ui Kbd/KbdGroup API shape.
 */
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** render as the single child element (Radix Slot) instead of <kbd> */
  asChild?: boolean;
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "kbd";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-input bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});
Kbd.displayName = "Kbd";

export interface KbdGroupProps extends React.HTMLAttributes<HTMLElement> {}

/** Lays out multiple `Kbd` for a shortcut combo — `<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>` */
const KbdGroup = React.forwardRef<HTMLElement, KbdGroupProps>(({ className, ...props }, ref) => (
  <kbd ref={ref} className={cn("inline-flex items-center gap-1", className)} {...props} />
));
KbdGroup.displayName = "KbdGroup";

export { Kbd, KbdGroup };
