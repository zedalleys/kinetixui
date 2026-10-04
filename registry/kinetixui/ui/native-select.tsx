"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * NativeSelect — a styled wrapper around the native `<select>` element,
 * for when a form should submit synchronously without JS (or just prefers
 * the OS-native picker on mobile) instead of Select's Radix popover.
 * Matches Input's `inputVariants` styling 1:1 so the two are drop-in
 * interchangeable in a Field. Gap-fill addition (not in the original
 * Figma source) — matches the shadcn/ui Native Select API shape.
 *
 * Same text-entry state contract as Input (TOKENS.md, "Text entry and navigation") — rest edge, hover,
 * focus, invalid, disabled — minus read-only, which `<select>` does not have. Its placeholder is the
 * empty-valued option: while it is the selection the field's text is `--muted-foreground`, so an unanswered
 * select reads as unanswered next to a filled one (it used to render in the value's colour). The options in
 * the open picker keep `--foreground`.
 */
const nativeSelectVariants = cva(
  [
    "flex w-full appearance-none border border-muted-foreground/80 bg-background px-3 py-3 pe-9",
    "font-sans text-body-md text-foreground",
    "[&:has(option[value='']:checked)]:text-muted-foreground [&_option]:text-foreground",
    "outline-none transition-[border-color,box-shadow,background-color] duration-instant ease-standard",
    "[@media(hover:hover)]:enabled:hover:[&:not(:focus):not([aria-invalid=true]):not([readonly]):not([data-state=focus])]:border-muted-foreground",
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

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof nativeSelectVariants> {}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, state, corners, disabled, "aria-invalid": ariaInvalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        data-slot="native-select"
        data-state={state ? state.toLowerCase() : undefined}
        aria-invalid={ariaInvalid ?? (state === "Error" || undefined)}
        disabled={disabled || state === "Disabled"}
        className={cn(nativeSelectVariants({ state, corners }), className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";

export interface NativeSelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const NativeSelectOption = React.forwardRef<HTMLOptionElement, NativeSelectOptionProps>(
  ({ ...props }, ref) => <option ref={ref} {...props} />,
);
NativeSelectOption.displayName = "NativeSelectOption";

export interface NativeSelectOptGroupProps extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {}

const NativeSelectOptGroup = React.forwardRef<HTMLOptGroupElement, NativeSelectOptGroupProps>(
  ({ ...props }, ref) => <optgroup ref={ref} {...props} />,
);
NativeSelectOptGroup.displayName = "NativeSelectOptGroup";

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup, nativeSelectVariants };
