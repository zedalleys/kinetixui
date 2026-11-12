"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

/**
 * Whether `el` reads right to left. The nearest `[dir]` decides first, because it is the markup's answer;
 * only when no ancestor states one does the computed direction, read through the element's OWN window,
 * decide. A DOM implementation is free not to inherit computed direction, so relying on it alone would make
 * the behaviour depend on the environment rather than on the page.
 *
 * This is `isRtl` from `packages/ui-angular/src/lib/collection.ts`, rule for rule. The two platforms must
 * answer "which way does this carousel read" the same way or their carousels are not the same component.
 */
function isRtl(el: Element): boolean {
  const explicit = el.closest("[dir]")?.getAttribute("dir")?.toLowerCase();
  if (explicit === "rtl" || explicit === "ltr") return explicit === "rtl";
  return el.ownerDocument.defaultView?.getComputedStyle(el).direction === "rtl";
}

/** Which way an arrow key travels once direction is resolved: `@kinetixui/angular`'s `inlineKey`. */
function inlineKey(key: string, rtl: boolean): "forward" | "backward" | null {
  if (key === "ArrowRight") return rtl ? "backward" : "forward";
  if (key === "ArrowLeft") return rtl ? "forward" : "backward";
  return null;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, plugins, className, children, onKeyDown, ...props }, ref) => {
  // The carousel's own direction, resolved from the rendered element rather than assumed. The engine reads
  // `direction` when it initialises and lays the track out from it, so this cannot be computed during
  // render: the first client render is LTR and the layout effect below corrects it before paint, which
  // re-initialises the engine. Horizontal only — a vertical track has no inline direction.
  const root = React.useRef<HTMLDivElement | null>(null);
  const [rtl, setRtl] = React.useState(false);
  const horizontal = orientation === "horizontal";

  React.useLayoutEffect(() => {
    const el = root.current;
    if (!el || !horizontal) return void setRtl(false);
    const resolve = () => setRtl(isRtl(el));
    resolve();
    // A page that switches language flips `dir` on an ancestor long after mount. That resizes nothing, so
    // nothing else would tell the engine to lay the track out the other way; this does.
    const observer = new MutationObserver(resolve);
    observer.observe(el.ownerDocument.documentElement, { attributes: true, subtree: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, [horizontal]);

  const [carouselRef, api] = useEmblaCarousel(
    // `direction` first, so a consumer who passes their own in `opts` still wins; `axis` last, because it is
    // the carousel's own `orientation` prop expressed in the engine's terms and is not theirs to contradict.
    { direction: horizontal && rtl ? "rtl" : "ltr", ...opts, axis: horizontal ? "x" : "y" },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((a: CarouselApi) => {
    if (!a) return;
    setCanScrollPrev(a.canScrollPrev());
    setCanScrollNext(a.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  React.useEffect(() => {
    if (api && setApi) setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}
    >
      <div
        ref={(node) => {
          root.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onKeyDown={(e) => {
          // Bubble phase, and only for a key nothing inside has claimed: a text field inside a slide keeps
          // its caret keys, a nested control that handled the arrow keeps it, and Alt/Ctrl/Meta+Arrow
          // (browser Back, word-jump) is never ours.
          onKeyDown?.(e);
          if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
          const t = e.target as HTMLElement;
          if (t.isContentEditable || t.closest("input:not([type=button]):not([type=checkbox]):not([type=submit]):not([type=reset]), textarea, select")) return;
          // Logical, not physical: in a right-to-left carousel the next slide lies to the LEFT, so ArrowLeft
          // advances and ArrowRight goes back. Direction is read at the press rather than taken from state,
          // so a key is never mapped by a direction that has already changed.
          // A vertical carousel keeps the keys it already had: this slice is about direction, and taking
          // ArrowLeft/ArrowRight away from it would be a behaviour change nobody asked for.
          const move = inlineKey(e.key, horizontal && isRtl(e.currentTarget));
          if (move) {
            e.preventDefault();
            if (move === "forward") scrollNext();
            else scrollPrev();
          }
        }}
        className={cn("relative font-sans", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();
    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)}
          {...props}
        />
      </div>
    );
  },
);
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel();
    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)}
        {...props}
      />
    );
  },
);
CarouselItem.displayName = "CarouselItem";

/**
 * At a non-looping end the control that reached it is `aria-disabled`, not `disabled`, and its activation
 * is refused by the handler instead of by the browser.
 *
 * A natively disabled element cannot hold focus. The press that exhausted the track therefore disabled the
 * very button under the reader's focus, and Chromium moved focus to `BODY` — the following Tab started from
 * the document's position, not the reader's, so stepping to the last slide cost them their place in the
 * page. Measured in Chromium at both endpoints, in LTR, RTL and reduced motion, by
 * `scripts/react-carousel-focus.mjs`; jsdom cannot see it, which is why no unit test guards it.
 *
 * `packages/ui-angular/src/lib/carousel.ts` had already taken this decision and written it into its
 * docstring ("Focus is never lost…"); React was the platform that contradicted it. `NumberInput`'s step
 * buttons use the same shape for the same reason — at the minimum or maximum they are `aria-disabled` with
 * the step refused, not inert.
 *
 * The cost is one extra Tab stop at each end, which is the point: the control stays reachable and still
 * announces that it is unavailable, instead of silently leaving the tab order.
 *
 * The consumer's own `onClick` is composed rather than overwritten, and runs first: with the handler
 * written before `{...props}` a consumer who passed `onClick` would have replaced the guard along with the
 * navigation, and the guard is not theirs to drop. `disabled` passed by a consumer still reaches the
 * button through the spread and still means natively disabled — this changes what the carousel does on its
 * own, not what the Button contract offers.
 */
const UNAVAILABLE = "aria-disabled:cursor-not-allowed aria-disabled:opacity-disabled aria-disabled:hover:border-input aria-disabled:hover:bg-transparent";

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "Outline", onClick, ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal" ? "-left-12 top-1/2 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          UNAVAILABLE,
          className,
        )}
        aria-disabled={canScrollPrev ? undefined : true}
        // `Button` renders a native button, which defaults to `type="submit"`: inside a form, a
        // navigation control would submit it. The native `disabled` used to stop that at the
        // endpoints and nothing stopped it anywhere else, so this is the narrower contract, not a
        // new one. Set before the spread, so a consumer who really wants a submit can still say so.
        type="button"
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || !canScrollPrev) return;
          scrollPrev();
        }}
        {...props}
      >
        <ArrowLeft className="size-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "Outline", onClick, ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal" ? "-right-12 top-1/2 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          UNAVAILABLE,
          className,
        )}
        aria-disabled={canScrollNext ? undefined : true}
        // `Button` renders a native button, which defaults to `type="submit"`: inside a form, a
        // navigation control would submit it. The native `disabled` used to stop that at the
        // endpoints and nothing stopped it anywhere else, so this is the narrower contract, not a
        // new one. Set before the spread, so a consumer who really wants a submit can still say so.
        type="button"
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || !canScrollNext) return;
          scrollNext();
        }}
        {...props}
      >
        <ArrowRight className="size-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
