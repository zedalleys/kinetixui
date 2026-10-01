"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";
import { cn } from "../lib/utils";

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn("flex flex-wrap items-center gap-2 has-[:disabled]:opacity-disabled", containerClassName)}
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
    // sideways to type a code into is worse than that. The group's rounded ends and shared dividers are
    // written for a single row, so a wrapped row shows square outer corners: deliberate, and the price.
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
        "relative flex size-9 items-center justify-center border border-input text-sm shadow-sm",
        "[&:not(:first-child)]:-ms-px first:rounded-s-md last:rounded-e-md",
        "transition-[color,border-color,box-shadow] duration-instant",
        // ring is a box-shadow, which forced-colors mode strips; the outline survives it
        isActive && "z-docked ring-1 ring-ring forced-colors:[outline:2px_solid] forced-colors:[outline-offset:-2px]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-slower" />
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
