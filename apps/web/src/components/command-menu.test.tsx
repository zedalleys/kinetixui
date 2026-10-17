import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
const theme = vi.hoisted(() => ({ setTheme: vi.fn() }));
const analyticsTrack = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...real, analytics: { ...real.analytics, track: analyticsTrack } };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: theme.setTheme }) }));

import { Dialog, DialogContent, DialogTitle } from "@kinetixui/ui";
import { searchProjection } from "@/lib/search-projection";
import { docsNav, mainNav } from "@/lib/site";
import { CommandMenu, resetSearchProjectionForTests } from "./command-menu";

beforeEach(() => {
  nav.push.mockClear();
  theme.setTheme.mockClear();
  analyticsTrack.mockClear();
  resetSearchProjectionForTests();
  // no projection unless a test serves one: the menu must work exactly as before without it
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
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

  it("reports only the kind of result chosen, never what was typed", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    await dialog();
    await user.keyboard("dark");
    await user.keyboard("{Enter}");
    expect(analyticsTrack).toHaveBeenCalledOnce();
    expect(analyticsTrack).toHaveBeenCalledWith("search_result_selected", { target: "theme", source: "header", location: "command_menu" });
    expect(JSON.stringify(analyticsTrack.mock.calls)).not.toMatch(/dark/i);
  });
});

