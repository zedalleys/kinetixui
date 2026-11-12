/**
 * What the Carousel's root ref does with what a consumer's callback ref returns.
 *
 * This slice needed the root element for its own direction lookup, so it replaced a bare `ref={ref}` with
 * a wrapper that writes an internal ref and then forwards. That wrapper discarded the consumer's return
 * value. Under React 19 a callback ref may return a cleanup, and React then does NOT call that ref again
 * with `null` — so the consumer's teardown simply never ran, and an observer or subscription attached to
 * the node leaked for the life of the page. Found by Codex on PR #579.
 *
 * The three paths are each asserted, because the correct behaviour differs by path and a fix that returned
 * a cleanup unconditionally would warn on React 18, which this package still supports (`react: >=18`):
 *
 *   - a callback ref that RETURNS a cleanup: the cleanup runs on unmount, and the ref is not called with
 *     null (React 19's contract — calling it would be the double-teardown the contract exists to avoid);
 *   - a callback ref that returns NOTHING: it is called with null on unmount, as it always was;
 *   - an object ref: `.current` is set and then nulled.
 *
 * ENVIRONMENT: jsdom. Ref identity and teardown are React's own bookkeeping, not layout.
 */
import { render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Carousel, CarouselContent, CarouselItem } from "./components/carousel";

const tree = (ref: React.Ref<HTMLDivElement>) => (
  <Carousel ref={ref}>
    <CarouselContent>
      <CarouselItem>one</CarouselItem>
      <CarouselItem>two</CarouselItem>
    </CarouselContent>
  </Carousel>
);

describe("Carousel root ref", () => {
  it("runs the cleanup a React 19 callback ref returns, and does not also call it with null", () => {
    const cleanup = vi.fn();
    const calls: (HTMLDivElement | null)[] = [];
    const ref = (node: HTMLDivElement | null) => {
      calls.push(node);
      return cleanup;
    };

    const view = render(tree(ref));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeInstanceOf(HTMLElement);
    expect(cleanup).not.toHaveBeenCalled();

    view.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    // The whole point of the cleanup contract: React hands teardown to the cleanup INSTEAD of a null call.
    expect(calls).toHaveLength(1);
  });

  it("still calls a callback ref with null on unmount when it returns nothing", () => {
    const calls: (HTMLDivElement | null)[] = [];
    const view = render(
      tree((node: HTMLDivElement | null) => {
        calls.push(node);
      }),
    );
    expect(calls).toEqual([expect.any(HTMLElement)]);

    view.unmount();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBeNull();
  });

  it("sets and clears an object ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    const view = render(tree(ref));
    expect(ref.current).toBeInstanceOf(HTMLElement);
    view.unmount();
    expect(ref.current).toBeNull();
  });
});
