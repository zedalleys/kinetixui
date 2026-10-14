import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { arSA } from "react-day-picker/locale";
import { describe, expect, it } from "vitest";
import { Calendar } from "./components/calendar";
import { DateRangeInput, type DateRangeValue } from "./components/date-range-input";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { TreeItem, TreeView } from "./components/tree-view";

/**
 * Label in Name (WCAG 2.5.3): a control's accessible name contains the words it shows, in order.
 *
 * axe-core 4.14 turned `label-content-name-mismatch` on by default (it was experimental and off in 4.13), and it
 * found two shared components breaking it: day buttons named by the long date alone ("Sunday, March 1st, 2026"
 * never contains the word "1"), and expanded tree items whose visible text was their whole subtree while their
 * name was their own label. `labelInName` is that rule's comparison — lower-case, letters and numbers only,
 * words in order — so these tests fail on the same markup the browser gate fails on.
 */
const words = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\([^()]*\)/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
function labelInName(visible: string, name: string) {
  const v = words(visible);
  const n = words(name);
  if (!v.length) return true;
  return n.some((_, i) => v.every((w, j) => n[i + j] === w));
}

const MARCH_2026 = new Date(2026, 2, 1);
const dayButtons = () => within(screen.getByRole("grid")).getAllByRole("button");
const dayButton = (text: string) => dayButtons().find((b) => b.textContent === text && !b.closest("[data-outside]"))!;
const nameOf = (el: HTMLElement) => el.getAttribute("aria-label") ?? "";

describe("Calendar day buttons", () => {
  it("every day's name starts with the number it shows and still carries the full date", () => {
    render(<Calendar mode="single" defaultMonth={MARCH_2026} today={new Date(2026, 2, 20)} />);
    const buttons = dayButtons();
    expect(buttons.length).toBeGreaterThanOrEqual(28);
    for (const b of buttons) {
      expect(labelInName(b.textContent ?? "", nameOf(b)), `${b.textContent} → ${nameOf(b)}`).toBe(true);
      expect(nameOf(b).startsWith(`${b.textContent}, `)).toBe(true);
    }
    expect(nameOf(dayButton("1"))).toBe("1, Sunday, March 1st, 2026");
  });

  it("keeps today, selected and disabled exposed", () => {
    render(
      <Calendar
        mode="single"
        defaultMonth={MARCH_2026}
        today={new Date(2026, 2, 20)}
        selected={new Date(2026, 2, 10)}
        disabled={{ before: new Date(2026, 2, 5) }}
      />,
    );
    expect(nameOf(dayButton("20"))).toBe("20, Today, Friday, March 20th, 2026");
    expect(nameOf(dayButton("10"))).toBe("10, Tuesday, March 10th, 2026, selected");
    expect(dayButton("10").closest('[role="gridcell"]')).toHaveAttribute("aria-selected", "true");
    expect(dayButton("3")).toBeDisabled();
    expect(nameOf(dayButton("3"))).toBe("3, Tuesday, March 3rd, 2026");
  });

  it("names the ends of a range as selected and marks the whole range on the cells", () => {
    render(<Calendar mode="range" defaultMonth={MARCH_2026} selected={{ from: new Date(2026, 2, 14), to: new Date(2026, 2, 16) }} />);
    expect(nameOf(dayButton("14"))).toBe("14, Saturday, March 14th, 2026, selected");
    expect(nameOf(dayButton("16"))).toBe("16, Monday, March 16th, 2026, selected");
    for (const d of ["14", "15", "16"]) expect(dayButton(d).closest('[role="gridcell"]')).toHaveAttribute("aria-selected", "true");
  });

  it("names by the same formatter that renders the day, so a localized RTL calendar stays consistent", () => {
    render(
      <KinetixDirectionProvider dir="rtl">
        <Calendar mode="single" defaultMonth={MARCH_2026} locale={arSA} numerals="arab" />
      </KinetixDirectionProvider>,
    );
    const buttons = dayButtons();
    expect(buttons[0]!.textContent).toMatch(/^[٠-٩]+$/); // Arabic-Indic digits are what is shown
    for (const b of buttons) {
      expect(nameOf(b).startsWith(`${b.textContent}, `)).toBe(true);
      expect(labelInName(b.textContent ?? "", nameOf(b))).toBe(true);
    }
  });

  it("uses a consumer's own day label unchanged", () => {
    render(<Calendar mode="single" defaultMonth={MARCH_2026} labels={{ labelDayButton: (d) => `Day ${d.getDate()}` }} />);
    expect(nameOf(dayButton("1"))).toBe("Day 1");
  });
});

