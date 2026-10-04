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
 * control. Tokens: border `--muted-foreground`, focus `--ring`, error `--destructive`,
 * radius `--radius-sm` (Figma `input` = 4px), padding `--spacing-3`,
 * text = Body Medium (14 / 20, +0.25).
 *
 * It follows the text-entry state contract (TOKENS.md, "Text entry and navigation"):
 *
 *   rest       edge `--muted-foreground` at 80% — 3.4:1 light / 5.4:1 dark on a card, where `--input` was
 *              2.2:1 / 2.4:1 and was the only thing marking where the field is (SC 1.4.11)
 *   hover      a pointer that can hover: the edge steps to full `--muted-foreground`. Not on a focused,
 *              invalid, read-only or disabled field — hover never takes over a stronger state
 *   focus      `--action` edge + the `--shadow-focus` ring, the strongest signal, unchanged by the pointer
 *   invalid    `aria-invalid="true"` → `--destructive` edge and ring, which hover does not replace; the
 *              field's error text is the non-colour cue (SC 1.4.1)
 *   read-only  an inset `--muted` fill, full-strength text, no hover: readable and selectable, not editable
 *   disabled   `--opacity-disabled`, inert
 *
 * Motion: border-color, box-shadow and background-color over `duration-instant` with `ease-standard`.
 * Reduced motion collapses it (the library floor) and lands on the same end state.
 */
const inputVariants = cva(
  [
    "flex w-full border border-muted-foreground/80 bg-background px-3 py-3",
    "font-sans text-body-md text-foreground",
    "placeholder:text-muted-foreground",
    "outline-none transition-[border-color,box-shadow,background-color] duration-instant ease-standard",
    "[@media(hover:hover)]:enabled:hover:[&:not(:focus):not([aria-invalid=true]):not([readonly]):not([data-state=focus])]:border-muted-foreground",
    "[&[readonly]]:bg-muted",
    "focus-visible:border-action focus-visible:shadow-focus",
    "disabled:cursor-not-allowed disabled:opacity-disabled",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-destructive",
  ],
  {
    variants: {
      state: {
        Default: "",
        Focus: "border-action shadow-focus",
        Error: "border-destructive",
        Disabled: "opacity-disabled pointer-events-none",
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
