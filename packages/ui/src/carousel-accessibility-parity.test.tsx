import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./components/carousel";

/**
 * What jsdom can and cannot decide here, stated once so no row claims more than it measures.
 *
 * DECIDABLE: which attributes are rendered, and which of two values a handler picks — naming, the region's
 * accessible name, and whether a key is claimed (`preventDefault`). A key's mapping is a precedence
 * question, not a layout one.
 *
 * NOT DECIDABLE: `inert`, the Tab order and focus following the view, because all three depend on slides
 * being laid out and jsdom lays nothing out. Those live in `scripts/react-carousel-slide-exposure.mjs`.
 */

function Fixture({
  orientation = "horizontal",
  slides = 4,
  slideLabel,
  ...rest
}: {
  orientation?: "horizontal" | "vertical";
  slides?: number;
  slideLabel?: string;
} & React.ComponentProps<typeof Carousel>) {
  return (
    <Carousel orientation={orientation} data-testid="region" {...rest}>
      <CarouselContent>
        {Array.from({ length: slides }, (_, i) => (
          <CarouselItem key={i} aria-label={slideLabel}>
            slide {i + 1}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

const region = () => screen.getByTestId("region");
const press = (key: string, el: HTMLElement = region()) => {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev.defaultPrevented;
};

describe("slide position and total count", () => {
  it("names every slide “N of M”", async () => {
    render(<Fixture slides={4} />);
    await waitFor(() =>
      expect(screen.getAllByRole("group").map((s) => s.getAttribute("aria-label"))).toEqual([
        "1 of 4",
        "2 of 4",
        "3 of 4",
        "4 of 4",
      ]),
    );
  });

  it("the count follows the number of slides, so it is not a hard-coded four", async () => {
    render(<Fixture slides={2} />);
    await waitFor(() =>
      expect(screen.getAllByRole("group").map((s) => s.getAttribute("aria-label"))).toEqual([
        "1 of 2",
        "2 of 2",
      ]),
    );
  });

  it("a consumer's own slide label wins", async () => {
    render(<Fixture slides={3} slideLabel="Featured" />);
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(3));
    expect(screen.getAllByRole("group").map((s) => s.getAttribute("aria-label"))).toEqual([
      "Featured",
      "Featured",
      "Featured",
    ]);
  });
});

describe("the region's accessible name", () => {
  it("defaults to a name that is not the word the roledescription already says", async () => {
    render(<Fixture />);
    expect(region().getAttribute("aria-label")).toBe("Slides");
    expect(region().getAttribute("aria-roledescription")).toBe("carousel");
    // The pair a reader hears must not repeat itself.
    expect(region().getAttribute("aria-label")?.toLowerCase()).not.toContain("carousel");
  });

  it("a consumer's aria-label wins", async () => {
    render(<Fixture aria-label="Featured work" />);
    expect(region().getAttribute("aria-label")).toBe("Featured work");
  });

  it("a consumer's aria-labelledby suppresses the default, rather than competing with it", async () => {
    render(
      <>
        <h2 id="gallery-heading">Gallery</h2>
        <Fixture aria-labelledby="gallery-heading" />
      </>,
    );
    expect(region().getAttribute("aria-labelledby")).toBe("gallery-heading");
    expect(region().getAttribute("aria-label")).toBeNull();
  });
});

describe("which arrow keys each axis claims", () => {
  /**
   * React claims the INLINE pair on both axes. `@kinetixui/angular` claims the block pair on a vertical
   * track (`packages/ui-angular/src/lib/carousel.ts:68,352`), so the platforms disagree — and aligning
   * them changes a published consumer behaviour, so it is a separate follow-up. These two tests are what
   * that follow-up inverts; they record today's behaviour rather than endorsing it.
   */
  it("vertical: the inline pair is claimed, as it always has been", async () => {
    render(<Fixture orientation="vertical" />);
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(true);
  });

  it("vertical: the block pair is NOT claimed — this is what the follow-up changes", async () => {
    render(<Fixture orientation="vertical" />);
    expect(press("ArrowDown")).toBe(false);
    expect(press("ArrowUp")).toBe(false);
  });

  it("horizontal: ArrowLeft and ArrowRight are claimed, ArrowUp and ArrowDown are not", async () => {
    render(<Fixture orientation="horizontal" />);
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(true);
    expect(press("ArrowUp")).toBe(false);
    expect(press("ArrowDown")).toBe(false);
  });

  it("horizontal RTL still resolves the inline pair, so the accessibility work did not eat the direction fix", async () => {
    render(
      <div dir="rtl">
        <Fixture orientation="horizontal" />
      </div>,
    );
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(true);
  });

  it("a modifier still belongs to the browser", async () => {
    render(<Fixture orientation="horizontal" />);
    const ev = new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true, cancelable: true });
    region().dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("the live region", () => {
  const live = () => document.querySelector('[aria-live]');

  it("exists from the first render, scoped and polite", async () => {
    render(<Fixture />);
    expect(live()).not.toBeNull();
    expect(live()!.getAttribute("aria-live")).toBe("polite");
    expect(live()!.getAttribute("aria-atomic")).toBe("true");
    expect(live()!.className).toContain("sr-only");
  });

  it("says nothing at initialization", async () => {
    render(<Fixture />);
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(4));
    expect(live()!.textContent).toBe("");
  });

  it("is inside the region, so it is scoped to this carousel and not the page", async () => {
    render(<Fixture />);
    expect(region().contains(live())).toBe(true);
  });

  it("there is exactly one, so two carousels cannot announce into each other", async () => {
    render(
      <>
        <Fixture />
        <Carousel aria-label="Second">
          <CarouselContent>
            <CarouselItem>only</CarouselItem>
          </CarouselContent>
        </Carousel>
      </>,
    );
    expect(document.querySelectorAll("[aria-live]")).toHaveLength(2);
  });
});

describe("what the controls and the keys tell the announcer", () => {
  it("a key press marks the move as the reader's, and a programmatic scroll does not", async () => {
    // The flag is internal, so this asserts the one thing it is for: the key handler runs the scroll.
    const setApi = vi.fn();
    render(<Fixture setApi={setApi} />);
    await waitFor(() => expect(setApi).toHaveBeenCalled());
    const api = setApi.mock.calls.at(-1)![0];
    expect(typeof api.scrollNext).toBe("function");
    // A direct API call is not a reader's move: nothing in the component observes it.
    expect(press("ArrowRight")).toBe(true);
  });
});
