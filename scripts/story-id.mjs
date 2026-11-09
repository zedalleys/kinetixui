/**
 * story-id.mjs — a component's Storybook story id, derived rather than retyped.
 *
 *   storyId("guest-picker", "Default")   // the id of that component's Default story
 *
 * Storybook builds an id from the story's title, the generator builds the title from the component's
 * category, and the category lives in `components.manifest.json`. A hardcoded id is therefore a third copy
 * of the taxonomy, and CAT-2 broke 52 of them at once: three category renames, plus `card` moving from
 * Data Display to Layout & Structure. `check:a11y-browser` caught three. The other 49 sat in gates that
 * only run on demand and would have broken quietly, each one reporting a story that does not exist rather
 * than a component that is wrong.
 *
 * Deriving the id from the slug closes that, because the slug is what the gate tables already carry beside
 * the id: nothing but the id itself changes at a call site, and the next rename moves all of them with it.
 *
 * `sanitize` is Storybook's own rule, verified against a built `storybook-static/index.json`: lowercase,
 * every run of characters that is not a letter or digit becomes one `-`, and leading and trailing `-` go.
 * That is what turns "Forms & Inputs" into forms-inputs rather than forms---inputs or forms-and-inputs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const taxonomy = JSON.parse(readFileSync(`${root}/component-taxonomy.json`, "utf8"));

/** Storybook's id rule. */
export const sanitize = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The id of `story` for the component `slug`.
 *
 * Throws for a slug the manifest does not know, for the same reason `categoryOf` does on the website: a
 * typo must fail where it is written, not resolve to a plausible id that addresses nothing.
 */
export function storyId(slug, story) {
  const entry = taxonomy.components[slug];
  if (!entry) {
    throw new Error(
      `No category for component "${slug}", so its story id cannot be derived. ` +
        `Add it to components.manifest.json and run \`pnpm gen:manifest\`.`,
    );
  }
  // the component part is the slug with its dashes closed up, which is what `title()` in gen-stories.mjs
  // produces: `guest-picker` → `GuestPicker` → `guestpicker`
  return `${sanitize(entry.category)}-${slug.replace(/-/g, "")}--${sanitize(story)}`;
}
