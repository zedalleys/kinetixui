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
  /**
   * Whether the ENGINE is laying the horizontal track out right to left — `false` for a vertical carousel,
   * which has no inline direction. The controls mirror on this and not on the document, for the reason the
   * key handler does: a consumer's own `opts.direction` drives the track, so a control resolved from the
   * document would point away from the slides it moves.
   */
  rtl: boolean;
  /** Every slide node the engine owns, in order. The engine's list, so an item resolves its own index from it. */
  slideNodes: HTMLElement[];
  /** The indices at least partly in the view. A slide outside it is `inert` and carries no Tab stop. */
  slidesInView: number[];
  /** Remembers that the NEXT landing was asked for by the reader, so autoplay and a reInit stay silent. */
  noteUserMove: () => void;
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

/**
 * How long the engine must be quiet before the move is announced. It spans a whole movement rather than a
 * frame: the engine emits `scroll` about once per frame while animating, so any value comfortably above a
 * frame coalesces an entire move — and a held key or a flung drag with it — into one phrase. Short enough
 * that the phrase still follows the move closely; see the announcement effect for why a frame is not.
 */
const QUIET_MS = 80;

/**
 * How long recorded intent may sit with nothing acting on it. It bounds the one case the deterministic
 * rules cannot see: a key or control press that records intent and then produces no `select` at all. Every
 * `scroll` refreshes it, so a slow drag is never caught by it.
 */
const INTENT_IDLE_MS = 600;

/**
 * The index of the SLIDE a scroll snap has landed on.
 *
 * These are the same number only while one slide scrolls at a time. Under `slidesToScroll` they diverge,
 * and they diverge further with every move: measured with five slides and `slidesToScroll: 2`, one press of
 * Next leaves the engine on snap 1, which is slide index **2** — so announcing the snap said "Slide 2 of 5"
 * while the carousel was showing slide 3, and a second press said "Slide 3 of 5" from slide 5. The slides'
 * own `aria-label`s and the total both count individual slides, so the announcement contradicted every
 * other thing the reader was told.
 *
 * `slideRegistry` is the engine's own map from snap to the slides in it, so this reports the first slide of
 * the group the reader has moved to. It is reached through `internalEngine()`, which is why it is read
 * defensively: if a future engine version renames or reshapes it, the announcement falls back to the snap
 * index — the behaviour before this, wrong under `slidesToScroll` and right everywhere else — rather than
 * throwing inside a live-region update.
 */
/**
 * The block axis has no direction to resolve: `writing-mode` is not something this carousel varies, and a
 * vertical track always runs top to bottom. So ArrowDown is forward whatever the document's `dir` says —
 * which is why this takes no `rtl` and is not `inlineKey` with another pair of keys.
 *
 * `@kinetixui/angular` had already decided this (`packages/ui-angular/src/lib/carousel.ts:352`) and written
 * it into its docstring at `:68`: "vertical carousels use ArrowUp and ArrowDown". React answered the
 * INLINE keys on a vertical track instead — the two platforms were exact opposites on the same component.
 */
function blockKey(key: string): "forward" | "backward" | null {
  if (key === "ArrowDown") return "forward";
  if (key === "ArrowUp") return "backward";
  return null;
}

