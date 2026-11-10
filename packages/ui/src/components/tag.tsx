"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn, focusAfterRemoval } from "../lib/utils";

/**
 * Tag — reconciled 1:1 with the KinetixUI design source, node 54855:14021.
 * Container-tinted, dismissible chip (distinct from Badge, which is a solid
 * pill). `rounded-sm`, `--spacing-2` / `--spacing-1` pad, Label Medium type,
 * optional close button. Variants: default | secondary | destructive | warning | outline.
 */
const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-label-md font-sans",
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
  /** Accessible name for the dismiss button. Defaults to `Remove <tag text>`
   * when the tag's children are a plain string, so a row of tags does not
   * become a row of identical "Remove" buttons. Pass this when the children
   * are not a string, or when the text is not the right name. */
  removeLabel?: string;
  /** render as the single child element (Radix Slot) instead of <span> —
   * e.g. `<Tag asChild><a href="/filter">Active</a></Tag>` for a linked tag.
   * Combined with `onRemove`, the remove button nests inside the slotted
   * element (Slot can only render one root node) — fine for a <div>/<span>,
   * but avoid pairing asChild+onRemove with an <a>, since a nested <button>
   * inside an anchor is invalid HTML. */
  asChild?: boolean;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, onRemove, removeLabel, children, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    const name = removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove");
    const removeButton = onRemove && (
      <button
        type="button"
        data-kx-remove=""
        onClick={(event) => {
          // The button is about to unmount with its own chip. Hand the keyboard to the next chip's
          // remove button first, or focus is dropped on <body> and the next Tab restarts from the
          // top of the page. Scoped to this chip's own container, so one group's last chip does not
          // send focus into an unrelated group. See focusAfterRemoval in ../lib/utils.
          const trigger = event.currentTarget;
          focusAfterRemoval(trigger, "[data-kx-remove]", {
            scope: trigger.closest("[data-slot=tag]")?.parentElement ?? null,
          });
          onRemove();
        }}
        aria-label={name}
        className="-me-0.5 ms-0.5 rounded-[2px] opacity-muted outline-none transition-opacity hover:opacity-visible focus-visible:ring-1 focus-visible:ring-current"
      >
        <X className="size-3.5" />
      </button>
    );
    return (
      <Comp ref={ref} data-slot="tag" className={cn(tagVariants({ variant }), className)} {...props}>
        {asChild ? <Slottable>{children}</Slottable> : children}
        {removeButton}
      </Comp>
    );
  },
);
Tag.displayName = "Tag";

export { Tag, tagVariants };
