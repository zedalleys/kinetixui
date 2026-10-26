/**
 * The functional taxonomy is generated from `components.manifest.json`. These are the claims that the
 * generator alone cannot make: that the website's view of it is complete, that the two surfaces which used to
 * keep their own copies now agree, and that an unknown slug is an error rather than a default.
 *
 * `pnpm check:manifest` validates the manifest and the generated file. `pnpm check:manifest-controls` proves
 * that gate fails when the manifest is wrong. This file covers the consumers.
 */
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import taxonomy from "../../../../component-taxonomy.json";
import {
  CATEGORY_COUNT,
  CATEGORY_ORDER,
  CATEGORY_RULE,
  COMPONENT_CATEGORY,
  RECIPE_SLUGS,
  categoryOf,
  facetsOf,
  kindOf,
  resolveCategoryParam,
} from "./component-taxonomy";
import { recipes } from "./platform-support";
import { componentDocs, docsNav } from "./site";

const slugOf = (href: string) => href.split("/").pop() ?? "";
const DOC_SLUGS = componentDocs.map((i) => slugOf(i.href));
const MANIFEST_SLUGS = Object.keys(manifest.components);

describe("the component taxonomy", () => {
  it("covers every catalogue entry, with nothing left over", () => {
    expect([...MANIFEST_SLUGS].sort()).toEqual([...Object.keys(COMPONENT_CATEGORY)].sort());
    // the doc pages are the set the website renders cards and a sidebar for; a slug in one and not the other
    // is how a component used to end up in the "Components" group or in Data Display by default
    expect([...DOC_SLUGS].sort()).toEqual([...MANIFEST_SLUGS].sort());
  });

  it("gives every category a rule an assignment can be argued with", () => {
    expect(CATEGORY_ORDER.length).toBeGreaterThan(0);
    for (const label of CATEGORY_ORDER) {
      expect(CATEGORY_RULE[label], `${label}: rule`).toBeTruthy();
      expect(CATEGORY_RULE[label].length, `${label}: rule is too short to decide anything`).toBeGreaterThan(20);
    }
  });

  it("has no empty category, so no label is a filter chip that shows nothing", () => {
    for (const label of CATEGORY_ORDER) expect(CATEGORY_COUNT[label], `${label}: count`).toBeGreaterThan(0);
    expect(Object.values(CATEGORY_COUNT).reduce((a, b) => a + b, 0)).toBe(MANIFEST_SLUGS.length);
  });

  /**
   * CAT-BUG-019, the defect itself: an unknown slug used to resolve to "Data Display" on the website and to
   * the generic "Components" group in Storybook, so an omission was invisible in both. The throw is what makes
   * one visible; `check:manifest` is what keeps it unreachable.
   */
  it("throws for an unknown slug instead of answering with a default category", () => {
    expect(() => categoryOf("not-a-component")).toThrow(/No category for component "not-a-component"/);
    // negative control: the message names the fix, and a real slug does not throw
    expect(() => categoryOf("button")).not.toThrow();
    expect(() => categoryOf("not-a-component")).toThrow(/gen:manifest/);
  });

  it("retires the categories the old maps had, and keeps none of their labels in use", () => {
    // "Foundations" described how mature a component was, not what it does; its nine entries moved to five
    // different functional homes (CAT-1 §4)
    for (const retired of ["Foundations", "Form Inputs", "Controls & Actions", "Feedback"]) {
      expect(CATEGORY_ORDER as readonly string[], `${retired} should be retired`).not.toContain(retired);
      expect(Object.values(COMPONENT_CATEGORY)).not.toContain(retired);
    }
  });

  /**
   * The two slugs the hand-written maps had actually drifted on. `site.ts` filed them under Navigation and
   * Foundations; `gen-stories.mjs` did not list them at all, so their stories were titled "Components/…".
   */
  it("files the two slugs the old maps disagreed on in one place each", () => {
    expect(categoryOf("app-bar")).toBe("Navigation");
    expect(categoryOf("direction-provider")).toBe("Layout & Structure");
    // and the sidebar, which reads the same data, puts them in those groups rather than a default one
    const groupOf = (slug: string) =>
      docsNav.find((g) => g.items.some((i) => slugOf(i.href) === slug))?.title;
    expect(groupOf("app-bar")).toBe("Navigation");
    expect(groupOf("direction-provider")).toBe("Layout & Structure");
  });

  it("puts every component in exactly one sidebar group", () => {
    const seen = new Map<string, number>();
    for (const group of docsNav) {
      if (!(CATEGORY_ORDER as readonly string[]).includes(group.title)) continue;
      for (const item of group.items) seen.set(slugOf(item.href), (seen.get(slugOf(item.href)) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual([...DOC_SLUGS].sort());
    for (const [slug, n] of seen) expect(n, `${slug} appears in ${n} groups`).toBe(1);
  });
});

describe("shared ?cat= links across the renames", () => {
  /**
   * Three categories were renamed, and a link to the old name is a link someone has already sent. The alias
   * lives in the manifest's `formerly`, so this is what proves the data reaches the resolver.
   */
  it("resolves every former label to the category it is now", () => {
    expect(resolveCategoryParam("Form Inputs")).toBe("Forms & Inputs");
    expect(resolveCategoryParam("Controls & Actions")).toBe("Actions & Controls");
    expect(resolveCategoryParam("Feedback")).toBe("Feedback & Status");
    // every alias the generator declares resolves to a current label, so adding one cannot half-work
    for (const [prev, now] of Object.entries(taxonomy.categoryAliases)) {
      expect(CATEGORY_ORDER as readonly string[], `${prev} → ${now}`).toContain(now);
      expect(resolveCategoryParam(prev)).toBe(now);
    }
  });

  it("leaves a current label and an absent one alone", () => {
    for (const label of CATEGORY_ORDER) expect(resolveCategoryParam(label)).toBe(label);
    expect(resolveCategoryParam(null)).toBeNull();
    // negative control: a retired category has no successor, so it is NOT quietly mapped onto one — the
    // gallery's empty state, with its "Clear filters" button, is what a reader meets
    expect(resolveCategoryParam("Foundations")).toBe("Foundations");
    expect(CATEGORY_ORDER as readonly string[]).not.toContain("Foundations");
  });
});

describe("kind and facets", () => {
  /**
   * The recipe count is public: "108 components and 1 documented recipe", and marketing/CLAIMS.md B2 makes
   * that phrasing a condition of quoting the number. It used to come from matching "not a component" in a
   * platformNote; it now comes from `kind`, and the value must not have changed in the move.
   */
  it("derives the same recipe list from kind that the prose used to", () => {
    expect(RECIPE_SLUGS).toEqual(["combobox"]);
    expect([...recipes].sort()).toEqual([...RECIPE_SLUGS].sort());
    const fromProse = MANIFEST_SLUGS.filter((s) =>
      /not a component/i.test((manifest.components as Record<string, { platformNote?: string }>)[s].platformNote ?? ""),
    );
    expect([...fromProse].sort()).toEqual([...RECIPE_SLUGS].sort());
  });

  it("marks the composed field groups and the one component that renders nothing", () => {
    expect(taxonomy.facets.composed).toEqual(["address-fields", "form"]);
    expect(taxonomy.facets.utility).toEqual(["direction-provider"]);
    expect(facetsOf("address-fields")).toContain("composed");
    // negative control: a facet is a mark on a few entries, not a label everything carries
    expect(facetsOf("button")).toEqual([]);
  });

  it("keeps every entry a component except the declared recipes — nothing moved to Blocks", () => {
    const components = MANIFEST_SLUGS.filter((s) => kindOf(s) === "component");
    expect(components.length).toBe(MANIFEST_SLUGS.length - RECIPE_SLUGS.length);
    // the eleven CAT-BUG-013 asked about are all still components, in the catalogue, with their own category
    for (const slug of [
      "footer", "message-bubble", "price-breakdown", "pass-card", "data-grid", "data-table",
      "form", "address-fields", "amount-display", "kanban-board", "chart",
    ]) {
      expect(kindOf(slug), `${slug}: kind`).toBe("component");
      expect(DOC_SLUGS, `${slug}: still has a component page`).toContain(slug);
    }
  });
});
