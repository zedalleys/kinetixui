// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The documentation environment must load the same token contract the product does.
 *
 * `@kinetixui/tokens` ships the contract as four stylesheets, and the split is not cosmetic:
 * `globals` carries the colour variables, `extras` carries the shadow composites. Every `shadow-*`
 * utility in the Tailwind preset resolves to `var(--shadow-*)`, so a consumer that imports `globals`
 * alone gets `box-shadow: none` for the entire catalogue — including every
 * `focus-visible:shadow-focus`.
 *
 * That is exactly what Storybook did. `preview.ts` was written with two imports when the system was
 * scaffolded; `extras` was added to `apps/web` later, when elevation tokens landed, and the docs
 * build was never updated. For as long as that was true, Storybook — the one environment whose whole
 * job is to show what the components look like — rendered them with no elevation and no focus rings,
 * and the axe suite that runs against it could not have seen the difference.
 *
 * Nothing failed, because nothing was watching. This is the thing that watches.
 */

const repoRoot = resolve(process.cwd(), "../..");
const preview = readFileSync(resolve(repoRoot, "apps/docs/.storybook/preview.ts"), "utf8");
const siteGlobals = readFileSync(resolve(repoRoot, "apps/web/src/app/globals.css"), "utf8");

/**
 * Every `@kinetixui/tokens…` stylesheet a file actually pulls in.
 *
 * Reads import STATEMENTS, not every quoted token-package string anywhere in the file. The first
 * version of this helper did the latter, and review caught what that costs: comment out both imports
 * during a refactor and the specifiers are still in the source, so all three tests below passed while
 * Storybook once again shipped with no shadow or focus variables. A guard for a silent regression
 * that is itself silent about the regression is worse than none.
 *
 * Block comments are stripped, and a statement must begin its line — which is what a commented-out
 * import fails to do.
 */
function tokenStylesheets(source: string, kind: "ts" | "css"): Set<string> {
  const live = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const statement =
    kind === "ts"
      ? /^[ \t]*import\s+["'](@kinetixui\/tokens(?:\/[a-z/]+)?)["']/gm
      : /^[ \t]*@import\s+["'](@kinetixui\/tokens(?:\/[a-z/]+)?)["']/gm;
  return new Set([...live.matchAll(statement)].map((m) => m[1]));
}

const docsSheets = tokenStylesheets(preview, "ts");
const siteSheets = tokenStylesheets(siteGlobals, "css");

describe("the docs and the product load the same token contract", () => {
  it("imports an identical set of token stylesheets", () => {
    // Sorted arrays rather than set equality, so a failure names the missing sheet instead of
    // reporting that two opaque sets differ.
    expect([...docsSheets].sort()).toEqual([...siteSheets].sort());
  });

  it("loads the stylesheet that defines --shadow-*, in both themes", () => {
    // Named explicitly as well as by parity: if the site itself ever lost these, parity alone would
    // pass while both environments were equally broken. Asserted against the parsed set, not against
    // the raw text, so a commented-out import cannot satisfy it.
    for (const sheets of [docsSheets, siteSheets]) {
      expect(sheets).toContain("@kinetixui/tokens/css/extras");
      expect(sheets).toContain("@kinetixui/tokens/css/extras/dark");
    }
  });

  it("does not count a specifier that is not a live import", () => {
    // The hole review found, pinned directly: prose and commented-out lines mention the specifier
    // without importing it.
    const commented = [
      '// import "@kinetixui/tokens/css/extras";',
      '/* import "@kinetixui/tokens/css/extras/dark"; */',
      '// see "@kinetixui/tokens/css/extras" for the shadow composites',
      'import "@kinetixui/tokens/css";',
    ].join("\n");
    expect([...tokenStylesheets(commented, "ts")]).toEqual(["@kinetixui/tokens/css"]);

    const css = ['/* @import "@kinetixui/tokens/css/extras"; */', '@import "@kinetixui/tokens/css";'].join("\n");
    expect([...tokenStylesheets(css, "css")]).toEqual(["@kinetixui/tokens/css"]);
  });

  it("is checking a real split — `extras` is where the shadow variables actually live", () => {
    // The premise of the two tests above. If a future token build moved the shadows into `globals`,
    // these assertions would still pass while testing nothing, so the premise is asserted too.
    const extras = readFileSync(resolve(repoRoot, "packages/tokens/dist/web/extras.css"), "utf8");
    const globals = readFileSync(resolve(repoRoot, "packages/tokens/dist/web/globals.css"), "utf8");
    expect(extras).toMatch(/--shadow-focus:/);
    expect(extras).toMatch(/--shadow-xl:/);
    expect(globals).not.toMatch(/--shadow-/);
  });
});
