import fs from "node:fs";
import path from "node:path";

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

/**
 * The register's hrefs are the footer's only real risk: it renders on every route, so a link to a page that
 * does not exist is a 404 on all 740 views at once. This walks the App Router tree rather than trusting a
 * list, so deleting a route fails here instead of in production.
 */
describe("SiteFooter navigation", () => {
  const appDir = path.resolve(__dirname, "../app");

  const routeExists = (href: string) => {
    const segments = href.replace(/^\//, "").split("/").filter(Boolean);
    const dir = path.join(appDir, ...segments);
    return ["page.tsx", "page.mdx", "page.ts", "page.jsx"].some((f) => fs.existsSync(path.join(dir, f)));
  };

  it("points every internal link at a route that exists", () => {
    render(<SiteFooter />);
    const internal = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/"));
    expect(internal.length).toBeGreaterThan(10);
    const missing = internal.filter((href) => !routeExists(href));
    expect(missing).toEqual([]);
  });

  it("names its landmark, so a screen reader can tell it from the header's navigation", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
  });

  /*
    Each group is a named list rather than a heading plus a list. A heading would either pollute the outline
    of every page (`h2`) or skip a level on any page whose deepest heading is `h1` (`h3`), so the name is
    carried by `aria-labelledby` — and that association is what this asserts, because it is invisible and
    would break silently.
  */
  it("gives every group's list its own accessible name", () => {
    render(<SiteFooter />);
    const names = screen.getAllByRole("list").map((ul) => ul.getAttribute("aria-labelledby"));
    for (const title of ["Docs", "Platforms", "Explore", "Project"]) {
      const label = screen.getByText(title);
      expect(label.id).toBeTruthy();
      expect(names).toContain(label.id);
    }
  });

  it("offers a back-to-top that is an ordinary anchor to the existing main landmark", () => {
    render(<SiteFooter />);
    // Not a button with a scroll handler: an anchor works with no JavaScript, and `globals.css` already
    // makes `html` smooth-scroll only when the reader has not asked for reduced motion.
    const top = screen.getByRole("link", { name: "Back to top" });
    expect(top).toHaveAttribute("href", "#main-content");
  });
});

/**
 * The Arabian engraving plates and the paper grain are excluded from the Kinetic Weave refresh by DESIGN.md.
 * This footer was the last surface rendering them, so the guard belongs here: the decoration is now drawn in
 * CSS from the mark's own geometry and fetches nothing.
 */
describe("SiteFooter decoration", () => {
  it("requests no raster decoration at all", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/arabian|paper-grain/i);
  });

  it("keeps its decorative layers out of the accessibility tree", () => {
    const { container } = render(<SiteFooter />);
    for (const cls of ["kx-footer-seam", "kx-footer-weave"]) {
      const el = container.querySelector(`.${cls}`);
      expect(el, cls).not.toBeNull();
      expect(el).toHaveAttribute("aria-hidden");
    }
  });
});
