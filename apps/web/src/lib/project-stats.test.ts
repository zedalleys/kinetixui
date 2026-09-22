import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import uiPackage from "../../../../packages/ui/package.json";
import {
  componentPlatformCount,
  documentedExceptionCount,
  fullCoverageCount,
  projectLicense,
  projectVersion,
} from "./project-stats";

/**
 * Every homepage fact must trace back to a repository source with a proof here, not just an assertion that
 * today's number "looks right". See platform-claims.test.ts for the companion scan that fails if a hand-typed
 * count returns to the site's prose.
 */
const components = manifest.components as Record<string, { platforms: string[] }>;
const slugs = Object.keys(components);
/**
 * Read straight from the manifest rather than re-listed here. That keeps the check independent of the app's
 * derived modules — which is the point of this file — without planting a second hard-coded platform array,
 * which is the drift the whole architecture is meant to make impossible.
 */
const defs = manifest.platformDefinitions as Record<string, { catalogComplete: boolean }>;
const PLATFORMS = Object.keys(defs);
const CATALOG_PLATFORMS = PLATFORMS.filter((p) => defs[p]!.catalogComplete);

describe("project-stats: every value traces to a repository source", () => {
  it("componentPlatformCount is every component implementation platform, not a web/token output count", () => {
    // deliberately NOT a literal: the whole point of platformDefinitions is that adding a platform moves this
    expect(componentPlatformCount).toBe(PLATFORMS.length);
    // the token outputs (CSS, TypeScript, Swift, Kotlin, Dart) must never be counted as platforms
    for (const p of PLATFORMS) expect(["CSS", "HTML", "HTML/CSS", "TypeScript", "Tailwind"]).not.toContain(p);
  });

  it("fullCoverageCount is exactly how many manifest components carry every complete-catalogue platform", () => {
    const expected = slugs.filter((s) => CATALOG_PLATFORMS.every((p) => components[s]!.platforms.includes(p))).length;
    expect(fullCoverageCount).toBe(expected);
    expect(fullCoverageCount).toBeGreaterThan(0);
    expect(fullCoverageCount).toBeLessThanOrEqual(slugs.length);
  });

  it("documentedExceptionCount is exactly how many manifest components are missing at least one platform", () => {
    const expected = slugs.filter((s) => !CATALOG_PLATFORMS.every((p) => components[s]!.platforms.includes(p))).length;
    expect(documentedExceptionCount).toBe(expected);
  });

  it("full-platform count and exception count add up to the manifest total", () => {
    expect(fullCoverageCount + documentedExceptionCount).toBe(slugs.length);
  });

  it("projectVersion is read from @kinetixui/ui's own package.json, not typed by hand", () => {
    expect(projectVersion).toBe(uiPackage.version);
    expect(projectVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("projectLicense is read from the package, and is a real SPDX identifier — never a maturity label", () => {
    expect(projectLicense).toBe(uiPackage.license);
    expect(projectLicense).toBe("MIT");
    expect(projectLicense.toLowerCase()).not.toBe("beta");
  });
});
