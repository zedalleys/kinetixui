import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * KinetixUI Button — generated 1:1 from Figma node 54863:351.
 * variant: Primary | Secondary | Outline | Destructive | Ghost | Link
 * size:    sm | md | lg | icon
 * state:   Default | Hover | Focus | Active | Disabled  (Hover/Focus/Active are
 *          CSS pseudo-classes; `state` prop force-pins one for docs/snapshots)
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 shrink-0 font-sans font-medium",
    "whitespace-nowrap select-none rounded-md transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        Primary:
          "bg-primary text-primary-foreground hover:bg-[--color-blue-600] active:bg-[--color-blue-700] disabled:bg-border disabled:text-muted-foreground",
        Secondary:
          "bg-secondary text-secondary-foreground hover:bg-[--color-green-500] hover:text-[--color-green-50] active:bg-[--color-green-600] active:text-[--color-green-50] disabled:bg-border disabled:text-muted-foreground",
        Outline:
          "border border-input bg-transparent text-foreground hover:bg-accent active:border-primary active:bg-accent active:text-primary disabled:text-muted-foreground",
        Destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95 active:brightness-90 disabled:bg-border disabled:text-muted-foreground",
        Ghost:
          "bg-transparent text-foreground hover:bg-accent active:bg-accent active:text-primary disabled:text-muted-foreground",
        Link: "bg-transparent text-primary underline-offset-4 hover:underline hover:text-foreground rounded-none px-0 disabled:text-muted-foreground",
      },
      size: {
        sm: "px-3 py-2 text-[11px] leading-4 tracking-[0.5px]",
        md: "px-4 py-3 text-[12px] leading-4 tracking-[0.5px]",
        lg: "px-6 py-3 text-[14px] leading-5 tracking-[0.1px]",
        icon: "p-3 [&>*:not(svg)]:sr-only",
      },
      state: {
        Default: "",
        Hover: "",
        Focus: "ring-2 ring-ring",
        Active: "",
        Disabled: "pointer-events-none opacity-50",
      },
    },
    defaultVariants: { variant: "Primary", size: "md", state: "Default" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, state, asChild = false, disabled, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-slot="button"
        disabled={disabled || state === "Disabled"}
        className={cn(buttonVariants({ variant, size, state }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
