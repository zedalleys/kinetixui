"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    // `group/otp`: the slots read the field's state from the one real input inside this container — see
    // InputOTPSlot.
    containerClassName={cn("group/otp flex flex-wrap items-center gap-2 has-[:disabled]:opacity-disabled", containerClassName)}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    // `flex-wrap` costs nothing at a normal text size — six 36px slots fit the narrowest phone with room
    // to spare — and rescues the case that measured badly: at 2x the default font size on a 390px
    // viewport the slots are 72px each, the row is 432px, and the page gained 106px of horizontal
    // scrolling. A second row of slots is worse-looking than one; a form the reader has to scroll
    // sideways to type a code into is worse than that.
    //
    // Wrapping is only safe because each slot owns its whole border — see InputOTPSlot. A row that
    // borrowed its first edge from `:first-child` would be open at the end it began from.
    <div ref={ref} className={cn("flex flex-wrap items-center", className)} {...props} />
  ),
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {};

  return (
    <div
      ref={ref}
      className={cn(
        // Every slot carries its own border, and each one after the first is pulled back by a pixel so the
        // two borders between neighbours collapse into the single divider the design has always shown.
        //
        // The obvious cheaper spelling — block borders on all, an inline-end divider, and the inline-start
        // edge on `:first-child` — is what this replaces, because `:first-child` is the first slot in the
        // DOM and not the first slot in each visual row. Measured at 390px and 2x text, where six slots
        // wrap: the second row began with `border-s: 0`, so its outer start edge was open in LTR and in
        // RTL alike. That is the same missing-outline defect the logical classes were added to fix, and it
        // came back the moment the row could wrap. With a border on every side of every slot, a row is
        // closed wherever it starts and wherever it ends.
        //
        // Two consequences, both deliberate: the rounded corners still belong to the DOM's first and last
        // slot, so a wrapped row has square outer corners; and two wrapped rows meet in a 2px seam, since
        // no selector can pull a row that only exists at one viewport width. A seam is not an open edge.
        //
        // The slots together are one field and follow the text-entry state contract (TOKENS.md, "Composite
        // fields"), reading its state from the hidden input through `group/otp`:
        //   rest      edge `--muted-foreground` at 80% — 3:1 where `--input` was 2.2:1 — and no elevation: a
        //             field is inset, so the per-slot `shadow-sm` is gone
        //   hover     every slot's edge steps to full `--muted-foreground`; not while focused, invalid or disabled
        //   focus     the ACTIVE slot (where the next character goes) takes `--action` + `--shadow-focus`, the
        //             strongest state, drawn above its neighbours
        //   invalid   `aria-invalid="true"` on InputOTP → `--destructive` edges, kept under pointer and focus
        //   disabled  the container's `--opacity-disabled`; no hover
        "relative flex size-9 items-center justify-center border border-muted-foreground/80 bg-background text-sm",
        "[&:not(:first-child)]:-ms-px first:rounded-s-md last:rounded-e-md",
        "transition-[color,border-color,box-shadow] duration-instant ease-standard",
        "[@media(hover:hover)]:group-[:hover:not(:has(input:is(:focus,:disabled,[aria-invalid=true])))]/otp:border-muted-foreground",
        "group-has-[input[aria-invalid=true]]/otp:border-destructive",
        // ring is a box-shadow, which forced-colors mode strips; the outline survives it
        isActive &&
          "z-docked border-action shadow-focus group-has-[input[aria-invalid=true]]/otp:shadow-focus-destructive forced-colors:[outline:2px_solid] forced-colors:[outline-offset:-2px]",
        className,
      )}
      // A stable hook for the active slot, so tests and gates don't have to read its styling.
      data-active={isActive ? "" : undefined}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink motion-reduce:animate-none bg-foreground duration-slower" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
      <Minus className="size-4" />
    </div>
  ),
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
