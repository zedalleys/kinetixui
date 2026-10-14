import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/docs/components/price-breakdown" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { BusinessContext } from "./business-context";
import { businessContexts } from "@/lib/business-discovery";

const CONTEXTS = businessContexts();

describe("BusinessContext on a component page", () => {
  it("links capabilities, domains with a page and workflows, and labels planned work in words", () => {
    nav.pathname = "/docs/components/price-breakdown";
    render(<BusinessContext contexts={CONTEXTS} blocks={{}} />);
    expect(screen.getByRole("heading", { level: 2, name: "In applications" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions & money" })).toHaveAttribute("href", "/capabilities#transactions");
    expect(screen.getByRole("link", { name: "Commerce" })).toHaveAttribute("href", "/use-cases/commerce");
    // Finance & banking has no page yet: named, not linked
    expect(screen.getAllByText(/Finance & banking/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Finance & banking" })).toBeNull();
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/use-cases/commerce#checkout");
    // planned capabilities are text, never links, and say so
    expect(screen.queryByRole("link", { name: "Receipt" })).toBeNull();
    expect(screen.getByText(/Planned means not built/)).toBeInTheDocument();
  });

  it("lists the blocks that use a component even when it has no business context", () => {
    nav.pathname = "/docs/components/accordion";
    render(<BusinessContext contexts={CONTEXTS} blocks={{ accordion: [{ slug: "settings-list", title: "Settings list" }] }} />);
    expect(screen.getByRole("link", { name: "Settings list" })).toHaveAttribute("href", "/blocks#settings-list");
    expect(screen.queryByText("Layer")).toBeNull();
  });

  it("renders nothing for a plain primitive no block uses, or off a component page", () => {
    nav.pathname = "/docs/components/accordion";
    const { container, unmount } = render(<BusinessContext contexts={CONTEXTS} blocks={{}} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    nav.pathname = "/docs/tokens";
    const other = render(<BusinessContext contexts={CONTEXTS} blocks={{}} />);
    expect(other.container).toBeEmptyDOMElement();
  });
});