describe("DateRangeInput", () => {
  function Range() {
    const [value, setValue] = React.useState<DateRangeValue>({});
    return <DateRangeInput label="Stay" value={value} onValueChange={setValue} locale="en-GB" min="2026-03-10" max="2026-03-31" />;
  }

  it("inherits the Calendar's day naming, through selection", async () => {
    const user = userEvent.setup();
    render(<Range />);
    await user.click(screen.getByRole("button", { name: "Stay Select dates" }));
    await screen.findByRole("grid");
    for (const b of dayButtons()) expect(labelInName(b.textContent ?? "", nameOf(b)), nameOf(b)).toBe(true);
    expect(dayButton("9")).toBeDisabled();
    await user.click(dayButton("14"));
    expect(nameOf(dayButton("14"))).toBe("14, Saturday, March 14th, 2026, selected");
  });
});

describe("TreeView items", () => {
  function Files() {
    const [selected, setSelected] = React.useState<string | undefined>();
    return (
      <TreeView aria-label="Files" selected={selected} onSelectedChange={setSelected} defaultExpanded={["src"]}>
        <TreeItem value="src" label="src">
          <TreeItem value="components" label="components">
            <TreeItem value="button" label="button.tsx" />
          </TreeItem>
          <TreeItem value="index" label="index.ts" />
        </TreeItem>
        <TreeItem value="readme" label="README.md" />
      </TreeView>
    );
  }
  const item = (name: string) => screen.getByRole("treeitem", { name });

  it("an expanded item shows and is named by its own label only; its children are owned, not contained", () => {
    render(<Files />);
    const src = item("src");
    expect(src).toHaveAttribute("aria-expanded", "true");
    expect(src.textContent).toBe("src");
    expect(labelInName(src.textContent ?? "", "src")).toBe(true);
    const group = document.getElementById(src.getAttribute("aria-owns")!)!;
    expect(group).toHaveAttribute("role", "group");
    expect(within(group).getAllByRole("treeitem").map((t) => t.textContent)).toEqual(["components", "index.ts"]);
    for (const t of screen.getAllByRole("treeitem")) expect(t.querySelector('[role="treeitem"]')).toBeNull();
  });

  it("a collapsed item owns nothing and reports collapsed", () => {
    render(<Files />);
    const components = item("components");
    expect(components).toHaveAttribute("aria-expanded", "false");
    expect(components).not.toHaveAttribute("aria-owns");
  });

  it("keeps the keyboard: arrows, expand into a child, back to the parent from any depth, Home and End", async () => {
    const user = userEvent.setup();
    render(<Files />);
    await user.tab();
    expect(item("src")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("components")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("components")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    expect(item("button.tsx")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("components")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("components")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowLeft}");
    expect(item("src")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("README.md")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("src")).toHaveFocus();
  });

  it("clicking a nested item selects that item, not its parent", async () => {
    const user = userEvent.setup();
    render(<Files />);
    await user.click(item("index.ts"));
    expect(item("index.ts")).toHaveAttribute("aria-selected", "true");
    expect(item("src")).toHaveAttribute("aria-selected", "false");
  });

  it("a disabled item still dims its subtree", () => {
    render(
      <TreeView aria-label="Files" defaultExpanded={["src"]}>
        <TreeItem value="src" label="src" disabled>
          <TreeItem value="index" label="index.ts" />
        </TreeItem>
      </TreeView>,
    );
    const wrapper = item("src").parentElement!;
    expect(wrapper).toHaveAttribute("role", "none");
    expect(wrapper.className).toContain("opacity-disabled");
    expect(wrapper).toContainElement(item("index.ts"));
  });
});
