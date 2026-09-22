import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import uiPackage from "../../../../packages/ui/package.json";
import {
  componentPlatformCount,
  documentedExceptionCount,
  fullFourPlatformCount,
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
const PLATFORMS = ["React", "SwiftUI", "Compose", "Flutter"];

describe("project-stats: every value traces to a repository source", () => {
  it("componentPlatformCount is exactly the four component implementation platforms, not a web/token output count", () => {
    expect(componentPlatformCount).toBe(4);
    expect(componentPlatformCount).toBe(PLATFORMS.length);
  });

  it("fullFourPlatformCount is exactly how many manifest components carry all four platforms", () => {
    const expected = slugs.filter((s) => PLATFORMS.every((p) => components[s]!.platforms.includes(p))).length;
    expect(fullFourPlatformCount).toBe(expected);
    expect(fullFourPlatformCount).toBeGreaterThan(0);
    expect(fullFourPlatformCount).toBeLessThanOrEqual(slugs.length);
  });

  it("documentedExceptionCount is exactly how many manifest components are missing at least one platform", () => {
    const expected = slugs.filter((s) => !PLATFORMS.every((p) => components[s]!.platforms.includes(p))).length;
    expect(documentedExceptionCount).toBe(expected);
  });

  it("full-platform count and exception count add up to the manifest total", () => {
    expect(fullFourPlatformCount + documentedExceptionCount).toBe(slugs.length);
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
