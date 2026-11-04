import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Search } from "lucide-react";

import { Button } from "./components/button";

/**
 * An icon button must not change size when work starts.
 *
 * The defect this asserts against: the pending indicator was a flex child beside the glyph, so an
 * icon button that opted into `pending` was one slot plus one gap wider than one that did not — and
 * then shrank by exactly that much the moment work began, because `[&>svg]:hidden` took the glyph
 * out of the layout. The button jumped twice per action, under the user's pointer.
 *
 * jsdom computes no layout, so these are assertions about what the layout is DERIVED from: which
 * children take part in the flow, and whether the glyph keeps its box. A pixel measurement would
 * need a real engine, and the PR says so rather than claiming one.
 */
const icon = (props: Record<string, unknown> = {}) =>
  render(
    <Button size="icon" aria-label="Search" {...props}>
      <Search />
      Search
    </Button>,
  ).container.querySelector("button")!;

describe("an icon button keeps its square when pending", () => {
  it("takes the indicator slot out of the flow, so it adds no width beside the glyph", () => {
    const el = icon({ pending: false });
    const slot = el.querySelector("[data-pending-slot]")!;
    expect(slot).not.toBeNull();
    // Out of flow in BOTH states: the class is on the size variant, not the pending state.
    expect(el.className).toContain("[&>[data-pending-slot]]:absolute");
    expect(el.className).toContain("relative");
  });

  it("keeps the glyph's box while pending rather than removing it from the layout", () => {
    const el = icon({ pending: true });
    expect(el.className).toContain("[&>svg]:invisible");
    expect(el.className).not.toContain("[&>svg]:hidden");
    // The glyph is still rendered — `invisible` is a paint change, not an unmount.
    expect(el.querySelector("svg")).not.toBeNull();
  });

  it("renders the same children in both states, so nothing enters or leaves the flow", () => {
    const idle = icon({ pending: false });
    const busy = icon({ pending: true });
    const shape = (el: HTMLElement) =>
      [...el.children].map((child) => `${child.tagName.toLowerCase()}${child.hasAttribute("data-pending-slot") ? "[slot]" : ""}`);
    expect(shape(busy)).toEqual(shape(idle));
  });

  it("still names the button from the label, not the glyph, while pending", () => {
    const el = icon({ pending: true });
    expect(el).toHaveAccessibleName("Search");
  });

  it("a text button keeps the slot in flow, which is what reserves room for the spinner", () => {
    const el = render(
      <Button pending={false}>Save</Button>,
    ).container.querySelector("button")!;
    expect(el.querySelector("[data-pending-slot]")).not.toBeNull();
    expect(el.className).not.toContain("[&>[data-pending-slot]]:absolute");
  });
});
