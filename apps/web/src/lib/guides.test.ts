import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOILERPLATE } from "./component-editorial";
import { GUIDES, PILLAR, guideJsonLd, guideMetadata } from "./guides";
import sitemap from "../app/sitemap";

const src = (slug: string) => readFileSync(join(__dirname, "../app/guides", slug, "page.mdx"), "utf8");

describe("guides", () => {
  it("has one pillar and two to four supporting guides", () => {
    expect(GUIDES.filter((g) => g.role === "pillar")).toHaveLength(1);
    const supporting = GUIDES.filter((g) => g.role === "supporting").length;
    expect(supporting).toBeGreaterThanOrEqual(2);
    expect(supporting).toBeLessThanOrEqual(4);
  });

  it("gives every guide a distinct title, description, intent and CTA label", () => {
    for (const key of ["title", "description", "primaryIntent"] as const)
      expect(new Set(GUIDES.map((g) => g[key])).size, key).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((g) => g.cta.label)).size).toBe(GUIDES.length);
  });

  it("keeps snippets plain, specific and free of unsupported claims", () => {
    for (const g of GUIDES) {
      expect(g.description, g.slug).not.toMatch(/[`<>*_[\]]/);
      expect(g.description.length, g.slug).toBeGreaterThanOrEqual(110);
      expect(g.description.length, g.slug).toBeLessThanOrEqual(200);
      for (const re of BOILERPLATE) expect(re.test(`${g.title} ${g.description}`), `${g.slug} ${re}`).toBe(false);
    }
  });

  it("only dates a published guide, and only publishes a dated one", () => {
    for (const g of GUIDES) {
      if (g.status === "draft") {
        expect(g.datePublished, g.slug).toBeUndefined();
        expect(g.dateModified, g.slug).toBeUndefined();
        expect(guideJsonLd(g.slug)).toBeNull();
        expect(guideMetadata(g.slug).robots).toEqual({ index: false, follow: false });
      } else {
        expect(g.datePublished, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(guideJsonLd(g.slug)?.datePublished).toBe(g.datePublished);
      }
    }
  });

  it("lists only published guides in the sitemap", () => {
    const urls = sitemap().map((e) => e.url);
    for (const g of GUIDES) expect(urls.some((u) => u.endsWith(`/guides/${g.slug}`)), g.slug).toBe(g.status === "published");
  });

  it("renders each guide with its registry title, status line, one CTA and the footer", () => {
    for (const g of GUIDES) {
      const s = src(g.slug);
      expect(s, g.slug).toContain(`guideMetadata("${g.slug}")`);
      expect(s, g.slug).toContain(`\n# ${g.title}\n`);
      expect(s.match(/<GuideCta /g)?.length, g.slug).toBe(1);
      expect(s, g.slug).toContain(`<GuideStatus slug="${g.slug}" />`);
      expect(s, g.slug).toContain(`<GuideFooter slug="${g.slug}" />`);
      if (g.role === "supporting") expect(s, g.slug).toContain(`](/guides/${PILLAR.slug})`);
    }
  });
});
