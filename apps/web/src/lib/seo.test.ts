import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { absoluteUrl, publicRoutes } from "./seo";
import { componentDocs, docsNav, mainNav, siteConfig } from "./site";

const HOST = "https://kinetixui.com";
const urls = sitemap().map((e) => e.url);

describe("robots", () => {
  const r = robots();

  it("points crawlers at the canonical sitemap on the canonical host", () => {
    expect(r.sitemap).toBe(`${HOST}/sitemap.xml`);
    expect(r.host).toBe(HOST);
  });

  it("allows the documentation and components to be crawled", () => {
    const rule = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    // the one exclusion is the machine-readable registry, not pages
    expect(rule.disallow).toBe("/r/");
  });
});

describe("sitemap", () => {
  it("is not empty and has no duplicate URLs", () => {
    expect(urls.length).toBeGreaterThan(100);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("uses absolute https URLs on the canonical host, with no trailing slash", () => {
    for (const url of urls) {
      expect(url.startsWith(`${HOST}/`) || url === HOST).toBe(true);
      expect(url).not.toMatch(/\/$|\?|#/);
    }
  });

  it("contains the core pages", () => {
    for (const path of [
      "/",
      "/docs",
      "/docs/installation",
      "/docs/platforms",
      "/docs/foundations",
      "/docs/tokens",
      "/docs/theming",
      "/docs/accessibility",
      "/docs/rtl",
      "/docs/cli",
      "/docs/changelog",
      "/docs/compose",
      "/docs/swiftui",
      "/docs/flutter",
      "/components",
      "/blocks",
      "/charts",
      "/themes",
      "/colors",
      "/infographic",
      "/theme-builder",
    ]) {
      expect(urls).toContain(absoluteUrl(path));
    }
  });

  it("contains every component documentation page", () => {
    expect(componentDocs.length).toBeGreaterThan(90);
    for (const c of componentDocs) expect(urls).toContain(absoluteUrl(c.href));
  });

  it("contains every page in the docs navigation", () => {
    for (const group of docsNav) for (const item of group.items) expect(urls).toContain(absoluteUrl(item.href));
  });

  it("contains every page in the primary navigation", () => {
    for (const item of mainNav) expect(urls).toContain(absoluteUrl(item.href));
  });

  it("excludes anything marked coming-soon", () => {
    const soon = [...mainNav, ...docsNav.flatMap((g) => g.items)].filter((i) => i.soon);
    for (const item of soon) expect(urls).not.toContain(absoluteUrl(item.href));
  });

  it("omits lastModified / changeFrequency / priority rather than inventing them", () => {
    for (const entry of sitemap()) expect(Object.keys(entry)).toEqual(["url"]);
  });
});

describe("absoluteUrl", () => {
  it("maps the home page to the bare host and others to host + path", () => {
    expect(absoluteUrl("/")).toBe(HOST);
    expect(absoluteUrl("/docs/tokens")).toBe(`${HOST}/docs/tokens`);
  });

  it("derives the host from siteConfig, so it cannot drift", () => {
    expect(siteConfig.url).toBe(HOST);
  });
});

describe("publicRoutes", () => {
  it("is deduped and sorted", () => {
    const routes = publicRoutes();
    expect(new Set(routes).size).toBe(routes.length);
    expect([...routes].sort()).toEqual(routes);
  });
});
