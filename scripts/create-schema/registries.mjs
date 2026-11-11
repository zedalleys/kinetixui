/**
 * registries.mjs — the identifier spaces a Create document may reference, read from the files that
 * already own them. Nothing here holds its own copy of a list.
 *
 *   domain:          docs/business-capabilities.json → discovery.domains
 *   capability:      docs/business-capabilities.json → discovery.capabilities
 *   family:          docs/business-capabilities.json → families
 *   block-category:  blocks.manifest.json           → categories
 *   block:           blocks.manifest.json           → blocks
 *   component:       components.manifest.json       → components
 *
 * The prefixes exist because two of those spaces collide on the word "commerce": `commerce` is a
 * business domain (an industry a product serves) and `Commerce` is a block category (a shelf in the
 * block filter). They are enforced by two scripts that do not know about each other, so without a
 * prefix a domain filter and a category filter would silently behave as one facet.
 * docs/create/IDENTIFIER-NAMESPACES.md carries the decision; this file carries the resolution.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** "NumberInput" → "number-input", "InputOTP" → "input-otp" — the rule business-discovery.mjs uses. */
export const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));

/** Every identifier space, with its prefix, its canonical file and its members. */
export function loadRegistries({ capabilities = read("docs/business-capabilities.json"), blocks = read("blocks.manifest.json"), components = read("components.manifest.json") } = {}) {
  const disc = capabilities.discovery ?? {};
  const spaces = {
    domain: {
      source: "docs/business-capabilities.json → discovery.domains",
      ids: new Set((disc.domains ?? []).map((d) => d.id)),
    },
    capability: {
      source: "docs/business-capabilities.json → discovery.capabilities",
      ids: new Set((disc.capabilities ?? []).map((c) => c.id)),
    },
    family: {
      source: "docs/business-capabilities.json → families",
      ids: new Set((capabilities.families ?? []).map((f) => f.id)),
    },
    "block-category": {
      source: "blocks.manifest.json → categories",
      ids: new Set((blocks.categories ?? []).map((c) => kebab(c))),
    },
    block: { source: "blocks.manifest.json → blocks", ids: new Set(Object.keys(blocks.blocks ?? {})) },
    component: {
      // A component is referenced by its PascalCase name and stored under its kebab slug.
      source: "components.manifest.json → components",
      ids: new Set(Object.keys(components.components ?? {})),
      normalise: kebab,
    },
  };
  return { spaces, capabilities, blocks, components };
}

/** Derived, never restated: a hand-written copy would drift from `spaces` and surface as wrong prose. */
export const prefixesOf = ({ spaces }) => Object.keys(spaces);

/**
 * @returns {null|string} null when the reference resolves, otherwise why it does not.
 */
export { resolveRef } from "./references.mjs";
