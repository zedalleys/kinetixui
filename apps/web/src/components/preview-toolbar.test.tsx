import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewEnvironment } from "./preview-environment";

/**
 * The preview toolbar is one component in two rails.
 *
 * The mode strip (component-preview.tsx) used to sit flush against the preview card while the
 * environment strip here carried `px-3 py-2`, so two controls a reader sees as one toolbar started
 * 12px apart and the upper one had no rail padding at all. The rail class string is the contract the
 * two share; these assert the environment rail still states it, and that the controls inside it keep
 * their semantics. The geometry — equal inline insets and equal control heights, at six widths × two
 * text scales × both directions — is measured in a real browser by the `spacing` check of
 * `scripts/web-quality-browser.mjs`.
 */
function setMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(cleanup);

describe("preview toolbar rail", () => {
  it("insets the environment rail with the padding the mode rail copies", () => {
    setMotion(false);
    render(<PreviewEnvironment>child</PreviewEnvironment>);
    const rail = screen.getByLabelText("Preview direction").parentElement as HTMLElement;
    // The shared rail: one inline inset for both strips, one vertical padding, and wrapping rather
    // than sideways scrolling when a narrow screen cannot hold the row.
    expect(rail.className).toContain("px-3");
    expect(rail.className).toContain("py-2");
    expect(rail.className).toContain("flex-wrap");
    // The rule between the rails belongs to this one, so the pair reads as two rails of one toolbar.
    expect(rail.className).toContain("border-t");
  });

  it("keeps the direction control and the motion status in one wrapping row, not stacked by hand", () => {
    setMotion(false);
    render(<PreviewEnvironment>child</PreviewEnvironment>);
    const rail = screen.getByLabelText("Preview direction").parentElement as HTMLElement;
    const motion = screen.getByText(/Reduced motion/i).closest("p") as HTMLElement;
    expect(motion.parentElement).toBe(rail);
    // No per-control compensation: alignment comes from the rail, so nothing inside it carries a
    // margin of its own. `m-0` is the opposite of a compensation — it is the paragraph's UA margin
    // being removed so the rail's own padding is the only spacing in play.
    for (const el of [screen.getByLabelText("Preview direction"), motion]) {
      expect(el.className).not.toMatch(/\bm[xytblrse]?-[1-9]/);
      expect(el.className).not.toMatch(/-m[xytblrse]?-\d/);
    }
    expect(motion.className).toContain("m-0");
  });

  it("reports the reader's real reduced-motion setting rather than offering a switch", () => {
    setMotion(true);
    render(<PreviewEnvironment>child</PreviewEnvironment>);
    expect(screen.getByText(/Reduced motion/i)).toHaveTextContent("on");
    expect(screen.queryByLabelText(/reduced motion/i)).toBeNull();
  });

  it("leaves the direction control a two-segment radiogroup, states and all", () => {
    setMotion(false);
    render(<PreviewEnvironment>child</PreviewEnvironment>);
    const group = screen.getByLabelText("Preview direction");
    const segments = Array.from(group.querySelectorAll("button"));
    expect(segments).toHaveLength(2);
    // The rail changed the padding around the control, nothing about the control: one segment is on,
    // the other off, and each says so where a screen reader reads it.
    expect(segments.filter((s) => s.getAttribute("data-state") === "on")).toHaveLength(1);
    expect(segments.every((s) => s.hasAttribute("aria-pressed") || s.hasAttribute("data-state"))).toBe(true);
    // Both segments keep their hit size on a coarse pointer, which the rail must not have taken away.
    expect(segments.every((s) => s.className.includes("coarse:min-h-11"))).toBe(true);
  });
});
