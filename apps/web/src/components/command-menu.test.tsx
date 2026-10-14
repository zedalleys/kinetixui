import { readFileSync } from "node:fs";
import path from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
const theme = vi.hoisted(() => ({ setTheme: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: theme.setTheme }) }));

import { Dialog, DialogContent, DialogTitle } from "@kinetixui/ui";
import { docsNav, mainNav } from "@/lib/site";
import { CommandMenu } from "./command-menu";

beforeEach(() => {
  nav.push.mockClear();
  theme.setTheme.mockClear();
});

/**
 * The command menu is the library CommandDialog (Radix Dialog + cmdk) with the site's own trigger, shortcut,
 * destinations and footer. These pin what the migration from a hand-composed Radix Dialog + cmdk had to keep.
 * Layout, the portal under RTL and 200% text are measured in Chromium by `scripts/web-dogfooding-wave2a.mjs`.
 */
const trigger = () => screen.getByRole("button", { name: /^Search…/ });
const dialog = () => screen.findByRole("dialog", { name: "Search the docs" });

describe("CommandMenu", () => {
  it("opens from its trigger as a named dialog, with focus in the search field", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    const input = within(d).getByRole("combobox", { name: "Command menu" });
    await waitFor(() => expect(input).toHaveFocus());
    // A command palette has nothing to describe; it must not point aria-describedby at a missing element.
    expect(d).not.toHaveAttribute("aria-describedby");
  });

  it("opens with Ctrl+K and with /", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.keyboard("{Control>}k{/Control}");
    await dialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.keyboard("/");
    const d = await dialog();
    // Once open, focus is in the search field, where the shortcut is ignored like in any field — as it was
    // before the migration — so "/" types and the dialog stays open. Escape is the way out.
    await user.keyboard("/");
    expect(within(d).getByRole("combobox")).toHaveValue("/");
    expect(screen.getByRole("dialog")).toBe(d);
  });

  it("leaves / alone while the reader is typing in a field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Elsewhere" />
        <CommandMenu />
      </>,
    );
    await user.click(screen.getByRole("textbox", { name: "Elsewhere" }));
    await user.keyboard("/");
    expect(screen.getByRole("textbox", { name: "Elsewhere" })).toHaveValue("/");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open over another dialog, so it never stacks a second modal on the mobile menu", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Menu</DialogTitle>
          </DialogContent>
        </Dialog>
        <CommandMenu />
      </>,
    );
    await screen.findByRole("dialog", { name: "Menu" });
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.queryByRole("dialog", { name: "Search the docs" })).toBeNull();
  });

  it("filters the destinations by what is typed", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    const target = docsNav[0].items[0];
    const total = within(d).getAllByRole("option").length;
    await user.keyboard(target.title);
    const options = within(d).getAllByRole("option");
    expect(options.length).toBeLessThan(total);
    expect(options.map((o) => o.textContent)).toContain(target.title);

    await user.clear(within(d).getByRole("combobox"));
    await user.keyboard("zzzz-no-such-page");
    expect(within(d).queryAllByRole("option")).toEqual([]);
    expect(within(d).getByText("No results found.")).toBeInTheDocument();
  });

  it("moves with the arrow keys, runs the selected route on Enter, closes and returns focus", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    const [first, second] = within(d).getAllByRole("option");
    expect(first).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{Enter}");
    expect(nav.push).toHaveBeenCalledOnce();
    expect(nav.push).toHaveBeenCalledWith(mainNav[1].href);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("runs a theme command once and closes", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    await user.click(within(d).getByRole("option", { name: "Dark" }));
    expect(theme.setTheme).toHaveBeenCalledOnce();
    expect(theme.setTheme).toHaveBeenCalledWith("dark");
    expect(nav.push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on Escape and hands focus back to the trigger, also when the shortcut opened it", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    await dialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();

    // Opened from the keyboard with focus elsewhere: focus still lands on the dialog's own trigger on close,
    // which is why the trigger is passed to CommandDialog rather than rendered beside it.
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    await user.keyboard("{Control>}k{/Control}");
    await dialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("keeps Tab inside the open dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <CommandMenu />
      </>,
    );
    await user.click(trigger());
    const d = await dialog();
    for (let i = 0; i < 4; i++) {
      await user.tab();
      expect(d.contains(document.activeElement)).toBe(true);
    }
  });

  it("names the trigger by its visible label at every width", () => {
    render(<CommandMenu />);
    // Below `sm` the label is visually hidden and the shortcut keys are not shown; from `sm` both are visible
    // and both are in the name. Either way the name begins with the label the reader sees.
    expect(trigger()).toHaveTextContent(/^Search…/);
  });

  it("emits no analytics of its own, as before; navigation is measured as a page view", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/command-menu.tsx"), "utf8");
    expect(src).not.toMatch(/analytics|track\(/);
  });
});
