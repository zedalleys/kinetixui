import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { componentDocs, docsGuideNav, mainNav } from "@/lib/site";
import { MobileNav, menuBreakpointClass } from "./mobile-nav";

beforeEach(() => {
  nav.pathname = "/";
});

/**
 * What jsdom can prove here is which breakpoint class the menu carries and what the menu lists. That the class
 * really leaves 768–1023px with a visible menu on docs pages is measured in Chromium by `check:a11y-site`'s docs
 * navigation contract, at every swept width.
 */
describe("MobileNav breakpoint", () => {
  it("stays available until the docs sidebar takes over, on every docs page", () => {
    for (const path of ["/docs", "/docs/installation", "/docs/components/button"]) {
      expect(menuBreakpointClass(path), path).toBe("lg:hidden");
    }
  });

  it("hands over to the primary nav bar at md everywhere else", () => {
    for (const path of ["/", "/components", "/iot", "/docsearch"]) {
      expect(menuBreakpointClass(path), path).toBe("md:hidden");
    }
  });

  it("renders the class for the current page", () => {
    nav.pathname = "/docs/tokens";
    const { container } = render(<MobileNav />);
    expect(container.firstElementChild).toHaveClass("lg:hidden");
    expect(container.firstElementChild).not.toHaveClass("md:hidden");
  });
});

describe("MobileNav contents", () => {
  it("lists the destinations and the docs guide groups, not every component", async () => {
    render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    const links = within(menu).getAllByRole("link");

    const guide = docsGuideNav.reduce((n, g) => n + g.items.length, 0);
    expect(links).toHaveLength(mainNav.length + guide);
    // One Components destination — the gallery — and no per-component links.
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/components");
    expect(hrefs.filter((h) => h?.startsWith("/docs/components/"))).toEqual([]);
    // The premise: listing the components would have been most of the menu.
    expect(componentDocs.length).toBeGreaterThan(links.length);
  });

  it("keeps every docs guide group, with its heading", async () => {
    render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    for (const g of docsGuideNav) expect(within(menu).getByText(g.title)).toBeInTheDocument();
  });
});
