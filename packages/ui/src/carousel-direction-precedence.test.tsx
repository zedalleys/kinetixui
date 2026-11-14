/**
 * Which direction the arrow keys follow when the document and the consumer disagree.
 *
 * The carousel resolves its own direction from the rendered element and passes it to the engine, but a
 * consumer's `opts.direction` is spread AFTER it and so wins — deliberately, since the resolution is a
 * default, not an override. The keyboard mapping must follow the same winner. Reading the document there
 * instead would hand a consumer who pinned the engine to `ltr` inside an RTL page a track running one way
 * and keys driving it the other. Found by Codex on PR #579.
 *
 * ENVIRONMENT: jsdom, and deliberately so. This is a claim about PRECEDENCE — which of two values the
 * handler picks — not about layout, so it is decidable without a browser. `isRtl` consults the nearest
 * `[dir]` before any computed style, which jsdom reports faithfully. Which way the track then actually
 * travels is a layout claim and belongs to `scripts/react-carousel-direction.mjs`, in Chromium. The two
 * gates are not substitutes for each other: this one cannot see a transform, and that one cannot reach
 * this configuration, because the carousel's Storybook story is generated from the shipped demos and
 * passes no `opts`.
 *
 * `preventDefault` is the observable here: the handler calls it only for a key it claims, and the two
 * keys are claimed under either direction, so the signal is which SCROLL the api was asked for. The
 * api is captured through `setApi`, and `scrollNext`/`scrollPrev` are spied on it.
 */
import { render, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CarouselApi } from "./components/carousel";
import { Carousel, CarouselContent, CarouselItem } from "./components/carousel";

/** Render a carousel inside a document of `dir`, optionally pinning the engine, and spy on the api. */
function setup(dir: "ltr" | "rtl", direction?: "ltr" | "rtl") {
  const spy = { next: vi.fn(), prev: vi.fn() };
  const take = (api: CarouselApi) => {
    if (!api) return;
    vi.spyOn(api, "scrollNext").mockImplementation(spy.next);
    vi.spyOn(api, "scrollPrev").mockImplementation(spy.prev);
  };
  render(
    <div dir={dir}>
      <Carousel aria-label="Gallery" setApi={take} opts={direction ? { direction } : undefined}>
        <CarouselContent>
          <CarouselItem>one</CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>,
  );
  return { region: screen.getByRole("region", { name: "Gallery" }), spy };
}

describe("Carousel arrow keys follow the direction the engine is running", () => {
  it("follows the document when the consumer states nothing: ArrowRight advances in LTR", () => {
    const { region, spy } = setup("ltr");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.prev).not.toHaveBeenCalled();
  });

  it("follows the document when the consumer states nothing: ArrowLeft advances in RTL", () => {
    const { region, spy } = setup("rtl");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.prev).not.toHaveBeenCalled();
  });

  // The finding: the engine keeps the consumer's `ltr` here, so the keys must keep it too.
  it("follows a consumer's opts.direction=ltr over an RTL document", () => {
    const { region, spy } = setup("rtl", "ltr");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.prev).not.toHaveBeenCalled();
  });

  it("and ArrowLeft then goes back, rather than advancing", () => {
    const { region, spy } = setup("rtl", "ltr");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(spy.prev).toHaveBeenCalledTimes(1);
    expect(spy.next).not.toHaveBeenCalled();
  });

  // The mirror case, so the fix cannot be "always obey opts" or "always ignore the document".
  it("follows a consumer's opts.direction=rtl over an LTR document", () => {
    const { region, spy } = setup("ltr", "rtl");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.prev).not.toHaveBeenCalled();
  });
});
