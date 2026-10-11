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

// Each test renders the whole catalogue; under a parallel full-suite run that can exceed the 5 s default.
vi.setConfig({ testTimeout: 30_000 });

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

describe("ComponentGallery platform filter covers every implementation platform", () => {
  /** The chips render in the inline facet row (CSS-hidden on phones, present in the DOM) — read that group. */
  const platformGroup = () => screen.getAllByRole("group", { name: "Filter by platform" })[0]!;
  const status = () => screen.getByRole("status").textContent ?? "";

  it("offers React, Angular and the three native platforms, with user-facing labels", () => {
    render(<ComponentGallery />);
    const names = within(platformGroup())
      .getAllByRole("button")
      .map((b) => b.textContent ?? "");
    for (const label of ["React", "Angular", "SwiftUI", "Jetpack Compose", "Flutter"]) {
      expect(names.some((n) => n.startsWith(label)), `no ${label} chip`).toBe(true);
    }
    // the manifest key never leaks into the label
    expect(names.some((n) => /^Compose\b/.test(n))).toBe(false);
  });

  it("marks Angular as Preview on its chip", () => {
    render(<ComponentGallery />);
    expect(within(platformGroup()).getByRole("button", { name: /^Angular · Preview \d+$/ })).toBeInTheDocument();
  });

  it.each([
    ["React", "React"],
    ["Angular", "Angular"],
    ["SwiftUI", "SwiftUI"],
    ["Compose", "Jetpack Compose"],
    ["Flutter", "Flutter"],
  ])("filters by ?platform=%s", (key, label) => {
    nav.search = `platform=${key}`;
    render(<ComponentGallery />);
    const chip = within(platformGroup()).getByRole("button", { name: new RegExp(`^${label}`) });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const count = Number((chip.textContent ?? "").match(/(\d+)$/)?.[1]);
    expect(count).toBeGreaterThan(0);
    // "N entries" when the platform carries the whole catalogue (React), "N of M entries" otherwise
    expect(Number(status().match(/^(\d+)/)?.[1])).toBe(count);
    expect(status()).toContain(` · ${label}`);
  });

  it("narrows Angular below the full catalogue, because its catalogue is still rolling out", () => {
    nav.search = "platform=Angular";
    render(<ComponentGallery />);
    const [shown, total] = (status().match(/(\d+) of (\d+)/) ?? []).slice(1).map(Number);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total!);
  });

  it("ignores an unknown platform rather than filtering to nothing", () => {
    nav.search = "platform=WearOS";
    render(<ComponentGallery />);
    expect(status()).toMatch(/^\d+ entries$/);
    for (const chip of within(platformGroup()).getAllByRole("button")) {
      expect(chip).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("chooses a web platform through the same URL parameter", async () => {
    render(<ComponentGallery />);
    await userEvent.click(within(platformGroup()).getByRole("button", { name: /^React \d+$/ }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("platform=React"), { scroll: false });
  });
});

describe("ComponentGallery thumbnails", () => {
  it("adds no heading of its own: the page's h1 stays the only one", () => {
    const { container } = render(<ComponentGallery />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  it("does not describe KinetixUI as an open-source UI kit", () => {
    const { container } = render(<ComponentGallery />);
    expect(container.textContent).not.toMatch(/open-source UI kit/i);
  });
});
