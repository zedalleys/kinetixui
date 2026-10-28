"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../lib/utils";

/** Peer content navigation. Text-first tabs share a base rail and a foreground indicator.
 * Stable weight avoids layout shifts. Radix retains selection, focus, keyboard and direction behavior.
 * Horizontal lists scroll locally at narrow widths/large text; vertical lists use the inline-end rail.
 *
 * The indicator is one bar per list that travels to the chosen tab. Its leading edge moves first and its
 * trailing edge follows, so it stretches across the gap and settles on the new label: the motion says which
 * tab the selection came from. It is drawn with logical insets, so it follows the list's own direction.
 * Until the list has measured itself (server render, before hydration) and under forced colours, each
 * chosen trigger draws its own 2px edge instead, which is the same mark without the travel.
 */
const Tabs = TabsPrimitive.Root;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
 * Which selection effect the list's indicator performs. Named presets rather than a duration, so a
 * consumer cannot set a timing the motion contract does not know about: each preset is a choice between
 * behaviours, and every one of them reads tokens.
 *
 *   `classic`  the bar travels, leading edge first, trailing edge held back by `instant`, both edges on
 *              `emphasized` — the default, and the behaviour every version before this prop shipped.
 *   `fluid`    the two edges move in sequence rather than together: the leading edge travels the whole
 *              `base` tier, and only then does the trailing edge follow for another. The bar stretches
 *              across the gap to several times its resting width and then draws itself in, and the two
 *              labels change colour on those same two phases. Twice `classic`'s duration, which is the
 *              cost of the effect and the reason it is opted into rather than default.
 *   `none`     the bar snaps to the chosen tab. Not `transition: none` on the element: it takes the same
 *              path a resize or a direction flip already takes, so the bar arrives placed rather than
 *              animated, and the single code path stays the one the geometry gate already covers.
 *
 * Reduced motion is NOT a preset and is not opted out of here. A reader who asks for less motion gets
 * `none`'s behaviour whatever this prop says.
 */
export type TabsMotion = "classic" | "fluid" | "none";

export const TABS_MOTION: readonly TabsMotion[] = ["classic", "fluid", "none"];

/**
 * How long the trailing edge waits, and on which curve both edges travel.
 *
 * `fluid`'s curve is measured rather than chosen by name. Against the reference's frame-by-frame
 * progression, `standard` fits both edges best (rms 0.077 leading, 0.091 trailing) and `emphasized` —
 * the role's own canonical curve, and the one the name argues for — fits worst on the trailing edge
 * (0.218), because it spends most of its distance early where the reference creeps and then rushes.
 * Using `emphasized` here would shrink the bar fast and then crawl, losing the hang that is the whole
 * character of the effect. The departure is recorded as a deviation in `tokens/contracts/motion.json`.
 */
const PHASING: Record<TabsMotion, { trail: string; ease: string }> = {
  classic: {
    trail: "var(--duration-instant)",
    ease: "var(--easing-emphasized)",
  },
  fluid: { trail: "var(--duration-base)", ease: "var(--easing-standard)" },
  none: { trail: "0ms", ease: "var(--easing-emphasized)" },
};

