import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ search: "" as string, replace: undefined as unknown as ReturnType<typeof vi.fn> }));
nav.replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/blocks",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { BlocksGallery, BlocksGalleryFallback } from "./blocks-gallery";
import { blockComponents } from "@/lib/block-components";
import { blockFacets } from "@/lib/business-discovery";
import { blockTotal } from "@/lib/blocks";

const DATA = { components: blockComponents(), facets: blockFacets() };
const status = () => document.querySelector("[data-blocks-status]")!.textContent ?? "";
/** The mocked router reads `nav.search`; the page compares against the real location, so keep both in step. */
const go = (search: string) => {
  nav.search = search;
  window.history.replaceState(null, "", search ? `/blocks?${search}` : "/blocks");
};
const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);

beforeEach(() => {
  go("");
  nav.replace.mockClear();
});
afterEach(() => vi.useRealTimers());
vi.setConfig({ testTimeout: 30_000 });

describe("/blocks discovery filters", () => {
  it("names every control with a visible label inside one search landmark", () => {
    render(<BlocksGallery {...DATA} />);
    const region = screen.getByRole("search", { name: "Filter blocks" });
    for (const name of ["Search", "Category", "Capability", "Business domain", "Workflow", "Platform"])
      expect(within(region).getByLabelText(name)).toBeInTheDocument();
    expect(status()).toBe(`${blockTotal} blocks`);
    expect(titles()).toHaveLength(blockTotal);
  });

  it("restores the state from a direct link and shows only the matching blocks", () => {
    go("cat=Commerce&domain=finance");
    render(<BlocksGallery {...DATA} />);
    expect(screen.getByLabelText("Category")).toHaveValue("Commerce");
    expect(screen.getByLabelText("Business domain")).toHaveValue("finance");
    expect(titles()).toEqual(["Receipt"]);
    expect(status()).toBe(`1 of ${blockTotal} blocks · Category: Commerce · Business domain: Finance & banking`);
  });

  it("ignores unknown parameters and values instead of failing or emptying the page", () => {
    go("capability=teleportation&platform=WearOS&utm_source=x&cat=Commerce");
    render(<BlocksGallery {...DATA} />);
    expect(screen.getByLabelText("Capability")).toHaveValue("");
    expect(screen.getByLabelText("Platform")).toHaveValue("");
    expect(titles()).toEqual(["Order summary", "Receipt"]);
  });

  it("writes a change with replace (no history entry), keeps unrelated filters and drops invalid ones", async () => {
    go("cat=Commerce&utm_source=x&capability=teleportation");
    render(<BlocksGallery {...DATA} />);
    await userEvent.selectOptions(screen.getByLabelText("Platform"), "SwiftUI");
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/blocks?cat=Commerce&platform=SwiftUI&utm_source=x", { scroll: false });
  });

  it("debounces the search into the URL: one write for a typed word, not one per key", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BlocksGallery {...DATA} />);
    await user.type(screen.getByLabelText("Search"), "checkout");
    expect(nav.replace).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(250));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/blocks?q=checkout", { scroll: false });
  });

  it("keeps a filter chosen while the search is still waiting to be written", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = render(<BlocksGallery {...DATA} />);
    await user.type(screen.getByLabelText("Search"), "order");
    await user.selectOptions(screen.getByLabelText("Category"), "Commerce");
    expect(nav.replace).toHaveBeenLastCalledWith("/blocks?q=order&cat=Commerce", { scroll: false });
    // the router applies the write; the pending search timer must not put the old facets back
    go("q=order&cat=Commerce");
    rerender(<BlocksGallery {...DATA} />);
    const calls = nav.replace.mock.calls.length;
    await act(async () => vi.advanceTimersByTime(250));
    expect(nav.replace.mock.calls.slice(calls)).toEqual([]);
    expect(screen.getByLabelText("Category")).toHaveValue("Commerce");
  });

  it("cancels the waiting search write when a filter is chosen before the router has re-rendered", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BlocksGallery {...DATA} />);
    await user.type(screen.getByLabelText("Search"), "order");
    await user.selectOptions(screen.getByLabelText("Category"), "Commerce");
    // the URL has not caught up yet (no re-render with the new params): the timer must not fire a stale write
    await act(async () => vi.advanceTimersByTime(250));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/blocks?q=order&cat=Commerce", { scroll: false });
  });

  it("reads Back/Forward from the URL, so a changed query string re-renders without stale results", () => {
    go("workflow=checkout");
    const { rerender } = render(<BlocksGallery {...DATA} />);
    expect(titles()).toEqual(["Order summary", "Receipt"]);
    go("cat=Data");
    rerender(<BlocksGallery {...DATA} />);
    expect(screen.getByLabelText("Workflow")).toHaveValue("");
    expect(titles()).toEqual(expect.arrayContaining(["Stat cards", "Table + toolbar"]));
    expect(titles()).not.toContain("Receipt");
    go("");
    rerender(<BlocksGallery {...DATA} />);
    expect(titles()).toHaveLength(blockTotal);
  });

  it("explains an empty result and resets every filter from it", async () => {
    go("cat=Marketing&workflow=checkout&q=zzz");
    render(<BlocksGallery {...DATA} />);
    expect(titles()).toEqual([]);
    expect(screen.getByText("No blocks match all of these filters.")).toBeInTheDocument();
    const clears = screen.getAllByRole("button", { name: "Clear all filters" });
    await userEvent.click(clears[clears.length - 1]!);
    expect(nav.replace).toHaveBeenLastCalledWith("/blocks", { scroll: false });
  });

  it("counts each option against the other filters and disables the ones that would empty the page", () => {
    go("cat=Commerce");
    render(<BlocksGallery {...DATA} />);
    const capability = screen.getByLabelText("Capability");
    const option = (label: RegExp) => within(capability).getByRole("option", { name: label }) as HTMLOptionElement;
    expect(option(/^Transactions & money \(2\)$/).disabled).toBe(false);
    expect(option(/^Identity & security \(0\)$/).disabled).toBe(true);
  });

  it("never offers a platform a block lacks: every block is listed under each platform it really has", () => {
    go("platform=Angular");
    render(<BlocksGallery {...DATA} />);
    // today all published blocks implement all five platforms (check:block-source); the count reflects that, not a guess
    expect(within(screen.getByLabelText("Platform")).getByRole("option", { name: /^Angular · Preview \(\d+\)$/ })).toBeInTheDocument();
    expect(titles()).toHaveLength(blockTotal);
  });

  it("shows a block's business context: status when not stable, capability, and its workflow linked to the use-case page", () => {
    go("q=receipt");
    render(<BlocksGallery {...DATA} />);
    const receipt = screen.getByRole("heading", { level: 2, name: "Receipt" }).closest("section")!;
    expect(within(receipt).getByText("beta")).toBeInTheDocument();
    expect(within(receipt).getByText(/Transactions & money/)).toBeInTheDocument();
    expect(within(receipt).getByRole("link", { name: "Part of the checkout workflow" })).toHaveAttribute("href", "/use-cases/commerce#checkout");
  });

  it("renders every block with no filters as the server fallback, so the HTML is never a loading line", () => {
    go("cat=Commerce");
    render(<BlocksGalleryFallback {...DATA} />);
    expect(titles()).toHaveLength(blockTotal);
  });
});
