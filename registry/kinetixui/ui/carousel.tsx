"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, plugins, className, children, onKeyDown, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" },
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
        ref={ref}
        onKeyDown={(e) => {
          // Bubble phase, and only for a key nothing inside has claimed: a text field inside a slide keeps
          // its caret keys, a nested control that handled the arrow keeps it, and Alt/Ctrl/Meta+Arrow
          // (browser Back, word-jump) is never ours.
          onKeyDown?.(e);
          if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
          const t = e.target as HTMLElement;
          if (t.isContentEditable || t.closest("input:not([type=button]):not([type=checkbox]):not([type=submit]):not([type=reset]), textarea, select")) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollPrev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollNext();
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
