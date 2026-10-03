"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Card — a raised surface (TOKENS.md, "Surface model").
 *
 * At rest it is separated from the page by elevation and a soft edge, not by a heavy stroke: the edge is
 * `--border` at half strength, so the card no longer draws the same line as the inputs and buttons inside
 * it, and the `md` step of the elevation ladder gives it a contact shadow that the old `sm` (5% black)
 * did not visibly have. Both stay on tokens, so Create's surface treatments still reach it — `flat` and
 * `bordered` remove the shadow, `elevated` raises it a rung. On a grouped section (`bg-surface-grouped`)
 * the surface step does most of the work, in dark mode too.
 *
 * A Card is static. It has no hover, no pressed state and no pointer cursor, because a surface that
 * reacts to the pointer reads as clickable, and a static card that does is a false affordance.
 *
 * Interaction is opt-in through semantics, not through a flag: `asChild` renders the card as its single
 * child, and the interactive states below are keyed on that element BEING interactive — an `<a href>` or
 * a `<button>`. So the visual states cannot drift from what the element actually does: a `<div>` never
 * gets them, a link always does, and a consumer cannot style a static card as clickable by accident.
 * One action per card: the element is the action, so it must not contain other controls.
 *
 *   hover     a pointer that can hover (`@media (hover: hover)`) — edge to full `--border`, lifted to `lg`
 *   pressed   `:active` — back down to `sm` with a `muted` wash, so it differs from hover in depth AND fill
 *   focus     the shared `shadow-focus` ring, which replaces the elevation while focused and so stays the
 *             strongest edge on the card
 *   selected  `aria-pressed="true"` (a toggle button) or `aria-current` (a link to where you are) — a
 *             2px `--primary` edge: a change of WEIGHT as well as colour, so it is not carried by hue alone
 *
 * Motion: box-shadow, border-color and background-color over `duration-fast` with `ease-standard`, the
 * catalogue's tier for a state change on a control. Nothing moves or resizes, so there is no layout shift,
 * and under `prefers-reduced-motion` the transition is removed and every state lands immediately.
 */
// Every class is written out in full: Tailwind finds classes by scanning source text, so a selector
// assembled from constants would never be generated.
const INTERACTIVE = [
  // A link is inline by default and a button centres its text, so the element is made a block that reads
  // from the start edge. These come after plain utilities in the stylesheet, so lay an interactive card out
  // with flex or grid on an inner element (as CardHeader does) rather than on the card itself.
  "[&:where(a[href],button)]:block [&:where(button)]:text-start [&:is(a[href],button)]:cursor-pointer",
  "[&:is(a[href],button)]:outline-none",
  "[&:is(a[href],button)]:transition-[box-shadow,border-color,background-color] [&:is(a[href],button)]:duration-fast [&:is(a[href],button)]:ease-standard motion-reduce:transition-none",
  "[@media(hover:hover)]:[&:is(a[href],button)]:hover:border-border [@media(hover:hover)]:[&:is(a[href],button)]:hover:shadow-lg",
  "[&:is(a[href],button)]:active:shadow-sm [&:is(a[href],button)]:active:bg-muted/40",
  // Selected: an inset 1px of --primary inside the 1px --primary border makes a 2px edge, with the
  // elevation of whichever state it is in alongside, since the ring and the elevation share box-shadow.
  // Restated for hover and pressed, which would otherwise take the border and shadow back. Written as the
  // property, not `shadow-[…]`: Tailwind reads an arbitrary shadow that contains `hsl(` as a shadow COLOUR
  // and the ring silently never rendered — `check:card-visual` caught it.
  "[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]))]:border-primary",
  "[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]))]:[box-shadow:inset_0_0_0_1px_hsl(var(--primary)),var(--shadow-md)]",
  "[@media(hover:hover)]:[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]))]:hover:border-primary",
  "[@media(hover:hover)]:[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]))]:hover:[box-shadow:inset_0_0_0_1px_hsl(var(--primary)),var(--shadow-lg)]",
  "[&:is([aria-pressed=true],[aria-current]:not([aria-current=false]))]:active:[box-shadow:inset_0_0_0_1px_hsl(var(--primary)),var(--shadow-sm)]",
  // Focus replaces the elevation with the shared ring and is the strongest edge the card can show. It is
  // `!important` because hover and selected also set box-shadow with selectors at least as specific, and
  // whichever of those Tailwind happens to emit last must not be able to hide the focus ring.
  "[&:is(a[href],button)]:focus-visible:!shadow-focus",
  "disabled:pointer-events-none disabled:opacity-disabled",
].join(" ");

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as the single child element (Radix Slot) instead of a `<div>` — e.g.
   *  `<Card asChild><a href="/reports/q3">…</a></Card>`. When that element is an `<a href>` or a `<button>`,
   *  the card takes the interactive states; anything else stays static. */
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-xl border border-border/50 bg-card text-card-foreground shadow-md font-sans",
        INTERACTIVE,
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