function selectedSlide(api: CarouselApi): number {
  const snap = api!.selectedScrollSnap();
  try {
    const group = api!.internalEngine().slideRegistry?.[snap];
    if (Array.isArray(group) && group.length && typeof group[0] === "number") return group[0];
  } catch {
    // fall through to the snap index
  }
  return snap;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, plugins, className, children, onKeyDown, "aria-label": consumerLabel, "aria-labelledby": consumerLabelledBy, ...props }, ref) => {
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

  const [slideNodes, setSlideNodes] = React.useState<HTMLElement[]>([]);
  const [slidesInView, setSlidesInView] = React.useState<number[]>([]);
  const [announcement, setAnnouncement] = React.useState("");

  const onSelect = React.useCallback((a: CarouselApi) => {
    if (!a) return;
    setCanScrollPrev(a.canScrollPrev());
    setCanScrollNext(a.canScrollNext());
  }, []);

  /**
   * Whether the landing now being measured was asked for by the READER. Only a reader's change is
   * announced: an autoplay plugin's tick, a `reInit` from a resize or a `dir` flip, and the first layout
   * all leave this false, so none of them speaks. Set by the key handler, by the two controls and by the
   * engine's own `pointerDown`, and cleared the moment it is spent — so one gesture announces once, no
   * matter how many positions it crossed.
   */
  /**
   * The reader's intent to move, and whether the engine has actually moved since it was recorded.
   *
   * Two refs rather than one flag, because "the reader asked for a move" and "a move happened" are
   * different facts and the announcement needs both. A press that moves nothing must not leave intent
   * behind for the next thing that moves the track to spend — measured before this was split: clicking a
   * slide's own link (no drag) and then resizing the window announced "Slides 2 to 3 of 5", a resize the
   * reader never asked for, reported as their own move.
   */
  /**
   * The reader's intent to move, as the time it was recorded, and whether the engine has moved since.
   *
   * A timestamp rather than a flag because intent must not outlive the gesture that recorded it. Measured
   * before this: clicking a slide's own link (no drag) and then resizing the window announced
   * "Slides 2 to 3 of 5" — a resize the reader never asked for, reported as their own move, because a
   * `pointerDown` had armed a flag that nothing cleared until something else moved the track.
   */
  const intentAt = React.useRef(0);
  /**
   * Which intent this is. A pending announcement belongs to the gesture that scheduled it, and without
   * this it could be spent by a newer one: measured — pressing Next, then starting a drag 40ms later,
   * announced the control's position and left the drag's landing SILENT, because the pending callback
   * found the drag's fresh intent and consumed it. Every new gesture takes a new number, and a callback
   * whose number is no longer current stands down.
   */
  const intentId = React.useRef(0);
  /** Whether the engine has scrolled since intent was recorded: what tells a drag from a click. */
  const engineMoved = React.useRef(false);
  /** Recorded by the arrow keys and the controls, each of which checks first that the move is possible. */
  const noteUserMove = React.useCallback(() => {
    intentId.current += 1;
    intentAt.current = Date.now();
    engineMoved.current = false;
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
      api?.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  /**
   * Which slides the engine currently shows. `slidesInView` is the engine's own event, so this follows a
   * drag, a key, a resize and a `reInit` without guessing; `slideNodes` is re-read with it because a
   * `reInit` is also how slides are added or removed.
   */
  React.useEffect(() => {
    if (!api) return;
    const read = () => {
      setSlideNodes(api.slideNodes());
      setSlidesInView(api.slidesInView());
    };
    read();
    api.on("slidesInView", read);
    api.on("reInit", read);
    return () => {
      api?.off("slidesInView", read);
      api?.off("reInit", read);
    };
  }, [api]);

  /**
   * The announcement: one phrase per movement, only for a reader's own move, naming where it landed.
   *
   * Three things about this engine had to be measured rather than assumed, and each one ruled out a
   * plausible design:
   *
   *   - **`settle` is never emitted.** In Chromium against embla-carousel 8.6.0, one move of the pinned
   *     horizontal fixture at 900x700 emits `scroll` 210 times, `select` once and `slidesInView` four
   *     times, and `settle` not at all. A listener on it registers without error and never runs, so the
   *     live region stayed empty while every other row of
   *     `scripts/react-carousel-slide-exposure.mjs` passed.
   *   - **`scroll` goes on long after the slide has arrived** — to about 1.7s, as the physics settle. So
   *     "announce once the engine falls quiet" is a 1.7s delay on every keypress, and longer on a burst.
   *   - **the in-view set keeps changing for as long.** Measured `[0] → [] → [1]` with the threshold
   *     pinned, and still changing at 1500ms with the engine's own — one of those states having NO slide
   *     in view. There is no frame, and no short quiet window, in which that set is reliably final.
   *
   * So the in-view set is not what is announced. The SELECTED index is: it is decided the moment the move
   * is requested, it never wobbles, and it is what `@kinetixui/angular` announces too
   * (`packages/ui-angular/src/lib/carousel.ts:338`). `select` fires because that index changed, so reading
   * it in that handler cannot be stale — which was the other measured failure of this effect: reading the
   * in-view list inside a `select` handler named the slide the reader had just LEFT ("Slide 1 of 5" after
   * moving from slide 1 to slide 2), intermittently, depending on the frame the callback landed in.
   *
   * A carousel showing several slides at once therefore announces the selected one rather than the visible
   * range. That is Angular's behaviour, and it is the only form that is decidable: a range read at any
   * particular moment during a 1.7s settle is a different range.
   *
   * One phrase per movement: a held key or a burst of clicks fires `select` per position, so the phrase is
   * scheduled `QUIET_MS` after the last of them and each one pushes it back. The reader hears where the
   * track ended, once, rather than every position it passed through.
   *
   * Intent is spent on one movement and never outlives its gesture. A press that turns out to be a click
   * rather than a drag is dropped on `pointerUp`; a key or control that cannot move — an endpoint on a
   * non-looping carousel — records none; and intent that nothing acts on goes stale after
   * `INTENT_IDLE_MS`. An autoplay plugin's tick, a `reInit` from a resize or a `dir` flip, and the first
   * layout are all silent, because none of them records intent and none can spend another gesture's.
   */
  React.useEffect(() => {
    if (!api) return;
    const win = root.current?.ownerDocument.defaultView;
    if (!win) return;
    let quiet = 0;

    const say = (gen: number) => {
      // A newer gesture owns the floor: this callback was scheduled for an intent that is over.
      if (gen !== intentId.current) return;
      if (!intentAt.current) return;
      intentAt.current = 0;
      const total = api.slideNodes().length;
      if (!total) return;
      setAnnouncement(`Slide ${selectedSlide(api) + 1} of ${total}`);
    };

    /**
     * The engine is moving under the reader's hand. This is what tells a drag from a click on a slide's
     * own link, and it keeps a long gesture's intent fresh so the idle bound below applies to abandoned
     * intent rather than to a slow drag.
     */
    const moving = () => {
      if (!intentAt.current) return;
      engineMoved.current = true;
      intentAt.current = Date.now();
    };

    const selected = () => {
      // Intent nothing acted on in time is not this movement's.
      if (!intentAt.current || Date.now() - intentAt.current > INTENT_IDLE_MS) {
        intentAt.current = 0;
        return;
      }
      win.clearTimeout(quiet);
      const gen = intentId.current;
      quiet = win.setTimeout(() => say(gen), QUIET_MS);
    };

    // The engine is the only thing that knows whether a press became a drag, and it knows it at the
    // release, not at the press — so the press records intent and the release is what withdraws it.
    const press = () => {
      intentId.current += 1;
      intentAt.current = Date.now();
      engineMoved.current = false;
    };
    const release = () => {
      if (!engineMoved.current) intentAt.current = 0;
    };

    api.on("scroll", moving);
    api.on("select", selected);
    api.on("pointerDown", press);
    api.on("pointerUp", release);
    return () => {
      win.clearTimeout(quiet);
      api?.off("scroll", moving);
      api?.off("select", selected);
      api?.off("pointerDown", press);
      api?.off("pointerUp", release);
    };
  }, [api]);

  /**
   * Focus follows the view. Marking the slide under the reader's focus `inert` is what takes that focus
   * away — the browser blurs an element that becomes inert — so this runs AFTER the attribute is applied
   * and puts focus on the first slide now in view, which is where `@kinetixui/angular` puts it
   * (`packages/ui-angular/src/lib/carousel.ts:59`). Without it the reader's place would fall to `BODY`,
   * which is the same loss `aria-disabled` on the controls exists to prevent.
   *
   * It moves focus ONLY when focus was inside a slide that just left the view. Focus on a control, on the
   * region, or anywhere else in the page is never taken.
   */
  React.useEffect(() => {
    if (!slideNodes.length || !slidesInView.length) return;
    const active = root.current?.ownerDocument.activeElement;
    if (!active || active === root.current) return;
    const leaving = slideNodes.find((n, i) => !slidesInView.includes(i) && n.contains(active));
    if (!leaving) return;
    const landing = slideNodes[slidesInView[0]!];
    if (landing instanceof HTMLElement) landing.focus();
  }, [slideNodes, slidesInView]);

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
      value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext, rtl: engineRtl, slideNodes, slidesInView, noteUserMove }}
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
          // Keys follow the AXIS: the inline pair on a horizontal track, the block pair on a vertical one.
          // A vertical carousel used to answer ArrowLeft/ArrowRight and ignore ArrowUp/ArrowDown — the
          // exact inverse of `@kinetixui/angular`, which has shipped the block pair and documented it
          // since it was written. This is a BREAKING change for a consumer who drove a vertical carousel
          // with the inline keys; the changeset says so, and it is why this is its own pull request
          // rather than part of the accessibility patch it is stacked on.
          const engineRtl = opts?.direction ? opts.direction === "rtl" : isRtl(e.currentTarget);
          const move = horizontal ? inlineKey(e.key, engineRtl) : blockKey(e.key);
          if (move) {
            e.preventDefault();
            // Intent is recorded only when the move can happen. A press against an endpoint on a
            // non-looping carousel moves nothing and emits nothing, so recording intent there would leave
            // it waiting for whatever moved the track next — an autoplay tick, a resize — to be announced
            // as the reader's own move.
            if (move === "forward") {
              if (canScrollNext) noteUserMove();
              scrollNext();
            } else {
              if (canScrollPrev) noteUserMove();
              scrollPrev();
            }
          }
        }}
        className={cn("relative font-sans", className)}
        role="region"
        aria-roledescription="carousel"
        // An unnamed `role="region"` is not exposed as a landmark at all, so the carousel was unreachable
        // by landmark navigation and announced as a bare "carousel". A name fixes that, and the default is
        // deliberately NOT the word "carousel": with `aria-roledescription` already saying that, a reader
        // would hear it twice. "Slides" reads as "Slides, carousel". A consumer's own `aria-label` or
        // `aria-labelledby` wins — this is set before the spread and `aria-labelledby` suppresses it, since
        // supplying both would make this the name and theirs the ignored one.
        aria-label={consumerLabelledBy ? undefined : (consumerLabel ?? "Slides")}
        aria-labelledby={consumerLabelledBy}
        {...props}
      >
        {children}
        {/*
          The announcement, not the slides: `aria-atomic` so the whole phrase is read rather than the words
          that changed, and `aria-live="polite"` so it waits for a pause instead of cutting the reader off.
          It is rendered empty and stays in the tree, because a live region inserted at the moment it has
          something to say is not announced by most screen readers — the region has to exist first.
        */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
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

/**
 * One slide. Two things beyond layout, both of which `@kinetixui/angular` had already shipped while React
 * had neither (`packages/ui-angular/src/lib/carousel.ts:54`):
 *
 *   - It is NAMED "N of M", unless the consumer named it themselves. A slide announced as "slide" with no
 *     position leaves a reader unable to tell where they are or how much is left.
 *   - When it is out of view it is `inert`: not focusable, not clickable, not read. Without that, Tab walked
 *     straight into every off-screen slide — measured as a reader passing through four slides they could
 *     not see before reaching the buttons that would have shown them.
 *
 * The index comes from the ENGINE's own `slideNodes()` rather than a render counter, so it stays right when
 * slides are added, removed or reordered, and it is the same list the engine reports `slidesInView` against.
 * Until the engine has measured once, nothing is inert and nothing is named: a slide hidden before the
 * first measurement would be a slide a reader could not reach on a page that never finished laying out.
 */
const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, "aria-label": consumerLabel, ...props }, ref) => {
    const { orientation, slideNodes, slidesInView } = useCarousel();
    const node = React.useRef<HTMLDivElement | null>(null);
    const setNode = React.useCallback(
      (el: HTMLDivElement | null) => {
        node.current = el;
        const cleanup: unknown =
          typeof ref === "function" ? ref(el) : ref ? ((ref.current = el), undefined) : undefined;
        if (typeof cleanup === "function") {
          return () => {
            node.current = null;
            (cleanup as () => void)();
          };
        }
      },
      [ref],
    );

    // The index is STATE, not a ref read during render: a ref's value during render is whatever the last
    // commit left there, and on the first render there is no node yet. The effect re-resolves it whenever
    // the engine's own node list changes, which is also when a slide is added, removed or reordered.
    const [index, setIndex] = React.useState(-1);
    React.useEffect(() => {
      setIndex(node.current ? slideNodes.indexOf(node.current) : -1);
    }, [slideNodes]);

    const measured = index >= 0 && slidesInView.length > 0;
    const outOfView = measured && !slidesInView.includes(index);

    return (
      <div
        ref={setNode}
        role="group"
        aria-roledescription="slide"
        // `tabIndex={-1}` adds no Tab stop; it makes the slide a focus TARGET, which is what the carousel
        // needs when focus has to leave a slide that just went out of view.
        tabIndex={-1}
        inert={outOfView || undefined}
        // Destructured out of `props`, NOT read from it and then overwritten by the spread below: a
        // consumer who writes `aria-label={undefined}` — which is what any optional label prop passes when
        // it is unset — would otherwise erase the computed name with that undefined. Measured: the naming
        // rows of `carousel-accessibility-parity.test.tsx` fail with `null` if this is read from `props`.
        aria-label={consumerLabel ?? (index >= 0 ? `${index + 1} of ${slideNodes.length}` : undefined)}
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
    const { orientation, scrollPrev, canScrollPrev, rtl, noteUserMove } = useCarousel();
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
          noteUserMove();
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
    const { orientation, scrollNext, canScrollNext, rtl, noteUserMove } = useCarousel();
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
          noteUserMove();
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
