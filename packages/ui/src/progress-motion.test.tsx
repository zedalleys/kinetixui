import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Progress } from "./components/progress";

describe("Progress motion", () => {
  it("updates paint and the actual accessible value together as progress rises and falls", () => {
    const label = (value: number, max: number) => `${value} of ${max} files`;
    const { rerender } = render(<Progress aria-label="Upload" value={1} max={4} getValueLabel={label} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    const indicator = bar.firstElementChild;
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAttribute("aria-valuetext", "1 of 4 files");
    expect(indicator).toHaveStyle({ transform: "scaleX(0.25)" });

    rerender(<Progress aria-label="Upload" value={4} max={4} getValueLabel={label} />);
    expect(bar).toHaveAttribute("aria-valuenow", "4");
    expect(indicator).toHaveStyle({ transform: "scaleX(1)" });

    rerender(<Progress aria-label="Upload" value={1.5} max={4} getValueLabel={label} />);
    expect(bar).toHaveAttribute("aria-valuenow", "1.5");
    expect(indicator).toHaveStyle({ transform: "scaleX(0.375)" });
  });

  it("clears determinate fill and value when the measurement becomes unknown", () => {
    const { rerender } = render(<Progress aria-label="Upload" value={50} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0.5)" });
    rerender(<Progress aria-label="Upload" value={null} />);
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar.firstElementChild).toHaveAttribute("data-state", "indeterminate");
    expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0)" });
  });

  it("uses Radix's invalid-value and default-maximum behavior for the visual fill", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { rerender } = render(<Progress aria-label="Upload" value={120} max={80} />);
      const bar = screen.getByRole("progressbar", { name: "Upload" });
      expect(bar).not.toHaveAttribute("aria-valuenow");
      expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0)" });
      rerender(<Progress aria-label="Upload" value={25} max={0} />);
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0.25)" });
    } finally {
      errors.mockRestore();
    }
  });

  it("withholds every non-finite maximum from the accessible range", () => {
    // Infinity is not the only non-finite bound a caller can pass, and NaN and
    // -Infinity are the two the primitive accepts without warning. An identity
    // test against Infinity leaves the component relying on the primitive's own
    // fallback happening to match its paint fallback; a finiteness test does not.
    for (const max of [Infinity, -Infinity, NaN] as number[]) {
      const { container, unmount } = render(<Progress aria-label="Upload" value={50} max={max} />);
      const bar = container.querySelector("[role='progressbar']")!;
      const announced = bar.getAttribute("aria-valuemax");
      expect(Number.isFinite(Number(announced))).toBe(true);
      expect(announced).toBe("100");
      expect(bar.getAttribute("aria-valuenow")).toBe("50");
      expect(bar.getAttribute("aria-valuetext")).not.toMatch(/NaN|Infinity/);
      expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0.5)" });
      unmount();
    }
  });

  it("refuses a non-finite measurement rather than announcing one", () => {
    for (const value of [Infinity, -Infinity, NaN] as number[]) {
      const { container, unmount } = render(<Progress aria-label="Upload" value={value} max={100} />);
      const bar = container.querySelector("[role='progressbar']")!;
      expect(bar).not.toHaveAttribute("aria-valuenow");
      expect(bar).not.toHaveAttribute("aria-valuetext");
      expect(bar.firstElementChild).toHaveAttribute("data-state", "indeterminate");
      expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0)" });
      unmount();
    }
  });

  it("keeps non-finite bounds and measurements out of the accessible range", () => {
    const { rerender } = render(<Progress aria-label="Upload" value={25} max={Infinity} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0.25)" });

    rerender(<Progress aria-label="Upload" value={Infinity} max={Infinity} />);
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(bar.firstElementChild).toHaveStyle({ transform: "scaleX(0)" });
  });
});
