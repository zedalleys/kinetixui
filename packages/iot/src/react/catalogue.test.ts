import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The README's component counts, derived rather than trusted.
 *
 * Prose that counts things goes stale the first time someone adds a component, and a number in a
 * README is exactly the kind of claim a reader can check in thirty seconds. This derives the counts
 * from the export barrel — the only thing that actually decides them — and fails when the README
 * disagrees, so the documentation cannot drift away from the package without a test going red.
 *
 * It deliberately does not rewrite the README. A count changing is a prompt to look at the sentence
 * around it, which may well need to change too.
 */

const reactDir = path.resolve(import.meta.dirname);
const barrel = readFileSync(path.join(reactDir, "index.ts"), "utf8");
// Whitespace-normalised: the README hard-wraps its paragraphs, so a counted phrase such as
// "seven React primitives" is routinely split across two lines in the file.
const readme = readFileSync(path.resolve(reactDir, "../../README.md"), "utf8").replace(/\s+/g, " ");

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};
// "twenty-seven" and friends: the patterns layer passed twenty in 0.3, and a count spelled with a
// hyphen would otherwise read as "not a number" and fail with a confusing message.
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50 };
for (const [tens, n] of Object.entries(TENS)) {
  WORDS[tens] = n;
  for (const [unit, u] of Object.entries(WORDS)) if (u >= 1 && u <= 9) WORDS[`${tens}-${unit}`] = n + u;
}

/** The components exported under one `/* ---- <layer> *\/` banner in the barrel. */
function layer(name: string): string[] {
  const start = barrel.indexOf(`${name} */`);
  expect(start, `no "${name}" section in the react barrel`).toBeGreaterThan(-1);
  const rest = barrel.slice(start);
  const end = rest.indexOf("/* --", 1);
  const block = end === -1 ? rest : rest.slice(0, end);
  return [...block.matchAll(/^export \{ (\w+),/gm)].map((m) => m[1]!);
}

/**
 * The number the README states before a phrase, spelled as a word.
 *
 * Scans every occurrence rather than the first: the README also says "the React primitives" in prose
 * further down, and matching that instead would fail on the article rather than on the count.
 */
function stated(phrase: string): number {
  const words = [...readme.matchAll(new RegExp(`([\\w-]+) ${phrase}`, "g"))].map((m) => m[1]!.toLowerCase());
  expect(words.length, `the README no longer mentions "${phrase}"`).toBeGreaterThan(0);

  const counts = words.filter((w) => w in WORDS);
  expect(counts.length, `the README no longer says "<number> ${phrase}" (found: ${words.join(", ")})`).toBe(1);
  return WORDS[counts[0]!]!;
}

describe("the README counts what the package actually exports", () => {
  const primitives = layer("primitives");
  const controls = layer("controls");
  const patterns = layer("patterns");

  it("finds all three layers in the barrel", () => {
    // Vacuity guard: every comparison below is trivially true against empty layers.
    expect(primitives.length).toBeGreaterThan(0);
    expect(controls.length).toBeGreaterThan(0);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("states the number of primitives correctly", () => {
    expect(stated("React primitives")).toBe(primitives.length);
  });

  it("states the number of controls correctly", () => {
    expect(stated("device controls")).toBe(controls.length);
  });

  it("states the number of patterns correctly", () => {
    expect(stated("composed product patterns")).toBe(patterns.length);
  });

  it("keeps the barrel to one `export { Name, … }` per line, which is what this test reads", () => {
    // A multi-line export would be invisible to `layer()` and silently uncounted; fail loudly instead.
    const declared = [...barrel.matchAll(/^export \{/gm)].length;
    const readable = [...barrel.matchAll(/^export \{ (\w+),/gm)].length;
    expect(readable).toBe(declared);
  });

  it("puts every component in exactly one layer", () => {
    const all = [...primitives, ...controls, ...patterns];
    expect(new Set(all).size).toBe(all.length);

    // And the barrel has no component sitting outside the three banners.
    const everyExport = [...barrel.matchAll(/^export \{ (\w+),/gm)].map((m) => m[1]!);
    expect([...everyExport].sort()).toEqual([...all].sort());
  });
});
