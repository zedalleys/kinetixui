"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Textarea — generated from Figma "KinetixUI" › UI Components ›
 * 01. Form Inputs › Textarea (node 54855:13857).
 *
 * Identical to `Input` except the field is multi-line: `min-h-[100px]`
 * (Figma `h: 100`) and vertical resize. Same state matrix and tokens.
 */
const textareaVariants = cva(
  [
    "flex w-full min-h-[100px] resize-y rounded-sm border border-input bg-background px-3 py-3",
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
        Disabled: "opacity-50 pointer-events-none resize-none",
      },
    },
    defaultVariants: { state: "Default" },
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, disabled, "aria-invalid": ariaInvalid, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      data-state={state ? state.toLowerCase() : undefined}
      aria-invalid={ariaInvalid ?? (state === "Error" || undefined)}
      disabled={disabled || state === "Disabled"}
      className={cn(textareaVariants({ state }), className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
