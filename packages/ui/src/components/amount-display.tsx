"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * AmountDisplay — one money-like or quantified value, presented: "SAR 1,250.00", "−USD 25.00", "+14.2%",
 * "3.2 kWh". It is the display contract every price, balance, fee, refund and delta in the catalogue can
 * share, so a checkout, a receipt, a wallet and a dashboard tile write an amount the same way.
 *
 * What it OWNS is presentation:
 *
 *   figures    tabular, so a column of amounts lines up digit for digit
 *   sign       `sign="negative" | "positive"` writes a real minus (U+2212) or plus before the amount, and a
 *              visually hidden word ("minus" / "plus", replaceable for localisation) before it, because some
 *              screen readers skip a bare U+2212 and "SAR 25.00" is then heard as a credit
 *   tone       `tone` colours the amount (success / destructive / neutral). It is independent of `sign` on
 *              purpose — a refund is negative and good, a fee is positive and bad — and it is never the only
 *              signal: the sign glyph and the spoken word carry the meaning without colour (WCAG 1.4.1)
 *   direction  the amount is its own bidi run (`dir="auto"` by default, which the UA stylesheet isolates), so
 *              "−SAR 25.00" keeps its order inside an Arabic sentence and an Arabic-formatted "١٬٢٥٠ ر.س"
 *              keeps its own, without either one reordering the text around it
 *   spoken     `accessibleLabel` replaces what assistive technology hears — "minus 25 Saudi riyals" — while
 *              the visible text stays compact. The visible text is then hidden from the accessibility tree,
 *              so the value is announced once, not twice
 *
 * What it does NOT own is the number. `value` arrives FORMATTED by the product's money layer (usually
 * `Intl.NumberFormat`): the component never parses, rounds, converts currency, infers a currency from a
 * locale or computes tax. A display component that did any of that would be guessing, and a guessed amount
 * is worse than none. `currency` is a label you supply ("SAR", "USD", "€", "kWh"), shown as given.
 */
export interface AmountDisplayProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The formatted amount without its sign — "1,250.00". If your formatter already wrote the sign, leave `sign` unset. */
  value: React.ReactNode;
  /** A currency or unit label shown with the value, exactly as given — "SAR", "USD", "€", "%", "kWh". */
  currency?: React.ReactNode;
  /** Where the label sits relative to the value, in reading order. Default "before" ("SAR 1,250.00"). */
  currencyPosition?: "before" | "after";
  /** Writes a sign before the amount, plus a spoken word for it. Default: none. */
  sign?: "positive" | "negative";
  /** Colour reinforcement. Independent of `sign`; never the only signal. Default "neutral". */
  tone?: "positive" | "negative" | "neutral";
  /** `compact` inside lists and tables; `standard` (default) where the amount is the point. */
  size?: "compact" | "standard";
  /** What assistive technology hears instead of the visible text — "minus 25 Saudi riyals". */
  accessibleLabel?: string;
  /** The spoken words for the sign glyphs. Defaults: { positive: "plus", negative: "minus" }. */
  signLabels?: { positive?: string; negative?: string };
}

const SIGN_GLYPH = { positive: "+", negative: "−" } as const;

const AmountDisplay = React.forwardRef<HTMLSpanElement, AmountDisplayProps>(
  (
    {
      className,
      value,
      currency,
      currencyPosition = "before",
      sign,
      tone = "neutral",
      size = "standard",
      accessibleLabel,
      signLabels,
      dir = "auto",
      ...props
    },
    ref,
  ) => {
    const spokenSign = sign ? (signLabels?.[sign] ?? (sign === "negative" ? "minus" : "plus")) : null;
    const label = currency != null && (
      <span data-slot="amount-currency" className="font-normal">
        {currency}
      </span>
    );

    // `relative` keeps the absolutely positioned sr-only words inside this box. Without it they resolve
    // against a far ancestor and escape any scroll container the amount sits in (a table, a preview),
    // widening the page.
    return (
      <span
        ref={ref}
        data-slot="amount-display"
        data-tone={tone}
        data-sign={sign}
        className={cn(
          "relative inline-block whitespace-nowrap font-sans font-semibold tabular-nums",
          size === "compact" ? "text-body-md" : "text-title-lg",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "neutral" && "text-foreground",
          className,
        )}
        {...props}
      >
        {/* The visible run. Hidden from assistive technology only when a replacement label is given. */}
        <span dir={dir} aria-hidden={accessibleLabel ? true : undefined}>
          {spokenSign && !accessibleLabel && <span className="sr-only">{spokenSign} </span>}
          {sign && <span aria-hidden>{SIGN_GLYPH[sign]}</span>}
          {currencyPosition === "before" && label}
          {currencyPosition === "before" && label && " "}
          <span data-slot="amount-value">{value}</span>
          {currencyPosition === "after" && label && " "}
          {currencyPosition === "after" && label}
        </span>
        {accessibleLabel && <span className="sr-only">{accessibleLabel}</span>}
      </span>
    );
  },
);
AmountDisplay.displayName = "AmountDisplay";

export { AmountDisplay };
