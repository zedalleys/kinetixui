"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PriceBreakdown — how an amount is made up: a subtotal, the taxes, fees, discounts, shipping or credits
 * applied to it, and the total. The same shape serves a checkout, an invoice, a booking quote, a refund, a
 * payroll slip and a transfer fee summary, so nothing in it says "cart" or "order".
 *
 * Semantics: a `<dl>`. Each line is a term (what the amount is) and its definition (the amount), which is
 * exactly what a screen reader user needs to hear in order — "Tax, VAT 20%, €21.60". The total is the last
 * pair, set apart by weight and a rule rather than by a different element, so it is still read as part of
 * the same list.
 *
 * Amounts are supplied FORMATTED. Currency, locale, rounding and the way a negative amount is written
 * (−€12.00, -12,00 €, (€12.00)) belong to the product's money layer, and a UI component that formatted
 * them would be guessing. That has one consequence for `kind="deduction"`: the minus sign must be in the
 * value you pass. The deduction colour is reinforcement, never the only signal that a line reduces the
 * total (WCAG 1.4.1).
 *
 * Amounts use tabular figures and sit on the inline end, so columns of digits line up and the layout
 * mirrors under RTL. A long label wraps; when a row is too narrow for both (200% text on a phone), the
 * amount drops onto its own line at the inline end rather than overflowing or being clipped.
 */
const PriceBreakdown = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => (
    <dl ref={ref} className={cn("flex w-full min-w-0 flex-col gap-2 font-sans text-body-md", className)} {...props} />
  ),
);
PriceBreakdown.displayName = "PriceBreakdown";

export interface PriceBreakdownLineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** What the amount is — "Subtotal", "Service fee", "Discount". */
  label: React.ReactNode;
  /** The formatted amount, including its sign. */
  value: React.ReactNode;
  /** A qualifier under the label — "VAT 20%", "Code SPRING10", "2 nights × €80". */
  description?: React.ReactNode;
  /** `deduction` for a line that reduces the total (discount, credit, refund). The value must still carry its minus sign. */
  kind?: "default" | "deduction";
}

const Row = React.forwardRef<
  HTMLDivElement,
  PriceBreakdownLineProps & { emphasis?: boolean }
>(({ className, label, value, description, kind = "default", emphasis = false, ...props }, ref) => (
  <div
    ref={ref}
    data-kind={kind}
    className={cn(
      "flex min-w-0 flex-wrap items-baseline justify-between gap-x-4",
      emphasis && "mt-1 border-t border-border pt-3",
      className,
    )}
    {...props}
  >
    <dt className="flex min-w-0 grow basis-48 flex-col">
      <span className={emphasis ? "text-title-md font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      {description && <span className="text-body-sm text-muted-foreground">{description}</span>}
    </dt>
    <dd
      className={cn(
        "ms-auto shrink-0 text-end tabular-nums",
        emphasis ? "text-title-lg font-semibold text-foreground" : "text-foreground",
        kind === "deduction" && "text-success",
      )}
    >
      {value}
    </dd>
  </div>
));
Row.displayName = "PriceBreakdownRow";

const PriceBreakdownLine = React.forwardRef<HTMLDivElement, PriceBreakdownLineProps>((props, ref) => (
  <Row ref={ref} {...props} />
));
PriceBreakdownLine.displayName = "PriceBreakdownLine";

export type PriceBreakdownTotalProps = Omit<PriceBreakdownLineProps, "kind">;

/** The final line — what is paid, refunded or owed. One per breakdown, last. */
const PriceBreakdownTotal = React.forwardRef<HTMLDivElement, PriceBreakdownTotalProps>((props, ref) => (
  <Row ref={ref} emphasis data-slot="price-breakdown-total" {...props} />
));
PriceBreakdownTotal.displayName = "PriceBreakdownTotal";

export { PriceBreakdown, PriceBreakdownLine, PriceBreakdownTotal };