/** Places the list's indicator on its chosen tab; a change of tab travels, anything else (resize, text size) snaps. */
function useTabsIndicator(
  listRef: React.RefObject<HTMLDivElement | null>,
  indicatorRef: React.RefObject<HTMLSpanElement | null>,
  motion: TabsMotion,
) {
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    const bar = indicatorRef.current;
    if (!list || !bar) return;
    let chosen: HTMLElement | null = null;
    let start = 0;
    let end = 0;
    let axis = "";
    // `reframed`: the list's direction or orientation changed. That moves the bar's physical edges without
    // moving its logical ones, so transitions are off before anything is read, or the browser would animate it.
    const place = (reframed = false) => {
      if (reframed) bar.style.transition = "none";
      // Any tab can resize (a label, a badge, a font arriving) and move the chosen one without resizing it, so
      // every current tab is watched, and a removed one is released rather than held for the list's lifetime.
      if (sizes) {
        const tabs = new Set(
          list.querySelectorAll<HTMLElement>(':scope > [role="tab"]'),
        );
        for (const t of watched) {
          if (tabs.has(t)) continue;
          sizes.unobserve(t);
          watched.delete(t);
        }
        for (const t of tabs) {
          if (watched.has(t)) continue;
          sizes.observe(t);
          watched.add(t);
        }
      }
      const tab = list.querySelector<HTMLElement>(
        ':scope > [role="tab"][data-state="active"]',
      );
      if (!tab) {
        list.removeAttribute("data-kx-tabs-indicator");
        chosen = null;
        bar.style.transition = "";
        return;
      }
      const vertical = list.getAttribute("aria-orientation") === "vertical";
      const rtl = getComputedStyle(list).direction === "rtl";
      // Offsets are from the list's padding edge, so they hold while the list scrolls.
      const nextStart = vertical
        ? tab.offsetTop
        : rtl
          ? list.clientWidth - tab.offsetLeft - tab.offsetWidth
          : tab.offsetLeft;
      const nextEnd = vertical
        ? list.clientHeight - tab.offsetTop - tab.offsetHeight
        : list.clientWidth - nextStart - tab.offsetWidth;
      // Observing a newly chosen tab reports its size at once; with nothing moved, leave the travel running.
      const frame = `${vertical} ${rtl}`;
      if (frame !== axis && axis !== "") {
        reframed = true;
        bar.style.transition = "none";
      }
      if (!reframed && chosen === tab && nextStart === start && nextEnd === end)
        return;
      // `none` reaches the chosen tab through the snap path below, which is the same one a resize or a
      // direction flip takes. Nothing about the bar's geometry changes with the preset — only whether the
      // move is interpolated.
      const travels =
        motion !== "none" && !reframed && chosen !== null && chosen !== tab;
      const { trail, ease } = PHASING[motion];
      bar.style.setProperty("--kx-tabs-ease", ease);
      // The edge on the side the bar is heading leads; the other waits for it. Which edge leads swaps with
      // the direction, so the two phases stay in the same order in time however the selection moves.
      const forward = nextStart > start;
      bar.style.setProperty(
        "--kx-tabs-start-delay",
        travels && forward ? trail : "0ms",
      );
      bar.style.setProperty(
        "--kx-tabs-end-delay",
        travels && !forward ? trail : "0ms",
      );
      if (!travels) bar.style.transition = "none";
      bar.style.setProperty("--kx-tabs-start", `${nextStart}px`);
      bar.style.setProperty("--kx-tabs-end", `${nextEnd}px`);
      if (!travels) {
        void bar.offsetWidth; // commit the snapped position before transitions return
        bar.style.transition = "";
      }
      chosen = tab;
      start = nextStart;
      end = nextEnd;
      axis = frame;
      list.setAttribute("data-kx-tabs-indicator", "");
    };
    const sizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => place());
    const watched = new Set<HTMLElement>();
    sizes?.observe(list);
    place();
    const mutations = new MutationObserver((records) =>
      place(
        records.some(
          (r) =>
            r.attributeName === "dir" || r.attributeName === "aria-orientation",
        ),
      ),
    );
    mutations.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-orientation", "dir"],
    });
    // Radix puts `dir` on the Tabs root, not the list: watch whichever element decides the list's direction.
    const director = list.parentElement?.closest("[dir]");
    const reframes = new MutationObserver(() => place(true));
    if (director)
      reframes.observe(director, {
        attributes: true,
        attributeFilter: ["dir"],
      });
    return () => {
      mutations.disconnect();
      reframes.disconnect();
      sizes?.disconnect();
      watched.clear();
    };
  }, [listRef, indicatorRef, motion]);
}

