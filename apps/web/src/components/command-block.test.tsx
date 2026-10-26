import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandBlock } from "./command-block";
import { PM_QUERY_PARAM, PM_STORAGE_KEY, resetPackageManagerPreferenceForTests } from "@/lib/pm-preference";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/installation" }));

const MANAGERS = ["npm", "pnpm", "Yarn", "Bun"];

beforeEach(() => {
  resetPackageManagerPreferenceForTests();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/docs/installation");
});

afterEach(() => {
  resetPackageManagerPreferenceForTests();
  document.documentElement.removeAttribute("dir");
});

describe("the four managers", () => {
  it("offers exactly npm, pnpm, Yarn and Bun, as a named tab list", () => {
    render(<CommandBlock op="install-react" />);
    const list = screen.getByRole("tablist", { name: "Package manager" });
    expect(within(list).getAllByRole("tab").map((t) => t.textContent)).toEqual(MANAGERS);
  });

  it("opens on npm and shows npm's command", () => {
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tab", { name: "npm", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("npm install @kinetixui/ui @kinetixui/tokens");
  });

  it("changes the visible command when a manager is chosen", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    await user.click(screen.getByRole("tab", { name: "pnpm" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm add @kinetixui/ui @kinetixui/tokens");
    expect(screen.getByRole("tabpanel")).not.toHaveTextContent("npm install");
  });

  it("shows each manager's own execute spelling for a CLI operation", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="cli-add" components={["button"]} />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("npx @kinetixui/cli add button");
    await user.click(screen.getByRole("tab", { name: "Bun" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("bunx @kinetixui/cli add button");
  });
});

describe("copy", () => {
  it("copies the visible command only, and reports it as a CLI copy", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="cli-add" components={["button"]} />);
    await user.click(screen.getByRole("tab", { name: "pnpm" }));
    await user.click(screen.getByRole("button", { name: "Copy the pnpm command" }));
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe("pnpm dlx @kinetixui/cli add button"));
  });

  it("has exactly one copy button in the tree — the shown manager's", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    expect(screen.getAllByRole("button", { name: /^Copy the/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Copy the npm command" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Yarn" }));
    expect(screen.getAllByRole("button", { name: /^Copy the/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Copy the Yarn command" })).toBeInTheDocument();
  });

  it("announces the copy in a live region", async () => {
    const user = userEvent.setup();
    const { container } = render(<CommandBlock op="install-tokens" />);
    await user.click(screen.getByRole("button", { name: "Copy the npm command" }));
    await waitFor(() => expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("Copied"));
  });
});

describe("one preference, shared and remembered", () => {
  it("moves every block on the page together", async () => {
    const user = userEvent.setup();
    render(
      <>
        <CommandBlock op="cli-init" />
        <CommandBlock op="install-react" />
      </>,
    );
    await user.click(screen.getAllByRole("tab", { name: "Bun" })[0]!);
    const panels = screen.getAllByRole("tabpanel");
    expect(panels[0]).toHaveTextContent("bunx @kinetixui/cli init");
    expect(panels[1]).toHaveTextContent("bun add @kinetixui/ui @kinetixui/tokens");
    for (const tab of screen.getAllByRole("tab", { name: "Bun" })) expect(tab).toHaveAttribute("aria-selected", "true");
  });

  it("writes the choice to storage, so the next page opens on it", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    await user.click(screen.getByRole("tab", { name: "Yarn" }));
    expect(window.localStorage.getItem(PM_STORAGE_KEY)).toBe("yarn");
  });

  it("restores a stored choice", () => {
    window.localStorage.setItem(PM_STORAGE_KEY, "pnpm");
    resetPackageManagerPreferenceForTests();
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tab", { name: "pnpm", selected: true })).toBeInTheDocument();
  });

  it("ignores a stored value that is not one of the four", () => {
    window.localStorage.setItem(PM_STORAGE_KEY, "deno");
    resetPackageManagerPreferenceForTests();
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tab", { name: "npm", selected: true })).toBeInTheDocument();
  });

  it("honours ?pm= for the page without saving it", () => {
    window.history.replaceState(null, "", `/docs/installation?${PM_QUERY_PARAM}=bun`);
    resetPackageManagerPreferenceForTests();
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tab", { name: "Bun", selected: true })).toBeInTheDocument();
    expect(window.localStorage.getItem(PM_STORAGE_KEY)).toBeNull();
  });

  it("still works when storage throws", async () => {
    const user = userEvent.setup();
    const getItem = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked site data");
    });
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked site data");
    });
    resetPackageManagerPreferenceForTests();
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tab", { name: "npm", selected: true })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "pnpm" }));
    // the choice holds for the page even though nothing could be remembered
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm add");
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("keyboard", () => {
  it("is one tab stop, and arrow keys move the selection", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "npm" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm add");
    // the three unselected triggers are out of the tab sequence (roving focus)
    expect(screen.getAllByRole("tab").filter((t) => t.getAttribute("tabindex") !== "-1")).toHaveLength(1);
  });

  it("reaches the command region with the keyboard, because it scrolls sideways", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    const region = screen.getByRole("group", { name: /npm command for/ });
    expect(region).toHaveAttribute("tabindex", "0");
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) break;
      order.push(el === region ? "command-region" : (el.getAttribute("role") ?? el.tagName.toLowerCase()));
      if (el === region) break;
    }
    expect(order, order.join(" > ")).toContain("command-region");
  });
});

