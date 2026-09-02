import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * KinetixUI Input — generated 1:1 from Figma node 54855:13836.
 * state: Default | Focus | Error | Disabled  (Focus = :focus-visible,
 * Disabled = native, state="Error" sets aria-invalid). Bare control — label +
 * helper live in the Field composition.
 */
const inputVariants = cva(
  [
    "flex w-full rounded-sm border border-input bg-background px-3 py-3",
    "font-sans text-[14px] leading-5 tracking-[0.25px] text-foreground",
    "placeholder:text-muted-foreground outline-none transition-colors",
    "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
  ],
  {
    variants: {
      state: {
        Default: "",
        Focus: "border-primary ring-1 ring-inset ring-primary",
        Error: "border-destructive",
        Disabled: "opacity-50 pointer-events-none",
      },
    },
    defaultVariants: { state: "Default" },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, type = "text", disabled, "aria-invalid": ariaInvalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      data-state={state ? state.toLowerCase() : undefined}
      aria-invalid={ariaInvalid ?? (state === "Error" || undefined)}
      disabled={disabled || state === "Disabled"}
      className={cn(inputVariants({ state }), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input, inputVariants };
