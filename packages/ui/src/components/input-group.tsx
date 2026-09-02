"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * InputGroup — a single bordered shell that hosts an input plus fixed add-ons
 * (icon, text, dropdown, button) on either side. Matches the KinetixUI design
 * source's "Fixed Add-on" pattern. Border / focus glow / invalid state apply to
 * the whole group.
 *
 * <InputGroup>
 *   <InputGroupText>https://</InputGroupText>
 *   <InputGroupInput placeholder="kinetixui.com" />
 * </InputGroup>
 */
const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="input-group"
      className={cn(
        "flex w-full items-center overflow-hidden rounded-sm border border-input bg-background font-sans transition-colors",
        "focus-within:border-primary focus-within:shadow-focus",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:focus-within:shadow-focus-destructive",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
InputGroup.displayName = "InputGroup";

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    data-slot="input-group-input"
    className={cn(
      "min-w-0 flex-1 bg-transparent px-3 py-3 text-body-md text-foreground",
      "placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  />
));
InputGroupInput.displayName = "InputGroupInput";

const addonVariants = cva("flex shrink-0 items-center gap-2 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: { align: { start: "pl-3", end: "pr-3" } },
  defaultVariants: { align: "start" },
});

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof addonVariants>
>(({ className, align, ...props }, ref) => (
  <div ref={ref} data-slot="input-group-addon" className={cn(addonVariants({ align }), className)} {...props} />
));
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("select-none whitespace-nowrap px-3 text-body-md text-muted-foreground", className)}
      {...props}
    />
  ),
);
InputGroupText.displayName = "InputGroupText";

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "flex h-full shrink-0 items-center gap-1.5 self-stretch border-l border-input bg-muted px-3 text-label-md text-foreground",
      "outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
InputGroupButton.displayName = "InputGroupButton";

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton };
