import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
// A plain anchor that keeps the click handler: jsdom cannot perform Next's client navigation, and what is under
// test is the menu closing when a destination is chosen, not the router.
vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...rest }: React.ComponentProps<"a">) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

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
      expect(menuBreakpointClass(path), path).toBe("lg-rem:hidden");
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
    expect(container.firstElementChild).toHaveClass("lg-rem:hidden");
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

/**
 * The menu is the library Sheet opened from the inline start. jsdom has no layout, so this pins the contract —
 * open, focus inside, every way out, focus back on the trigger, the logical side — and the Chromium check
 * `scripts/web-dogfooding-wave2a.mjs` measures where the panel actually lands in LTR and RTL.
 */
describe("MobileNav as a Sheet", () => {
  const trigger = () => screen.getByRole("button", { name: "Menu" });
  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(trigger());
    return screen.findByRole("dialog", { name: "Menu" });
  };

  it("opens from its trigger as a named dialog and moves focus into it", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const menu = await open(user);
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    expect(menu).not.toHaveAttribute("aria-describedby");
  });

  it("keeps Tab inside the panel", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <MobileNav />
      </>,
    );
    const menu = await open(user);
    const stops = within(menu).getAllByRole("link").length + 1;
    for (let i = 0; i < stops + 2; i++) {
      await user.tab();
      expect(menu.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    await open(user);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("closes from its named close button and returns focus", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const menu = await open(user);
    await user.click(within(menu).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("closes on a press outside the panel", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    await open(user);
    const overlay = document.querySelector<HTMLElement>('[data-state="open"][class*="bg-scrim"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes when a destination is chosen, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const menu = await open(user);
    await user.click(within(menu).getAllByRole("link")[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("marks the current page", async () => {
    const user = userEvent.setup();
    nav.pathname = mainNav[0].href;
    render(<MobileNav />);
    const menu = await open(user);
    const current = within(menu).getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    // The same page can be listed twice (a destination and a guide entry); every mark must be on that page.
    expect(current.length).toBeGreaterThan(0);
    expect(new Set(current.map((a) => a.getAttribute("href")))).toEqual(new Set([mainNav[0].href]));
  });

  it("opens from the inline start, so RTL puts it on the right without a physical edge in the code", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const menu = await open(user);
    expect(menu).toHaveClass("start-0");
    expect(menu).not.toHaveClass("left-0");
    expect(menu).not.toHaveClass("right-0");
  });
});
