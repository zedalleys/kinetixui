/**
 * The functional taxonomy of the component catalogue: which category each component is in, whether it is a
 * published component or a documented recipe, and the secondary facets.
 *
 * The data lives in `component-taxonomy.json` at the repo root (not here) so it's importable from plain Node
 * scripts too (`scripts/gen-stories.mjs`, which titles the Storybook groups from it) without a Next.js
 * dependency — this file is a typed wrapper over it for the web app. The data is generated from
 * `components.manifest.json` — edit that and run `pnpm gen:manifest`, never this file or the JSON.
 *
 * There is no default category. The two hand-maintained maps this replaced had drifted on two slugs, and the
 * old `categoryOf` answered an unknown slug with "Data Display", so an omission was invisible on the site
 * (CAT-BUG-019). `categoryOf` now throws, and `pnpm check:manifest` guarantees every component has an entry,
 * so the throw is unreachable in a checked tree and a genuine omission fails the build instead of shipping.
 */
import taxonomyData from "../../../../component-taxonomy.json";

/** A functional category label. The union comes from the generated data, so a retired category is a type error. */
export type ComponentCategory = (typeof taxonomyData.categoryOrder)[number];

/** `component` — a published, prop-driven API. `recipe` — a documented composition with no export of its own. */
export type ComponentKind = "component" | "recipe";

/**
 * A secondary, non-exclusive mark.
 *
 * `composed` — a field group assembled from other components rather than a primitive (`address-fields`, `form`).
 * `utility` — renders no UI of its own (`direction-provider`).
 */
export type ComponentFacet = "composed" | "utility";

export type TaxonomyEntry = {
  category: ComponentCategory;
  kind: ComponentKind;
  facets?: readonly ComponentFacet[];
};

const ENTRIES = taxonomyData.components as Record<string, TaxonomyEntry>;

/** The declared order. Every surface that lists categories — sidebar, filter chips, grouped results — uses it. */
export const CATEGORY_ORDER = taxonomyData.categoryOrder as readonly ComponentCategory[];

/** Category label → the rule an assignment is judged against, for anyone arguing with one. */
export const CATEGORY_RULE: Record<string, string> = Object.fromEntries(
  Object.entries(taxonomyData.categories).map(([label, c]) => [label, c.rule]),
);

/** slug → category. Generated; the website no longer keeps its own copy. */
export const COMPONENT_CATEGORY: Record<string, ComponentCategory> = Object.fromEntries(
  Object.entries(ENTRIES).map(([slug, e]) => [slug, e.category]),
);

/** How many components each category holds, straight from the generator rather than counted per render. */
export const CATEGORY_COUNT: Record<string, number> = Object.fromEntries(
  Object.entries(taxonomyData.categories).map(([label, c]) => [label, c.count]),
);

export function categoryOf(slug: string): ComponentCategory {
  const entry = ENTRIES[slug];
  if (!entry) {
    throw new Error(
      `No category for component "${slug}". Add it to components.manifest.json and run \`pnpm gen:manifest\`.`,
    );
  }
  return entry.category;
}

/**
 * A `?cat=` value resolved to the category it names today.
 *
 * Three categories were renamed in CAT-2, and links to the old names are already shared — a reader following
 * `/components?cat=Form%20Inputs` must still land on the filtered view, not on an empty one. `formerly` in the
 * manifest is where the old names live, so a future rename is one field rather than another lookup table here.
 * A value that is neither a current nor a former label (a retired category such as `Foundations`, or a typo) is
 * returned unchanged. What the gallery then shows depends on `retiredCategory` below, not on this.
 */
export function resolveCategoryParam(value: string | null): string | null {
  if (!value) return null;
  if ((CATEGORY_ORDER as readonly string[]).includes(value)) return value;
  return (taxonomyData.categoryAliases as Record<string, string>)[value] ?? value;
}

/** A category that was removed and did not become one other category. */
export type RetiredCategory = {
  /** The label as it appears in a shared link. */
  readonly label: string;
  /** One clause, printed after "was retired because it". */
  readonly becauseIt: string;
  /** Where its components are now, in `categoryOrder` order. */
  readonly successors: readonly ComponentCategory[];
};

/**
 * The retirement record for a `?cat=` value, or null if the value is current, a former label, or a typo.
 *
 * `resolveCategoryParam` answers "which category is this today", and for `Foundations` there is no answer:
 * its nine components went to five different categories, so a rename alias would have to pick one and be
 * wrong for a reader four times out of five. Without this the gallery gives that reader the same dead end
 * as someone who mistyped — measured on #430's head, `?cat=Foundations` and `?cat=Nonsense` rendered the
 * identical "No components match" panel, while all nine components were still published elsewhere
 * (CAT-BUG-021).
 *
 * Separate from `resolveCategoryParam` rather than folded into its return type on purpose: every other
 * caller wants the string, and only the empty state needs to tell a retired label from a typo.
 */
export function retiredCategory(value: string | null): RetiredCategory | null {
  if (!value) return null;
  const record = (taxonomyData.retiredCategories as Record<string, { becauseIt: string; successors: string[] }>)[value];
  if (!record) return null;
  return { label: value, becauseIt: record.becauseIt, successors: record.successors as ComponentCategory[] };
}

export function kindOf(slug: string): ComponentKind {
  return ENTRIES[slug]?.kind ?? "component";
}

export function facetsOf(slug: string): readonly ComponentFacet[] {
  return ENTRIES[slug]?.facets ?? [];
}

/** The slugs that are documented recipes rather than published components. */
export const RECIPE_SLUGS: readonly string[] = Object.entries(ENTRIES)
  .filter(([, e]) => e.kind === "recipe")
  .map(([slug]) => slug);
