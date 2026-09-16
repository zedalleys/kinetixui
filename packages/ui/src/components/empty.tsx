"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Empty — a placeholder for a zero-results state (an empty table, an empty
 * search, a fresh workspace with nothing in it yet). Composition-based, like
 * Card: `Empty` is an unstyled-beyond-layout root so it composes cleanly
 * inside whatever already has a border (a Table cell, a Card, a bare page
 * section) instead of forcing its own. Gap-fill addition (not in the
 * original Figma source) — matches the shadcn/ui Empty API shape.
 */
const Empty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-10 text-center font-sans", className)}
      {...props}
    />
  ),
);
Empty.displayName = "Empty";

const EmptyHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex max-w-sm flex-col items-center gap-2", className)} {...props} />
  ),
);
EmptyHeader.displayName = "EmptyHeader";

const emptyMediaVariants = cva("flex shrink-0 items-center justify-center", {
  variants: {
    /** `icon` gives a muted circular badge behind the icon; `default` renders the child as-is (an illustration, an avatar, …) */
    variant: {
      default: "",
      icon: "size-10 rounded-full bg-muted text-muted-foreground [&_svg]:size-5",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface EmptyMediaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyMediaVariants> {}

const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(emptyMediaVariants({ variant }), className)} {...props} />
  ),
);
EmptyMedia.displayName = "EmptyMedia";

const EmptyTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-title-sm font-medium text-foreground", className)} {...props} />
  ),
);
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-body-sm text-muted-foreground", className)} {...props} />
  ),
);
EmptyDescription.displayName = "EmptyDescription";

const EmptyContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col items-center gap-3", className)} {...props} />
  ),
);
EmptyContent.displayName = "EmptyContent";

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent, emptyMediaVariants };
