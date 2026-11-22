"use client";

import * as React from "react";

/**
 * Where a sticky bar must sit so the site header never covers it, and whether it should be sticky at
 * all.
 *
 * The site header is deliberately allowed to grow: it is `min-h-12` with `flex-wrap`, because every
 * control in it is sized in `rem`, so at the reader's doubled text size the row has to wrap rather
 * than clip (see site-header.tsx). Its rendered height therefore has no relation to any constant.
 * Measured in Chromium on /components at main `6b1c990e`:
 *
 *   320px/100%  87px   390px/100%  49px   768px/100%  89px   1440px/100%   89px
 *   320px/200% 243px   390px/200% 243px   768px/200% 290px   1440px/200%  178px
 *
 * Every bar under it used to guess with `top-12 md:top-[5.5rem]` — 48px and 88px, doubling to 96px
 * and 176px at 200% text because Tailwind emits them in `rem`. The guess is wrong wherever the
 * header wraps: at 320px/200% a bar pinned at 96px sat 137px underneath a 243px header, with 40px of
 * the search field covered and `elementFromPoint` at the field's own centre returning the header's
 * button instead of the input — the field could not be clicked or tapped. The offsets scale with
 * text size; the header grows by *wrapping*, which does not, so no constant can be right at every
 * text size and width. The offset has to be measured.
 *
 * Two things come back:
 *
 * `top` — the header's measured height, to be applied as an inline `top`. `undefined` until the
 * first measurement.
 *
 * `sticky` — whether to stick at all. A derived offset stops the header covering the bar, but it
 * cannot stop the pair of them covering the results the bar filters: at 768px/200% the filter bar is
 * itself 893px tall, so pinned under a 290px header it would occupy more than the whole viewport.
 * The policy is that pinned chrome may never take more than half the viewport; above that the bar
 * scrolls away with the page, which is what the catalogue's own active-filter chips and status line
 * are there for. Half is a policy, not a tuned constant: it is applied to a measurement, and the
 * consequence at every swept width and text size is recorded in the acceptance matrix.
 *
 * Before the first measurement `sticky` is `false`, so the failure mode of this hook not running is
 * a bar that scrolls — never a bar hidden under the header.
 */
export type StickyUnderHeader = {
  /** The header's measured height in px, or `undefined` before the first measurement. */
  top: number | undefined;
  /** Whether the bar should be `position: sticky` at all. */
  sticky: boolean;
};

/** The largest share of the viewport that pinned chrome (header + bar) may occupy. */
const CHROME_BUDGET = 0.5;

/**
 * @param barRef the sticky bar itself — its own height is half of the budget above.
 */
export function useStickyUnderHeader(barRef: React.RefObject<HTMLElement | null>): StickyUnderHeader {
  const [state, setState] = React.useState<StickyUnderHeader>({ top: undefined, sticky: false });

  React.useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky");
    if (typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const headerH = header?.getBoundingClientRect().height ?? 0;
      const bar = barRef.current;
      // The bar's own height while it is NOT pinned is the same box; reading it here is safe because
      // `position: sticky` does not take the element out of flow.
      const barH = bar?.getBoundingClientRect().height ?? 0;
      const viewportH = window.innerHeight || 0;
      const fits = viewportH > 0 && headerH + barH <= viewportH * CHROME_BUDGET;
      setState((prev) =>
        prev.top === headerH && prev.sticky === fits ? prev : { top: headerH, sticky: fits },
      );
    };

    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    if (barRef.current) observer.observe(barRef.current);
    // The viewport is not an observed box: a rotation or a window resize changes the budget without
    // changing either element's height.
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [barRef]);

  return state;
}
