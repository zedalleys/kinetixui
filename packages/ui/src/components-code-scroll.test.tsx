import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CodeBlock } from "./components/code-block";
import { DiffViewer } from "./components/diff-viewer";

/**
 * components-code-scroll.test.tsx — CodeBlock's `pre` and DiffViewer's container take a tab stop exactly while
 * they can scroll, the contract `components-table-scroll.test.tsx` holds Table to.
 *
 * jsdom does no layout, so geometry and ResizeObserver are faked exactly as that file does and for the same
 * reason. These tests prove the components' decision given a measurement; that Chromium really measures an
 * overflow at 320px is what `check:a11y-site` proves, with axe's `scrollable-region-focusable` as the assertion.
 */

type ROCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
const callbacks: ROCallback[] = [];
let realRO: typeof ResizeObserver;
const resize = () => {
  for (const cb of callbacks) cb([], {} as ResizeObserver);
};

function setGeometry(
  el: Element,
  { scrollWidth, clientWidth, scrollHeight = 100, clientHeight = 100 }: Record<string, number>,
) {
  for (const [k, v] of Object.entries({ scrollWidth, clientWidth, scrollHeight, clientHeight })) {
    Object.defineProperty(el, k, { value: v, configurable: true });
  }
}

beforeEach(() => {
  callbacks.length = 0;
  realRO = window.ResizeObserver;
  window.ResizeObserver = class {
    constructor(cb: ROCallback) {
      callbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = realRO;
});

describe("CodeBlock", () => {
  const preOf = (container: HTMLElement) => container.querySelector("pre") as HTMLElement;

  it("adds no tab stop when the code fits", async () => {
    const { container } = render(<CodeBlock code="const a = 1;" />);
    const pre = preOf(container);
    setGeometry(pre, { scrollWidth: 300, clientWidth: 300 });
    resize();
    await waitFor(() => expect(pre).not.toHaveAttribute("tabindex"));
  });

  it("becomes focusable while a line overflows, and drops out again when it no longer does", async () => {
    const { container } = render(<CodeBlock code="const aVeryLongIdentifier = somethingThatDoesNotFit();" />);
    const pre = preOf(container);
    setGeometry(pre, { scrollWidth: 640, clientWidth: 280 });
    resize();
    await waitFor(() => expect(pre).toHaveAttribute("tabindex", "0"));

    setGeometry(pre, { scrollWidth: 280, clientWidth: 280 });
    resize();
    await waitFor(() => expect(pre).not.toHaveAttribute("tabindex"));
  });

  it("names the focus stop by its file, and invents no name when there is none", async () => {
    const { container, rerender } = render(<CodeBlock filename="button.tsx" code="x" />);
    const pre = preOf(container);
    setGeometry(pre, { scrollWidth: 640, clientWidth: 280 });
    resize();
    await waitFor(() => expect(screen.getByRole("group", { name: "button.tsx" })).toBe(pre));

    rerender(<CodeBlock code="x" />);
    await waitFor(() => expect(pre).toHaveAttribute("tabindex", "0"));
    expect(pre).not.toHaveAttribute("aria-label");
    expect(pre).not.toHaveAttribute("role");
  });
});

describe("DiffViewer", () => {
  it("adds no tab stop when the diff fits", async () => {
    const { container } = render(<DiffViewer oldText="a" newText="b" />);
    const box = container.firstElementChild as HTMLElement;
    setGeometry(box, { scrollWidth: 300, clientWidth: 300 });
    resize();
    await waitFor(() => expect(box).not.toHaveAttribute("tabindex"));
  });

  it("becomes focusable when it overflows on either axis", async () => {
    const { container } = render(<DiffViewer oldText="a" newText="b" />);
    const box = container.firstElementChild as HTMLElement;
    setGeometry(box, { scrollWidth: 640, clientWidth: 280 });
    resize();
    await waitFor(() => expect(box).toHaveAttribute("tabindex", "0"));

    setGeometry(box, { scrollWidth: 280, clientWidth: 280, scrollHeight: 600, clientHeight: 200 });
    resize();
    await waitFor(() => expect(box).toHaveAttribute("tabindex", "0"));
  });

  it("still forwards its ref to the container, and lets a caller's tabIndex win", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<DiffViewer ref={ref} oldText="a" newText="b" tabIndex={-1} />);
    const box = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(box);
    setGeometry(box, { scrollWidth: 640, clientWidth: 280 });
    resize();
    await waitFor(() => expect(box).toHaveAttribute("tabindex", "-1"));
  });
});
