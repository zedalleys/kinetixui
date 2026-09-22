// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLATFORM_DEFINITIONS, platformsFor } from "./platform-parity";
import { allDocsLinks, docsNav } from "./site";

/**
 * /docs/angular exists to tell the truth about a preview platform, so these tests pin every fact on it to the
 * source that owns it. The page states no count, maturity or component list of its own — it renders them from
 * components.manifest.json — and its one code example must match a template the Angular package compiles.
 */
const root = "../..";
const page = readFileSync("src/app/docs/angular/page.mdx", "utf8");
const publicApi = readFileSync(`${root}/packages/ui-angular/src/public-api.ts`, "utf8");
const spec = readFileSync(`${root}/packages/ui-angular/src/lib/kinetix-angular.spec.ts`, "utf8");
const pkg = JSON.parse(readFileSync(`${root}/packages/ui-angular/package.json`, "utf8")) as { name: string; homepage: string };

describe("/docs/angular", () => {
  it("is the route the package's homepage field points at", () => {
    expect(pkg.homepage).toBe("https://kinetixui.com/docs/angular");
    expect(pkg.name).toBe("@kinetixui/angular");
  });

  it("derives maturity, count and component list instead of typing them", () => {
    expect(page).toContain('<PlatformMaturityInline platform="Angular" />');
    expect(page).toContain('<PlatformCountInline platform="Angular" />');
    expect(page).toContain('<PlatformComponentList platform="Angular" />');
    // no hand-typed maturity word or count in the prose
    expect(page).not.toMatch(/\*\*(Preview|Beta|Stable)\*\*/);
    expect(page).not.toMatch(/\b\d+ (Angular )?components\b/);
  });

  it("imports only names the package really exports", () => {
    const imported = [...page.matchAll(/import \{([^}]+)\} from '@kinetixui\/angular'/g)].flatMap((m) =>
      m[1]!.split(",").map((s) => s.trim()).filter(Boolean),
    );
    expect(imported.length).toBeGreaterThan(0);
    for (const name of imported) expect(publicApi).toMatch(new RegExp(`\\b${name}\\b`));
  });

  it("shows exactly the example template the Angular test suite compiles", () => {
    const fromSpec = spec.match(/DOCS_EXAMPLE_TEMPLATE = `([\s\S]*?)`;/)?.[1];
    expect(fromSpec).toBeTruthy();
    expect(page).toContain(fromSpec!.trim());
  });

  it("shows no install command while the package is unpublished", () => {
    // When @kinetixui/angular is published, change this test deliberately alongside the page — not before.
    expect(page).not.toMatch(/(npm (i|install)|pnpm add|yarn add|bun add)\s+@kinetixui\/angular/);
    expect(page).toMatch(/not published/i);
  });

  it("does not ship an overlay component the page says is deferred", () => {
    for (const slug of ["dialog", "select", "popover", "tooltip", "dropdown-menu", "sheet"]) {
      expect(platformsFor(slug)).not.toContain("Angular");
    }
  });
});

describe("docs navigation", () => {
  it("lists Angular, with its maturity from platformDefinitions as the badge", () => {
    const item = allDocsLinks.find((i) => i.href === "/docs/angular");
    expect(item).toBeDefined();
    const m = PLATFORM_DEFINITIONS.Angular.maturity;
    expect(item!.badge).toBe(m === "stable" ? undefined : m);
  });

  it("does not file a web platform under a 'Native' heading", () => {
    const group = docsNav.find((g) => g.items.some((i) => i.href === "/docs/angular"))!;
    expect(group.title.toLowerCase()).not.toContain("native");
  });
});
