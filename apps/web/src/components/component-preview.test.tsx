import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/components/button" }));
import { ComponentPreview } from "./component-preview";

afterEach(() => cleanup());

/**
 * CAT-BUG-010. The Preview/Code control was a direct child of the preview panel, so it rendered flush
 * against the panel's own 1px border — measured at top 1.0px, start 1.0px at 320, 390, 768 and 1280, in
 * both directions. A rounded control touching a rounded panel corner reads as misassembled on the page an
 * evaluator judges the library by.
 *
 * jsdom has no layout, so the inset itself is measured in the browser (scripts/catalogue-preview-audit.mjs,
 * "Preview/Code control" rows). What this holds is the structure that produced it: the control sits in a row
 * of its own that carries the inset, never directly on the panel. Removing the wrapper fails here.
 */
describe("ComponentPreview chrome", () => {
  const panelOf = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-cp]")!;

  it("insets the Preview/Code control instead of sitting it on the panel border", () => {
    const { container } = render(<ComponentPreview name="button-demo" />);
    const control = screen.getByRole("radiogroup", { name: "View preview or code" });
    const panel = panelOf(container);

    expect(panel).toContainElement(control);
    const row = control.parentElement!;
    expect(row).not.toBe(panel);
    expect(row.className, "the control's row carries a horizontal and a vertical inset").toMatch(
      /(?=.*\bpx-\d)(?=.*\bpy-\d)/,
    );

    // negative control: the assertion is about this row, and the panel itself still carries no padding —
    // so a wrapper that forgot its inset would not pass by inheriting one.
    expect(panel.className).not.toMatch(/\bp[xy]?-\d/);
  });

  it("keeps the direction wrapper between the panel and its rows", () => {
    const { container } = render(<ComponentPreview name="button-demo" />);
    const control = screen.getByRole("radiogroup", { name: "View preview or code" });
    // the control's row is inside the element that carries `dir`, so the control mirrors with the preview
    expect(control.closest("[dir]")).not.toBeNull();
    expect(panelOf(container).getAttribute("dir")).toBeNull();
  });
});
