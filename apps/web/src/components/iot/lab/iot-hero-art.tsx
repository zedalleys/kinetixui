"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import { cn } from "@/lib/utils";

/**
 * The /iot hero illustration: an isometric chip with data rising off it, on the page itself, with the command card
 * overlapping its lower edge.
 *
 * **Decorative.** The SVG is `aria-hidden` and the frame has no role or name: the hero's heading and lede say what
 * the page is about, and the illustration repeats none of it. It is not mirrored in RTL, because it is a picture
 * of an object (with the letters IOT on it), not a direction.
 *
 * **The markup** (`iot-hero-art-svg.ts`) is the supplied background-free illustration with only safe edits, checked
 * against the source in a browser (no pixel differs by more than 2/255, from dropping the root group's isolation):
 * the XML prolog, ids and editor `data-name`s are gone, and the `<style>` block is inlined as attributes, because an
 * inline SVG's class rules are global and `.cls-1` would have leaked into the page. No script, no external reference.
 *
 * **Motion** (`.kx-iot-art-*` in globals.css), three loops on compositor-friendly or tiny-paint properties:
 * a signal walks the 24 pins round the package, the IOT stack lifts and settles, and the data columns brighten
 * in turn. It loops and runs alongside the page, so WCAG 2.2.2 applies: a keyboard-operable pause button stops
 * it, remembered like the platform ticker's. Under `prefers-reduced-motion` nothing animates and the button is
 * not rendered, because there is nothing to pause; the reader sees the illustration as drawn.
 */
export function IotHeroArt({ svg, className }: { svg: string; className?: string }) {
  const [paused, togglePaused] = usePersistedPause("kx-iot-hero-art");
  return (
    <div
      data-iot-hero-art=""
      {...(paused ? { "data-paused": "" } : {})}
      className={cn("relative overflow-hidden", className)}
    >
      <div className="absolute inset-0 [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <button
        type="button"
        data-iot-hero-art-pause=""
        aria-pressed={paused}
        aria-label="Pause the illustration's animation"
        onClick={togglePaused}
        className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hidden"
      >
        {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
