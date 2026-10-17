import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { demoRegistry } from "@/registry/demos";
import { FabSpeedDial } from "./fab-speed-dial";

/**
 * Component logic only: jsdom applies no stylesheet and does no layout, so nothing here proves the motion, the
 * hidden state of the closed list, or where the discs land. Those were checked in Chromium (see the PR).
 */
describe("FabSpeedDial", () => {
  it("the Code tab shows exactly the example file", () => {
    const file = readFileSync(path.join(process.cwd(), "src/examples/fab-speed-dial.tsx"), "utf8");
    expect(demoRegistry["fab-speed-dial"].source).toBe(file.replace(/\n+$/, ""));
  });

  it("is a disclosure: the Fab names the list it controls and reports whether it is open", async () => {
    const user = userEvent.setup();
    render(<FabSpeedDial />);
    const fab = screen.getByRole("button", { name: "Create" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    const list = document.getElementById(fab.getAttribute("aria-controls")!)!;
    expect(list.className).toContain("invisible");

    await user.click(fab);
    expect(fab).toHaveAttribute("aria-expanded", "true");
    expect(list.className).toContain("visible");
    expect(list.className).not.toContain("invisible");
    // named by their visible labels, in Tab order from the Fab outward
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Upload file",
      "Create folder",
      "Photo template",
      "Take photo or video",
    ]);
  });

  it("Tab reaches the actions in order, and Escape closes and returns focus to the Fab", async () => {
    const user = userEvent.setup();
    render(<FabSpeedDial />);
    const fab = screen.getByRole("button", { name: "Create" });
    await user.click(fab);
    await user.tab();
    expect(screen.getByRole("button", { name: "Upload file" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Create folder" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(fab).toHaveAttribute("aria-expanded", "false");
    expect(fab).toHaveFocus();
  });

  it("choosing an action closes the list, returns focus and announces what was chosen", async () => {
    const user = userEvent.setup();
    render(<FabSpeedDial />);
    const fab = screen.getByRole("button", { name: "Create" });
    await user.click(fab);
    await user.click(screen.getByRole("button", { name: "Create folder" }));
    expect(fab).toHaveAttribute("aria-expanded", "false");
    expect(fab).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Last action: Create folder");
  });

  it("a click outside closes it without moving focus", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FabSpeedDial />
        <button type="button">Elsewhere</button>
      </>,
    );
    const fab = screen.getByRole("button", { name: "Create" });
    await user.click(fab);
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(fab).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("has no axe violations open or closed", async () => {
    const user = userEvent.setup();
    const { container } = render(<FabSpeedDial />);
    expect((await axe.run(container)).violations.map((v) => v.id)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect((await axe.run(container)).violations.map((v) => v.id)).toEqual([]);
  });
});
