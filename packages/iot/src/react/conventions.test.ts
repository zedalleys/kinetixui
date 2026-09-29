import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Source-level house rules for every shipped component module.
 *
 * These read the `.tsx` files rather than rendering them, for the same reason `tree-shaking.test.ts`
 * does: they fail at authorship, need no browser, and cover every file — including a component nobody
 * has written a render test for yet, because the file list is the directory, not a hand-kept array.
 *
 * Each rule has a self-check against a deliberately bad sample, so the detector cannot quietly become a
 * no-op (a scan that finds nothing is indistinguishable from a scan that is broken).
 */
const dir = path.resolve(import.meta.dirname);

const files = readdirSync(dir)
  .filter((n) => n.endsWith(".tsx") && !n.includes(".stories.") && !n.includes(".test."))
  .sort()
  .map((name) => ({ name, source: readFileSync(path.join(dir, name), "utf8") }));

/** Strip comments so prose that *names* a forbidden class ("`ms-auto` rather than `ml-auto`") is not a hit. */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Utility tokens found in string literals, with variant prefixes (`sm:`, `rtl:`, `hover:`) removed.
 * Only string contents are read: outside a string, `[` is an array and `left` is an identifier.
 */
function utilityTokens(source: string): { raw: string; util: string }[] {
  const strings = [...stripComments(source).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  return strings
    .flatMap((text) => text.split(/\s+/))
    .filter((t) => t.length > 0)
    .map((raw) => ({ raw, util: raw.slice(raw.lastIndexOf(":") + 1) }));
}

const PHYSICAL = [
  /^-?(ml|mr|pl|pr)-/,
  /^-?(left|right)-/,
  /^text-(left|right)$/,
  /^rounded-(l|r|tl|tr|bl|br)(-|$)/,
  /^border-(l|r)(-|$)/,
  /^scroll-(ml|mr|pl|pr)-/,
  /^float-(left|right)$/,
  /^origin-(left|right)/,
  /^space-x-/,
];

function physicalUtilities(source: string): string[] {
  return utilityTokens(source)
    .filter(({ util }) => PHYSICAL.some((re) => re.test(util)))
    .map(({ raw }) => raw);
}

/**
 * An arbitrary *value* for something the token contract owns: colour, spacing, size, radius, shadow,
 * type. Arbitrary *variants* (`[&::-webkit-slider-thumb]:…`) and `transition-[width]` are not values
 * the tokens define and are allowed.
 */
const TOKEN_OWNED =
  /^-?(bg|text|border|ring|ring-offset|outline|fill|stroke|from|via|to|p[xytblrse]?|m[xytblrse]?|gap|gap-[xy]|space-[xy]|w|h|size|min-w|min-h|max-w|max-h|inset|inset-[xy]|top|bottom|start|end|basis|rounded|rounded-[a-z]+|shadow|leading|tracking|opacity)-\[/;

function arbitraryValues(source: string): string[] {
  return utilityTokens(source)
    .filter(({ util }) => TOKEN_OWNED.test(util))
    .map(({ raw }) => raw);
}

const ANIMATION = /^animate-(spin|pulse|ping|bounce)$/;

describe("component conventions", () => {
  it("finds the component modules at all", () => {
    expect(files.length).toBeGreaterThanOrEqual(35);
  });

  describe("logical properties only", () => {
    it("catches a physical utility in a sample (self-check)", () => {
      expect(physicalUtilities('<div className="ml-2 sm:pr-4 rtl:text-left rounded-l-lg border-r left-0 ms-2" />')).toEqual([
        "ml-2",
        "sm:pr-4",
        "rtl:text-left",
        "rounded-l-lg",
        "border-r",
        "left-0",
      ]);
      expect(physicalUtilities("// `ml-auto` is physical\n<div className=\"ms-auto ps-3 text-start\" />")).toEqual([]);
    });

    it("uses no physical-direction utility in any component", () => {
      const offenders = files.flatMap((f) => physicalUtilities(f.source).map((u) => `${f.name}: ${u}`));
      expect(offenders, `use ms-/me-/ps-/pe-/start-/end-/text-start/border-s/rounded-s instead:\n${offenders.join("\n")}`).toEqual([]);
    });
  });

  describe("token contract only", () => {
    it("catches an arbitrary value in a sample (self-check)", () => {
      expect(arbitraryValues('<div className="bg-[#fff] p-[13px] w-full [&>img]:size-full" />')).toEqual(["bg-[#fff]", "p-[13px]"]);
      expect(arbitraryValues('<div className="[&::-webkit-slider-thumb]:size-6 transition-[width] sm:w-[3px]" />')).toEqual(["sm:w-[3px]"]);
    });

    it("uses no arbitrary Tailwind value in any component", () => {
      const offenders = files.flatMap((f) => arbitraryValues(f.source).map((u) => `${f.name}: ${u}`));
      expect(offenders, offenders.join("\n")).toEqual([]);
    });

    it("defines no custom keyframes", () => {
      const offenders = files.filter((f) => /@keyframes/.test(stripComments(f.source))).map((f) => f.name);
      expect(offenders).toEqual([]);
    });
  });

  describe("motion is reduced when asked", () => {
    it("catches an unguarded animation in a sample (self-check)", () => {
      const sample = 'className="animate-pulse"';
      expect(utilityTokens(sample).some(({ util }) => ANIMATION.test(util))).toBe(true);
    });

    it("pairs every core animation with a motion-reduce guard in the same file", () => {
      const offenders = files
        .filter((f) => utilityTokens(f.source).some(({ util }) => ANIMATION.test(util)))
        .filter((f) => !f.source.includes("motion-reduce:animate-none"))
        .map((f) => f.name);
      expect(offenders).toEqual([]);
    });
  });

  describe("no dangerous markup", () => {
    it("never uses dangerouslySetInnerHTML", () => {
      const offenders = files.filter((f) => stripComments(f.source).includes("dangerouslySetInnerHTML")).map((f) => f.name);
      expect(offenders).toEqual([]);
    });

    it("renders no video, audio or canvas element", () => {
      const offenders = files.filter((f) => /<(video|audio|canvas)\b/.test(stripComments(f.source))).map((f) => f.name);
      expect(offenders).toEqual([]);
    });
  });
});
