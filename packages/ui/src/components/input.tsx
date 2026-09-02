"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Input — generated from Figma "KinetixUI" › UI Components ›
 * 01. Form Inputs › Input (node 54855:13836).
 *
 * Figma component property: state = Default | Focus | Error | Disabled.
 * Focus is the CSS `:focus-visible` pseudo-class and Disabled is the native
 * attribute; the `state` prop force-pins one for docs / snapshots, and
 * `state="Error"` sets `aria-invalid`. Focus uses the `--shadow-focus` token.
 *
 * Figma's component bundles a label + helper text; those live in the `Field`
 * composition (their colour tracks the control's state). This is the bare
 * control. Tokens: border `--input`, focus `--ring`, error `--destructive`,
 * radius `--radius-sm` (Figma `input` = 4px), padding `--spacing-3`,
 * text = Body Medium (14 / 20, +0.25).
 */
const inputVariants = cva(
  [
    "flex w-full border border-input bg-background px-3 py-3",
    "font-sans text-[14px] leading-5 tracking-[0.25px] text-foreground",
    "placeholder:text-muted-foreground",
    "outline-none transition-colors",
    "focus-visible:border-primary focus-visible:shadow-focus",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-destructive",
  ],
  {
    variants: {
      state: {
        Default: "",
        Focus: "border-primary shadow-focus",
        Error: "border-destructive",
        Disabled: "opacity-50 pointer-events-none",
      },
      /** corner style — matches the design source's Corners property */
      corners: {
        sharp: "rounded-none",
        default: "rounded-sm",
        rounded: "rounded-md",
        pill: "rounded-full px-4",
      },
    },
    defaultVariants: { state: "Default", corners: "default" },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, corners, type = "text", disabled, "aria-invalid": ariaInvalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      data-state={state ? state.toLowerCase() : undefined}
      aria-invalid={ariaInvalid ?? (state === "Error" || undefined)}
      disabled={disabled || state === "Disabled"}
      className={cn(inputVariants({ state, corners }), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input, inputVariants };
