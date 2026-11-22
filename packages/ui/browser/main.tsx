/**
 * The React browser harness. One fixture per page, chosen by `data-kx-axis` / `data-kx-slides` on <html>,
 * mounted from the package's own source so a gate measures the component rather than a copy of its markup.
 *
 * Every slide holds a LINK. That is the point of the fixture: a slide's interactive descendants are what a
 * Tab order can walk into, and a carousel of inert text cannot show whether an off-screen slide is reachable.
 * The two page-level anchors around the mount give the Tab walk a known start and a known end.
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../src/index";

const html = document.documentElement;
const axis = html.dataset.kxAxis === "vertical" ? "vertical" : "horizontal";
const count = Number(html.dataset.kxSlides ?? "5");
const label = html.dataset.kxLabel ?? undefined;
/**
 * `data-kx-threshold="engine"` leaves `inViewThreshold` at the engine's own default instead of the pinned
 * 0.5 below. One fixture page must do this: pinning the threshold is what makes the in-view set stable
 * enough to assert, and it ALSO collapses an animated move's in-view changes into a single notification —
 * so a gate run only against the pinned fixture cannot see a defect that needs two of them. See
 * `scripts/react-carousel-slide-exposure.mjs`'s "one move speaks once" section.
 */
const engineThreshold = html.dataset.kxThreshold === "engine";

/**
 * What a screen reader would have been HANDED, in order. Reading the live region once at the end cannot
 * tell "announced the landing" from "announced somewhere it passed through and then fell silent": both
 * leave one string in the DOM. This records every text the region has held, so the gate can assert the
 * SEQUENCE — how many phrases one movement produced, and which one was last.
 */
declare global {
  interface Window {
    __kxSpoken?: string[];
  }
}
window.__kxSpoken = [];

function Harness() {
  const [ready, setReady] = React.useState(false);
  return (
    <Carousel
      orientation={axis}
      aria-label={label}
      // `inViewThreshold: 0.5` — "in view" means at least half visible. With the engine's default of 0 a
      // slide starting exactly at the viewport's edge is in view or out of it depending on subpixel
      // rounding, so the in-view set flipped between 1 and 2 slides between runs of the same gate and the
      // announcement's wording flipped with it. A fixture must not leave the thing under measurement to a
      // coin flip; this is an engine option, not a change to the component.
      opts={engineThreshold ? {} : { inViewThreshold: 0.5 }}
      setApi={(api) => {
        if (!api) return;
        // The gate must not read a carousel that has not measured: `slidesInView` is empty until it has,
        // and an assertion over an empty collection passes while proving nothing.
        const mark = () => {
          // The ENGINE's own in-view list, published for the gate. A gate that recomputed "in view" from
          // bounding boxes would be asserting its own overlap threshold against Embla's `inViewThreshold`,
          // and the two disagree at the boundary — measured: a slide starting exactly at the viewport's
          // edge is in view for the engine and out of view for a `> 1px` geometry test, which made the
          // inert assertion flap. The component's contract is about the engine's notion, so the gate is
          // given the engine's notion.
          html.dataset.kxInView = api.slidesInView().join(",");
          // The SELECTED index, which is what the component announces and the only quantity that does not
          // wobble during the engine's 1.7s settle. Published so a gate asserts the phrase by value.
          html.dataset.kxSelected = String(api.selectedScrollSnap());
          if (api.slidesInView().length) setReady(true);
        };
        mark();
        api.on("slidesInView", mark);
        api.on("select", mark);
        api.on("reInit", mark);

        // The live region is the component's own; find it from the root the engine was given.
        const region = api.rootNode().closest('[role="region"]') ?? api.rootNode();
        const live = region.querySelector("[aria-live]");
        if (live) {
          const record = () => {
            const text = live.textContent ?? "";
            const log = window.__kxSpoken!;
            if (text && text !== log[log.length - 1]) log.push(text);
          };
          record();
          new MutationObserver(record).observe(live, { childList: true, characterData: true, subtree: true });
        }
      }}
    >
      <CarouselContent className="kx-harness-viewport">
        {Array.from({ length: count }, (_, i) => (
          <CarouselItem key={i}>
            <div className="kx-harness-slide">
              <a href="#" id={`slide-link-${i + 1}`}>
                link in slide {i + 1}
              </a>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      {ready ? <span data-kx-ready="" hidden /> : null}
    </Carousel>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
