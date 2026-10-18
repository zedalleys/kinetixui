import { describe, expect, it } from "vitest";
import { ROUTE_SEO, routeMetadata, type SeoRoute } from "./route-seo";
import { publicRoutes } from "./seo";
import { siteConfig } from "./site";

const entries = Object.entries(ROUTE_SEO) as [SeoRoute, (typeof ROUTE_SEO)[SeoRoute]][];
const fullTitle = (route: SeoRoute) => {
  const t = routeMetadata(route).title;
  return typeof t === "string" ? `${t} — ${siteConfig.name}` : (t as { absolute: string }).absolute;
};

describe("route search metadata", () => {
  it("covers only real, public routes", () => {
    const routes = new Set(publicRoutes());
    for (const [route] of entries) expect(routes.has(route), route).toBe(true);
  });

  it("gives every page one distinct title and one distinct description", () => {
    const titles = entries.map(([r]) => fullTitle(r));
    const descriptions = entries.map(([, v]) => v.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("keeps titles readable in a results page and descriptions substantive", () => {
    for (const [route, v] of entries) {
      // ~75 characters is past what a results page shows, but the intent words are at the front; more than
      // that is a sentence, not a title
      expect(fullTitle(route).length, route).toBeLessThanOrEqual(80);
      expect(v.description.length, route).toBeGreaterThanOrEqual(70);
    }
  });

  it("makes none of the claims CLAIMS.md forbids", () => {
    const FORBIDDEN = /production[- ]ready|fully accessible|wcag[- ]compliant|enterprise[- ]ready|\bbest\b|#1|identical across|complete parity|one source for all components/i;
    for (const [route, v] of entries) {
      expect(`${v.title} ${v.description}`, route).not.toMatch(FORBIDDEN);
    }
  });

  it("leads the homepage with the category, and keeps the hero line for share cards", () => {
    const m = routeMetadata("/");
    expect((m.title as { absolute: string }).absolute).toMatch(/Cross-platform design system infrastructure/);
    expect((m.openGraph as { title: string }).title).toContain(siteConfig.tagline);
  });
});