// Each test types into a menu of several hundred results; on a shared CI runner that outlasts the 5 s default (the
// highlight test timed out there at 5.1 s while taking 3.4 s locally), so the group gets more room, not fewer checks.
describe("CommandMenu: blocks and use cases (BD-W3b1)", { timeout: 20_000 }, () => {
  const PROJECTION = searchProjection();
  const serve = () => {
    const fetchMock = vi.fn(async () => Response.json(PROJECTION));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const open = async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    await within(d).findByRole("group", { name: "Blocks" });
    return { user, d };
  };
  /** An option's title: the first line of a two-line result, or the whole text of a one-line one. */
  const titles = (d: HTMLElement) =>
    within(d)
      .getAllByRole("option")
      .map((o) => o.querySelector(":scope > span > span:first-child")?.textContent ?? o.textContent);
  const search = async (user: ReturnType<typeof userEvent.setup>, d: HTMLElement, q: string) => {
    await user.clear(within(d).getByRole("combobox"));
    if (q) await user.keyboard(q);
  };

  it("loads the projection once, from the static file, and adds labelled Blocks and Use cases groups", async () => {
    const fetchMock = serve();
    const { d } = await open();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/search-index.json");
    expect(within(d).getByRole("group", { name: "Use cases" })).toBeInTheDocument();
    // the existing groups are all still there, with every one of their items
    expect(within(d).getByRole("group", { name: "Links" })).toBeInTheDocument();
    expect(within(d).getByRole("group", { name: "Theme" })).toBeInTheDocument();
    for (const g of docsNav) expect(within(within(d).getByRole("group", { name: g.title })).getAllByRole("option")).toHaveLength(g.items.length);
  });

  it.each([
    ["slider", "Slider"],
    ["Number Input", "Number Input"],
    ["order summary", "Order summary"],
    ["commerce", "Commerce"],
    ["checkout", "Checkout"],
  ])("puts the exact title first for %j, and Enter would run it", async (q, first) => {
    serve();
    const { user, d } = await open();
    await search(user, d, q);
    expect(titles(d)[0]).toBe(first);
    expect(within(d).getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("answers business queries with real destinations only", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "checkout");
    expect(titles(d)).toEqual(expect.arrayContaining(["Checkout", "Order summary", "Receipt", "Commerce"]));
    await search(user, d, "dashboard");
    expect(titles(d)).toEqual(expect.arrayContaining(["Dashboard tabs"]));
    await search(user, d, "filter");
    expect(titles(d)).toEqual(expect.arrayContaining(["Filter panel", "Table + toolbar"]));
    await search(user, d, "iot");
    // IoT has no use-case page; the module page from the main navigation is the destination
    expect(titles(d)[0]).toBe("IoT");
    expect(titles(d)).not.toContain("IoT & connected operations");
  });

  it("goes to a block's anchor on Enter, closes, and returns focus", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "order summary");
    await user.keyboard("{Enter}");
    expect(nav.push).toHaveBeenCalledOnce();
    expect(nav.push).toHaveBeenCalledWith("/blocks#order-summary");
    expect(analyticsTrack).toHaveBeenCalledWith("search_result_selected", { target: "block", source: "header", location: "command_menu" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("goes to a published use case, and to a component page, with the right result type", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "commerce");
    await user.keyboard("{Enter}");
    expect(nav.push).toHaveBeenLastCalledWith("/use-cases/commerce");
    expect(analyticsTrack).toHaveBeenLastCalledWith("search_result_selected", { target: "use_case", source: "header", location: "command_menu" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // it opens again after a navigation
    await user.click(trigger());
    const d2 = await dialog();
    await user.keyboard("slider");
    await user.click(within(d2).getAllByRole("option")[0]!);
    expect(nav.push).toHaveBeenLastCalledWith("/docs/components/slider");
    expect(analyticsTrack).toHaveBeenLastCalledWith("search_result_selected", { target: "component", source: "header", location: "command_menu" });
  });

  it("finds a component by its verified business context, not only by its name", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "transactions money");
    expect(titles(d)).toContain("Price Breakdown");
    // a boarding pass is the Pass Card component (the shipping BoardingPass row cites it), and a stage of flight booking
    await search(user, d, "boarding pass");
    expect(titles(d)).toEqual(expect.arrayContaining(["Pass Card", "Flight booking"]));
  });

  it("never offers a use-case page that does not exist", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "healthcare");
    expect(within(d).queryAllByRole("option")).toEqual([]);
    expect(within(d).getByText("No results found.")).toBeInTheDocument();
  });

  it("keeps the old abbreviation matches", async () => {
    serve();
    const { user, d } = await open();
    await search(user, d, "btn");
    expect(titles(d)).toContain("Button");
  });

  it("tries again on the next open after an error response", async () => {
    let up = false;
    const fetchMock = vi.fn(async () => (up ? Response.json(PROJECTION) : new Response("", { status: 503 })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    let d = await dialog();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(within(d).queryByRole("group", { name: "Blocks" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    up = true; // the endpoint recovers; the failed response was not cached
    await user.click(trigger());
    d = await dialog();
    expect(await within(d).findByRole("group", { name: "Blocks" })).toBeInTheDocument();
  });

  it("keeps working when the projection cannot be loaded", async () => {
    const user = userEvent.setup();
    render(<CommandMenu />);
    await user.click(trigger());
    const d = await dialog();
    await user.keyboard("order summary");
    expect(within(d).queryByRole("group", { name: "Blocks" })).toBeNull();
    await search(user, d, docsNav[0].items[0].title);
    expect(titles(d)).toContain(docsNav[0].items[0].title);
  });

  it("points the input and the listbox at the highlighted result, after typing and after the arrow keys", async () => {
    serve();
    const { user, d } = await open();
    const input = within(d).getByRole("combobox");
    const listbox = within(d).getByRole("listbox");
    const pointsAtHighlight = () => {
      const selected = d.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]');
      expect(selected).not.toBeNull();
      expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toBe(selected);
      expect(listbox.getAttribute("aria-activedescendant")).toBe(selected!.id);
    };
    for (const q of ["checkout", "slider", "order", "dark"]) {
      await search(user, d, q);
      await waitFor(pointsAtHighlight);
    }
    await user.keyboard("{ArrowDown}");
    await waitFor(pointsAtHighlight);
    await search(user, d, "healthcare");
    await waitFor(() => expect(input).not.toHaveAttribute("aria-activedescendant"));
  });

  it("moves with the arrow keys and closes the same way in a right-to-left document", async () => {
    document.documentElement.dir = "rtl";
    try {
      serve();
      const { user, d } = await open();
      await search(user, d, "order");
      const [first, second] = within(d).getAllByRole("option");
      expect(first).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{ArrowDown}");
      expect(second).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{Enter}");
      expect(nav.push).toHaveBeenCalledOnce();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(trigger()).toHaveFocus();
    } finally {
      document.documentElement.dir = "";
    }
  });
});
