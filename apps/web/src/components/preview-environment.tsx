"use client";

import * as React from "react";
import { KinetixDirectionProvider } from "@kinetixui/ui";
import { cn } from "@/lib/utils";

/**
 * The environment controls above a component preview.
 *
 * An evaluator's real questions about a component are mostly questions about its environment: does it
 * mirror, does it respect a motion preference, does it survive a narrow screen. The preview answered none
 * of them — every component page rendered its demo in one environment, left to right, with no way to see
 * any other.
 *
 * ── What is here, and what deliberately is not ──────────────────────────────
 *
 * Only controls that change the real thing. A control that looks like it switches an environment but does
 * not is worse than no control, because the reader believes the result.
 *
 * DIRECTION — real, and here, and applied to the page rather than to the preview box. That is not the
 *   obvious design and it is the only correct one: Radix portals an overlay to `document.body`, OUTSIDE
 *   the preview, so with `dir` on the stage alone a reader could switch to RTL, open the Dialog demo, and
 *   watch an unmirrored dialog appear — measured, `direction: ltr` on the portaled node while the stage
 *   said `rtl`. They would conclude the library's RTL support is broken when what was broken was the
 *   control. Setting `dir` on `<html>` and wrapping in `KinetixDirectionProvider` is both the fix and
 *   exactly the integration an application performs, so the preview demonstrates RTL instead of
 *   simulating it. The whole page mirrors, which is honest about what the switch does.
 *
 * MOTION — reported, not switched. The reduced-motion contract is `@media (prefers-reduced-motion: reduce)`
 *   and Tailwind's `motion-reduce:` variant, both media queries. No class, attribute or context can turn a
 *   media query on, so a "reduced motion" button here could only fake it — and the one thing worse than not
 *   being able to test reduced motion is believing you just did. What it shows instead is the true state of
 *   the reader's own setting, which is the thing the components actually respond to.
 *
 * THEME — not here. `darkMode: ["class"]` matches `.dark` on any ancestor, so a wrapper can take a subtree
 *   from light to dark but cannot take one back from dark to light: on a dark page the "light" option would
 *   silently do nothing. The site's own theme control in the header already switches this correctly for the
 *   whole page, preview included.
 *
 * WIDTH — not here. Without an iframe the demo keeps the real viewport, so constraining the stage changes
 *   how much room the component has but does not flip `sm:` / `md:` variants. Components whose responsive
 *   behaviour is worth evaluating are exactly the ones that would be misrepresented, and an iframe per
 *   preview is a heavy price on 98 static pages. Resizing the window remains accurate.
 */

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type Direction = "ltr" | "rtl";

/**
 * One direction for the page, shared by every preview on it.
 *
 * A component page can hold three previews (Button has preview, variants and sizes). Per-preview state
 * would let two toolbars disagree while the thing they both control — `<html dir>` — can only hold one
 * value, so a reader would see a toolbar that says `ltr` above a mirrored component. A module-level store
 * read through `useSyncExternalStore` keeps every toolbar showing the truth, without threading context
 * through MDX that neither the pages nor the demos know anything about.
 */
let direction: Direction = "ltr";
const listeners = new Set<() => void>();

function setDirection(next: Direction) {
  if (direction === next) return;
  direction = next;
  document.documentElement.setAttribute("dir", next);
  for (const l of listeners) l();
}

function subscribeDirection(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function useDirection() {
  return React.useSyncExternalStore(
    subscribeDirection,
    () => direction,
    () => "ltr" as Direction,
  );
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * The reader's live reduced-motion setting.
 *
 * `useSyncExternalStore` rather than an effect so the server snapshot is explicit: the server cannot know
 * the preference, renders the common case, and React reconciles on hydration without a flash of the wrong
 * label being committed as state.
 */
function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(MOTION_QUERY).matches ?? false,
    () => false,
  );
}

const toggle = cn(
  "min-h-8 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
  "text-muted-foreground hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  "aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm",
  "motion-reduce:transition-none",
);

export function PreviewEnvironment({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  const dir = useDirection();
  const reduced = usePrefersReducedMotion();

  // Leaving the page mirrored after navigating away from the docs would be a bug the reader cannot explain,
  // so the last preview to unmount puts it back.
  React.useEffect(
    () => () => {
      if (listeners.size <= 1) setDirection("ltr");
    },
    [],
  );

  return (
    <>
      {/* Wraps rather than scrolls: on a 320px screen a toolbar that scrolls sideways hides its own
          controls behind an edge the reader has no reason to suspect. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-3 py-2">
        <div role="group" aria-label="Preview direction" className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
          {(["ltr", "rtl"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dir === d}
              onClick={() => setDirection(d)}
              className={toggle}
            >
              {d}
              <span className="sr-only">
                {d === "ltr" ? " — left to right" : " — right to left"}, applies to the whole page
              </span>
            </button>
          ))}
        </div>

        {/*
          A status, not a control, and said in words rather than a dot: it is reporting the reader's own
          browser setting, which nothing on this page can change. `aria-live` is deliberately absent — this
          changes only when the reader changes their own OS preference, and announcing it then would
          interrupt them to tell them what they just did.
        */}
        <p className="m-0 font-mono text-[11px] text-muted-foreground">
          Reduced motion:{" "}
          <span className="text-foreground">{reduced ? "on" : "off"}</span>
          <span className="hidden sm:inline"> · your browser setting</span>
        </p>
      </div>

      <div
        dir={dir}
        data-preview-stage
        className={cn(
          "flex min-h-[350px] w-full border-t border-border bg-background p-6 sm:p-10",
          align === "center" ? "items-center justify-center" : "items-start justify-start",
        )}
      >
        <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
      </div>
    </>
  );
}
