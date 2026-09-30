import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ search: "" as string, replace: undefined as unknown as ReturnType<typeof vi.fn> }));
nav.replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/components",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { ComponentGallery } from "./component-gallery";

beforeEach(() => {
  // the cards reveal on scroll; jsdom has no IntersectionObserver
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  nav.search = "";
  nav.replace.mockClear();
});

describe("ComponentGallery filters on a phone", () => {
  it("folds the category and platform chips behind one Filters button", async () => {
    render(<ComponentGallery />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    // the inline copy is CSS-hidden on phones; the sheet's copy does not exist until it is opened
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(within(dialog).getByRole("group", { name: "Filter by category" })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Filter by platform" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^Show \d+ components$/ })).toBeInTheDocument();
  });

  it("chooses a filter from the sheet through the same URL parameters as the inline chips", async () => {
    render(<ComponentGallery />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    await userEvent.click(within(dialog).getByRole("button", { name: /^SwiftUI/i }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("platform=SwiftUI"), { scroll: false });
  });

  it("says how many filters are active without relying on the badge alone", () => {
    nav.search = "platform=SwiftUI&status=beta";
    render(<ComponentGallery />);
    expect(screen.getByRole("button", { name: "Filters, 2 active" })).toBeInTheDocument();
  });

  it("counts only the chip filters, not the search box", () => {
    nav.search = "q=button";
    render(<ComponentGallery />);
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });
});
