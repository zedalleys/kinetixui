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
});