describe("RTL", () => {
  it("keeps the command itself left-to-right inside an RTL page", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<CommandBlock op="install-react" />);
    expect(screen.getByRole("tabpanel").querySelector("pre")).toHaveAttribute("dir", "ltr");
  });
});

describe("truthfulness", () => {
  it("explains Yarn Classic rather than handing it a command that fails", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="cli-init" />);
    await user.click(screen.getByRole("tab", { name: "Yarn" }));
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("yarn dlx @kinetixui/cli init");
    expect(panel).toHaveTextContent(/Yarn Classic/);
  });

  it("says nothing about dlx on a plain install, where dlx is not involved", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    await user.click(screen.getByRole("tab", { name: "Yarn" }));
    const panel = screen.getByRole("tabpanel");
    expect(panel).not.toHaveTextContent(/dlx/);
    // it does carry the measured peer-dependency note, which is a different fact about the same manager
    expect(panel).toHaveTextContent(/yarn add react-is/);
  });

  it("shows nothing under the command for a manager with no measured limitation", async () => {
    const user = userEvent.setup();
    render(<CommandBlock op="install-react" />);
    for (const name of ["npm", "pnpm", "Bun"]) {
      await user.click(screen.getByRole("tab", { name }));
      const panel = screen.getByRole("tabpanel");
      expect(panel, name).not.toHaveTextContent(/react-is|dlx|angle brackets/);
    }
  });

  it("labels a placeholder as one", () => {
    render(<CommandBlock op="cli-add" />);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("<component…>");
    expect(panel).toHaveTextContent(/Replace the value in angle brackets/);
  });

  it("says nothing about placeholders once the value is supplied", () => {
    render(<CommandBlock op="cli-add" components={["button", "card"]} />);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("npx @kinetixui/cli add button card");
    expect(panel).not.toHaveTextContent(/angle brackets/);
  });

  it("refuses to render a command built from an unsafe component name", () => {
    // the docs build fails rather than a reader copying it
    expect(() => render(<CommandBlock op="cli-add" components={["button; rm -rf /"]} />)).toThrow(
      /invalid component name/i,
    );
  });
});

describe("long commands", () => {
  it("scrolls the command rather than clipping it, and sets no fixed height", () => {
    render(<CommandBlock op="cli-preset-swiftui" preset={`KX1_${"a".repeat(200)}`} />);
    const region = screen.getByRole("group", { name: /npm command for/ });
    expect(region.className).toContain("overflow-x-auto");
    expect(region.className).not.toMatch(/\bh-\d/);
    expect(region.className).not.toContain("overflow-hidden");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(`npx @kinetixui/cli preset swiftui KX1_${"a".repeat(200)}`);
  });
});
