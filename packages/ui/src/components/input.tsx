import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  STUB — pattern reference only. Fill from Figma node 54855:13836
 *  (01. Form Inputs › Input) using the same method as button.tsx:
 *    1. get_design_context on the node
 *    2. read the per-`State` fills/borders → map to semantic tokens
 *    3. express State=Focused/Error/Disabled as pseudo-classes + `data-*`
 *  Figma variant matrix: state = Default | Focus | Error | Disabled
 * ─────────────────────────────────────────────────────────────────────────────
 */
const inputVariants = cva(
  [
    "flex w-full rounded-md border bg-background px-3 py-2",
    "text-[14px] leading-5 font-sans text-foreground",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      state: {
        Default: "border-input",
        Error: "border-destructive focus-visible:ring-destructive", // TODO confirm error ring token in Figma
      },
    },
    defaultVariants: { state: "Default" },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(inputVariants({ state }), className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input, inputVariants };
