import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppChrome, APP_SHELL_ROUTES, isAppShellRoute } from "./app-chrome";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("application shell boundary", () => {
  it("treats the editor as an application route and the Create landing page as a marketing page", () => {
    expect(APP_SHELL_ROUTES).toContain("/create/studio");
    expect(isAppShellRoute("/create/studio")).toBe(true);
    expect(isAppShellRoute("/create/studio/anything")).toBe(true);
    expect(isAppShellRoute("/create")).toBe(false);
    expect(isAppShellRoute("/")).toBe(false);
    expect(isAppShellRoute("/docs/components/button")).toBe(false);
  });

  it("renders the site header and footer on a marketing route", () => {
    pathname.current = "/create";
    render(
      <AppChrome header={<header>Site header</header>} footer={<footer>Site footer</footer>}>
        <p>Page</p>
      </AppChrome>,
    );
    expect(screen.getByText("Site header")).toBeTruthy();
    expect(screen.getByText("Site footer")).toBeTruthy();
    expect(document.querySelector("#main-content")).toBeTruthy();
  });

  it("renders neither on the editor route, and keeps the skip-link target", () => {
    pathname.current = "/create/studio";
    render(
      <AppChrome header={<header>Site header</header>} footer={<footer>Site footer</footer>}>
        <p>Editor</p>
      </AppChrome>,
    );
    expect(screen.queryByText("Site header")).toBeNull();
    expect(screen.queryByText("Site footer")).toBeNull();
    expect(document.querySelectorAll("footer").length).toBe(0);
    expect(screen.getByText("Editor")).toBeTruthy();
    // The skip link in the root layout points at this id; losing it would strand keyboard users
    // on the editor route.
    expect(document.querySelector("main#main-content")).toBeTruthy();
    expect(document.querySelector("[data-app-shell='editor']")).toBeTruthy();
  });

  it("keeps the root layout routing its chrome through this boundary", () => {
    // A source assertion, and labelled as one: it cannot prove rendered behaviour (the two tests
    // above do that), but it does catch a later edit that renders SiteHeader/SiteFooter directly
    // in the root layout again, which would put them back on the editor route.
    const layout = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<AppChrome\s+header=\{<SiteHeader \/>\}\s+footer=\{<SiteFooter \/>\}>/);
    expect(layout.match(/<SiteHeader \/>/g)).toHaveLength(1);
    expect(layout.match(/<SiteFooter \/>/g)).toHaveLength(1);
  });
});
