import * as React from "react";

/**
 * True only while `ref`'s element can actually scroll on `axis`.
 *
 * A scroll container is a scrollable region, and a scrollable region no keyboard can reach is unreachable
 * without a pointer — WCAG 2.1.1, which axe reports as `scrollable-region-focusable`. The fix is a tab stop on
 * the container, but only while there is something to scroll: an unconditional `tabIndex` would add a focus
 * stop to every short snippet and every small diff in a consumer's app that lands on nothing.
 *
 * The same contract `Table` established for its wrapper (see `table.tsx`), generalised to either axis because a
 * diff scrolls both ways. Module-private: it is not exported from the package entry, so this adds no public API.
 *
 * The 1px tolerance absorbs sub-pixel rounding, which otherwise reports a fraction of overflow on content that
 * does not scroll and would mint a useless focus stop.
 */
export function useScrollFocus(ref: React.RefObject<HTMLElement | null>, axis: "x" | "both" = "x"): boolean {
  const [scrollable, setScrollable] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () =>
      setScrollable(
        el.scrollWidth > el.clientWidth + 1 || (axis === "both" && el.scrollHeight > el.clientHeight + 1),
      );

    measure();
    // ResizeObserver rather than a window resize listener: the container changes size with the viewport, and its
    // content changes size with the text, the reader's font size and the active tab — none of which fire a resize
    // event on the window.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [ref, axis]);

  return scrollable;
}
