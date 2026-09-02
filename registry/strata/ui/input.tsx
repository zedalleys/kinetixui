import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** STUB — see packages/ui/src/components/input.tsx. Fill from Figma node 54855:13836. */
const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-[14px] leading-5 font-sans text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
  {
    variants: {
      state: { Default: "border-input", Error: "border-destructive focus-visible:ring-destructive" },
    },
    defaultVariants: { state: "Default" },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} data-slot="input" className={cn(inputVariants({ state }), className)} {...props} />
  ),
);
Input.displayName = "Input";

export { Input, inputVariants };
