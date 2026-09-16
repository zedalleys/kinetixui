"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Marquee — an auto-scrolling horizontal ticker (logo strip, testimonials),
 * pausing on hover and respecting `prefers-reduced-motion`. Lifted out of
 * the marketing site's `reveal.tsx` (`.kx-marquee`/`.kx-marquee-track` in
 * its `globals.css`) into a portable component: the site version leaned on
 * a hand-written CSS file a CLI-installed app wouldn't have, so this port
 * moves the keyframe onto the shared Tailwind preset (`animate-marquee`,
 * `motion-reduce:animate-none`) instead. Also fixes an accessibility gap
 * in the site version, which marked *both* content copies `aria-hidden`
 * (hiding the marquee from screen readers entirely) — only the duplicate
 * copy needed for the seamless loop is hidden here; the first copy stays
 * in the accessible DOM flow. Gap-fill addition (not in the original
 * Figma source).
 */
export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** seconds for one full loop */
  durationSeconds?: number;
  pauseOnHover?: boolean;
}

const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  ({ className, children, durationSeconds = 32, pauseOnHover = true, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group relative flex overflow-hidden",
        "[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
      style={{ ["--marquee-duration" as string]: `${durationSeconds}s`, ...style }}
      {...props}
    >
      {/* the track is 2x content width (two copies side by side); animating it
          exactly -50% of its own width moves it one content-width, which is
          what makes the loop seamless when it snaps back to 0. */}
      <div
        className={cn(
          "flex w-max animate-marquee motion-reduce:animate-none",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden="true" className="flex shrink-0 items-center">
          {children}
        </div>
      </div>
    </div>
  ),
);
Marquee.displayName = "Marquee";

export { Marquee };
