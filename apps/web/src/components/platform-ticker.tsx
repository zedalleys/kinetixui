"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "./platform-logo";

/**
 * How many times the platform list repeats inside each half of the moving strip. The loop translates the strip by
 * exactly one half, so one half has to be at least as wide as the visible window or the window shows a blank stretch
 * before the next half arrives. At the widest band (max-w-screen-2xl less the "Targets" label, ≈1394px) one list is
 * ≈780px, so a half of one list left a ≈760px gap at 1920px; two lists clear it. `scripts/platform-ticker.mjs` measures
 * the gap at five phases of the cycle, so lowering this back to 1 fails there, not on someone's monitor.
 */
const LISTS_PER_HALF = 2;

/** Seconds for one list's width to pass. Keeps the original ticker's ≈25px/s whatever LISTS_PER_HALF is. */
const SECONDS_PER_LIST = 30;

/**
 * The homepage's supported-platform ticker: every platform in `platformDefinitions`, by its canonical label, beside
 * its mark.
 *
 * - Assistive technology gets ONE named list. The repeats that make the loop are `aria-hidden` and `inert`, and each
 *   mark is decorative, so nobody hears the platforms three times or "React logo, React". (The previous ticker hid
 *   its whole track, so a screen reader heard no platforms at all.)
 * - Motion is a CSS `transform` animation on one element: no timers, no re-renders, no per-frame measurement. The
 *   strip is `flex: none` because, as a flex item, it used to shrink below its content at phone width, which made
 *   `translateX(-50%)` stop ≈59px short of a full list and jump at every loop boundary.
 * - It moves continuously and names information, so WCAG 2.2.2 applies: a keyboard-operable pause button stops it
 *   (hover still pauses too). Under `prefers-reduced-motion` nothing moves, the repeats are not rendered and the one
 *   list wraps, so every platform stays visible at any width; the pause button is not shown because there is nothing
 *   to pause.
 * - Under `dir="rtl"` the strip runs towards inline-start in the other direction, so the loop stays seamless; the
 *   marks themselves are never mirrored.
 */
export function PlatformTicker({ className }: { className?: string }) {
  const [paused, setPaused] = React.useState(false);

  const items = PLATFORMS.map((p) => (
    <li key={p} className="flex shrink-0 items-center gap-2.5 px-6 font-display text-sm text-muted-foreground">
      <PlatformLogo platform={p} className="size-[1.125em]" />
      <span className="whitespace-nowrap">{PLATFORM_DEFINITIONS[p].label}</span>
    </li>
  ));
  const listClass = "kx-marquee-list flex shrink-0 items-center";

  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch", className)}>
      <div
        data-platform-ticker=""
        {...(paused ? { "data-paused": "" } : {})}
        className="kx-marquee relative flex min-w-0 flex-1 overflow-hidden py-4 motion-safe:[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      >
        <div
          className="kx-marquee-track"
          style={{ ["--marquee-duration" as string]: `${SECONDS_PER_LIST * LISTS_PER_HALF}s` }}
        >
          <ul aria-label="Supported platforms" className={listClass}>
            {items}
          </ul>
          {Array.from({ length: LISTS_PER_HALF * 2 - 1 }, (_, i) => (
            <ul key={i} aria-hidden="true" inert className={cn(listClass, "kx-marquee-repeat")}>
              {items}
            </ul>
          ))}
        </div>
      </div>
      <button
        type="button"
        data-platform-ticker-pause=""
        aria-pressed={paused}
        aria-label="Pause the platform ticker"
        onClick={() => setPaused((v) => !v)}
        className={cn(
          "flex w-11 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          "motion-reduce:hidden",
        )}
      >
        {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
