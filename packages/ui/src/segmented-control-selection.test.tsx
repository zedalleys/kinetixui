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

/**
 * Selection follows focus — the radiogroup contract.
 *
 * Measured before the change: with focus on the first segment, ArrowRight moved focus to the second
 * and left the selection states at `on,off,off`. The root is a `radiogroup` and the items are
 * `radio`s, and in a radiogroup the ARIA practices have an arrow key move focus AND check what it
 * lands on. Radix's roving focus moves focus alone, so arrowing left the reader on a segment that
 * was not the answer until they pressed Enter as well.
 *
 * This is a deliberate behaviour change: `onValueChange` now fires on an arrow press. Home, End,
 * wrapping and direction come from the primitive's roving focus and are unchanged — the selection
 * simply follows wherever it puts focus.
 */
describe("selection follows focus, as a radiogroup's does", () => {
  const FOUR = ["list", "grid", "board", "feed"] as const;

  function Strip({
    dir,
    disabled,
    onChange,
    uncontrolled,
  }: {
    dir?: "ltr" | "rtl";
    disabled?: string;
    onChange?: (v: string) => void;
    uncontrolled?: boolean;
  }) {
    const [v, setV] = React.useState("grid");
    const items = FOUR.map((c) => (
      <SegmentedControlItem key={c} value={c} disabled={c === disabled}>
        {c}
      </SegmentedControlItem>
    ));
    return uncontrolled ? (
      <SegmentedControl defaultValue="grid" aria-label="View" dir={dir} onValueChange={onChange}>
        {items}
      </SegmentedControl>
    ) : (
      <SegmentedControl
        value={v}
        aria-label="View"
        dir={dir}
        onValueChange={(next) => {
          setV(next);
          onChange?.(next);
        }}
      >
        {items}
      </SegmentedControl>
    );
  }

  const marked = () =>
    screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("data-state") === "on")
      .map((r) => r.textContent);
  const focused = () => (document.activeElement as HTMLElement)?.textContent;

  it("ArrowRight and ArrowLeft move focus and the answer together", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Strip onChange={onChange} />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(focused()).toBe("board");
    expect(marked()).toEqual(["board"]);
    await user.keyboard("{ArrowLeft}");
    expect(focused()).toBe("grid");
    expect(marked()).toEqual(["grid"]);
    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["board", "grid"]);
  });

  it("keeps aria-checked in step with focus", async () => {
    const user = userEvent.setup();
    render(<Strip />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "board" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "grid" })).toHaveAttribute("aria-checked", "false");
    // Exactly one radio is checked, which is the whole point of refusing the empty value.
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
  });

  it("reports each arrow exactly once, and reports nothing for a key that moves nowhere", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Strip onChange={onChange} />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledTimes(1);
    // The focus handler and the primitive's own activation both arrive for a press; the second is a
    // no-op because the value is already the current one, so a consumer sees one call per movement.
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("follows Home and End too, because they move focus", async () => {
    const user = userEvent.setup();
    render(<Strip />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{Home}");
    expect(focused()).toBe("list");
    expect(marked()).toEqual(["list"]);
    await user.keyboard("{End}");
    expect(focused()).toBe("feed");
    expect(marked()).toEqual(["feed"]);
  });

  it("follows the reading direction, not the physical key", async () => {
    // Radix flips the arrows for `dir="rtl"`, so ArrowLeft is "next" there. The selection goes with
    // focus either way, which is what makes this direction-correct without a direction branch here.
    const user = userEvent.setup();
    render(<Strip dir="rtl" />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(focused()).toBe("board");
    expect(marked()).toEqual(["board"]);
    await user.keyboard("{ArrowRight}");
    expect(focused()).toBe("grid");
    expect(marked()).toEqual(["grid"]);
  });

  it("never checks a disabled segment, because focus does not land on one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Strip disabled="board" onChange={onChange} />);
    // jsdom lets a script focus a disabled button where a browser would not. Either way, landing on a
    // disabled segment must not change the answer.
    screen.getByRole("radio", { name: "board" }).focus();
    expect(marked()).toEqual(["grid"]);
    expect(onChange).not.toHaveBeenCalled();
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    // Roving focus steps over the disabled segment, so the answer steps over it too.
    expect(focused()).toBe("feed");
    expect(marked()).toEqual(["feed"]);
    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["feed"]);
  });

  it("works the same uncontrolled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Strip uncontrolled onChange={onChange} />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(focused()).toBe("board");
    expect(marked()).toEqual(["board"]);
    expect(onChange).toHaveBeenCalledExactlyOnceWith("board");
  });

  it("keeps the strip to one tab stop, and tabbing in checks nothing new", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <button type="button">before</button>
        <Strip uncontrolled onChange={onChange} />
        <button type="button">after</button>
      </>,
    );
    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    // Roving focus lands on the chosen segment, so there is nothing to change.
    expect(focused()).toBe("grid");
    expect(marked()).toEqual(["grid"]);
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "after" }));
  });

  it("still cannot be emptied, by arrow or by re-activation", async () => {
    // The guarantee #555 added survives this change.
    const user = userEvent.setup();
    render(<Strip />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter} ");
    expect(marked()).toHaveLength(1);
  });

  it("negative control: roving focus alone leaves the answer behind", async () => {
    // The behaviour before this change, test-local: arrow moves focus, selection stays put.
    function Legacy() {
      const [v, setV] = React.useState("grid");
      return (
        <ToggleGroupPrimitive.Root type="single" value={v} aria-label="Legacy" onValueChange={setV}>
          {FOUR.map((c) => (
            <ToggleGroupPrimitive.Item key={c} value={c}>
              {c}
            </ToggleGroupPrimitive.Item>
          ))}
        </ToggleGroupPrimitive.Root>
      );
    }
    const user = userEvent.setup();
    render(<Legacy />);
    screen.getByRole("radio", { name: "grid" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(focused()).toBe("board");
    expect(marked()).toEqual(["grid"]);
  });
});
