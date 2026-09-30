import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

/**
 * The creator credit is a promise made to a person, not a piece of product copy, so it gets a guard rather
 * than trust: a rename, a tidy-up of the bottom bar or a stray second copy in another component would all
 * be silent otherwise.
 */
describe("SiteFooter creator attribution", () => {
  it("credits the creator with a link to their site", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: "Zed Alleys" });
    expect(link).toHaveAttribute("href", "https://zedalleys.com/");
  });

  it("carries no tracking parameters on the personal site link", () => {
    render(<SiteFooter />);
    const href = screen.getByRole("link", { name: "Zed Alleys" }).getAttribute("href") ?? "";
    expect(href).toBe("https://zedalleys.com/");
    expect(href).not.toMatch(/[?#]/);
  });

  it("follows the footer's existing new-tab convention for external links", () => {
    render(<SiteFooter />);
    const personal = screen.getByRole("link", { name: "Zed Alleys" });
    // "Source" is a pre-existing external footer link; the credit must not differ from it.
    const existingExternal = screen.getByRole("link", { name: "Source" });
    expect(personal.getAttribute("target")).toBe(existingExternal.getAttribute("target"));
    expect(personal.getAttribute("rel")).toBe(existingExternal.getAttribute("rel"));
  });

  it("is not distinguished by colour alone", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Zed Alleys" }).className).toMatch(/\bunderline\b/);
  });

  it("appears exactly once, since the footer is shared by every page", () => {
    render(<SiteFooter />);
    expect(screen.getAllByRole("link", { name: "Zed Alleys" })).toHaveLength(1);
    expect(screen.getAllByText(/Created by/)).toHaveLength(1);
  });

  it("leaves the project's own copyright line alone", () => {
    render(<SiteFooter />);
    expect(screen.getByText("© 2026 KinetixUI — beta")).toBeInTheDocument();
  });
});
