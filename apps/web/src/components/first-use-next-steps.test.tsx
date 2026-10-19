import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FirstUseNextSteps } from "./first-use-next-steps";
import { PlatformSetupLink } from "./platform-setup-link";
import { PLATFORMS } from "@/lib/platform-parity";
import { PLATFORM_STORAGE_KEY } from "@/lib/platform-preference";
import { SETUP_HREF, SETUP_SECTION_HREF } from "@/lib/platform-tabs";
import { PlatformVerification } from "./platform-verification";
import { WorkflowReadiness } from "./workflow-readiness";
import { WORKFLOWS } from "@/lib/business-discovery";
import { workflowReadiness } from "@/lib/workflow-readiness";
import { platformsFor } from "@/lib/platform-parity";
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
    ["swiftui", "SwiftUI setup", "/docs/swiftui#setup"],
    ["compose", "Jetpack Compose setup", "/docs/compose#setup"],
    ["angular", "Angular setup · preview", "/docs/angular#install"],
  ])("follows the remembered platform %s", (id, name, href) => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, id);
    render(<PlatformSetupLink source="use_case_page" />);
    const a = screen.getByRole("link", { name });
    expect(a).toHaveAttribute("href", href);
    // the target is unchanged: following a setup link is neither QE nor AI (analytics.md §3/§4)
    expect(a).toHaveAttribute("data-analytics-cta", "installation");
  });
});

describe("setup links land on the setup section (BD-W5 F-05)", () => {
  it.each(PLATFORMS)("%s: the section is a heading on that platform's own setup page", (p) => {
    const [page, hash] = SETUP_SECTION_HREF[p].split("#");
    expect(page).toBe(SETUP_HREF[p]);
    if (p === "React") expect(hash).toBeUndefined();
    else expect(headingIds(page!), `#${hash} is not a heading on ${page}`).toContain(hash);
  });
});

describe("verification details lead to setup, and mark their disclosure for inspection (BD-W5 F-09, F-13)", () => {
  const slug = "button";

  it("each platform the component ships on has a setup link to its own section, with Angular still marked preview", () => {
    const { container } = render(<PlatformVerification slug={slug} />);
    const rows = [...container.querySelectorAll("[data-verification-platform]")];
    expect(rows.map((r) => r.getAttribute("data-verification-platform"))).toEqual(platformsFor(slug));
    for (const row of rows) {
      const p = row.getAttribute("data-verification-platform") as (typeof PLATFORMS)[number];
      const link = row.querySelector("a")!;
      expect(link).toHaveAttribute("href", SETUP_SECTION_HREF[p]);
      expect(link.textContent).toMatch(p === "Angular" ? /setup · preview$/ : /setup$/);
    }
  });

  it("marks only the summary and the methodology link, with the component", () => {
    const { container } = render(<PlatformVerification slug={slug} />);
    const marked = [...container.querySelectorAll("[data-analytics-inspect]")];
    expect(marked.map((el) => [el.tagName, el.getAttribute("data-analytics-inspect"), el.getAttribute("data-analytics-component")])).toEqual([
      ["SUMMARY", "verification_details", slug],
      ["A", "evidence_link", slug],
    ]);
  });

  it("marks each workflow's evidence disclosure, without a component", () => {
    const workflow = WORKFLOWS.find((w) => workflowReadiness(w)[0]!.total > 0)!;
    const { container } = render(<WorkflowReadiness workflow={workflow} />);
    const summary = container.querySelector("summary");
    expect(summary).toHaveAttribute("data-analytics-inspect", "workflow_evidence");
    expect(summary).toHaveAttribute("data-analytics-source", "use_case_page");
    expect(summary).not.toHaveAttribute("data-analytics-component");
  });
});
