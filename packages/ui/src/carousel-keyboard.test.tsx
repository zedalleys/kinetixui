/**
 * Carousel listened for ArrowLeft/ArrowRight in the CAPTURE phase on its root and called
 * `preventDefault()` unconditionally. Capture runs before the focused element sees the key, so a text
 * field inside a slide lost caret movement, a nested control that already handled the arrow was
 * overridden, and Alt+ArrowLeft (browser Back) was cancelled. These assertions hold the carousel to
 * handling an arrow only when nothing inside it has claimed the key.
 *
 * ENVIRONMENT: jsdom; behavioural evidence for the keyboard handler, not a browser measurement.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Carousel, CarouselContent, CarouselItem } from "./components/carousel";

function Fixture() {
  return (
    <Carousel aria-label="Gallery">
      <CarouselContent>
        <CarouselItem>
          <input aria-label="Caption" defaultValue="hello" />
          <button type="button">Action</button>
        </CarouselItem>
        <CarouselItem>two</CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

describe("Carousel arrow keys", () => {
  it("does not cancel caret movement in a text field inside a slide", () => {
    render(<Fixture />);
    const notCancelled = fireEvent.keyDown(screen.getByLabelText("Caption"), { key: "ArrowLeft" });
    expect(notCancelled).toBe(true);
  });

  it("does not hijack a modified arrow such as Alt+ArrowLeft (browser Back)", () => {
    render(<Fixture />);
    const notCancelled = fireEvent.keyDown(screen.getByRole("button", { name: "Action" }), {
      key: "ArrowLeft",
      altKey: true,
    });
    expect(notCancelled).toBe(true);
  });

  // Negative control: a plain arrow on a non-editing control inside the carousel is still the carousel's.
  it("still takes a plain arrow from a button inside the carousel", () => {
    render(<Fixture />);
    const notCancelled = fireEvent.keyDown(screen.getByRole("button", { name: "Action" }), { key: "ArrowRight" });
    expect(notCancelled).toBe(false);
  });
});
