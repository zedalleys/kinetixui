import { describe, expect, it } from "vitest";
import {
  NO_FILTERS,
  countOptions,
  filterBlocks,
  isFiltered,
  parseBlockFilters,
  serializeBlockFilters,
  type FilterOptions,
  type FilterableBlock,
} from "./block-filters";

const OPTIONS: FilterOptions = {
  cat: ["Forms", "Commerce", "Data"],
  capability: ["identity-security", "transactions", "data-analytics"],
  domain: ["commerce", "finance"],
  workflow: ["checkout"],
  platform: ["React", "Angular", "SwiftUI", "Compose", "Flutter"],
};
const ALL5 = ["React", "Angular", "SwiftUI", "Compose", "Flutter"] as const;
const block = (slug: string, over: Partial<FilterableBlock>): FilterableBlock => ({
  slug,
  category: "Forms",
  capabilities: [],
  domains: [],
  workflows: [],
  platforms: [...ALL5],
  terms: slug,
  ...over,
});
const BLOCKS: FilterableBlock[] = [
  block("sign-in", { capabilities: ["identity-security"], terms: "sign in · card · input · identity & security" }),
  block("order-summary", {
    category: "Commerce",
    capabilities: ["transactions"],
    domains: ["commerce"],
    workflows: ["checkout"],
    terms: "order summary · line items · checkout · number-input",
  }),
  block("receipt", {
    category: "Commerce",
    capabilities: ["transactions"],
    domains: ["commerce", "finance"],
    workflows: ["checkout"],
    terms: "receipt · amount paid · checkout",
  }),
  block("stat-cards", { category: "Data", capabilities: ["data-analytics"], terms: "stat cards · metric" }),
  // only reachable through the platform filter: a React-only block must never appear under SwiftUI
  block("react-only", { category: "Data", platforms: ["React"], terms: "react only" }),
];
const slugs = (xs: FilterableBlock[]) => xs.map((b) => b.slug);
const parse = (qs: string) => parseBlockFilters(new URLSearchParams(qs), OPTIONS);

describe("block filter URL contract", () => {
  it("restores every dimension from a direct link", () => {
    expect(parse("q=checkout&cat=Commerce&capability=transactions&domain=finance&workflow=checkout&platform=SwiftUI")).toEqual({
      q: "checkout",
      cat: "Commerce",
      capability: "transactions",
      domain: "finance",
      workflow: "checkout",
      platform: "SwiftUI",
    });
  });

  it("treats an unknown or obsolete value as no filter for that dimension only, without throwing", () => {
    const state = parse("cat=Nope&capability=payments&domain=healthcare&workflow=goal-setting&platform=Wear%20OS&q=receipt");
    expect(state).toEqual({ ...NO_FILTERS, q: "receipt" });
    // and unrelated valid filters survive a bad neighbour
    expect(parse("capability=ai&domain=commerce").domain).toBe("commerce");
  });

  it("matches values exactly: a platform label or a different case is not a key", () => {
    expect(parse("platform=Jetpack%20Compose").platform).toBeNull();
    expect(parse("cat=forms").cat).toBeNull();
  });

  it("writes one canonical URL per state: fixed key order, invalid values dropped, unowned keys kept after", () => {
    const current = new URLSearchParams("platform=React&utm_source=newsletter&cat=Nope&q=old&ref=x");
    const state = { ...parse(current.toString()), q: " checkout ", capability: "transactions" };
    expect(serializeBlockFilters(state, current.entries())).toBe(
      "q=checkout&capability=transactions&platform=React&utm_source=newsletter&ref=x",
    );
    // the same state written from a differently ordered URL gives the same filter part; foreign keys keep their order
    const shuffled = new URLSearchParams("ref=x&q=old&utm_source=newsletter&cat=Nope&platform=React");
    expect(serializeBlockFilters(state, shuffled.entries())).toBe("q=checkout&capability=transactions&platform=React&ref=x&utm_source=newsletter");
  });

  it("round-trips: what it writes, it reads back as the same state", () => {
    const state = { ...NO_FILTERS, q: "receipt", cat: "Commerce", domain: "finance", platform: "Flutter" };
    expect(parse(serializeBlockFilters(state))).toEqual(state);
    expect(serializeBlockFilters(NO_FILTERS)).toBe("");
  });
});

describe("block filter semantics", () => {
  it("search alone matches every word against the block's text", () => {
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, q: "checkout" }))).toEqual(["order-summary", "receipt"]);
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, q: "Checkout   RECEIPT" }))).toEqual(["receipt"]);
    // a component used by the block finds it
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, q: "number-input" }))).toEqual(["order-summary"]);
  });

  it("filters by each dimension on its own", () => {
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, cat: "Data" }))).toEqual(["stat-cards", "react-only"]);
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, capability: "identity-security" }))).toEqual(["sign-in"]);
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, domain: "finance" }))).toEqual(["receipt"]);
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, workflow: "checkout" }))).toEqual(["order-summary", "receipt"]);
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, platform: "SwiftUI" }))).not.toContain("react-only");
    expect(slugs(filterBlocks(BLOCKS, { ...NO_FILTERS, platform: "React" }))).toContain("react-only");
  });

  it("combines dimensions with AND, and search with all of them", () => {
    const state = { ...NO_FILTERS, cat: "Commerce", domain: "commerce" };
    expect(slugs(filterBlocks(BLOCKS, state))).toEqual(["order-summary", "receipt"]);
    expect(slugs(filterBlocks(BLOCKS, { ...state, domain: "finance" }))).toEqual(["receipt"]);
    expect(slugs(filterBlocks(BLOCKS, { ...state, q: "line items" }))).toEqual(["order-summary"]);
  });

  it("can reach zero results, and clearing everything brings every block back", () => {
    const none = { ...NO_FILTERS, cat: "Forms", workflow: "checkout" };
    expect(filterBlocks(BLOCKS, none)).toEqual([]);
    expect(isFiltered(none)).toBe(true);
    expect(filterBlocks(BLOCKS, NO_FILTERS)).toHaveLength(BLOCKS.length);
    expect(isFiltered(NO_FILTERS)).toBe(false);
  });

  it("counts a dimension's options against every other filter, ignoring its own value", () => {
    const state = { ...NO_FILTERS, cat: "Commerce", domain: "commerce" };
    // category counts ignore cat=Commerce but respect domain=commerce
    expect(countOptions(BLOCKS, state, "cat")).toEqual({ Commerce: 2 });
    // domain counts ignore domain=commerce but respect cat=Commerce
    expect(countOptions(BLOCKS, state, "domain")).toEqual({ commerce: 2, finance: 1 });
    // a multi-tag block counts once per option, never as two blocks in one option
    expect(countOptions(BLOCKS, NO_FILTERS, "capability")).toEqual({ "identity-security": 1, transactions: 2, "data-analytics": 1 });
    expect(countOptions(BLOCKS, NO_FILTERS, "platform").SwiftUI).toBe(4);
  });
});