export interface TabsListProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
> {
  /** The indicator's selection effect. Defaults to `classic`, which is the behaviour before this prop existed. */
  motion?: TabsMotion;
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(
  (
    {
      className,
      onFocusCapture,
      asChild,
      children,
      motion = "classic",
      ...props
    },
    ref,
  ) => {
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const indicatorRef = React.useRef<HTMLSpanElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    useTabsIndicator(listRef, indicatorRef, motion);
    // With `asChild` Radix's Slot takes exactly one child, so the bar goes inside the consumer's element.
    const bar = (
      <span
        ref={indicatorRef}
        aria-hidden="true"
        data-kx-tabs-bar=""
        className={cn(
          "pointer-events-none absolute hidden bg-foreground group-data-[kx-tabs-indicator]/tabs:block forced-colors:!hidden",
          // grid-ok: 2px is a stroke weight, not spacing: the trigger's border-b-2 at any text size
          "bottom-0 h-[2px] [inset-inline-end:var(--kx-tabs-end,0px)] [inset-inline-start:var(--kx-tabs-start,0px)]", // grid-ok
          "group-data-[orientation=vertical]/tabs:bottom-auto group-data-[orientation=vertical]/tabs:h-auto group-data-[orientation=vertical]/tabs:w-[2px] group-data-[orientation=vertical]/tabs:[inset-inline-start:auto] group-data-[orientation=vertical]/tabs:[inset-inline-end:0px] group-data-[orientation=vertical]/tabs:[inset-block-start:var(--kx-tabs-start,0px)] group-data-[orientation=vertical]/tabs:[inset-block-end:var(--kx-tabs-end,0px)]", // grid-ok
          // Two edges on one curve, the trailing one held back: a stretch, then a settle. How far it is held
          // and which curve both edges take is the preset's to say, so the hook writes them; the fallback is
          // `classic`'s, which is what a bar renders with before the hook has run.
          "[transition-duration:var(--duration-base)] [transition-property:inset-inline-start,inset-inline-end,inset-block-start,inset-block-end] [transition-timing-function:var(--kx-tabs-ease,var(--easing-emphasized))]",
          "[transition-delay:var(--kx-tabs-start-delay,0ms),var(--kx-tabs-end-delay,0ms),var(--kx-tabs-start-delay,0ms),var(--kx-tabs-end-delay,0ms)] motion-reduce:transition-none",
        )}
      />
    );
    return (
      <TabsPrimitive.List
        ref={setRefs}
        data-kx-tabs-list=""
        data-kx-tabs-motion={motion}
        asChild={asChild}
        onFocusCapture={(event) => {
          onFocusCapture?.(event);
          if (event.defaultPrevented) return;
          const list = event.currentTarget;
          const tab = event.target as HTMLElement;
          const l = list.getBoundingClientRect();
          const t = tab.getBoundingClientRect();
          // Scroll this list only, without moving the page. Physical geometry works in either direction.
          const delta =
            t.left < l.left
              ? t.left - l.left
              : t.right > l.right
                ? t.right - l.right
                : 0;
          if (delta && typeof list.scrollBy === "function")
            list.scrollBy({ left: delta, behavior: "instant" });
        }}
        className={cn(
          "group/tabs relative inline-flex min-h-11 w-full min-w-0 max-w-full items-stretch justify-start gap-1 overflow-x-auto overscroll-x-contain border-b border-border text-muted-foreground font-sans [scrollbar-width:thin]",
          "data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:[border-inline-end-width:1px]",
          className,
        )}
        {...props}
      >
        {asChild &&
        React.isValidElement<{ children?: React.ReactNode }>(children) ? (
          React.cloneElement(children, undefined, children.props.children, bar)
        ) : (
          <>
            {children}
            {bar}
          </>
        )}
      </TabsPrimitive.List>
    );
  },
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:[border-inline-end-width:2px]",
      "transition-colors duration-fast ease-standard motion-reduce:transition-none",
      // Under `fluid` each label rides its own phase of the bar rather than changing on its own clock: the
      // one being left fades over the leading edge's travel, and the one being chosen brightens over the
      // trailing edge's. CSS reads the transition off the state being entered, so the delay belongs on the
      // active rule and the tab going inactive takes none — which puts the two in sequence, not together.
      // Only the label's own colour is re-timed. The hover surface is answering a pointer, not narrating a
      // selection, so it stays on `fast`: a 300ms hover would read as lag.
      "group-data-[kx-tabs-motion=fluid]/tabs:[transition-property:color,background-color,border-color]",
      "group-data-[kx-tabs-motion=fluid]/tabs:[transition-duration:var(--duration-base),var(--duration-fast),var(--duration-fast)]",
      "group-data-[kx-tabs-motion=fluid]/tabs:data-[state=active]:[transition-delay:var(--duration-base),0ms,0ms]",
      "[@media(hover:hover)]:enabled:hover:data-[state=inactive]:bg-foreground/[0.08] [@media(hover:hover)]:enabled:hover:data-[state=inactive]:text-foreground",
      "data-[state=active]:border-foreground data-[state=active]:text-foreground",
      // The list's travelling indicator takes over the chosen edge once it has measured; forced colours keep this one.
      "[@media(forced-colors:none)]:group-data-[kx-tabs-indicator]/tabs:data-[state=active]:border-transparent",
      "focus-visible:outline-none focus-visible:!ring-2 focus-visible:ring-inset focus-visible:ring-ring forced-colors:focus-visible:[outline:2px_solid_Highlight] forced-colors:focus-visible:outline-offset-[-2px]",
      "disabled:pointer-events-none disabled:opacity-disabled",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring forced-colors:focus-visible:[outline:2px_solid_Highlight] forced-colors:focus-visible:outline-offset-[-2px]",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
