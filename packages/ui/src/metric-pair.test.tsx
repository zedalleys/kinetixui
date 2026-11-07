import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Metric } from "./components/metric";

/**
 * The value/trend row's layout contract.
 *
 * jsdom performs no layout, so nothing here proves a geometry. What it does hold is the structural
 * contract that makes the measured geometry possible, and which a well-meaning refactor is most
 * likely to undo: the row is allowed to wrap, the trend is not allowed to shrink or break, and the
 * row carries the marker the rendered gate measures it by. The geometry itself — that the pair never
 * paints outside its row and never shares a line closer than 8px, at six widths × two text scales ×
 * both directions — is asserted in a real browser by the `spacing` check of
 * `scripts/web-quality-browser.mjs`. Neither test stands in for the other.
 */
describe("Metric value and trend", () => {
  const row = () => {
    const el = document.querySelector("[data-kx-metric-pair]");
    if (!el) throw new Error("Metric rendered no [data-kx-metric-pair] row — the rendered gate measures by it");
    return el as HTMLElement;
  };

  it("carries the marker the rendered spacing gate measures, with the value first and the trend second", () => {
    render(<Metric label="Error rate" value="0.42%" trend="down" change="0.1%" />);
    const children = Array.from(row().children);
    expect(children).toHaveLength(2);
    expect(children[0]).toHaveTextContent("0.42%");
    expect(children[1]).toHaveTextContent("0.1%");
  });

  it("lets the row wrap, so a pair too wide for the card stacks instead of overflowing", () => {
    render(<Metric label="Error rate" value="0.42%" trend="down" change="0.1%" />);
    const cls = row().className;
    expect(cls).toContain("flex-wrap");
    // A column gap of its own, so widening the pair cannot widen the gap between a wrapped value and
    // the trend under it.
    expect(cls).toMatch(/gap-x-\d/);
    expect(cls).not.toMatch(/(^|\s)gap-\d/);
  });

  it("never breaks the trend's figure, and lets it split from its arrow only as a last resort", () => {
    render(<Metric label="Error rate" value="0.42%" trend="down" change="0.1%" />);
    const trend = row().children[1] as HTMLElement;
    // The figure itself is never broken mid-number.
    expect(trend.className).toContain("whitespace-nowrap");
    // It may wrap between the arrow and the figure, which is what makes the extreme case readable
    // rather than clipped — and it must be allowed to shrink for that to engage at all. `shrink-0`
    // here would hold it at its natural width and put the overflow back.
    expect(trend.className).toContain("flex-wrap");
    expect(trend.className).toContain("min-w-0");
    expect(trend.className).not.toContain("shrink-0");
  });

  it("lets a long value wrap inside its own box rather than push the trend out of the card", () => {
    render(<Metric label="Lifetime value" value="1,284,993,240.55 USD" trend="up" change="0.1%" />);
    const value = row().children[0] as HTMLElement;
    expect(value.className).toContain("min-w-0");
    expect(value.className).toContain("break-words");
    expect(screen.getByText("1,284,993,240.55 USD")).toBeInTheDocument();
  });

  it("renders no trend row child when there is no trend, so the pair contract only applies to a pair", () => {
    render(<Metric label="Sessions" value="31,904" />);
    expect(row().children).toHaveLength(1);
  });

  it("keeps the trend's direction glyph with its figure in both directions", () => {
    for (const dir of ["ltr", "rtl"] as const) {
      const { unmount } = render(
        <div dir={dir}>
          <Metric label="Error rate" value="0.42%" trend="down" change="0.1%" />
        </div>,
      );
      const trend = row().children[1] as HTMLElement;
      expect(trend.querySelector("svg")).not.toBeNull();
      expect(trend).toHaveTextContent("0.1%");
      // The glyph and the figure are one inline-flex run, so the mirroring is the container's job and
      // nothing here needs a physical side.
      expect(trend.className).not.toMatch(/\b(ml|mr|left|right)-/);
      unmount();
    }
  });
});
