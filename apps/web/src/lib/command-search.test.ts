import { describe, expect, it } from "vitest";
import { rankCommand } from "./command-search";

describe("rankCommand (⌘K ranking)", () => {
  const button = ["Button"];
  const buttonGroup = ["Button Group"];
  const orderSummary = ["Order summary", "Commerce block", "Transactions & money", "Checkout", "number-input"];

  it("puts an exact title above a prefix, a word prefix, a substring and a keyword match", () => {
    const scores = [
      rankCommand("x", "button", button),
      rankCommand("x", "butt", button),
      rankCommand("x", "group", buttonGroup),
      rankCommand("x", "utto", button),
      rankCommand("x", "checkout", orderSummary),
    ];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("ranks an exact component name above a block that only mentions it", () => {
    expect(rankCommand("docs:/docs/components/number-input", "number input", ["Number Input"])).toBeGreaterThan(
      rankCommand("block:order-summary", "number input", orderSummary),
    );
  });

  it("matches every word of a multi-word query anywhere, ignoring case, accents and extra spaces", () => {
    expect(rankCommand("x", "  TRANSACTIONS   checkout ", orderSummary)).toBeGreaterThan(0);
    expect(rankCommand("x", "café", ["Cafe menu"])).toBe(0.9);
    expect(rankCommand("x", "checkout payroll", orderSummary)).toBe(0);
  });

  it("hides what does not match and shows everything for an empty query", () => {
    expect(rankCommand("x", "zzzz", button)).toBe(0);
    expect(rankCommand("x", "", button)).toBe(1);
  });

  it("falls back to the value when an item passes no keywords", () => {
    expect(rankCommand("Dark", "dark")).toBe(1);
  });
});
