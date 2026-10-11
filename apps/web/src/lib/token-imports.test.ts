// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every web setup surface loads the same token stylesheets, in the same order.
 *
 * Installation listed three sheets, Tokens and both package READMEs two, Angular and Theming four. The one that
 * matters most is `css/extras/dark`: it carries the dark focus halo `/docs/accessibility` cites, so a React user
 * following Installation got a weaker dark focus ring than the docs promised.
 *
 * The canonical set is read from `@kinetixui/tokens`' own `exports`, in the order the package declares them, so a
 * fifth sheet would fail every surface that does not load it rather than going unmentioned.
 */
const root = "../..";
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const exportsMap = (JSON.parse(read("packages/tokens/package.json")) as { exports: Record<string, unknown> }).exports;
const CANONICAL = Object.keys(exportsMap)
  .filter((k) => k === "./css" || k.startsWith("./css/"))
  .map((k) => `@kinetixui/tokens${k.slice(1)}`);

/** Each public surface that tells a web developer what to import. */
const SURFACES = [
  "apps/web/src/app/docs/installation/page.mdx",
  "apps/web/src/app/docs/tokens/page.mdx",
  "apps/web/src/app/docs/theming/page.mdx",
  "apps/web/src/app/docs/angular/page.mdx",
  "packages/ui/README.md",
  "packages/tokens/README.md",
];

/** Every run of consecutive `@import "@kinetixui/tokens…"` lines, as the list of imported specifiers. */
function importBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    const m = /^\s*@import\s+["'](@kinetixui\/tokens[^"']*)["']/.exec(line);
    if (m) current.push(m[1]!);
    else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

describe("token stylesheet imports are canonical", () => {
  it("reads four web sheets from the package, including the dark extras", () => {
    expect(CANONICAL).toEqual([
      "@kinetixui/tokens/css",
      "@kinetixui/tokens/css/dark",
      "@kinetixui/tokens/css/extras",
      "@kinetixui/tokens/css/extras/dark",
    ]);
  });

  it.each(SURFACES)("%s imports the canonical set, in order, every time it imports any", (surface) => {
    const blocks = importBlocks(read(surface));
    expect(blocks.length, `${surface} has no token import block, so this guard checks nothing there`).toBeGreaterThan(0);
    for (const block of blocks) expect(block).toEqual(CANONICAL);
  });

  it("would catch the Installation block that shipped", () => {
    const shipped = '@import "@kinetixui/tokens/css";\n@import "@kinetixui/tokens/css/dark";\n@import "@kinetixui/tokens/css/extras";\n';
    expect(importBlocks(shipped)[0]).not.toEqual(CANONICAL);
  });
});
