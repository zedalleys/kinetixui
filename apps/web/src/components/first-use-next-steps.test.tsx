import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FirstUseNextSteps } from "./first-use-next-steps";
import { PlatformSetupLink } from "./platform-setup-link";
import { PLATFORMS } from "@/lib/platform-parity";
import { PLATFORM_STORAGE_KEY } from "@/lib/platform-preference";
import { SETUP_HREF } from "@/lib/platform-tabs";
import { publicRoutes } from "@/lib/seo";

const ROUTES = new Set(publicRoutes());
const NON_REACT = PLATFORMS.filter((p): p is Exclude<typeof p, "React"> => p !== "React");

/** The ids rehype-slug gives a page's headings (github-slugger: lower-case, punctuation dropped, spaces to hyphens). */
function headingIds(page: string): Set<string> {
  const text = readFileSync(`src/app${page}/page.mdx`, "utf8");
  return new Set(
    [...text.matchAll(/^#{2,4} (.+)$/gm)].map((m) =>
      m[1]!.toLowerCase().replace(/`/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-"),
    ),
  );
}

describe("FirstUseNextSteps", () => {
  it.each(NON_REACT)("%s: every link reaches a real page or a heading on its own setup page, on the same platform", (p) => {
    render(<FirstUseNextSteps platform={p} />);
    const ids = headingIds(SETUP_HREF[p]);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    for (const a of links) {
      const href = a.getAttribute("href")!;
      if (href.startsWith("#")) expect(ids, `${href} is not a heading on ${SETUP_HREF[p]}`).toContain(href.slice(1));
      else expect(ROUTES.has(new URL(href, "https://x").pathname), `${href}: no such page`).toBe(true);
    }
    expect(links.map((a) => a.getAttribute("href"))).toEqual(expect.arrayContaining([`/components?platform=${p}`, `/blocks?platform=${p.toLowerCase()}`]));
  });

  it("catches a gap anchor that names no heading (negative control)", () => {
    expect(headingIds("/docs/swiftui")).toContain("known-gaps");
    expect(headingIds("/docs/swiftui")).not.toContain("what-is-left-by-wave");
  });
});

describe("PlatformSetupLink", () => {
  it("links React installation until the reader chooses, as the server renders it", () => {
    render(<PlatformSetupLink source="use_case_page" />);
    const a = screen.getByRole("link", { name: "Read installation" });
    expect(a).toHaveAttribute("href", "/docs/installation");
    expect(a).toHaveAttribute("data-analytics-cta", "installation");
  });

  it.each([
    ["swiftui", "SwiftUI setup", "/docs/swiftui"],
    ["compose", "Jetpack Compose setup", "/docs/compose"],
    ["angular", "Angular setup · preview", "/docs/angular"],
  ])("follows the remembered platform %s", (id, name, href) => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, id);
    render(<PlatformSetupLink source="use_case_page" />);
    const a = screen.getByRole("link", { name });
    expect(a).toHaveAttribute("href", href);
    // the target is unchanged: following a setup link is neither QE nor AI (analytics.md §3/§4)
    expect(a).toHaveAttribute("data-analytics-cta", "installation");
  });
});
