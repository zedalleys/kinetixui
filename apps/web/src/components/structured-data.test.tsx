import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StructuredData } from "./structured-data";
import { siteConfig } from "@/lib/site";

/** The JSON-LD the home page emits, parsed back out of the rendered <script>. */
function graph() {
  const { container } = render(<StructuredData />);
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script!.innerHTML) as { "@graph": Record<string, unknown>[] };
}

describe("StructuredData", () => {
  it("describes the site and the software with the canonical URL", () => {
    const { "@graph": nodes } = graph();
    const website = nodes.find((n) => n["@type"] === "WebSite")!;
    const software = nodes.find((n) => n["@type"] === "SoftwareApplication")!;
    expect(website.url).toBe(siteConfig.url);
    expect(software.url).toBe(siteConfig.url);
    expect(software.codeRepository).toBe(siteConfig.repo);
    expect(software.license).toContain("MIT");
  });

  it("takes the version from the package, never a hard-coded string", () => {
    const software = graph()["@graph"].find((n) => n["@type"] === "SoftwareApplication")!;
    expect(software.softwareVersion).toBe(siteConfig.version);
    expect(software.softwareVersion).toMatch(/^\d+\.\d+\.\d+/);
    // the literal version must not appear in the component source, or a release would leave it stale
    const source = readSource();
    expect(source).not.toContain(String(software.softwareVersion));
  });

  it("claims nothing it cannot prove", () => {
    const json = JSON.stringify(graph());
    for (const field of ["aggregateRating", "review", "ratingValue", "downloadCount", "price", "offers", "foundingDate", "sameAs"]) {
      expect(json).not.toContain(field);
    }
  });
});

/** Vitest runs with apps/web as the root. */
function readSource() {
  return readFileSync("src/components/structured-data.tsx", "utf8");
}
