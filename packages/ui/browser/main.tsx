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
      opts={{ inViewThreshold: 0.5 }}
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
          if (api.slidesInView().length) setReady(true);
        };
        mark();
        api.on("slidesInView", mark);
        api.on("reInit", mark);
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
