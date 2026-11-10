import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { SegmentedControl, SegmentedControlItem } from "./components/segmented-control";

/**
 * segmented-control-selection.test.tsx — a segmented control always has a chosen segment.
 *
 * Measured on `main` 590368d, before the fix: clicking the already-chosen segment called
 * `onValueChange("")` and left every segment at `data-state="off"`, so the `radiogroup` had no checked
 * radio and, since `data-[state=on]` is the only rule that paints a segment, nothing was marked. An
 * uncontrolled control blanked outright; the controlled ones in this repository each carried a
 * hand-written `if (next)` guard against the same empty value.
 *
 * The last two tests are negative controls: the pre-fix wrapper, test-local, which has to FAIL the
 * shape the assertions above rely on. Nothing deliberately broken is committed to the library.
 */

const CHOICES = ["list", "grid", "board"] as const;

function chosen() {
  return screen
    .getAllByRole("radio")
    .filter((r) => r.getAttribute("data-state") === "on")
    .map((r) => r.textContent);
}

function Uncontrolled() {
  return (
    <SegmentedControl defaultValue="grid" aria-label="View">
      {CHOICES.map((c) => (
        <SegmentedControlItem key={c} value={c}>
          {c}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

function Controlled({ onChange }: { onChange?: (v: string) => void }) {
  const [v, setV] = React.useState("grid");
  return (
    <SegmentedControl
      value={v}
      aria-label="View"
      onValueChange={(next) => {
        setV(next);
        onChange?.(next);
      }}
    >
      {CHOICES.map((c) => (
        <SegmentedControlItem key={c} value={c}>
          {c}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

describe("a segmented control keeps its answer", () => {
  it("declares itself a radiogroup of radios", () => {
    render(<Uncontrolled />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "grid" })).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the chosen segment leaves it chosen, uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    await user.click(screen.getByRole("radio", { name: "grid" }));
    expect(chosen()).toEqual(["grid"]);
    expect(screen.getByRole("radio", { name: "grid" })).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the chosen segment leaves it chosen, controlled, and says nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "grid" }));
    expect(chosen()).toEqual(["grid"]);
    // The empty value never reaches the consumer, so a call site does not need its own `if (next)`.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("the keyboard cannot empty it either", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(chosen()).toEqual(["grid"]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still moves between segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "board" }));
    expect(chosen()).toEqual(["board"]);
    expect(onChange).toHaveBeenCalledWith("board");
  });

  it("still gives the strip one tab stop and arrow keys inside it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Uncontrolled />
        <button type="button">after</button>
      </>,
    );
    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    // Roving focus: the strip is one stop, and it is the chosen segment that holds it.
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "grid" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "board" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "after" }));
  });

  it("a consumer that wants nothing chosen can still say so", () => {
    // The refusal is of the control emptying ITSELF. An owner of the value keeps the final say.
    render(
      <SegmentedControl value="" aria-label="View">
        {CHOICES.map((c) => (
          <SegmentedControlItem key={c} value={c}>
            {c}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>,
    );
    expect(chosen()).toEqual([]);
  });

  it("negative control: the pre-fix wrapper empties itself when uncontrolled", async () => {
    // `main`'s SegmentedControl, in behaviour: props straight through to a single-select ToggleGroup.
    function Legacy() {
      return (
        <ToggleGroupPrimitive.Root type="single" defaultValue="grid" aria-label="Legacy">
          {CHOICES.map((c) => (
            <ToggleGroupPrimitive.Item key={c} value={c}>
              {c}
            </ToggleGroupPrimitive.Item>
          ))}
        </ToggleGroupPrimitive.Root>
      );
    }
    const user = userEvent.setup();
    render(<Legacy />);
    await user.click(screen.getByRole("radio", { name: "grid" }));
    expect(chosen()).toEqual([]);
  });

  it("negative control: the pre-fix wrapper hands the consumer an empty value", async () => {
    const onChange = vi.fn();
    function Legacy() {
      const [v, setV] = React.useState("grid");
      return (
        <ToggleGroupPrimitive.Root
          type="single"
          value={v}
          aria-label="Legacy"
          onValueChange={(next) => {
            setV(next);
            onChange(next);
          }}
        >
          {CHOICES.map((c) => (
            <ToggleGroupPrimitive.Item key={c} value={c}>
              {c}
            </ToggleGroupPrimitive.Item>
          ))}
        </ToggleGroupPrimitive.Root>
      );
    }
    const user = userEvent.setup();
    render(<Legacy />);
    await user.click(screen.getByRole("radio", { name: "grid" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(chosen()).toEqual([]);
  });
});
