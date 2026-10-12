import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { docsBreadcrumbTrail } from "./docs-trail";
import { PLATFORMS, PLATFORM_DEFINITIONS, platformsFor } from "./platform-parity";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  componentDescription,
  componentName,
  componentTitle,
  pageMetadata,
  publicRoutes,
} from "./seo";
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
      "/docs/angular",
      "/docs/compose",
      "/docs/swiftui",
      "/docs/flutter",
      "/components",
      "/blocks",
      "/charts",
      "/themes",
      "/create",
      "/docs/colors",
      "/infographic",
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

describe("pageMetadata", () => {
  const m = pageMetadata({ path: "/docs/tokens", title: "Tokens", description: "d" });

  it("gives a page a canonical, og:url and twitter card that agree, on the production origin", () => {
    expect(m.alternates?.canonical).toBe(`${HOST}/docs/tokens`);
    const og = m.openGraph as { url: string; siteName: string; images: { url: string }[]; title: string };
    expect(og.url).toBe(`${HOST}/docs/tokens`);
    expect(og.siteName).toBe("KinetixUI");
    // the regression: a page that set openGraph lost the file-based share image
    expect(og.images[0]!.url).toBe("/opengraph-image");
    expect(og.title).toBe("Tokens — KinetixUI");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
  });

  it("never puts query state in a canonical", () => {
    expect(() => new URL(String(m.alternates?.canonical))).not.toThrow();
    expect(String(m.alternates?.canonical)).not.toMatch(/[?#]/);
  });
});

describe("component metadata", () => {
  it("names the component and exactly the platforms the manifest lists", () => {
    for (const c of componentDocs) {
      const slug = c.href.split("/").pop()!;
      const title = componentTitle(slug);
      expect(title.startsWith(`${c.title} component for `)).toBe(true);
      for (const p of PLATFORMS) {
        const short = PLATFORM_DEFINITIONS[p].label.replace(/^Jetpack /, "");
        expect(title.includes(short), `${slug}: ${p}`).toBe(platformsFor(slug).includes(p));
      }
    }
  });

  it("keeps MDX markup out of the plain-text snippet", () => {
    const d = componentDescription("native-select", "A wrapper around the native `<select>` element, with `size=\"sm\"`.");
    expect(d).toMatch(/^KinetixUI Native Select: A wrapper around the native select element, with size="sm"\./);
    expect(d).not.toMatch(/[`<>]/);
  });

  it("says which platforms install and which are source, from the manifest", () => {
    const d = componentDescription("button", "Trigger an action.");
    expect(d).toMatch(/^KinetixUI Button: Trigger an action\. Implemented for /);
    for (const p of platformsFor("button")) {
      const def = PLATFORM_DEFINITIONS[p];
      expect(d).toContain(def.label);
    }
    // a source-only platform is never presented as an install
    expect(d).toMatch(/as source you build/);
    expect(d).not.toMatch(/npm i|pod |implementation\(|pub add/);
  });

  it("gives every component page a distinct title", () => {
    const titles = componentDocs.map((c) => componentTitle(c.href.split("/").pop()!));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("throws for a slug that is not a component page, rather than inventing a name", () => {
    expect(() => componentName("not-a-component")).toThrow();
  });
});

describe("docs breadcrumb trail and its JSON-LD", () => {
  it("is Docs → Components → page for a component, without the unlinked group", () => {
    const { crumbs, group } = docsBreadcrumbTrail("/docs/components/dialog");
    expect(crumbs).toEqual([{ name: "Docs", href: "/docs" }, { name: "Components", href: "/components" }, { name: "Dialog" }]);
    expect(group).toBe("Overlays");
  });

  it("describes exactly the crumbs a reader sees, with no URL on the current page", () => {
    const { crumbs } = docsBreadcrumbTrail("/docs/angular");
    const ld = breadcrumbJsonLd(crumbs);
    expect(ld.itemListElement.map((e) => e.name)).toEqual(crumbs.map((c) => c.name));
    expect(ld.itemListElement.at(-1)).not.toHaveProperty("item");
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, item: `${HOST}/docs` });
  });
});
