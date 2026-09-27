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
const pkg = JSON.parse(readFileSync(`${root}/packages/ui-angular/package.json`, "utf8")) as {
  name: string;
  homepage: string;
  peerDependencies?: Record<string, string>;
};

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

  /**
   * The package is published from 0.24.0, so the page now carries a real install command. The
   * guard did not go away with the old truth — it inverted. What it protects is the same thing:
   * the page must agree with the manifest about whether the package is installable, in whichever
   * direction that currently points.
   */
  it("shows an install command that matches the published coordinate", () => {
    const distribution = PLATFORM_DEFINITIONS.Angular.distribution;
    expect(distribution.published, "the manifest should say Angular is published").toBe(true);
    // An exact substring rather than a pattern built from the coordinate: escaping a value into a
    // regex by hand goes wrong quietly, and there is nothing to match loosely here.
    const install = page.split(/\r?\n/).find((line) => line.trim().startsWith("npm i "));
    expect(install, "the page should show an npm install command").toBeTruthy();
    expect(install).toContain(distribution.coordinate);
    expect(page).not.toMatch(/not published/i);
  });

  it("installs the token contract alongside it, because the styles need it", () => {
    const peers = pkg.peerDependencies ?? {};
    expect(Object.keys(peers)).toContain("@kinetixui/tokens");
    expect(page).toContain("@kinetixui/tokens");
    // Both sheets: globals alone leaves the elevation and typography ramps undefined.
    expect(page).toContain('@import "@kinetixui/tokens/css";');
    expect(page).toContain('@import "@kinetixui/tokens/css/extras";');
  });

  it("does not turn availability into maturity", () => {
    // Being on npm says nothing about the API settling. The page may discuss what Stable *would*
    // require — that is the honest content — but it must not claim Angular has got there.
    expect(PLATFORM_DEFINITIONS.Angular.maturity).toBe("preview");
    expect(page).not.toMatch(/Angular[^.]{0,40}\bis (now )?stable\b/i);
    expect(page).not.toMatch(/production[- ]ready/i);
    // Parity is denied rather than merely unmentioned — the word appears on the page inside that
    // denial, so this asserts the denial instead of forbidding the word. Blanket parity claims
    // across the marketing copy are covered by marketing-claims.test.ts.
    expect(page).toMatch(/full parity\s*\n?\s*with the other platforms is not claimed/i);
  });

  it("says the version is independent of the core packages", () => {
    expect(page).toMatch(/versions independently/i);
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
