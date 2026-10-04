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
 * The shell follows the text-entry state contract (TOKENS.md, "Composite fields"): it is ONE field, so it
 * carries the field's edge, hover, focus, invalid, read-only and disabled states, read from the input inside
 * it. Add-ons draw no border of their own except an `InputGroupButton`'s quiet internal divider.
 *
 *   rest       edge `--muted-foreground` at 80% (3:1 on a card; `--input` was 2.2:1)
 *   hover      the edge steps to full `--muted-foreground` — never over focus, invalid, read-only or disabled
 *   focus      the INPUT focused → `--action` edge + `--shadow-focus` on the shell. An add-on button focused
 *              → that button's own inset ring, and the shell stays at rest: the ring says which part has focus
 *   invalid    `aria-invalid="true"` on the input → `--destructive` edge, kept under the pointer and focus
 *   read-only  `readonly` on the input → the inset `--muted` fill
 *   disabled   a disabled input → `--opacity-disabled`, inert
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
        "flex w-full items-center overflow-hidden rounded-sm border border-muted-foreground/80 bg-background font-sans",
        "transition-[border-color,box-shadow,background-color] duration-instant ease-standard",
        "[@media(hover:hover)]:hover:[&:not(:has([data-slot=input-group-input]:is(:focus,:disabled,[readonly],[aria-invalid=true])))]:border-muted-foreground",
        "has-[[data-slot=input-group-input][readonly]]:bg-muted",
        "has-[[data-slot=input-group-input]:focus:not([aria-invalid=true])]:border-action has-[[data-slot=input-group-input]:focus]:shadow-focus",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:has-[[data-slot=input-group-input]:focus]:shadow-focus-destructive",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-disabled",
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
  variants: { align: { start: "ps-3", end: "pe-3" } },
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
      // The divider is internal structure, deliberately quieter than the shell's edge: the shell is the one
      // boundary of the field, the divider only says where the button begins.
      "flex h-full shrink-0 items-center gap-1.5 self-stretch border-s border-input bg-muted px-3 text-label-md text-foreground",
      // Hover is the selection controls' `foreground` state layer (8%), which reads on `muted` in both themes —
      // `accent` equals `muted` in dark, so an accent fill changed nothing there. Focus is the inset ring, and
      // only focus draws it: a ring on hover made the pointer look exactly like keyboard focus.
      "outline-none transition-[background-color,box-shadow] duration-instant ease-standard",
      // (an inset shadow, so it layers over `muted` and composes with the ring instead of replacing either)
      "[@media(hover:hover)]:enabled:hover:shadow-[inset_0_0_0_100vmax_hsl(var(--foreground)/0.08)]",
      "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-disabled",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
InputGroupButton.displayName = "InputGroupButton";

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton };
