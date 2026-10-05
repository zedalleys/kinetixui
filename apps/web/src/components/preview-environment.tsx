"use client";

import * as React from "react";
import { KinetixDirectionProvider } from "@kinetixui/ui";
import { cn } from "@/lib/utils";
import { useDocumentDirection, type Direction } from "@/lib/use-document-direction";

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
 * DIRECTION — real, and scoped to this preview. The stage carries `dir` and a `KinetixDirectionProvider`, and
 *   that provider is also where the library's overlays portal to (a `<div dir>` under `<body>`, see
 *   direction-provider.tsx), so a Dialog, Sheet, Popover or Tooltip opened from an RTL preview is RTL even
 *   though it renders outside the box. That is the same integration an application performs for a section
 *   of its own, which is what makes the preview a demonstration rather than a simulation.
 *
 *   It used to set `<html dir>` instead, because the overlays had nowhere else to inherit from. That mirrored
 *   the whole documentation site from a control inside one demo — header, sidebar and the toggle itself
 *   jumped across the page — and made every preview on the page switch together (PR #300, §27). The page's
 *   own direction is never written here; a preview starts in it, and the reader can take one preview away
 *   from it without touching the others.
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
  // Each preview owns its direction. Until the reader picks one it follows the page, so an application-level
  // RTL page shows RTL previews; picking one never leaves this preview, and nothing is stored, so a new page
  // or a reload starts from the page's direction again.
  const pageDir = useDocumentDirection();
  const [chosen, setChosen] = React.useState<Direction | null>(null);
  const dir = chosen ?? pageDir;
  const reduced = usePrefersReducedMotion();

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
              onClick={() => setChosen(d)}
              className={toggle}
            >
              {d}
              <span className="sr-only">
                {d === "ltr" ? " — left to right" : " — right to left"}, this preview only
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
