"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — generated from Figma "KinetixUI" › UI Components ›
 * 02. Controls & Actions › Button (node 54863:351).
 *
 * Figma variant matrix (mirrored 1:1 below):
 *   variant : Primary | Secondary | Outline | Destructive | Ghost | Link
 *   size    : sm | md | lg | icon
 *   state   : Default | Hover | Focus | Active | Disabled
 *
 * `state` is expressed idiomatically: Hover/Focus/Active are CSS pseudo-classes
 * (`hover:` / `focus-visible:` / `active:`), Disabled is the native attribute.
 * The optional `state` prop force-pins one visual state for docs / snapshots.
 *
 * Colors resolve to the semantic token contract in
 * @kinetixui/tokens/dist/web/globals.css.
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 shrink-0",
    "font-sans font-medium whitespace-nowrap select-none",
    "rounded-md transition-colors outline-none",
    "focus-visible:shadow-focus",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        // bg primary / text on-primary; hover+active step down the blue ramp; disabled -> border grey
        Primary:
          "bg-primary text-primary-foreground hover:bg-[--color-blue-600] active:bg-[--color-blue-700] disabled:bg-border disabled:text-muted-foreground",
        // rest = secondaryContainer; hover/active promote to full secondary with on-secondary text
        Secondary:
          "bg-secondary text-secondary-foreground hover:bg-[--color-green-500] hover:text-[--color-green-50] active:bg-[--color-green-600] active:text-[--color-green-50] focus-visible:bg-secondary disabled:bg-border disabled:text-muted-foreground",
        // 1px outline; hover fills with accent (LightBlue); active pins primary border+text
        Outline:
          "border border-input bg-transparent text-foreground hover:bg-accent active:border-primary active:bg-accent active:text-primary disabled:border-input disabled:text-muted-foreground disabled:bg-transparent",
        Destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95 active:brightness-90 disabled:bg-border disabled:text-muted-foreground",
        Ghost:
          "bg-transparent text-foreground hover:bg-accent active:bg-accent active:text-primary disabled:text-muted-foreground disabled:bg-transparent",
        Link: "bg-transparent text-primary underline-offset-4 hover:underline hover:text-foreground rounded-none px-0 disabled:text-muted-foreground disabled:no-underline",
      },
      size: {
        // padding = Figma spacing/3 + spacing/2 ; type = Label Small (11/16, +0.5 tracking)
        sm: "px-3 py-2 text-[11px] leading-4 tracking-[0.5px]",
        // spacing/4 + spacing/3 ; Label Medium (12/16, +0.5)
        md: "px-4 py-3 text-[12px] leading-4 tracking-[0.5px]",
        // spacing/6 + spacing/3 ; Label Large (14/20, +0.1)
        lg: "px-6 py-3 text-[14px] leading-5 tracking-[0.1px]",
        // spacing/3 all round, square
        icon: "p-3 [&>*:not(svg)]:sr-only",
      },
      /** force a static visual state — leave undefined for real interaction */
      state: {
        Default: "",
        Hover: "",
        Focus: "shadow-focus",
        Active: "",
        Disabled: "pointer-events-none opacity-50",
      },
      /** corner style — matches the design source's Corners property */
      corners: {
        sharp: "rounded-none",
        default: "",
        pill: "rounded-full",
      },
    },
    compoundVariants: [
      { variant: "Destructive", class: "focus-visible:shadow-focus-destructive" },
      { variant: "Primary", state: "Hover", class: "bg-[--color-blue-600]" },
      { variant: "Primary", state: "Active", class: "bg-[--color-blue-700]" },
      { variant: "Secondary", state: "Hover", class: "bg-[--color-green-500] text-[--color-green-50]" },
      { variant: "Secondary", state: "Active", class: "bg-[--color-green-600] text-[--color-green-50]" },
      { variant: "Outline", state: "Hover", class: "bg-accent" },
      { variant: "Outline", state: "Active", class: "border-primary bg-accent text-primary" },
      { variant: "Ghost", state: "Hover", class: "bg-accent" },
      { variant: "Ghost", state: "Active", class: "bg-accent text-primary" },
      { variant: "Link", state: "Hover", class: "underline text-foreground" },
      { variant: "Link", size: ["sm", "md", "lg"], class: "py-2 px-0 h-auto" },
    ],
    defaultVariants: { variant: "Primary", size: "md", state: "Default", corners: "default" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  /** render as the single child element (Radix Slot) instead of <button> */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, state, corners, asChild = false, disabled, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant ?? "Primary"}
        data-size={size ?? "md"}
        disabled={disabled || state === "Disabled"}
        className={cn(buttonVariants({ variant, size, state, corners }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
