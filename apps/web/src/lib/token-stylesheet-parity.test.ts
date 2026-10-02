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

/** Every `@kinetixui/tokens…` specifier a file pulls in, however it spells the import. */
function tokenStylesheets(source: string): Set<string> {
  return new Set([...source.matchAll(/["'](@kinetixui\/tokens(?:\/[a-z/]+)?)["']/g)].map((m) => m[1]));
}

describe("the docs and the product load the same token contract", () => {
  it("imports an identical set of token stylesheets", () => {
    const docs = tokenStylesheets(preview);
    const site = tokenStylesheets(siteGlobals);

    // Sorted arrays rather than set equality, so a failure names the missing sheet instead of
    // reporting that two opaque sets differ.
    expect([...docs].sort()).toEqual([...site].sort());
  });

  it("loads the stylesheet that defines --shadow-*, in both themes", () => {
    // Named explicitly as well as by parity: if the site itself ever lost these, parity alone would
    // pass while both environments were equally broken.
    expect(preview).toContain("@kinetixui/tokens/css/extras");
    expect(preview).toContain("@kinetixui/tokens/css/extras/dark");
    expect(siteGlobals).toContain("@kinetixui/tokens/css/extras");
    expect(siteGlobals).toContain("@kinetixui/tokens/css/extras/dark");
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
