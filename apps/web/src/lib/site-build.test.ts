import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every workspace package the site imports has to be built before the site is.
 *
 * This exists because of a real failure. `/iot` added `@kinetixui/iot` to the site's dependencies, and the
 * package resolves its subpaths through an `exports` map pointing at `dist/`. The repository had three
 * independent places that build the site — `ci.yml`, `a11y-site.yml` and Vercel's `buildCommand` — and only
 * `ci.yml` knew about the new package. Local builds passed because `dist/` was already on disk from an earlier
 * `pnpm build:iot`, so the gap only appeared on a clean checkout, as
 * `Module not found: Can't resolve '@kinetixui/iot/react'`.
 *
 * The failure mode is nasty: it is invisible locally, it is per-build-path rather than per-file, and nothing in
 * the type system or the test suite touches it. So the rule is asserted from the site's own manifest — add a
 * workspace dependency and this fails until every build path knows how to produce it.
 *
 * `@kinetixui/create-preset` and `@kinetixui/create-theme` are deliberately exempt: they are private packages
 * consumed as TypeScript source through the workspace link, with no build step and no `dist/` to miss.
 */

const root = "../..";
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

/** Packages consumed as source rather than as a built artifact, so no build path needs to produce them. */
const SOURCE_ONLY = new Set(["@kinetixui/create-preset", "@kinetixui/create-theme"]);

/** The root script that builds each package, by package name. */
const BUILD_SCRIPT: Record<string, string> = {
  "@kinetixui/tokens": "build:tokens",
  "@kinetixui/ui": "build:ui",
  "@kinetixui/iot": "build:iot",
};

const sitePackage = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
const rootPackage = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

/** The site's workspace dependencies that are consumed as built output. */
const built = Object.keys(sitePackage.dependencies)
  .filter((name) => name.startsWith("@kinetixui/"))
  .filter((name) => !SOURCE_ONLY.has(name));

describe("every built workspace dependency of the site is produced by every path that builds the site", () => {
  it("has dependencies to check, so the assertions below are not vacuous", () => {
    expect(built.length).toBeGreaterThan(1);
    expect(built).toContain("@kinetixui/iot");
  });

  it("knows the root script that builds each one", () => {
    for (const name of built) {
      const script = BUILD_SCRIPT[name];
      expect(script, `no build script is mapped for ${name} — add one to BUILD_SCRIPT`).toBeTruthy();
      expect(rootPackage.scripts, `root package.json should define ${script}`).toHaveProperty(script as string);
    }
  });

  /**
   * Vercel builds from `apps/web` with its own command rather than the repo's CI scripts, which is exactly why
   * it was the path that broke: nothing else in the repository references it.
   */
  it("is built by Vercel's buildCommand", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string };
    for (const name of built) {
      const script = BUILD_SCRIPT[name]!;
      const filterForm = `--filter ${name} build`;
      expect(
        vercel.buildCommand.includes(script) || vercel.buildCommand.includes(filterForm),
        `apps/web/vercel.json buildCommand must build ${name} (via \`pnpm ${script}\` or \`pnpm ${filterForm}\`) ` +
          `before the site, or the deployment fails to resolve its imports on a clean checkout`,
      ).toBe(true);
    }
  });

  it("is built by every workflow that builds the site", () => {
    const workflows = ["ci.yml", "a11y-site.yml"];
    for (const file of workflows) {
      const text = read(`.github/workflows/${file}`);
      // Only workflows that actually build the site are held to this.
      if (!text.includes("build:web")) continue;
      for (const name of built) {
        const script = BUILD_SCRIPT[name]!;
        expect(
          text.includes(script) || text.includes(`--filter ${name} build`),
          `.github/workflows/${file} builds the site but never builds ${name}`,
        ).toBe(true);
      }
    }
  });

  it("checks workflows that really do build the site, so the loop above is not skipping everything", () => {
    const building = ["ci.yml", "a11y-site.yml"].filter((f) => read(`.github/workflows/${f}`).includes("build:web"));
    expect(building, "both CI and the site accessibility workflow should build the site").toEqual([
      "ci.yml",
      "a11y-site.yml",
    ]);
  });
});
