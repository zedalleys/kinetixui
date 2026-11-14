/**
 * Which side a carousel's navigation controls sit on, and which way their glyphs point.
 *
 * Once the engine lays a horizontal track out in the resolved direction, a control pinned to a physical
 * side is pinned to the wrong one half the time: in a right-to-left carousel the first slide is on the
 * right, so "Previous" is toward the right. Before this, `CarouselPrevious` rendered an `ArrowLeft` at
 * `-left-12` unconditionally, so the right-hand button advanced while the left-hand button rewound and
 * both glyphs pointed away from the slide they would show. Found by Codex on PR #579.
 *
 * The side and the glyph follow the ENGINE, not the document, for the same reason the keys do: a
 * consumer's `opts.direction` drives the track and so must drive the controls, and a vertical carousel
 * has no inline direction at all and is left alone.
 *
 * ENVIRONMENT: jsdom, and deliberately so. The claim here is which class and which glyph the component
 * CHOOSES — a rendering decision, decidable without layout. That `-right-12` then actually puts the
 * button on the right is Tailwind's, and the physical placement in a real engine is asserted in Chromium
 * by `scripts/react-carousel-direction.mjs`.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./components/carousel";

type Setup = { dir: "ltr" | "rtl"; direction?: "ltr" | "rtl"; orientation?: "horizontal" | "vertical" };

function setup({ dir, direction, orientation }: Setup) {
  render(
    <div dir={dir}>
      <Carousel
        aria-label="Gallery"
        orientation={orientation}
        opts={direction ? { direction } : undefined}
      >
        <CarouselContent>
          <CarouselItem>one</CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>,
  );
  const read = (name: string) => {
    const button = screen.getByRole("button", { name });
    const svg = button.querySelector("svg");
    const glyph = svg?.classList.contains("lucide-arrow-left")
      ? "left"
      : svg?.classList.contains("lucide-arrow-right")
        ? "right"
        : "?";
    const side = button.classList.contains("-left-12")
      ? "left"
      : button.classList.contains("-right-12")
        ? "right"
        : button.classList.contains("-top-12")
          ? "top"
          : button.classList.contains("-bottom-12")
            ? "bottom"
            : "?";
    return { glyph, side };
  };
  return { previous: read("Previous slide"), next: read("Next slide") };
}

describe("Carousel controls mirror with the engine's direction", () => {
  it("LTR document: Previous is a left arrow on the left, Next a right arrow on the right", () => {
    const { previous, next } = setup({ dir: "ltr" });
    expect(previous).toEqual({ glyph: "left", side: "left" });
    expect(next).toEqual({ glyph: "right", side: "right" });
  });

  it("RTL document: Previous is a right arrow on the right, Next a left arrow on the left", () => {
    const { previous, next } = setup({ dir: "rtl" });
    expect(previous).toEqual({ glyph: "right", side: "right" });
    expect(next).toEqual({ glyph: "left", side: "left" });
  });

  it("the consumer's opts.direction wins over the document, as it does for the track", () => {
    const { previous, next } = setup({ dir: "rtl", direction: "ltr" });
    expect(previous).toEqual({ glyph: "left", side: "left" });
    expect(next).toEqual({ glyph: "right", side: "right" });
  });

  it("the consumer's opts.direction wins the other way too", () => {
    const { previous, next } = setup({ dir: "ltr", direction: "rtl" });
    expect(previous).toEqual({ glyph: "right", side: "right" });
    expect(next).toEqual({ glyph: "left", side: "left" });
  });

  it("a vertical carousel has no inline direction and does not mirror, even in RTL", () => {
    const { previous, next } = setup({ dir: "rtl", orientation: "vertical" });
    expect(previous).toEqual({ glyph: "left", side: "top" });
    expect(next).toEqual({ glyph: "right", side: "bottom" });
  });
});
