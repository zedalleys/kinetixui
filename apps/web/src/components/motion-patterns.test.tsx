import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MotionSearch, MotionSpeedDial } from "./motion-patterns";

describe("composed motion patterns", () => {
  it("searches, reports an empty result, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<MotionSearch items={["Button", "Switch"]} />);
    const trigger = screen.getByRole("button", { name: "Search components" });
    await user.click(trigger);
    const input = screen.getByLabelText("Filter example components");
    expect(input).toHaveFocus();
    await user.type(input, "nothing");
    expect(screen.getByRole("status")).toHaveTextContent("No matches");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("selects one speed-dial action and returns focus to the FAB", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MotionSpeedDial onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "Create an item" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "New document" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("Document");
    expect(trigger).toHaveFocus();
  });
});
