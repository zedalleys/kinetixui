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
import { THUMBNAIL_MOCKS } from "./component-thumbnails";
import { catalogueFacets } from "@/lib/business-discovery";
import { CATEGORY_ORDER, PRIMITIVE } from "@/lib/component-registry";

const FACETS = catalogueFacets();

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
    render(<ComponentGallery facets={FACETS} />);
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
    render(<ComponentGallery facets={FACETS} />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    await userEvent.click(within(dialog).getByRole("button", { name: /^SwiftUI/i }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("platform=SwiftUI"), { scroll: false });
  });

  it("says how many filters are active without relying on the badge alone", () => {
    nav.search = "platform=SwiftUI&status=beta";
    render(<ComponentGallery facets={FACETS} />);
    expect(screen.getByRole("button", { name: "Filters, 2 active" })).toBeInTheDocument();
  });

  it("counts only the chip filters, not the search box", () => {
    nav.search = "q=button";
    render(<ComponentGallery facets={FACETS} />);
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });
});

describe("ComponentGallery platform filter covers every implementation platform", () => {
  /** The chips render in the inline facet row (CSS-hidden on phones, present in the DOM) — read that group. */
  const platformGroup = () => screen.getAllByRole("group", { name: "Filter by platform" })[0]!;
  const status = () => screen.getByRole("status").textContent ?? "";

  it("offers React, Angular and the three native platforms, with user-facing labels", () => {
    render(<ComponentGallery facets={FACETS} />);
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
    render(<ComponentGallery facets={FACETS} />);
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
    render(<ComponentGallery facets={FACETS} />);
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
    render(<ComponentGallery facets={FACETS} />);
    const [shown, total] = (status().match(/(\d+) of (\d+)/) ?? []).slice(1).map(Number);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total!);
  });

  it("ignores an unknown platform rather than filtering to nothing", () => {
    nav.search = "platform=WearOS";
    render(<ComponentGallery facets={FACETS} />);
    expect(status()).toMatch(/^\d+ entries$/);
    for (const chip of within(platformGroup()).getAllByRole("button")) {
      expect(chip).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("chooses a web platform through the same URL parameter", async () => {
    render(<ComponentGallery facets={FACETS} />);
    await userEvent.click(within(platformGroup()).getByRole("button", { name: /^React \d+$/ }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("platform=React"), { scroll: false });
  });
});

describe("ComponentGallery thumbnails", () => {
  it("adds no heading of its own: the page's h1 stays the only one", () => {
    const { container } = render(<ComponentGallery facets={FACETS} />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  it("does not describe KinetixUI as an open-source UI kit", () => {
    const { container } = render(<ComponentGallery facets={FACETS} />);
    expect(container.textContent).not.toMatch(/open-source UI kit/i);
  });

  /**
   * The gallery's hybrid thumbnails: a static mock where the live demo would mislead or misbehave, the live demo
   * where it is safe, a text label otherwise. Every drawn thumbnail is decoration inside the card's own link, so it
   * must be out of the accessibility tree, and a live one must also be inert.
   */
  it("keeps every drawn thumbnail aria-hidden, and every live one inert", () => {
    const { container } = render(<ComponentGallery facets={FACETS} />);
    const frames = [...container.querySelectorAll<HTMLElement>("[data-gallery-thumbnail]")];
    const kinds = new Set(frames.map((f) => f.dataset.galleryThumbnail));
    expect(kinds).toContain("mock");
    expect(kinds).toContain("demo");
    for (const frame of frames) {
      if (frame.dataset.galleryThumbnail === "label") continue;
      const body = frame.querySelector<HTMLElement>("[data-gallery-thumbnail-body]");
      const slug = frame.closest("[data-gallery-card]")?.getAttribute("data-gallery-card");
      expect(body, `${slug}: thumbnail body`).not.toBeNull();
      expect(body!.getAttribute("aria-hidden"), `${slug}: aria-hidden`).toBe("true");
      if (frame.dataset.galleryThumbnail === "demo") expect(body!.inert, `${slug}: inert`).toBe(true);
    }
  });

  it("uses the static mock for every slug that has one", () => {
    const { container } = render(<ComponentGallery facets={FACETS} />);
    for (const slug of Object.keys(THUMBNAIL_MOCKS)) {
      const card = container.querySelector(`[data-gallery-card="${slug}"]`);
      if (!card) continue; // a mock may outlive its catalogue entry's slug only if nothing renders it
      expect(card.querySelector("[data-gallery-thumbnail]")?.getAttribute("data-gallery-thumbnail"), slug).toBe("mock");
    }
  });

  /**
   * CAT-BUG-012. The pill under a card's title is one slot that used to carry two dimensions: the
   * implementation technology when there was one, the functional category otherwise. A reader cannot tell
   * `RADIX DIALOG` from a category, and the category filter has no such value. Reverting the fix puts a
   * technology back in this slot and fails here.
   */
  it("shows a functional category — never a technology — in every card's category pill", () => {
    const { container } = render(<ComponentGallery facets={FACETS} />);
    const categories = new Set<string>(CATEGORY_ORDER);
    const pills = [...container.querySelectorAll<HTMLElement>("[data-gallery-card]")].map((card) => [
      card.getAttribute("data-gallery-card")!,
      card.querySelector<HTMLElement>("[data-gallery-category]")?.textContent?.trim(),
    ] as const);
    expect(pills.length).toBeGreaterThan(0);
    for (const [slug, pill] of pills) {
      expect(pill, `${slug}: category pill`).toBeTruthy();
      expect(categories, `${slug}: "${pill}" is not one of the catalogue's categories`).toContain(pill);
    }
    // negative control: the technologies this slot used to print are real, so the assertion above is not
    // vacuous — it is only satisfied because the pill stopped preferring them.
    const technologies = new Set(Object.values(PRIMITIVE));
    expect(technologies.size).toBeGreaterThan(0);
    for (const t of technologies) expect(categories).not.toContain(t);
  });

  /** The technology did not disappear with the pill: it is still how a reader can search for a component. */
  it("still finds a component by the technology behind it", async () => {
    const user = userEvent.setup();
    const { container } = render(<ComponentGallery facets={FACETS} />);
    await user.type(screen.getByRole("searchbox"), "recharts");
    const shown = [...container.querySelectorAll("[data-gallery-card]")].map((el) =>
      el.getAttribute("data-gallery-card"),
    );
    expect(shown).toContain("chart");
  });
});

describe("static thumbnail mocks", () => {
  const FOCUSABLE =
    'a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable=""], [contenteditable="true"]';

  it.each(Object.entries(THUMBNAIL_MOCKS))("%s draws shapes and text only — nothing focusable, no heading", (_slug, Mock) => {
    const { container } = render(<Mock />);
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']")).toHaveLength(0);
    // a mock is a picture: it carries no roles or names of its own for assistive technology to announce
    expect(container.querySelectorAll("[role], [aria-label]")).toHaveLength(0);
  });

  /**
   * CAT-BUG-006 and CAT-BUG-007. These components exist to display content, and their mocks were drawn as
   * grey bars, so the cards read as loading placeholders. Each one now has to render real words — enough of
   * them that a skeleton cannot pass.
   */
  const CONTENT_BEARING: [string, string[]][] = [
    ["footer", ["KinetixUI", "Product", "Components", "Privacy"]],
    ["table", ["Name", "Ava Chen", "Active", "Admin"]],
    ["data-table", ["Name", "Ava Chen", "$1,240", "selected of"]],
  ];
  it.each(CONTENT_BEARING)("%s renders readable content, not a skeleton", (slug, expected) => {
    const Mock = THUMBNAIL_MOCKS[slug];
    const { container } = render(<Mock />);
    const text = container.textContent ?? "";
    for (const word of expected) expect(text, `${slug}: "${word}"`).toContain(word);
    // text nodes, not one long label: a bar-and-block skeleton has no text nodes at all
    const texts = [...container.querySelectorAll("*")]
      .flatMap((el) => [...el.childNodes])
      .filter((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 1);
    expect(texts.length, `${slug}: text nodes`).toBeGreaterThanOrEqual(4);
  });

  /**
   * CAT-BUG-007 and CAT-BUG-008. Components that share a family used to share a mock, parameterised by
   * wording: `dialog`, `modal` and `alert-dialog` were one picture, as were `popover`/`hover-card`,
   * `dropdown-menu`/`context-menu`/`menubar` and `table`/`data-table`. Structure, not copy, is what tells
   * them apart, so this compares the markup with every word removed: two mocks that differ only in their
   * text collapse to the same string here and fail.
   */
  const skeletonOf = (html: string) =>
    html
      .replace(/>[^<]*</g, "><") // drop every text node
      .replace(/\s+/g, " ")
      .trim();
  const FAMILIES: [string, string[]][] = [
    ["dialog family", ["dialog", "modal", "alert-dialog"]],
    ["floating cards", ["popover", "hover-card"]],
    ["menus", ["dropdown-menu", "context-menu", "menubar"]],
    ["tables", ["table", "data-table"]],
    ["side surfaces", ["sheet", "drawer"]],
  ];
  it.each(FAMILIES)("%s are told apart by structure, not by wording", (_family, slugs) => {
    const skeletons = slugs.map((slug) => {
      const Mock = THUMBNAIL_MOCKS[slug];
      const { container } = render(<Mock />);
      return [slug, skeletonOf(container.innerHTML)] as const;
    });
    for (const [slug, skeleton] of skeletons) expect(skeleton.length, `${slug}: markup`).toBeGreaterThan(0);
    expect(new Set(skeletons.map(([, s]) => s)).size, slugs.join(" vs ")).toBe(slugs.length);
    // negative control: the comparison does detect sameness — one mock against itself is one skeleton
    const [first] = skeletons;
    expect(new Set([first[1], first[1]]).size).toBe(1);
  });
});


describe("ComponentGallery business filters", () => {
  const cards = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-gallery-card]")].map((el) => el.getAttribute("data-gallery-card"));

  it("filters by capability from the URL and opens the business group so the active chip is in view", () => {
    nav.search = "capability=transactions";
    const { container } = render(<ComponentGallery facets={FACETS} />);
    const shown = cards(container);
    expect(shown).toContain("price-breakdown");
    expect(shown).not.toContain("accordion");
    expect(screen.getByRole("button", { name: /Business filters/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Remove filter Capability: Transactions & money" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Transactions & money/);
  });

  it("filters by business domain, and combines with the platform filter", () => {
    nav.search = "domain=travel-booking";
    const { container, unmount } = render(<ComponentGallery facets={FACETS} />);
    expect(cards(container)).toEqual(expect.arrayContaining(["pass-card", "price-breakdown"]));
    unmount();

    nav.search = "domain=travel-booking&platform=Angular";
    const combined = render(<ComponentGallery facets={FACETS} />);
    // the Phase 1 foundations are React-only today; Angular is planned
    expect(cards(combined.container)).not.toContain("pass-card");
  });

  it("shows the no-results state, naming the filters, when a combination matches nothing", () => {
    nav.search = "capability=transactions&layer=L1&cat=Overlays";
    render(<ComponentGallery facets={FACETS} />);
    expect(screen.getByText(/No components match .*in Overlays.*for Transactions & money/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("ignores an unknown capability rather than showing an empty grid", () => {
    nav.search = "capability=teleportation";
    const { container } = render(<ComponentGallery facets={FACETS} />);
    expect(cards(container).length).toBeGreaterThan(90);
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
  });

  it("removes one active filter at a time through the URL", async () => {
    nav.search = "capability=transactions&platform=React";
    render(<ComponentGallery facets={FACETS} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Capability: Transactions & money" }));
    expect(nav.replace).toHaveBeenCalledWith("/components?platform=React", { scroll: false });
  });

  it("finds components by the job they do", async () => {
    nav.search = "q=checkout";
    const { container } = render(<ComponentGallery facets={FACETS} />);
    expect(cards(container)).toEqual(expect.arrayContaining(["price-breakdown", "result-state", "reference-code"]));
  });

  it("opens and closes the business groups as a disclosure, and chooses a chip as a toggle (Wave 2b)", async () => {
    const user = userEvent.setup();
    render(<ComponentGallery facets={FACETS} />);
    // The desktop disclosure: the library Collapsible keeps aria-expanded/aria-controls on its trigger.
    const toggle = screen.getAllByRole("button", { name: /^Business filters/ }).at(-1)!;
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Collapsed: nothing exposed and no `aria-controls` pointing at hidden content (Radix sets it only while open).
    expect(toggle).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("group", { name: "Filter by business domain" })).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = () => document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(region()).toBeVisible();
    expect(within(region()).getAllByRole("group").length).toBe(3);

    // A business chip is the library Toggle: one press chooses it (aria-pressed), a second press clears it.
    const chip = within(within(region()).getByRole("group", { name: "Filter by business domain" })).getByRole("button", { name: /^Commerce \d+$/ });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(nav.replace).toHaveBeenLastCalledWith(expect.stringContaining("domain=commerce"), { scroll: false });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Filter by business domain" })).toBeNull();
  });

  it("clears the search from its button and puts focus back in the field", async () => {
    const user = userEvent.setup();
    render(<ComponentGallery facets={FACETS} />);
    const field = screen.getByRole("searchbox");
    await user.type(field, "but");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("puts the business groups in the phone sheet and counts them on the trigger", async () => {
    nav.search = "domain=commerce";
    render(<ComponentGallery facets={FACETS} />);
    await userEvent.click(screen.getByRole("button", { name: "Filters, 1 active" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(within(dialog).getByRole("group", { name: "Filter by capability" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^Commerce \d+$/ })).toHaveAttribute("aria-pressed", "true");
  });
});
 it("renders five decorative canonical platform marks with text labels", () => {
    render(<ComponentGallery facets={FACETS} />);
    const group = screen.getAllByRole("group", { name: "Filter by platform" })[0]!;
    expect(group.querySelectorAll("[data-platform-logo]")).toHaveLength(5);
    for (const svg of group.querySelectorAll("[data-platform-logo]")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("fill", "currentColor");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg.closest("button")).toHaveAccessibleName(/React|Angular|SwiftUI|Jetpack Compose|Flutter/);
    }
  });
