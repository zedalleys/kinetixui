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
    // Checks KEYS, not raw text. The substring version of this failed the day the description honestly said
    // "Angular in preview" — which contains "review" — so a truthful sentence broke a guardrail aimed at fake
    // rating markup. A claim lives in a field name; prose that happens to share letters with one does not.
    const FORBIDDEN = ["aggregateRating", "review", "reviews", "ratingValue", "downloadCount", "price", "offers", "foundingDate", "sameAs"];
    const keys = new Set<string>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return void node.forEach(walk);
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          keys.add(k);
          walk(v);
        }
      }
    };
    walk(graph());
    for (const field of FORBIDDEN) expect([...keys], `structured data must not claim "${field}"`).not.toContain(field);
  });
});

/** Vitest runs with apps/web as the root. */
function readSource() {
  return readFileSync("src/components/structured-data.tsx", "utf8");
}
