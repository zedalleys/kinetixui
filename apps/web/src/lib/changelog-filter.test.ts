import { describe, expect, it } from "vitest";
import {
  buildChangelogUrl,
  filterReleases,
  normalizeQuery,
  parseFilter,
  resultSummary,
  searchMatches,
  type ViewRelease,
} from "./changelog-filter";

const base = { dateLabel: "", date: "2026-09-20", isLatest: false, notable: true, tagHref: "" } as const;

const releases: ViewRelease[] = [
  {
    ...base,
    version: "0.18.0",
    type: "Minor",
    summary: "RTL foundation and theme tooling.",
    changes: [
      { title: "KinetixDirectionProvider", body: "Sets dir for every component.", kind: "new", area: "components" },
      { title: "Contrast fix", kind: "accessibility", area: "tokens" },
    ],
    breaking: [],
    groups: [{ group: "Data & developer tools", items: [{ slug: "data-grid", name: "Data Grid", platforms: [] }] }],
  },
  {
    ...base,
    version: "0.17.0",
    type: "Minor",
    summary: "Sizes renamed.",
    changes: [{ title: "Button sizes", kind: "breaking", area: "components" }],
    breaking: ["`Button` `size=\"medium\"` was removed."],
    migration: "Use size md instead.",
    limitations: ["Native ports keep the old sizes."],
  },
  {
    ...base,
    version: "0.16.1",
    type: "Patch",
    summary: "CLI hardening.",
    changes: [{ title: "doctor checks the utils alias", kind: "fixed", area: "cli" }],
    notable: false,
  },
];

const versions = (list: ViewRelease[]) => list.map((r) => r.version);

describe("parseFilter", () => {
  it("accepts every known filter", () => {
    for (const id of ["all", "components", "tokens", "cli", "accessibility", "platforms", "breaking"]) expect(parseFilter(id)).toBe(id);
  });
  it("falls back to all for missing, unknown or differently-cased values", () => {
    expect(parseFilter(null)).toBe("all");
    expect(parseFilter(undefined)).toBe("all");
    expect(parseFilter("")).toBe("all");
    expect(parseFilter("nonsense")).toBe("all");
    expect(parseFilter("Accessibility")).toBe("all");
    expect(parseFilter("__proto__")).toBe("all");
  });
});

describe("searchMatches", () => {
  it("matches the version", () => {
    expect(versions(filterReleases(releases, "all", "0.18.0"))).toEqual(["0.18.0"]);
  });
  it("matches the summary, change title and change body", () => {
    expect(versions(filterReleases(releases, "all", "RTL"))).toEqual(["0.18.0"]);
    expect(versions(filterReleases(releases, "all", "utils alias"))).toEqual(["0.16.1"]);
    expect(versions(filterReleases(releases, "all", "sets dir"))).toEqual(["0.18.0"]);
  });
  it("matches breaking text, migration text and known limitations", () => {
    expect(versions(filterReleases(releases, "all", "was removed"))).toEqual(["0.17.0"]);
    expect(versions(filterReleases(releases, "all", "size md"))).toEqual(["0.17.0"]);
    expect(versions(filterReleases(releases, "all", "old sizes"))).toEqual(["0.17.0"]);
  });
  it("matches new component names, slugs and group names", () => {
    expect(versions(filterReleases(releases, "all", "Data Grid"))).toEqual(["0.18.0"]);
    expect(versions(filterReleases(releases, "all", "data-grid"))).toEqual(["0.18.0"]);
    expect(versions(filterReleases(releases, "all", "developer tools"))).toEqual(["0.18.0"]);
  });
  it("is case-insensitive and trims whitespace", () => {
    expect(versions(filterReleases(releases, "all", "  dAtA gRiD  "))).toEqual(["0.18.0"]);
    expect(versions(filterReleases(releases, "all", "BUTTON"))).toEqual(["0.17.0"]);
  });
  it("requires every word, so a longer query only narrows", () => {
    expect(searchMatches(releases[0]!, "rtl provider")).toBe(true);
    expect(searchMatches(releases[0]!, "rtl button")).toBe(false);
  });
  it("an empty or whitespace query matches everything", () => {
    expect(versions(filterReleases(releases, "all", ""))).toEqual(["0.18.0", "0.17.0", "0.16.1"]);
    expect(versions(filterReleases(releases, "all", "   "))).toEqual(["0.18.0", "0.17.0", "0.16.1"]);
  });
  it("does not mutate the releases it searches", () => {
    const before = JSON.stringify(releases);
    filterReleases(releases, "components", "grid");
    expect(JSON.stringify(releases)).toBe(before);
  });
});

