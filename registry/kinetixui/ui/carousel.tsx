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
  /**
   * Whether the ENGINE is laying the horizontal track out right to left — `false` for a vertical carousel,
   * which has no inline direction. The controls mirror on this and not on the document, for the reason the
   * key handler does: a consumer's own `opts.direction` drives the track, so a control resolved from the
   * document would point away from the slides it moves.
   */
  rtl: boolean;
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

  /**
   * The direction the engine is actually running, with the consumer's override taking precedence exactly as
   * it does in the `useEmblaCarousel` call above. The controls read this; the key handler resolves the same
   * expression at the press instead, so that a `dir` flipped between renders cannot map a key by a stale
   * direction.
   */
  const engineRtl = horizontal && (opts?.direction ? opts.direction === "rtl" : rtl);

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

  /**
   * The root element, kept for the direction lookup, composed with whatever ref the consumer forwarded.
   *
   * Two things this has to get right, both of which a bare inline arrow got wrong when this slice replaced
   * `ref={ref}` with a wrapper:
   *
   *   - IDENTITY. An inline callback is a new function on every render, and React detaches a changed
   *     callback ref before reattaching it — so the consumer's ref was being called with null and the node
   *     again on every render of a component that re-renders on every `select`. `useCallback` on `ref`
   *     restores the stability a plain `ref={ref}` had.
   *   - CLEANUP. React 19 lets a callback ref return a teardown and then does NOT call that ref again with
   *     null; a wrapper that drops the return value drops the teardown with it, and whatever the consumer
   *     attached to the node leaks. It is returned CONDITIONALLY: the package's peer range is
   *     `react: >=18`, and React 18 warns on a callback ref that returns a function. When the consumer
   *     returns nothing, React's own null call is what tears both refs down, exactly as before.
   */
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      // `ForwardedRef`'s callback arm is still typed `(instance) => void` (@types/react 19.3.0,
      // index.d.ts:1102) even though `RefCallback` itself now admits a cleanup, so the return value has to
      // be read as `unknown` — narrowing the declared `void` lands on `never` and the call does not compile.
      // The value is what React 19 hands back at runtime, not what this signature admits.
      const cleanup: unknown =
        typeof ref === "function" ? ref(node) : ref ? ((ref.current = node), undefined) : undefined;
      if (typeof cleanup === "function") {
        return () => {
          root.current = null;
          (cleanup as () => void)();
        };
      }
    },
    [ref],
  );

  return (
    <CarouselContext.Provider
      value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext, rtl: engineRtl }}
    >
      <div
        ref={setRoot}
        onKeyDown={(e) => {
          // Bubble phase, and only for a key nothing inside has claimed: a text field inside a slide keeps
          // its caret keys, a nested control that handled the arrow keeps it, and Alt/Ctrl/Meta+Arrow
          // (browser Back, word-jump) is never ours.
          onKeyDown?.(e);
          if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
          const t = e.target as HTMLElement;
          if (t.isContentEditable || t.closest("input:not([type=button]):not([type=checkbox]):not([type=submit]):not([type=reset]), textarea, select")) return;
          // Logical, not physical: in a right-to-left carousel the next slide lies to the LEFT, so ArrowLeft
          // advances and ArrowRight goes back.
          //
          // The direction the keys follow is the one the ENGINE is running, which is not always the
          // document's: a consumer's own `opts.direction` wins over the resolved value below, so reading
          // the document here would reverse the keys against the track they drive. Precedence therefore
          // mirrors the engine's own, exactly. (`opts.breakpoints` can carry a per-breakpoint direction
          // that this does not follow; nothing in the library does that, and it would need the engine's
          // resolved option rather than the passed one.)
          //
          // Absent an override, direction is read at the press rather than taken from state, so a key is
          // never mapped by a direction that has already changed under it.
          //
          // A vertical carousel keeps the keys it already had: this slice is about direction, and taking
          // ArrowLeft/ArrowRight away from it would be a behaviour change nobody asked for.
          const engineRtl = opts?.direction ? opts.direction === "rtl" : isRtl(e.currentTarget);
          const move = inlineKey(e.key, horizontal && engineRtl);
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

/**
 * A control's side and glyph follow the track, not the page. The engine lays a horizontal track out in the
 * resolved direction, so in a right-to-left carousel the FIRST slide is on the right and "Previous" is
 * toward the right: a Previous button pinned to the physical left, pointing left, would sit at the end of
 * the track it rewinds and point away from the slide it shows. Tailwind's `-left-*` / `-right-*` are
 * physical, so the side has to be chosen here; `-start-*` / `-end-*` would mirror on the DOCUMENT, which is
 * not always the engine's direction (`opts.direction` overrides it).
 *
 * `packages/ui-angular/src/lib/carousel.ts` gets both for free and had already taken this decision: its
 * controls are grid columns 1 and 3, which follow the writing direction, and its glyphs are the
 * bidi-mirrored `‹ ›`. Its docstring names React as the platform whose "keys and glyphs are physical"; the
 * keys were fixed earlier in this slice and these are the glyphs.
 *
 * A vertical carousel is untouched: it has no inline direction, and its controls stay above and below.
 */
const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "Outline", onClick, ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev, rtl } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal"
            ? rtl
              ? "-right-12 top-1/2 -translate-y-1/2"
              : "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
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
        {rtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "Outline", onClick, ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext, rtl } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal"
            ? rtl
              ? "-left-12 top-1/2 -translate-y-1/2"
              : "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
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
        {rtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
        <span className="sr-only">Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
