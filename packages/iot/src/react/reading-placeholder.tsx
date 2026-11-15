import * as React from "react";
import { cn } from "./cn";

/**
 * Internal. The shape a reading occupies before its first value arrives.
 *
 * Not exported from the barrel: it is the one drawing of `loading` shared by the monitoring
 * components, not a skeleton primitive for products to compose. (`@kinetixui/ui` has a `Skeleton`;
 * `@kinetixui/iot` deliberately does not depend on it — React itself is an optional peer here — so
 * this is a boundary, not duplication.)
 *
 * Three properties it has to have, each for a reason:
 *
 * - **It holds the line, and it holds it in `em`.** The bar is sized in `ch` and `em`, so it grows with
 *   the text it stands in for. At 200% text, or in a product whose type scale differs, the slot is
 *   still the size of the value that will land in it, and nothing reflows when it does. A bar sized in
 *   pixels would be a second layout to keep in sync with the first.
 * - **It is readable with no animation at all.** Under `prefers-reduced-motion: reduce` the pulse is
 *   removed and what remains is a visible, filled bar — the correct final state, not an invisible one
 *   waiting for a frame that never comes. `animate-pulse motion-reduce:animate-none` is the pairing
 *   the rest of this package uses.
 * - **It survives forced colours.** A `bg-muted` bar is a background, and forced-colors mode replaces
 *   backgrounds with Canvas: the bar would vanish and the slot would read as empty. A border in
 *   `currentColor` is kept, so the shape stays.
 *
 * It is `aria-hidden`. The fact that a reading is on its way is carried in words by the component's
 * accessible sentence and by `aria-busy` on its container, which is where assistive technology
 * already looks for it. A bar announced as well would be noise.
 */
export interface ReadingPlaceholderProps {
  /**
   * How wide, in `ch` — roughly how many digits the value will be. 4 suits `"23.4"`; a percentage
   * wants 3, a formatted `"12,480"` wants 6. Only ever an approximation, which is why it moves with
   * the font rather than being pinned in pixels.
   */
  width?: number;
  className?: string;
}

export function ReadingPlaceholder({ width = 4, className }: ReadingPlaceholderProps) {
  return (
    <span
      aria-hidden="true"
      data-reading-placeholder=""
      className={cn(
        "inline-block rounded-sm bg-muted-foreground/25 align-[-0.05em]",
        "animate-pulse motion-reduce:animate-none",
        "forced-colors:border forced-colors:border-current forced-colors:bg-transparent",
        className,
      )}
      // `0.72em` is the bar's height against the current font, so the line box the parent's own strut
      // establishes is unchanged — the value's slot is as tall loading as it is loaded.
      style={{ inlineSize: `${width}ch`, blockSize: "0.72em" }}
    />
  );
}
