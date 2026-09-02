"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Tag — reconciled 1:1 with the KinetixUI design source, node 54855:14021.
 * Container-tinted, dismissible chip (distinct from Badge, which is a solid
 * pill). `rounded-sm`, `--spacing-2` / `--spacing-1` pad, Label Medium type,
 * optional close button. Variants: default | secondary | destructive | warning | outline.
 */
const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium font-sans tracking-[0.5px]",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive-foreground text-destructive",
        warning: "bg-warning-foreground text-warning",
        outline: "border border-input text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  /** show a dismiss button; called when it's clicked */
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, onRemove, children, ...props }, ref) => (
    <span ref={ref} className={cn(tagVariants({ variant }), className)} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="-mr-0.5 ml-0.5 rounded-[2px] opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-current"
        >
          <X className="size-3.5" />
        </button>
      )}
    </span>
  ),
);
Tag.displayName = "Tag";

export { Tag, tagVariants };
