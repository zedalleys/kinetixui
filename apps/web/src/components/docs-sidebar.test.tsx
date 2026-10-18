import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs" }));

import { docsNav } from "@/lib/site";
import { DocsSidebar } from "./docs-sidebar";

/**
 * The docs filter is the library InputGroup (input, search icon add-on, clear InputGroupButton). These pin what the
 * migration from a hand-positioned input and button had to keep: the name, Escape to clear, the clear button that
 * hands focus back to the field, and the status message.
 */
const field = () => screen.getByRole("textbox", { name: "Filter documentation" });
const links = () => within(screen.getByRole("navigation", { name: "Documentation" })).queryAllByRole("link");
const total = docsNav.reduce((n, g) => n + g.items.length, 0);

describe("DocsSidebar filter", () => {
  it("is one named field inside the library InputGroup shell", () => {
    render(<DocsSidebar />);
    expect(field()).toHaveAttribute("data-slot", "input-group-input");
    expect(field().closest("[data-slot=input-group]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Clear filter" })).toBeNull();
    expect(links()).toHaveLength(total);
  });

  it("filters, announces, and clears with the button, returning focus to the field", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar />);
    const target = docsNav[0].items[0].title;
    await user.type(field(), target);
    expect(links().map((l) => l.textContent)).toContain(target);
    expect(links().length).toBeLessThan(total);
    expect(screen.getByRole("status")).toHaveTextContent(/match/);

    const clear = screen.getByRole("button", { name: "Clear filter" });
    expect(clear).toHaveAttribute("type", "button");
    await user.click(clear);
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
    expect(links()).toHaveLength(total);
  });

  it("clears with Escape and reaches the clear button by Tab", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar />);
    await user.type(field(), "zzzz-none");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear filter" })).toHaveFocus();
    await user.click(field());
    await user.keyboard("{Escape}");
    expect(field()).toHaveValue("");
  });

  it("has no axe violations with a query typed", async () => {
    const user = userEvent.setup();
    const { container } = render(<DocsSidebar />);
    await user.type(field(), "a");
    const result = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