describe("filter + search together", () => {
  it("applies both", () => {
    expect(versions(filterReleases(releases, "accessibility", ""))).toEqual(["0.18.0"]);
    expect(versions(filterReleases(releases, "accessibility", "button"))).toEqual([]);
    expect(versions(filterReleases(releases, "breaking", "button"))).toEqual(["0.17.0"]);
    expect(versions(filterReleases(releases, "cli", "doctor"))).toEqual(["0.16.1"]);
    expect(versions(filterReleases(releases, "cli", "grid"))).toEqual([]);
  });
});

describe("resultSummary", () => {
  it("is empty when nothing is active", () => {
    expect(resultSummary(33, "all", "")).toBe("");
    expect(resultSummary(33, "all", "   ")).toBe("");
  });
  it("counts a filter alone", () => {
    expect(resultSummary(7, "accessibility", "")).toBe("7 releases");
  });
  it("names the search and pluralises", () => {
    expect(resultSummary(3, "all", "DataGrid")).toBe("3 releases matching “DataGrid”");
    expect(resultSummary(1, "all", "DataGrid")).toBe("1 release matching “DataGrid”");
    expect(resultSummary(0, "all", "zzz")).toBe("0 releases matching “zzz”");
  });
  it("names both when both are active", () => {
    expect(resultSummary(2, "components", " grid ")).toBe("2 releases matching “grid” in Components");
  });
});

describe("buildChangelogUrl", () => {
  const at = { pathname: "/docs/changelog", search: "", hash: "" };
  it("omits filter=all and an empty search", () => {
    expect(buildChangelogUrl(at, { filter: "all", q: "" })).toBe("/docs/changelog");
    expect(buildChangelogUrl(at, { filter: "all", q: "   " })).toBe("/docs/changelog");
  });
  it("writes filter and q", () => {
    expect(buildChangelogUrl(at, { filter: "accessibility", q: "" })).toBe("/docs/changelog?filter=accessibility");
    expect(buildChangelogUrl(at, { filter: "all", q: "DataGrid" })).toBe("/docs/changelog?q=DataGrid");
    expect(buildChangelogUrl(at, { filter: "components", q: " grid " })).toBe("/docs/changelog?filter=components&q=grid");
  });
  it("encodes the search", () => {
    expect(buildChangelogUrl(at, { filter: "all", q: "a&b c" })).toBe("/docs/changelog?q=a%26b+c");
  });
  it("removes params that return to their defaults, and keeps unrelated ones", () => {
    expect(buildChangelogUrl({ ...at, search: "?filter=cli&q=x&utm=1" }, { filter: "all", q: "" })).toBe("/docs/changelog?utm=1");
  });
  it("preserves the hash so anchors keep working", () => {
    expect(buildChangelogUrl({ ...at, hash: "#0.18.0" }, { filter: "accessibility", q: "" })).toBe("/docs/changelog?filter=accessibility#0.18.0");
    expect(buildChangelogUrl({ ...at, hash: "#0.18.0" }, { filter: "all", q: "" })).toBe("/docs/changelog#0.18.0");
  });
});

describe("normalizeQuery", () => {
  it("trims and treats missing as empty", () => {
    expect(normalizeQuery("  x ")).toBe("x");
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
  });
});
